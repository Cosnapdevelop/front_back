# 🚨 URGENT: Gmail SMTP Fix for Production

## Critical Issue
**ERROR**: `534-5.7.9 Please log in with your web browser and then try again`  
**IMPACT**: Email verification completely broken - users cannot register

## Immediate Solution (5 minutes)

### 1. Generate Gmail App Password
1. Go to [Google Account Settings](https://myaccount.google.com/) → Security
2. Enable **2-Step Verification** (if not already enabled)
3. Go to **App passwords** → Generate new password
4. Select "Mail" → "Other" → Name it "Cosnap AI"
5. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

### 2. Update Production Environment Variables
Replace your current SMTP configuration with:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password  # ← Use App Password, NOT regular password
SMTP_FROM=your-email@gmail.com
SMTP_FROM_NAME=Cosnap AI
```

### 3. Test Configuration (Optional but Recommended)
```bash
npm run test:gmail-smtp
```

## ✅ Expected Results
- Email verification codes will be delivered successfully
- User registration will work without console fallback
- Production logs will show email delivery success

## 🚨 What Changed
- Enhanced SMTP connection handling with Gmail-specific optimizations
- Connection testing before sending emails
- Improved error reporting and debugging
- Automatic TLS/SSL configuration based on port

## Files Modified
- `src/services/emailService.js` - Enhanced Gmail SMTP configuration
- `src/routes/auth.js` - Better error handling and logging  
- `scripts/test-gmail-smtp.js` - New testing script
- `GMAIL_SMTP_SETUP.md` - Complete setup guide

## Critical Note
**The 534-5.7.9 error means you're using your regular Gmail password instead of an App Password. Gmail requires App Passwords for SMTP authentication when 2-Step Verification is enabled.**