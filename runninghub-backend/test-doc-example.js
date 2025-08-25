import axios from 'axios';

const API_KEY = '8ee162873b6e44bd97d3ef6fce2de105';
const WEBAPP_ID = '1877265245566922800'; // 文档示例中的webappId

async function testDocExample() {
  try {
    console.log(`[测试] 文档示例webappId: ${WEBAPP_ID}`);
    
    const response = await axios.post('https://www.runninghub.ai/task/openapi/ai-app/run', {
      webappId: WEBAPP_ID, // FIXED: Use string format as required by RunningHub API
      apiKey: API_KEY,
      nodeInfoList: [
        {
          nodeId: "122",
          fieldName: "prompt",
          fieldValue: "一个在浴室里的金发女"
        }
      ]
    }, {
      headers: {
        'Host': 'www.runninghub.ai',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log(`✅ 文档示例成功 - 响应:`, response.data);
  } catch (error) {
    console.log(`❌ 文档示例失败 - 错误:`, error.response?.data || error.message);
  }
}

testDocExample(); 