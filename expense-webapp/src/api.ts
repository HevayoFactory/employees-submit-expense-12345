import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./generated/expense-api";
import { authorizationHeader, classifyResponse, ForbiddenError } from "./authz/client";

// Same-origin: nginx proxies /api to the expense-api gateway and strips the
// prefix, so OpenAPI paths stay as designed (/me/claims, /employees, ...).
// Authorization is src/authz/client.ts's alone; nothing about it lives here.
const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const header = await authorizationHeader();
    if (header) request.headers.set("Authorization", header);
    return request;
  },
  async onResponse({ response }) {
    if ((await classifyResponse(response.status)) === "forbidden") {
      throw new ForbiddenError(response.status);
    }
    return response;
  },
};

export const expenseApi = createClient<paths>({ baseUrl: "/api" });
expenseApi.use(authMiddleware);
