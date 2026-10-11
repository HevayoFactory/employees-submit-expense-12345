import ballerina/sql;
import ballerinax/postgresql;

type EmployeeRow record {|
    string id;
    string name;
    string email;
    @sql:Column {name: "manager_id"}
    string? managerId;
    @sql:Column {name: "manager_name"}
    string? managerName;
|};

function toEmployee(EmployeeRow row) returns Employee => {
    id: row.id,
    name: row.name,
    email: row.email,
    managerId: row.managerId,
    managerName: row.managerName
};

// The employee record of the signed-in caller, created on first use with no
// manager until Finance sets one. The id is the assertion's `sub`; the
// assertion carries a login name but no display name or email claim, so the
// login name is the display name, and the email is it only when it is one.
function ensureEmployee(GatewayCaller caller) returns Employee|error {
    postgresql:Client dbClient = check database();
    string name = caller.username.trim() == "" ? caller.userId : caller.username.trim();
    string email = name.includes("@") ? name : "";
    sql:ExecutionResult inserted = check dbClient->execute(`
        INSERT INTO employees (id, name, email, created_by, updated_by)
        VALUES (${caller.userId}, ${name}, ${email}, ${caller.userId}, ${caller.userId})
        ON CONFLICT (id) DO NOTHING`);
    if inserted.affectedRowCount == 1 {
        check recordAudit(dbClient, "employee", caller.userId, "created", caller.userId);
    }
    EmployeeRow row = check dbClient->queryRow(`
        SELECT e.id, e.name, e.email, e.manager_id, m.name AS manager_name
        FROM employees e LEFT JOIN employees m ON m.id = e.manager_id
        WHERE e.id = ${caller.userId}`);
    return toEmployee(row);
}
