const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const configPath = path.resolve(__dirname, '../config/google.json');
const googleConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const clientId = googleConfig.oauth.installed.client_id;
const clientSecret = googleConfig.oauth.installed.client_secret;
const redirectUri = googleConfig.oauth.redirectUri || 'http://127.0.0.1:3000';

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
const scopes = ['https://www.googleapis.com/auth/drive'];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  prompt: 'consent'
});

const logPath = path.resolve(__dirname, '../logs/token-log.txt');
fs.mkdirSync(path.dirname(logPath), { recursive: true });
fs.writeFileSync(logPath, 'URL: ' + authUrl + '\nListening for callback on port 3000...\n');

const server = http.createServer(async (req, res) => {
  try {
    fs.appendFileSync(logPath, `Received request: ${req.url}\n`);
    if (req.url.startsWith('/')) {
      const qs = new url.URL(req.url, 'http://127.0.0.1:3000').searchParams;
      const code = qs.get('code');
      const error = qs.get('error');
      
      if (error) {
          res.end(`Authentication failed! Google returned error: ${error}`);
          fs.appendFileSync(logPath, `Error from Google: ${error}\n`);
          server.close();
          process.exit(1);
      }
      
      if (code) {
        res.end('Authentication successful! You can close this tab and return to the terminal.');
        fs.appendFileSync(logPath, `Got code: ${code}\n`);
        try {
          const { tokens } = await oauth2Client.getToken(code);
          fs.appendFileSync(logPath, `Got tokens!\n`);
          
          const currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          if (!currentConfig.oauth) currentConfig.oauth = {};
          if (!currentConfig.oauth.installed) currentConfig.oauth.installed = {};
          
          currentConfig.oauth.installed.client_id = clientId;
          currentConfig.oauth.installed.client_secret = clientSecret;
          currentConfig.oauth.redirectUri = redirectUri;
          if (tokens.refresh_token) {
            currentConfig.oauth.refreshToken = tokens.refresh_token;
            fs.appendFileSync(logPath, `Got refresh token!\n`);
          } else {
            fs.appendFileSync(logPath, `No refresh token returned.\n`);
          }
          
          fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2));
          fs.appendFileSync(logPath, `SUCCESS: wrote to google.json\n`);
        } catch (err) {
          fs.appendFileSync(logPath, `Error getting tokens: ${err.message}\n${err.stack}\n`);
        }
      } else if (!req.url.includes('favicon')) {
        res.end('Authentication failed! No code provided.');
      }
      server.close();
      process.exit(0);
    }
  } catch (e) {
     fs.appendFileSync(logPath, `Fatal error in server: ${e.message}\n`);
     server.close();
     process.exit(1);
  }
}).listen(3000, () => {
  console.log('Listening on 3000');
});
