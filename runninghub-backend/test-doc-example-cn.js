import axios from 'axios';

const API_KEY = '50dcc0fbc848467092f853a9fcb49d50';
const WEBAPP_ID = '1877265245566922800'; // 文档示例中的webappId

async function testDocExampleCN() {
  try {
    console.log(`[测试] 中国大陆域名 - 文档示例webappId: ${WEBAPP_ID}`);
    
    const response = await axios.post('https://www.runninghub.cn/task/openapi/ai-app/run', {
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

testDocExampleCN(); 