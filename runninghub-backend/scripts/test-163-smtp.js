#!/usr/bin/env node

/**
 * 163邮箱SMTP配置测试工具
 * 
 * 用于验证163邮箱SMTP配置是否正确，解决常见的认证和连接问题。
 * 
 * 使用方法:
 *   node scripts/test-163-smtp.js
 *   
 * 需要的环境变量:
 *   SMTP_HOST=smtp.163.com
 *   SMTP_PORT=465
 *   SMTP_SECURE=true
 *   SMTP_USER=your-email@163.com
 *   SMTP_PASS=your-authorization-code  # 客户端授权码，不是密码！
 *   SMTP_FROM=your-email@163.com
 *   SMTP_FROM_NAME=Cosnap AI
 */

import { config } from 'dotenv';
import nodemailer from 'nodemailer';

// 加载环境变量
config();

console.log('📧 163邮箱SMTP配置测试工具');
console.log('====================================\n');

function get163SmtpConfig() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = String(process.env.SMTP_SECURE).toLowerCase() === 'true';
    const from = process.env.SMTP_FROM;
    const fromName = process.env.SMTP_FROM_NAME || 'Cosnap AI';

    return { host, port, user, pass, secure, from, fromName };
}

function validate163Config() {
    const cfg = get163SmtpConfig();
    const errors = [];

    if (!cfg.host) {
        errors.push('SMTP_HOST is required');
    } else if (cfg.host === 'smtp.163.com') {
        // 163邮箱特定验证
        if (!cfg.user || !cfg.user.match(/@(163\.com|126\.com|yeah\.net)$/)) {
            errors.push('163邮箱需要使用 @163.com, @126.com 或 @yeah.net 邮箱地址');
        }
        if (!cfg.pass || cfg.pass.length < 6) {
            errors.push('163邮箱需要使用客户端授权码作为SMTP_PASS，不是登录密码');
        }
        if (cfg.port !== 465 && cfg.port !== 25) {
            errors.push('163邮箱推荐使用端口465(SSL)或25(普通)');
        }
        if (cfg.port === 465 && !cfg.secure) {
            errors.push('端口465需要设置SMTP_SECURE=true');
        }
        if (cfg.port === 25 && cfg.secure) {
            errors.push('端口25需要设置SMTP_SECURE=false');
        }
    }

    if (!cfg.user) {
        errors.push('SMTP_USER is required');
    }
    if (!cfg.pass) {
        errors.push('SMTP_PASS is required (使用客户端授权码，不是登录密码)');
    }
    if (!cfg.from) {
        errors.push('SMTP_FROM is required');
    }
    if (!cfg.port) {
        errors.push('SMTP_PORT is required');
    }

    // 检查SMTP_FROM和SMTP_USER是否匹配
    if (cfg.from && cfg.user && cfg.from !== cfg.user) {
        errors.push('SMTP_FROM必须与SMTP_USER使用相同的邮箱地址');
    }

    return {
        isValid: errors.length === 0,
        errors: errors,
        config: cfg
    };
}

async function test163SmtpConnection(config) {
    const transporterConfig = {
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
            user: config.user,
            pass: config.pass
        },
        // 163邮箱特殊配置
        tls: {
            // 允许163的自签名证书
            rejectUnauthorized: false
        },
        connectionTimeout: 30000,
        greetingTimeout: 15000,
        socketTimeout: 45000,
        logger: false,
        debug: false
    };

    const transporter = nodemailer.createTransporter(transporterConfig);
    
    try {
        const verified = await transporter.verify();
        if (!verified) {
            throw new Error('SMTP server verification failed');
        }
        console.log('✅ 163邮箱SMTP连接验证成功');
        return transporter;
    } catch (error) {
        console.error('❌ 163邮箱SMTP连接验证失败:', error.message);
        throw error;
    }
}

async function sendTest163Email(config, testEmail, testCode) {
    const transporter = await test163SmtpConnection(config);
    
    try {
        const mailOptions = {
            from: `${config.fromName} <${config.from}>`,
            to: testEmail,
            subject: 'Cosnap AI - 163邮箱测试邮件',
            html: `
                <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
                    <h2>163邮箱配置测试成功！</h2>
                    <p>恭喜！您的163邮箱SMTP配置已经成功。</p>
                    <div style="font-size:28px;font-weight:bold;letter-spacing:4px;padding:12px 16px;background:#f4f4f5;border-radius:8px;display:inline-block;">
                        ${testCode}
                    </div>
                    <p style="margin-top:12px;color:#666">这是一封测试邮件，验证码为演示用途。</p>
                    <p style="margin-top:16px;padding:12px;background:#d4edda;border-left:4px solid #28a745;color:#155724;">
                        <strong>✅ 配置成功：</strong>您的163邮箱已可以正常发送验证码邮件。
                    </p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ 测试邮件发送成功到 ${testEmail}`);
        console.log(`   Message ID: ${info.messageId}`);
        
        return true;
    } catch (error) {
        console.error('❌ 测试邮件发送失败:', error.message);
        throw error;
    } finally {
        transporter.close();
    }
}

function get163SetupInstructions() {
    return {
        steps: [
            "1. 登录163邮箱 (mail.163.com)",
            "2. 点击右上角 '设置' → 'POP3/SMTP/IMAP'",
            "3. 勾选 '开启SMTP服务'",
            "4. 设置客户端授权码（不是邮箱密码！）",
            "5. 复制生成的授权码用作SMTP_PASS",
            "6. 确保SMTP_FROM与SMTP_USER使用相同邮箱地址"
        ],
        environmentVariables: {
            SMTP_HOST: 'smtp.163.com',
            SMTP_PORT: '465',
            SMTP_SECURE: 'true',
            SMTP_USER: 'your-email@163.com',
            SMTP_PASS: 'your-authorization-code',
            SMTP_FROM: 'your-email@163.com',
            SMTP_FROM_NAME: 'Cosnap AI'
        },
        commonIssues: [
            "使用登录密码而不是客户端授权码 (导致535认证失败)",
            "SMTP_FROM与SMTP_USER不匹配 (导致Mail from错误)",
            "端口465未设置SMTP_SECURE=true (导致连接失败)",
            "防火墙阻拦465端口 (可尝试25端口)"
        ]
    };
}

async function test163Smtp() {
    try {
        // 步骤1: 验证配置
        console.log('📋 步骤1: 验证163邮箱SMTP配置...');
        const validation = validate163Config();
        
        if (!validation.isValid) {
            console.error('❌ 配置验证失败:');
            validation.errors.forEach(error => {
                console.error(`   • ${error}`);
            });
            console.log('\n💡 163邮箱配置说明:');
            const instructions = get163SetupInstructions();
            instructions.steps.forEach(step => {
                console.log(`   ${step}`);
            });
            console.log('\n🔧 需要的环境变量:');
            Object.entries(instructions.environmentVariables).forEach(([key, value]) => {
                console.log(`   ${key}=${value}`);
            });
            console.log('\n⚠️  常见问题:');
            instructions.commonIssues.forEach(issue => {
                console.log(`   • ${issue}`);
            });
            return false;
        }
        
        console.log('✅ 配置验证通过');
        console.log(`   服务器: ${validation.config.host}`);
        console.log(`   端口: ${validation.config.port}`);
        console.log(`   SSL加密: ${validation.config.secure}`);
        console.log(`   邮箱: ${validation.config.user}`);
        console.log(`   发件人: ${validation.config.from}`);
        console.log(`   授权码长度: ${validation.config.pass ? validation.config.pass.length : 0} 字符`);

        // 步骤2: 测试SMTP连接
        console.log('\n🔗 步骤2: 测试163邮箱SMTP连接...');
        let transporter;
        try {
            transporter = await test163SmtpConnection(validation.config);
        } catch (error) {
            // 提供具体的错误解决建议
            if (error.message.includes('535')) {
                console.log('\n💡 认证失败错误 (535)');
                console.log('   这通常意味着您使用了登录密码而不是客户端授权码');
                console.log('   请到163邮箱设置中生成客户端授权码');
            } else if (error.message.includes('ECONNREFUSED')) {
                console.log('\n💡 连接被拒绝错误');
                console.log('   请检查网络连接和防火墙设置');
                console.log('   如果465端口被封，可以尝试25端口');
            } else if (error.message.includes('ENOTFOUND')) {
                console.log('\n💡 服务器未找到错误');
                console.log('   请检查SMTP_HOST设置是否为 smtp.163.com');
            }
            
            return false;
        } finally {
            if (transporter) {
                transporter.close();
            }
        }

        // 步骤3: 发送测试邮件
        console.log('\n📧 步骤3: 发送测试验证邮件...');
        const testEmail = validation.config.from; // 发送给自己
        const testCode = '888888';
        
        try {
            await sendTest163Email(validation.config, testEmail, testCode);
            console.log('   请检查您的163邮箱收件箱');
        } catch (error) {
            console.error('❌ 测试邮件发送失败:', error.message);
            return false;
        }

        console.log('\n🎉 所有测试通过！163邮箱SMTP配置成功！');
        return true;

    } catch (error) {
        console.error('\n💥 测试过程中出现意外错误:', error.message);
        return false;
    }
}

async function main() {
    const success = await test163Smtp();
    
    if (success) {
        console.log('\n✅ 163邮箱SMTP已准备好用于生产环境');
        console.log('\n🚀 下一步：');
        console.log('   1. 将环境变量配置到生产服务器');
        console.log('   2. 重启应用服务');
        console.log('   3. 测试用户注册验证码功能');
        process.exit(0);
    } else {
        console.log('\n❌ 163邮箱SMTP配置需要修复后才能部署到生产环境');
        console.log('\n📚 更多帮助资源:');
        console.log('   • 163邮箱帮助中心: http://help.163.com/');
        console.log('   • 客户端设置指南: http://help.163.com/09/1223/14/5R7P3QI100753VB8.html');
        console.log('   • 配置指南: 163_SMTP_SETUP.md');
        process.exit(1);
    }
}

// 错误处理
process.on('uncaughtException', (error) => {
    console.error('\n💥 程序异常:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (error) => {
    console.error('\n💥 Promise异常:', error.message);
    process.exit(1);
});

// 直接运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { test163Smtp };