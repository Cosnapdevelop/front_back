import axios from 'axios';
import FormData from 'form-data';

async function testDebug() {
  console.log('🔍 详细调试测试...');
  
  try {
    const formData = new FormData();
    
    // 基本信息
    formData.append('workflowId', '1952448857223442433');
    formData.append('regionId', 'china');
    
    // nodeInfoList - 只测试一个参数
    const nodeInfoList = [
      { nodeId: '19', fieldName: 'image', paramKey: 'image_19' },
      { nodeId: '85', fieldName: 'prompt', paramKey: 'prompt_85' },
      { nodeId: '65', fieldName: 'shape', paramKey: 'shape_65' }
    ];
    
    formData.append('nodeInfoList', JSON.stringify(nodeInfoList));
    
    // 只传递必要的参数
    formData.append('prompt_85', '霓虹光');
    formData.append('shape_65', 'triangle');
    
    // 创建一个简单的测试图片
    const testImageBuffer = Buffer.from('fake-image-data');
    formData.append('images', testImageBuffer, { filename: 'test.jpg' });
    
    console.log('📤 发送简化请求...');
    console.log('📋 nodeInfoList:', JSON.stringify(nodeInfoList, null, 2));
    console.log('📋 参数: prompt_85=霓虹光, shape_65=triangle');
    
    const response = await axios.post('https://cosnap-back.onrender.com/api/effects/comfyui/apply', formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 30000
    });
    
    console.log('✅ 成功!', response.data);
    
  } catch (error) {
    console.error('❌ 失败:', error.response?.data || error.message);
    
    if (error.response?.data) {
      console.error('📋 错误详情:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testDebug(); 