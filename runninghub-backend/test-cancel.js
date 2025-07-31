import axios from 'axios';

const apiKey = '8ee162873b6e44bd97d3ef6fce2de105';
const testTaskId = '1950186290735161345'; // 使用一个测试taskId

async function testCancelTask() {
  try {
    console.log('测试取消任务功能...');
    console.log('TaskId:', testTaskId);
    
    const response = await axios.post('http://localhost:3001/api/effects/comfyui/cancel', {
      taskId: testTaskId,
      regionId: 'hongkong'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    console.log('取消任务响应:', response.data);
    
    if (response.data.success) {
      console.log('✅ 取消任务成功');
    } else {
      console.log('❌ 取消任务失败:', response.data.error);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

testCancelTask();