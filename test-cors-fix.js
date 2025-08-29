#!/usr/bin/env node

/**
 * 测试CORS跨域修复效果
 * 检查静态资源访问是否恢复正常
 */

async function testCORSFix() {
  console.log('🔧 测试CORS跨域修复效果...');
  
  const testUrl = 'https://cosnap-back.onrender.com/assets/placeholder-user.png';
  
  try {
    console.log(`\n📡 测试URL: ${testUrl}`);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Origin': 'https://cosnap.vercel.app',
        'User-Agent': 'CORS-Test/1.0'
      }
    });
    
    console.log(`\n📊 响应状态:`);
    console.log(`   状态码: ${response.status}`);
    console.log(`   状态文本: ${response.statusText}`);
    
    console.log(`\n🔍 关键CORS头部:`);
    console.log(`   Access-Control-Allow-Origin: ${response.headers.get('Access-Control-Allow-Origin') || '未设置'}`);
    console.log(`   Cross-Origin-Resource-Policy: ${response.headers.get('Cross-Origin-Resource-Policy') || '未设置'}`);
    console.log(`   Vary: ${response.headers.get('Vary') || '未设置'}`);
    
    console.log(`\n📝 其他相关头部:`);
    console.log(`   Content-Type: ${response.headers.get('Content-Type') || '未设置'}`);
    console.log(`   Content-Length: ${response.headers.get('Content-Length') || '未设置'}`);
    console.log(`   Cache-Control: ${response.headers.get('Cache-Control') || '未设置'}`);
    
    if (response.ok) {
      const corsOrigin = response.headers.get('Access-Control-Allow-Origin');
      const resourcePolicy = response.headers.get('Cross-Origin-Resource-Policy');
      
      if (corsOrigin && (corsOrigin === '*' || corsOrigin === 'https://cosnap.vercel.app')) {
        if (!resourcePolicy || resourcePolicy === 'cross-origin') {
          console.log('\n✅ CORS修复成功！');
          console.log('   - Access-Control-Allow-Origin 正确设置');
          console.log('   - Cross-Origin-Resource-Policy 允许跨域');
          console.log('   - 图片资源应该能正常加载');
        } else {
          console.log('\n⚠️  部分修复成功');
          console.log('   - Access-Control-Allow-Origin 正确设置');
          console.log(`   - Cross-Origin-Resource-Policy: ${resourcePolicy} (可能仍有问题)`);
        }
      } else {
        console.log('\n❌ CORS修复未完全生效');
        console.log('   - Access-Control-Allow-Origin 设置不正确或缺失');
      }
    } else {
      console.log('\n❌ 请求失败');
      console.log(`   错误: ${response.status} ${response.statusText}`);
    }
    
  } catch (error) {
    console.log('\n❌ 测试异常:', error.message);
  }
  
  console.log('\n🔄 如果修复成功，请等待2-3分钟让Render部署生效，然后刷新网页测试。');
}

testCORSFix().catch(console.error);