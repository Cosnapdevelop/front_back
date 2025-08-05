import axios from 'axios';
import FormData from 'form-data';

async function testNoImage() {
  console.log('🧪 无图片测试...');
  
  try {
    const formData = new FormData();
    
    // 基本信息
    formData.append('workflowId', '1952448857223442433');
    formData.append('regionId', 'china');
    
    // 只测试一个参数，不包含图片
    const nodeInfoList = [
      { nodeId: '85', fieldName: 'prompt', paramKey: 'prompt_85' }
    ];
    
    formData.append('nodeInfoList', JSON.stringify(nodeInfoList));
    
    // 只传递必要的参数
    formData.append('prompt_85', '霓虹光');
    
    console.log('📤 发送无图片请求...');
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

testNoImage(); 