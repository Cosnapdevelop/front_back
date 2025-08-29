#!/usr/bin/env node

/**
 * 测试新的RunningHub API key是否生效
 * API Key: 50dcc0fbc848467092f853a9fcb49d50
 */

import axios from 'axios';

const NEW_API_KEY = '50dcc0fbc848467092f853a9fcb49d50';

async function testNewAPIKey() {
  console.log('🔑 测试新的RunningHub API key...');
  console.log(`API Key: ${NEW_API_KEY}`);
  
  try {
    // 测试香港API
    console.log('\n🇭🇰 测试香港API...');
    const hkResponse = await axios.post('https://www.runninghub.ai/task/openapi/ai-app/run', {
      webappId: '1877265245566922800', // 测试用的webapp ID
      apiKey: NEW_API_KEY,
      nodeInfoList: [
        {
          nodeId: 'LoadImage',
          fieldName: 'image',
          fieldValue: 'https://images.pexels.com/photos/1674752/pexels-photo-1674752.jpeg'
        }
      ]
    });
    
    console.log(`   状态码: ${hkResponse.status}`);
    console.log(`   响应码: ${hkResponse.data.code}`);
    console.log(`   消息: ${hkResponse.data.message}`);
    
    if (hkResponse.data.code === 0 || hkResponse.data.code === 433) {
      console.log('   ✅ 香港API测试成功');
    } else {
      console.log('   ❌ 香港API测试失败');
    }
    
  } catch (error) {
    console.log('   ❌ 香港API测试异常:', error.response?.data || error.message);
  }
  
  try {
    // 测试中国API  
    console.log('\n🇨🇳 测试中国API...');
    const cnResponse = await axios.post('https://www.runninghub.cn/task/openapi/ai-app/run', {
      webappId: '1877265245566922800', // 测试用的webapp ID
      apiKey: NEW_API_KEY,
      nodeInfoList: [
        {
          nodeId: 'LoadImage', 
          fieldName: 'image',
          fieldValue: 'https://images.pexels.com/photos/1674752/pexels-photo-1674752.jpeg'
        }
      ]
    });
    
    console.log(`   状态码: ${cnResponse.status}`);
    console.log(`   响应码: ${cnResponse.data.code}`);
    console.log(`   消息: ${cnResponse.data.message}`);
    
    if (cnResponse.data.code === 0 || cnResponse.data.code === 433) {
      console.log('   ✅ 中国API测试成功');
    } else {
      console.log('   ❌ 中国API测试失败');
    }
    
  } catch (error) {
    console.log('   ❌ 中国API测试异常:', error.response?.data || error.message);
  }
  
  console.log('\n📋 API Key更新总结:');
  console.log('   - 旧Key: 8ee162873b6e44bd97d3ef6fce2de105');
  console.log('   - 新Key: 50dcc0fbc848467092f853a9fcb49d50');
  console.log('   - 更新文件: 28个文件已更新');
  console.log('   - 生产环境: 通过环境变量RUNNINGHUB_API_KEY配置');
}

testNewAPIKey().catch(console.error);