/**
 * 测试所有特效的webappId
 * 
 * ⚠️ 重要提示 ⚠️
 * RunningHub管理员明确要求：webappId必须使用字符串形式传递，不能使用parseInt()转换为整数
 * 
 * 修复前：webappId: parseInt(effect.webappId)  ❌
 * 修复后：webappId: effect.webappId            ✅
 * 
 * 这个修复解决了之前所有webapp特效返回"webapp not exists"错误的问题
 * 
 * 使用方法：
 * node test-all-effects.js
 * 
 * 最后更新：2024年1月
 */

import axios from 'axios';

const API_KEY = '50dcc0fbc848467092f853a9fcb49d50';

// 所有特效的webappId列表
const effects = [
  {
    name: 'Ultimate upscale final v.1',
    webappId: '1907581130097192962',
    nodeInfoList: [
      { nodeId: "2", fieldName: "image", fieldValue: "test.jpg" },
      { nodeId: "161", fieldName: "value", fieldValue: "1" },
      { nodeId: "160", fieldName: "value", fieldValue: "0.25" }
    ]
  },
  {
    name: 'Flux Kontext Single Picture Mode',
    webappId: '1937084629516193794',
    nodeInfoList: [
      { nodeId: "39", fieldName: "image", fieldValue: "test.jpg" },
      { nodeId: "37", fieldName: "model", fieldValue: "flux-kontext-pro" },
      { nodeId: "37", fieldName: "aspect_ratio", fieldValue: "match_input_image" },
      { nodeId: "52", fieldName: "prompt", fieldValue: "给这个女人的发型变成齐耳短发" }
    ]
  },
  {
    name: '顶级人像放大-支持全身（体验版）',
    webappId: '1947926545896734722',
    nodeInfoList: [
      { nodeId: "6011", fieldName: "image", fieldValue: "test.jpg" }
    ]
  },
  {
    name: '换背景 | 电商实用版V5.0',
    webappId: '1903718280794906626',
    nodeInfoList: [
      { nodeId: "150", fieldName: "image", fieldValue: "test.jpg" },
      { nodeId: "48", fieldName: "image", fieldValue: "test.jpg" },
      { nodeId: "114", fieldName: "text", fieldValue: "0--产品图原始比例" },
      { nodeId: "165", fieldName: "value", fieldValue: "0" },
      { nodeId: "110", fieldName: "value", fieldValue: "1" },
      { nodeId: "173", fieldName: "light_position", fieldValue: "Top Right Light" }
    ]
  },
  {
    name: 'WanVideo 图生视频',
    webappId: '1894616400458330114',
    nodeInfoList: [
      { nodeId: "18", fieldName: "image", fieldValue: "test.jpg" },
      { nodeId: "282", fieldName: "value", fieldValue: "1" },
      { nodeId: "40", fieldName: "text", fieldValue: "一位漂亮的女人，同对镜头微笑" }
    ]
  }
];

const regions = [
  { id: 'hongkong', domain: 'https://www.runninghub.ai' },
  { id: 'china', domain: 'https://www.runninghub.cn' }
];

async function testEffect(effect, region) {
  try {
    console.log(`\n[测试] ${effect.name} (${region.id}): webappId=${effect.webappId}`);
    
    const response = await axios.post(`${region.domain}/task/openapi/ai-app/run`, {
      webappId: effect.webappId, // 使用字符串形式，不转换为整数
      apiKey: API_KEY,
      nodeInfoList: effect.nodeInfoList
    }, {
      headers: {
        'Host': region.domain.replace('https://', ''),
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log(`✅ 成功 - 响应:`, response.data);
    return { name: effect.name, region: region.id, status: 'success', response: response.data };
  } catch (error) {
    console.log(`❌ 失败 - 错误:`, error.response?.data || error.message);
    return { name: effect.name, region: region.id, status: 'failed', error: error.response?.data || error.message };
  }
}

async function testAllEffects() {
  console.log('开始测试所有特效...\n');
  
  const results = [];
  
  for (const effect of effects) {
    for (const region of regions) {
      const result = await testEffect(effect, region);
      results.push(result);
      
      // 等待1秒避免请求过快
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('\n=== 测试结果汇总 ===');
  const successResults = results.filter(r => r.status === 'success');
  const failedResults = results.filter(r => r.status === 'failed');
  
  console.log(`✅ 成功的特效 (${successResults.length}):`);
  successResults.forEach(r => {
    console.log(`  - ${r.name} (${r.region})`);
  });
  
  console.log(`\n❌ 失败的特效 (${failedResults.length}):`);
  failedResults.forEach(r => {
    console.log(`  - ${r.name} (${r.region}): ${r.error?.msg || r.error}`);
  });
  
  return results;
}

// 运行测试
testAllEffects().catch(console.error); 