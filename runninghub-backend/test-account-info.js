import axios from 'axios';

const API_KEY = '8ee162873b6e44bd97d3ef6fce2de105';

async function testAccountInfo() {
  try {
    console.log(`[测试] 检查账户信息: API Key=${API_KEY}`);
    
    // 测试获取账户信息
    const response = await axios.post('https://www.runninghub.ai/task/openapi/account/info', {
      apiKey: API_KEY
    }, {
      headers: {
        'Host': 'www.runninghub.ai',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log(`✅ 账户信息响应:`, response.data);
  } catch (error) {
    console.log(`❌ 账户信息失败:`, error.response?.data || error.message);
  }
}

testAccountInfo(); 