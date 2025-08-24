# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack AI image processing application called "Cosnap AI" that integrates with RunningHub API for AI effects processing. The project consists of a React TypeScript frontend and an Express.js backend.

## Project Structure

```
E:\desktop\Cosnap企划\code\ui\
├── project/                    # React TypeScript frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/             # Route components
│   │   ├── context/           # React context providers
│   │   ├── services/          # API service layers
│   │   ├── config/            # Configuration files
│   │   ├── types/             # TypeScript type definitions
│   │   └── utils/             # Utility functions
│   └── package.json
└── runninghub-backend/        # Express.js backend
    ├── src/
    │   ├── routes/            # API route handlers
    │   ├── services/          # Business logic services
    │   ├── middleware/        # Express middleware
    │   └── config/           # Backend configuration
    ├── prisma/               # Database schema
    └── package.json
```

## Common Development Commands

### Frontend (project/)
- `npm run dev` - Start development server (Vite)
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Backend (runninghub-backend/)
- `npm start` - Start production server
- `npm run db:push` - Push Prisma schema to database
- `npm run migrate:deploy` - Deploy database migrations

## Critical Integration Requirements

### ⚠️ RunningHub API Integration Rules

**CRITICAL: These requirements must be followed for the API to work:**

1. **webappId Parameter**: Must be passed as STRING, never convert to integer
   ```javascript
   // ✅ Correct
   webappId: webappId
   
   // ❌ Wrong - causes "webapp not exists" error
   webappId: parseInt(webappId)
   ```

2. **fieldValue Parameter**: All field values must be strings
   ```javascript
   // ✅ Correct
   fieldValue: String(value)
   
   // ❌ Wrong - causes APIKEY_INVALID_NODE_INFO error
   fieldValue: parseFloat(value)
   ```

3. **workflowId Parameter**: Must be passed as string
   ```javascript
   // ✅ Correct
   workflowId: String(workflowId)
   ```

These fixes are documented in detail in `RUNNINGHUB_API_FIX.md`.

## Architecture Overview

### Frontend Architecture
- **React 18** with TypeScript and Vite build system
- **React Router v7** for routing with protected routes
- **TanStack Query** for API state management
- **Tailwind CSS** for styling with dark mode support
- **Framer Motion** for animations
- **Context API** for global state (Auth, App, Toast)

### Backend Architecture
- **Express.js** server with CORS configuration
- **Prisma ORM** for database operations
- **JWT** authentication middleware
- **RunningHub API** integration for AI effects processing
- **File upload** handling with Multer
- **Region-based API** routing (China/Hong Kong)

### Key Components
- `AuthContext`: Handles user authentication and JWT tokens
- `AppContext`: Global application state management
- `ProtectedRoute`: Route protection based on authentication
- `ErrorBoundary`: React error boundary for error handling
- `TaskResultGallery`: AI effect processing results display
- `RegionSelector`: Allows users to switch between API regions

### API Services Structure
- `webappTaskService.js` - Handles webapp-based AI effects
- `comfyUITaskService.js` - Handles ComfyUI workflow effects
- `taskService.js` - General task management
- `loraUploadService.js` - LoRA model file uploads
- `cloudStorageService.js` - Cloud storage integration

## Development Environment Setup

1. **Frontend**: Runs on `http://localhost:5173` (Vite dev server)
2. **Backend**: Runs on `http://localhost:3001` (Express server)
3. **Database**: Uses Prisma with PostgreSQL
4. **File Storage**: Ali OSS cloud storage integration

## Testing and Validation

The project includes comprehensive test scripts in `runninghub-backend/`:
- `test-all-effects.js` - Tests all available AI effects
- `test-api-key.js` - Validates API key functionality
- `test-upload.js` - Tests file upload functionality

## Production Deployment

- **Frontend**: Deployed on Vercel with Vite build
- **Backend**: Deployed on Railway with environment variables
- **Database**: PostgreSQL database with Prisma migrations
- **CDN**: Static assets served from Ali OSS

## Authentication Flow

1. User registers/logs in through `/auth` endpoints
2. JWT token stored in localStorage and context
3. Protected routes check authentication via `ProtectedRoute` component
4. API requests include Authorization header with Bearer token

## Error Handling Strategy

- Global error boundaries in React components
- Centralized error handling in backend middleware
- User-friendly error messages via Toast context
- Comprehensive logging for debugging

## File Upload Configuration

- **RunningHub API limit**: 10MB (files ≤10MB uploaded directly to RunningHub)
- **Cloud storage**: Files >10MB automatically uploaded to Ali OSS cloud storage
- **Frontend limit**: 10MB (matches RunningHub API limit for optimal UX)
- **Supported formats**: JPEG, PNG, GIF, WebP
- **Upload endpoint**: `/api/effects/upload-image`
- **Storage**: RunningHub direct upload (≤10MB) + Ali OSS cloud storage (>10MB)

## RunningHub API Official Documentation

### Main Documentation
- [使用须知](https://www.runninghub.cn/runninghub-api-doc/doc-6332954.md) - Important usage guidelines
- [关于nodeInfoList](https://www.runninghub.cn/runninghub-api-doc/doc-6332955.md) - Understanding nodeInfoList structure
- [关于企业级API介绍](https://www.runninghub.cn/runninghub-api-doc/doc-6465949.md) - Enterprise API introduction
- [原生ComfyUI接口支持](https://www.runninghub.cn/runninghub-api-doc/doc-6768545.md) - Native ComfyUI interface support
- [接口错误码说明](https://www.runninghub.cn/runninghub-api-doc/doc-6913922.md) - API error code explanations

### API Endpoints Documentation
- [发起ComfyUI任务1-简易](https://www.runninghub.cn/runninghub-api-doc/api-276613248.md) - Simple ComfyUI task creation (no parameter changes)
- [发起ComfyUI任务2-高级](https://www.runninghub.cn/runninghub-api-doc/api-276613249.md) - Advanced ComfyUI task creation (with nodeInfoList)
- [发起AI应用任务](https://www.runninghub.cn/runninghub-api-doc/api-279098421.md) - AI webapp task creation (see webapp details for nodeInfoList examples)
- [获取工作流Json](https://www.runninghub.cn/runninghub-api-doc/api-276613251.md) - Get workflow JSON
- [查询任务状态](https://www.runninghub.cn/runninghub-api-doc/api-276613252.md) - Query task status
- [查询任务生成结果](https://www.runninghub.cn/runninghub-api-doc/api-276613253.md) - Get task results
- [取消ComfyUI任务](https://www.runninghub.cn/runninghub-api-doc/api-276613254.md) - Cancel ComfyUI tasks
- [获取账户信息](https://www.runninghub.cn/runninghub-api-doc/api-276613255.md) - Get account information
- [上传资源（图片、视频、音频）](https://www.runninghub.cn/runninghub-api-doc/api-276613256.md) - Upload resources for image-to-image scenarios
- [上传Lora-获取Lora上传地址](https://www.runninghub.cn/runninghub-api-doc/api-276613257.md) - RHLoraLoader LoRA upload interface
- [获取webhook事件详情](https://www.runninghub.cn/runninghub-api-doc/api-276613258.md) - Get webhook event details for debugging
- [重新发送指定webhook事件](https://www.runninghub.cn/runninghub-api-doc/api-276613259.md) - Resend specific webhook events
- [获取AI应用API调用示例](https://www.runninghub.cn/runninghub-api-doc/api-335439604.md) - Get AI webapp API call examples and demos

### Key API Integration Notes
1. **Parameter Types**: ALL parameters (webappId, workflowId, nodeId, fieldName, fieldValue) MUST be strings
2. **Regional Support**: China (.cn) and Hong Kong (.ai) domains available
3. **Task Flow**: Create → Poll Status → Get Results
4. **Resource Upload**: Separate endpoints for images/media and LoRA models
5. **Webhook Support**: Event-driven notifications with retry mechanisms