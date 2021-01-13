export {};
const AWS = require("aws-sdk");
const dbclient = new AWS.DynamoDB.DocumentClient();
const Cryptr = require("cryptr");
const jwtVerifier = require('/opt/nodejs/decode_jwt');
var dynamodb = new AWS.DynamoDB();
const cryptr = new Cryptr('myTotalySecretKey');
var AmazonCognitoIdentity = require('amazon-cognito-identity-js');

exports.handler = async (event: any) => {
    console.log(event);
    const body = JSON.parse(event.body);
    const token = event.headers.Authorization.substring(7);
    console.log(token);
    const claims = await jwtVerifier.jwtVerifier(token);
    console.log(claims);

    if(event.httpMethod !== "POST"){
        return {
            statusCode: 502,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: `invalid HTTP Method`
        };
    }

    const split_tenant_id = body.tenant_id.split("#");

    try{

        const dynamodb_query_params = {
            ExpressionAttributeValues: {
            ":v1": {
                S: `METADATA#${claims.email}`
                }
            }, 
            KeyConditionExpression: "PK = :v1", 
            ProjectionExpression: "password", 
            TableName: process.env.TABLE
        }

        const dynamodb_result = await dynamodb.query(dynamodb_query_params).promise();
        console.log("DYNAMODB_RESULT" ,dynamodb_result);

        const decryptedpass = cryptr.decrypt(dynamodb_result.Items[0].password.S);
        console.log(decryptedpass);

        const authenticationData = {
            Username: claims.email,
            Password: decryptedpass,
        };

        const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);

        const dynamodb_query_tenant_params = {
            ExpressionAttributeValues: {
            ":v1": {
                    S: `${body.tenant_id}`
                },
            ":v2": {
                    S: `METADATA#${split_tenant_id[1]}`
                }
            }, 
            KeyConditionExpression: "PK = :v1 AND SK = :v2",
            TableName: process.env.TABLE
        }

        const dynamodb_result_tenant = await dynamodb.query(dynamodb_query_tenant_params).promise();
        console.log("DYNAMODB_RESULT_TENAT" ,dynamodb_result_tenant);

        const poolData = {
            UserPoolId: dynamodb_result_tenant.Items[0].userPoolID.S,
            ClientId: dynamodb_result_tenant.Items[0].clientID.S,
        };
        const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
        const userData = {
            Username: claims.email,
            Pool: userPool,
        };
        const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: function(result: any) {
                console.log(result);
        
                return {
                    statusCode: 200,
                    headers: { 
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(result)
                };
            },
        
            onFailure: function(error: any) {
                return {
                    statusCode: 400,
                    headers: { 
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(error)
                };
            },
        });

        return {
            statusCode: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: 'true'
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