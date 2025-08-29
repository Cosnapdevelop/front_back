#!/usr/bin/env node

/**
 * 智能邮件配置测试工具
 * 
 * 自动检测邮箱服务类型并运行对应的测试脚本
 * 支持：Gmail、163邮箱、SendGrid、Amazon SES、Mailgun等
 * 
 * 使用方法:
 *   node scripts/test-email-config.js
 *   
 * 这个脚本会自动：
 * 1. 检测你配置的邮箱服务类型
 * 2. 运行对应的专用测试脚本
 * 3. 提供详细的配置指导
 * 4. 给出最佳实践建议
 */

import { config } from 'dotenv';
import { testGmailSmtp } from './test-gmail-smtp.js';
import { test163Smtp } from './test-163-smtp.js';
import { testSendGrid } from './test-sendgrid-smtp.js';

// 加载环境变量
config();

console.log('🔍 智能邮件配置测试工具');
console.log('====================================\n');

function detectEmailService() {
    const host = process.env.SMTP_HOST?.toLowerCase();
    const user = process.env.SMTP_USER?.toLowerCase();
    const pass = process.env.SMTP_PASS;

    // 检测服务类型
    if (host === 'smtp.gmail.com') {
        return {
            type: 'gmail',
            name: 'Gmail',
            icon: '📧',
            description: 'Google Gmail服务'
        };
    }
    
    if (host === 'smtp.163.com') {
        return {
            type: '163',
            name: '163邮箱',
            icon: '📮',
            description: '网易163邮箱服务'
        };
    }
    
    if (host === 'smtp.sendgrid.net') {
        return {
            type: 'sendgrid',
            name: 'SendGrid',
            icon: '🚀',
            description: 'SendGrid专业邮件服务'
        };
    }
    
    if (host?.includes('amazonaws.com') || host?.includes('email-smtp')) {
        return {
            type: 'ses',
            name: 'Amazon SES',
            icon: '☁️',
            description: 'Amazon Simple Email Service'
        };
    }
    
    if (host === 'smtp.mailgun.org') {
        return {
            type: 'mailgun',
            name: 'Mailgun',
            icon: '🔫',
            description: 'Mailgun邮件服务'
        };
    }
    
    if (host === 'smtp.qq.com') {
        return {
            type: 'qq',
            name: 'QQ邮箱',
            icon: '🐧',
            description: '腾讯QQ邮箱服务'
        };
    }
    
    if (host === 'smtpdm.aliyun.com') {
        return {
            type: 'aliyun',
            name: '阿里云邮推',
            icon: '☁️',
            description: '阿里云邮件推送服务'
        };
    }

    return {
        type: 'unknown',
        name: '未知服务',
        icon: '❓',
        description: '未识别的SMTP服务'
    };
}

function getConfigAnalysis() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const secure = process.env.SMTP_SECURE;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM;

    const analysis = {
        hasConfig: false,
        issues: [],
        recommendations: []
    };

    // 检查基本配置
    if (!host) analysis.issues.push('SMTP_HOST 未配置');
    if (!port) analysis.issues.push('SMTP_PORT 未配置');
    if (!user) analysis.issues.push('SMTP_USER 未配置');
    if (!pass) analysis.issues.push('SMTP_PASS 未配置');
    if (!from) analysis.issues.push('SMTP_FROM 未配置');

    analysis.hasConfig = analysis.issues.length === 0;

    // 提供建议
    if (!analysis.hasConfig) {
        if (analysis.issues.length >= 3) {
            analysis.recommendations.push('建议从163邮箱开始，配置简单且完全免费');
            analysis.recommendations.push('如需专业级服务，推荐SendGrid（每月100封免费）');
        }
    }

    return analysis;
}

function displayServiceRecommendations() {
    console.log('📊 邮箱服务推荐（根据使用场景）:\n');
    
    const recommendations = [
        {
            icon: '🆓',
            name: '163邮箱（最推荐新手）',
            pros: ['完全免费', '配置简单', '国内速度快', '无发送限制'],
            cons: ['功能基础', '无详细分析'],
            useCase: '个人项目、开发测试、小型应用'
        },
        {
            icon: '🚀',
            name: 'SendGrid（最推荐专业）',
            pros: ['每月100封免费', '最高投递率', '详细分析', '专业支持'],
            cons: ['需要域名验证', '超量收费'],
            useCase: '商业项目、营销邮件、大型应用'
        },
        {
            icon: '💰',
            name: 'Amazon SES（最便宜）',
            pros: ['按量付费', '价格超低', '高可靠性', 'AWS集成'],
            cons: ['配置复杂', '需要技术基础'],
            useCase: '高发送量、企业级应用、成本敏感'
        }
    ];

    recommendations.forEach(rec => {
        console.log(`${rec.icon} ${rec.name}`);
        console.log(`   优势: ${rec.pros.join('、')}`);
        console.log(`   劣势: ${rec.cons.join('、')}`);
        console.log(`   适合: ${rec.useCase}\n`);
    });
}

async function runSpecificTest(serviceType) {
    console.log(`\n🧪 运行 ${serviceType.name} 专用测试...\n`);
    
    try {
        let success = false;
        
        switch (serviceType.type) {
            case 'gmail':
                success = await testGmailSmtp();
                break;
            case '163':
                success = await test163Smtp();
                break;
            case 'sendgrid':
                success = await testSendGrid();
                break;
            case 'ses':
                console.log('📋 Amazon SES测试功能开发中...');
                console.log('💡 请参考 PROFESSIONAL_EMAIL_SETUP.md 进行配置');
                break;
            case 'mailgun':
                console.log('📋 Mailgun测试功能开发中...');
                console.log('💡 请参考 PROFESSIONAL_EMAIL_SETUP.md 进行配置');
                break;
            default:
                console.log('⚠️  暂不支持此服务的自动测试');
                console.log('💡 请参考相关配置文档进行手动测试');
                break;
        }
        
        return success;
        
    } catch (error) {
        console.error('❌ 测试过程中出现错误:', error.message);
        return false;
    }
}

async function main() {
    try {
        // 步骤1: 分析当前配置
        console.log('📋 分析当前邮箱配置...');
        const analysis = getConfigAnalysis();
        
        if (!analysis.hasConfig) {
            console.log('❌ 邮箱配置不完整:');
            analysis.issues.forEach(issue => {
                console.log(`   • ${issue}`);
            });
            
            console.log('\n💡 配置建议:');
            analysis.recommendations.forEach(rec => {
                console.log(`   • ${rec}`);
            });
            
            displayServiceRecommendations();
            
            console.log('📚 配置指南:');
            console.log('   • 163邮箱配置: 163_SMTP_SETUP.md');
            console.log('   • Gmail配置: GMAIL_SMTP_SETUP.md');
            console.log('   • 专业服务配置: PROFESSIONAL_EMAIL_SETUP.md');
            
            process.exit(1);
        }
        
        // 步骤2: 检测邮箱服务类型
        console.log('✅ 基本配置检查通过');
        console.log('\n🔍 检测邮箱服务类型...');
        const serviceType = detectEmailService();
        console.log(`${serviceType.icon} 检测到服务: ${serviceType.name}`);
        console.log(`   描述: ${serviceType.description}\n`);
        
        // 步骤3: 运行专用测试
        const testResult = await runSpecificTest(serviceType);
        
        // 步骤4: 显示结果和建议
        if (testResult) {
            console.log(`\n🎉 ${serviceType.name} 配置测试成功！`);
            console.log('\n✅ 你的邮箱服务已准备就绪，可以：');
            console.log('   1. 部署到生产环境');
            console.log('   2. 开始发送验证码邮件');
            console.log('   3. 监控邮件发送情况');
            
            if (serviceType.type !== '163') {
                console.log('\n💡 如果遇到投递问题，163邮箱是稳定的备选方案');
            }
        } else {
            console.log(`\n❌ ${serviceType.name} 配置测试失败`);
            console.log('\n🔄 建议尝试的解决方案：');
            
            if (serviceType.type === 'gmail') {
                console.log('   1. 检查是否使用了应用密码而不是普通密码');
                console.log('   2. 确认已启用2步验证');
                console.log('   3. 考虑切换到163邮箱（配置更简单）');
            } else {
                console.log('   1. 检查配置参数是否正确');
                console.log('   2. 验证网络连接和防火墙设置');
                console.log('   3. 考虑切换到163邮箱或SendGrid');
            }
        }
        
        process.exit(testResult ? 0 : 1);
        
    } catch (error) {
        console.error('\n💥 程序运行异常:', error.message);
        console.error('📞 如需帮助，请查看相关配置文档或联系技术支持');
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

// 直接运行
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}