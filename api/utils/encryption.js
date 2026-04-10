const crypto = require('crypto');
require('dotenv').config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Should be a hex string representing 32 bytes
const IV_LENGTH = 12; // Standard for GCM
const AUTH_TAG_LENGTH = 16;

function encrypt(text) {
  if (!text) return null;
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is not set in environment variables.');
  }
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:authTag:encrypted
  return iv.toString('hex') + ':' + authTag + ':' + encrypted;
}

function decrypt(text) {
  if (!text) return null;
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is not set in environment variables.');
  }

  const parts = text.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format.');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encryptedText = parts[2];
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

module.exports = { encrypt, decrypt };
