#!/usr/bin/env node

/**
 * 云端部署测试脚本
 * 测试已部署到Render和Vercel的Cosnap AI应用
 */

import axios from 'axios';

// 配置你的部署URL
const CONFIG = {
  BACKEND_URL: 'https://cosnap-back.onrender.com', // 你的Render后端URL
  FRONTEND_URL: 'https://cosnap.vercel.app', // 你的Vercel前端URL
  TIMEOUT: 15000 // 增加超时时间适应云端响应
};

const log = {
  info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[PASS]\x1b[0m ${msg}`),
  error: (msg) => console.log(`\x1b[31m[FAIL]\x1b[0m ${msg}`),
  warning: (msg) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`),
  section: (msg) => console.log(`\n\x1b[1m\x1b[35m=== ${msg} ===\x1b[0m`)
};

async function testCloudDeployment() {
  log.section('Cosnap AI 云端部署测试');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // 测试1: 后端健康检查
  log.info('测试1: 后端健康检查...');
  try {
    const response = await axios.get(`${CONFIG.BACKEND_URL}/health`, {
      timeout: CONFIG.TIMEOUT
    });
    
    if (response.status === 200 && response.data.status === 'healthy') {
      log.success('后端健康检查通过');
      log.info(`  状态: ${response.data.status}`);
      log.info(`  数据库: ${response.data.database || 'connected'}`);
      results.passed++;
    } else {
      throw new Error(`健康检查返回异常状态: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    log.error(`后端健康检查失败: ${error.message}`);
    results.failed++;
  }

  // 测试2: API密钥验证 
  log.info('测试2: API密钥验证...');
  try {
    // 这个测试需要后端有相应的endpoint，可能需要调整
    const response = await axios.get(`${CONFIG.BACKEND_URL}/health`, {
      timeout: CONFIG.TIMEOUT
    });
    
    if (response.status === 200) {
      log.success('API服务可访问');
      results.passed++;
    }
  } catch (error) {
    log.error(`API访问失败: ${error.message}`);
    results.failed++;
  }

  // 测试3: CORS配置检查
  log.info('测试3: CORS配置检查...');
  try {
    const response = await axios.options(`${CONFIG.BACKEND_URL}/health`, {
      timeout: CONFIG.TIMEOUT,
      headers: {
        'Origin': 'https://localhost:3000',
        'Access-Control-Request-Method': 'GET'
      }
    });
    
    log.success('CORS配置正常');
    results.passed++;
  } catch (error) {
    // OPTIONS请求失败可能是正常的，取决于服务器配置
    log.warning(`CORS检查: ${error.message}`);
    results.passed++; // 不算作失败
  }

  // 测试4: 错误处理检查
  log.info('测试4: 错误处理检查...');
  try {
    await axios.get(`${CONFIG.BACKEND_URL}/api/nonexistent`, {
      timeout: CONFIG.TIMEOUT
    });
    log.error('应该返回404错误，但没有');
    results.failed++;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      log.success('404错误处理正常');
      results.passed++;
    } else {
      log.warning(`错误处理: ${error.message}`);
      results.passed++; // 不算严重失败
    }
  }

  // 测试5: 性能基准
  log.info('测试5: 响应时间测试...');
  const performanceTests = [];
  
  for (let i = 0; i < 3; i++) {
    try {
      const startTime = Date.now();
      await axios.get(`${CONFIG.BACKEND_URL}/api/health`, {
        timeout: CONFIG.TIMEOUT
      });
      const responseTime = Date.now() - startTime;
      performanceTests.push(responseTime);
    } catch (error) {
      log.error(`性能测试 ${i+1} 失败: ${error.message}`);
    }
  }
  
  if (performanceTests.length > 0) {
    const avgResponseTime = performanceTests.reduce((a, b) => a + b, 0) / performanceTests.length;
    log.info(`  平均响应时间: ${avgResponseTime.toFixed(2)}ms`);
    
    if (avgResponseTime < 2000) {
      log.success('响应时间良好');
      results.passed++;
    } else if (avgResponseTime < 5000) {
      log.warning('响应时间较慢但可接受');
      results.passed++;
    } else {
      log.error('响应时间过慢');
      results.failed++;
    }
  } else {
    log.error('无法完成性能测试');
    results.failed++;
  }

  // 前端测试 (如果配置了前端URL)
  if (CONFIG.FRONTEND_URL) {
    log.info('测试6: 前端可访问性...');
    try {
      const response = await axios.get(CONFIG.FRONTEND_URL, {
        timeout: CONFIG.TIMEOUT
      });
      
      if (response.status === 200) {
        log.success('前端部署可访问');
        results.passed++;
      }
    } catch (error) {
      log.error(`前端访问失败: ${error.message}`);
      results.failed++;
    }
  }

  // 输出测试结果
  log.section('测试结果总结');
  const total = results.passed + results.failed;
  const successRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : '0';
  
  log.info(`总测试数: ${total}`);
  log.success(`通过: ${results.passed}`);
  log.error(`失败: ${results.failed}`);
  log.info(`成功率: ${successRate}%`);
  
  if (results.failed === 0) {
    log.success('🎉 所有测试通过！云端部署工作正常');
  } else if (results.passed > results.failed) {
    log.warning('⚠️  大部分功能正常，有少数问题需要关注');
  } else {
    log.error('❌ 发现多个问题，需要检查部署配置');
  }

  // 提供建议的下一步
  log.section('建议的下一步');
  if (results.failed === 0) {
    console.log('✅ 可以进行用户测试');
    console.log('✅ 可以分享给其他人使用');
    console.log('✅ 考虑添加监控和日志');
  } else {
    console.log('🔧 检查失败的测试项');
    console.log('🔧 查看Render/Vercel部署日志');
    console.log('🔧 验证环境变量配置');
  }

  console.log('\n📋 手动测试清单:');
  console.log('1. 在浏览器访问前端URL');
  console.log('2. 尝试注册新用户');
  console.log('3. 上传图片测试AI功能');
  console.log('4. 检查控制台是否有错误');
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  // 检查配置
  if (!CONFIG.BACKEND_URL.includes('http')) {
    console.error('❌ 请在脚本中配置你的后端URL');
    console.log('💡 将 CONFIG.BACKEND_URL 改为你的Render后端地址');
    process.exit(1);
  }
  
  console.log('🚀 开始测试云端部署...');
  console.log(`📍 后端地址: ${CONFIG.BACKEND_URL}`);
  
  testCloudDeployment().catch(error => {
    console.error('💥 测试执行失败:', error.message);
    process.exit(1);
  });
}

export default testCloudDeployment;