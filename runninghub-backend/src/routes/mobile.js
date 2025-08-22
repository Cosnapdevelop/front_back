import express from 'express';
import multer from 'multer';
import { body, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { 
  authLimiter, 
  uploadLimiter,
  sensitiveOperationLimiter 
} from '../middleware/rateLimiting.js';
import { sanitizeInput } from '../middleware/validation.js';
import { auth } from '../middleware/auth.js';
import mobileOptimizationService from '../services/mobileOptimizationService.js';
import cloudStorageService from '../services/cloudStorageService.js';

const router = express.Router();
const prisma = new PrismaClient();

// Mobile-optimized multer configuration
const mobileStorage = multer.memoryStorage();
const mobileUpload = multer({
  storage: mobileStorage,
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB limit for mobile (will be optimized down)
    fieldSize: 10 * 1024 * 1024, // 10MB field size
  },
  fileFilter: (req, file, cb) => {
    const userAgent = req.get('User-Agent') || '';
    const connectionType = req.get('Network-Information') || 'unknown';
    
    // Get mobile-specific configuration
    const mobileConfig = mobileOptimizationService.getMobileUploadConfig(userAgent, connectionType);
    
    // Check file size against mobile limits
    if (file.size && file.size > mobileConfig.maxFileSize) {
      const error = new Error(mobileOptimizationService.getMobileErrorMessage('FILE_TOO_LARGE', { userAgent, connectionType }));
      error.code = 'FILE_TOO_LARGE';
      return cb(error, false);
    }
    
    // Check file type
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      const error = new Error(mobileOptimizationService.getMobileErrorMessage('INVALID_FORMAT', { userAgent, connectionType }));
      error.code = 'INVALID_FORMAT';
      return cb(error, false);
    }
  }
});

// Get mobile upload configuration
router.get(
  '/upload-config',
  authLimiter,
  async (req, res) => {
    try {
      const userAgent = req.get('User-Agent') || '';
      const connectionType = req.get('Network-Information') || req.query.connection || 'unknown';
      const config = mobileOptimizationService.getMobileUploadConfig(userAgent, connectionType);
      
      console.log(`[Mobile配置] 获取上传配置 - UA: ${userAgent.substring(0, 50)}..., Connection: ${connectionType}, IP: ${req.ip}`);
      
      return res.json({
        success: true,
        data: {
          ...config,
          supportedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
          recommendations: [
            '建议在WiFi环境下上传以获得更好体验',
            '支持自动优化，可减少上传时间',
            '建议图片尺寸不超过2048x2048像素'
          ]
        }
      });
    } catch (error) {
      console.error(`[Mobile配置] 获取失败 - IP: ${req.ip}, 错误:`, error);
      return res.status(500).json({
        success: false,
        error: '获取上传配置失败'
      });
    }
  }
);

// Mobile-optimized image upload
router.post(
  '/upload-optimized',
  uploadLimiter,
  sanitizeInput,
  auth,
  mobileUpload.single('image'),
  body('autoOptimize')
    .optional()
    .isBoolean()
    .withMessage('自动优化设置必须是布尔值'),
  body('quality')
    .optional()
    .isInt({ min: 10, max: 100 })
    .withMessage('图片质量必须在10-100之间'),
  body('maxSize')
    .optional()
    .isInt({ min: 100, max: 4096 })
    .withMessage('最大尺寸必须在100-4096之间'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '输入验证失败',
          details: errors.array()
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: '请选择要上传的图片文件'
        });
      }

      const userAgent = req.get('User-Agent') || '';
      const connectionType = req.get('Network-Information') || 'unknown';
      const userId = req.user.id;
      
      console.log(`[Mobile上传] 开始处理 - 用户: ${req.user.username} (${userId}), 文件: ${req.file.originalname}, 大小: ${Math.round(req.file.size / 1024)}KB, IP: ${req.ip}`);

      // Validate the uploaded image
      const validation = await mobileOptimizationService.validateMobileImage(req.file);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: validation.errors.join('; '),
          recommendations: validation.recommendations
        });
      }

      // Auto-optimize if requested or recommended
      const autoOptimize = req.body.autoOptimize !== false; // Default to true
      const quality = parseInt(req.body.quality) || mobileOptimizationService.mobileQuality;
      const maxSize = parseInt(req.body.maxSize) || mobileOptimizationService.maxMobileImageSize;

      let finalBuffer = req.file.buffer;
      let optimizationMetadata = null;

      if (autoOptimize) {
        try {
          // Create a temporary file for optimization
          const tempFilename = `temp_${Date.now()}_${Math.random().toString(36).substring(2)}.jpg`;
          const tempPath = path.join(process.cwd(), 'uploads', tempFilename);
          
          // Ensure uploads directory exists
          const uploadsDir = path.join(process.cwd(), 'uploads');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          
          fs.writeFileSync(tempPath, req.file.buffer);
          
          const optimizationResult = await mobileOptimizationService.optimizeImageForMobile(tempPath, {
            maxWidth: maxSize,
            maxHeight: maxSize,
            quality,
            format: 'jpeg',
            progressive: true
          });
          
          finalBuffer = optimizationResult.buffer;
          optimizationMetadata = optimizationResult.metadata;
          
          // Clean up temp file
          fs.unlinkSync(tempPath);
          
          console.log(`[Mobile上传] 优化完成 - 压缩率: ${optimizationMetadata.compressionRatio}%, 新大小: ${Math.round(optimizationMetadata.optimizedSize / 1024)}KB`);
        } catch (optimizationError) {
          console.warn(`[Mobile上传] 优化失败，使用原文件 - 错误: ${optimizationError.message}`);
          // Continue with original file if optimization fails
        }
      }

      // Generate progressive variants for mobile
      const variants = await mobileOptimizationService.generateProgressiveVariants(
        finalBuffer, 
        req.file.originalname
      );

      // Upload to cloud storage
      const timestamp = Date.now();
      const filename = `mobile_${userId}_${timestamp}.jpg`;
      const uploadResults = {};

      try {
        // Upload main optimized image
        uploadResults.main = await cloudStorageService.uploadFile(finalBuffer, filename);
        
        // Upload variants
        for (const [variantName, variantBuffer] of Object.entries(variants)) {
          const variantFilename = `mobile_${userId}_${timestamp}_${variantName}.jpg`;
          uploadResults[variantName] = await cloudStorageService.uploadFile(variantBuffer, variantFilename);
        }

        console.log(`[Mobile上传] 云存储上传完成 - 主文件: ${uploadResults.main}, 变体数量: ${Object.keys(variants).length}`);
      } catch (uploadError) {
        console.error(`[Mobile上传] 云存储上传失败:`, uploadError);
        return res.status(500).json({
          success: false,
          error: '图片上传失败，请稍后重试'
        });
      }

      // Record mobile analytics
      await prisma.betaAnalytics.create({
        data: {
          userId,
          sessionId: req.sessionId || `session_${Date.now()}`,
          eventType: 'mobile_upload',
          feature: 'mobile_optimized_upload',
          eventData: {
            originalSize: req.file.size,
            optimizedSize: optimizationMetadata?.optimizedSize || req.file.size,
            compressionRatio: optimizationMetadata?.compressionRatio || 0,
            autoOptimize,
            quality,
            maxSize,
            variantCount: Object.keys(variants).length,
            connectionType,
            userAgent: userAgent.substring(0, 200)
          },
          userContext: {
            isMobile: /Mobile|Android|iPhone|iPad/.test(userAgent),
            connectionType,
            fileSize: req.file.size,
            fileName: req.file.originalname
          },
          ip: req.ip,
          userAgent: userAgent.substring(0, 500)
        }
      }).catch(error => {
        console.warn('[Mobile Analytics] 记录失败:', error.message);
      });

      return res.json({
        success: true,
        message: '图片上传成功',
        data: {
          main: uploadResults.main,
          variants: {
            thumbnail: uploadResults.thumbnail,
            small: uploadResults.small,
            medium: uploadResults.medium,
            large: uploadResults.large
          },
          metadata: {
            originalFilename: req.file.originalname,
            originalSize: req.file.size,
            optimizedSize: optimizationMetadata?.optimizedSize || req.file.size,
            compressionRatio: optimizationMetadata?.compressionRatio || 0,
            autoOptimized: autoOptimize,
            quality: quality,
            maxSize: maxSize
          },
          recommendations: validation.recommendations
        }
      });
    } catch (error) {
      console.error(`[Mobile上传] 处理失败 - 用户: ${req.user?.id}, IP: ${req.ip}, 错误:`, error);
      
      const userAgent = req.get('User-Agent') || '';
      const connectionType = req.get('Network-Information') || 'unknown';
      const mobileErrorMessage = mobileOptimizationService.getMobileErrorMessage('SERVER_ERROR', { userAgent, connectionType });
      
      return res.status(500).json({
        success: false,
        error: mobileErrorMessage
      });
    }
  }
);

// Upload progress estimation
router.post(
  '/upload-estimate',
  authLimiter,
  sanitizeInput,
  body('fileSize')
    .isInt({ min: 1 })
    .withMessage('文件大小必须是正整数'),
  body('connectionType')
    .optional()
    .isIn(['4g', '3g', '2g', 'wifi', 'unknown'])
    .withMessage('无效的连接类型'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '输入验证失败',
          details: errors.array()
        });
      }

      const { fileSize, connectionType = 'unknown' } = req.body;
      const userAgent = req.get('User-Agent') || '';

      const estimation = mobileOptimizationService.estimateUploadTime(
        fileSize, 
        connectionType, 
        userAgent
      );

      return res.json({
        success: true,
        data: estimation
      });
    } catch (error) {
      console.error(`[Upload估算] 失败 - IP: ${req.ip}, 错误:`, error);
      return res.status(500).json({
        success: false,
        error: '上传时间估算失败'
      });
    }
  }
);

// Mobile analytics tracking
router.post(
  '/analytics',
  authLimiter,
  sanitizeInput,
  body('eventType')
    .notEmpty()
    .withMessage('事件类型不能为空'),
  body('feature')
    .notEmpty()
    .withMessage('功能名称不能为空'),
  body('eventData')
    .optional()
    .isObject()
    .withMessage('事件数据必须是对象'),
  body('performanceData')
    .optional()
    .isObject()
    .withMessage('性能数据必须是对象'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '输入验证失败',
          details: errors.array()
        });
      }

      const { eventType, feature, eventData, performanceData, sessionId } = req.body;
      const userId = req.user?.id;
      const userAgent = req.get('User-Agent') || '';
      const connectionType = req.get('Network-Information') || 'unknown';

      // Enhanced mobile context
      const mobileContext = {
        isMobile: /Mobile|Android|iPhone|iPad/.test(userAgent),
        isIOS: /iPhone|iPad/.test(userAgent),
        isAndroid: /Android/.test(userAgent),
        connectionType,
        screenSize: eventData?.screenSize,
        devicePixelRatio: eventData?.devicePixelRatio,
        performanceData: performanceData || {}
      };

      await prisma.betaAnalytics.create({
        data: {
          userId,
          sessionId: sessionId || `mobile_session_${Date.now()}`,
          eventType: `mobile_${eventType}`,
          feature,
          eventData: {
            ...eventData,
            mobileOptimized: true,
            connectionType
          },
          userContext: mobileContext,
          ip: req.ip,
          userAgent: userAgent.substring(0, 500)
        }
      });

      return res.json({
        success: true,
        message: '移动端Analytics事件记录成功'
      });
    } catch (error) {
      console.error(`[Mobile Analytics] 记录失败 - 用户: ${req.user?.id}, IP: ${req.ip}, 错误:`, error);
      return res.status(500).json({
        success: false,
        error: 'Analytics事件记录失败'
      });
    }
  }
);

// Get mobile performance metrics
router.get(
  '/performance',
  authLimiter,
  auth,
  query('timeRange')
    .optional()
    .isIn(['1h', '24h', '7d', '30d'])
    .withMessage('时间范围必须是1h, 24h, 7d, 或30d'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: '输入验证失败',
          details: errors.array()
        });
      }

      const { timeRange = '24h' } = req.query;
      const userId = req.user.id;
      
      // Calculate time range
      const now = new Date();
      const timeRanges = {
        '1h': new Date(now - 60 * 60 * 1000),
        '24h': new Date(now - 24 * 60 * 60 * 1000),
        '7d': new Date(now - 7 * 24 * 60 * 60 * 1000),
        '30d': new Date(now - 30 * 24 * 60 * 60 * 1000)
      };

      const startTime = timeRanges[timeRange];

      // Get mobile-specific analytics
      const mobileMetrics = await prisma.betaAnalytics.findMany({
        where: {
          userId,
          eventType: { startsWith: 'mobile_' },
          timestamp: { gte: startTime }
        },
        orderBy: { timestamp: 'desc' },
        take: 100
      });

      // Process metrics
      const processedMetrics = {
        uploadMetrics: [],
        performanceMetrics: [],
        errorMetrics: [],
        usageStats: {}
      };

      mobileMetrics.forEach(metric => {
        if (metric.eventType.includes('upload')) {
          processedMetrics.uploadMetrics.push({
            timestamp: metric.timestamp,
            originalSize: metric.eventData?.originalSize,
            optimizedSize: metric.eventData?.optimizedSize,
            compressionRatio: metric.eventData?.compressionRatio,
            connectionType: metric.eventData?.connectionType
          });
        }
        
        if (metric.eventData?.performanceData) {
          processedMetrics.performanceMetrics.push({
            timestamp: metric.timestamp,
            ...metric.eventData.performanceData
          });
        }
      });

      // Calculate usage statistics
      processedMetrics.usageStats = {
        totalEvents: mobileMetrics.length,
        uploadCount: mobileMetrics.filter(m => m.eventType.includes('upload')).length,
        averageCompressionRatio: mobileMetrics
          .filter(m => m.eventData?.compressionRatio)
          .reduce((sum, m, _, arr) => sum + m.eventData.compressionRatio / arr.length, 0),
        connectionTypeDistribution: mobileMetrics.reduce((acc, m) => {
          const type = m.eventData?.connectionType || 'unknown';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {})
      };

      return res.json({
        success: true,
        data: processedMetrics,
        timeRange,
        dataPoints: mobileMetrics.length
      });
    } catch (error) {
      console.error(`[Mobile性能] 获取失败 - 用户: ${req.user?.id}, IP: ${req.ip}, 错误:`, error);
      return res.status(500).json({
        success: false,
        error: '获取移动端性能数据失败'
      });
    }
  }
);

export default router;