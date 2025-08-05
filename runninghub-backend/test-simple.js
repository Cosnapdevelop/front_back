import axios from 'axios';
import FormData from 'form-data';

async function testSimple() {
  console.log('🧪 简单测试...');
  
  try {
    const formData = new FormData();
    
    // 基本信息
    formData.append('workflowId', '1952448857223442433');
    formData.append('regionId', 'china');
    
    // nodeInfoList
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
    
    // 参数值
    formData.append('prompt_85', '霓虹光');
    formData.append('shape_65', 'triangle');
    formData.append('X_offset_65', '0');
    formData.append('Y_offset_65', '-512');
    formData.append('scale_65', '1');
    formData.append('rotation_65', '0');
    
    // 创建一个简单的测试图片
    const testImageBuffer = Buffer.from('fake-image-data');
    formData.append('images', testImageBuffer, { filename: 'test.jpg' });
    
    console.log('📤 发送请求...');
    
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

testSimple(); 