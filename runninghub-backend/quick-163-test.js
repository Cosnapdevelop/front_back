#!/usr/bin/env node

/**
 * 163邮箱快速测试脚本
 */

import nodemailer from 'nodemailer';

console.log('🧪 163邮箱快速测试\n');

// 163邮箱配置
const config = {
    host: 'smtp.163.com',
    port: 465,
    secure: true,
    user: 'cosnapai@163.com',
    pass: 'LVbPzHsD3KWz8uLK',
    from: 'cosnapai@163.com',
    fromName: 'Cosnap AI'
};

async function quickTest() {
    try {
        console.log('📋 步骤1: 创建SMTP连接...');
        
        const transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
                user: config.user,
                pass: config.pass
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        console.log('🔗 步骤2: 验证SMTP连接...');
        
        const verified = await transporter.verify();
        if (verified) {
            console.log('✅ SMTP连接验证成功！');
        }

        console.log('📧 步骤3: 发送测试邮件...');
        
        const mailOptions = {
            from: `${config.fromName} <${config.from}>`,
            to: config.from,
            subject: 'Cosnap AI - 163邮箱测试成功！',
            html: `
                <div style="font-family:Arial,sans-serif;padding:20px;">
                    <h2>🎉 163邮箱配置成功！</h2>
                    <p>恭喜！您的163邮箱SMTP配置已经成功工作。</p>
                    <div style="background:#f0f8ff;padding:15px;border-radius:5px;margin:20px 0;">
                        <h3>测试验证码：<span style="color:#007bff;font-size:24px;">123456</span></h3>
                    </div>
                    <p style="color:#666;">此邮件表明您的邮箱服务已准备就绪，可以开始发送用户验证码！</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ 测试邮件发送成功！');
        console.log(`   Message ID: ${info.messageId}`);
        console.log(`   收件箱: ${config.from}`);
        
        transporter.close();
        
        console.log('\n🎉 测试完全成功！你的163邮箱配置正确！');
        console.log('\n📱 请检查邮箱 cosnapai@163.com 的收件箱');
        
    } catch (error) {
        console.error('\n❌ 测试失败:', error.message);
        
        if (error.code === 'EAUTH') {
            console.log('\n💡 认证失败，请检查：');
            console.log('   1. 邮箱地址是否正确');
            console.log('   2. 授权码是否正确（不是登录密码）');
            console.log('   3. 是否已开启SMTP服务');
        }
    }
}

quickTest();