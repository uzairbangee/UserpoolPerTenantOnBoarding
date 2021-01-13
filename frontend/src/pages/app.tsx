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
import awsmobile from "../aws-exports"

export default function App() {
    Amplify.configure(awsmobile)
    const {dispatch, loading} = useContext(ActionContext);

    useEffect(() => {
        
        (async () => {
          try {
            const email_to_verify = localStorage.getItem('email_to_verify') || '';
            if(email_to_verify){
              dispatch({
                type: "UPDATE_USERNAME",
                payload: email_to_verify
              })
              dispatch({
                type: "VERIFICATION_REQUIRED",
                payload: true
              })
              dispatch({
                type: "LOADING_SET",
                payload: false
              })
              navigate("/app/verify")
            }
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
            // setLoading(false);
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
            // setLoading(false);
          }
        })();
    }, [])

    return (
        <Suspense fallback={<div>Loading...</div>}>
            <Header/>
              <Router basepath="/app">
                  <PrivateRoute path="/" location={""} component={SlackApp} />
                  <Login path="/login" />
                  <Signup path="/signup" />
                  <Verify path="/verify" />
              </Router>
        </Suspense>
    )
}