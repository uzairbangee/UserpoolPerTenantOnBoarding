import * as cdk from '@aws-cdk/core';
import * as cognito from "@aws-cdk/aws-cognito";
import * as lambda from "@aws-cdk/aws-lambda";
import * as iam from "@aws-cdk/aws-iam";
import * as apigw from "@aws-cdk/aws-apigateway";
import * as ddb from "@aws-cdk/aws-dynamodb";
import * as sns from "@aws-cdk/aws-sns";
import { EventBus, Rule, RuleTargetInput, EventField } from '@aws-cdk/aws-events';
import * as targets from '@aws-cdk/aws-events-targets';

export class SignupTestStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // const event_bus = new EventBus(this, 'event_bus', {
    //   eventBusName: 'saasEventBus'
    // })

    const lambdaLayer = new lambda.LayerVersion(this, "LambdaLayer", {
      code: lambda.Code.fromAsset('lambda-layers'),
    })

    const authEmailFn = new lambda.Function(this, 'authEmailFn', {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'pre.handler',
      code: lambda.Code.fromAsset('lambda/auth/lambda-trigger'),
    });

    const userPool = new cognito.UserPool(this, 'myuserpool', {
      selfSignUpEnabled: true,
      standardAttributes: {
        fullname: {
          required: true,
          mutable: false,
        },
      },
      signInAliases : {email: true},
      autoVerify: {email: true},
      userVerification: {
        emailSubject: 'Verify your email for Slack app!',
        emailBody: 'Hello {name}, Thanks for signing up to Slack app! Your verification code is {####}',
        emailStyle: cognito.VerificationEmailStyle.CODE,
      }
    });
    

    const userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool
    });

    new cdk.CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId
    });
    
    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: userPoolClient.userPoolClientId
    });

    const table = new ddb.Table(this, "TableMain", {
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'PK',
        type: ddb.AttributeType.STRING
      },
      sortKey: {
        name: "SK",
        type: ddb.AttributeType.STRING
      }
  });

    const tenantReg = new lambda.Function(this, "tenantReg", {
      runtime: lambda.Runtime.NODEJS_10_X,
      code: lambda.Code.fromAsset("lambda/tenant-register"),
      handler: "reg.handler",
      timeout: cdk.Duration.seconds(10),
      environment: {
        TABLE: table.tableName,
        PRE_SIGNUP_LAMBDA: authEmailFn.functionArn
      },
      layers: [lambdaLayer]
    });

    const policy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['cognito-idp:*', "lambda:*"],
      resources: ['*']
    });

    tenantReg.addToRolePolicy(policy);
    authEmailFn.addToRolePolicy(policy);

    const tenantRegisterEndpoint = new apigw.LambdaRestApi(this, "TenantRegisterEndpoint", {
      handler: tenantReg,
      proxy: false,
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS // this is also the default
      },
    });

    const TenantRegisterauthorizer = new apigw.CfnAuthorizer(this, 'cfnAuth', {
      restApiId: tenantRegisterEndpoint.restApiId,
      name: 'TenantRegisterAuthorizer',
      type: 'COGNITO_USER_POOLS',
      identitySource: 'method.request.header.Authorization',
      providerArns: [userPool.userPoolArn],
    })

    const tenantRegisterResource = tenantRegisterEndpoint.root.addResource('register');
    tenantRegisterResource.addMethod('POST', new apigw.LambdaIntegration(tenantReg), {
      authorizationType: apigw.AuthorizationType.COGNITO,
      authorizer: {
        authorizerId: TenantRegisterauthorizer.ref
      } 
    })

    table.addGlobalSecondaryIndex({
      indexName: "tenants-by-user",
      partitionKey: {
        name: "SK",
        type: ddb.AttributeType.STRING
      },
      sortKey:{
        name: "PK",
        type: ddb.AttributeType.STRING
      }
    })

    const signupToDynamoDB = new lambda.Function(this, 'signupToDynamoDB', {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/auth/dynamo-signup'),
      environment: {
        TABLE: table.tableName,
      },
      layers: [lambdaLayer]
    });

    table.grantFullAccess(signupToDynamoDB);
    table.grantFullAccess(tenantReg);

    new apigw.LambdaRestApi(this, "signupToDynamoDBEndpoint", {
      handler: signupToDynamoDB,
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS // this is also the default
      },
    });


    const userTenantRegister = new lambda.Function(this, 'userTenantRegister', {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(10),
      code: lambda.Code.fromAsset('lambda/auth/user-tenant-request'),
      environment: {
        TABLE: table.tableName
      },
      layers: [lambdaLayer]
    });

    table.grantFullAccess(userTenantRegister);
    userTenantRegister.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['ses:SendEmail'],
      resources: ['*']
    }))

    new apigw.LambdaRestApi(this, "userTenantRegisterEndpoint", {
      handler: userTenantRegister,
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS // this is also the default
      },
    });


    const userJoinTenant = new lambda.Function(this, 'userJoinTenant', {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(10),
      code: lambda.Code.fromAsset('lambda/auth/user-join-tenant'),
      environment: {
        TABLE: table.tableName
      },
      layers: [lambdaLayer]
    });

    table.grantFullAccess(userJoinTenant);
    userJoinTenant.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['cognito-idp:*'],
      resources: ['*']
    }))

    new apigw.LambdaRestApi(this, "userJoinTenantEndpoint", {
      handler: userJoinTenant,
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS // this is also the default
      },
    });

    const GetAllTenants = new lambda.Function(this, 'GetAllTenants', {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'get.handler',
      timeout: cdk.Duration.seconds(10),
      code: lambda.Code.fromAsset('lambda/tenant_management'),
      environment: {
        TABLE: table.tableName
      },
      layers: [lambdaLayer]
    });

    table.grantFullAccess(GetAllTenants);

    const GetAllTenantsEndpoint = new apigw.LambdaRestApi(this, "GetAllTenantsEndpoint", {
      handler: GetAllTenants,
      proxy: false,
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS // this is also the default
      },
    });

    const GetAllTenantsEndpointauthorizer = new apigw.CfnAuthorizer(this, 'GetAllTenantsEndpointauthorizer', {
      restApiId: GetAllTenantsEndpoint.restApiId,
      name: 'GetAllTenantsEndpointAuthorizer',
      type: 'COGNITO_USER_POOLS',
      identitySource: 'method.request.header.Authorization',
      providerArns: [userPool.userPoolArn],
    })

    const GetAllTenantsEndpointResource = GetAllTenantsEndpoint.root.addResource('tenants');
    GetAllTenantsEndpointResource.addMethod('GET', new apigw.LambdaIntegration(GetAllTenants), {
      authorizationType: apigw.AuthorizationType.COGNITO,
      authorizer: {
        authorizerId: GetAllTenantsEndpointauthorizer.ref
      } 
    })

    const signInApi = new apigw.RestApi(this, 'SignInApi', {
      restApiName: 'SignInApi',
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS, // this is also the default
      }
    });

    const SigninHandler = new lambda.Function(this, 'SigninHandler', {
      runtime: lambda.Runtime.NODEJS_10_X,
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(10),
      code: lambda.Code.fromAsset('lambda/auth/signin'),
      environment: {
        TABLE: table.tableName
      },
      layers: [lambdaLayer]
    });

    table.grantFullAccess(SigninHandler);

    const signinUserauthorizer = new apigw.CfnAuthorizer(this, 'signinUserauthorizer', {
      restApiId: signInApi.restApiId,
      name: 'signinUserAuthorizer',
      type: 'COGNITO_USER_POOLS',
      identitySource: 'method.request.header.Authorization',
      providerArns: [userPool.userPoolArn],
    })

    const signinUser = signInApi.root.addResource('signinUser');
    signinUser.addMethod('POST', new apigw.LambdaIntegration(SigninHandler), {
      authorizationType: apigw.AuthorizationType.COGNITO,
      authorizer: {
        authorizerId: signinUserauthorizer.ref
      } 
    })

    // const eventRule = new Rule(this, 'SaasTenantEventRule', {
    //   eventBus: event_bus,
    //   eventPattern: {
    //     source: [
    //       "tenant.events"
    //     ],
    //     detailType: [
    //       "tenant"
    //     ]
    //   },
    //   ruleName: 'BookmarkRule',
    //   targets: [
    //     new targets.LambdaFunction(lambda_function_consumer, {
    //       event: RuleTargetInput.fromObject({
    //         fieldName: EventField.fromPath('$.detail.fieldName'),
    //         data: EventField.fromPath('$.detail.data'),
    //       })
    //     })
    //   ]
    // })

  }
}
