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
  webappId?: string;
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
  image: string;
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