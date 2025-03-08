import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    GetCommand,
    QueryCommand,
    QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
    try {
        console.log("[EVENT]", JSON.stringify(event));
        const pathParameters = event?.pathParameters;
        const queryParameters = event?.queryStringParameters || {};
        const movieId = pathParameters?.movieId
            ? parseInt(pathParameters.movieId)
            : undefined;
        const includeCast = queryParameters?.cast === "true";

        if (!movieId) {
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ Message: "Missing movie Id" }),
            };
        }

        // Get movie metadata
        const movieCommand = new GetCommand({
            TableName: process.env.TABLE_NAME,
            Key: { id: movieId },
        });

        const movieResponse = await ddbDocClient.send(movieCommand);
        console.log("GetCommand response: ", movieResponse);

        if (!movieResponse.Item) {
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ Message: "Invalid movie Id" }),
            };
        }

        let responseBody = {
            data: movieResponse.Item,
        };

        // If cast=true, get the cast information
        if (includeCast) {
            try {
                const castQueryInput: QueryCommandInput = {
                    TableName: process.env.CAST_TABLE_NAME,
                    KeyConditionExpression: "movieId = :m",
                    ExpressionAttributeValues: {
                        ":m": movieId,
                    },
                };

                const castCommand = new QueryCommand(castQueryInput);
                const castResponse = await ddbDocClient.send(castCommand);

                // Add cast to the response
                responseBody = {
                    data: {
                        ...movieResponse.Item,
                        cast: castResponse.Items || [],
                    },
                };
            } catch (castError) {
                console.log("Error fetching cast:", JSON.stringify(castError));
                // Continue without cast if there's an error
            }
        }

        // Return Response
        return {
            statusCode: 200,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(responseBody),
        };
    } catch (error: any) {
        console.log(JSON.stringify(error));
        return {
            statusCode: 500,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ error }),
        };
    }
};

function createDDbDocClient() {
    const ddbClient = new DynamoDBClient({ region: process.env.REGION });
    const marshallOptions = {
        convertEmptyValues: true,
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
    };
    const unmarshallOptions = {
        wrapNumbers: false,
    };
    const translateConfig = { marshallOptions, unmarshallOptions };
    return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
