const docusign = require('docusign-esign');
const fs = require('fs');
const path = require('path');
const prompt = require('prompt-sync')();

const jwtConfig = require('./jwtConfig.json');
const { ProvisioningInformation } = require('docusign-esign');


const SCOPES = [
     "signature", "impersonation"
];

function getConsent() {
  var urlScopes = SCOPES.join('+');

  // Construct consent URL
  var redirectUri = "https://developers.docusign.com/platform/auth/consent";
  var consentUrl = `${jwtConfig.dsOauthServer}/oauth/auth?response_type=code&` +
                      `scope=${urlScopes}&client_id=${jwtConfig.dsJWTClientId}&` +
                      `redirect_uri=${redirectUri}`;

  console.log("Open the following URL in your browser to grant consent to the application:");
  console.log(consentUrl);
  console.log("Consent granted? \n 1)Yes \n 2)No");
  let consentGranted = prompt("");
  if(consentGranted == "1"){
    return true;
  } else {
    console.error("Please grant consent!");
    process.exit();
  }
}

async function authenticate(){
  const jwtLifeSec = 10 * 60, // requested lifetime for the JWT is 10 min
    dsApi = new docusign.ApiClient();
  dsApi.setOAuthBasePath(jwtConfig.dsOauthServer.replace('https://', '')); // it should be domain only.
  let rsaKey = process.env.privateKey || fs.readFileSync(jwtConfig.privateKeyLocation);

  try {
    const results = await dsApi.requestJWTUserToken(jwtConfig.dsJWTClientId,
      jwtConfig.impersonatedUserGuid, SCOPES, rsaKey,
      jwtLifeSec);
    const accessToken = results.body.access_token;

    // get user info
    const userInfoResults = await dsApi.getUserInfo(accessToken);

    // use the default account
    let userInfo = userInfoResults.accounts.find(account =>
      account.isDefault === "true");

    return {
      accessToken: results.body.access_token,
      apiAccountId: userInfo.accountId,
      basePath: `${userInfo.baseUri}/restapi`
    };
  } catch (e) {
    console.log(e);
    let body = e.response && e.response.body;
    // Determine the source of the error
    if (body) {
        // The user needs to grant consent
      if (body.error && body.error === 'consent_required') {
        if (getConsent()){ return authenticate(); };
      } else {
        // Consent has been granted. Show status code for DocuSign API error
        this._debug_log(`\nAPI problem: Status code ${e.response.status}, message body:
        ${JSON.stringify(body, null, 4)}\n\n`);
      }
    }
  }
}

function getArgs(signerEmail, signerName, file, apiAccountId, accessToken, basePath){
  ccEmail = 'joey.pedicini@gmail.com';
  ccName = 'test';

  const envelopeArgs = {
    signerEmail: signerEmail,
    signerName: signerName,
    ccEmail: ccEmail,
    ccName: ccName,
    status: "sent",
    doc2File: file,
    doc2FileExtension: path.extname(file),
  };
  const args = {
    accessToken: accessToken,
    basePath: basePath,
    accountId: apiAccountId,
    envelopeArgs: envelopeArgs
  };

  return args
}


module.exports = { authenticate, getArgs };