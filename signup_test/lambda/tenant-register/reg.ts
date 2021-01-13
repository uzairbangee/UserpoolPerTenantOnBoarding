export {};
const AWS = require("aws-sdk");
const dbclient = new AWS.DynamoDB.DocumentClient();
var dynamodb = new AWS.DynamoDB();
var cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();
import { Guid } from "guid-typescript";
import * as shortid from 'shortid';
const Cryptr = require("cryptr");
const eventBridge = new AWS.EventBridge();
const jwtVerifier = require('/opt/nodejs/decode_jwt');

// console.log(jwtVerifier);

const cryptr = new Cryptr('myTotalySecretKey');

var lambda = new AWS.Lambda();

const tenant_id = `${Guid.create()}`

    // {
    //     tenant : {
    //         name: ""
    //     }
    // }

exports.handler = async (event: any) => {
    console.log("Event", event);
    const token = event.headers.Authorization.substring(7);
    console.log(token);
    const claims = await jwtVerifier.jwtVerifier(token);
    console.log(claims);
    const body = JSON.parse(event.body);
    console.log("Body", body);
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

    const user_pool_params = {
        PoolName: `${body.tenant.name}`,
        UsernameAttributes: ["email"],
        LambdaConfig: {
            PreSignUp: process.env.PRE_SIGNUP_LAMBDA
        },
        Schema : [
            {
                AttributeDataType: "String",
                Name: "name",
                Mutable: true
            },
            {
                AttributeDataType: "String",
                Name: "tenant_id",
                Mutable: false,
                StringAttributeConstraints: {
                    MaxLength: '255',
                    MinLength: '1'
                }
            },
            {
                AttributeDataType: "String",
                Name: "role",
                Mutable: true,
                StringAttributeConstraints: {
                    MaxLength: '50',
                    MinLength: '1'
                }
            },
        ]
    };
    console.log(user_pool_params);

    try{
        ///Create User pool
        const data = await cognitoidentityserviceprovider.createUserPool(user_pool_params).promise();

        const permission_params = {
            Action: "lambda:InvokeFunction", 
            FunctionName: process.env.PRE_SIGNUP_LAMBDA, 
            Principal: "cognito-idp.amazonaws.com", 
            SourceArn: data.UserPool.Arn,
            StatementId: `${shortid.generate()}`
        };

        const lambda_permission = await lambda.addPermission(permission_params).promise();
        console.log("poermission", lambda_permission);

        const user_pool_client_params = {
            ClientName: `${body.tenant.name} Client`,
            UserPoolId: data.UserPool.Id,
        }
        ///Create Userpool Client
        const client = await cognitoidentityserviceprovider.createUserPoolClient(user_pool_client_params).promise();
        console.log(client);

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

        const signup_params = {
            ClientId: client.UserPoolClient.ClientId,
            Password: decryptedpass,
            Username: claims.email,
            UserAttributes: [
                {
                    Name: "name",
                    Value: claims.name
                },
                {
                    Name: "custom:tenant_id",
                    Value: `TENANT#${tenant_id}`
                },
                {
                    Name: "custom:role",
                    Value: "admin"
                },
            ]
        }
        ///Create Signup
        const signup = await cognitoidentityserviceprovider.signUp(signup_params).promise();
        console.log(signup);

        // await eventBridge.putEvents({
        //     "Entries": [
        //         {
        //         "EventBusName": 'saasEventBus',
        //         "Source": 'tenant.events',
        //         "DetailType": 'tenant',
        //         "Detail": JSON.stringify({
        //             fieldName: 'createBookmark',
        //             data
        //         })
        //     },
        //     ]
        // }).promise();

        const dynamodb_tenant_put_params = {
            TableName: process.env.TABLE,
            Item : {
                SK: `METADATA#${tenant_id}`,
                PK: `TENANT#${tenant_id}`,
                name: body.tenant.name,
                status: 'active',
                userPoolID: data.UserPool.Id,
                clientID: client.UserPoolClient.ClientId
            }
        }

        await dbclient.put(dynamodb_tenant_put_params).promise();

        const dynamodb_user_put_params = {
            TableName: process.env.TABLE,
            Item : {
                SK: `USER#${claims.email}`,
                PK: `TENANT#${tenant_id}`,
                email: claims.email,
                name: claims.name,
                tenant_name: body.tenant.name,
                role: 'admin',
                status: 'joined',
                active: true,
                userPoolID: data.UserPool.Id,
                clientID: client.UserPoolClient.ClientId
            }
        }

        await dbclient.put(dynamodb_user_put_params).promise();

        return {
            statusCode: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                email: claims.email,
                PoolID: client.UserPoolClient.UserPoolId,
                ClientID: client.UserPoolClient.ClientId,
                tenant_id: `TENANT#${tenant_id}`,
                ...signup
            })
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