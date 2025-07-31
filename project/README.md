# Cosnap AI 图像处理应用

## ⚠️ 重要提示 ⚠️

### RunningHub API 集成关键修复

**RunningHub管理员明确要求：webappId必须使用字符串形式传递，不能使用parseInt()转换为整数**

这个修复解决了之前所有webapp特效返回"webapp not exists"错误的问题。

#### 修复详情
- **修复前**：`webappId: parseInt(webappId)` ❌
- **修复后**：`webappId: webappId` ✅

#### 相关文件
- `runninghub-backend/src/services/webappTaskService.js` - 主要修复文件
- `runninghub-backend/test-all-effects.js` - 测试脚本
- `src/data/mockData.ts` - 前端特效配置

#### 测试结果
修复后所有webapp特效都能正常启动任务，返回`code: 0`或`code: 433`。

#### 当前可用特效
- ✅ **Cosnap 背景替换** - ComfyUI workflow
- ✅ **顶级人像放大-支持全身（体验版）** - webapp
- ✅ **换背景 | 电商实用版V5.0** - webapp  
- ✅ **WanVideo 图生视频** - webapp
- ✅ **Ultimate upscale final v.1** - webapp
- ✅ **Flux Kontext Single Picture Mode** - webapp

---

## 项目简介 