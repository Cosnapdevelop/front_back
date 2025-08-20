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

- Maximum file size: 30MB
- Supported formats: JPEG, PNG, GIF, WebP
- Upload endpoint: `/api/effects/upload-image`
- Storage: Ali OSS cloud storage