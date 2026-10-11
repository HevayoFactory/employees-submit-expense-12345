import ballerina/lang.'int as ints;
import ballerina/log;
import ballerinax/postgresql;
import ballerinax/postgresql.driver as _;

// The client is created on first use so the service starts without the
// database and recovers when it appears; the schema is created with it.
postgresql:Client? dbHandle = ();

function database() returns postgresql:Client|error {
    lock {
        postgresql:Client? existing = dbHandle;
        if existing is postgresql:Client {
            return existing;
        }
        string host = dbHost == "" ? "localhost" : dbHost;
        string name = dbName == "" ? "expense" : dbName;
        string user = dbUser == "" ? "postgres" : dbUser;
        int port = dbPort == "" ? 5432 : check ints:fromString(dbPort);
        postgresql:Client created = check new (host, user, dbPassword == "" ? () : dbPassword, name, port);
        error? prepared = prepareSchema(created);
        if prepared is error {
            log:printError("schema setup failed", 'error = prepared);
            check created.close();
            return prepared;
        }
        dbHandle = created;
        return created;
    }
}
