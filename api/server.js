
const express = require('express');

const cors = require('cors');

const busboy = require('busboy');

const { google } = require('googleapis');



const app = express();

const port = 3001;



// --- Google Drive API setup ---

const googleConfig = require('./config/google.json');

const oauth2Client = new google.auth.OAuth2(
  googleConfig.oauth.installed.client_id,
  googleConfig.oauth.installed.client_secret,
  googleConfig.oauth.redirectUri
);

if (googleConfig.oauth.refreshToken) {
  oauth2Client.setCredentials({ refresh_token: googleConfig.oauth.refreshToken });
}

const drive = google.drive({ version: 'v3', auth: oauth2Client });

// --- End of Google Drive API setup ---







// Enable CORS for all routes



app.use(cors());







// Set up a route for file uploads to Google Drive using busboy for streaming

app.post('/upload', (req, res) => {
  const bb = busboy({ headers: req.headers });
  let fileProcessed = false;

  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/pdf',
    'text/plain',
  ];

  bb.on('file', async (name, file, info) => {
    const { filename, mimeType } = info;

    if (!allowedTypes.includes(mimeType)) {
      file.resume(); // Discard the file data
      if (!fileProcessed) {
        fileProcessed = true;
        return res.status(400).json({ message: 'Invalid file type. Only JPG/JPEG, PNG, GIF, PDF, and plain text are allowed.' });
      }
      return;
    }

    fileProcessed = true;

    try {
      const fileMetadata = {
        name: filename,
        parents: [googleConfig.driveFolderId]
      };

      const media = {
        mimeType: mimeType,
        body: file, // Directly pipe the stream from busboy to Google Drive API
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id,name,webViewLink',
        supportsAllDrives: true,
      });

      res.status(200).json({ message: 'File uploaded to Google Drive successfully', file: response.data });
    } catch (error) {
      console.error('Error uploading to Google Drive:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error uploading file to Google Drive.' });
      }
    }
  });

  bb.on('error', (err) => {
    console.error('Busboy error:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error processing upload.' });
    }
  });

  bb.on('finish', () => {
    if (!fileProcessed && !res.headersSent) {
      res.status(400).json({ message: 'No file uploaded.' });
    }
  });

  req.pipe(bb);
});



// Get list of files from Google Drive

app.get('/files', async (req, res) => {

  try {

    const response = await drive.files.list({

      pageSize: 20,

      fields: 'nextPageToken, files(id, name, webViewLink, mimeType, size)',
      q: `'${googleConfig.driveFolderId}' in parents and trashed = false`,

      includeItemsFromAllDrives: true,

      supportsAllDrives: true,

    });

    res.status(200).json(response.data.files);

  } catch (error) {

    console.error('Error fetching files from Google Drive:', error);

    res.status(500).json({ message: 'Error fetching files from Google Drive.' });

  }

});



// Delete a file from Google Drive

app.delete('/files/:fileId', async (req, res) => {

  const { fileId } = req.params;

  try {

    await drive.files.delete({

      fileId: fileId,

      supportsAllDrives: true,

    });

    res.status(200).json({ message: 'File deleted successfully from Google Drive.' });

  } catch (error) {

    if (error.code === 404) {

      return res.status(404).json({ message: 'File not found in Google Drive.' });

    }

    console.error('Error deleting file from Google Drive:', error);

    res.status(500).json({ message: 'Error deleting file from Google Drive.' });

  }

});





app.get('/version', (req, res) => {

  res.status(200).json({ version: '2.0' });

});



app.listen(port, () => {

  console.log(`Server listening on port ${port}`);

});


