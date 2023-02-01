import { GraphQLClient } from "graphql-request";
import { LATEST_API_VERSION } from "@shopify/shopify-api";

export default async function graphql(shop, accessToken, query) {
    try {
        const endpoint = `https://${shop}/admin/api/${LATEST_API_VERSION}/graphql.json`,
            graphQLClient = new GraphQLClient(endpoint, {
                headers: {
                    "Content-Type": "application/json",
                    "X-Shopify-Access-Token": accessToken,
                },
            });
        const queryData = await graphQLClient
            .request(query)
            .catch((e) => console.log(e));
        return queryData;
    } catch (e) {
        return {
            "callresult":"failed",
            "error": e
        }
    }
}