// Language and messaging constants for Cosnap AI
// Centralized strings to ensure consistency across the application

export const APP_STRINGS = {
  // App branding
  APP_NAME: 'Cosnap AI',
  APP_TAGLINE: 'Transform Your Images with AI Magic',
  
  // Navigation
  NAV: {
    HOME: 'Home',
    EFFECTS: 'Effects',
    COMMUNITY: 'Community',
    PROFILE: 'Profile',
    IMAGE_LIBRARY: 'My Images',
    SEARCH: 'Search effects...',
  },

  // Authentication
  AUTH: {
    LOGIN: 'Sign In',
    REGISTER: 'Sign Up',
    LOGOUT: 'Sign Out',
    EMAIL_LABEL: 'Email',
    USERNAME_LABEL: 'Username',
    PASSWORD_LABEL: 'Password',
    EMAIL_PLACEHOLDER: 'Enter your email',
    USERNAME_PLACEHOLDER: 'Choose a username',
    PASSWORD_PLACEHOLDER: 'Enter your password',
    LOGIN_BUTTON: 'Sign In',
    REGISTER_BUTTON: 'Create Account',
    LOGIN_SUCCESS: 'Welcome back!',
    REGISTER_SUCCESS: 'Account created successfully!',
    LOGIN_ERROR: 'Invalid email or password. Please try again.',
    REGISTER_ERROR: 'Registration failed. Please try a different email or username.',
    LOADING_LOGIN: 'Signing in...',
    LOADING_REGISTER: 'Creating account...',
    NO_ACCOUNT: "Don't have an account?",
    HAVE_ACCOUNT: 'Already have an account?',
    LOGIN_REQUIRED: 'Please sign in to use AI effects',
    LOGIN_REQUIRED_ACTION: 'Sign In to Continue',
  },

  // Effects
  EFFECTS: {
    TITLE: 'AI Effects Gallery',
    SUBTITLE: 'Discover and apply amazing AI effects to transform your images',
    TRENDING: 'Trending Effects',
    TRENDING_BADGE: 'HOT',
    TRENDING_SUBTITLE: 'Popular right now',
    RECENT: 'Recently Viewed',
    CATEGORIES: 'Categories',
    TRY_NOW: 'Try Now',
    APPLY_EFFECT: 'Apply Effect',
    EXPLORE_ALL: 'Explore All',
    VIEW_ALL: 'View All',
    NO_EFFECTS_FOUND: 'No effects found',
    NO_EFFECTS_SUBTITLE: 'Try adjusting your search or filters',
    CLEAR_FILTERS: 'Clear Filters',
    RESULTS_COUNT: (count: number) => `${count} effect${count !== 1 ? 's' : ''} found`,
  },

  // Home page
  HOME: {
    HERO_CTA: 'Ready to Create Something Amazing?',
    HERO_SUBTITLE: 'Join our community of creators and start transforming your images with cutting-edge AI effects today.',
    CATEGORIES_TITLE: 'Popular Categories',
  },

  // Common actions
  ACTIONS: {
    SEARCH: 'Search',
    FILTER: 'Filter',
    FILTERS: 'Filters',
    SORT_BY: 'Sort By',
    CLEAR_ALL: 'Clear All',
    REFRESH: 'Refresh',
    RETRY: 'Try Again',
    CANCEL: 'Cancel',
    SAVE: 'Save',
    DELETE: 'Delete',
    EDIT: 'Edit',
    SHARE: 'Share',
    DOWNLOAD: 'Download',
    UPLOAD: 'Upload',
    UPLOAD_IMAGE: 'Upload Image',
    SELECT_FILE: 'Select File',
    PROCESSING: 'Processing...',
    LOADING: 'Loading...',
    BACK_TO_HOME: 'Back to Home',
  },

  // Sorting options
  SORT: {
    POPULAR: 'Most Popular',
    NEWEST: 'Newest',
    NAME: 'Name A-Z',
    RATING: 'Highest Rated',
  },

  // Difficulty levels
  DIFFICULTY: {
    ALL: 'All Levels',
    EASY: 'Easy',
    MEDIUM: 'Medium',
    HARD: 'Advanced',
  },

  // Error messages
  ERRORS: {
    GENERIC: 'Something went wrong. Please try again.',
    NETWORK: 'Network error. Please check your connection.',
    NOT_FOUND: 'Content not found',
    UNAUTHORIZED: 'Please sign in to continue',
    UPLOAD_FAILED: 'Upload failed. Please try again.',
    UPLOAD_TOO_LARGE: 'File too large. Please select a smaller image.',
    INVALID_FILE_TYPE: 'Invalid file type. Please select an image file.',
    PROCESSING_FAILED: 'Processing failed. Please try again.',
    SESSION_EXPIRED: 'Session expired. Please sign in again.',
  },

  // Success messages
  SUCCESS: {
    UPLOAD_SUCCESS: 'Image uploaded successfully!',
    PROCESSING_COMPLETE: 'Effect applied successfully!',
    SAVE_SUCCESS: 'Saved successfully!',
    COPY_SUCCESS: 'Copied to clipboard!',
  },

  // Loading states
  LOADING: {
    UPLOADING: 'Uploading image...',
    PROCESSING: 'Applying AI effect...',
    SAVING: 'Saving...',
    LOADING_EFFECTS: 'Loading effects...',
    LOADING_IMAGES: 'Loading images...',
  },

  // Status indicators
  STATUS: {
    PENDING: 'Waiting',
    PROCESSING: 'Processing',
    COMPLETED: 'Completed',
    FAILED: 'Failed',
    CANCELLED: 'Cancelled',
  },

  // Image library
  IMAGE_LIBRARY: {
    TITLE: 'My Images',
    SUBTITLE: 'View and manage your uploaded images',
    EMPTY_STATE: 'No images yet',
    EMPTY_SUBTITLE: 'Upload your first image to get started',
    UPLOAD_FIRST: 'Upload Image',
  },

  // Community
  COMMUNITY: {
    TITLE: 'Community',
    SUBTITLE: 'Discover amazing creations from our community',
    SHARE_CREATION: 'Share Your Creation',
    LIKE: 'Like',
    COMMENT: 'Comment',
    COMMENTS: 'Comments',
  },

  // Profile
  PROFILE: {
    TITLE: 'Profile',
    MY_EFFECTS: 'My Effects',
    BOOKMARKS: 'Bookmarked Effects',
    SETTINGS: 'Settings',
    EDIT_PROFILE: 'Edit Profile',
  },

  // Onboarding
  ONBOARDING: {
    WELCOME_TITLE: 'Welcome to Cosnap AI!',
    WELCOME_SUBTITLE: 'Transform your images with powerful AI effects',
    STEP_1_TITLE: 'Discover Effects',
    STEP_1_DESC: 'Browse our collection of AI-powered image effects',
    STEP_2_TITLE: 'Upload & Transform',
    STEP_2_DESC: 'Upload your image and apply stunning effects instantly',
    STEP_3_TITLE: 'Share & Connect',
    STEP_3_DESC: 'Share your creations with the community',
    GET_STARTED: 'Get Started',
    SKIP_TOUR: 'Skip Tour',
    NEXT: 'Next',
    PREVIOUS: 'Previous',
    FINISH: 'Finish',
  },

  // File upload
  UPLOAD: {
    DRAG_DROP: 'Drag and drop your image here',
    OR: 'or',
    CLICK_TO_BROWSE: 'click to browse',
    SUPPORTED_FORMATS: 'Supported formats: JPG, PNG, GIF, WebP',
    MAX_SIZE: 'Maximum file size: 30MB',
    UPLOADING: 'Uploading...',
    UPLOAD_COMPLETE: 'Upload complete!',
  },

  // Regions
  REGIONS: {
    SELECTOR_TITLE: 'Select Region',
    CHINA: 'China',
    HONG_KONG: 'Hong Kong',
    DESCRIPTION_CHINA: 'Optimized for mainland China users',
    DESCRIPTION_HK: 'Optimized for international users',
  },
} as const;

// Type-safe string keys
export type AppStringKey = keyof typeof APP_STRINGS;

// Helper function to get nested strings safely
export function getString(path: string): string {
  const keys = path.split('.');
  let current: any = APP_STRINGS;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      console.warn(`String not found for path: ${path}`);
      return path; // Return the path as fallback
    }
  }
  
  return typeof current === 'string' ? current : path;
}

// Helper function for conditional strings
export function getConditionalString(condition: boolean, trueString: string, falseString: string): string {
  return condition ? trueString : falseString;
}