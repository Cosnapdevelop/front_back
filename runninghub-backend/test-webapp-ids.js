import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.RUNNINGHUB_API_KEY || '8ee162873b6e44bd97d3ef6fce2de105';

// 测试的webappId列表
const webappIds = [
  '1907365560131153921', // 超强换脸
  '1937084629516193794', // Flux Kontext
  '1947926545896734722', // 顶级人像放大
  '1903718280794906626', // 换背景电商版
  '1894616400458330114', // WanVideo
  '1907581130097192962'  // 其他
];

const regions = [
  { id: 'hongkong', domain: 'https://www.runninghub.ai' },
  { id: 'china', domain: 'https://www.runninghub.cn' }
];

async function testWebappId(webappId, region) {
  try {
    console.log(`\n[测试] webappId: ${webappId}, 地区: ${region.id}`);
    
    const response = await axios.post(`${region.domain}/task/openapi/ai-app/run`, {
      webappId: webappId, // FIXED: Use string format as required by RunningHub API
      apiKey: API_KEY,
      nodeInfoList: [
        {
          nodeId: "39",
          fieldName: "image",
          fieldValue: "test.jpg"
        }
      ],
      addMetadata: true
    }, {
      headers: {
        'Host': region.domain.replace('https://', ''),
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log(`✅ 成功 - 响应:`, response.data);
    return { webappId, region: region.id, status: 'success', response: response.data };
  } catch (error) {
    console.log(`❌ 失败 - 错误:`, error.response?.data || error.message);
    return { webappId, region: region.id, status: 'failed', error: error.response?.data || error.message };
  }
}

async function testAllWebappIds() {
  console.log('开始测试所有webappId...\n');
  
  const results = [];
  
  for (const webappId of webappIds) {
    for (const region of regions) {
      const result = await testWebappId(webappId, region);
      results.push(result);
      
      // 等待1秒避免请求过快
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('\n=== 测试结果汇总 ===');
  const successResults = results.filter(r => r.status === 'success');
  const failedResults = results.filter(r => r.status === 'failed');
  
  console.log(`✅ 成功的webappId (${successResults.length}):`);
  successResults.forEach(r => {
    console.log(`  - ${r.webappId} (${r.region})`);
  });
  
  console.log(`\n❌ 失败的webappId (${failedResults.length}):`);
  failedResults.forEach(r => {
    console.log(`  - ${r.webappId} (${r.region}): ${r.error?.msg || r.error}`);
  });
  
  return results;
}

// 运行测试
testAllWebappIds().catch(console.error);