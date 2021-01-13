export {};
const AWS = require("aws-sdk");
const dbclient = new AWS.DynamoDB.DocumentClient();
const dynamodb = new AWS.DynamoDB();
const Cryptr = require("cryptr");
const cryptr = new Cryptr('myTotalySecretKey');
var cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider();

// {
//     tenant_id: "",
        // email: "",
        // fullname: ""
// }

exports.handler = async (event: any) => {
    const body = JSON.parse(event.body);
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
        
        const get_joinrequest_user = {
            ExpressionAttributeValues: {
            ":v1": {
                    S: `${body.tenant_id}`
                },
            ":v2": {
                    S: `USER#${body.email}`
                }
            }, 
            KeyConditionExpression: "PK = :v1 AND SK = :v2", 
            ProjectionExpression: "email",
            TableName: process.env.TABLE
        }
        console.log(get_joinrequest_user);
    
        const dynamodb_query_result = await dynamodb.query(get_joinrequest_user).promise();
            console.log("DYNAMODB_RESULT" ,dynamodb_query_result);
        
        if(dynamodb_query_result.Items.length > 0 && dynamodb_query_result.Items[0].email.S !== body.email){
            return {
                statusCode: 500,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: 'not authorized for this action'
            };
        }

        const dynamodb_query_params = {
            ExpressionAttributeValues: {
            ":v1": {
                    S: `${body.tenant_id}`
                },
            ":v2": {
                    S: `METADATA#${split_tenant_id[1]}`
                }
            }, 
            KeyConditionExpression: "PK = :v1 AND SK = :v2", 
            ProjectionExpression: "clientID",
            TableName: process.env.TABLE
        }
        console.log(dynamodb_query_params);

        const dynamodb_result = await dynamodb.query(dynamodb_query_params).promise();
        console.log("DYNAMODB_RESULT" ,dynamodb_result);

        const dynamodb_query_user_params = {
            ExpressionAttributeValues: {
            ":v1": {
                S: `METADATA#${body.email}`
                }
            }, 
            KeyConditionExpression: "PK = :v1", 
            ProjectionExpression: "password", 
            TableName: process.env.TABLE
        }

        const dynamodb_user_result = await dynamodb.query(dynamodb_query_user_params).promise();
        console.log("DYNAMODB_RESULT" ,dynamodb_user_result);

        const decryptedpass = cryptr.decrypt(dynamodb_user_result.Items[0].password.S);

        const signup_params = {
            ClientId: dynamodb_result.Items[0].clientID.S,
            Password: decryptedpass,
            Username: body.email,
            UserAttributes: [
                {
                    Name: "name",
                    Value: body.fullname
                },
                {
                    Name: "custom:tenant_id",
                    Value: `${body.tenant_id}`
                },
                {
                    Name: "custom:role",
                    Value: "user"
                },
            ]
        }
        ///Create Signup
        const signup = await cognitoidentityserviceprovider.signUp(signup_params).promise();
        console.log(signup);

        const update_params = {
            TableName: process.env.TABLE,
            Key: { PK : `${body.tenant_id}`, SK: `USER#${body.email}` },
            UpdateExpression: 'set #status = :x',
            ExpressionAttributeNames: {'#status' : 'status'},
            ExpressionAttributeValues: {
              ':x' : 'joined'
            }
        };

        const params_update = await dbclient.update(update_params).promise();
        console.log(params_update);

        return {
            statusCode: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: 'request-sent'
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