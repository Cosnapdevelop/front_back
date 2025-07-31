import axios from 'axios';

const API_KEY = '8ee162873b6e44bd97d3ef6fce2de105';
const WEBAPP_ID = '1907365560131153921'; // 超强换脸的webappId

async function testFaceSwapExact() {
  try {
    console.log(`[测试] 超强换脸 - 使用确切配置: webappId=${WEBAPP_ID}`);
    
    const response = await axios.post('https://www.runninghub.ai/task/openapi/ai-app/run', {
      webappId: 1907365560131153921, // 直接使用数字，不parseInt
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
        'Host': 'www.runninghub.ai',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log(`✅ 超强换脸成功 - 响应:`, response.data);
  } catch (error) {
    console.log(`❌ 超强换脸失败 - 错误:`, error.response?.data || error.message);
  }
}

testFaceSwapExact(); 