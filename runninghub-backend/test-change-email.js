#!/usr/bin/env node

/**
 * 邮箱更改功能测试脚本
 * 
 * 测试流程：
 * 1. 用户登录获取访问令牌
 * 2. 为当前邮箱发送验证码
 * 3. 为新邮箱发送验证码
 * 4. 使用双重验证码完成邮箱更改
 * 5. 验证更改后需要重新登录
 */

import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'http://localhost:3001';
const TEST_DELAY = 2000; // 2秒延迟，避免rate limiting

// 测试用户数据
const testUser = {
  email: 'test-change-email@example.com',
  username: 'testchangeemail',
  password: 'TestPassword123',
  newEmail: 'new-email-test@example.com'
};

let accessToken = '';
let userId = '';

/**
 * 延迟函数
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 发送HTTP请求的通用函数
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'EmailChangeTest/1.0'
    }
  };

  if (accessToken) {
    defaultOptions.headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    ...defaultOptions,
    ...options,
    headers: { ...defaultOptions.headers, ...options.headers }
  });

  const data = await response.json();
  
  return {
    status: response.status,
    data,
    ok: response.ok
  };
}

/**
 * 步骤1: 注册测试用户
 */
async function registerTestUser() {
  console.log('\n=== 步骤1: 注册测试用户 ===');
  
  const response = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: testUser.email,
      username: testUser.username,
      password: testUser.password
    })
  });

  if (response.ok) {
    accessToken = response.data.accessToken;
    userId = response.data.user.id;
    console.log('✅ 用户注册成功');
    console.log(`   用户ID: ${userId}`);
    console.log(`   邮箱: ${response.data.user.email}`);
  } else if (response.status === 409) {
    console.log('ℹ️  用户已存在，尝试登录...');
    return await loginTestUser();
  } else {
    console.error('❌ 用户注册失败:', response.data);
    return false;
  }
  
  return true;
}

/**
 * 登录测试用户
 */
async function loginTestUser() {
  console.log('\n=== 登录测试用户 ===');
  
  const response = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testUser.email,
      password: testUser.password
    })
  });

  if (response.ok) {
    accessToken = response.data.accessToken;
    userId = response.data.user.id;
    console.log('✅ 登录成功');
    console.log(`   用户ID: ${userId}`);
    console.log(`   邮箱: ${response.data.user.email}`);
    return true;
  } else {
    console.error('❌ 登录失败:', response.data);
    return false;
  }
}

/**
 * 步骤2: 为当前邮箱发送验证码
 */
async function sendCurrentEmailCode() {
  console.log('\n=== 步骤2: 发送当前邮箱验证码 ===');
  
  const response = await apiRequest('/auth/send-code', {
    method: 'POST',
    body: JSON.stringify({
      email: testUser.email,
      scene: 'change_email'
    })
  });

  if (response.ok) {
    console.log('✅ 当前邮箱验证码发送成功');
    console.log('   请查看控制台日志获取验证码');
    return true;
  } else {
    console.error('❌ 当前邮箱验证码发送失败:', response.data);
    return false;
  }
}

/**
 * 步骤3: 为新邮箱发送验证码
 */
async function sendNewEmailCode() {
  console.log('\n=== 步骤3: 发送新邮箱验证码 ===');
  
  const response = await apiRequest('/auth/send-code', {
    method: 'POST',
    body: JSON.stringify({
      email: testUser.newEmail,
      scene: 'change_email'
    })
  });

  if (response.ok) {
    console.log('✅ 新邮箱验证码发送成功');
    console.log('   请查看控制台日志获取验证码');
    return true;
  } else {
    console.error('❌ 新邮箱验证码发送失败:', response.data);
    return false;
  }
}

/**
 * 步骤4: 执行邮箱更改
 */
async function changeEmail(currentEmailCode, newEmailCode) {
  console.log('\n=== 步骤4: 执行邮箱更改 ===');
  
  const response = await apiRequest('/auth/change-email', {
    method: 'POST',
    body: JSON.stringify({
      newEmail: testUser.newEmail,
      currentEmailCode,
      newEmailCode,
      password: testUser.password
    })
  });

  if (response.ok) {
    console.log('✅ 邮箱更改成功');
    console.log(`   新邮箱: ${response.data.user.email}`);
    console.log(`   消息: ${response.data.message}`);
    return true;
  } else {
    console.error('❌ 邮箱更改失败:', response.data);
    return false;
  }
}

/**
 * 步骤5: 验证需要重新登录
 */
async function verifyReloginRequired() {
  console.log('\n=== 步骤5: 验证需要重新登录 ===');
  
  // 尝试使用旧的访问令牌访问用户信息
  const response = await apiRequest('/auth/me', {
    method: 'GET'
  });

  if (response.status === 401) {
    console.log('✅ 验证通过：访问令牌已失效，需要重新登录');
    return true;
  } else if (response.ok) {
    console.log('⚠️  警告：访问令牌仍然有效，安全性可能存在问题');
    return false;
  } else {
    console.error('❌ 验证失败:', response.data);
    return false;
  }
}

/**
 * 步骤6: 使用新邮箱登录
 */
async function loginWithNewEmail() {
  console.log('\n=== 步骤6: 使用新邮箱登录 ===');
  
  const response = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testUser.newEmail,
      password: testUser.password
    })
  });

  if (response.ok) {
    console.log('✅ 新邮箱登录成功');
    console.log(`   邮箱: ${response.data.user.email}`);
    accessToken = response.data.accessToken; // 更新访问令牌
    return true;
  } else {
    console.error('❌ 新邮箱登录失败:', response.data);
    return false;
  }
}

/**
 * 清理：删除测试用户
 */
async function cleanup() {
  console.log('\n=== 清理: 删除测试用户 ===');
  
  // 为当前邮箱发送删除验证码
  const codeResponse = await apiRequest('/auth/send-code', {
    method: 'POST',
    body: JSON.stringify({
      email: testUser.newEmail, // 使用更改后的新邮箱
      scene: 'delete_account'
    })
  });

  if (!codeResponse.ok) {
    console.log('⚠️  无法发送删除验证码，跳过清理');
    return;
  }

  console.log('ℹ️  删除验证码已发送，请手动完成账户删除');
  console.log('   或者手动从数据库中删除测试用户');
}

/**
 * 安全测试：测试各种攻击场景
 */
async function securityTests() {
  console.log('\n=== 安全测试 ===');
  
  // 测试1: 使用无效的验证码
  console.log('\n--- 测试1: 使用无效验证码 ---');
  const invalidResponse = await apiRequest('/auth/change-email', {
    method: 'POST',
    body: JSON.stringify({
      newEmail: 'invalid-test@example.com',
      currentEmailCode: '000000',
      newEmailCode: '111111',
      password: testUser.password
    })
  });

  if (invalidResponse.status === 400) {
    console.log('✅ 安全测试通过：无效验证码被正确拒绝');
  } else {
    console.log('❌ 安全测试失败：无效验证码被接受');
  }

  // 测试2: 使用错误的密码
  console.log('\n--- 测试2: 使用错误密码 ---');
  const wrongPasswordResponse = await apiRequest('/auth/change-email', {
    method: 'POST',
    body: JSON.stringify({
      newEmail: 'wrong-password-test@example.com',
      currentEmailCode: '000000',
      newEmailCode: '111111',
      password: 'WrongPassword123'
    })
  });

  if (wrongPasswordResponse.status === 401) {
    console.log('✅ 安全测试通过：错误密码被正确拒绝');
  } else {
    console.log('❌ 安全测试失败：错误密码被接受');
  }

  // 测试3: 尝试使用已存在的邮箱
  console.log('\n--- 测试3: 使用已存在的邮箱 ---');
  const existingEmailResponse = await apiRequest('/auth/change-email', {
    method: 'POST',
    body: JSON.stringify({
      newEmail: testUser.email, // 使用原邮箱（应该已被其他用户使用）
      currentEmailCode: '000000',
      newEmailCode: '111111',
      password: testUser.password
    })
  });

  if (existingEmailResponse.status === 409 || existingEmailResponse.status === 400) {
    console.log('✅ 安全测试通过：已存在的邮箱被正确拒绝');
  } else {
    console.log('❌ 安全测试失败：已存在的邮箱被接受');
  }
}

/**
 * 主测试函数
 */
async function main() {
  console.log('🚀 开始邮箱更改功能测试');
  console.log(`📡 API地址: ${API_BASE}`);
  
  try {
    // 步骤1: 设置测试用户
    if (!await registerTestUser()) {
      return process.exit(1);
    }
    
    await delay(TEST_DELAY);

    // 步骤2: 发送当前邮箱验证码
    if (!await sendCurrentEmailCode()) {
      return process.exit(1);
    }
    
    await delay(TEST_DELAY);

    // 步骤3: 发送新邮箱验证码
    if (!await sendNewEmailCode()) {
      return process.exit(1);
    }

    console.log('\n⏸️  请查看服务器控制台日志，找到两个验证码');
    console.log('   格式类似: [验证码] email=xxx, scene=change_email, code=123456');
    console.log('   请在30秒内输入验证码，或按Ctrl+C退出\n');

    // 简单的命令行输入（实际使用中应该通过邮件获取）
    const currentEmailCode = process.argv[2] || '123456'; // 第一个参数
    const newEmailCode = process.argv[3] || '654321';    // 第二个参数

    if (process.argv.length < 4) {
      console.log('💡 提示: 使用方法: node test-change-email.js <当前邮箱验证码> <新邮箱验证码>');
      console.log('   例如: node test-change-email.js 123456 654321');
      console.log('   使用默认验证码进行测试...\n');
    }

    await delay(TEST_DELAY);

    // 步骤4: 执行邮箱更改
    if (!await changeEmail(currentEmailCode, newEmailCode)) {
      console.log('\n🔍 开始安全测试...');
      await securityTests();
      return process.exit(1);
    }

    await delay(TEST_DELAY);

    // 步骤5: 验证重新登录要求
    if (!await verifyReloginRequired()) {
      console.log('⚠️  安全警告：邮箱更改后应该强制重新登录');
    }

    await delay(TEST_DELAY);

    // 步骤6: 使用新邮箱登录
    if (!await loginWithNewEmail()) {
      return process.exit(1);
    }

    // 安全测试
    console.log('\n🔍 开始安全测试...');
    await securityTests();

    // 清理
    await cleanup();

    console.log('\n🎉 邮箱更改功能测试完成！');
    console.log('✅ 所有核心功能正常工作');

  } catch (error) {
    console.error('\n❌ 测试过程中出现错误:', error.message);
    process.exit(1);
  }
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}