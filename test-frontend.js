// 简单的前端测试脚本
const FRONTEND_URL = 'https://cosnap-8yjnayaw7-terrys-projects-0cc48ccf.vercel.app';

async function testFrontend() {
  console.log('🔍 测试前端服务...');
  console.log(`URL: ${FRONTEND_URL}`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 增加超时时间
    
    console.log('⏳ 正在连接...');
    const response = await fetch(FRONTEND_URL, { 
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log(`📊 响应状态: ${response.status}`);
    console.log(`📊 响应头:`, Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      console.log('✅ 前端服务正常！');
      console.log('🌐 您现在可以访问:', FRONTEND_URL);
      console.log('🎯 新功能已可用: Cosnap换背景select参数选择');
    } else {
      console.log(`⚠️  前端服务返回状态码: ${response.status}`);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('❌ 连接超时 (15秒)');
    } else {
      console.log('❌ 连接失败:', error.message);
    }
    
    console.log('\n🔧 可能的解决方案:');
    console.log('1. 检查网络连接');
    console.log('2. 等待Vercel部署完成 (通常需要2-5分钟)');
    console.log('3. 检查Vercel控制台: https://vercel.com/terrys-projects-0cc48ccf/cosnap');
  }
}

testFrontend(); 