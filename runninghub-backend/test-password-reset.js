#!/usr/bin/env node

/**
 * 密码重置功能测试脚本
 * 用法：node test-password-reset.js [email]
 */

import fetch from 'node-fetch';
import readline from 'readline';

const API_BASE = process.env.API_URL || 'http://localhost:3001';
const TEST_EMAIL = process.argv[2] || 'test@example.com';

// ANSI颜色代码
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

function question(rl, prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testForgotPassword(email) {
  log('cyan', `\n=== 测试1: 发起密码重置请求 ===`);
  log('blue', `测试邮箱: ${email}`);
  
  try {
    const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      log('green', '✅ 密码重置请求发送成功');
      log('white', `响应: ${data.message}`);
      return true;
    } else {
      log('red', '❌ 密码重置请求失败');
      log('white', `错误: ${data.error || '未知错误'}`);
      return false;
    }
  } catch (error) {
    log('red', `❌ 请求异常: ${error.message}`);
    return false;
  }
}

async function testVerifyToken(token) {
  log('cyan', `\n=== 测试2: 验证重置令牌 ===`);
  
  try {
    const response = await fetch(`${API_BASE}/api/auth/reset-password/${token}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      log('green', '✅ 令牌验证成功');
      log('white', `关联邮箱: ${data.email}`);
      return data;
    } else {
      log('red', '❌ 令牌验证失败');
      log('white', `错误: ${data.error || '未知错误'}`);
      return null;
    }
  } catch (error) {
    log('red', `❌ 请求异常: ${error.message}`);
    return null;
  }
}

async function testResetPassword(token, password, confirmPassword) {
  log('cyan', `\n=== 测试3: 执行密码重置 ===`);
  
  try {
    const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        token, 
        password, 
        confirmPassword 
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      log('green', '✅ 密码重置成功');
      log('white', `响应: ${data.message}`);
      return true;
    } else {
      log('red', '❌ 密码重置失败');
      log('white', `错误: ${data.error || '未知错误'}`);
      return false;
    }
  } catch (error) {
    log('red', `❌ 请求异常: ${error.message}`);
    return false;
  }
}

async function testRateLimiting() {
  log('cyan', `\n=== 测试4: 频率限制测试 ===`);
  
  const testEmail = 'ratelimit@test.com';
  let requestCount = 0;
  let blocked = false;
  
  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: testEmail })
      });
      
      requestCount++;
      
      if (response.status === 429) {
        const data = await response.json();
        log('yellow', `⚠️  第${requestCount}次请求被限流: ${data.error}`);
        blocked = true;
        break;
      } else if (response.ok) {
        log('green', `✅ 第${requestCount}次请求成功`);
      } else {
        log('red', `❌ 第${requestCount}次请求失败`);
      }
      
      // 短暂延迟避免过快请求
      await sleep(100);
    } catch (error) {
      log('red', `❌ 第${requestCount + 1}次请求异常: ${error.message}`);
      break;
    }
  }
  
  if (blocked) {
    log('green', '✅ 频率限制工作正常');
  } else {
    log('yellow', '⚠️  频率限制可能未生效或限制较宽松');
  }
}

async function testInvalidScenarios() {
  log('cyan', `\n=== 测试5: 异常场景测试 ===`);
  
  // 测试无效邮箱
  log('blue', '测试无效邮箱格式...');
  try {
    const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid-email' })
    });
    
    if (response.status === 400) {
      log('green', '✅ 无效邮箱格式正确被拒绝');
    } else {
      log('red', '❌ 无效邮箱格式未被正确处理');
    }
  } catch (error) {
    log('red', `❌ 测试异常: ${error.message}`);
  }
  
  // 测试无效令牌
  log('blue', '测试无效重置令牌...');
  try {
    const response = await fetch(`${API_BASE}/api/auth/reset-password/invalid-token`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.status === 400) {
      log('green', '✅ 无效令牌正确被拒绝');
    } else {
      log('red', '❌ 无效令牌未被正确处理');
    }
  } catch (error) {
    log('red', `❌ 测试异常: ${error.message}`);
  }
  
  // 测试弱密码
  log('blue', '测试弱密码...');
  try {
    const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        token: 'dummy-token', 
        password: '123', 
        confirmPassword: '123' 
      })
    });
    
    if (response.status === 400) {
      log('green', '✅ 弱密码正确被拒绝');
    } else {
      log('red', '❌ 弱密码未被正确处理');
    }
  } catch (error) {
    log('red', `❌ 测试异常: ${error.message}`);
  }
}

async function main() {
  log('magenta', '🚀 Cosnap AI 密码重置功能测试');
  log('white', `API地址: ${API_BASE}`);
  log('white', `测试邮箱: ${TEST_EMAIL}`);
  
  const rl = createInterface();
  
  try {
    // 测试1: 发起密码重置请求
    const forgotSuccess = await testForgotPassword(TEST_EMAIL);
    
    if (forgotSuccess) {
      log('yellow', '\n⏳ 请检查邮箱或控制台日志获取重置链接...');
      const resetLink = await question(rl, '请输入收到的重置链接或令牌: ');
      
      if (resetLink.trim()) {
        // 从链接中提取令牌（支持完整链接或仅令牌）
        const token = resetLink.includes('/reset-password/') 
          ? resetLink.split('/reset-password/')[1]
          : resetLink.trim();
        
        // 测试2: 验证令牌
        const verifyResult = await testVerifyToken(token);
        
        if (verifyResult) {
          // 测试3: 执行密码重置
          const newPassword = await question(rl, '请输入新密码 (需包含大小写字母、数字和特殊字符): ');
          const confirmPassword = await question(rl, '请确认新密码: ');
          
          await testResetPassword(token, newPassword, confirmPassword);
        }
      }
    }
    
    // 运行其他测试
    await testRateLimiting();
    await testInvalidScenarios();
    
    log('magenta', '\n✨ 测试完成！');
    
  } catch (error) {
    log('red', `❌ 测试过程中出现异常: ${error.message}`);
  } finally {
    rl.close();
  }
}

// 运行测试
main().catch(console.error);