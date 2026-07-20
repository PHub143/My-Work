const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const configPath = path.resolve(__dirname, '../config/google.json');
if (!fs.existsSync(configPath)) {
  console.error(`Missing config file: ${configPath}`);
  console.error('This file is gitignored. Copy the template from the repo and fill in OAuth credentials,');
  console.error('or use the Settings UI in the app to configure Drive (recommended).');
  console.error('See api/config/AGENTS.md for details.');
  process.exit(1);
}
const googleConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const oauth2Client = new google.auth.OAuth2(
  googleConfig.oauth.installed.client_id,
  googleConfig.oauth.installed.client_secret,
  googleConfig.oauth.redirectUri
);

if (googleConfig.oauth.refreshToken) {
  oauth2Client.setCredentials({ refresh_token: googleConfig.oauth.refreshToken });
} else {
  console.error('No refresh token found in google.json');
  process.exit(1);
}

const drive = google.drive({ version: 'v3', auth: oauth2Client });

async function testToken() {
  try {
    console.log('Attempting to list files to test refresh token...');
    const response = await drive.files.list({
      pageSize: 1,
      fields: 'files(id, name)',
    });
    console.log('Success! Connection to Google Drive is working.');
    console.log('Found file:', response.data.files[0] || 'No files found (but connection worked)');
  } catch (error) {
    console.error('Error testing refresh token:', error.message);
    if (error.response && error.response.data) {
        console.error('Detail:', error.response.data);
    }
    process.exit(1);
  }
}

testToken();
