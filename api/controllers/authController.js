const { google } = require('googleapis');
const configService = require('../services/configService');

/**
 * Generates the Google OAuth URL.
 */
const getAuthUrlHandler = async (req, res, next) => {
  try {
    const config = await configService.getDriveConfig();
    if (!config || !config.clientId || !config.clientSecret || !config.redirectUri) {
      return res.status(400).json({ message: 'Google Drive credentials are not fully configured in settings.' });
    }

    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/drive'],
    });

    res.status(200).json({ url: authUrl });
  } catch (error) {
    next(error);
  }
};

/**
 * Exchanges auth code for refresh token and saves it.
 */
const googleCallbackHandler = async (req, res, next) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ message: 'Authorization code is required.' });
  }

  try {
    const config = await configService.getDriveConfig();
    if (!config) {
      return res.status(400).json({ message: 'Config not found.' });
    }

    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.refresh_token) {
       // If Google doesn't return a refresh token, it might be because the user didn't re-consent
       // or we're not asking for prompt: consent (which we are above).
       return res.status(400).json({ message: 'No refresh token received. Try removing the app from Google account and re-authenticating.' });
    }

    await configService.upsertDriveConfig({
      ...config,
      refreshToken: tokens.refresh_token
    });

    res.status(200).json({ message: 'Google Drive authentication successful and token saved.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuthUrlHandler,
  googleCallbackHandler
};
