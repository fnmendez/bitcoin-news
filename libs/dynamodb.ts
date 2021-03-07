import aws from "aws-sdk";

const client = new aws.DynamoDB.DocumentClient({
  accessKeyId: "AKIA2PM5XP6RVOLMLJ66",
  secretAccessKey: "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",
  region: "us-east-1",
});

export type AttributeMap = aws.DynamoDB.DocumentClient.AttributeMap;
export type GetItemOutput = aws.DynamoDB.DocumentClient.GetItemOutput;
export type PutItemOutput = aws.DynamoDB.DocumentClient.PutItemOutput;
export type UpdateItemOutput = aws.DynamoDB.DocumentClient.UpdateItemOutput;

export const get = (params: aws.DynamoDB.DocumentClient.GetItemInput) => client.get(params).promise();
export const put = (params: aws.DynamoDB.DocumentClient.PutItemInput) => client.put(params).promise();
export const update = (params: aws.DynamoDB.DocumentClient.UpdateItemInput) => client.update(params).promise();
export const destroy = (params: aws.DynamoDB.DocumentClient.DeleteItemInput) => client.delete(params).promise();

export const batchGet = (params: aws.DynamoDB.DocumentClient.BatchGetItemInput) => client.batchGet(params).promise();
export const batchWrite = (params: aws.DynamoDB.DocumentClient.BatchWriteItemInput) =>
  client.batchWrite(params).promise();
