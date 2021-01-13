export {};
const AWS = require("aws-sdk");
const dbclient = new AWS.DynamoDB.DocumentClient();
const ses = new AWS.SES();

    // {
    //    email: "",
    //    tenant_name: ""
    //    tenant_id: ""
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

    const dynamodb_user_put_params = {
        TableName: process.env.TABLE,
        Item : {
            SK: `USER#${body.email}`,
            PK: `${body.tenant_id}`,
            email: body.email,
            role: 'user',
            status: 'pending',
        }
    }

    const params = {
        Destination: {
         ToAddresses: [
            body.email
         ]
        }, 
        Message: {
         Body: {
          Html: {
           Charset: "UTF-8", 
           Data: "To join you need to first login to our Slack."
          }, 
          Text: {
           Charset: "UTF-8", 
           Data: `You have been requested to join ${body.tenant_name}`
          }
         }, 
         Subject: {
          Charset: "UTF-8", 
          Data: "Request to join Workspace in Slack"
         }
        },
        Source: "uzairbangee@gmail.com"
    };

    try{
        await dbclient.put(dynamodb_user_put_params).promise();
        await ses.sendEmail(params).promise();

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