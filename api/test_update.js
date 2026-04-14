const http = require('http');

const data = JSON.stringify({
  id: 'singleton',
  name: 'Updated Default Drive',
  clientId: '327562834333-u5n59amflg167ohuk2h1mhgq7dlh71p1.apps.googleusercontent.com',
  clientSecret: '',
  redirectUri: 'https://phub143.github.io/My-Work/allinone/',
  folderId: '15MEu0lfBoD5pcLXobtcQW5gRIRQAhnJO',
  isDefault: true
});

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/config/drive',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // We need an admin token though!
  }
}, res => {
  let chunks = '';
  res.on('data', d => chunks += d);
  res.on('end', () => console.log('Response:', res.statusCode, chunks));
});

req.write(data);
req.end();
