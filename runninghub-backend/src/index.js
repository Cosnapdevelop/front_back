import express from 'express';
import cors from 'cors';
import effectsRoutes from './routes/effects.js';
import authRouter from './routes/auth.js';
import communityRouter from './routes/community.js';
import { warmupConnection } from './services/comfyUITaskService.js';

const app = express();
const PORT = process.env.PORT || 3001;

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

// 中间件
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 路由
app.use('/auth', authRouter);
app.use('/api/effects', effectsRoutes);
app.use('/api/community', communityRouter);

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
app.listen(PORT, async () => {
  console.log(`RunningHub 后端服务已启动，端口：${PORT}`);
  
  // 启动时预热连接
  try {
    console.log('[启动] 开始预热API连接...');
    await warmupConnection('hongkong'); // 预热香港地区连接
    console.log('[启动] API连接预热完成');
  } catch (error) {
    console.log('[启动] API连接预热失败，但不影响正常功能:', error.message);
  }
}); 