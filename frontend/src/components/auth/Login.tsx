import React, {useContext, useEffect} from "react";
import { makeStyles, createStyles, Theme } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import * as Yup from 'yup';
import { Formik, Form, ErrorMessage, Field } from 'formik';
import { Auth } from 'aws-amplify';
import {ActionContext} from "../../context/GlobalState";
import { navigate, Link } from "gatsby"
import Button from '@material-ui/core/Button';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    textField: {
      margin: '20px 0'
    }
  }),
);

const loginSchema = Yup.object().shape({
    email: Yup.string().email()
        .required('email required'),
    password: Yup.string()
        .required('Please Enter your password')
});

export default function Login({path}){
    const classes = useStyles();
    const {dispatch, verify, authenticated} = useContext(ActionContext);

    return (
        <div className="form-main">
            <h2>Login</h2>
            {
                verify && 
                <>
                <p style={{color: "red"}}>You need to confirm your account via email.</p>
                </>
            }
            <Formik 
                initialValues={ {
                    email: "",
                    password: ""
                }} 
                validationSchema={loginSchema}
                onSubmit = {
                    async (values, {resetForm}) => {
                        console.log(values);
                        try {
                            const user = await Auth.signIn(values.email, values.password);
                            dispatch({
                                type: "LOGIN",
                                payload: user
                            })
                            navigate("/app")
                        } catch (error) {
                            console.log('error signing in', error);
                            if(error.code === "UserNotConfirmedException"){
                                dispatch({
                                    type: "VERIFICATION_REQUIRED",
                                    payload: true
                                })
                            }
                        }
                        resetForm({values: {
                            email: "",
                            password: ""
                        }});
                    }
                }
            >
                {
                (formik) => (
                    <Form onSubmit={formik.handleSubmit}>
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
                        <Button color="primary" variant="contained" type="submit">
                            Login
                        </Button>
                        </div>
                    </Form>
                )
                }
            </Formik>

            <p>Don't have Account? <Link to="/app/signup">Create an Account</Link></p>
        </div>
    )
}