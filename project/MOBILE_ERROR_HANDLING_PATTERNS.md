# Mobile Error Handling Patterns
## Touch-Optimized Error Recovery & User Guidance

**Date:** August 22, 2025  
**Designer:** UI/UX Designer  
**Target:** Mobile-first error prevention and recovery  
**Goal:** 90%+ error recovery success rate

---

## Executive Summary

Mobile users require different error handling approaches due to context switching challenges, limited screen space, and touch-first interactions. This specification creates comprehensive error patterns that prevent, guide, and recover from errors with minimal user frustration.

### **Design Principles:**
- **Prevention First:** Proactive guidance to avoid errors
- **Clear Communication:** Simple, jargon-free error messages
- **One-Touch Recovery:** Quick resolution actions
- **Context Preservation:** Maintain user progress during errors
- **Progressive Disclosure:** Show only relevant information

### **Error Categories:**
1. **Network & Connectivity** (40% of mobile errors)
2. **File Upload & Validation** (25% of mobile errors)
3. **Form Input & Validation** (20% of mobile errors)
4. **AI Processing Errors** (10% of mobile errors)
5. **System & Performance** (5% of mobile errors)

---

## Mobile Error State Taxonomy

### **Error Severity Levels:**

#### **Level 1: Informational (Blue)**
- User guidance and tips
- Non-blocking notifications
- Progressive enhancement suggestions

#### **Level 2: Warning (Yellow)**
- Potential issues that need attention
- Non-critical validation errors
- Performance suggestions

#### **Level 3: Error (Red)**
- Blocking errors requiring action
- Critical validation failures
- System unavailable states

#### **Level 4: Critical (Dark Red)**
- Data loss prevention
- Security issues
- Permanent failures

---

## Network & Connectivity Error Patterns

### **1. Connection Lost Pattern**

#### **Visual Design:**
```tsx
// Comprehensive offline state with recovery options
<ErrorCard severity="error" className="m-4">
  <div className="text-center py-8">
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", delay: 0.2 }}
      className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center"
    >
      <WifiOff className="w-10 h-10 text-gray-400" />
    </motion.div>
    
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
      Connection Lost
    </h3>
    
    <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
      Check your internet connection and try again. Your progress has been saved.
    </p>
    
    {/* Recovery actions */}
    <div className="space-y-3">
      <TouchButton
        variant="primary"
        size="lg"
        onClick={retryConnection}
        icon={<RefreshCw className="w-5 h-5" />}
        loading={isRetrying}
        className="w-full"
      >
        {isRetrying ? 'Reconnecting...' : 'Try Again'}
      </TouchButton>
      
      <TouchButton
        variant="secondary"
        size="lg"
        onClick={workOffline}
        icon={<Download className="w-5 h-5" />}
        className="w-full"
      >
        Continue Offline
      </TouchButton>
    </div>
    
    {/* Connection status indicator */}
    <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-gray-500">
      <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
      <span>{isOnline ? 'Connected' : 'Offline'}</span>
    </div>
  </div>
</ErrorCard>
```

#### **Progressive Recovery Strategy:**
```tsx
const useConnectionRecovery = () => {
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [retryDelay, setRetryDelay] = useState(1000);
  
  const autoRetryWithBackoff = async () => {
    if (retryAttempts < 3) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      
      try {
        await testConnection();
        setRetryAttempts(0);
        setRetryDelay(1000);
        showSuccessToast('Connection restored!');
      } catch {
        setRetryAttempts(prev => prev + 1);
        setRetryDelay(prev => Math.min(prev * 2, 10000)); // Exponential backoff
        autoRetryWithBackoff();
      }
    }
  };
  
  return { autoRetryWithBackoff, retryAttempts };
};
```

### **2. Slow Connection Pattern**

#### **Progressive Loading with Timeout:**
```tsx
// Slow connection warning with options
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 m-4"
>
  <div className="flex items-start space-x-3">
    <Clock className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
    <div className="flex-1">
      <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
        Slow Connection Detected
      </h4>
      <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
        This may take longer than usual. You can continue or try again later.
      </p>
      
      <div className="flex space-x-2">
        <TouchButton
          variant="warning"
          size="sm"
          onClick={continueWithSlowConnection}
        >
          Continue Anyway
        </TouchButton>
        <TouchButton
          variant="secondary"
          size="sm"
          onClick={cancelAndRetryLater}
        >
          Try Later
        </TouchButton>
      </div>
    </div>
  </div>
</motion.div>
```

---

## File Upload Error Patterns

### **1. File Size Error Pattern**

#### **Preventive Validation with Suggestions:**
```tsx
// File size error with compression options
<ErrorCard severity="warning" className="m-4">
  <div className="flex items-start space-x-4">
    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
      <FileX className="w-6 h-6 text-amber-600 dark:text-amber-400" />
    </div>
    
    <div className="flex-1 min-w-0">
      <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
        File Too Large
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        Your image is {formatFileSize(fileSize)}. Maximum size is {formatFileSize(maxSize)}.
      </p>
      
      {/* File preview with size indicator */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
        <div className="flex items-center space-x-3">
          <img 
            src={filePreview} 
            alt="File preview" 
            className="w-12 h-12 object-cover rounded-lg"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {fileName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatFileSize(fileSize)} • {imageResolution}
            </p>
          </div>
        </div>
      </div>
      
      {/* Recovery options */}
      <div className="space-y-2">
        <TouchButton
          variant="primary"
          size="md"
          onClick={compressAndUpload}
          icon={<Compress className="w-4 h-4" />}
          loading={isCompressing}
          className="w-full"
        >
          {isCompressing ? 'Compressing...' : 'Compress & Upload'}
        </TouchButton>
        
        <TouchButton
          variant="secondary"
          size="md"
          onClick={chooseAnotherFile}
          icon={<Upload className="w-4 h-4" />}
          className="w-full"
        >
          Choose Another File
        </TouchButton>
      </div>
      
      {/* Helpful tips */}
      <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          💡 Tip: Images larger than 10MB will be automatically optimized for better performance.
        </p>
      </div>
    </div>
  </div>
</ErrorCard>
```

### **2. Unsupported File Type Pattern**

#### **Educational Error with Clear Next Steps:**
```tsx
// Unsupported file type with format conversion suggestion
<ErrorCard severity="error" className="m-4">
  <div className="text-center py-6">
    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
      <FileX className="w-8 h-8 text-red-600 dark:text-red-400" />
    </div>
    
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
      Unsupported File Type
    </h3>
    
    <p className="text-gray-600 dark:text-gray-400 mb-1">
      <span className="font-medium">{fileName}</span> ({fileType})
    </p>
    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
      We support JPG, PNG, GIF, and WebP images
    </p>
    
    {/* Supported formats visual guide */}
    <div className="flex justify-center space-x-4 mb-6">
      {['JPG', 'PNG', 'GIF', 'WebP'].map((format) => (
        <div key={format} className="text-center">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-1">
            <Image className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400">{format}</span>
        </div>
      ))}
    </div>
    
    {/* Recovery actions */}
    <div className="space-y-3">
      <TouchButton
        variant="primary"
        size="lg"
        onClick={convertFile}
        icon={<RefreshCw className="w-5 h-5" />}
        className="w-full"
      >
        Convert to JPG
      </TouchButton>
      
      <TouchButton
        variant="secondary"
        size="lg"
        onClick={chooseAnotherFile}
        icon={<Upload className="w-5 h-5" />}
        className="w-full"
      >
        Choose Different File
      </TouchButton>
    </div>
  </div>
</ErrorCard>
```

---

## Form Validation Error Patterns

### **1. Real-time Validation Errors**

#### **Inline Validation with Correction Guidance:**
```tsx
// Enhanced form field with mobile-optimized error states
<div className="space-y-2">
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
    {label}
  </label>
  
  <div className="relative">
    <input
      type={type}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      className={`
        w-full h-12 px-4 rounded-xl border-2 transition-all duration-200
        ${error 
          ? 'border-red-500 bg-red-50 dark:bg-red-900/20 focus:ring-red-500' 
          : success
          ? 'border-green-500 bg-green-50 dark:bg-green-900/20 focus:ring-green-500'
          : 'border-gray-200 dark:border-gray-600 focus:ring-purple-500'
        }
      `}
      placeholder={placeholder}
    />
    
    {/* Status indicator */}
    <div className="absolute right-3 top-1/2 -translate-y-1/2">
      {isValidating && (
        <div className="w-5 h-5 border-2 border-gray-300 border-t-purple-500 rounded-full animate-spin" />
      )}
      {error && (
        <AlertCircle className="w-5 h-5 text-red-500" />
      )}
      {success && (
        <CheckCircle className="w-5 h-5 text-green-500" />
      )}
    </div>
  </div>
  
  {/* Error message with suggestions */}
  <AnimatePresence>
    {error && (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3"
      >
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-700 dark:text-red-300 mb-1">
              {error.message}
            </p>
            
            {error.suggestions && (
              <div className="space-y-1">
                {error.suggestions.map((suggestion, index) => (
                  <TouchButton
                    key={index}
                    variant="error-suggestion"
                    size="xs"
                    onClick={() => applySuggestion(suggestion)}
                    className="mr-2"
                  >
                    {suggestion.text}
                  </TouchButton>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
  
  {/* Success confirmation */}
  <AnimatePresence>
    {success && (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex items-center space-x-2 text-sm text-green-700 dark:text-green-300"
      >
        <CheckCircle className="w-4 h-4" />
        <span>{success.message}</span>
      </motion.div>
    )}
  </AnimatePresence>
</div>
```

### **2. Form Submission Errors**

#### **Comprehensive Form Error Summary:**
```tsx
// Form-level error handling with field-specific guidance
<ErrorCard severity="error" className="mb-6">
  <div className="p-4">
    <div className="flex items-center space-x-3 mb-4">
      <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
      </div>
      <div>
        <h3 className="font-medium text-gray-900 dark:text-white">
          Please Fix These Issues
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {errorCount} {errorCount === 1 ? 'field needs' : 'fields need'} attention
        </p>
      </div>
    </div>
    
    {/* Error summary list */}
    <div className="space-y-3">
      {formErrors.map((error, index) => (
        <TouchButton
          key={index}
          variant="error-nav"
          size="sm"
          onClick={() => focusField(error.field)}
          className="w-full justify-between"
        >
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-left">
              <span className="font-medium">{error.label}:</span> {error.message}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </TouchButton>
      ))}
    </div>
    
    {/* Quick fix actions */}
    {hasQuickFixes && (
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Quick fixes:</p>
        <div className="flex flex-wrap gap-2">
          {quickFixes.map((fix, index) => (
            <TouchButton
              key={index}
              variant="secondary"
              size="xs"
              onClick={() => applyQuickFix(fix)}
            >
              {fix.label}
            </TouchButton>
          ))}
        </div>
      </div>
    )}
  </div>
</ErrorCard>
```

---

## AI Processing Error Patterns

### **1. Processing Timeout Pattern**

#### **Timeout with Recovery Options:**
```tsx
// AI processing timeout with intelligent recovery
<ErrorCard severity="warning" className="m-4">
  <div className="text-center py-6">
    <motion.div
      initial={{ rotate: 0 }}
      animate={{ rotate: 180 }}
      transition={{ duration: 0.5 }}
      className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4"
    >
      <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
    </motion.div>
    
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
      Processing Taking Longer Than Expected
    </h3>
    
    <p className="text-gray-600 dark:text-gray-400 mb-2">
      High-quality AI effects sometimes need extra time.
    </p>
    
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-6">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">Estimated completion:</span>
        <span className="font-medium text-gray-900 dark:text-white">
          {estimatedTimeRemaining}
        </span>
      </div>
      
      {/* Progress indicator */}
      <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${processingProgress}%` }}
        />
      </div>
    </div>
    
    {/* Recovery options */}
    <div className="space-y-3">
      <TouchButton
        variant="primary"
        size="lg"
        onClick={continueWaiting}
        icon={<Clock className="w-5 h-5" />}
        className="w-full"
      >
        Continue Waiting
      </TouchButton>
      
      <TouchButton
        variant="secondary"
        size="lg"
        onClick={switchToFasterMode}
        icon={<Zap className="w-5 h-5" />}
        className="w-full"
      >
        Switch to Fast Mode
      </TouchButton>
      
      <TouchButton
        variant="ghost"
        size="md"
        onClick={cancelProcessing}
        className="w-full text-gray-600"
      >
        Cancel & Try Different Effect
      </TouchButton>
    </div>
  </div>
</ErrorCard>
```

### **2. AI Model Error Pattern**

#### **Model Unavailable with Alternatives:**
```tsx
// AI model error with alternative suggestions
<ErrorCard severity="error" className="m-4">
  <div className="p-4">
    <div className="flex items-start space-x-4">
      <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
        <Bot className="w-6 h-6 text-red-600 dark:text-red-400" />
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
          AI Model Temporarily Unavailable
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          The "{effectName}" effect is currently being updated. Try these similar effects instead:
        </p>
        
        {/* Alternative effects */}
        <div className="space-y-2 mb-4">
          {alternativeEffects.map((effect) => (
            <TouchButton
              key={effect.id}
              variant="alternative"
              size="md"
              onClick={() => switchToEffect(effect.id)}
              className="w-full justify-between"
            >
              <div className="flex items-center space-x-3">
                <img 
                  src={effect.thumbnail} 
                  alt={effect.name}
                  className="w-8 h-8 rounded-lg object-cover"
                />
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {effect.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {effect.category} • {effect.processingTime}s
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </TouchButton>
          ))}
        </div>
        
        {/* Notification option */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Get notified when this effect is back online
            </p>
          </div>
          <TouchButton
            variant="ghost"
            size="sm"
            onClick={subscribeToNotifications}
            className="mt-2 text-blue-600"
          >
            Notify Me
          </TouchButton>
        </div>
      </div>
    </div>
  </div>
</ErrorCard>
```

---

## System Error Patterns

### **1. Memory/Performance Errors**

#### **Device Performance Optimization:**
```tsx
// Performance-related error with optimization suggestions
<ErrorCard severity="warning" className="m-4">
  <div className="p-4">
    <div className="flex items-start space-x-3">
      <Smartphone className="w-6 h-6 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <h3 className="font-medium text-gray-900 dark:text-white mb-1">
          Device Performance Optimization
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Your device is working hard! Here are some ways to improve performance:
        </p>
        
        {/* Performance suggestions */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <Settings className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-900 dark:text-white">
                Close other apps
              </span>
            </div>
            <TouchButton variant="ghost" size="sm" onClick={showAppSwitcher}>
              Open Settings
            </TouchButton>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <Image className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-900 dark:text-white">
                Use smaller image size
              </span>
            </div>
            <TouchButton variant="ghost" size="sm" onClick={optimizeImageSize}>
              Auto-resize
            </TouchButton>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <Zap className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-900 dark:text-white">
                Enable performance mode
              </span>
            </div>
            <TouchButton variant="ghost" size="sm" onClick={enablePerformanceMode}>
              Enable
            </TouchButton>
          </div>
        </div>
        
        {/* Continue anyway option */}
        <div className="flex space-x-2">
          <TouchButton
            variant="primary"
            size="md"
            onClick={continueWithOptimizations}
            className="flex-1"
          >
            Apply & Continue
          </TouchButton>
          <TouchButton
            variant="secondary"
            size="md"
            onClick={continueAnyway}
            className="flex-1"
          >
            Continue Anyway
          </TouchButton>
        </div>
      </div>
    </div>
  </div>
</ErrorCard>
```

---

## Error Prevention Strategies

### **1. Proactive Guidance System**

#### **Smart Assistance Before Errors Occur:**
```tsx
// Proactive guidance to prevent common errors
const ProactiveGuidance: React.FC = ({ currentAction, userContext }) => {
  const guidance = useMemo(() => {
    switch (currentAction) {
      case 'file-upload':
        return {
          type: 'info',
          message: 'For best results, use images larger than 512x512 pixels',
          action: { text: 'Check my image', onClick: analyzeImage }
        };
        
      case 'parameter-adjustment':
        if (userContext.isFirstTime) {
          return {
            type: 'info',
            message: 'Tip: Start with small adjustments and build up gradually',
            action: { text: 'Show examples', onClick: showExamples }
          };
        }
        break;
        
      case 'processing':
        if (userContext.devicePerformance === 'low') {
          return {
            type: 'warning',
            message: 'This effect may take longer on your device. Consider using fast mode.',
            action: { text: 'Switch to fast mode', onClick: enableFastMode }
          };
        }
        break;
    }
    return null;
  }, [currentAction, userContext]);
  
  if (!guidance) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mb-4 p-3 rounded-lg border ${
        guidance.type === 'info' 
          ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
          : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
      }`}
    >
      <div className="flex items-start space-x-3">
        <Lightbulb className={`w-5 h-5 mt-0.5 ${
          guidance.type === 'info' ? 'text-blue-600' : 'text-yellow-600'
        }`} />
        <div className="flex-1">
          <p className={`text-sm ${
            guidance.type === 'info' 
              ? 'text-blue-800 dark:text-blue-200'
              : 'text-yellow-800 dark:text-yellow-200'
          }`}>
            {guidance.message}
          </p>
          {guidance.action && (
            <TouchButton
              variant={guidance.type === 'info' ? 'info' : 'warning'}
              size="sm"
              onClick={guidance.action.onClick}
              className="mt-2"
            >
              {guidance.action.text}
            </TouchButton>
          )}
        </div>
      </div>
    </motion.div>
  );
};
```

### **2. Smart Error Recovery System**

#### **Contextual Recovery Suggestions:**
```tsx
// Intelligent error recovery based on user context and error history
const useSmartRecovery = () => {
  const [errorHistory, setErrorHistory] = useState<ErrorHistoryItem[]>([]);
  
  const getRecoveryStrategy = (error: ErrorType, context: UserContext) => {
    // Analyze error patterns
    const similarErrors = errorHistory.filter(e => 
      e.type === error.type && 
      Date.now() - e.timestamp < 300000 // Within 5 minutes
    );
    
    if (similarErrors.length >= 2) {
      // Recurring error - offer alternative approach
      return {
        type: 'alternative',
        title: 'Let\'s try a different approach',
        suggestions: getAlternativeActions(error.action),
        escalation: {
          text: 'Get personalized help',
          action: () => openSupportChat(error, context)
        }
      };
    }
    
    if (context.isNewUser && error.severity === 'error') {
      // New user - provide extra guidance
      return {
        type: 'educational',
        title: 'Here\'s what happened',
        explanation: getBeginnerFriendlyExplanation(error),
        tutorial: {
          text: 'Show me how to avoid this',
          action: () => startInteractiveTutorial(error.category)
        }
      };
    }
    
    // Standard recovery
    return {
      type: 'standard',
      actions: getStandardRecoveryActions(error)
    };
  };
  
  return { getRecoveryStrategy, errorHistory, setErrorHistory };
};
```

---

## Accessibility in Error Handling

### **1. Screen Reader Optimization**

#### **ARIA-Enhanced Error Messages:**
```tsx
// Screen reader optimized error announcements
<div
  role="alert"
  aria-live="assertive"
  aria-atomic="true"
  className="sr-only"
>
  {error && `Error: ${error.message}. ${error.instructions}`}
</div>

// Visual error with proper ARIA labels
<div
  role="group"
  aria-labelledby="error-title"
  aria-describedby="error-description error-actions"
  className="error-container"
>
  <h3 id="error-title" className="error-title">
    {error.title}
  </h3>
  
  <p id="error-description" className="error-description">
    {error.message}
  </p>
  
  <div id="error-actions" className="error-actions">
    <button
      aria-describedby="retry-description"
      onClick={retryAction}
    >
      Try Again
    </button>
    <span id="retry-description" className="sr-only">
      This will attempt the failed operation again
    </span>
  </div>
</div>
```

### **2. Voice Command Integration**

#### **Voice-Activated Error Recovery:**
```tsx
// Voice commands for error recovery
const useVoiceErrorRecovery = () => {
  useEffect(() => {
    if (error && 'webkitSpeechRecognition' in window) {
      const recognition = new webkitSpeechRecognition();
      
      recognition.onresult = (event) => {
        const command = event.results[0][0].transcript.toLowerCase();
        
        if (command.includes('try again')) {
          retryLastAction();
        } else if (command.includes('cancel')) {
          cancelCurrentAction();
        } else if (command.includes('help')) {
          openHelpForError(error);
        } else if (command.includes('contact support')) {
          openSupportChat();
        }
      };
      
      // Start listening after error occurs
      recognition.start();
      
      return () => recognition.stop();
    }
  }, [error]);
};
```

---

## Error Analytics & Learning

### **1. Error Pattern Detection**

#### **Smart Error Prevention Based on Usage Patterns:**
```tsx
// Machine learning for error prevention
const useErrorPrevention = () => {
  const [userBehaviorPattern, setUserBehaviorPattern] = useState({});
  
  useEffect(() => {
    // Analyze user interaction patterns
    const analyzeUserBehavior = () => {
      const patterns = {
        commonErrorTriggers: identifyErrorTriggers(userActions),
        timingPatterns: analyzeTimingIssues(userActions),
        deviceLimitations: detectDeviceLimitations(userDevice),
        skillLevel: assessUserSkillLevel(userHistory)
      };
      
      setUserBehaviorPattern(patterns);
    };
    
    const interval = setInterval(analyzeUserBehavior, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);
  
  const preventCommonErrors = (action: string) => {
    const likelihood = calculateErrorLikelihood(action, userBehaviorPattern);
    
    if (likelihood > 0.7) {
      showPreventiveGuidance(action);
    }
  };
  
  return { preventCommonErrors, userBehaviorPattern };
};
```

---

## Implementation Priority

### **Phase 1 (Day 2): Core Error Patterns**
1. **Network Error Handling** - Connection lost, slow connection
2. **File Upload Errors** - Size limits, unsupported formats
3. **Form Validation** - Real-time inline validation
4. **Basic Recovery Actions** - Retry, cancel, alternative paths

### **Phase 2 (Day 3): Advanced Error Recovery**
1. **AI Processing Errors** - Timeout handling, model unavailability
2. **Performance Optimization** - Device-specific suggestions
3. **Smart Recovery System** - Context-aware suggestions
4. **Error Prevention** - Proactive guidance system

### **Phase 3 (Day 4): Intelligence & Accessibility**
1. **Pattern Recognition** - Error prevention based on user behavior
2. **Voice Commands** - Accessibility for error recovery
3. **Analytics Integration** - Error tracking and learning
4. **Cross-device Testing** - iOS/Android compatibility

---

## Success Metrics

### **Error Recovery Metrics:**
- **Recovery Success Rate:** 90%+ users successfully resolve errors
- **Time to Recovery:** <30 seconds average error resolution
- **Error Recurrence:** <5% same error repeated by user
- **User Satisfaction:** 4.2+ stars for error handling experience

### **Prevention Metrics:**
- **Error Reduction:** 40% reduction in user-facing errors
- **Proactive Guidance Effectiveness:** 75% error prevention success
- **User Education:** 85% users learn from error experiences
- **Support Ticket Reduction:** 60% fewer error-related support requests

---

## Conclusion

Mobile error handling requires a fundamentally different approach from desktop applications. Users need immediate, clear guidance with minimal context switching. The patterns defined here prioritize prevention, provide clear recovery paths, and learn from user behavior to continuously improve the experience.

### **Key Innovations:**
1. **Prevention-First Approach** - Stop errors before they happen
2. **Context-Aware Recovery** - Tailored solutions based on user situation
3. **Progressive Assistance** - Escalating help based on error patterns
4. **Accessibility Integration** - Voice commands and screen reader support

**Ready for immediate implementation with comprehensive error prevention and recovery system.**

---

*End of Mobile Error Handling Patterns*