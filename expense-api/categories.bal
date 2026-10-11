import ballerina/sql;
import ballerinax/postgresql;

// The fixed, seeded category list; there is no screen to change it.
type CategorySeed record {|
    string id;
    string name;
|};

final CategorySeed[] categorySeeds = [
    {id: "travel", name: "Travel"},
    {id: "accommodation", name: "Accommodation"},
    {id: "meals", name: "Meals"},
    {id: "transport", name: "Local transport"},
    {id: "office-supplies", name: "Office supplies"},
    {id: "software", name: "Software and subscriptions"},
    {id: "training", name: "Training"},
    {id: "other", name: "Other"}
];

function seedCategories(postgresql:Client dbClient) returns error? {
    int position = 0;
    foreach CategorySeed seed in categorySeeds {
        position += 1;
        sql:ExecutionResult _ = check dbClient->execute(`
            INSERT INTO categories (id, name, sort_order)
            VALUES (${seed.id}, ${seed.name}, ${position})
            ON CONFLICT (id) DO NOTHING`);
    }
}

function loadCategories() returns Category[]|error {
    postgresql:Client dbClient = check database();
    stream<Category, sql:Error?> rows = dbClient->query(`SELECT id, name FROM categories ORDER BY sort_order`);
    return from Category category in rows
        select category;
}
