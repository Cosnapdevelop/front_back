import axios from 'axios';
import FormData from 'form-data';

async function testMinimal() {
  console.log('🧪 最小化测试...');
  
  try {
    const formData = new FormData();
    
    // 基本信息
    formData.append('workflowId', '1952448857223442433');
    formData.append('regionId', 'china');
    
    // 只测试一个参数
    const nodeInfoList = [
      { nodeId: '19', fieldName: 'image', paramKey: 'image_19' },
      { nodeId: '85', fieldName: 'prompt', paramKey: 'prompt_85' }
    ];
    
    formData.append('nodeInfoList', JSON.stringify(nodeInfoList));
    
    // 只传递必要的参数
    formData.append('prompt_85', '霓虹光');
    
    // 创建一个简单的测试图片
    const testImageBuffer = Buffer.from('fake-image-data');
    formData.append('images', testImageBuffer, { filename: 'test.jpg' });
    
    console.log('📤 发送最小化请求...');
    console.log('📋 nodeInfoList:', JSON.stringify(nodeInfoList, null, 2));
    
    const response = await axios.post('https://cosnap-back.onrender.com/api/effects/comfyui/apply', formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 30000
    });
    
    console.log('✅ 成功!', response.data);
    
  } catch (error) {
    console.error('❌ 失败:', error.response?.data || error.message);
  }
}

testMinimal(); 