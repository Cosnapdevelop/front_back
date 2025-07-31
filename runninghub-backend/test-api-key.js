import axios from 'axios';

const API_KEY = '8ee162873b6e44bd97d3ef6fce2de105';

async function testApiKey() {
  try {
    console.log(`[测试] API Key: ${API_KEY}`);
    
    // 测试获取账户信息接口
    const response = await axios.post('https://www.runninghub.ai/task/openapi/account/info', {
      apiKey: API_KEY
    }, {
      headers: {
        'Host': 'www.runninghub.ai',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log(`✅ API Key 有效 - 账户信息:`, response.data);
  } catch (error) {
    console.log(`❌ API Key 无效 - 错误:`, error.response?.data || error.message);
  }
}

testApiKey(); 