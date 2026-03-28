
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3001;

// Enable CORS for all routes
app.use(cors());

app.use('/uploads', express.static('uploads'));

// Create the uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and PDF are allowed.'), false);
  }
};

const upload = multer({ storage, fileFilter });

const uploadMiddleware = (req, res, next) => {
  const uploadSingle = upload.single('file');
  uploadSingle(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

// Set up a route for file uploads
app.post('/upload', uploadMiddleware, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Please select a file to upload.' });
  }
  res.status(200).send({ message: 'File uploaded successfully', file: req.file });
});

app.get('/files', (req, res) => {
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      return res.status(500).json({ message: 'Error reading files.' });
    }
    const fileList = files.map(file => ({
      name: file,
      url: `http://localhost:3001/uploads/${file}`
    }));
    res.status(200).json(fileList);
  });
});

app.get('/version', (req, res) => {
  res.status(200).json({ version: '2.0' });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
