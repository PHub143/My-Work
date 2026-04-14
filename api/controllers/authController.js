const { google } = require('googleapis');
const configService = require('../services/configService');

/**
 * Generates the Google OAuth URL for a specific drive config.
 * Embeds the driveConfigId in the OAuth state parameter.
 */
const getAuthUrlHandler = async (req, res, next) => {
  try {
    const driveConfigId = req.query.driveConfigId;
    const config = await configService.getDriveConfig(driveConfigId);
    if (!config || !config.clientId || !config.clientSecret || !config.redirectUri) {
      return res.status(412).json({ message: 'Google Drive credentials are not fully configured in settings.' });
    }

    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    // Encode the driveConfigId in the state parameter for the callback
    const state = JSON.stringify({ driveConfigId: config.id });

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/drive'],
      state: state,
    });

    res.status(200).json({ url: authUrl });
  } catch (error) {
    next(error);
  }
};

/**
 * Exchanges auth code for refresh token and saves it to the correct drive config.
 * Extracts driveConfigId from the OAuth state parameter.
 */
const googleCallbackHandler = async (req, res, next) => {
  const { code, state } = req.body;
  if (!code) {
    return res.status(400).json({ message: 'Authorization code is required.' });
  }

  try {
    // Parse the state to get the driveConfigId
    let driveConfigId;
    if (state) {
      try {
        const stateData = JSON.parse(state);
        driveConfigId = stateData.driveConfigId;
      } catch (e) {
        // State might be just the driveConfigId string for backward compat
        driveConfigId = state;
      }
    }

    const config = await configService.getDriveConfig(driveConfigId);
    if (!config) {
      return res.status(400).json({ message: 'Drive configuration not found.' });
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
      id: config.id,
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
