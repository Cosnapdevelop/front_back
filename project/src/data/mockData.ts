import { User, UserProfile, Effect, Comment, Post, Notification } from '../types';

export const mockUsers: (User & UserProfile)[] = [
  {
    id: '1',
    username: 'alex_designer',
    email: 'alex@example.com',
    avatar: 'https://images.pexels.com/photos/1674752/pexels-photo-1674752.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
    bio: 'Digital artist and UI/UX designer passionate about creating stunning visuals',
    joinDate: '2021-03-15',
    effectsCreated: 24,
    totalLikes: 15600,
    recentHistory: [],
    bookmarkedEffects: [],
    preferences: {
      theme: 'dark',
      notifications: true,
      privacy: 'public'
    },
    followersCount: 15600,
    followingCount: 892,
    isFollowing: false,
    isPrivate: false
  },
  {
    id: '2',
    username: 'sarah_ai',
    email: 'sarah@example.com',
    avatar: 'https://images.pexels.com/photos/762020/pexels-photo-762020.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
    bio: 'AI researcher and computer vision specialist',
    joinDate: '2020-11-08',
    effectsCreated: 8,
    totalLikes: 8760,
    recentHistory: [],
    bookmarkedEffects: [],
    preferences: {
      theme: 'dark',
      notifications: false,
      privacy: 'private'
    },
    followersCount: 8760,
    followingCount: 445,
    isFollowing: true,
    isPrivate: true
  },
  {
    id: '3',
    username: 'tech_wizard',
    email: 'tech_wizard@example.com',
    avatar: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
    bio: 'AI workflow developer and researcher',
    joinDate: '2021-08-20',
    effectsCreated: 20,
    totalLikes: 22100,
    recentHistory: [],
    bookmarkedEffects: [],
    preferences: {
      theme: 'light',
      notifications: true,
      privacy: 'public'
    },
    followersCount: 22100,
    followingCount: 156,
    isFollowing: false,
    isPrivate: false
  }
];

export const mockEffects: Effect[] = [
  // Cosnap换背景 - AI智能背景替换
  {
    id: 'cosnap-background-replace',
    name: 'Cosnap换背景 - AI智能背景替换',
    description: 'AI驱动的智能背景替换技术，支持自定义提示词生成背景，使用FLUX Kontext模型实现高质量换背景效果。',
    author: mockUsers[0],
    category: 'Ecommerce',
    tags: ['background', 'replace', 'AI', 'flux', 'cosnap', 'kontext'],
    beforeImage: 'https://images.pexels.com/photos/1308881/pexels-photo-1308881.jpeg?auto=compress&cs=tinysrgb&w=400',
    afterImage: 'https://images.pexels.com/photos/3680219/pexels-photo-3680219.jpeg?auto=compress&cs=tinysrgb&w=400',
    likesCount: 1247,
    isLiked: false,
    isBookmarked: false,
    createdAt: '2024-04-01',
    difficulty: 'Easy',
    processingTime: '2-3 minutes',
    workflowId: '1949831786093264897', // 真实的Cosnap换背景工作流ID
    isTrending: true,
    parameters: [
      { name: 'image_240', type: 'image', description: '上传原始图片（要换背景的主体图片）' },
      { name: 'image_284', type: 'image', description: '上传背景参考图（想要的背景风格参考）' },
      { name: 'prompt_279', type: 'text', default: 'describe the style of the image and atmosphere of the image in two sentence. start your answer with Change the background to', description: 'LLM提示词指令（如何描述背景变换）' }
    ],
    nodeInfoTemplate: [
      { nodeId: '240', fieldName: 'image', paramKey: 'image_240' },
      { nodeId: '284', fieldName: 'image', paramKey: 'image_284' },
      { nodeId: '279', fieldName: 'prompt', paramKey: 'prompt_279' }
    ]
  },
  // Cosnap强控制力改 - Plus工作流版本
  {
    id: 'cosnap-strong-control-plus',
    name: 'Cosnap强控制力改 - Plus工作流',
    description: 'Plus级强控制力背景替换工作流，支持更精细的控制和高质量的背景替换效果，适用于专业级图像处理需求。',
    author: mockUsers[0],
    category: 'Ecommerce',
    tags: ['background', 'replace', 'AI', 'flux', 'cosnap', 'plus', 'professional'],
    beforeImage: 'https://images.pexels.com/photos/1308881/pexels-photo-1308881.jpeg?auto=compress&cs=tinysrgb&w=400',
    afterImage: 'https://images.pexels.com/photos/3680219/pexels-photo-3680219.jpeg?auto=compress&cs=tinysrgb&w=400',
    likesCount: 892,
    isLiked: false,
    isBookmarked: false,
    createdAt: '2024-04-15',
    difficulty: 'Advanced',
    processingTime: '3-5 minutes',
    workflowId: '1950585019234455554', // Plus工作流ID
    isPlusWorkflow: true, // 标记为Plus工作流
    isTrending: false,
    parameters: [
      { name: 'image_24', type: 'image', description: '上传主体图片（要处理的原始图片）' },
      { name: 'image_62', type: 'image', description: '上传背景参考图（目标背景风格图片）' },
      { name: 'prompt_327', type: 'text', default: 'describe the image Including "atmosphere, mood & tone and lighting". Write the description as if this is a background for a professional cosplay photo background with after effect. describe in a effective way,keep it short', description: 'LLM提示词（描述期望的背景氛围和效果）' }
    ],
    nodeInfoTemplate: [
      { nodeId: '24', fieldName: 'image', paramKey: 'image_24' },
      { nodeId: '62', fieldName: 'image', paramKey: 'image_62' },
      { nodeId: '327', fieldName: 'prompt', paramKey: 'prompt_327' }
    ]
  }
];

export const mockComments: Comment[] = [
  {
    id: '1',
    user: mockUsers[1],
    content: 'This effect is amazing! The detail enhancement is incredible.',
    createdAt: '2024-03-15T14:30:00Z',
    likesCount: 12,
    isLiked: false,
    replies: []
  },
  {
    id: '2',
    user: mockUsers[2],
    content: 'Perfect for my e-commerce product photos. Love the background replacement quality!',
    createdAt: '2024-03-14T09:15:00Z',
    likesCount: 8,
    isLiked: true,
    replies: []
  }
];

export const mockPosts: Post[] = [
  {
    id: '1',
    user: mockUsers[0],
    effect: mockEffects[0],
    caption: 'Just tried the new Cosnap background replacement effect - the results are amazing! Perfect for product photography.',
    images: [
      'https://images.pexels.com/photos/1308881/pexels-photo-1308881.jpeg?auto=compress&cs=tinysrgb&w=400',
      'https://images.pexels.com/photos/3680219/pexels-photo-3680219.jpeg?auto=compress&cs=tinysrgb&w=400'
    ],
    likesCount: 245,
    isLiked: false,
    isBookmarked: false,
    commentsCount: 18,
    comments: [],
    createdAt: '2024-03-20T12:00:00Z'
  }
];

export const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'like',
    title: 'New Like',
    message: 'alex_designer liked your post',
    user: mockUsers[0],
    createdAt: '2024-03-20T10:30:00Z',
    read: false
  }
];

export function createMockUser(): UserProfile {
  return {
    id: Date.now().toString(),
    username: 'new_user',
    email: 'user@example.com',
    avatar: 'https://images.pexels.com/photos/1674752/pexels-photo-1674752.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
    bio: 'Passionate about AI art and digital creativity',
    joinDate: '2024-01-01',
    effectsCreated: 5,
    totalLikes: 1250,
    recentHistory: [],
    bookmarkedEffects: [],
    preferences: {
      theme: 'light',
      notifications: true,
      privacy: 'public',
    },
    followersCount: 1250,
    followingCount: 50,
    isFollowing: false,
    isPrivate: false
  };
}