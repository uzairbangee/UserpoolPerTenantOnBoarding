export {};
const AWS = require("aws-sdk");
const dbclient = new AWS.DynamoDB.DocumentClient();
const jwtVerifier = require('/opt/nodejs/decode_jwt');

exports.handler = async (event: any) => {
    
    if(event.httpMethod !== "GET"){
        return {
            statusCode: 502,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: `invalid HTTP Method`
        };
    }

    console.log(event);
    const body = JSON.parse(event.body);

    try{

        const token = event.headers.Authorization.substring(7);
        console.log(token);
        const claims = await jwtVerifier.jwtVerifier(token);
        console.log(claims);

        const params = {
            TableName: process.env.TABLE,
            IndexName: 'tenants-by-user',
            KeyConditionExpression: 'SK = :sk and begins_with(PK, :pk)',
            ExpressionAttributeValues: {
              ':sk': `USER#${claims.email}`,
              ':pk': 'TENANT#'
            }
        }
    
        console.log(params);

        const data = await dbclient.query(params).promise();
        console.log(data);
        return {
            statusCode: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(data)
        };
    }
    catch(err){
        console.log(err);
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(err)
        };
    }

}