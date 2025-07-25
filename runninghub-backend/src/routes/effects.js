import express from 'express';
import multer from 'multer';
import { uploadImage, startComfyUITask, getTaskStatus } from '../runninghub.js';
import fs from 'fs';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// 上传图片并发起特效任务
router.post('/apply', upload.single('image'), async (req, res) => {
  try {
    // 1. 上传图片到 RunningHub
    const imageInfo = await uploadImage(req.file.path);
    fs.unlink(req.file.path, () => {});

    // 2. 获取前端传来的 nodeInfoList（不含图片字段）
    let nodeInfoList = req.body.nodeInfoList ? JSON.parse(req.body.nodeInfoList) : [];

    // 3. 自动插入图片fileName到nodeInfoList的第一项
    nodeInfoList = [
      { nodeId: "39", fieldName: "image", fieldValue: imageInfo.fileName },
      ...nodeInfoList
    ];

    // 4. 发起 ComfyUI 任务
    const task = await startComfyUITask(imageInfo.fileName, nodeInfoList);

    res.json({ taskId: task.taskId });
  } catch (err) {
    console.error(err);
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