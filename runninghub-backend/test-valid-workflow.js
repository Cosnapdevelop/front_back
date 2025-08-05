import axios from 'axios';

async function testValidWorkflow() {
  console.log('🔍 测试已知可用的工作流...');
  
  try {
    // 测试已知可用的工作流ID
    const response = await axios.post('https://www.runninghub.cn/task/openapi/getWorkflowJson', {
      apiKey: '8ee162873b6e44bd97d3ef6fce2de105',
      workflowId: String('1949831786093264897')  // Cosnap换背景工作流ID，确保是字符串类型
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Host': 'www.runninghub.cn'
      },
      timeout: 30000
    });
    
    console.log('✅ 获取工作流配置成功!');
    console.log('📋 完整响应:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.data) {
      const workflow = response.data.data;
      console.log('\n🔍 工作流节点配置:');
      
      Object.keys(workflow).forEach(nodeId => {
        const node = workflow[nodeId];
        console.log(`\n节点 ${nodeId}:`);
        console.log(`  类型: ${node.class_type}`);
        if (node.inputs) {
          console.log(`  输入字段:`);
          Object.keys(node.inputs).forEach(fieldName => {
            const fieldValue = node.inputs[fieldName];
            console.log(`    ${fieldName}: ${JSON.stringify(fieldValue)}`);
          });
        }
      });
    }
    
  } catch (error) {
    console.error('❌ 获取工作流配置失败:', error.response?.data || error.message);
  }
}

testValidWorkflow(); 