import axios from 'axios';
import FormData from 'form-data';

async function testWorkflowValidation() {
  console.log('🔍 验证工作流节点配置...');
  
  try {
    const formData = new FormData();
    
    // 基本信息
    formData.append('workflowId', '1952448857223442433');
    formData.append('regionId', 'china');
    
    // 测试1：只使用image节点，不修改任何参数
    console.log('📋 测试1：只使用image节点');
    const nodeInfoList1 = [
      { nodeId: '19', fieldName: 'image', paramKey: 'image_19' }
    ];
    
    formData.append('nodeInfoList', JSON.stringify(nodeInfoList1));
    
    // 创建一个简单的测试图片
    const testImageBuffer = Buffer.from('fake-image-data');
    formData.append('images', testImageBuffer, { filename: 'test.jpg' });
    
    console.log('📤 发送测试1请求...');
    console.log('📋 nodeInfoList:', JSON.stringify(nodeInfoList1, null, 2));
    
    const response1 = await axios.post('https://cosnap-back.onrender.com/api/effects/comfyui/apply', formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 30000
    });
    
    console.log('✅ 测试1成功!', response1.data);
    
  } catch (error) {
    console.error('❌ 测试1失败:', error.response?.data || error.message);
    
    if (error.response?.data) {
      console.error('📋 错误详情:', JSON.stringify(error.response.data, null, 2));
    }
  }
  
  // 测试2：使用不同的节点ID
  try {
    console.log('\n📋 测试2：使用不同的节点ID');
    const formData2 = new FormData();
    
    formData2.append('workflowId', '1952448857223442433');
    formData2.append('regionId', 'china');
    
    // 尝试使用不同的节点ID
    const nodeInfoList2 = [
      { nodeId: '1', fieldName: 'image', paramKey: 'image_1' }
    ];
    
    formData2.append('nodeInfoList', JSON.stringify(nodeInfoList2));
    
    const testImageBuffer = Buffer.from('fake-image-data');
    formData2.append('images', testImageBuffer, { filename: 'test.jpg' });
    
    console.log('📤 发送测试2请求...');
    console.log('📋 nodeInfoList:', JSON.stringify(nodeInfoList2, null, 2));
    
    const response2 = await axios.post('https://cosnap-back.onrender.com/api/effects/comfyui/apply', formData2, {
      headers: {
        ...formData2.getHeaders(),
      },
      timeout: 30000
    });
    
    console.log('✅ 测试2成功!', response2.data);
    
  } catch (error) {
    console.error('❌ 测试2失败:', error.response?.data || error.message);
  }
  
  // 测试3：使用简易模式（不传递nodeInfoList）
  try {
    console.log('\n📋 测试3：使用简易模式（不传递nodeInfoList）');
    const formData3 = new FormData();
    
    formData3.append('workflowId', '1952448857223442433');
    formData3.append('regionId', 'china');
    
    // 不传递nodeInfoList，使用简易模式
    const testImageBuffer = Buffer.from('fake-image-data');
    formData3.append('images', testImageBuffer, { filename: 'test.jpg' });
    
    console.log('📤 发送测试3请求...');
    console.log('📋 使用简易模式，不传递nodeInfoList');
    
    const response3 = await axios.post('https://cosnap-back.onrender.com/api/effects/comfyui/apply', formData3, {
      headers: {
        ...formData3.getHeaders(),
      },
      timeout: 30000
    });
    
    console.log('✅ 测试3成功!', response3.data);
    
  } catch (error) {
    console.error('❌ 测试3失败:', error.response?.data || error.message);
  }
}

testWorkflowValidation(); 