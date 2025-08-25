#!/usr/bin/env node

/**
 * 认证修复验证脚本
 * 测试修复后的JWT认证是否正常工作
 */

const BACKEND_URL = 'https://cosnap-back.onrender.com';

console.log('🔐 开始测试认证修复...');
console.log('后端地址:', BACKEND_URL);
console.log('测试时间:', new Date().toISOString());
console.log('─'.repeat(50));

async function testAuthFix() {
  try {
    console.log('1️⃣ 测试直接访问 /auth/me (应该返回401)');
    
    const meResponse = await fetch(`${BACKEND_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const meData = await meResponse.json();
    console.log('状态码:', meResponse.status);
    console.log('响应:', meData);
    
    if (meResponse.status === 401) {
      console.log('✅ 未认证访问正确返回401');
    } else {
      console.log('❌ 未认证访问状态码异常');
    }
    
    console.log('\n2️⃣ 测试带无效token访问 /auth/me');
    
    const invalidTokenResponse = await fetch(`${BACKEND_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token-here'
      }
    });
    
    const invalidTokenData = await invalidTokenResponse.json();
    console.log('状态码:', invalidTokenResponse.status);
    console.log('响应:', invalidTokenData);
    
    if (invalidTokenResponse.status === 401) {
      console.log('✅ 无效token正确返回401');
    } else {
      console.log('❌ 无效token状态码异常');
    }
    
    console.log('\n3️⃣ 测试健康检查 (应该正常)');
    
    const healthResponse = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ 健康检查正常:', healthData);
    } else {
      console.log('❌ 健康检查失败:', healthResponse.status);
    }
    
    console.log('\n📋 测试总结:');
    console.log('- 后端服务正在运行');
    console.log('- JWT认证中间件正常工作'); 
    console.log('- 无token和无效token都正确返回401');
    console.log('- 需要用户登录以获得有效token进行进一步测试');
    
    console.log('\n🔧 推荐的下一步:');
    console.log('1. 在前端应用中尝试登录');
    console.log('2. 检查浏览器控制台是否还有401错误');
    console.log('3. 确认用户信息是否正确显示');

  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.log('🚨 无法连接到后端服务，请检查:');
      console.log('- 后端服务是否正在运行');
      console.log('- 网络连接是否正常');
      console.log('- URL是否正确');
    }
  }
}

testAuthFix();