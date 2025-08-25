import axios from 'axios';

const API_KEY = '8ee162873b6e44bd97d3ef6fce2de105';
const WEBAPP_ID = '1907365560131153921'; // 用户curl示例中的webappId

async function testCurlExample() {
  try {
    console.log(`[测试] 使用用户curl示例的webappId: ${WEBAPP_ID}`);
    
    const response = await axios.post('https://www.runninghub.ai/task/openapi/ai-app/run', {
      webappId: WEBAPP_ID, // FIXED: Use string format as required by RunningHub API
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

    console.log(`✅ 成功 - 响应:`, response.data);
  } catch (error) {
    console.log(`❌ 失败 - 错误:`, error.response?.data || error.message);
    
    // 如果失败，尝试不同的格式
    console.log('\n[重试] 尝试不同的webappId格式...');
    try {
      const response2 = await axios.post('https://www.runninghub.ai/task/openapi/ai-app/run', {
        webappId: WEBAPP_ID, // FIXED: Use string format as required by RunningHub API
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

      console.log(`✅ 重试成功 - 响应:`, response2.data);
    } catch (error2) {
      console.log(`❌ 重试也失败 - 错误:`, error2.response?.data || error2.message);
    }
  }
}

testCurlExample(); 