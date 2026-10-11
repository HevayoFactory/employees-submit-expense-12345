import ballerina/http;

function unauthorizedError() returns ErrorUnauthorized {
    return {body: {code: 401, message: "Unauthorized", description: "no verified caller on this request"}};
}

function internalError() returns http:InternalServerError {
    return {body: {code: 500, message: "Internal server error"}};
}

function badRequestError(string description) returns ErrorBadRequest {
    return {body: {code: 400, message: "Bad request", description}};
}

function notFoundError() returns ErrorNotFound {
    return {body: {code: 404, message: "Not found"}};
}

// Returned by operations that a later issue implements.
function notImplemented() returns http:NotImplemented {
    return {body: {code: 501, message: "Not implemented"}};
}
