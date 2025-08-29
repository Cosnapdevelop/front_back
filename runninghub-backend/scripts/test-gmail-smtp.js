#!/usr/bin/env node

/**
 * Gmail SMTP Configuration Tester
 * 
 * This script helps diagnose and fix Gmail SMTP authentication issues.
 * Run this script to validate your Gmail SMTP configuration before deploying to production.
 * 
 * Usage:
 *   node scripts/test-gmail-smtp.js
 *   
 * Environment Variables Required:
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_SECURE=false
 *   SMTP_USER=your-email@gmail.com
 *   SMTP_PASS=your-16-character-app-password
 *   SMTP_FROM=your-email@gmail.com
 *   SMTP_FROM_NAME=Cosnap AI
 */

import { config } from 'dotenv';
import { 
	validateGmailConfig, 
	getGmailSetupInstructions,
	createAndTestSmtpConnection,
	sendVerificationEmail 
} from '../src/services/emailService.js';

// Load environment variables
config();

console.log('🔍 Gmail SMTP Configuration Tester');
console.log('====================================\n');

async function testGmailSmtp() {
	try {
		// Step 1: Validate configuration
		console.log('📋 Step 1: Validating SMTP configuration...');
		const validation = validateGmailConfig();
		
		if (!validation.isValid) {
			console.error('❌ Configuration validation failed:');
			validation.errors.forEach(error => {
				console.error(`   • ${error}`);
			});
			console.log('\n💡 Gmail Setup Instructions:');
			const instructions = getGmailSetupInstructions();
			instructions.steps.forEach(step => {
				console.log(`   ${step}`);
			});
			console.log('\n🔧 Required Environment Variables:');
			Object.entries(instructions.environmentVariables).forEach(([key, value]) => {
				console.log(`   ${key}=${value}`);
			});
			console.log('\n⚠️  Common Issues:');
			instructions.commonIssues.forEach(issue => {
				console.log(`   • ${issue}`);
			});
			return false;
		}
		
		console.log('✅ Configuration validation passed');
		console.log(`   Host: ${validation.config.host}`);
		console.log(`   Port: ${validation.config.port}`);
		console.log(`   Secure: ${validation.config.secure}`);
		console.log(`   User: ${validation.config.user}`);
		console.log(`   From: ${validation.config.from}`);
		console.log(`   App Password Length: ${validation.config.pass ? validation.config.pass.length : 0} characters`);

		// Step 2: Test SMTP connection
		console.log('\n🔗 Step 2: Testing SMTP connection...');
		let transporter;
		try {
			transporter = await createAndTestSmtpConnection();
			console.log('✅ SMTP connection test passed');
		} catch (error) {
			console.error('❌ SMTP connection test failed:', error.message);
			
			// Provide specific error guidance
			if (error.message.includes('534-5.7.9')) {
				console.log('\n💡 This is the Gmail "Please log in with your web browser" error.');
				console.log('   This usually means you are using your regular Gmail password instead of an App Password.');
				console.log('   Please follow these steps:');
				console.log('   1. Enable 2-Step Verification on your Google Account');
				console.log('   2. Generate an App Password for "Mail"');
				console.log('   3. Use the 16-character App Password as SMTP_PASS');
			} else if (error.message.includes('535-5.7.8')) {
				console.log('\n💡 Username and Password not accepted.');
				console.log('   Please check your SMTP_USER and SMTP_PASS values.');
			} else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
				console.log('\n💡 Network connectivity issue.');
				console.log('   Please check your internet connection and firewall settings.');
			}
			
			return false;
		} finally {
			if (transporter) {
				transporter.close();
			}
		}

		// Step 3: Send test email
		console.log('\n📧 Step 3: Sending test verification email...');
		const testEmail = validation.config.from; // Send test email to yourself
		const testCode = '123456';
		
		try {
			await sendVerificationEmail(testEmail, testCode, 'register');
			console.log(`✅ Test email sent successfully to ${testEmail}`);
			console.log('   Please check your inbox for the verification email.');
		} catch (error) {
			console.error('❌ Test email sending failed:', error.message);
			return false;
		}

		console.log('\n🎉 All tests passed! Your Gmail SMTP configuration is working correctly.');
		return true;

	} catch (error) {
		console.error('\n💥 Unexpected error during testing:', error.message);
		console.error(error.stack);
		return false;
	}
}

async function main() {
	const success = await testGmailSmtp();
	
	if (success) {
		console.log('\n✅ Gmail SMTP is ready for production deployment.');
		process.exit(0);
	} else {
		console.log('\n❌ Gmail SMTP configuration needs to be fixed before production deployment.');
		console.log('\n📚 Additional Resources:');
		console.log('   • Google App Passwords: https://support.google.com/accounts/answer/185833');
		console.log('   • Gmail SMTP Settings: https://support.google.com/mail/answer/7126229');
		console.log('   • Nodemailer Gmail: https://nodemailer.com/usage/using-gmail/');
		process.exit(1);
	}
}

// Handle uncaught errors gracefully
process.on('uncaughtException', (error) => {
	console.error('\n💥 Uncaught Exception:', error.message);
	process.exit(1);
});

process.on('unhandledRejection', (error) => {
	console.error('\n💥 Unhandled Rejection:', error.message);
	process.exit(1);
});

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}

export { testGmailSmtp };