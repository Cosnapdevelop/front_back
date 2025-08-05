# Cosnap AI 图像处理应用

## ⚠️ 重要提示 ⚠️

### RunningHub API 集成关键修复

#### 1. webappId 字符串传递修复

**RunningHub管理员明确要求：webappId必须使用字符串形式传递，不能使用parseInt()转换为整数**

这个修复解决了之前所有webapp特效返回"webapp not exists"错误的问题。

- **修复前**：`webappId: parseInt(webappId)` ❌
- **修复后**：`webappId: webappId` ✅

#### 2. fieldValue 字符串类型修复

**RunningHub API要求所有fieldValue都是字符串类型**

这个修复解决了"Cosnap重新打光"特效的`APIKEY_INVALID_NODE_INFO`错误。

- **修复前**：`fieldValue: parseFloat(value)` ❌
- **修复后**：`fieldValue: String(value)` ✅

#### 相关文件
- `runninghub-backend/src/services/webappTaskService.js` - webappId修复
- `runninghub-backend/src/routes/effects.js` - fieldValue类型修复
- `runninghub-backend/test-all-effects.js` - 测试脚本
- `src/data/mockData.ts` - 前端特效配置
- `RunningHub-API-Fix.md` - 详细修复文档

#### 测试结果
修复后所有特效都能正常启动任务：
- ✅ webapp特效：返回`code: 0`或`code: 433`
- ✅ ComfyUI特效：参数正确传递，无类型错误

#### 当前可用特效
- ✅ **Cosnap 背景替换** - ComfyUI workflow
- ✅ **Cosnap重新打光** - ComfyUI workflow (已修复)
- ✅ **顶级人像放大-支持全身（体验版）** - webapp
- ✅ **换背景 | 电商实用版V5.0** - webapp  
- ✅ **WanVideo 图生视频** - webapp
- ✅ **Ultimate upscale final v.1** - webapp
- ✅ **Flux Kontext Single Picture Mode** - webapp

---

## 项目简介 