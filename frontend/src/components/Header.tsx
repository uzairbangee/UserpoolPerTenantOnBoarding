import React, {Fragment} from 'react';
import { makeStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import { Auth } from 'aws-amplify';
import { navigate } from "gatsby"

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
    marginBottom: "60px"
  },
  menuButton: {
    marginRight: theme.spacing(2),
  },
  title: {
    flexGrow: 1,
  },
  bg : {
    backgroundColor: '#350d36',
    // color: '#fffff',
    boxShadow: 'none',
    },
}));

const Header = () => {
    const classes = useStyles();

    async function signOut() {
        try {
            await Auth.signOut();
            navigate("/app/login")
        } catch (error) {
            console.log('error signing out: ', error);
        }
    }

    return (
        <Fragment>
            <div className={classes.root}>
                <AppBar classes={{root: classes.bg}}>
                    <Toolbar>
                    <Typography variant="h6" className={classes.title}>
                        Slack App
                    </Typography>
                    <Button color="inherit" onClick={signOut}>Logout</Button>
                    </Toolbar>
                </AppBar>
            </div>
        </Fragment>
    )
}

export default Header;