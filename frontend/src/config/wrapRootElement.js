import React from "react"
import AmplifyClient from "./client"
import GlobalState from "../context/GlobalState";

export const wrapRootElement = ({ element }) => {
    return (
        <GlobalState>
            {/* <AmplifyClient> */}
                {element}
                {/* </AmplifyClient> */}
        </GlobalState>
    )
}