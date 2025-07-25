import express from 'express';
import dotenv from 'dotenv';
import effectsRouter from './routes/effects.js';
import fs from 'fs';

// 确保uploads目录存在
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

dotenv.config();

const app = express();

// 添加 CORS 中间件
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 路由配置
app.use('/api/effects', effectsRouter);
// 直接访问根路径的接口
app.use('/', effectsRouter);

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`RunningHub 后端服务已启动，端口：${port}`);
}); 