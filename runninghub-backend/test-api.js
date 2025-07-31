import axios from 'axios';

const apiKey = process.env.RUNNINGHUB_API_KEY || '8ee162873b6e44bd97d3ef6fce2de105';
const baseUrl = 'https://www.runninghub.ai';

// 测试任务状态查询
async function testTaskStatus(taskId) {
  console.log(`\n🔍 测试任务状态查询: taskId=${taskId}`);
  
  try {
    const response = await axios.post(
      `${baseUrl}/task/openapi/status`,
      {
        apiKey: apiKey,
        taskId: taskId
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Host': 'www.runninghub.ai'
        }
      }
    );
    
    console.log('✅ 状态查询成功:');
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.code === 0) {
      console.log('📊 任务状态:', response.data.data);
    }
    
    return response.data;
  } catch (err) {
    console.error('❌ 状态查询失败:');
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
async function testTaskResult(taskId) {
  console.log(`\n🔍 测试任务结果获取: taskId=${taskId}`);
  
  try {
    const response = await axios.post(
      `${baseUrl}/task/openapi/outputs`,
      {
        apiKey: apiKey,
        taskId: taskId
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Host': 'www.runninghub.ai'
        }
      }
    );
    
    console.log('✅ 结果获取成功:');
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.code === 0 && response.data.data) {
      console.log('📸 生成的图片数量:', response.data.data.length);
      response.data.data.forEach((img, idx) => {
        console.log(`图片 ${idx + 1}:`, img.fileUrl);
      });
    }
    
    return response.data;
  } catch (err) {
    console.error('❌ 结果获取失败:');
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
  
  if (!taskId) {
    console.error('❌ 请提供taskId参数');
    console.log('使用方法: node test-api.js <taskId>');
    console.log('示例: node test-api.js 1950170519231926274');
    process.exit(1);
  }
  
  console.log('🚀 开始API测试...');
  console.log('API Key:', apiKey);
  console.log('Base URL:', baseUrl);
  console.log('Task ID:', taskId);
  
  try {
    // 测试状态查询
    await testTaskStatus(taskId);
    
    // 测试结果获取
    await testTaskResult(taskId);
    
    console.log('\n🎉 所有测试完成！');
  } catch (err) {
    console.error('\n💥 测试失败:', err.message);
    process.exit(1);
  }
}

// 运行测试
main();