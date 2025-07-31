import axios from 'axios';

const apiKey = process.env.RUNNINGHUB_API_KEY || '8ee162873b6e44bd97d3ef6fce2de105';

// 地区配置
const REGIONS = {
  china: {
    name: '中国大陆',
    apiDomain: 'https://www.runninghub.cn',
    host: 'www.runninghub.cn'
  },
  hongkong: {
    name: '香港/澳门/台湾',
    apiDomain: 'https://www.runninghub.ai',
    host: 'www.runninghub.ai'
  }
};

// 测试任务状态查询
async function testTaskStatus(taskId, regionId) {
  const regionConfig = REGIONS[regionId];
  console.log(`\n🔍 测试任务状态查询 (${regionConfig.name}): taskId=${taskId}`);
  
  try {
    const response = await axios.post(
      `${regionConfig.apiDomain}/task/openapi/status`,
      {
        apiKey: apiKey,
        taskId: taskId
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Host': regionConfig.host
        }
      }
    );
    
    console.log(`✅ ${regionConfig.name} 状态查询成功:`);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.code === 0) {
      console.log('📊 任务状态:', response.data.data);
    }
    
    return response.data;
  } catch (err) {
    console.error(`❌ ${regionConfig.name} 状态查询失败:`);
    console.error('错误详情:', {
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      message: err.message
    });
    throw err;
  }
}

// 测试任务结果获取
async function testTaskResult(taskId, regionId) {
  const regionConfig = REGIONS[regionId];
  console.log(`\n🔍 测试任务结果获取 (${regionConfig.name}): taskId=${taskId}`);
  
  try {
    const response = await axios.post(
      `${regionConfig.apiDomain}/task/openapi/outputs`,
      {
        apiKey: apiKey,
        taskId: taskId
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Host': regionConfig.host
        }
      }
    );
    
    console.log(`✅ ${regionConfig.name} 结果获取成功:`);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.code === 0 && response.data.data) {
      console.log('📸 生成的图片数量:', response.data.data.length);
      response.data.data.forEach((img, idx) => {
        console.log(`图片 ${idx + 1}:`, img.fileUrl);
      });
    }
    
    return response.data;
  } catch (err) {
    console.error(`❌ ${regionConfig.name} 结果获取失败:`);
    console.error('错误详情:', {
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      message: err.message
    });
    throw err;
  }
}

// 主测试函数
async function main() {
  const taskId = process.argv[2];
  const regionId = process.argv[3] || 'hongkong';
  
  if (!taskId) {
    console.error('❌ 请提供taskId参数');
    console.log('使用方法: node test-region.js <taskId> [regionId]');
    console.log('示例: node test-region.js 1950170519231926274 hongkong');
    console.log('示例: node test-region.js 1950170519231926274 china');
    process.exit(1);
  }
  
  if (!REGIONS[regionId]) {
    console.error('❌ 无效的地区ID');
    console.log('支持的地区:', Object.keys(REGIONS).join(', '));
    process.exit(1);
  }
  
  console.log('🚀 开始地区API测试...');
  console.log('API Key:', apiKey);
  console.log('Task ID:', taskId);
  console.log('地区:', REGIONS[regionId].name);
  console.log('API域名:', REGIONS[regionId].apiDomain);
  
  try {
    // 测试指定地区
    await testTaskStatus(taskId, regionId);
    await testTaskResult(taskId, regionId);
    
    console.log('\n🎉 地区测试完成！');
  } catch (err) {
    console.error('\n💥 地区测试失败:', err.message);
    process.exit(1);
  }
}

// 运行测试
main();