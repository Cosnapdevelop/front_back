import express from 'express';
import cors from 'cors';
import effectsRoutes from './routes/effects.js';
import { warmupConnection } from './services/comfyUITaskService.js';

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 路由
app.use('/api/effects', effectsRoutes);

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