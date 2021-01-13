export const Reducer = (state, action) => {
    switch(action.type) {
        case "LOGIN":
            return {
                ...state,
                authenticated: true,
                user : action.payload
            }
        case "LOGOUT":
            return {
                ...state,
                authenticated: false,
                user : {}
            }
        case "VERIFICATION_REQUIRED":
            return {
                ...state,
                verify: action.payload
            }
        case "LOADING_SET":
            return {
                ...state,
                loading: action.payload
            }
        case "SET_IDS":
            return {
                ...state,
                userPoolId: action.payload.userPoolId,
                clientId: action.payload.clientId
            }
        case "UPDATE_USERNAME":
            return {
                ...state,
                username: action.payload
            }
        default:
            return state
    }
}