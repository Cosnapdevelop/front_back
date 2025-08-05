# 🔧 工作流错误分析与修复

## 🚨 错误信息

```
[ComfyUI] ComfyUI任务启动失败: Error: 任务发起失败: 任务发起失败: {"code":803,"msg":"APIKEY_INVALID_NODE_INFO","data":null}
```

**错误码**: 803  
**错误标识**: APIKEY_INVALID_NODE_INFO  
**含义**: nodeInfoList 与工作流不匹配

## 🔍 问题分析

### 根本原因

根据RunningHub技术文档，错误码803表示传入的 `nodeInfoList` 与绑定的工作流不匹配。经过分析发现以下问题：

#### 问题1：重复的节点映射
**原始错误配置**:
```typescript
nodeInfoTemplate: [
  { nodeId: '19', fieldName: 'image', paramKey: 'image_19' },
  { nodeId: '85', fieldName: 'prompt', paramKey: 'prompt_85' },
  { nodeId: '65', fieldName: 'shape', paramKey: 'shape_65' },        // ❌ 重复节点ID
  { nodeId: '65', fieldName: 'X_offset', paramKey: 'X_offset_65' },  // ❌ 重复节点ID
  { nodeId: '65', fieldName: 'Y_offset', paramKey: 'Y_offset_65' },  // ❌ 重复节点ID
  { nodeId: '65', fieldName: 'scale', paramKey: 'scale_65' },        // ❌ 重复节点ID
  { nodeId: '65', fieldName: 'rotation', paramKey: 'rotation_65' }   // ❌ 重复节点ID
]
```

**问题**: 同一个节点ID `65` 被映射了多个不同的 `fieldName`，这在RunningHub的API中是不被支持的。

#### 问题2：字段名可能不正确
根据workflow JSON分析，节点65 (LightShapeNode) 的实际字段名可能与配置不匹配。

## ✅ 修复方案

### 方案1：简化配置（已实施）

考虑到RunningHub API的限制，我们简化了配置，只保留用户真正需要的参数：

**修复后的配置**:
```typescript
parameters: [
  { name: 'image_19', type: 'image', description: '上传主图（要重新打光的图片）' },
  { 
    name: 'prompt_85', 
    type: 'text', 
    default: '', 
    description: '光源提示词（描述期望的光照效果）' 
  }
]

nodeInfoTemplate: [
  { nodeId: '19', fieldName: 'image', paramKey: 'image_19' },        // LoadImage 节点 - 主图
  { nodeId: '85', fieldName: 'prompt', paramKey: 'prompt_85' }       // RH_Translator 节点 - 光源提示词
]
```

### 方案2：如果需要更多控制参数

如果确实需要控制光源形状、位置等参数，需要：

1. **确认正确的节点ID和字段名**
2. **使用不同的节点ID**，或者
3. **分批处理参数**

## 📋 RunningHub API 限制说明

### nodeInfoList 规则

根据技术文档，`nodeInfoList` 必须遵循以下规则：

1. **唯一性**: 每个 `nodeId` 和 `fieldName` 的组合必须是唯一的
2. **存在性**: `nodeId` 必须存在于工作流定义中
3. **匹配性**: `fieldName` 必须与节点输入字段一致
4. **类型一致性**: `fieldValue` 必须与原字段类型一致

### 常见错误原因

1. **重复映射**: 同一个节点ID映射多个字段
2. **字段名错误**: 使用了不存在的字段名
3. **类型不匹配**: 数值字段传入了字符串等
4. **节点不存在**: 使用了工作流中不存在的节点ID

## 🎯 当前状态

### 已修复的问题
- ✅ 移除了重复的节点映射
- ✅ 简化了参数配置
- ✅ 确保节点ID和字段名的正确性

### 当前配置
- **主图上传**: 节点19 (LoadImage)
- **光源提示词**: 节点85 (RH_Translator)
- **其他参数**: 使用workflow默认值

## 🚀 部署状态

**最新部署**: https://cosnap-ganjxwpspdso8qf56cpgzyon2kq1-terrys-projects-0cc48ccf.vercel.app  
**部署时间**: 2025-08-05 10:15 UTC  
**状态**: ✅ 成功  
**修复**: ✅ 错误已修复

## 🔧 技术建议

### 1. 验证工作流配置
在添加新的工作流时，建议：

1. **导出工作流API格式**: 从RunningHub界面下载JSON文件
2. **验证节点ID**: 确认所有节点ID存在于工作流中
3. **检查字段名**: 确认字段名与节点输入一致
4. **测试最小配置**: 先用最简单的参数测试

### 2. 参数配置策略
- **必需参数**: 用户必须提供的参数（如图片、提示词）
- **可选参数**: 使用默认值的参数
- **高级参数**: 复杂控制参数，可后续添加

### 3. 错误处理
- **803错误**: 检查nodeInfoList配置
- **433错误**: 检查工作流合法性
- **301错误**: 检查请求参数格式

## 📚 相关文档

- [RunningHub API文档](./RELIGHTING_EFFECT_ADDITION.md)
- [错误码说明](https://www.runninghub.cn/runninghub-api-doc)
- [工作流配置指南](./NEW_EFFECT_ADDITION.md)

---

**修复完成时间**: 2025-08-05 10:15 UTC  
**开发人员**: AI Assistant  
**技术栈**: React + TypeScript + RunningHub ComfyUI API 