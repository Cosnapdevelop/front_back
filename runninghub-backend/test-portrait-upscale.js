import axios from 'axios';

const API_KEY = '8ee162873b6e44bd97d3ef6fce2de105';
const WEBAPP_ID = '1947926545896734722'; // 顶级人像放大的webappId

async function testPortraitUpscale() {
  try {
    console.log(`[测试] 顶级人像放大: webappId=${WEBAPP_ID}`);
    
    const response = await axios.post('https://www.runninghub.ai/task/openapi/ai-app/run', {
      webappId: WEBAPP_ID, // FIXED: Use string format as required by RunningHub API
      apiKey: API_KEY,
      nodeInfoList: [
        {
          nodeId: "6011",
          fieldName: "image",
          fieldValue: "test.jpg"
        }
      ]
    }, {
      headers: {
        'Host': 'www.runninghub.ai',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log(`✅ 顶级人像放大成功 - 响应:`, response.data);
  } catch (error) {
    console.log(`❌ 顶级人像放大失败 - 错误:`, error.response?.data || error.message);
  }
}

testPortraitUpscale(); 