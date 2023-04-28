const Koa = require('koa');
const multer = require('@koa/multer');
var Router = require('koa-router');
const fs = require('fs');
const path = require('path');
const { authenticate, getArgs } = require('./jwt_console_project/jwtConsole.js')
const signingViaEmail = require('./lib/eSignature/examples/signingViaEmail');

const app = new Koa();
var router = new Router();

const upload = multer({ dest: path.join(__dirname, 'uploads') });

// Use the upload middleware to handle file uploads
app.use(upload.single('file'));

// Define the endpoint that accepts a name, email, and file
router.post('/submit', async (ctx) => {

  // Authenticate with DocuSign
  const { accessToken, basePath, apiAccountId } = await authenticate();

  // Access the name and email fields from the request body
  const { name, email } = ctx.request.body;

  // Get the uploaded file from the request
  const file = ctx.request.file;

  // Create the envelope
  const args = getArgs(email, name, file.path, apiAccountId, accessToken, basePath);

  let envelopeId = await signingViaEmail.sendEnvelope(args);
  console.log(envelopeId);

  // Respond with a success message
  ctx.body = { message: envelopeId };
});

// Start the server
app.use(router.routes())
.use(router.allowedMethods());

app.listen(3000, () => {
  console.log('Server started on port 3000');
});