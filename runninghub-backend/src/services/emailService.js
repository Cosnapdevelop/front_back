import nodemailer from 'nodemailer';

function getSmtpConfig() {
	const host = process.env.SMTP_HOST;
	const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
	const user = process.env.SMTP_USER;
	const pass = process.env.SMTP_PASS;
	// TODO(human): Add logic to handle secure setting based on port
	// Port 465 requires secure: true (SSL), Port 587 uses secure: false (STARTTLS)
	const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
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
	// Auto-configure secure setting based on port
	if (cfg.port === 465) {
		cfg.secure = true;  // SSL encryption for port 465
	} else if (cfg.port === 587) {
		cfg.secure = false; // STARTTLS encryption for port 587
	}

	const transporter = nodemailer.createTransport({
		host: cfg.host,
		port: cfg.port,
		secure: cfg.secure,
		auth: { user: cfg.user, pass: cfg.pass }
	});

	// 根据场景生成不同的邮件内容
	const emailContent = getEmailContentByScene(scene, code);

	await transporter.sendMail({
		from: `${cfg.fromName} <${cfg.from}>`,
		to: toEmail,
		subject: emailContent.subject,
		html: emailContent.html
	});

	return true;
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
						<p style="${noteStyle}">验证码10分钟内有效，请勿泄露给他人。</p>
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
						<p style="${noteStyle}">验证码10分钟内有效，请勿泄露给他人。</p>
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
						<p style="${noteStyle}">验证码10分钟内有效，请勿泄露给他人。</p>
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
						<p style="${noteStyle}">验证码10分钟内有效，请勿泄露给他人。</p>
						<p style="margin-top:16px;padding:12px;background:#fff3cd;border-left:4px solid #ffc107;color:#856404;">
							<strong>安全提示：</strong>如果这不是您本人的操作，请忽略此邮件并立即检查您的账户安全。
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
						<p style="${noteStyle}">验证码10分钟内有效，请勿泄露给他人。</p>
					</div>
				`
			};
	}
}


