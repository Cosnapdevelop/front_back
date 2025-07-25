import express from 'express';
import multer from 'multer';
import { uploadImageService } from '../services/uploadService.js';
import { startTaskService, waitForTaskAndGetImages } from '../services/taskService.js';
import fs from 'fs';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// 上传图片并发起特效任务
router.post('/apply', upload.single('image'), async (req, res) => {
  try {
    const imageInfo = await uploadImageService(req.file.path);
    fs.unlink(req.file.path, () => {});
    let nodeInfoList = req.body.nodeInfoList ? JSON.parse(req.body.nodeInfoList) : [];
    // 自动将图片 fileName 填充到 nodeInfoList 的 image 参数
    nodeInfoList = nodeInfoList.map(item =>
      item.fieldName === 'image' ? { ...item, fieldValue: imageInfo.fileName } : item
    );
    const webappId = req.body.webappId;
    const taskId = await startTaskService(imageInfo.fileName, nodeInfoList, webappId);
    const images = await waitForTaskAndGetImages(taskId, { interval: 5000, maxAttempts: 60 });
    res.json({ taskId, images });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 查询任务状态
router.get('/status/:taskId', async (req, res) => {
  try {
    const status = await getTaskStatus(req.params.taskId);
    res.json(status);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 查询任务结果
// router.get('/result/:taskId', async (req, res) => {
//   try {
//     const result = await getTaskResult(req.params.taskId);
//     res.json(result);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

export default router; 