import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const apiKey = process.env.RUNNINGHUB_API_KEY || '8ee162873b6e44bd97d3ef6fce2de105';
const webappId = process.env.RUNNINGHUB_WEBAPP_ID || 1937084629516193794;

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
  // 创建一个简单的测试图片数据
  const testImageData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  return testImageData;
}

// 测试上传功能
async function testUpload(regionId) {
  const regionConfig = REGIONS[regionId];
  console.log(`\n🔍 测试图片上传 (${regionConfig.name})`);
  
  try {
    const form = new FormData();
    const testImage = createTestImage();
    
    form.append('file', testImage, {
      filename: 'test.png',
      contentType: 'image/png'
    });
    form.append('apiKey', apiKey);
    form.append('fileType', 'image');
    
    console.log(`📤 发送上传请求到: ${regionConfig.apiDomain}/task/openapi/upload`);
    console.log(`📤 请求头:`, {
      'Host': regionConfig.host,
      'Content-Type': 'multipart/form-data'
    });
    
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
    
    console.log(`✅ ${regionConfig.name} 上传成功:`);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (err) {
    console.error(`❌ ${regionConfig.name} 上传失败:`);
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
  console.log('🚀 开始上传功能测试...');
  console.log('API Key:', apiKey);
  console.log('Webapp ID:', webappId);
  
  try {
    // 测试两个地区
    console.log('\n=== 测试中国大陆服务器 ===');
    await testUpload('china');
    
    console.log('\n=== 测试香港服务器 ===');
    await testUpload('hongkong');
    
    console.log('\n🎉 上传测试完成！');
  } catch (err) {
    console.error('\n💥 上传测试失败:', err.message);
    process.exit(1);
  }
}

// 运行测试
main();