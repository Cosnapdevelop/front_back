// Debug script to test email normalization behavior
import { body, validationResult } from 'express-validator';

const testEmails = [
  'terrylzr123@gmail.com',
  'TERRYLZR123@gmail.com', 
  'TerrylzR123@Gmail.com',
  'terrylzr123@GMAIL.COM',
  ' terrylzr123@gmail.com ',
  'TerrylzR123+test@gmail.com'
];

// Simulate express-validator behavior
const emailValidator = body('email')
  .isEmail()
  .withMessage('请提供有效的邮箱地址')
  .normalizeEmail()
  .isLength({ max: 254 })
  .withMessage('邮箱地址过长');

console.log('Email Normalization Test Results:');
console.log('=====================================');

testEmails.forEach(email => {
  // Simulate what happens in different endpoints
  const trimmed = email.trim();
  const toLowerCased = email.trim().toLowerCase();
  
  console.log(`Original: "${email}"`);
  console.log(`Trimmed: "${trimmed}"`);
  console.log(`toLowerCase(): "${toLowerCased}"`);
  console.log(`---`);
});

console.log('Expected behavior in each endpoint:');
console.log('Register/Send-Code: Uses toLowerCase()');
console.log('Forgot-Password: Uses raw email from body (after validation)');
console.log('Login: Uses identifier as-is for email lookup');