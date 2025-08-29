#!/usr/bin/env node

/**
 * SendGrid SMTP配置测试工具
 * 
 * SendGrid是最推荐的专业邮箱服务，具有最高的投递率和完善的分析功能。
 * 免费额度：每月100封邮件永久免费
 * 
 * 使用方法:
 *   node scripts/test-sendgrid-smtp.js
 *   
 * 需要的环境变量:
 *   SMTP_HOST=smtp.sendgrid.net
 *   SMTP_PORT=587
 *   SMTP_SECURE=false
 *   SMTP_USER=apikey
 *   SMTP_PASS=your-sendgrid-api-key  # SG.开头的API密钥
 *   SMTP_FROM=your-verified-email@yourdomain.com
 *   SMTP_FROM_NAME=Cosnap AI
 */

import { config } from 'dotenv';
import nodemailer from 'nodemailer';

// 加载环境变量
config();

console.log('🚀 SendGrid SMTP配置测试工具');
console.log('====================================\n');

function getSendGridConfig() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = String(process.env.SMTP_SECURE).toLowerCase() === 'true';
    const from = process.env.SMTP_FROM;
    const fromName = process.env.SMTP_FROM_NAME || 'Cosnap AI';

    return { host, port, user, pass, secure, from, fromName };
}

function validateSendGridConfig() {
    const cfg = getSendGridConfig();
    const errors = [];

    if (!cfg.host) {
        errors.push('SMTP_HOST is required');
    } else if (cfg.host === 'smtp.sendgrid.net') {
        // SendGrid特定验证
        if (!cfg.user || cfg.user !== 'apikey') {
            errors.push('SendGrid需要设置SMTP_USER=apikey');
        }
        if (!cfg.pass || !cfg.pass.startsWith('SG.')) {
            errors.push('SendGrid需要使用以SG.开头的API密钥作为SMTP_PASS');
        }
        if (cfg.port !== 587 && cfg.port !== 465) {
            errors.push('SendGrid推荐使用端口587(STARTTLS)或465(SSL)');
        }
        if (cfg.port === 587 && cfg.secure) {
            errors.push('端口587需要设置SMTP_SECURE=false');
        }
        if (cfg.port === 465 && !cfg.secure) {
            errors.push('端口465需要设置SMTP_SECURE=true');
        }
    }

    if (!cfg.user) {
        errors.push('SMTP_USER is required');
    }
    if (!cfg.pass) {
        errors.push('SMTP_PASS is required (SendGrid API密钥)');
    }
    if (!cfg.from) {
        errors.push('SMTP_FROM is required (需要是已验证的邮箱地址)');
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

async function testSendGridConnection(config) {
    const transporterConfig = {
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
            user: config.user,
            pass: config.pass
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
            throw new Error('SendGrid SMTP server verification failed');
        }
        console.log('✅ SendGrid SMTP连接验证成功');
        return transporter;
    } catch (error) {
        console.error('❌ SendGrid SMTP连接验证失败:', error.message);
        throw error;
    }
}

async function sendTestSendGridEmail(config, testEmail, testCode) {
    const transporter = await testSendGridConnection(config);
    
    try {
        const mailOptions = {
            from: `${config.fromName} <${config.from}>`,
            to: testEmail,
            subject: 'Cosnap AI - SendGrid配置测试成功！',
            html: `
                <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:600px;margin:0 auto;">
                    <div style="background:#1f3a93;color:white;padding:20px;text-align:center;">
                        <h1 style="margin:0;">🚀 SendGrid配置成功！</h1>
                    </div>
                    <div style="padding:20px;">
                        <h2>恭喜！您的SendGrid SMTP配置已经成功</h2>
                        <p>您现在可以享受专业级的邮件投递服务，具有：</p>
                        <ul>
                            <li>✅ 业界最高投递率（>95%）</li>
                            <li>✅ 详细的邮件分析和统计</li>
                            <li>✅ 自动处理退信和投诉</li>
                            <li>✅ 每月100封邮件免费额度</li>
                        </ul>
                        
                        <div style="background:#f8f9fa;border-left:4px solid #1f3a93;padding:15px;margin:20px 0;">
                            <h3 style="margin:0 0 10px 0;color:#1f3a93;">测试验证码</h3>
                            <div style="font-size:32px;font-weight:bold;letter-spacing:4px;color:#1f3a93;font-family:monospace;">
                                ${testCode}
                            </div>
                            <p style="margin:10px 0 0 0;color:#666;">这是一封测试邮件，验证码为演示用途</p>
                        </div>
                        
                        <div style="background:#d4edda;border-left:4px solid #28a745;padding:15px;margin:20px 0;">
                            <strong>🎉 配置完成：</strong>您的SendGrid邮箱已可以正常发送验证码邮件，享受专业级邮件服务！
                        </div>
                        
                        <div style="margin-top:30px;padding-top:20px;border-top:1px solid #eee;color:#666;font-size:14px;">
                            <p>此邮件由 Cosnap AI 通过 SendGrid 发送</p>
                            <p>SendGrid - 专业邮件投递服务</p>
                        </div>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ 测试邮件通过SendGrid发送成功到 ${testEmail}`);
        console.log(`   Message ID: ${info.messageId}`);
        
        return true;
    } catch (error) {
        console.error('❌ 测试邮件发送失败:', error.message);
        throw error;
    } finally {
        transporter.close();
    }
}

function getSendGridSetupInstructions() {
    return {
        steps: [
            "1. 访问 SendGrid 官网 (https://sendgrid.com) 注册账户",
            "2. 验证邮箱并完成账户设置",
            "3. 在Dashboard中点击 'Settings' → 'API Keys'",
            "4. 点击 'Create API Key' 选择 'Restricted Access'",
            "5. 给予 'Mail Send' 权限并生成API密钥",
            "6. 复制以SG.开头的API密钥",
            "7. 在 'Settings' → 'Sender Authentication' 中验证发件人邮箱"
        ],
        environmentVariables: {
            SMTP_HOST: 'smtp.sendgrid.net',
            SMTP_PORT: '587',
            SMTP_SECURE: 'false',
            SMTP_USER: 'apikey',
            SMTP_PASS: 'SG.your-sendgrid-api-key',
            SMTP_FROM: 'your-verified-email@yourdomain.com',
            SMTP_FROM_NAME: 'Cosnap AI'
        },
        commonIssues: [
            "使用普通密码而不是API密钥 (导致认证失败)",
            "SMTP_USER不是'apikey' (SendGrid固定用户名)",
            "发件人邮箱未在SendGrid中验证 (导致发送失败)",
            "API密钥权限不足 (需要Mail Send权限)"
        ],
        benefits: [
            "业界最高投递率（>95%）",
            "详细的邮件分析和统计",
            "自动处理退信和投诉",
            "支持模板和个性化",
            "每月100封邮件永久免费",
            "24/7技术支持"
        ]
    };
}

async function testSendGrid() {
    try {
        // 步骤1: 验证配置
        console.log('📋 步骤1: 验证SendGrid SMTP配置...');
        const validation = validateSendGridConfig();
        
        if (!validation.isValid) {
            console.error('❌ 配置验证失败:');
            validation.errors.forEach(error => {
                console.error(`   • ${error}`);
            });
            console.log('\n💡 SendGrid配置说明:');
            const instructions = getSendGridSetupInstructions();
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
            console.log('\n🏆 SendGrid优势:');
            instructions.benefits.forEach(benefit => {
                console.log(`   • ${benefit}`);
            });
            return false;
        }
        
        console.log('✅ 配置验证通过');
        console.log(`   服务器: ${validation.config.host}`);
        console.log(`   端口: ${validation.config.port}`);
        console.log(`   SSL加密: ${validation.config.secure}`);
        console.log(`   用户: ${validation.config.user}`);
        console.log(`   发件人: ${validation.config.from}`);
        console.log(`   API密钥: ${validation.config.pass ? validation.config.pass.substring(0, 10) + '...' : 'N/A'}`);

        // 步骤2: 测试SMTP连接
        console.log('\n🔗 步骤2: 测试SendGrid SMTP连接...');
        let transporter;
        try {
            transporter = await testSendGridConnection(validation.config);
        } catch (error) {
            // 提供具体的错误解决建议
            if (error.message.includes('535')) {
                console.log('\n💡 认证失败错误 (535)');
                console.log('   请检查API密钥是否正确且具有Mail Send权限');
                console.log('   确保SMTP_USER设置为"apikey"');
            } else if (error.message.includes('ECONNREFUSED')) {
                console.log('\n💡 连接被拒绝错误');
                console.log('   请检查网络连接和防火墙设置');
            } else if (error.message.includes('ENOTFOUND')) {
                console.log('\n💡 服务器未找到错误');
                console.log('   请检查SMTP_HOST设置是否为 smtp.sendgrid.net');
            }
            
            return false;
        } finally {
            if (transporter) {
                transporter.close();
            }
        }

        // 步骤3: 发送测试邮件
        console.log('\n📧 步骤3: 发送测试验证邮件...');
        const testEmail = validation.config.from; // 发送给已验证的邮箱
        const testCode = '999999';
        
        try {
            await sendTestSendGridEmail(validation.config, testEmail, testCode);
            console.log('   请检查邮箱收件箱，查看专业级邮件模板效果');
        } catch (error) {
            console.error('❌ 测试邮件发送失败:', error.message);
            if (error.message.includes('Sender address rejected')) {
                console.log('\n💡 发件人地址被拒绝');
                console.log('   请确保发件人邮箱已在SendGrid中验证');
                console.log('   访问 Settings → Sender Authentication 进行验证');
            }
            return false;
        }

        console.log('\n🎉 所有测试通过！SendGrid SMTP配置成功！');
        console.log('\n🏆 您现在享受专业级邮件服务:');
        const benefits = getSendGridSetupInstructions().benefits;
        benefits.forEach(benefit => {
            console.log(`   • ${benefit}`);
        });
        
        return true;

    } catch (error) {
        console.error('\n💥 测试过程中出现意外错误:', error.message);
        return false;
    }
}

async function main() {
    const success = await testSendGrid();
    
    if (success) {
        console.log('\n✅ SendGrid SMTP已准备好用于生产环境');
        console.log('\n🚀 下一步：');
        console.log('   1. 将环境变量配置到生产服务器');
        console.log('   2. 重启应用服务');
        console.log('   3. 测试用户注册验证码功能');
        console.log('   4. 在SendGrid Dashboard中监控邮件发送情况');
        console.log('\n📊 免费额度提醒：');
        console.log('   • 每月100封邮件永久免费');
        console.log('   • 超出后$14.95/月（40,000封邮件）');
        console.log('   • 建议设置使用量告警');
        process.exit(0);
    } else {
        console.log('\n❌ SendGrid SMTP配置需要修复后才能部署到生产环境');
        console.log('\n📚 更多帮助资源:');
        console.log('   • SendGrid文档: https://docs.sendgrid.com/');
        console.log('   • API密钥设置: https://docs.sendgrid.com/ui/account-and-settings/api-keys');
        console.log('   • 发件人验证: https://docs.sendgrid.com/ui/sending-email/sender-verification');
        console.log('   • 配置指南: PROFESSIONAL_EMAIL_SETUP.md');
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

export { testSendGrid };