'use strict';

const crypto = require('node:crypto');

function key() {
  const value = process.env.CREDENTIALS_ENCRYPTION_KEY || '';
  if (!/^[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error('CREDENTIALS_ENCRYPTION_KEY must contain 32 random bytes encoded as hex');
  }
  return Buffer.from(value, 'hex');
}

exports.encrypt = (password) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64')).join('.');
};

exports.decrypt = (value) => {
  const [iv, tag, ciphertext] = value.split('.').map((part) => Buffer.from(part, 'base64'));
  const cipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(ciphertext), cipher.final()]).toString('utf8');
};
