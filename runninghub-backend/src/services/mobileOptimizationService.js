import sharp from 'sharp';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

class MobileOptimizationService {
  constructor() {
    this.maxMobileImageSize = 2048; // Max width/height for mobile
    this.maxMobileFileSize = 5 * 1024 * 1024; // 5MB for mobile
    this.mobileQuality = 85; // JPEG quality for mobile optimization
    this.supportedFormats = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  }

  /**
   * Optimize image for mobile consumption
   */
  async optimizeImageForMobile(inputPath, options = {}) {
    try {
      const {
        maxWidth = this.maxMobileImageSize,
        maxHeight = this.maxMobileImageSize,
        quality = this.mobileQuality,
        format = 'jpeg',
        progressive = true
      } = options;

      const imageBuffer = await readFile(inputPath);
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();

      console.log(`[Mobile优化] 开始优化图片 - 原始尺寸: ${metadata.width}x${metadata.height}, 格式: ${metadata.format}, 大小: ${Math.round(imageBuffer.length / 1024)}KB`);

      let optimized = image.clone();

      // Resize if necessary
      if (metadata.width > maxWidth || metadata.height > maxHeight) {
        optimized = optimized.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Apply format-specific optimizations
      switch (format.toLowerCase()) {
        case 'jpeg':
        case 'jpg':
          optimized = optimized.jpeg({
            quality,
            progressive,
            mozjpeg: true // Use mozjpeg for better compression
          });
          break;
        case 'png':
          optimized = optimized.png({
            quality,
            progressive,
            compressionLevel: 9,
            adaptiveFiltering: true
          });
          break;
        case 'webp':
          optimized = optimized.webp({
            quality,
            effort: 6 // Higher effort for better compression
          });
          break;
        default:
          optimized = optimized.jpeg({ quality, progressive });
      }

      const optimizedBuffer = await optimized.toBuffer();
      const compressionRatio = Math.round((1 - optimizedBuffer.length / imageBuffer.length) * 100);

      console.log(`[Mobile优化] 优化完成 - 压缩率: ${compressionRatio}%, 新大小: ${Math.round(optimizedBuffer.length / 1024)}KB`);

      return {
        buffer: optimizedBuffer,
        metadata: {
          originalSize: imageBuffer.length,
          optimizedSize: optimizedBuffer.length,
          compressionRatio,
          format: format.toLowerCase()
        }
      };
    } catch (error) {
      console.error('[Mobile优化] 图片优化失败:', error);
      throw new Error(`移动端图片优化失败: ${error.message}`);
    }
  }

  /**
   * Validate image for mobile upload
   */
  async validateMobileImage(file) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      recommendations: []
    };

    try {
      // Check file size
      if (file.size > this.maxMobileFileSize) {
        validation.isValid = false;
        validation.errors.push(`文件大小 ${Math.round(file.size / 1024 / 1024)}MB 超过移动端限制 ${this.maxMobileFileSize / 1024 / 1024}MB`);
      }

      // Check file format
      const fileExtension = path.extname(file.originalname).toLowerCase().substring(1);
      if (!this.supportedFormats.includes(fileExtension)) {
        validation.isValid = false;
        validation.errors.push(`不支持的文件格式: ${fileExtension}`);
      }

      // Read image metadata if it's an image
      if (validation.isValid) {
        try {
          const metadata = await sharp(file.buffer).metadata();
          
          // Check image dimensions
          if (metadata.width > 4096 || metadata.height > 4096) {
            validation.warnings.push(`图片尺寸 ${metadata.width}x${metadata.height} 较大，建议压缩以提高传输速度`);
            validation.recommendations.push('建议将图片尺寸调整为 2048x2048 以下');
          }

          // Check if image needs optimization
          if (file.size > 2 * 1024 * 1024) { // 2MB
            validation.recommendations.push('建议启用图片自动优化以减少传输时间');
          }

          validation.metadata = metadata;
        } catch (error) {
          validation.isValid = false;
          validation.errors.push('无法读取图片文件，可能已损坏');
        }
      }

      return validation;
    } catch (error) {
      console.error('[Mobile验证] 文件验证失败:', error);
      return {
        isValid: false,
        errors: [`文件验证失败: ${error.message}`],
        warnings: [],
        recommendations: []
      };
    }
  }

  /**
   * Generate progressive image variants for mobile
   */
  async generateProgressiveVariants(inputBuffer, filename) {
    try {
      const variants = {};
      const baseFilename = path.parse(filename).name;
      const image = sharp(inputBuffer);
      const metadata = await image.metadata();

      // Thumbnail (200px)
      variants.thumbnail = await image
        .clone()
        .resize(200, 200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 60, progressive: true })
        .toBuffer();

      // Small (400px) - for preview
      variants.small = await image
        .clone()
        .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 70, progressive: true })
        .toBuffer();

      // Medium (800px) - for mobile display
      variants.medium = await image
        .clone()
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();

      // Large (1200px) - for desktop display
      if (metadata.width > 800 || metadata.height > 800) {
        variants.large = await image
          .clone()
          .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85, progressive: true })
          .toBuffer();
      }

      console.log(`[Progressive图片] 生成变体完成 - 文件: ${baseFilename}, 变体数量: ${Object.keys(variants).length}`);

      return variants;
    } catch (error) {
      console.error('[Progressive图片] 生成失败:', error);
      throw new Error(`生成图片变体失败: ${error.message}`);
    }
  }

  /**
   * Get mobile-specific upload configuration
   */
  getMobileUploadConfig(userAgent, connectionType = 'unknown') {
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
    const isSlowConnection = /2g|3g|slow/i.test(connectionType);

    let config = {
      maxFileSize: this.maxMobileFileSize,
      maxImageSize: this.maxMobileImageSize,
      recommendedQuality: this.mobileQuality,
      chunkSize: 1024 * 1024, // 1MB chunks
      enableProgressiveUpload: true,
      enableAutoOptimization: true
    };

    if (isMobile) {
      config.maxFileSize = Math.min(config.maxFileSize, 3 * 1024 * 1024); // 3MB for mobile
      config.chunkSize = 512 * 1024; // 512KB chunks for mobile
      config.recommendedQuality = 75; // Lower quality for mobile
    }

    if (isSlowConnection) {
      config.maxFileSize = Math.min(config.maxFileSize, 2 * 1024 * 1024); // 2MB for slow connections
      config.chunkSize = 256 * 1024; // 256KB chunks for slow connections
      config.recommendedQuality = 65; // Even lower quality for slow connections
      config.enableAutoOptimization = true; // Force optimization
    }

    return config;
  }

  /**
   * Estimate upload time and provide recommendations
   */
  estimateUploadTime(fileSize, connectionType = 'unknown', userAgent = '') {
    const speeds = {
      '4g': 10 * 1024 * 1024, // 10 Mbps
      '3g': 1 * 1024 * 1024,  // 1 Mbps
      '2g': 128 * 1024,       // 128 Kbps
      'wifi': 50 * 1024 * 1024, // 50 Mbps
      'unknown': 2 * 1024 * 1024 // 2 Mbps default
    };

    const effectiveSpeed = speeds[connectionType] || speeds.unknown;
    const estimatedTime = (fileSize * 8) / effectiveSpeed; // in seconds

    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
    
    let recommendations = [];
    
    if (estimatedTime > 30) { // More than 30 seconds
      recommendations.push('文件较大，建议启用自动优化以减少上传时间');
    }
    
    if (estimatedTime > 60) { // More than 1 minute
      recommendations.push('建议在WiFi环境下上传，或压缩图片后再上传');
    }

    if (isMobile && fileSize > 2 * 1024 * 1024) { // 2MB for mobile
      recommendations.push('移动设备建议上传2MB以下的文件以获得更好体验');
    }

    return {
      estimatedTimeSeconds: Math.ceil(estimatedTime),
      estimatedTimeFormatted: this.formatUploadTime(estimatedTime),
      connectionType,
      isMobile,
      recommendations
    };
  }

  /**
   * Format upload time in human-readable format
   */
  formatUploadTime(seconds) {
    if (seconds < 5) return '几秒钟';
    if (seconds < 60) return `约${Math.ceil(seconds)}秒`;
    if (seconds < 300) return `约${Math.ceil(seconds / 60)}分钟`;
    return '较长时间（建议优化文件大小）';
  }

  /**
   * Get mobile-optimized error messages
   */
  getMobileErrorMessage(error, context = {}) {
    const { userAgent = '', connectionType = 'unknown' } = context;
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
    
    const mobileMessages = {
      'FILE_TOO_LARGE': isMobile 
        ? '文件太大，请选择5MB以下的图片' 
        : '文件大小超过限制',
      'INVALID_FORMAT': '不支持的图片格式，请使用JPG、PNG或WebP',
      'UPLOAD_TIMEOUT': isMobile
        ? '上传超时，请检查网络连接或尝试压缩图片'
        : '上传超时，请重试',
      'NETWORK_ERROR': isMobile
        ? '网络不稳定，建议切换到WiFi后重试'
        : '网络错误，请检查连接',
      'SERVER_ERROR': '服务器暂时无法处理请求，请稍后重试'
    };

    return mobileMessages[error] || '上传失败，请重试';
  }
}

export default new MobileOptimizationService();