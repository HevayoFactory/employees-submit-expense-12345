import ballerina/crypto;
import ballerina/http;
import ballerina/io;
import ballerina/jwt;
import ballerina/os;
import ballerina/test;

// Throwaway keys under tests/resources, used by no environment.
const string TEST_ISSUER = "aep-gateway-test";
const string TEST_HEADER = "x-jwt-assertion";
const string KEY_FILE = "tests/resources/test_gateway_key.pem";
const string CERT_FILE = "tests/resources/test_gateway_cert.pem";
const string OTHER_KEY_FILE = "tests/resources/test_other_key.pem";

// A stand-in service wired exactly as service.bal is: one resource that needs
// the caller, one `security: []` style resource that reads no identity.
service http:InterceptableService /probe on new http:Listener(9191) {
    public function createInterceptors() returns AssertionInterceptor {
        string|error cert = io:fileReadString(CERT_FILE);
        if cert is error {
            panic cert;
        }
        error? c = os:setEnv("GATEWAY_ASSERTION_CERTIFICATE", cert);
        error? i = os:setEnv("GATEWAY_ASSERTION_ISSUER", TEST_ISSUER);
        error? h = os:setEnv("GATEWAY_ASSERTION_HEADER", TEST_HEADER);
        if c is error || i is error || h is error {
            panic error("cannot set the assertion environment");
        }
        return new;
    }

    resource function get whoami(http:RequestContext ctx) returns string[]|http:Unauthorized {
        GatewayCaller|http:Unauthorized caller = requireGatewayCaller(ctx);
        if caller is http:Unauthorized {
            return caller;
        }
        return [caller.userId, caller.scopes.length().toString(),
            hasScope(caller, "claims:read").toString(),
            hasScope(caller, "claims:read-all").toString()];
    }

    resource function get open() returns string {
        return "public";
    }
}

final http:Client probe = check new ("http://localhost:9191/probe");

function mint(string keyFile, string subject, int expiresIn = 300) returns string|error {
    crypto:PrivateKey key = check crypto:decodeRsaPrivateKeyFromKeyFile(keyFile);
    jwt:IssuerConfig config = {
        issuer: TEST_ISSUER,
        username: subject,
        expTime: <decimal>expiresIn,
        customClaims: {"scope": "openid claims:read-team claims:read"},
        signatureConfig: {algorithm: jwt:RS256, config: key}
    };
    return jwt:issue(config);
}

@test:Config {}
function validAssertionIsAccepted() returns error? {
    string token = check mint(KEY_FILE, "user-1");
    string[] body = check probe->/whoami({[TEST_HEADER]: token});
    test:assertEquals(body[0], "user-1");
    test:assertEquals(body[2], "true");
    test:assertEquals(body[3], "false");
}

@test:Config {}
function assertionSignedByAnotherKeyIsRejected() returns error? {
    string token = check mint(OTHER_KEY_FILE, "user-1");
    http:Response res = check probe->get("/whoami", {[TEST_HEADER]: token});
    test:assertEquals(res.statusCode, 401);
}

@test:Config {}
function tamperedAssertionIsRejected() returns error? {
    string token = check mint(KEY_FILE, "user-1");
    string[] parts = re `\.`.split(token);
    string forged = (check mint(KEY_FILE, "someone-else")).toString();
    string[] forgedParts = re `\.`.split(forged);
    // header and signature of the first token, payload of the second
    string tampered = parts[0] + "." + forgedParts[1] + "." + parts[2];
    http:Response res = check probe->get("/whoami", {[TEST_HEADER]: tampered});
    test:assertEquals(res.statusCode, 401);
}

@test:Config {}
function missingAssertionIsRejectedWhereIdentityIsNeeded() returns error? {
    http:Response res = check probe->get("/whoami");
    test:assertEquals(res.statusCode, 401);
}

@test:Config {}
function publicResourceNeedsNoAssertion() returns error? {
    http:Response res = check probe->get("/open");
    test:assertEquals(res.statusCode, 200);
}

@test:Config {}
function paginationLinksAndLimits() returns error? {
    PageParams|ErrorBadRequest bad = pageParams(0, 0);
    test:assertTrue(bad is ErrorBadRequest);
    PageParams|ErrorBadRequest ok = pageParams(DEFAULT_PAGE_SIZE, 20);
    if ok is ErrorBadRequest {
        test:assertFail("default page size must be accepted");
    }
    [string?, string?] links = pageLinks("/me/claims", "", ok, 45);
    test:assertEquals(links[0], "/me/claims?limit=20&offset=40");
    test:assertEquals(links[1], "/me/claims?limit=20&offset=0");
}
