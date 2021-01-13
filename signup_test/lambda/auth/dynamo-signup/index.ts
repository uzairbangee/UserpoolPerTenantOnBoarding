export {};
const AWS = require("aws-sdk");
const dbclient = new AWS.DynamoDB.DocumentClient();
const Cryptr = require("cryptr");


const cryptr = new Cryptr('myTotalySecretKey');

exports.handler = async (event: any) => {
    console.log(event);
    const body = JSON.parse(event.body);
    const encryptedString = cryptr.encrypt(body.password);
    const params = {
        TableName: process.env.TABLE,
        Item : {
            SK: `USER#${body.email}`,
            PK: `METADATA#${body.email}`,
            email: body.email,
            password: encryptedString
        }
    }

    console.log(params);

    try{

        const data = await dbclient.put(params).promise();
        console.log(data);
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