import nodemailer from 'nodemailer';

function getSmtpConfig() {
	const host = process.env.SMTP_HOST;
	const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
	const user = process.env.SMTP_USER;
	const pass = process.env.SMTP_PASS;
	const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
	const from = process.env.SMTP_FROM;
	const fromName = process.env.SMTP_FROM_NAME || 'Cosnap AI';
	return { host, port, user, pass, secure, from, fromName };
}

export function isEmailEnabled() {
	const { host, port, user, pass, from } = getSmtpConfig();
	return Boolean(host && port && user && pass && from);
}

export async function sendVerificationEmail(toEmail, code) {
	const cfg = getSmtpConfig();
	if (!isEmailEnabled()) {
		console.warn('[Email] SMTP 未配置，跳过真实发信。验证码:', code, '收件人:', toEmail);
		return false;
	}

	const transporter = nodemailer.createTransport({
		host: cfg.host,
		port: cfg.port,
		secure: cfg.secure,
		auth: { user: cfg.user, pass: cfg.pass }
	});

	const html = `
	  <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
	    <h2>您的注册验证码</h2>
	    <p>您好！您正在进行 Cosnap 账户注册，本次验证码为：</p>
	    <div style="font-size:28px;font-weight:bold;letter-spacing:4px;padding:12px 16px;background:#f4f4f5;border-radius:8px;display:inline-block;">${code}</div>
	    <p style="margin-top:12px;color:#666">验证码10分钟内有效，请勿泄露给他人。</p>
	  </div>
	`;

	await transporter.sendMail({
		from: `${cfg.fromName} <${cfg.from}>`,
		to: toEmail,
		subject: 'Cosnap 注册验证码',
		html
	});

	return true;
}


