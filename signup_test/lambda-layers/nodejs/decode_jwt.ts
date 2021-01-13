// import {promisify} from 'util';
import * as Axios from 'axios';
import * as jsonwebtoken from 'jsonwebtoken';
const jwkToPem = require('jwk-to-pem');

const cognitoPoolId = 'us-east-2_FxKqBYVfH';
const cognitoIssuer = `https://cognito-idp.us-east-2.amazonaws.com/${cognitoPoolId}`;
let cacheKeys: any;
const getPublicKeys = async () => {
  if (!cacheKeys) {
    const url = `${cognitoIssuer}/.well-known/jwks.json`;
    const publicKeys = await Axios.default.get(url);
    cacheKeys = publicKeys.data.keys.reduce((agg: any, current: any) => {
      const pem = jwkToPem(current);
      agg[current.kid] = {instance: current, pem};
      return agg;
    }, {});
    return cacheKeys;
  } else {
    return cacheKeys;
  }
};

// const verifyPromised = promisify(jsonwebtoken.verify.bind(jsonwebtoken));

exports.jwtVerifier = async (token: any) => {
  let result: any;
    try {
      const tokenSections = (token || '').split('.');
      if (tokenSections.length < 2) {
        throw new Error('requested token is invalid');
      }
      const headerJSON = Buffer.from(tokenSections[0], 'base64').toString('utf8');
      const header = JSON.parse(headerJSON);
      const keys = await getPublicKeys();
      console.log(keys);
      const key = keys[header.kid];
      if (key === undefined) {
        throw new Error('claim made for unknown kid');
      }
      const claim: any = await jsonwebtoken.verify(token, key.pem, { algorithms: ['RS256'] });
      const currentSeconds = Math.floor( (new Date()).valueOf() / 1000);
      if (currentSeconds > claim.exp || currentSeconds < claim.auth_time) {
        throw new Error('claim is expired or invalid');
      }
      if (claim.iss !== cognitoIssuer) {
        throw new Error('claim issuer is invalid');
      }
      console.log(`claim confirmed for ${claim.username}`);
      result = {...claim, isValid: true};
    } catch (error) {
      console.log(error);
      result = {isValid: false};
    }
    return result;
};
// export {jwtVerifier};