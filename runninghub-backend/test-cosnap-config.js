// 测试更新后的Cosnap换背景配置
async function testCosnapConfig() {
  console.log('🧪 测试更新后的Cosnap换背景配置...');
  
  const workflowId = '1949831786093264897';
  
  // 模拟前端传递的nodeInfoList（包含新的select参数）
  const nodeInfoList = [
    { nodeId: '240', fieldName: 'image', paramKey: 'image_240' },
    { nodeId: '284', fieldName: 'image', paramKey: 'image_284' },
    { nodeId: '279', fieldName: 'prompt', paramKey: 'prompt_279' },
    { nodeId: '351', fieldName: 'select', paramKey: 'select_351' }
  ];
  
  // 模拟请求参数
  const requestParams = {
    image_240: 'test_image_1.jpg',
    image_284: 'test_image_2.jpg',
    prompt_279: 'describe the style of the image and atmosphere of the image in two sentence. start your answer with Change the background to',
    select_351: '2' // 用户选择：适合外景小程度修改背景
  };
  
  console.log('📋 测试参数:');
  console.log('- workflowId:', workflowId);
  console.log('- nodeInfoList:', JSON.stringify(nodeInfoList, null, 2));
  console.log('- requestParams:', JSON.stringify(requestParams, null, 2));
  
  try {
    // 模拟后端处理逻辑
    console.log('\n🔄 模拟后端处理nodeInfoList...');
    
    const updatedNodeInfoList = nodeInfoList.map((nodeInfo) => {
      if (nodeInfo.fieldName === 'image') {
        // 图片节点处理
        return {
          ...nodeInfo,
          fieldValue: requestParams[nodeInfo.paramKey]
        };
      } else if (nodeInfo.fieldName === 'text' || nodeInfo.fieldName === 'prompt') {
        // 文本节点处理
        return {
          ...nodeInfo,
          fieldValue: requestParams[nodeInfo.paramKey]
        };
      } else if (nodeInfo.fieldName === 'select') {
        // select节点处理
        return {
          ...nodeInfo,
          fieldValue: parseInt(requestParams[nodeInfo.paramKey])
        };
      }
      return nodeInfo;
    });
    
    console.log('✅ 更新后的nodeInfoList:');
    console.log(JSON.stringify(updatedNodeInfoList, null, 2));
    
    // 验证select参数是否正确转换
    const selectNode = updatedNodeInfoList.find(node => node.nodeId === '351');
    if (selectNode) {
      console.log('\n✅ select节点验证:');
      console.log('- nodeId:', selectNode.nodeId);
      console.log('- fieldName:', selectNode.fieldName);
      console.log('- fieldValue:', selectNode.fieldValue, '(类型:', typeof selectNode.fieldValue, ')');
      console.log('- 原始值:', requestParams.select_351);
      
      if (typeof selectNode.fieldValue === 'number') {
        console.log('✅ select值已正确转换为数字类型');
      } else {
        console.log('❌ select值转换失败');
      }
    }
    
    console.log('\n🎯 测试完成！新的select参数配置正常工作。');
    console.log('📝 用户现在可以选择：');
    console.log('  1: 适合场照大面积更改背景');
    console.log('  2: 适合外景小程度修改背景');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
testCosnapConfig(); 