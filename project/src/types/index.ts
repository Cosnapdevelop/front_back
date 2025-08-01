export interface User {
  id: string;
  username: string;
  avatar: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isPrivate?: boolean;
}

export interface Effect {
  id: string;
  name: string;
  description: string;
  author: UserProfile;
  category: string;
  tags: string[];
  beforeImage: string;
  afterImage: string;
  likesCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  createdAt: string;
  difficulty: string;
  processingTime: string;
  parameters: EffectParameter[];
  nodeInfoTemplate?: Array<{ nodeId: string; fieldName: string; paramKey: string }>;
  workflowId?: string; // ComfyUI workflow ID
  webappId?: string; // Webapp ID
  isTrending?: boolean;
  isPlusWorkflow?: boolean; // 标记是否为Plus工作流
  isWebapp?: boolean; // 标记是否为AI应用任务
  isHidden?: boolean; // 标记是否隐藏该效果
}

export interface EffectParameter {
  name: string;
  type: 'image' | 'select' | 'text' | 'slider';
  description?: string;
  default?: any; // image 类型可不填 default
  options?: Array<string | { value: string; label: string }>;
  min?: number;
  max?: number;
  step?: number;
}

export interface Comment {
  id: string;
  user: User;
  content: string;
  createdAt: string;
  likesCount: number;
  isLiked: boolean;
  replies?: Comment[];
}

export interface Post {
  id: string;
  user: User;
  effect: Effect;
  images?: string[]; // 改为支持多张图片
  image?: string; // 保留旧字段以支持向后兼容
  caption: string;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  createdAt: string;
  comments: Comment[];
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar: string;
  bio: string;
  joinDate: string;
  effectsCreated: number;
  totalLikes: number;
  recentHistory: Effect[];
  bookmarkedEffects: Effect[];
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
    privacy: 'public' | 'private';
  };
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  isPrivate?: boolean;
}

export interface Notification {
  id: string;
  type: 'like' | 'reply' | 'follow' | 'effect_shared';
  title: string;
  message: string;
  user: User;
  targetId?: string; // ID of the post, effect, or comment
  createdAt: string;
  read: boolean;
  actionUrl?: string; // URL to navigate when notification is clicked
}

export interface GeneratedImage {
  id: string;
  url: string;
  effectId: string;
  effectName: string;
  createdAt: string;
  parameters: Record<string, any>;
  originalImageName?: string;
  processedImageName?: string;
}