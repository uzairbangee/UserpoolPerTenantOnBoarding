import React, {useContext, useEffect} from "react";
import { makeStyles, createStyles, Theme } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import * as Yup from 'yup';
import { Formik, Form, ErrorMessage, Field } from 'formik';
import { Auth } from "aws-amplify";
import {ActionContext} from "../../context/GlobalState";
import { navigate, Link } from "gatsby"
import Button from '@material-ui/core/Button';
import axios from "axios";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    textField: {
      margin: '20px 0'
    }
  }),
);

const loginSchema = Yup.object().shape({
    fullname: Yup.string()
        .required('fullName required'),
    email: Yup.string().email()
        .required('email required'),
    password: Yup.string()
        .required('Please Enter your password')
        .matches(
        /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/,
        "Must Contain 8 Characters, One Uppercase, One Lowercase, One Number and one special case Character"
        ),
    confirm_password: Yup.string()
        .required('Please Enter your Confirm password')
        .oneOf([Yup.ref('password'), null], 'Passwords must match')
});

export default function Signup({path}){
    const classes = useStyles();
    const {dispatch, authenticated} = useContext(ActionContext);

    if(authenticated && location.pathname === `/app/signup`) {
        navigate("/app/")
        return null
    }

    return (
        <div className="form-main">
            <h2>Sign Up</h2>
            <Formik 
                initialValues={ {
                    fullname: "",
                    email: "",
                    password: "",
                    confirm_password: ""
                }} 
                validationSchema={loginSchema}
                onSubmit = { 
                    async (values, {resetForm}) => {
                        console.log(values);
                        try {
                            const { user } = await Auth.signUp({
                                username: values.email,
                                password: values.password,
                                attributes: {
                                    name: values.fullname,
                                }
                            });
                            const post_data = await axios.post("https://mn0vdxpj4b.execute-api.us-east-2.amazonaws.com/prod/", {
                                email: values.email,
                                password: values.password
                            })
                            console.log(post_data);
                            localStorage.setItem('email_to_verify', values.email);
                            console.log(user);
                            dispatch({
                                type: "UPDATE_USERNAME",
                                payload: values.email
                            })
                            dispatch({
                                type: "VERIFICATION_REQUIRED",
                                payload: true
                            })
                            dispatch({
                                type: "LOGIN",
                                payload: user
                            })
                            navigate("/app/verify")
                        } catch (error) {
                            console.log('error signing up:', error);
                        }
                        resetForm({values: {
                            fullname: "",
                            email: "",
                            password: "",
                            confirm_password: ""
                        }});
                    }
                }
            >
                {
                (formik) => (
                    <Form onSubmit={formik.handleSubmit}>
                        <div>
                            <Field type="text" as={TextField} classes={{root: classes.textField}} variant="outlined" label="Full Name" name="fullname" id="fullname" fullWidth={true} />
                            <ErrorMessage name="fullname" render={(msg)=>(
                                <span style={{color:"red"}}>{msg}</span>
                            )} />
                        </div>
                        <div>
                            <Field type="email" as={TextField} classes={{root: classes.textField}} variant="outlined" label="Email" name="email" id="email" fullWidth={true} />
                            <ErrorMessage name="email" render={(msg)=>(
                                <span style={{color:"red"}}>{msg}</span>
                            )} />
                        </div>
                        <div>
                            <Field type="password" as={TextField} classes={{root: classes.textField}} label="Password" variant="outlined" name="password" id="password" fullWidth={true}/>
                            <ErrorMessage name="password" render={(msg)=>(
                                <span style={{color:"red"}}>{msg}</span>
                            )} />
                        </div>
                        <div>
                            <Field type="password" as={TextField} classes={{root: classes.textField}} label="Confirm Password" variant="outlined" name="confirm_password" id="confirm_password" fullWidth={true}/>
                            <ErrorMessage name="confirm_password" render={(msg)=>(
                                <span style={{color:"red"}}>{msg}</span>
                            )} />
                        </div>
                        <div>
                            <Button color="primary" variant="contained" type="submit">
                                Sign Up
                            </Button>
                        </div>
                    </Form>
                )
                }
            </Formik>

            <p>Alread have an Account? <Link to="/app/login">Login</Link></p>
        </div>
    )
}