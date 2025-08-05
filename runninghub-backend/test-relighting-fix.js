import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

// 测试重新打光特效的参数传递
async function testRelightingEffect() {
  console.log('🧪 开始测试重新打光特效...');
  
  try {
    // 创建FormData
    const formData = new FormData();
    
    // 添加基本信息
    formData.append('workflowId', '1952448857223442433');
    formData.append('regionId', 'china');
    
    // 添加nodeInfoList
    const nodeInfoList = [
      { nodeId: '19', fieldName: 'image', paramKey: 'image_19' },
      { nodeId: '85', fieldName: 'prompt', paramKey: 'prompt_85' },
      { nodeId: '65', fieldName: 'shape', paramKey: 'shape_65' },
      { nodeId: '65', fieldName: 'X_offset', paramKey: 'X_offset_65' },
      { nodeId: '65', fieldName: 'Y_offset', paramKey: 'Y_offset_65' },
      { nodeId: '65', fieldName: 'scale', paramKey: 'scale_65' },
      { nodeId: '65', fieldName: 'rotation', paramKey: 'rotation_65' }
    ];
    
    formData.append('nodeInfoList', JSON.stringify(nodeInfoList));
    
    // 添加参数值
    formData.append('prompt_85', '霓虹光');
    formData.append('shape_65', 'triangle');
    formData.append('X_offset_65', '0');
    formData.append('Y_offset_65', '-512');
    formData.append('scale_65', '1');
    formData.append('rotation_65', '0');
    
    // 添加一个测试图片（如果有的话）
    const testImagePath = './test-image.jpg';
    if (fs.existsSync(testImagePath)) {
      formData.append('images', fs.createReadStream(testImagePath));
    } else {
      console.log('⚠️  没有找到测试图片，将使用默认图片');
      // 创建一个简单的测试图片
      const testImageBuffer = Buffer.from('fake-image-data');
      formData.append('images', testImageBuffer, { filename: 'test.jpg' });
    }
    
    console.log('📤 发送请求到后端...');
    console.log('📋 请求参数:');
    console.log('- workflowId:', '1952448857223442433');
    console.log('- regionId:', 'china');
    console.log('- nodeInfoList:', JSON.stringify(nodeInfoList, null, 2));
    console.log('- prompt_85:', '霓虹光');
    console.log('- shape_65:', 'triangle');
    console.log('- X_offset_65:', '0');
    console.log('- Y_offset_65:', '-512');
    console.log('- scale_65:', '1');
    console.log('- rotation_65:', '0');
    
    // 发送请求
    const response = await axios.post('https://cosnap-back.onrender.com/api/effects/comfyui/apply', formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 30000
    });
    
    console.log('✅ 请求成功!');
    console.log('📥 响应数据:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.taskId) {
      console.log('🎉 任务创建成功!');
      console.log('🆔 TaskId:', response.data.taskId);
      console.log('📝 TaskType:', response.data.taskType);
    } else {
      console.log('❌ 任务创建失败');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    
    if (error.response) {
      console.error('📥 错误响应:', error.response.status, error.response.statusText);
      console.error('📋 错误详情:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// 运行测试
testRelightingEffect(); 