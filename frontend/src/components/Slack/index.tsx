import React, {Fragment, useEffect, useContext, useState} from 'react';
// import Amplify, { Auth } from 'aws-amplify';

// const GET_ALL_TENANTS_URL = "https://ucqcqa917k.execute-api.us-east-2.amazonaws.com/prod/tenants";
// const TENANT_REG = 'https://ua67osq4vd.execute-api.us-east-2.amazonaws.com/prod/register';

const Slack = () => {
    
    useEffect(() => {
        // Amplify.configure(awsconfig);
        // console.log('adasds')
        console.log('loc',location.pathname)
    }, []);

    return (
        <Fragment>
            <div>Inside App {location.pathname.substring(5)}</div>
        </Fragment>
    )
}

export default Slack;