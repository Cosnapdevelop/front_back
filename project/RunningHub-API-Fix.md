# RunningHub API 修复文档

## 问题描述

在使用"Cosnap重新打光"特效时出现 `APIKEY_INVALID_NODE_INFO` 错误，原因是 `fieldValue` 参数类型不正确。

## 根本原因

RunningHub API要求所有 `fieldValue` 都是字符串类型，但我们的代码错误地将数值参数转换为数字类型。

## 解决方案

### 1. 后端修复 (effects.js)

```javascript
// 修复前：错误地将数值转换为数字
fieldValue = parseFloat(fieldValue);

// 修复后：所有fieldValue都转换为字符串
fieldValue = String(fieldValue);
```

### 2. 默认值修复

```javascript
// 修复前：数字类型默认值
defaultValue = 0;

// 修复后：字符串类型默认值
defaultValue = '0';
```

## 关键要点

1. **所有fieldValue必须是字符串类型**
2. **workflowId必须是字符串类型**
3. **为缺失参数提供默认值**
4. **添加详细的调试日志**

## 测试验证

- ✅ 无图片测试：返回"没有上传图片文件"（正常）
- ✅ 有图片测试：参数类型正确传递
- ✅ 前端应用：重新打光特效正常工作

## 相关文件

- `runninghub-backend/src/routes/effects.js`
- `project/src/pages/ApplyEffect.tsx`
- `project/src/hooks/useTaskProcessing.ts` 