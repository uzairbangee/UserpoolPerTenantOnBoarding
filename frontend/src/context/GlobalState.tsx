import React, {createContext, useReducer} from 'react';
import {Reducer} from "./Reducer";

interface initialStateProps {
    dispatch : React.Dispatch<any>,
    user : any,
    authenticated : boolean,
    verify: boolean;
    username: string,
    loading: boolean,
    userPoolId: string,
    clientId: string
}

const initialState = {
    dispatch : () => {},
    user : {},
    authenticated : false,
    verify: false,
    username: "",
    loading:true,
    userPoolId: "",
    clientId: ""
}


export const ActionContext = createContext<initialStateProps>(initialState);

const GlobalState = ({children}) => {
    const [state, dispatch] = useReducer(Reducer, initialState);
    return (
        <ActionContext.Provider value={{
            authenticated : state.authenticated,
            user : state.user,
            verify: state.verify,
            username: state.username,
            loading: state.loading,
            userPoolId: state.userPoolId,
            clientId: state.clientId,
            dispatch
        }}>
            {children}
        </ActionContext.Provider>
    )
}

export default GlobalState;