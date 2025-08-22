# Bug Fixes Needed - Week 1-2 Implementation Issues

## Critical Bugs Requiring Immediate Fix

### 🚨 **PRIORITY 1: Production Blockers**

#### 1. **Backend Authentication Schema Mismatch**
- **Priority**: 🔴 **CRITICAL - PRODUCTION BLOCKER**
- **File**: `runninghub-backend/src/routes/auth.js`
- **Lines**: 323, 336, 424-425
- **Issue**: Code references database fields that don't exist in schema
- **Impact**: Authentication system will fail on startup

**Fields Referenced but Missing:**
```javascript
// Lines causing failures:
if (stored.user.isBanned) { // Line 323 - Field doesn't exist
if (!stored.user.isActive) { // Line 336 - Field doesn't exist
lastLoginAt: user.lastLoginAt // Line 425 - Field doesn't exist
```

**Fix Required:**
```sql
-- Add missing fields to User table in schema.prisma:
model User {
  // ... existing fields ...
  isBanned    Boolean   @default(false)
  isActive    Boolean   @default(true)
  lastLoginAt DateTime?
}
```

**Steps to Fix:**
1. Update `runninghub-backend/prisma/schema.prisma`
2. Run `npx prisma db push` or create migration
3. Test authentication flow

---

#### 2. **Frontend Build Configuration Error**
- **Priority**: 🔴 **CRITICAL - BUILD FAILURE**
- **File**: `project/vite.config.ts` vs `project/package.json`
- **Issue**: Plugin mismatch will cause build to fail
- **Impact**: Cannot build for production

**Current Issue:**
```typescript
// vite.config.ts (Line 2):
import react from '@vitejs/plugin-react-swc';

// But package.json has:
"@vitejs/plugin-react": "^4.3.1"
// Missing: "@vitejs/plugin-react-swc"
```

**Fix Option 1 (Recommended):**
```bash
cd project
npm install @vitejs/plugin-react-swc
```

**Fix Option 2 (Alternative):**
```typescript
// Update vite.config.ts Line 2:
import react from '@vitejs/plugin-react';
```

---

#### 3. **Backend Dependency Inconsistency**
- **Priority**: 🔴 **CRITICAL - RUNTIME FAILURE**
- **Files**: `runninghub-backend/src/routes/auth.js` vs `test-account-deletion.js`
- **Issue**: Inconsistent bcrypt library usage
- **Impact**: Authentication hashing will fail

**Current Issue:**
```javascript
// auth.js (Line 2):
import bcrypt from 'bcrypt';

// test-account-deletion.js (Line 11):
import bcrypt from 'bcryptjs';

// package.json has both:
"bcrypt": "^5.1.1",
"bcryptjs": NOT LISTED (but imported)
```

**Fix Required:**
```bash
cd runninghub-backend
# Standardize on bcrypt (recommended for production)
npm uninstall bcryptjs  # if installed
# Ensure all files use: import bcrypt from 'bcrypt';

# Or update test-account-deletion.js line 11:
import bcrypt from 'bcrypt';
```

---

### ⚠️ **PRIORITY 2: Configuration Issues**

#### 4. **Analytics Configuration Missing**
- **Priority**: 🟠 **HIGH - FEATURE BROKEN**
- **File**: `project/src/utils/analytics.ts`
- **Line**: 51
- **Issue**: Placeholder Google Analytics ID prevents tracking
- **Impact**: Analytics system completely disabled

**Current Issue:**
```typescript
// Line 51:
const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // Placeholder
```

**Fix Required:**
```typescript
// Replace with actual Google Analytics 4 measurement ID:
const GA_MEASUREMENT_ID = 'G-YOUR_ACTUAL_MEASUREMENT_ID';
```

**Steps to Fix:**
1. Get GA4 measurement ID from Google Analytics
2. Update `analytics.ts` line 51
3. Test analytics events in development

---

#### 5. **TypeScript Window Declaration Missing**
- **Priority**: 🟠 **HIGH - COMPILATION WARNINGS**
- **File**: `project/src/utils/analytics.ts`
- **Lines**: 62-64
- **Issue**: TypeScript errors for window.gtag usage
- **Impact**: TypeScript compilation warnings

**Current Issue:**
```typescript
// Lines 62-64 - TypeScript can't find gtag on window
window.gtag = function() {
  window.dataLayer.push(arguments);
};
```

**Fix Required:**
Create window type augmentation in `project/src/vite-env.d.ts`:
```typescript
/// <reference types="vite/client" />

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}
```

---

### 🟡 **PRIORITY 3: Minor Issues**

#### 6. **Inconsistent Error Handling in Avatar Component**
- **Priority**: 🟡 **MEDIUM - USER EXPERIENCE**
- **File**: `project/src/components/Avatar.tsx`
- **Lines**: 84-87
- **Issue**: Error state shows generic message
- **Impact**: Poor user experience on image load failure

**Current Issue:**
```typescript
// Lines 84-87:
img.onerror = () => {
  setImageLoading(false);
  setImageError(true);
}; // No error details logged
```

**Fix Recommended:**
```typescript
img.onerror = (error) => {
  setImageLoading(false);
  setImageError(true);
  console.error(`Avatar image failed to load: ${src}`, error);
};
```

---

#### 7. **Performance Hook Edge Case**
- **Priority**: 🟡 **LOW - EDGE CASE**
- **File**: `project/src/hooks/usePerformanceMonitoring.ts`
- **Lines**: 236-251
- **Issue**: Memory monitoring assumes Chrome API availability
- **Impact**: Potential errors in non-Chrome browsers

**Current Issue:**
```typescript
// @ts-ignore - Chrome specific API
if (performance.memory) {
  // Uses Chrome-specific API without proper feature detection
}
```

**Fix Recommended:**
```typescript
// Add proper feature detection:
if ('memory' in performance && typeof performance.memory === 'object') {
  const memory = performance.memory as any;
  // ... rest of implementation
}
```

---

## Implementation Specific Bug Fixes

### 🔧 **Account Deletion Flow Fixes**

#### 8. **Email Verification Scene Validation**
- **Priority**: 🟡 **MEDIUM - SECURITY**
- **File**: `runninghub-backend/src/routes/auth.js`
- **Lines**: 694-695
- **Issue**: Hardcoded scene validation for account deletion
- **Impact**: Potential security bypass

**Current Issue:**
```javascript
// Line 694:
scene: 'delete_account', // Hardcoded scene
```

**Fix Recommended:**
Add scene validation to ensure consistency:
```javascript
const expectedScene = 'delete_account';
if (found.scene !== expectedScene) {
  return res.status(400).json({ 
    success: false, 
    error: '验证码场景不匹配' 
  });
}
```

---

### 🔧 **Frontend Performance Fixes**

#### 9. **TaskResultGallery Memory Leak Potential**
- **Priority**: 🟡 **MEDIUM - MEMORY**
- **File**: `project/src/components/TaskResultGallery.tsx`
- **Lines**: 61-65
- **Issue**: Map not cleaned up on unmount
- **Impact**: Potential memory accumulation

**Current Issue:**
```typescript
const loadStartTimes = useRef<Map<string, number>>(new Map());
// No cleanup on unmount
```

**Fix Recommended:**
```typescript
useEffect(() => {
  return () => {
    // Cleanup on unmount
    loadStartTimes.current.clear();
  };
}, []);
```

---

#### 10. **OptimizedImage Preload Cleanup**
- **Priority**: 🟡 **MEDIUM - MEMORY**
- **File**: `project/src/components/UI/OptimizedImage.tsx`
- **Lines**: 109-113
- **Issue**: Preload link may not be cleaned up properly
- **Impact**: DOM pollution with unused link elements

**Current Implementation:**
```typescript
return () => {
  if (document.head.contains(link)) {
    document.head.removeChild(link);
  }
};
```

**Issue**: `document.head.contains()` check may be unreliable.

**Fix Recommended:**
```typescript
return () => {
  try {
    if (link.parentNode === document.head) {
      document.head.removeChild(link);
    }
  } catch (error) {
    // Link already removed, ignore error
    console.debug('Preload link already removed');
  }
};
```

---

## Testing Related Bug Fixes

### 🧪 **Test Configuration Issues**

#### 11. **Account Deletion Test Script Dependency**
- **Priority**: 🟡 **LOW - TESTING**
- **File**: `runninghub-backend/test-account-deletion.js`
- **Line**: 11
- **Issue**: Uses different bcrypt library than main code
- **Impact**: Test environment differs from production

**Fix Required:**
```javascript
// Line 11: Update to match main code
import bcrypt from 'bcrypt'; // Instead of 'bcryptjs'
```

---

## Security Related Bug Fixes

### 🛡️ **Authentication Security**

#### 12. **JWT Secret Environment Variable**
- **Priority**: 🟠 **HIGH - SECURITY**
- **Files**: Multiple auth-related files
- **Issue**: Need to verify JWT secrets are properly configured
- **Impact**: Authentication security

**Verification Needed:**
```bash
# Ensure these environment variables are set:
JWT_ACCESS_SECRET=strong-secret-here
JWT_REFRESH_SECRET=different-strong-secret-here
```

**Check Required:**
Verify that production environment has strong, unique JWT secrets configured.

---

## Database Related Bug Fixes

### 🗄️ **Schema Consistency**

#### 13. **Refresh Token Cleanup**
- **Priority**: 🟡 **MEDIUM - MAINTENANCE**
- **File**: `runninghub-backend/src/routes/auth.js`
- **Lines**: 377-386
- **Issue**: Logout may fail silently if token doesn't exist
- **Impact**: Inconsistent logout behavior

**Current Implementation:**
```javascript
await prisma.refreshToken.update({ 
  where: { token: refreshToken }, 
  data: { 
    isRevoked: true,
    revokedAt: new Date() 
  } 
}).catch((error) => {
  console.warn(`[登出] 撤销令牌失败 - IP: ${req.ip}, 错误: ${error.message}`);
});
```

**Improvement Recommended:**
```javascript
// Use updateMany to avoid errors if token doesn't exist:
await prisma.refreshToken.updateMany({ 
  where: { token: refreshToken }, 
  data: { 
    isRevoked: true,
    revokedAt: new Date() 
  } 
});
```

---

## Bug Fix Priority Summary

### 🚨 **Must Fix Before Production** (Critical - 3 bugs)
1. **Backend Authentication Schema Mismatch** - Will break authentication
2. **Frontend Build Configuration Error** - Will break build process  
3. **Backend Dependency Inconsistency** - Will break authentication hashing

### ⚠️ **Should Fix Soon** (High Priority - 2 bugs)
4. **Analytics Configuration Missing** - Analytics completely disabled
5. **TypeScript Window Declaration Missing** - Compilation warnings

### 🟡 **Fix When Possible** (Medium/Low Priority - 8 bugs)
6-13. Various minor issues and improvements

---

## Bug Fix Implementation Plan

### Phase 1: Critical Fixes (Day 1)
```bash
# 1. Fix database schema
cd runninghub-backend
# Update prisma/schema.prisma with missing fields
npx prisma db push

# 2. Fix frontend build
cd project
npm install @vitejs/plugin-react-swc

# 3. Standardize bcrypt usage
# Update test-account-deletion.js imports
```

### Phase 2: Configuration Fixes (Day 2)
```bash
# 4. Configure analytics
# Update GA_MEASUREMENT_ID in analytics.ts

# 5. Fix TypeScript declarations
# Add window type augmentation to vite-env.d.ts
```

### Phase 3: Code Quality Fixes (Week 2)
```bash
# 6-13. Implement remaining fixes
# Focus on error handling and memory management improvements
```

---

## Testing Strategy for Bug Fixes

### Critical Bug Testing
1. **Authentication Flow**: Test complete registration/login flow
2. **Build Process**: Verify production build completes successfully
3. **Database Operations**: Test all authentication operations

### Configuration Testing
1. **Analytics**: Verify events are tracked correctly
2. **TypeScript**: Ensure no compilation errors

### Integration Testing
1. **End-to-End**: Complete user journey testing
2. **Performance**: Verify optimizations still work after fixes
3. **Error Handling**: Test error conditions

---

## Risk Assessment After Fixes

### High Risk (Before Fixes)
- **Production deployment will fail**
- **Authentication system broken**
- **Build process broken**

### Low Risk (After Critical Fixes)
- **System will be production-ready**
- **All core functionality working**
- **Performance optimizations intact**

---

*Bug report compiled on 2025-01-21*  
*Critical bugs identified: 3*  
*Total bugs catalogued: 13*  
*Production blockers: 3*  
*Estimated fix time: 1-2 days for critical issues*