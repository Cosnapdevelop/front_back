import nodemailer from 'nodemailer';

function getSmtpConfig() {
	const host = process.env.SMTP_HOST;
	const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
	const user = process.env.SMTP_USER;
	const pass = process.env.SMTP_PASS;
	
	// Auto-configure secure setting based on port and provider
	let secure;
	if (process.env.SMTP_SECURE !== undefined) {
		secure = String(process.env.SMTP_SECURE).toLowerCase() === 'true';
	} else {
		// Auto-detect based on port: 465 = SSL, 587 = STARTTLS, 25 = Plain
		secure = port === 465;
	}
	
	const from = process.env.SMTP_FROM;
	const fromName = process.env.SMTP_FROM_NAME || 'Cosnap AI';
	
	return { host, port, user, pass, secure, from, fromName };
}

export function isEmailEnabled() {
	const { host, port, user, pass, from } = getSmtpConfig();
	return Boolean(host && port && user && pass && from);
}

export async function sendVerificationEmail(toEmail, code, scene = 'register') {
	const cfg = getSmtpConfig();
	if (!isEmailEnabled()) {
		console.warn('[Email] SMTP 未配置，跳过真实发信。验证码:', code, '收件人:', toEmail, '场景:', scene);
		return false;
	}
	try {
		// Create Gmail-optimized transporter configuration
		const transporterConfig = {
			host: cfg.host,
			port: cfg.port,
			secure: cfg.secure,
			auth: {
				user: cfg.user,
				pass: cfg.pass
			},
			// Gmail-specific optimizations
			tls: {
				// Trust Gmail's certificate
				rejectUnauthorized: true,
				// Enable TLS for port 587
				ciphers: 'SSLv3'
			},
			// Connection pool for better performance
			pool: true,
			maxConnections: 5,
			maxMessages: 10,
			// Timeout settings
			connectionTimeout: 60000, // 60 seconds
			greetingTimeout: 30000,    // 30 seconds
			socketTimeout: 75000       // 75 seconds
		};

		const transporter = nodemailer.createTransport(transporterConfig);

		// Test SMTP connection before sending
		try {
			await testSmtpConnection(transporter);
		} catch (connectionError) {
			console.error('[Email] SMTP连接测试失败:', connectionError.message);
			throw new Error(`SMTP连接失败: ${connectionError.message}`);
		}

		// 根据场景生成不同的邮件内容
		const emailContent = getEmailContentByScene(scene, code);

		// Send email with enhanced error handling
		const mailOptions = {
			from: `${cfg.fromName} <${cfg.from}>`,
			to: toEmail,
			subject: emailContent.subject,
			html: emailContent.html,
			// Add message ID for tracking
			messageId: `cosnap-${scene}-${Date.now()}@${cfg.host}`,
			// Set envelope for better delivery
			envelope: {
				from: cfg.from,
				to: toEmail
			}
		};

		const info = await transporter.sendMail(mailOptions);
		console.log('[Email] 发送成功:', {
			messageId: info.messageId,
			response: info.response,
			to: toEmail,
			scene: scene
		});

		// Close the transporter
		transporter.close();

		return true;
	} catch (error) {
		console.error('[Email] 发送失败:', {
			error: error.message,
			code: error.code,
			command: error.command,
			response: error.response,
			to: toEmail,
			scene: scene
		});
		
		// Log verification code for debugging in development
		if (process.env.NODE_ENV === 'development') {
			console.log(`[验证码] 邮件发送失败，开发环境日志输出 - email=${toEmail}, scene=${scene}, code=${code}`);
		}
		
		throw error;
	}
}

/**
 * Test SMTP connection before sending emails
 */
export async function testSmtpConnection(transporter) {
	try {
		const verified = await transporter.verify();
		if (!verified) {
			throw new Error('SMTP server verification failed');
		}
		console.log('[Email] SMTP连接验证成功');
		return true;
	} catch (error) {
		console.error('[Email] SMTP连接验证失败:', error.message);
		throw error;
	}
}

/**
 * Create and test SMTP connection
 */
export async function createAndTestSmtpConnection() {
	const cfg = getSmtpConfig();
	if (!isEmailEnabled()) {
		throw new Error('SMTP未配置');
	}

	const transporterConfig = {
		host: cfg.host,
		port: cfg.port,
		secure: cfg.secure,
		auth: {
			user: cfg.user,
			pass: cfg.pass
		},
		tls: {
			rejectUnauthorized: true,
			ciphers: 'SSLv3'
		},
		connectionTimeout: 30000,
		greetingTimeout: 15000,
		socketTimeout: 45000
	};

	const transporter = nodemailer.createTransport(transporterConfig);
	
	try {
		await testSmtpConnection(transporter);
		return transporter;
	} catch (error) {
		transporter.close();
		throw error;
	}
}

/**
 * 根据验证场景生成对应的邮件内容
 */
function getEmailContentByScene(scene, code) {
	const baseStyle = "font-family:Arial,sans-serif;line-height:1.6;color:#111";
	const codeStyle = "font-size:28px;font-weight:bold;letter-spacing:4px;padding:12px 16px;background:#f4f4f5;border-radius:8px;display:inline-block;";
	const noteStyle = "margin-top:12px;color:#666";

	switch (scene) {
		case 'register':
			return {
				subject: 'Cosnap 注册验证码',
				html: `
					<div style="${baseStyle}">
						<h2>您的注册验证码</h2>
						<p>您好！您正在进行 Cosnap 账户注册，本次验证码为：</p>
						<div style="${codeStyle}">${code}</div>
						<p style="${noteStyle}">验证码60秒内有效，请勿泄露给他人。</p>
					</div>
				`
			};

		case 'change_email':
			return {
				subject: 'Cosnap 邮箱更改验证码',
				html: `
					<div style="${baseStyle}">
						<h2>邮箱更改验证</h2>
						<p>您好！您正在更改 Cosnap 账户的邮箱地址，请使用以下验证码完成验证：</p>
						<div style="${codeStyle}">${code}</div>
						<p style="${noteStyle}">验证码60秒内有效，请勿泄露给他人。</p>
						<p style="margin-top:16px;padding:12px;background:#fff3cd;border-left:4px solid #ffc107;color:#856404;">
							<strong>安全提示：</strong>如果这不是您本人的操作，请忽略此邮件并立即检查您的账户安全。
						</p>
					</div>
				`
			};

		case 'delete_account':
			return {
				subject: 'Cosnap 账户删除验证码',
				html: `
					<div style="${baseStyle}">
						<h2>账户删除验证</h2>
						<p>您好！您正在删除 Cosnap 账户，请使用以下验证码完成最终确认：</p>
						<div style="${codeStyle}">${code}</div>
						<p style="${noteStyle}">验证码60秒内有效，请勿泄露给他人。</p>
						<p style="margin-top:16px;padding:12px;background:#f8d7da;border-left:4px solid #dc3545;color:#721c24;">
							<strong>重要警告：</strong>账户删除后将无法恢复，所有数据将被永久删除。如果这不是您本人的操作，请立即检查您的账户安全。
						</p>
					</div>
				`
			};

		case 'reset_password':
			return {
				subject: 'Cosnap 密码重置验证码',
				html: `
					<div style="${baseStyle}">
						<h2>密码重置验证</h2>
						<p>您好！您正在重置 Cosnap 账户密码，请使用以下验证码完成验证：</p>
						<div style="${codeStyle}">${code}</div>
						<p style="${noteStyle}">验证码60秒内有效，请勿泄露给他人。</p>
						<p style="margin-top:16px;padding:12px;background:#fff3cd;border-left:4px solid #ffc107;color:#856404;">
							<strong>安全提示：</strong>如果这不是您本人的操作，请忽略此邮件并立即检查您的账户安全。
						</p>
					</div>
				`
			};

		case 'password_reset_link':
			return {
				subject: 'Cosnap 密码重置',
				html: `
					<div style="${baseStyle}">
						<h2>密码重置请求</h2>
						<p>您好！您请求重置 Cosnap 账户密码。</p>
						<p>请点击下方链接在1小时内完成密码重置：</p>
						<div style="margin: 24px 0;">
							<a href="${code}" style="display:inline-block;padding:12px 24px;background:#007bff;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">
								重置密码
							</a>
						</div>
						<p style="margin-top:16px;color:#666;font-size:14px;">
							如果按钮无效，请复制以下链接到浏览器中打开：<br>
							<a href="${code}" style="color:#007bff;word-break:break-all;">${code}</a>
						</p>
						<p style="margin-top:16px;padding:12px;background:#fff3cd;border-left:4px solid #ffc107;color:#856404;">
							<strong>安全提示：</strong>如果您未请求密码重置，请忽略此邮件。链接将在1小时后过期。
						</p>
					</div>
				`
			};

		default:
			// 默认通用验证码邮件
			return {
				subject: 'Cosnap 验证码',
				html: `
					<div style="${baseStyle}">
						<h2>您的验证码</h2>
						<p>您好！您正在进行身份验证，本次验证码为：</p>
						<div style="${codeStyle}">${code}</div>
						<p style="${noteStyle}">验证码60秒内有效，请勿泄露给他人。</p>
					</div>
				`
			};
	}
}

/**
 * 发送密码重置邮件（带重置链接）
 */
export async function sendPasswordResetEmail(toEmail, resetLink, username) {
	const cfg = getSmtpConfig();
	if (!isEmailEnabled()) {
		console.warn('[Email] SMTP 未配置，跳过密码重置邮件发送。重置链接:', resetLink, '收件人:', toEmail);
		return false;
	}

	try {
		// Create Gmail-optimized transporter configuration
		const transporterConfig = {
			host: cfg.host,
			port: cfg.port,
			secure: cfg.secure,
			auth: {
				user: cfg.user,
				pass: cfg.pass
			},
			tls: {
				rejectUnauthorized: true,
				ciphers: 'SSLv3'
			},
			pool: true,
			maxConnections: 5,
			maxMessages: 10,
			connectionTimeout: 60000,
			greetingTimeout: 30000,
			socketTimeout: 75000
		};

		const transporter = nodemailer.createTransporter(transporterConfig);

		// Test SMTP connection before sending
		try {
			await testSmtpConnection(transporter);
		} catch (connectionError) {
			console.error('[Email] 密码重置邮件SMTP连接测试失败:', connectionError.message);
			throw new Error(`SMTP连接失败: ${connectionError.message}`);
		}

		// 生成密码重置邮件内容
		const emailContent = getEmailContentByScene('password_reset_link', resetLink);

		// Send email with enhanced error handling
		const mailOptions = {
			from: `${cfg.fromName} <${cfg.from}>`,
			to: toEmail,
			subject: emailContent.subject,
			html: emailContent.html,
			// Add message ID for tracking
			messageId: `cosnap-reset-${Date.now()}@${cfg.host}`,
			// Set envelope for better delivery
			envelope: {
				from: cfg.from,
				to: toEmail
			}
		};

		const info = await transporter.sendMail(mailOptions);
		console.log('[Email] 密码重置邮件发送成功:', {
			messageId: info.messageId,
			response: info.response,
			to: toEmail,
			username: username
		});

		// Close the transporter
		transporter.close();

		return true;
	} catch (error) {
		console.error('[Email] 密码重置邮件发送失败:', {
			error: error.message,
			code: error.code,
			command: error.command,
			response: error.response,
			to: toEmail,
			username: username
		});
		
		// Log reset link for debugging in development
		if (process.env.NODE_ENV === 'development') {
			console.log(`[密码重置] 邮件发送失败，开发环境日志输出 - email=${toEmail}, resetLink=${resetLink}`);
		}
		
		throw error;
	}
}

/**
 * Enhanced email validation for Gmail compatibility
 */
export function validateGmailConfig() {
	const cfg = getSmtpConfig();
	const errors = [];

	if (!cfg.host) {
		errors.push('SMTP_HOST is required');
	} else if (cfg.host === 'smtp.gmail.com') {
		// Gmail-specific validations
		if (!cfg.user || !cfg.user.includes('@gmail.com')) {
			errors.push('Gmail requires a valid @gmail.com email address as SMTP_USER');
		}
		if (!cfg.pass || cfg.pass.length < 16) {
			errors.push('Gmail requires an App Password (16 characters) as SMTP_PASS, not your regular password');
		}
		if (cfg.port !== 587 && cfg.port !== 465) {
			errors.push('Gmail requires port 587 (STARTTLS) or 465 (SSL)');
		}
	}

	if (!cfg.user) {
		errors.push('SMTP_USER is required');
	}
	if (!cfg.pass) {
		errors.push('SMTP_PASS is required');
	}
	if (!cfg.from) {
		errors.push('SMTP_FROM is required');
	}
	if (!cfg.port) {
		errors.push('SMTP_PORT is required');
	}

	return {
		isValid: errors.length === 0,
		errors: errors,
		config: cfg
	};
}

/**
 * Get Gmail App Password setup instructions
 */
export function getGmailSetupInstructions() {
	return {
		steps: [
			"1. Go to your Google Account settings (https://myaccount.google.com/)",
			"2. Navigate to Security > 2-Step Verification (must be enabled first)",
			"3. Scroll down to 'App passwords'",
			"4. Select 'Mail' and 'Other (Custom name)' - enter 'Cosnap AI'",
			"5. Google will generate a 16-character app password",
			"6. Use this app password as your SMTP_PASS, not your regular Gmail password",
			"7. Ensure SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, SMTP_SECURE=false"
		],
		environmentVariables: {
			SMTP_HOST: 'smtp.gmail.com',
			SMTP_PORT: '587',
			SMTP_SECURE: 'false',
			SMTP_USER: 'your-email@gmail.com',
			SMTP_PASS: 'your-16-character-app-password',
			SMTP_FROM: 'your-email@gmail.com',
			SMTP_FROM_NAME: 'Cosnap AI'
		},
		commonIssues: [
			"Using regular password instead of App Password (causes 534-5.7.9 error)",
			"2-Step Verification not enabled (required for App Passwords)",
			"Wrong port configuration (use 587 for STARTTLS)",
			"SMTP_SECURE=true with port 587 (should be false for STARTTLS)"
		]
	};
}
