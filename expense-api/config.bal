import ballerina/os;

// Platform-injected database settings (design.json wiring for expense-db).
// An empty value means "not set"; db.bal applies the local defaults.
configurable string dbHost = os:getEnv("EXPENSE_DB_HOST");
configurable string dbPort = os:getEnv("EXPENSE_DB_PORT");
configurable string dbName = os:getEnv("EXPENSE_DB_DBNAME");
configurable string dbUser = os:getEnv("EXPENSE_DB_USER");
configurable string dbPassword = os:getEnv("EXPENSE_DB_PASSWORD");

// Listener port; the platform expects 9090.
configurable int servicePort = 9090;
