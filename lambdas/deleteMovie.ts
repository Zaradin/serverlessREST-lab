import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
    try {
        console.log("[EVENT]", JSON.stringify(event));

        const pathParameters = event?.pathParameters;
        const movieIdStr = pathParameters?.movieId;

        const movieId = movieIdStr ? parseInt(movieIdStr, 10) : undefined;

        if (!movieId || isNaN(movieId)) {
            return {
                statusCode: 400,
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    message: "Missing or invalid movie ID",
                }),
            };
        }

        const deleteCommand = new DeleteCommand({
            TableName: process.env.TABLE_NAME,
            Key: { id: movieId },
        });

        await ddbDocClient.send(deleteCommand);

        return {
            statusCode: 200,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                message: `Movie with ID ${movieId} deleted successfully.`,
            }),
        };
    } catch (error: any) {
        console.error("Delete error:", error);
        return {
            statusCode: 500,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                message: "Failed to delete movie",
                error: error.message,
            }),
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

    return DynamoDBDocumentClient.from(ddbClient, {
        marshallOptions,
        unmarshallOptions,
    });
}
