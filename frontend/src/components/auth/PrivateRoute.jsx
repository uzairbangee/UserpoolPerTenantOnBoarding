import React, {useContext, useEffect, useState} from "react"
import { navigate } from "gatsby"
import {ActionContext} from "../../context/GlobalState";

const PrivateRoute = ({ component: Component, location, ...rest }) => {
    const {authenticated, loading} = useContext(ActionContext);

    if (!loading && !authenticated && location.pathname !== `/app/login`) {
        navigate("/app/login")
        return null
    }

    return (
        !loading &&
        <Component {...rest} />
    )
}

export default PrivateRoute