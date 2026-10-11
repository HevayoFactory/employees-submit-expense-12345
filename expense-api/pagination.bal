const int DEFAULT_PAGE_SIZE = 20;
const int MAX_PAGE_SIZE = 100;

type PageParams record {|
    int 'limit;
    int offset;
|};

// Validates the `limit` and `offset` query parameters of a collection GET.
function pageParams(int 'limit, int offset) returns PageParams|ErrorBadRequest {
    if 'limit < 1 || 'limit > MAX_PAGE_SIZE {
        return badRequestError("limit must be between 1 and 100");
    }
    if offset < 0 {
        return badRequestError("offset must not be negative");
    }
    return {'limit, offset};
}

// Relative `next` and `previous` links for a page envelope.
//
// + path - the collection's path, e.g. "/me/claims"
// + extraQuery - already-encoded filters to carry over, e.g. "status=draft", or ""
// + page - the page that was served
// + count - total matching items
// + return - the pair [next, previous], () where there is no such page
function pageLinks(string path, string extraQuery, PageParams page, int count) returns [string?, string?] {
    string prefix = extraQuery == "" ? "" : extraQuery + "&";
    string? next = ();
    if page.offset + page.'limit < count {
        next = string `${path}?${prefix}limit=${page.'limit}&offset=${page.offset + page.'limit}`;
    }
    string? previous = ();
    if page.offset > 0 {
        int before = page.offset - page.'limit;
        previous = string `${path}?${prefix}limit=${page.'limit}&offset=${before < 0 ? 0 : before}`;
    }
    return [next, previous];
}
