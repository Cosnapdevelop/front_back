import axios from 'axios';
import FormData from 'form-data';

const apiKey = process.env.RUNNINGHUB_API_KEY || '50dcc0fbc848467092f853a9fcb49d50';
const webappId = '1949831786093264897'; // Cosnap背景替换的webappId

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

// 创建测试图片
function createTestImage() {
  return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
}

// 测试1: 上传图片
async function testUpload(regionId) {
  const regionConfig = REGIONS[regionId];
  console.log(`\n🔍 测试1: 图片上传 (${regionConfig.name})`);
  
  try {
    const form = new FormData();
    const testImage = createTestImage();
    
    form.append('file', testImage, {
      filename: 'test.png',
      contentType: 'image/png'
    });
    form.append('apiKey', apiKey);
    form.append('fileType', 'image');
    
    const response = await axios.post(
      `${regionConfig.apiDomain}/task/openapi/upload`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Host': regionConfig.host
        },
        timeout: 30000
      }
    );
    
    if (response.data && response.data.code === 0 && response.data.data && response.data.data.fileName) {
      console.log(`✅ ${regionConfig.name} 上传成功:`, response.data.data.fileName);
      return response.data.data.fileName;
    } else {
      throw new Error('上传失败: ' + JSON.stringify(response.data));
    }
  } catch (err) {
    console.error(`❌ ${regionConfig.name} 上传失败:`, err.message);
    throw err;
  }
}

// 测试2: 创建任务
async function testCreateTask(regionId, fileName) {
  const regionConfig = REGIONS[regionId];
  console.log(`\n🔍 测试2: 创建任务 (${regionConfig.name})`);
  
  try {
    const nodeInfoList = [
      { nodeId: '240', fieldName: 'image', fieldValue: fileName },
      { nodeId: '284', fieldName: 'image', fieldValue: fileName } // 使用同一个文件作为背景
    ];
    
    const requestBody = {
      apiKey: apiKey,
      workflowId: webappId,
      nodeInfoList: nodeInfoList,
      addMetadata: true
    };
    
    console.log('请求体:', JSON.stringify(requestBody, null, 2));
    
    const response = await axios.post(
      `${regionConfig.apiDomain}/task/openapi/create`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Host': regionConfig.host
        },
        timeout: 30000
      }
    );
    
    if (response.data && response.data.code === 0 && response.data.data && response.data.data.taskId) {
      console.log(`✅ ${regionConfig.name} 创建任务成功:`, response.data.data.taskId);
      return response.data.data.taskId;
    } else {
      throw new Error('创建任务失败: ' + JSON.stringify(response.data));
    }
  } catch (err) {
    console.error(`❌ ${regionConfig.name} 创建任务失败:`, err.message);
    throw err;
  }
}

// 测试3: 查询任务状态
async function testTaskStatus(regionId, taskId) {
  const regionConfig = REGIONS[regionId];
  console.log(`\n🔍 测试3: 查询任务状态 (${regionConfig.name})`);
  
  try {
    const requestBody = {
      apiKey: apiKey,
      taskId: taskId
    };
    
    const response = await axios.post(
      `${regionConfig.apiDomain}/task/openapi/status`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Host': regionConfig.host
        },
        timeout: 30000
      }
    );
    
    console.log(`✅ ${regionConfig.name} 状态查询成功:`, response.data);
    return response.data;
  } catch (err) {
    console.error(`❌ ${regionConfig.name} 状态查询失败:`, err.message);
    throw err;
  }
}

// 测试4: 查询任务结果
async function testTaskOutputs(regionId, taskId) {
  const regionConfig = REGIONS[regionId];
  console.log(`\n🔍 测试4: 查询任务结果 (${regionConfig.name})`);
  
  try {
    const requestBody = {
      apiKey: apiKey,
      taskId: taskId
    };
    
    const response = await axios.post(
      `${regionConfig.apiDomain}/task/openapi/outputs`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Host': regionConfig.host
        },
        timeout: 30000
      }
    );
    
    console.log(`✅ ${regionConfig.name} 结果查询成功:`, response.data);
    return response.data;
  } catch (err) {
    console.error(`❌ ${regionConfig.name} 结果查询失败:`, err.message);
    throw err;
  }
}

// 主测试函数
async function main() {
  console.log('🚀 开始全面API测试...');
  console.log('API Key:', apiKey);
  console.log('Webapp ID:', webappId);
  
  try {
    // 测试香港服务器
    console.log('\n=== 测试香港服务器 ===');
    
    // 1. 上传图片
    const fileName = await testUpload('hongkong');
    
    // 2. 创建任务
    const taskId = await testCreateTask('hongkong', fileName);
    
    // 3. 查询状态
    await testTaskStatus('hongkong', taskId);
    
    // 4. 查询结果
    await testTaskOutputs('hongkong', taskId);
    
    console.log('\n🎉 香港服务器API测试完成！');
    
    // 测试中国大陆服务器
    console.log('\n=== 测试中国大陆服务器 ===');
    
    // 1. 上传图片
    const fileName2 = await testUpload('china');
    
    // 2. 创建任务
    const taskId2 = await testCreateTask('china', fileName2);
    
    // 3. 查询状态
    await testTaskStatus('china', taskId2);
    
    // 4. 查询结果
    await testTaskOutputs('china', taskId2);
    
    console.log('\n🎉 中国大陆服务器API测试完成！');
    
  } catch (err) {
    console.error('\n💥 API测试失败:', err.message);
    process.exit(1);
  }
}

// 运行测试
main();