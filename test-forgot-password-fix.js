#!/usr/bin/env node

/**
 * 测试忘记密码功能修复效果
 * 使用不同的邮箱格式测试API
 */

const testCases = [
  {
    name: '原始邮箱（如果用户存在）',
    email: 'terrylzr123@gmail.com'
  },
  {
    name: '大写邮箱测试',
    email: 'TERRYLZR123@GMAIL.COM'
  },
  {
    name: '混合大小写邮箱测试',
    email: 'TerryLZR123@Gmail.Com'
  },
  {
    name: '带空格的邮箱测试',
    email: ' terrylzr123@gmail.com '
  }
];

async function testForgotPassword(email) {
  const API_BASE_URL = 'https://runninghub-backend-production.up.railway.app';
  
  console.log(`\n🧪 测试邮箱: "${email}"`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Cosnap-Test/1.0'
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();
    
    console.log(`   状态码: ${response.status}`);
    console.log(`   响应: ${JSON.stringify(data, null, 2)}`);
    
    if (response.status === 200 && data.success) {
      console.log('   ✅ API调用成功');
    } else {
      console.log('   ❌ API调用失败');
    }
    
    return { success: true, status: response.status, data };
  } catch (error) {
    console.log(`   ❌ 请求错误: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log('🔍 开始测试忘记密码功能修复效果...');
  console.log('=' .repeat(60));
  
  const results = [];
  
  for (const testCase of testCases) {
    const result = await testForgotPassword(testCase.email);
    results.push({
      ...testCase,
      result
    });
    
    // 避免请求过于频繁
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 测试总结:');
  console.log('=' .repeat(60));
  
  let successCount = 0;
  results.forEach((test, index) => {
    const status = test.result.success ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${test.name}`);
    if (test.result.success) {
      successCount++;
      console.log(`   状态: ${test.result.status} - ${test.result.data.message || '成功'}`);
    } else {
      console.log(`   错误: ${test.result.error}`);
    }
  });
  
  console.log(`\n总结: ${successCount}/${results.length} 测试通过`);
  
  if (successCount === results.length) {
    console.log('🎉 所有测试通过！忘记密码功能修复成功！');
  } else {
    console.log('⚠️  部分测试失败，可能需要进一步调试');
  }
}

// 运行测试
runAllTests().catch(console.error);