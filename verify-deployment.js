// 🚀 Cosnap部署验证脚本

const FRONTEND_URL = 'https://cosnap-k1ns0gk5x-terrys-projects-0cc48ccf.vercel.app';
const BACKEND_URL = 'https://cosnap-backend.onrender.com';

async function checkEndpoint(url, name) {
  try {
    console.log(`🔍 检查 ${name}...`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, { 
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      console.log(`✅ ${name} 状态正常 (${response.status})`);
      return true;
    } else {
      console.log(`⚠️  ${name} 返回状态码: ${response.status}`);
      return false;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`❌ ${name} 连接超时`);
    } else {
      console.log(`❌ ${name} 连接失败: ${error.message}`);
    }
    return false;
  }
}

async function checkBackendHealth() {
  try {
    console.log(`🔍 检查后端健康状态...`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`${BACKEND_URL}/health`, { 
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ 后端健康检查通过:`, data);
      return true;
    } else {
      console.log(`⚠️  后端健康检查失败: ${response.status}`);
      return false;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`❌ 后端健康检查超时`);
    } else {
      console.log(`❌ 后端健康检查失败: ${error.message}`);
    }
    return false;
  }
}

async function verifyDeployment() {
  console.log('🚀 开始验证Cosnap部署状态...\n');
  
  // 检查前端
  const frontendOk = await checkEndpoint(FRONTEND_URL, '前端服务');
  
  // 检查后端
  const backendOk = await checkEndpoint(BACKEND_URL, '后端服务');
  
  // 检查后端健康状态
  const backendHealthOk = await checkBackendHealth();
  
  console.log('\n📊 部署验证结果:');
  console.log(`前端服务: ${frontendOk ? '✅ 正常' : '❌ 异常'}`);
  console.log(`后端服务: ${backendOk ? '✅ 正常' : '❌ 异常'}`);
  console.log(`后端健康: ${backendHealthOk ? '✅ 正常' : '❌ 异常'}`);
  
  if (frontendOk && backendOk && backendHealthOk) {
    console.log('\n🎉 部署验证成功！所有服务正常运行。');
    console.log('\n📝 新功能已可用:');
    console.log('- Cosnap换背景select参数选择功能');
    console.log('- 用户可选择背景处理模式');
    console.log('- 支持场照和外景两种模式');
    
    console.log('\n🌐 访问地址:');
    console.log(`前端: ${FRONTEND_URL}`);
    console.log(`后端: ${BACKEND_URL}`);
    
    console.log('\n🧪 测试建议:');
    console.log('1. 访问前端地址');
    console.log('2. 选择Cosnap换背景特效');
    console.log('3. 测试背景处理模式选择功能');
    console.log('4. 验证任务创建和处理流程');
  } else {
    console.log('\n⚠️  部署验证发现问题，请检查:');
    if (!frontendOk) console.log('- 前端服务可能还在部署中');
    if (!backendOk) console.log('- 后端服务可能还在部署中');
    if (!backendHealthOk) console.log('- 后端健康检查失败');
    
    console.log('\n⏰ 建议等待2-5分钟后重新验证');
  }
}

// 运行验证
verifyDeployment().catch(console.error); 