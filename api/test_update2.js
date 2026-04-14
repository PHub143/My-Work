require('dotenv').config();
const jwt = require('jsonwebtoken');
const http = require('http');

const token = jwt.sign(
  { id: 'singleton_admin', email: 'admin@example.com', role: 'ADMIN' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

const data = JSON.stringify({
  id: 'cmnxf7fon000ec5ko6ns56x35',
  name: 'Updated Name',
  clientId: 'admin@example.com',
  clientSecret: '',
  redirectUri: 'dasd',
  folderId: 'asd'
});

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/config/drive',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  }
}, res => {
  let chunks = '';
  res.on('data', d => chunks += d);
  res.on('end', () => console.log('Response:', res.statusCode, chunks));
});

req.write(data);
req.end();
