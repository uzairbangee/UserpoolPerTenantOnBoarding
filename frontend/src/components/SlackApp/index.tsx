import React, {Fragment, useEffect, useContext, useState} from 'react';
import axios from 'axios';
import {Link} from 'gatsby';
import {Auth} from 'aws-amplify';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import {ActionContext} from "../../context/GlobalState";

const GET_ALL_TENANTS_URL = "https://ucqcqa917k.execute-api.us-east-2.amazonaws.com/prod/tenants";
const TENANT_REG = 'https://ua67osq4vd.execute-api.us-east-2.amazonaws.com/prod/register';

const SlackApp = () => {
    const [tenants, setTenants] = useState([]);
    const [open, setOpen] = React.useState(false);
    const [tenantName, setTenantName] = React.useState("");

    const {dispatch} = useContext(ActionContext);

    const fetchTenants = async () => {
        try{
            const data = await axios.get(GET_ALL_TENANTS_URL, {
                headers: {'Authorization': `Bearer ${(await Auth.currentSession()).getIdToken().getJwtToken()}`}
            })
            console.log(data);
            setTenants([]);
            setTenants(data.data.Items);
        }
        catch(err){
            console.log(err);
        }
    }

    const handleSubmit = async () => {
        try{
            const tenant_data = {
                tenant: {
                    name: tenantName
                }
            }
            const data = await axios.post(TENANT_REG, tenant_data, {
                headers: {'Authorization': `Bearer ${(await Auth.currentSession()).getIdToken().getJwtToken()}`}
            })
            console.log(data);
            await fetchTenants();
            setOpen(false)
            setTenantName("");
            // setTenants(data.data.Items);
        }
        catch(err){
            console.log(err);
            setOpen(false)
        }
    }

    const loginTenant = (email: string, userPoolId: string, clientId: string) => {
        dispatch({
            type: "SET_IDS",
            payload: {
                userPoolId: userPoolId,
                clientId: clientId
            }
        })
    }

    useEffect(() => {
        let unmounted = false;

        (async() => {
            if(!unmounted){
                // await fetchTenants();
            }
        })();

        return () => { unmounted = true };
    }, [])

    return (
        <Fragment>
            <div className="UpperArea">
                <h1>Your Workspaces</h1>
                <button className="add" onClick={() => setOpen(true)}>New Workspace</button>
                <Dialog open={open} onClose={() => setOpen(false)} aria-labelledby="form-dialog-title">
                    <DialogTitle id="form-dialog-title">Create Workspace</DialogTitle>
                    <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="name"
                        name="name"
                        value={tenantName}
                        label="Name"
                        type="text"
                        fullWidth
                        onChange={(e) => setTenantName(e.target.value)}
                    />
                    </DialogContent>
                    <DialogActions>
                    <Button onClick={() => setOpen(false)} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} color="primary">
                        Create
                    </Button>
                    </DialogActions>
                </Dialog>
                <div className="tenants_box">
                {
                    tenants.length > 0 &&
                    tenants.map(tenant => (
                        <div className="each_tenant" key={tenant.PK}>
                            <div className="item">
                                <h5>{tenant.tenant_name}</h5>
                                <Link to={`/app/${tenant.PK}`}>
                                    <button className="add" onClick={() => loginTenant(tenant.email, tenant.userPoolId, tenant.clientId)}>Open</button>
                                </Link>
                            </div>
                        </div>
                    ))
                }
                </div>
            </div>
        </Fragment>
    )
}

export default SlackApp;