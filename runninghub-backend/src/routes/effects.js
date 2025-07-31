import express from 'express';
import multer from 'multer';
import { uploadImageService } from '../services/uploadImageService.js';
import { startComfyUITaskService, waitForComfyUITaskAndGetImages, cancelComfyUITask, getComfyUITaskStatus, getComfyUITaskResult } from '../services/comfyUITaskService.js';
import { startWebappTaskService, waitForWebappTaskAndGetImages, cancelWebappTask, getWebappTaskStatus, getWebappTaskResult } from '../services/webappTaskService.js';

const router = express.Router();

// 测试路由
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Effects路由工作正常',
    timestamp: new Date().toISOString()
  });
});

router.post('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'POST方法工作正常',
    body: req.body,
    timestamp: new Date().toISOString()
  });
});

// 文件验证函数
function validateFileType(file) {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ];
  return allowedTypes.includes(file.mimetype.toLowerCase());
}

function validateFileName(filename) {
  // 防止路径遍历攻击
  const dangerous = /[<>:"/\\|?*\x00-\x1f]/;
  if (dangerous.test(filename)) {
    return false;
  }
  // 限制文件名长度
  if (filename.length > 255) {
    return false;
  }
  return true;
}

// 配置multer用于处理文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB (支持云存储，大文件自动转云存储)
    files: 10, // 最多10个文件
    fieldSize: 1024 * 1024, // 1MB字段大小限制
  },
  fileFilter: (req, file, cb) => {
    console.log(`[文件验证] 检查文件: ${file.originalname}, MIME: ${file.mimetype}`);
    
    // 验证文件类型
    if (!validateFileType(file)) {
      console.warn(`[文件验证] 不支持的文件类型: ${file.mimetype}`);
      return cb(new Error(`不支持的文件类型: ${file.mimetype}。只允许 JPEG, PNG, GIF, WebP 格式`), false);
    }
    
    // 验证文件名
    if (!validateFileName(file.originalname)) {
      console.warn(`[文件验证] 不安全的文件名: ${file.originalname}`);
      return cb(new Error('文件名包含不安全字符或过长'), false);
    }
    
    console.log(`[文件验证] 文件通过验证: ${file.originalname}`);
    cb(null, true);
  },
});

// 通用的任务处理接口（支持ComfyUI和Webapp）
router.post('/comfyui/apply', upload.array('images', 10), async (req, res) => {
  try {
    console.log('[任务处理] 收到新的任务请求');
    console.log('[任务处理] Headers:', req.headers);
    console.log('[任务处理] 请求体:', req.body);
    console.log('[任务处理] 文件数量:', req.files ? req.files.length : 0);
    
    // 设置响应头确保正确的内容类型
    res.setHeader('Content-Type', 'application/json');
    
    const { workflowId, webappId, nodeInfoList, regionId = 'hongkong', instanceType } = req.body;
    
    // 判断任务类型 - 优先使用workflowId（ComfyUI）
    const isComfyUI = workflowId && workflowId !== 'undefined' && workflowId !== '';
    const isWebapp = webappId && webappId !== 'undefined' && webappId !== '' && !isComfyUI;
    
    console.log('[任务处理] 解析的参数:', {
      workflowId,
      webappId,
      nodeInfoList,
      regionId,
      instanceType,
      isComfyUI,
      isWebapp,
      nodeInfoListType: typeof nodeInfoList
    });
    
    if (!isComfyUI && !isWebapp) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少workflowId或webappId参数' 
      });
    }
    
    if (!nodeInfoList) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少nodeInfoList参数' 
      });
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: '没有上传图片文件' 
      });
    }
    
    const taskId = isComfyUI ? workflowId : webappId;
    const taskType = isComfyUI ? 'ComfyUI' : 'Webapp';
    
    console.log(`[${taskType}] 处理参数: taskId=${taskId}, regionId=${regionId}, 文件数量=${req.files.length}`);

    // 解析nodeInfoList
    let parsedNodeInfoList;
    try {
      parsedNodeInfoList = typeof nodeInfoList === 'string' ? JSON.parse(nodeInfoList) : nodeInfoList;
      console.log(`[${taskType}] 解析后的nodeInfoList:`, parsedNodeInfoList);
      
      if (!Array.isArray(parsedNodeInfoList)) {
        return res.status(400).json({ 
          success: false, 
          error: 'nodeInfoList必须是数组格式' 
        });
      }
    } catch (error) {
      console.error(`[${taskType}] nodeInfoList解析失败:`, error);
      return res.status(400).json({ 
        success: false, 
        error: 'nodeInfoList格式错误: ' + error.message 
      });
    }

    // 上传图片并更新nodeInfoList
    const uploadedImages = [];
    for (const file of req.files) {
      try {
        const fileName = await uploadImageService(file, regionId);
        uploadedImages.push(fileName);
        console.log(`[${taskType}] 图片上传成功:`, fileName);
      } catch (error) {
        console.error(`[${taskType}] 图片上传失败:`, error);
        return res.status(500).json({ 
          success: false, 
          error: '图片上传失败: ' + error.message 
        });
      }
    }

    // ⚠️ 重要：nodeInfoList fieldValue 填充逻辑
    //
    // 🎯 这是 RunningHub ComfyUI API 调用的核心逻辑
    // 前端传递的 nodeInfoList 只包含节点信息，需要在这里填充 fieldValue
    //
    // 📋 填充规则：
    // 1. 图片节点 (fieldName: 'image'): 使用上传后的 fileName
    // 2. 文本节点 (fieldName: 'text'/'prompt'): 从请求体中查找对应参数
    // 3. 按顺序处理，确保图片和参数的正确匹配
    //
    // 🔧 错误处理：
    // - 如果缺少必需的 fieldValue，RunningHub 会返回 803 错误
    // - 需要确保所有节点都有正确的 fieldValue
    let imageIndex = 0;
    const updatedNodeInfoList = parsedNodeInfoList.map((nodeInfo, index) => {
      console.log(`[${taskType}] 处理节点 ${index}:`, {
        nodeId: nodeInfo.nodeId,
        fieldName: nodeInfo.fieldName,
        paramKey: nodeInfo.paramKey,
        hasParamKey: !!nodeInfo.paramKey,
        uploadedImagesCount: uploadedImages.length,
        imageIndex: imageIndex
      });
      
      if (nodeInfo.fieldName === 'image') {
        // 图片节点 - 按顺序分配上传的图片
        if (imageIndex < uploadedImages.length) {
          const updatedNode = {
            ...nodeInfo,
            fieldValue: uploadedImages[imageIndex]
          };
          console.log(`[${taskType}] 更新图片节点 ${index}:`, {
            nodeId: nodeInfo.nodeId,
            fieldName: nodeInfo.fieldName,
            fieldValue: uploadedImages[imageIndex]
          });
          imageIndex++;
          return updatedNode;
        } else {
          console.warn(`[${taskType}] 图片节点 ${index} 缺少图片文件:`, {
            nodeId: nodeInfo.nodeId,
            imageIndex: imageIndex,
            uploadedImagesLength: uploadedImages.length
          });
        }
      } else if (nodeInfo.fieldName === 'text' || nodeInfo.fieldName === 'prompt') {
        // 文本节点 - 查找对应的参数
        const paramKey = nodeInfo.paramKey;
        if (paramKey && req.body[paramKey] !== undefined) {
          const updatedNode = {
            ...nodeInfo,
            fieldValue: req.body[paramKey]
          };
          console.log(`[${taskType}] 更新文本节点 ${index}:`, {
            nodeId: nodeInfo.nodeId,
            paramKey: paramKey,
            fieldValue: req.body[paramKey]
          });
          return updatedNode;
        } else {
          // 尝试根据nodeId查找参数
          const possibleParamKey = `prompt_${nodeInfo.nodeId}`;
          if (req.body[possibleParamKey] !== undefined) {
            const updatedNode = {
              ...nodeInfo,
              fieldValue: req.body[possibleParamKey]
            };
            console.log(`[${taskType}] 更新文本节点 ${index} (通过nodeId):`, {
              nodeId: nodeInfo.nodeId,
              paramKey: possibleParamKey,
              fieldValue: req.body[possibleParamKey]
            });
            return updatedNode;
          } else {
            console.warn(`[${taskType}] 文本节点 ${index} 缺少参数:`, {
              nodeId: nodeInfo.nodeId,
              paramKey: paramKey,
              possibleParamKey: possibleParamKey,
              bodyParams: Object.keys(req.body)
            });
          }
        }
      }
      
      return nodeInfo;
    });

    console.log(`[${taskType}] 更新后的nodeInfoList:`, updatedNodeInfoList);
    console.log(`[${taskType}] 上传的图片文件:`, uploadedImages);

    // 根据任务类型启动相应的服务
    try {
      console.log(`[${taskType}] 开始启动${taskType}任务...`);
      
      let taskResult;
      if (isComfyUI) {
        taskResult = await startComfyUITaskService(workflowId, updatedNodeInfoList, regionId, instanceType);
      } else {
        taskResult = await startWebappTaskService(webappId, updatedNodeInfoList, regionId);
      }
      
      console.log(`[${taskType}] ${taskType}任务启动成功:`, taskResult);
      
      // 立即返回taskId，不等待任务完成，并包含任务类型信息
      res.json({
        success: true,
        taskId: taskResult.taskId,
        taskType: taskType, // 添加任务类型信息
        message: '任务已启动，正在后台处理'
      });
      
    } catch (error) {
      console.error(`[${taskType}] ${taskType}任务启动失败:`, error);
      console.error(`[${taskType}] 错误堆栈:`, error.stack);
      
      // 确保返回有效的JSON响应
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: `${taskType}任务启动失败: ` + error.message,
          details: error.stack
        });
      }
    }

  } catch (error) {
    console.error('[任务处理] 处理任务请求失败:', error);
    console.error('[任务处理] 错误堆栈:', error.stack);
    
    // 确保返回有效的JSON响应
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        error: error.message,
        details: error.stack
      });
    }
  }
});

// 原有的apply接口（保持兼容性）
router.post('/apply', upload.single('image'), async (req, res) => {
  try {
    const { effectId, parameters } = req.body;
    const imageFile = req.file;

    if (!imageFile) {
      return res.status(400).json({ error: '没有上传图片文件' });
    }

    if (!effectId) {
      return res.status(400).json({ error: '缺少effectId参数' });
    }

    console.log('[Effects] 处理特效请求:', { effectId, parameters });

    // 上传图片
    const fileName = await uploadImageService(imageFile);
    console.log('[Effects] 图片上传成功:', fileName);

    // 构建nodeInfoList
    const nodeInfoList = [
      {
        nodeId: "39",
        fieldName: "image",
        fieldValue: fileName
      }
    ];

    // 如果有额外参数，添加到nodeInfoList
    if (parameters) {
      try {
        const parsedParams = JSON.parse(parameters);
        Object.entries(parsedParams).forEach(([key, value]) => {
          // 根据参数类型添加相应的节点配置
          if (key === 'prompt') {
            nodeInfoList.push({
              nodeId: "52",
              fieldName: "prompt",
              fieldValue: value
            });
          }
          // 可以添加更多参数类型的处理
        });
      } catch (error) {
        console.error('[Effects] 参数解析失败:', error);
      }
    }

    // 使用默认的webappId（这里需要根据effectId映射到对应的webappId）
    const webappId = '1937084629516193794'; // 默认webappId

    // 创建ComfyUI任务
    const taskId = await startComfyUITaskService(webappId, nodeInfoList);
    console.log('[Effects] 任务创建成功:', taskId);

    // 等待任务完成并获取结果
    const results = await waitForComfyUITaskAndGetImages(taskId);
    console.log('[Effects] 任务处理完成:', results);

    res.json({
      success: true,
      taskId: taskId,
      images: results
    });

  } catch (error) {
    console.error('[Effects] 处理失败:', error);
    res.status(500).json({
      error: error.message || '处理失败'
    });
  }
});

// 查询任务状态接口
router.post('/comfyui/status', async (req, res) => {
  try {
    const { taskId, regionId = 'hongkong' } = req.body;
    
    if (!taskId) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少taskId参数' 
      });
    }
    
    console.log(`[状态查询] 查询任务状态: taskId=${taskId}, regionId=${regionId}`);
    
    // 智能判断任务类型 - 先尝试ComfyUI，再尝试Webapp
    let status;
    try {
      // 首先尝试ComfyUI服务（因为新的Cosnap任务都是ComfyUI）
      status = await getComfyUITaskStatus(taskId, regionId);
      console.log('[状态查询] 使用ComfyUI服务查询成功');
    } catch (error) {
      // 如果ComfyUI服务失败，尝试Webapp服务
      console.log('[状态查询] ComfyUI服务失败，尝试Webapp服务');
      try {
        status = await getWebappTaskStatus(taskId, regionId);
        console.log('[状态查询] 使用Webapp服务查询成功');
      } catch (webappError) {
        console.error('[状态查询] 两种服务都失败:', { comfyuiError: error.message, webappError: webappError.message });
        throw new Error('无法查询任务状态');
      }
    }
    
    res.json({
      success: true,
      status: status.status // 提取status对象中的status字段
    });
    
  } catch (error) {
    console.error('[状态查询] 查询失败:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 获取任务结果接口
router.post('/comfyui/results', async (req, res) => {
  try {
    const { taskId, regionId = 'hongkong' } = req.body;
    
    if (!taskId) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少taskId参数' 
      });
    }
    
    console.log(`[结果获取] 获取任务结果: taskId=${taskId}, regionId=${regionId}`);
    
    // 智能判断任务类型 - 先尝试ComfyUI，再尝试Webapp
    let results;
    try {
      // 首先尝试ComfyUI服务（因为新的Cosnap任务都是ComfyUI）
      results = await getComfyUITaskResult(taskId, regionId);
      console.log('[结果获取] 使用ComfyUI服务获取成功');
    } catch (error) {
      // 如果ComfyUI服务失败，尝试Webapp服务
      console.log('[结果获取] ComfyUI服务失败，尝试Webapp服务');
      try {
        results = await getWebappTaskResult(taskId, regionId);
        console.log('[结果获取] 使用Webapp服务获取成功');
      } catch (webappError) {
        console.error('[结果获取] 两种服务都失败:', { comfyuiError: error.message, webappError: webappError.message });
        throw new Error('无法获取任务结果');
      }
    }
    
    res.json({
      success: true,
      results: results
    });
    
  } catch (error) {
    console.error('[结果获取] 获取失败:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 取消任务接口
router.post('/comfyui/cancel', async (req, res) => {
  try {
    console.log('[ComfyUI] 收到取消任务请求');
    
    const { taskId, regionId = 'hongkong' } = req.body;
    
    if (!taskId) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少taskId参数' 
      });
    }
    
    console.log(`[ComfyUI] 开始取消任务: taskId=${taskId}, regionId=${regionId}`);
    
    const result = await cancelComfyUITask(taskId, regionId);
    
    console.log(`[ComfyUI] 任务取消成功: taskId=${taskId}`);
    
    res.json({ 
      success: true, 
      message: '任务取消成功',
      data: result
    });
    
  } catch (error) {
    console.error('[ComfyUI] 取消任务失败:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router; 