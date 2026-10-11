import ballerina/sql;
import ballerinax/postgresql;

// Every statement is idempotent; they run in order on first connection.
// Audit fields (created/updated at and by) sit on each business table;
// audit_log records the events P2 asks for.
final sql:ParameterizedQuery[] schemaStatements = [
    `CREATE SEQUENCE IF NOT EXISTS claim_reference_seq`,
    `CREATE TABLE IF NOT EXISTS employees (
        id text PRIMARY KEY,
        name text NOT NULL,
        email text NOT NULL DEFAULT '',
        manager_id text REFERENCES employees(id),
        created_at timestamptz NOT NULL DEFAULT now(),
        created_by text,
        updated_at timestamptz NOT NULL DEFAULT now(),
        updated_by text
    )`,
    `CREATE TABLE IF NOT EXISTS categories (
        id text PRIMARY KEY,
        name text NOT NULL UNIQUE,
        sort_order int NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS export_batches (
        id text PRIMARY KEY,
        created_at timestamptz NOT NULL DEFAULT now(),
        created_by text NOT NULL REFERENCES employees(id),
        claim_count int NOT NULL,
        total_cents bigint NOT NULL,
        file_name text NOT NULL,
        csv_content text NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS claims (
        id text PRIMARY KEY,
        reference text NOT NULL UNIQUE
            DEFAULT ('EXP-' || lpad(nextval('claim_reference_seq')::text, 6, '0')),
        employee_id text NOT NULL REFERENCES employees(id),
        status text NOT NULL DEFAULT 'draft'
            CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'exported')),
        rejection_reason text,
        total_cents bigint NOT NULL DEFAULT 0,
        submitted_at timestamptz,
        decided_at timestamptz,
        decided_by text REFERENCES employees(id),
        export_batch_id text REFERENCES export_batches(id),
        created_at timestamptz NOT NULL DEFAULT now(),
        created_by text,
        updated_at timestamptz NOT NULL DEFAULT now(),
        updated_by text
    )`,
    `CREATE TABLE IF NOT EXISTS expense_lines (
        id text PRIMARY KEY,
        claim_id text NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
        position int NOT NULL,
        line_date date NOT NULL,
        amount_cents bigint NOT NULL CHECK (amount_cents > 0),
        category_id text NOT NULL REFERENCES categories(id),
        note text,
        created_at timestamptz NOT NULL DEFAULT now(),
        created_by text,
        updated_at timestamptz NOT NULL DEFAULT now(),
        updated_by text
    )`,
    `CREATE TABLE IF NOT EXISTS receipts (
        id text PRIMARY KEY,
        expense_line_id text NOT NULL UNIQUE REFERENCES expense_lines(id) ON DELETE CASCADE,
        file_name text NOT NULL,
        content_type text NOT NULL,
        content bytea NOT NULL CHECK (octet_length(content) <= 5242880),
        created_at timestamptz NOT NULL DEFAULT now(),
        created_by text
    )`,
    `CREATE TABLE IF NOT EXISTS audit_log (
        id bigserial PRIMARY KEY,
        entity_type text NOT NULL,
        entity_id text NOT NULL,
        action text NOT NULL,
        actor_id text NOT NULL,
        occurred_at timestamptz NOT NULL DEFAULT now(),
        detail text
    )`,
    `CREATE INDEX IF NOT EXISTS claims_employee_idx ON claims(employee_id)`,
    `CREATE INDEX IF NOT EXISTS claims_status_idx ON claims(status)`,
    `CREATE INDEX IF NOT EXISTS employees_manager_idx ON employees(manager_id)`,
    `CREATE INDEX IF NOT EXISTS expense_lines_claim_idx ON expense_lines(claim_id)`,
    `CREATE INDEX IF NOT EXISTS audit_entity_idx ON audit_log(entity_type, entity_id)`
];

function prepareSchema(postgresql:Client dbClient) returns error? {
    foreach sql:ParameterizedQuery statement in schemaStatements {
        sql:ExecutionResult _ = check dbClient->execute(statement);
    }
    check seedCategories(dbClient);
}
