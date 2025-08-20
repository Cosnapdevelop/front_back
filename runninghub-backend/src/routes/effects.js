import express from 'express';
import { auth, checkTokenExpiry } from '../middleware/auth.js';
import crypto from 'crypto';
import multer from 'multer';
import { 
  aiTaskLimiter, 
  uploadLimiter, 
  generalLimiter 
} from '../middleware/rateLimiting.js';
import { 
  effectsValidation,
  fileValidation,
  sanitizeInput,
  handleValidationErrors 
} from '../middleware/validation.js';
import {
  checkFeatureAccess,
  recordFeatureUsage
} from '../middleware/chinesePayment.js';
import { uploadImageService } from '../services/uploadImageService.js';
import monitoringService from '../services/monitoringService.js';
import { startComfyUITaskService, waitForComfyUITaskAndGetImages, cancelComfyUITask, getComfyUITaskStatus, getComfyUITaskResult } from '../services/comfyUITaskService.js';
import { startWebappTaskService, waitForWebappTaskAndGetImages, cancelWebappTask, getWebappTaskStatus, getWebappTaskResult } from '../services/webappTaskService.js';
import { uploadLoraService, validateLoraFile } from '../services/loraUploadService.js';
import { body, param } from 'express-validator';
import axios from 'axios';

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

/**
 * 增强的文件验证函数
 */
function validateFileType(file) {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  // 检查MIME类型
  if (!allowedTypes.includes(file.mimetype.toLowerCase())) {
    return false;
  }
  
  // 检查文件扩展名
  const extension = file.originalname.toLowerCase().split('.').pop();
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  
  if (!allowedExtensions.includes(extension)) {
    return false;
  }
  
  return true;
}

function validateFileName(filename) {
  // 防止路径遍历攻击与非法字符
  const dangerous = /[<>:"/\\|?*\x00-\x1f]/;
  if (dangerous.test(filename)) {
    return false;
  }
  // 禁止出现 .. 或 以 / \\ 开头 的路径片段
  if (filename.includes('..') || filename.startsWith('/') || filename.startsWith('\\')) {
    return false;
  }
  
  // 防止双扩展名攻击
  const doubleExtension = /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|php|asp|jsp)\./i;
  if (doubleExtension.test(filename)) {
    return false;
  }
  
  // 限制文件名长度
  if (filename.length > 255 || filename.length < 1) {
    return false;
  }
  
  // 检查是否为隐藏文件
  if (filename.startsWith('.')) {
    return false;
  }
  
  return true;
}

function validateFileSize(file, maxSize = 30 * 1024 * 1024) {
  return file.size <= maxSize;
}

/**
 * 安全的文件上传配置
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 30 * 1024 * 1024, // 30MB - 降低文件大小限制
    files: 5, // 最多5个文件 - 减少并发上传数量
    fieldSize: 1024 * 1024, // 1MB字段大小限制
    fieldNameSize: 100, // 字段名长度限制
    fields: 20, // 最多20个字段
    parts: 100 // 最多100个部分
  },
  fileFilter: (req, file, cb) => {
    console.log(`[文件验证] 检查文件: ${file.originalname}, MIME: ${file.mimetype}, 大小: ${file.size || 'unknown'}`);
    
    try {
      // 验证文件类型
      if (!validateFileType(file)) {
        console.warn(`[文件验证] 不支持的文件类型 - IP: ${req.ip}, 文件: ${file.originalname}, MIME: ${file.mimetype}`);
        return cb(new Error(`不支持的文件类型: ${file.mimetype}。只允许 JPEG, PNG, GIF, WebP 格式`), false);
      }
      
      // 验证文件名
      if (!validateFileName(file.originalname)) {
        console.warn(`[文件验证] 不安全的文件名 - IP: ${req.ip}, 文件名: ${file.originalname}`);
        return cb(new Error('文件名包含不安全字符、过长或格式不正确'), false);
      }
      
      console.log(`[文件验证] 文件通过验证 - IP: ${req.ip}, 文件: ${file.originalname}`);
      cb(null, true);
    } catch (error) {
      console.error(`[文件验证] 验证过程出错 - IP: ${req.ip}, 错误:`, error);
      cb(new Error('文件验证失败'), false);
    }
  },
});

/**
 * LoRA文件上传配置
 */
const loraUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2GB
    files: 1, // 只允许单个文件
    fieldSize: 1024 * 1024,
    fieldNameSize: 100,
    fields: 10
  },
  fileFilter: (req, file, cb) => {
    console.log(`[LoRA验证] 检查文件: ${file.originalname}, MIME: ${file.mimetype}`);
    
    try {
      // LoRA文件扩展名验证
      const allowedExtensions = ['.safetensors', '.ckpt', '.pt', '.pth'];
      const fileName = file.originalname.toLowerCase();
      const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
      
      if (!hasValidExtension) {
        console.warn(`[LoRA验证] 不支持的LoRA文件格式 - IP: ${req.ip}, 文件: ${file.originalname}`);
        return cb(new Error('仅支持 .safetensors、.ckpt、.pt、.pth 格式的LoRA文件'), false);
      }
      
      // 验证文件名安全性
      if (!validateFileName(file.originalname)) {
        console.warn(`[LoRA验证] 不安全的文件名 - IP: ${req.ip}, 文件名: ${file.originalname}`);
        return cb(new Error('文件名包含不安全字符或格式不正确'), false);
      }
      
      console.log(`[LoRA验证] LoRA文件通过验证 - IP: ${req.ip}, 文件: ${file.originalname}`);
      cb(null, true);
    } catch (error) {
      console.error(`[LoRA验证] 验证过程出错 - IP: ${req.ip}, 错误:`, error);
      cb(new Error('LoRA文件验证失败'), false);
    }
  },
});

// 通用的任务处理接口（支持ComfyUI和Webapp）
router.post(
  '/comfyui/apply',
  aiTaskLimiter,
  sanitizeInput,
  auth,
  checkTokenExpiry,
  checkFeatureAccess('AI_EFFECT'), // 检查AI特效使用权限
  upload.array('images', 5), // 减少最大文件数量
  fileValidation.image, // 添加额外的文件验证
  recordFeatureUsage('AI_EFFECT', (req) => {
    const webappId = Array.isArray(req.body.webappId) ? req.body.webappId[0] : req.body.webappId;
    const workflowId = Array.isArray(req.body.workflowId) ? req.body.workflowId[0] : req.body.workflowId;
    return `使用AI特效 - WebApp: ${webappId || 'N/A'}, Workflow: ${workflowId || 'N/A'}`;
  }),
  async (req, res) => {
  try {
    monitoringService.info('effects.apply.request', {
      userId: req.user?.id,
      ip: req.ip,
      ua: req.get('User-Agent')
    });
    monitoringService.debug?.('effects.apply.headers', { headers: req.headers });
    monitoringService.debug?.('effects.apply.body', { body: req.body });
    console.log('[任务处理] 请求体参数详情:', Object.keys(req.body).map(key => `${key}: ${req.body[key]} (类型: ${typeof req.body[key]})`));
    monitoringService.info('effects.apply.files', { count: req.files ? req.files.length : 0 });
    
    // 设置响应头确保正确的内容类型
    res.setHeader('Content-Type', 'application/json');
    
    const { workflowId, webappId, nodeInfoList, regionId = 'hongkong', instanceType } = req.body;
    
    // 处理重复参数问题：如果webappId是数组，取第一个值
    const cleanWebappId = Array.isArray(webappId) ? webappId[0] : webappId;
    const cleanWorkflowId = Array.isArray(workflowId) ? workflowId[0] : workflowId;
    
    // 判断任务类型 - 优先使用workflowId（ComfyUI）
    const isComfyUI = cleanWorkflowId && cleanWorkflowId !== 'undefined' && cleanWorkflowId !== '';
    const isWebapp = cleanWebappId && cleanWebappId !== 'undefined' && cleanWebappId !== '' && !isComfyUI;
    
    monitoringService.info('effects.apply.params', {
      workflowId: cleanWorkflowId,
      webappId: cleanWebappId,
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
    
    const taskId = isComfyUI ? cleanWorkflowId : cleanWebappId;
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
      monitoringService.error(`[${taskType}] nodeInfoList parse failed`, error, { route: '/api/effects/comfyui/apply' });
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
        monitoringService.recordFileUpload('image', file.size, 'success');
      } catch (error) {
        monitoringService.error(`[${taskType}] upload failed`, error, { route: '/api/effects/comfyui/apply' });
        monitoringService.recordFileUpload('image', file.size, 'error');
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
    // ⚠️ 重要提醒：RunningHub API要求所有fieldValue都必须是字符串类型！
    // 即使数值型参数（如scale, X_offset, Y_offset, rotation）也必须转换为字符串
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
            fieldValue: String(req.body[paramKey]) // ⚠️ 必须转换为字符串！
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
              fieldValue: String(req.body[possibleParamKey]) // ⚠️ 必须转换为字符串！
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
      } else if (nodeInfo.fieldName === 'select') {
        // select节点 - 查找对应的参数
        const paramKey = nodeInfo.paramKey;
        if (paramKey && req.body[paramKey] !== undefined) {
          const updatedNode = {
            ...nodeInfo,
            fieldValue: String(parseInt(req.body[paramKey])) // ⚠️ select值先转整数再转字符串！
          };
          console.log(`[${taskType}] 更新select节点 ${index}:`, {
            nodeId: nodeInfo.nodeId,
            paramKey: paramKey,
            fieldValue: String(parseInt(req.body[paramKey]))
          });
          return updatedNode;
        } else {
          console.warn(`[${taskType}] select节点 ${index} 缺少参数:`, {
            nodeId: nodeInfo.nodeId,
            paramKey: paramKey,
            bodyParams: Object.keys(req.body)
          });
        }
      } else {
        // 处理其他类型的字段（如shape, X_offset, Y_offset, scale, rotation等）
        const paramKey = nodeInfo.paramKey;
        if (paramKey && req.body[paramKey] !== undefined) {
          let fieldValue = req.body[paramKey];
          
          // RunningHub API要求所有fieldValue都是字符串类型
          fieldValue = String(fieldValue);
          
          console.log(`[${taskType}] 参数转换:`, {
            nodeId: nodeInfo.nodeId,
            fieldName: nodeInfo.fieldName,
            paramKey: paramKey,
            originalValue: req.body[paramKey],
            convertedValue: fieldValue,
            convertedType: typeof fieldValue
          });
          
          const updatedNode = {
            ...nodeInfo,
            fieldValue: fieldValue
          };
          console.log(`[${taskType}] 更新其他类型节点 ${index}:`, {
            nodeId: nodeInfo.nodeId,
            fieldName: nodeInfo.fieldName,
            paramKey: paramKey,
            fieldValue: fieldValue
          });
          return updatedNode;
        } else {
          console.warn(`[${taskType}] 其他类型节点 ${index} 缺少参数:`, {
            nodeId: nodeInfo.nodeId,
            fieldName: nodeInfo.fieldName,
            paramKey: paramKey,
            bodyParams: Object.keys(req.body)
          });
          // 返回带有默认值的节点，避免fieldValue为undefined
          // RunningHub API要求所有fieldValue都是字符串类型
          let defaultValue;
          if (nodeInfo.fieldName === 'scale' || 
              nodeInfo.fieldName === 'X_offset' || 
              nodeInfo.fieldName === 'Y_offset' || 
              nodeInfo.fieldName === 'rotation') {
            defaultValue = '0'; // 数值类型默认值，字符串形式
          } else if (nodeInfo.fieldName === 'shape') {
            defaultValue = 'triangle'; // shape字段默认值
          } else {
            defaultValue = ''; // 其他字段默认值
          }
          
          const defaultNode = {
            ...nodeInfo,
            fieldValue: defaultValue
          };
          console.warn(`[${taskType}] 使用默认值:`, defaultNode);
          return defaultNode;
        }
      }
    });

    console.log(`[${taskType}] 更新后的nodeInfoList:`, updatedNodeInfoList);
    console.log(`[${taskType}] 上传的图片文件:`, uploadedImages);

    // 根据任务类型启动相应的服务
    try {
      monitoringService.info('effects.apply.start', { taskType, regionId });
      
      let taskResult;
      if (isComfyUI) {
        taskResult = await startComfyUITaskService(cleanWorkflowId, updatedNodeInfoList, regionId, instanceType);
      } else {
        taskResult = await startWebappTaskService(cleanWebappId, updatedNodeInfoList, regionId);
      }
      
      monitoringService.info('effects.apply.started', { taskType, taskId: taskResult.taskId, regionId });
      if (monitoringService.metrics?.effectsApiCalls) {
        monitoringService.metrics.effectsApiCalls.inc({ endpoint: 'apply', status: 'success' });
      }
      
      // 立即返回taskId，不等待任务完成，并包含任务类型信息
      res.json({
        success: true,
        taskId: taskResult.taskId,
        taskType: taskType, // 添加任务类型信息
        message: '任务已启动，正在后台处理',
        // 添加订阅相关信息
        subscription: {
          hasWatermark: req.featureAccess?.hasWatermark || false,
          priorityProcessing: req.featureAccess?.priorityProcessing || false,
          tier: req.featureAccess?.subscription?.tier || 'FREE'
        }
      });
      monitoringService.recordEffectProcessing('cosnap_effect', regionId, 0, 'started');
      
    } catch (error) {
      monitoringService.error(`[${taskType}] start failed`, error, { route: '/api/effects/comfyui/apply' });
      monitoringService.recordEffectProcessing('cosnap_effect', regionId, 0, 'failed');
      if (monitoringService.metrics?.effectsApiCalls) {
        monitoringService.metrics.effectsApiCalls.inc({ endpoint: 'apply', status: 'error' });
      }
      
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
    monitoringService.error('effects.apply.exception', error, { route: '/api/effects/comfyui/apply' });
    
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
router.post('/apply', 
  upload.single('image'),
  auth, // 确保用户已登录
  checkFeatureAccess('AI_EFFECT'), // 检查AI特效使用权限
  recordFeatureUsage('AI_EFFECT', (req) => `使用AI特效: ${req.body.effectId}`),
  async (req, res) => {
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
router.post(
  '/comfyui/status',
  generalLimiter,
  sanitizeInput,
  auth,
  body('taskId')
    .isString()
    .withMessage('任务ID必须是字符串')
    .isLength({ min: 1, max: 100 })
    .withMessage('任务ID长度必须在1-100个字符之间'),
  body('regionId')
    .optional()
    .isIn(['hongkong', 'china'])
    .withMessage('地区ID必须是 hongkong 或 china'),
  handleValidationErrors,
  async (req, res) => {
  try {
    const { taskId, regionId = 'hongkong' } = req.body;
    
    monitoringService.info('effects.status.request', { userId: req.user.id, taskId, regionId, ip: req.ip });
    
    // 智能判断任务类型 - 先尝试ComfyUI，再尝试Webapp
    let status;
    
    try {
      // 首先尝试ComfyUI服务
      status = await getComfyUITaskStatus(taskId, regionId);
      monitoringService.info('effects.status.comfyui.ok', { taskId, status: (typeof status === 'string' ? status : status.status) });
    } catch (error) {
      // 如果ComfyUI服务失败，尝试Webapp服务
      monitoringService.warn('effects.status.comfyui.fail_try_webapp', { taskId, error: error.message });
      try {
        status = await getWebappTaskStatus(taskId, regionId);
        monitoringService.info('effects.status.webapp.ok', { taskId, status: (typeof status === 'string' ? status : status.status) });
      } catch (webappError) {
        monitoringService.error('effects.status.all_failed', null, { taskId, userId: req.user.id, ip: req.ip, comfyuiError: error.message, webappError: webappError.message });
        return res.status(404).json({
          success: false,
          error: '任务不存在或服务暂不可用'
        });
      }
    }
    
    res.json({
      success: true,
      status: typeof status === 'string' ? status : status.status,
      taskId: taskId
    });
    
  } catch (error) {
    monitoringService.error('effects.status.exception', error, { taskId: req.body.taskId, userId: req.user?.id, ip: req.ip });
    res.status(500).json({ 
      success: false, 
      error: '查询任务状态失败，请稍后重试' 
    });
  }
});

// 获取任务结果接口
router.post(
  '/comfyui/results',
  generalLimiter,
  sanitizeInput,
  auth,
  body('taskId')
    .isString()
    .withMessage('任务ID必须是字符串')
    .isLength({ min: 1, max: 100 })
    .withMessage('任务ID长度必须在1-100个字符之间'),
  body('regionId')
    .optional()
    .isIn(['hongkong', 'china'])
    .withMessage('地区ID必须是 hongkong 或 china'),
  handleValidationErrors,
  async (req, res) => {
  try {
    const { taskId, regionId = 'hongkong' } = req.body;
    
    if (!taskId) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少taskId参数' 
      });
    }
    
    monitoringService.info('effects.results.request', { taskId, regionId });
    
    // 智能判断任务类型 - 先尝试ComfyUI，再尝试Webapp
    // 因为ComfyUI服务更稳定，优先使用ComfyUI服务
    let results;
    
    try {
      // 首先尝试ComfyUI服务
      results = await getComfyUITaskResult(taskId, regionId);
      monitoringService.info('effects.results.comfyui.ok', { taskId });
    } catch (error) {
      // 如果ComfyUI服务失败，尝试Webapp服务
      monitoringService.warn('effects.results.comfyui.fail_try_webapp', { taskId });
      try {
        results = await getWebappTaskResult(taskId, regionId);
        monitoringService.info('effects.results.webapp.ok', { taskId });
      } catch (webappError) {
        monitoringService.error('effects.results.all_failed', null, { comfyuiError: error.message, webappError: webappError.message, taskId });
        throw new Error('无法获取任务结果');
      }
    }
    
    res.json({
      success: true,
      results: results
    });
    
  } catch (error) {
    monitoringService.error('effects.results.exception', error, { taskId: req.body?.taskId });
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 取消任务接口
router.post('/comfyui/cancel', auth, async (req, res) => {
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

// 统一取消任务接口：根据任务类型智能尝试取消
router.post('/cancel', auth, async (req, res) => {
  try {
    const { taskId, regionId = 'hongkong', taskType } = req.body;
    if (!taskId) {
      return res.status(400).json({ success: false, error: '缺少taskId参数' });
    }

    console.log('[Effects] 统一取消任务请求:', { taskId, regionId, taskType });

    // 优先按传入的 taskType 取消
    if (taskType === 'ComfyUI') {
      await cancelComfyUITask(taskId, regionId);
      return res.json({ success: true, message: 'ComfyUI任务取消成功' });
    }
    if (taskType === 'Webapp') {
      try {
        await cancelWebappTask(taskId, regionId);
        return res.json({ success: true, message: 'Webapp任务取消成功' });
      } catch (e) {
        console.log('[Effects] Webapp取消失败，尝试ComfyUI:', e.message);
      }
    }

    // 未提供类型或失败时，智能双向尝试
    try {
      await cancelComfyUITask(taskId, regionId);
      return res.json({ success: true, message: '任务取消成功 (ComfyUI)' });
    } catch (e1) {
      console.log('[Effects] ComfyUI取消失败，尝试Webapp:', e1.message);
      try {
        await cancelWebappTask(taskId, regionId);
        return res.json({ success: true, message: '任务取消成功 (Webapp)' });
      } catch (e2) {
        console.error('[Effects] 统一取消任务失败:', { comfyui: e1.message, webapp: e2.message });
        return res.status(500).json({ success: false, error: '取消任务失败' });
      }
    }
  } catch (error) {
    console.error('[Effects] 统一取消任务异常:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// 重试任务接口
router.post('/comfyui/retry', auth, async (req, res) => {
  try {
    console.log('[ComfyUI] 收到重试任务请求');
    
    const { taskId, effectId, parameters, regionId = 'hongkong' } = req.body;
    
    if (!taskId || !effectId || !parameters) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少必要参数：taskId, effectId, parameters' 
      });
    }
    
    console.log(`[ComfyUI] 开始重试任务: taskId=${taskId}, effectId=${effectId}, regionId=${regionId}`);
    
    // 这里可以添加重试逻辑
    // 由于重试实际上是重新创建任务，我们可以返回成功状态
    // 前端会重新调用 apply 接口
    
    res.json({ 
      success: true, 
      message: '重试请求已接收，请重新提交任务',
      data: { taskId, effectId }
    });
    
  } catch (error) {
    console.error('[ComfyUI] 重试任务失败:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router; 

// 预签名直传（阿里云OSS）
router.post(
  '/upload/presign',
  uploadLimiter,
  sanitizeInput,
  auth,
  body('ext')
    .optional()
    .matches(/^[a-z0-9]+$/)
    .withMessage('文件扩展名格式不正确')
    .isLength({ max: 10 })
    .withMessage('文件扩展名过长'),
  body('dir')
    .optional()
    .matches(/^[a-zA-Z0-9/_-]+$/)
    .withMessage('目录路径格式不正确')
    .isLength({ max: 100 })
    .withMessage('目录路径过长'),
  handleValidationErrors,
  async (req, res) => {
  try {
    const provider = process.env.CLOUD_STORAGE_PROVIDER || 'mock';
    const ext = (req.body?.ext || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase();
    const dir = (req.body?.dir || 'cosnap/uploads').replace(/\.{2,}/g, '');
    const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
    const objectKey = `${dir}/${filename}`;

    if (provider === 'aliyun-oss') {
      const bucket = process.env.ALIYUN_OSS_BUCKET;
      const region = process.env.ALIYUN_OSS_REGION || 'oss-cn-hangzhou';
      const accessKeyId = process.env.ALIYUN_OSS_ACCESS_KEY_ID;
      const accessKeySecret = process.env.ALIYUN_OSS_ACCESS_KEY_SECRET;
      const host = `https://${bucket}.${region}.aliyuncs.com`;

      const expiration = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const policyText = {
        expiration,
        conditions: [
          ['content-length-range', 0, 20 * 1024 * 1024],
          ['starts-with', '$key', dir + '/'],
          { 'x-oss-object-acl': 'public-read' },
          ['starts-with', '$Content-Type', 'image/'],
          ['starts-with', '$Cache-Control', '']
        ]
      };
      const policy = Buffer.from(JSON.stringify(policyText)).toString('base64');
      const signature = crypto
        .createHmac('sha1', accessKeySecret)
        .update(policy)
        .digest('base64');

      const form = {
        key: objectKey,
        policy,
        OSSAccessKeyId: accessKeyId,
        Signature: signature,
        'x-oss-object-acl': 'public-read',
        'Content-Type': 'image/*',
        'Cache-Control': 'max-age=31536000',
        success_action_status: '200',
      };
      const cdnDomain = process.env.ALIYUN_OSS_CUSTOM_DOMAIN;
      const publicUrl = cdnDomain ? `https://${cdnDomain}/${objectKey}` : `${host}/${objectKey}`;
      return res.json({ success: true, provider, uploadUrl: host, form, objectKey, publicUrl });
    }

    // mock: 返回模拟URL
    return res.json({ success: true, provider: 'mock', uploadUrl: '', form: {}, objectKey, publicUrl: `https://mock-cdn.example.com/${objectKey}` });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// LoRA上传接口
router.post(
  '/lora/upload',
  uploadLimiter,
  sanitizeInput,
  auth,
  loraUpload.single('loraFile'),
  fileValidation.lora,
  body('regionId')
    .optional()
    .isIn(['hongkong', 'china'])
    .withMessage('地区ID必须是 hongkong 或 china'),
  handleValidationErrors,
  async (req, res) => {
  try {
    console.log('[Lora上传] 收到Lora文件上传请求');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '没有上传Lora文件'
      });
    }
    
    const { regionId = 'hongkong' } = req.body;
    
    // 验证Lora文件
    try {
      validateLoraFile(req.file);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    // 上传Lora文件
    const fileName = await uploadLoraService(req.file, regionId);
    
    console.log('[Lora上传] Lora上传成功:', fileName);
    
    res.json({
      success: true,
      data: {
        fileName: fileName,
        message: 'Lora文件上传成功，可在RHLoraLoader节点中使用'
      }
    });
    
  } catch (error) {
    console.error('[Lora上传] Lora上传失败:', error);
    res.status(500).json({
      success: false,
      error: 'Lora上传失败: ' + error.message
    });
  }
});

// 获取Lora上传链接接口（保留用于前端分步上传）
router.post('/lora/upload-url', auth, async (req, res) => {
  try {
    console.log('[Lora上传] 请求获取上传链接');
    
    const { loraName, md5Hex } = req.body;
    
    if (!loraName || !md5Hex) {
      return res.status(400).json({
        success: false,
        error: '缺少loraName或md5Hex参数'
      });
    }
    
    // 调用RunningHub获取Lora上传链接
    const regionConfig = getCurrentRegionConfig();
    const axiosInstance = createRunningHubAxiosInstance(regionConfig.id);
    
    const response = await axiosInstance.post('/api/openapi/getLoraUploadUrl', {
      apiKey: process.env.RUNNINGHUB_API_KEY || '8ee162873b6e44bd97d3ef6fce2de105',
      loraName,
      md5Hex
    });
    
    console.log('[Lora上传] 获取上传链接成功:', response.data);
    
    if (response.data.code === 0) {
      res.json({
        success: true,
        data: response.data.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: response.data.msg || '获取Lora上传链接失败'
      });
    }
    
  } catch (error) {
    console.error('[Lora上传] 获取上传链接失败:', error);
    res.status(500).json({
      success: false,
      error: '获取Lora上传链接失败: ' + error.message
    });
  }
});

// 创建RunningHub API实例的辅助函数
function createRunningHubAxiosInstance(regionId) {
  const regionConfig = getCurrentRegionConfig(regionId);
  return axios.create({
    baseURL: regionConfig.apiDomain,
    timeout: 60000,
    headers: {
      'Host': regionConfig.apiDomain.replace('https://', '')
    }
  });
}

// 获取当前地区配置的辅助函数
function getCurrentRegionConfig(regionId = 'hongkong') {
  const regions = {
    china: {
      id: 'china',
      name: '中国大陆',
      apiDomain: 'https://www.runninghub.cn'
    },
    hongkong: {
      id: 'hongkong', 
      name: '香港/澳门/台湾',
      apiDomain: 'https://www.runninghub.ai'
    }
  };
  return regions[regionId] || regions.hongkong;
}