import React, { useEffect, useContext, Suspense, useState } from "react"
import { Router } from "@reach/router"
import Login from "../components/auth/Login";
import Signup from "../components/auth/Signup";
import Verify from "../components/auth/Verify";
import PrivateRoute from "../components/auth/PrivateRoute";
import SlackApp from "../components/SlackApp";
import Slack from "../components/Slack";
import { Auth } from "aws-amplify";
import {ActionContext} from "../context/GlobalState";
import Header from "../components/Header";
import { navigate, Link } from "gatsby"
import Amplify from "aws-amplify"

export default function App() {
    const {dispatch, userPoolId, clientId} = useContext(ActionContext);
    Amplify.configure({
        Auth: {
            region: "us-east-2",
            userPoolId: userPoolId,
            userPoolWebClientId: clientId,
        },
        "aws_project_region": "us-east-2",
        "aws_appsync_region": "us-east-2",
        "aws_appsync_authenticationType": "AMAZON_COGNITO_USER_POOLS"
    })

    useEffect(() => {
        
        (async () => {
          try {
            const user = await Auth.currentSession();
            console.log(user);
            dispatch({
              type: "LOGIN",
              payload: user
            })
            dispatch({
              type: "LOADING_SET",
              payload: false
            })
          }
          catch(e) {
            console.log(e);
            dispatch({
              type: "LOGOUT",
            })
            dispatch({
              type: "LOADING_SET",
              payload: false
            })
          }
        })();
    }, [])

    return (
        <Suspense fallback={<div>Loading...</div>}>
            <Header/>
              <Router basepath="/client">
                  <PrivateRoute path="/:id" location={""} component={Slack} />
              </Router>
        </Suspense>
    )
}