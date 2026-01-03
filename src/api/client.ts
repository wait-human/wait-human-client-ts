import createClient from "openapi-fetch";
import type { paths } from "./schema";

export const createApiClient = (baseUrl: string) => {
    return createClient<paths>({
        baseUrl,
    });
};
