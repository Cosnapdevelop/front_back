import axios from 'axios';

const API_KEY = '50dcc0fbc848467092f853a9fcb49d50';
const WEBAPP_ID = '1907365560131153921';

async function testChinaDomain() {
  try {
    console.log(`[测试] 中国大陆域名: webappId=${WEBAPP_ID}`);
    
    const response = await axios.post('https://www.runninghub.cn/task/openapi/ai-app/run', {
      webappId: 1907365560131153921,
      apiKey: API_KEY,
      nodeInfoList: [
        {
          nodeId: "43",
          fieldName: "image",
          fieldValue: "41e82b13a6762d7a5a1f9b3ed1a2efbcc636ccf255387128d3e6970cc7c88424.png"
        },
        {
          nodeId: "69",
          fieldName: "image",
          fieldValue: "87ab752ae737b5e434e2a3e436c2c51deed43fc93c9c535e7329cec65379a25b.png"
        }
      ]
    }, {
      headers: {
        'Host': 'www.runninghub.cn',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log(`✅ 中国大陆域名成功 - 响应:`, response.data);
  } catch (error) {
    console.log(`❌ 中国大陆域名失败 - 错误:`, error.response?.data || error.message);
  }
}

testChinaDomain(); 