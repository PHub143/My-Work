const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const configPath = path.resolve(__dirname, '../config/google.json');
const googleConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const clientId = googleConfig.oauth.installed.client_id;
const clientSecret = googleConfig.oauth.installed.client_secret;
// Fallback to localhost if localhost:3000 wasn't explicitly added
const redirectUri = 'http://localhost';

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
const scopes = ['https://www.googleapis.com/auth/drive'];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  prompt: 'consent'
});

console.log('URL: ' + authUrl);

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/')) { // Accept callback on root since redirectUri is just http://localhost
    const qs = new url.URL(req.url, 'http://localhost').searchParams;
    const code = qs.get('code');
    
    if (code) {
      res.end('Authentication successful! You can close this tab and return to the terminal.');
      try {
        const { tokens } = await oauth2Client.getToken(code);
        
        const currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (!currentConfig.oauth) currentConfig.oauth = {};
        if (!currentConfig.oauth.installed) currentConfig.oauth.installed = {};
        
        currentConfig.oauth.installed.client_id = clientId;
        currentConfig.oauth.installed.client_secret = clientSecret;
        currentConfig.oauth.redirectUri = redirectUri;
        if (tokens.refresh_token) {
          currentConfig.oauth.refreshToken = tokens.refresh_token;
        } else {
          console.error("No refresh token returned. You might need to revoke access and try again.");
        }
        
        fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2));
        console.log('SUCCESS');
      } catch (err) {
        console.error('Error getting tokens:', err);
      }
    } else {
      res.end('Authentication failed! No code provided.');
    }
    server.close();
    process.exit(0);
  }
}).listen(80, () => {
  console.log('Listening for callback on port 80 (requires root/sudo usually)...');
}).on('error', (err) => {
  if (err.code === 'EACCES') {
      console.error("Error: Could not bind to port 80 (http://localhost). Need sudo, or change redirect URI in Google Cloud Console to http://localhost:3000.");
      process.exit(1);
  }
});
