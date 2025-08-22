import express from 'express';
import cors from 'cors';
import effectsRoutes from './routes/effects.js';
import authRouter from './routes/auth.js';
import communityRouter from './routes/community.js';
import paymentsRouter from './routes/payments.js';
import healthRouter from './routes/health.js';
import analyticsRouter from './routes/analytics.js';
import betaRouter from './routes/beta.js';
import mobileRouter from './routes/mobile.js';
import monitoringRouter from './routes/monitoring.js';
import { warmupConnection } from './services/comfyUITaskService.js';
import { PrismaClient } from '@prisma/client';
import monitoringService from './services/monitoringService.js';

// 安全中间件导入
import { 
  validateEnvironment,
  securityHeaders,
  requestLogger,
  securityCheck,
  errorHandler,
  notFoundHandler,
  corsPreflightHandler,
  requestSizeLimit,
  healthCheckBypass,
  validateProductionSecurity
} from './middleware/security.js';
import { generalLimiter } from './middleware/rateLimiting.js';
import { performanceMonitoring, responseOptimization } from './middleware/performanceOptimization.js';

// 验证环境变量（必须在应用启动前完成）
validateEnvironment();
validateProductionSecurity();

const app = express();
const PORT = process.env.PORT || 3001;
const prisma = new PrismaClient();

// 环境变量配置
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:5173', // Vite开发服务器
  'https://cosnap.vercel.app',
  'https://cosnap-*.vercel.app' // Vercel预览URL
];

// CORS配置
const corsOptions = {
  origin: function (origin, callback) {
    // 允许没有origin的请求（如移动应用、Postman等）
    if (!origin) return callback(null, true);
    
    // 检查是否在允许列表中
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
        // 支持通配符匹配（如 *.vercel.app）
        const pattern = allowedOrigin.replace(/\*/g, '.*');
        return new RegExp(pattern).test(origin);
      }
      return allowedOrigin === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS阻止了来自 ${origin} 的请求`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// 安全相关中间件（优先级最高）
app.set('trust proxy', 1); // 信任第一个代理
app.use(healthCheckBypass); // 健康检查绕过
app.use(corsPreflightHandler); // CORS预检优化
app.use(securityHeaders); // 安全头部
app.use(requestSizeLimit); // 请求大小限制
app.use(requestLogger); // 请求日志
app.use(generalLimiter); // 全局限流

// 监控服务中间件集成
app.use(monitoringService.createHttpMiddleware());
app.use(monitoringService.createErrorMiddleware());

// Performance optimization middleware
app.use(performanceMonitoring);
app.use(responseOptimization);

// 基础中间件
app.use(cors(corsOptions));
app.use(express.json({ 
  limit: '10mb', // 降低JSON大小限制
  verify: (req, res, buf) => {
    // 验证JSON格式
    try {
      JSON.parse(buf);
    } catch (e) {
      throw new Error('无效的JSON格式');
    }
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' // 降低URL编码数据大小限制
}));

// 安全检查中间件
app.use(securityCheck);

// 路由
app.use('/health', healthRouter); // Health checks should be first for load balancers

// Prometheus metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', monitoringService.getMetricsContentType());
  res.send(monitoringService.getMetrics());
});

app.use('/auth', authRouter);
app.use('/api/effects', effectsRoutes);
app.use('/api/community', communityRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/beta', betaRouter);
app.use('/api/mobile', mobileRouter);
app.use('/api/monitoring', monitoringRouter);
// 静态占位资源
app.use('/assets', express.static('public'));

// 404处理中间件（放在所有路由之后）
app.use(notFoundHandler);

// 全局错误处理中间件（必须放在最后）
app.use(errorHandler);

// 进程级错误兜底和优雅关闭
process.on('unhandledRejection', (reason, promise) => {
  console.error('[unhandledRejection] 未处理的Promise拒绝:', reason);
  console.error('[unhandledRejection] Promise:', promise);
});

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException] 未捕获的异常:', err);
  console.error('[uncaughtException] 堆栈:', err.stack);
  
  // 生产环境下优雅关闭
  if (process.env.NODE_ENV === 'production') {
    console.log('正在优雅关闭服务器...');
    process.exit(1);
  }
});

// 优雅关闭处理
const gracefulShutdown = async (signal) => {
  console.log(`\n收到 ${signal} 信号，开始优雅关闭...`);
  
  // 关闭监控服务
  try {
    await monitoringService.shutdown();
    console.log('监控服务已关闭');
  } catch (error) {
    console.error('关闭监控服务失败:', error);
  }
  
  // 关闭数据库连接
  prisma.$disconnect()
    .then(() => {
      console.log('数据库连接已关闭');
      process.exit(0);
    })
    .catch((error) => {
      console.error('关闭数据库连接失败:', error);
      process.exit(1);
    });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 启动服务器
app.listen(PORT, async () => {
  console.log(`\n🚀 Cosnap AI 后端服务已启动`);
  console.log(`📍 端口: ${PORT}`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 安全模式: ${process.env.NODE_ENV === 'production' ? '生产' : '开发'}`);
  console.log(`📊 进程ID: ${process.pid}`);
  console.log(`⏰ 启动时间: ${new Date().toISOString()}`);
  
  // 数据库连接测试
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log(`✅ 数据库连接正常`);
  } catch (error) {
    console.error(`❌ 数据库连接失败:`, error.message);
  }
  
  // 启动时预热连接
  try {
    console.log(`🔥 开始预热API连接...`);
    await warmupConnection('hongkong'); // 预热香港地区连接
    console.log(`✅ API连接预热完成`);
  } catch (error) {
    console.log(`⚠️ API连接预热失败，但不影响正常功能:`, error.message);
  }
  
  console.log(`\n🎯 服务就绪，等待请求...\n`);
}); 