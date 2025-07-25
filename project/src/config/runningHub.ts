// RunningHub Configuration
// TODO: Replace with your actual API credentials

export const RUNNING_HUB_CONFIG = {
  // Replace with your actual API key from RunningHub
  apiKey: 'af36846844d94652bb84dc800815d1da',
  
  // Local backend API base URL
  baseUrl: 'http://localhost:3001',
  
  // AI App specific configuration
  webappId: 1937084629516193794,
  
  // Maximum file size (10MB)
  maxFileSize: 10 * 1024 * 1024,
  
  // Supported file types
  supportedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  
  // Maximum processing time (5 minutes)
  maxProcessingTime: 5 * 60 * 1000
};