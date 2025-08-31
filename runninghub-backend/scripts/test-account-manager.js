#!/usr/bin/env node

/**
 * 测试账号管理脚本
 * 用于快速创建和管理测试账号，避免特效使用限制
 * 
 * 使用方法:
 * node scripts/test-account-manager.js [command] [options]
 */

import fetch from 'node-fetch';
import { program } from 'commander';
import chalk from 'chalk';

// 配置
const API_BASE_URL = process.env.API_BASE_URL || 'https://cosnap-back.onrender.com';
const ADMIN_KEY = process.env.ADMIN_RESET_KEY || 'your-admin-key-here';

// 工具函数
const makeRequest = async (endpoint, method = 'GET', body = null) => {
  const options = {
    method,
    headers: {
      'x-admin-key': ADMIN_KEY,
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin${endpoint}`, options);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error(chalk.red(`❌ 请求失败: ${error.message}`));
    process.exit(1);
  }
};

// 命令实现
const createTestUser = async (email, tier = 'VIP') => {
  console.log(chalk.blue(`🔧 创建测试账号: ${email} (${tier})...`));
  
  const result = await makeRequest('/test-user', 'POST', {
    email,
    tier,
    username: email.split('@')[0]
  });
  
  console.log(chalk.green(`✅ ${result.message}`));
  console.log(chalk.gray('用户信息:'));
  console.log(`   ID: ${result.user.id}`);
  console.log(`   邮箱: ${result.user.email}`);
  console.log(`   等级: ${result.user.tier}`);
  console.log(`   状态: ${result.user.status}`);
  console.log(`   过期时间: ${result.user.subscriptionEnd}`);
};

const batchCreateUsers = async (count, tier = 'VIP', prefix = 'test') => {
  console.log(chalk.blue(`🔧 批量创建 ${count} 个测试账号 (${tier})...`));
  
  const result = await makeRequest('/batch-test-users', 'POST', {
    count,
    tier,
    emailPrefix: prefix
  });
  
  console.log(chalk.green(`✅ ${result.message}`));
  result.createdUsers.forEach((user, index) => {
    console.log(`   ${index + 1}. ${user.email} (${user.tier})`);
  });
};

const listTestUsers = async () => {
  console.log(chalk.blue('🔍 获取所有测试账号...'));
  
  const result = await makeRequest('/test-users');
  
  console.log(chalk.green(`✅ 找到 ${result.count} 个测试账号:`));
  console.log('');
  
  if (result.testUsers.length === 0) {
    console.log(chalk.yellow('   没有找到测试账号'));
    return;
  }
  
  result.testUsers.forEach((user, index) => {
    const remainingText = user.remainingUsage === -1 ? '无限' : `${user.remainingUsage}`;
    console.log(`${index + 1}. ${chalk.bold(user.email)}`);
    console.log(`   等级: ${user.subscriptionTier} | 已用: ${user.monthlyUsage} | 剩余: ${remainingText}`);
    console.log(`   创建: ${new Date(user.createdAt).toLocaleString()}`);
    console.log('');
  });
};

const resetUserUsage = async (email) => {
  console.log(chalk.blue(`🔄 重置用户使用量: ${email}...`));
  
  const result = await makeRequest('/reset-usage', 'POST', { email });
  
  console.log(chalk.green(`✅ ${result.message}`));
  console.log(`   用户: ${result.user.email}`);
  console.log(`   使用量: ${result.user.monthlyUsage}`);
  console.log(`   重置时间: ${result.user.usageResetDate}`);
};

const upgradeUser = async (email, tier, duration = 365) => {
  console.log(chalk.blue(`⬆️  升级用户: ${email} -> ${tier} (${duration}天)...`));
  
  const result = await makeRequest('/upgrade-user', 'POST', {
    email,
    tier,
    duration
  });
  
  console.log(chalk.green(`✅ ${result.message}`));
  console.log(`   用户: ${result.user.email}`);
  console.log(`   等级: ${result.user.tier}`);
  console.log(`   过期时间: ${result.user.subscriptionEnd}`);
};

const getUserInfo = async (email) => {
  console.log(chalk.blue(`ℹ️  获取用户信息: ${email}...`));
  
  const result = await makeRequest(`/user-info?email=${encodeURIComponent(email)}`);
  
  console.log(chalk.green('✅ 用户详细信息:'));
  const user = result.user;
  console.log(`   ID: ${user.id}`);
  console.log(`   邮箱: ${user.email}`);
  console.log(`   用户名: ${user.username}`);
  console.log(`   等级: ${user.subscriptionTier} (${user.subscriptionStatus})`);
  console.log(`   订阅时间: ${user.subscriptionStart} ~ ${user.subscriptionEnd}`);
  console.log(`   使用情况: ${user.monthlyUsage} / ${user.limits?.monthlyLimit === -1 ? '无限' : user.limits?.monthlyLimit}`);
  console.log(`   剩余次数: ${user.remainingUsage === -1 ? '无限' : user.remainingUsage}`);
  console.log(`   测试账号: ${user.isTestAccount ? '是' : '否'}`);
  console.log(`   创建时间: ${new Date(user.createdAt).toLocaleString()}`);
  
  if (user.recentUsage && user.recentUsage.length > 0) {
    console.log(`   最近使用: ${user.recentUsage.length} 条记录`);
  }
};

// CLI 程序设置
program
  .name('test-account-manager')
  .description('Cosnap测试账号管理工具')
  .version('1.0.0');

program
  .command('create')
  .description('创建单个测试账号')
  .argument('<email>', '用户邮箱')
  .option('-t, --tier <tier>', '订阅等级 (FREE|PRO|VIP)', 'VIP')
  .action(createTestUser);

program
  .command('batch')
  .description('批量创建测试账号')
  .option('-c, --count <number>', '创建数量', '5')
  .option('-t, --tier <tier>', '订阅等级 (FREE|PRO|VIP)', 'VIP')
  .option('-p, --prefix <prefix>', '邮箱前缀', 'test')
  .action((options) => {
    batchCreateUsers(parseInt(options.count), options.tier, options.prefix);
  });

program
  .command('list')
  .description('列出所有测试账号')
  .action(listTestUsers);

program
  .command('reset')
  .description('重置用户使用量')
  .argument('<email>', '用户邮箱')
  .action(resetUserUsage);

program
  .command('upgrade')
  .description('升级用户订阅等级')
  .argument('<email>', '用户邮箱')
  .argument('<tier>', '目标等级 (FREE|PRO|VIP)')
  .option('-d, --duration <days>', '有效天数', '365')
  .action((email, tier, options) => {
    upgradeUser(email, tier, parseInt(options.duration));
  });

program
  .command('info')
  .description('获取用户详细信息')
  .argument('<email>', '用户邮箱')
  .action(getUserInfo);

// 预设的快捷命令
program
  .command('quick-setup')
  .description('快速设置：创建一个VIP测试账号用于测试')
  .action(async () => {
    const testEmail = 'test@cosnap.dev';
    console.log(chalk.blue('🚀 快速设置测试环境...'));
    console.log('');
    
    await createTestUser(testEmail, 'VIP');
    console.log('');
    console.log(chalk.green('🎉 测试环境设置完成！'));
    console.log(chalk.yellow('现在你可以使用以下账号进行测试:'));
    console.log(chalk.bold(`   邮箱: ${testEmail}`));
    console.log(chalk.bold('   等级: VIP (无限使用)'));
    console.log('');
    console.log(chalk.gray('💡 提示: 使用该邮箱登录前端即可避免使用限制'));
  });

// 错误处理
program.configureHelp({
  sortSubcommands: true,
});

// 显示帮助信息
if (process.argv.length <= 2) {
  program.help();
}

// 解析命令行参数
program.parse();

// 导出模块（用于其他脚本调用）
export { makeRequest, createTestUser, batchCreateUsers, listTestUsers, resetUserUsage, upgradeUser, getUserInfo };