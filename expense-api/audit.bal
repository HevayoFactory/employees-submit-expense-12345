import ballerina/sql;
import ballerinax/postgresql;

// Records who did what and when (P2). Call it from the same transaction as
// the change it describes so the two commit or roll back together.
//
// + dbClient - the client, or the one inside the open transaction
// + entityType - e.g. "claim", "export", "employee"
// + entityId - the id of the row acted on
// + action - e.g. "submitted", "approved", "rejected", "exported", "created"
// + actorId - the verified caller's `sub`
// + detail - optional free text, never a secret
// + return - an error when the row cannot be written
function recordAudit(postgresql:Client dbClient, string entityType, string entityId,
        string action, string actorId, string? detail = ()) returns error? {
    sql:ExecutionResult _ = check dbClient->execute(`
        INSERT INTO audit_log (entity_type, entity_id, action, actor_id, detail)
        VALUES (${entityType}, ${entityId}, ${action}, ${actorId}, ${detail})`);
}
