import { Effect, Post, User, UserProfile, Comment } from '../types';

export const mockUsers: (User & UserProfile)[] = [
  {
    id: '1',
    username: 'ai_artist_pro',
    email: 'ai_artist_pro@example.com',
    avatar: 'https://images.pexels.com/photos/1264210/pexels-photo-1264210.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
    bio: 'Professional AI artist specializing in portrait enhancement',
    joinDate: '2023-01-01',
    effectsCreated: 12,
    totalLikes: 15420,
    recentHistory: [],
    bookmarkedEffects: [],
    preferences: {
      theme: 'light',
      notifications: true,
      privacy: 'public'
    },
    followersCount: 15420,
    followingCount: 892,
    isFollowing: false,
    isPrivate: false
  },
  {
    id: '2',
    username: 'creative_soul',
    email: 'creative_soul@example.com',
    avatar: 'https://images.pexels.com/photos/1858175/pexels-photo-1858175.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
    bio: 'Digital artist and ComfyUI enthusiast',
    joinDate: '2022-11-15',
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
  // Ultimate upscale final v.1
  {
    id: 'ultimate-upscale-final-v1',
    name: 'Ultimate upscale final v.1',
    description: '高质量终极放大，适合图片细节增强。',
    author: mockUsers[0],
    category: 'Upscale',
    tags: ['upscale', 'ultimate', 'final'],
    beforeImage: '',
    afterImage: '',
    likesCount: 0,
    isLiked: false,
    isBookmarked: false,
    createdAt: '2024-04-01',
    difficulty: 'Easy',
    processingTime: '1-2 minutes',
    webappId: '1907581130097192962',
    parameters: [
      { name: 'image', type: 'image', description: '上传需要放大的图片' },
      { name: 'value_161', type: 'slider', default: 1, min: 0, max: 2, step: 0.01, description: '参数 value (nodeId:161)' },
      { name: 'value_160', type: 'slider', default: 0.25, min: 0, max: 1, step: 0.01, description: '参数 value (nodeId:160)' }
    ],
    nodeInfoTemplate: [
      { nodeId: '2', fieldName: 'image', paramKey: 'image' },
      { nodeId: '161', fieldName: 'value', paramKey: 'value_161' },
      { nodeId: '160', fieldName: 'value', paramKey: 'value_160' }
    ]
  },
  // 超强换脸
  {
    id: 'super-face-swap',
    name: '超强换脸',
    description: 'AI驱动的超强换脸，支持双图输入。',
    author: mockUsers[1],
    category: 'FaceSwap',
    tags: ['face', 'swap', 'AI'],
    beforeImage: '',
    afterImage: '',
    likesCount: 0,
    isLiked: false,
    isBookmarked: false,
    createdAt: '2024-04-01',
    difficulty: 'Easy',
    processingTime: '1-2 minutes',
    webappId: '1907365560131153921',
    parameters: [
      { name: 'image_43', type: 'image', description: '上传底图（nodeId:43）' },
      { name: 'image_69', type: 'image', description: '上传换脸图（nodeId:69）' }
    ],
    nodeInfoTemplate: [
      { nodeId: '43', fieldName: 'image', paramKey: 'image_43' },
      { nodeId: '69', fieldName: 'image', paramKey: 'image_69' }
    ]
  },
  // kontext nunchaku Dev 双图编辑极速版
  {
    id: 'kontext-nunchaku-dev-dual',
    name: 'kontext nunchaku Dev 双图编辑极速版',
    description: 'AI双图编辑，极速体验，支持文本指令。',
    author: mockUsers[2],
    category: 'Edit',
    tags: ['kontext', 'nunchaku', 'dual', 'edit'],
    beforeImage: '',
    afterImage: '',
    likesCount: 0,
    isLiked: false,
    isBookmarked: false,
    createdAt: '2024-04-01',
    difficulty: 'Easy',
    processingTime: '1-2 minutes',
    webappId: '1939674572449091585',
    parameters: [
      { name: 'image_258', type: 'image', description: '上传左图（nodeId:258）' },
      { name: 'image_260', type: 'image', description: '上传右图（nodeId:260）' },
      { name: 'text_320', type: 'text', default: '', description: '编辑指令（nodeId:320）' }
    ],
    nodeInfoTemplate: [
      { nodeId: '258', fieldName: 'image', paramKey: 'image_258' },
      { nodeId: '260', fieldName: 'image', paramKey: 'image_260' },
      { nodeId: '320', fieldName: 'text', paramKey: 'text_320' }
    ]
  },
  // kontext nunchaku Dev 双图编辑极速版- LLM提示词智能扩写-StarAI
  {
    id: 'kontext-nunchaku-dev-dual-llm',
    name: 'kontext nunchaku Dev 双图编辑极速版- LLM提示词智能扩写-StarAI',
    description: 'AI双图编辑，支持LLM智能扩写提示词，极速体验。',
    author: mockUsers[2],
    category: 'Edit',
    tags: ['kontext', 'nunchaku', 'dual', 'edit', 'llm', 'starai'],
    beforeImage: '',
    afterImage: '',
    likesCount: 0,
    isLiked: false,
    isBookmarked: false,
    createdAt: '2024-04-01',
    difficulty: 'Easy',
    processingTime: '1-2 minutes',
    webappId: '1939674572449091585',
    parameters: [
      { name: 'image_258', type: 'image', description: '上传左图（nodeId:258）' },
      { name: 'image_260', type: 'image', description: '上传右图（nodeId:260）' },
      { name: 'text_320', type: 'text', default: '将右边的项链戴在左边女人脖子上，保持人物细节不改变，氛围一致', description: 'LLM智能扩写提示词（nodeId:320）' }
    ],
    nodeInfoTemplate: [
      { nodeId: '258', fieldName: 'image', paramKey: 'image_258' },
      { nodeId: '260', fieldName: 'image', paramKey: 'image_260' },
      { nodeId: '320', fieldName: 'text', paramKey: 'text_320' }
    ]
  },
  // flux-kontext-test
  {
    id: 'flux-kontext-test',
    name: 'Flux Kontext Single Picture Mode',
    description: 'AI-powered image transformation using Flux Kontext Pro model. Perfect for testing RunningHub API integration with customizable prompts.',
    author: mockUsers[2],
    category: 'Modern',
    tags: ['flux', 'ai', 'transform', 'runninghub', 'test'],
    beforeImage: 'https://images.pexels.com/photos/1264210/pexels-photo-1264210.jpeg?auto=compress&cs=tinysrgb&w=400',
    afterImage: 'https://images.pexels.com/photos/1858175/pexels-photo-1858175.jpeg?auto=compress&cs=tinysrgb&w=400',
    likesCount: 156,
    isLiked: false,
    isBookmarked: false,
    createdAt: '2024-01-20',
    difficulty: 'Easy',
    processingTime: '1-3 minutes',
    webappId: '1937084629516193794',
    parameters: [
      { name: 'image', type: 'image', description: '上传需要处理的图片' },
      { name: 'model', type: 'select', default: 'flux-kontext-pro', description: '模型选择', options: [{ value: 'flux-kontext-pro', label: 'Flux Kontext Pro' }] },
      { name: 'aspect_ratio', type: 'select', default: 'match_input_image', description: '输出比例', options: [
        { value: 'match_input_image', label: '匹配上传图像比例' },
        { value: '1:1', label: '1:1 正方形，适配社交媒体图文' },
        { value: '16:9', label: '16:9 横版宽屏，主流视频平台' },
        { value: '9:16', label: '9:16 竖版长屏，短视频' },
        { value: '4:3', label: '4:3 传统比例，教育/老式屏幕' },
        { value: '3:4', label: '3:4 坚版摄影，人像摄影' },
        { value: '3:2', label: '3:2 胶片经典比例，人文风景' }
      ] },
      { name: 'prompt', type: 'text', default: '给这个女人的发型变成齐耳短发,', description: 'AI 提示词' }
    ],
    nodeInfoTemplate: [
      { nodeId: '39', fieldName: 'image', paramKey: 'image' },
      { nodeId: '37', fieldName: 'model', paramKey: 'model' },
      { nodeId: '37', fieldName: 'aspect_ratio', paramKey: 'aspect_ratio' },
      { nodeId: '52', fieldName: 'prompt', paramKey: 'prompt' }
    ]
  },
  // portrait-upscale-pro
  {
    id: 'portrait-upscale-pro',
    name: '顶级人像放大-支持全身（体验版）',
    description: 'AI驱动的人像全身高质量放大，适合照片修复和细节增强。',
    author: mockUsers[0],
    category: 'Portrait',
    tags: ['upscale', 'portrait', '全身', '高质量'],
    beforeImage: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=400',
    afterImage: 'https://images.pexels.com/photos/2182863/pexels-photo-2182863.jpeg?auto=compress&cs=tinysrgb&w=400',
    likesCount: 0,
    isLiked: false,
    isBookmarked: false,
    createdAt: '2024-04-01',
    difficulty: 'Easy',
    processingTime: '1-2 minutes',
    webappId: '1947926545896734722',
    parameters: [
      { name: 'image', type: 'image', description: '上传需要放大的人像图片' }
    ],
    nodeInfoTemplate: [
      { nodeId: '6011', fieldName: 'image', paramKey: 'image' }
    ]
  },
  // 换背景 | 电商实用版V5.0
  {
    id: 'bg-replace-ecommerce-v5',
    name: '换背景 | 电商实用版V5.0',
    description: '电商产品图换背景，支持多种比例和光源设置。',
    author: mockUsers[0],
    category: 'Ecommerce',
    tags: ['background', 'replace', 'ecommerce', 'product'],
    beforeImage: '',
    afterImage: '',
    likesCount: 0,
    isLiked: false,
    isBookmarked: false,
    createdAt: '2024-04-01',
    difficulty: 'Easy',
    processingTime: '1-2 minutes',
    webappId: '1903718280794906626',
    parameters: [
      { name: 'image_150', type: 'image', description: '上传产品原图（nodeId:150）' },
      { name: 'image_48', type: 'image', description: '上传背景图（nodeId:48）' },
      { name: 'text_114', type: 'text', default: '0--产品图原始比例\n1--1:1\n2--3:2\n3--4:3\n4--16:9\n5--2:3\n6--3:4\n7--9:16', description: '比例说明（nodeId:114）' },
      { name: 'value_165', type: 'slider', default: 0, min: 0, max: 7, step: 1, description: '选择输出比例（nodeId:165）' },
      { name: 'value_110', type: 'slider', default: 1, min: 0, max: 2, step: 0.01, description: '强度参数（nodeId:110）' },
      { name: 'light_position_173', type: 'select', default: 'Top Right Light', description: '光源位置（nodeId:173）', options: [
        { value: 'Top Right Light', label: '右上光源' },
        { value: 'Top Left Light', label: '左上光源' },
        { value: 'Bottom Right Light', label: '右下光源' },
        { value: 'Bottom Left Light', label: '左下光源' },
        { value: 'Center Light', label: '中央光源' }
      ] }
    ],
    nodeInfoTemplate: [
      { nodeId: '150', fieldName: 'image', paramKey: 'image_150' },
      { nodeId: '48', fieldName: 'image', paramKey: 'image_48' },
      { nodeId: '114', fieldName: 'text', paramKey: 'text_114' },
      { nodeId: '165', fieldName: 'value', paramKey: 'value_165' },
      { nodeId: '110', fieldName: 'value', paramKey: 'value_110' },
      { nodeId: '173', fieldName: 'light_position', paramKey: 'light_position_173' }
    ]
  }
];

export const mockComments: Comment[] = [
  {
    id: '1',
    user: mockUsers[1],
    content: 'This effect is absolutely stunning! The neon colors are perfect.',
    createdAt: '2024-01-16T10:30:00Z',
    likesCount: 12,
    isLiked: false,
    replies: [],
  },
  {
    id: '2',
    user: mockUsers[2],
    content: 'Great work! Could you share the workflow file?',
    createdAt: '2024-01-16T09:15:00Z',
    likesCount: 8,
    isLiked: true,
    replies: [],
  },
];

export const mockPosts: Post[] = [
  {
    id: '1',
    user: mockUsers[0],
    effect: mockEffects[0],
    image: 'https://images.pexels.com/photos/2182863/pexels-photo-2182863.jpeg?auto=compress&cs=tinysrgb&w=400',
    caption: 'Just tried the new Cyberpunk Portrait effect! The results are mind-blowing 🤩 #AI #ComfyUI #Cyberpunk',
    likesCount: 234,
    commentsCount: 18,
    isLiked: false,
    isBookmarked: true,
    createdAt: '2024-01-16T12:00:00Z',
    comments: mockComments,
  },
  {
    id: '2',
    user: mockUsers[1],
    effect: mockEffects[1],
    image: 'https://images.pexels.com/photos/3680219/pexels-photo-3680219.jpeg?auto=compress&cs=tinysrgb&w=400',
    caption: 'Anime style conversion never looked so good! Perfect for profile pictures ✨',
    likesCount: 567,
    commentsCount: 42,
    isLiked: true,
    isBookmarked: false,
    createdAt: '2024-01-15T18:30:00Z',
    comments: [],
  },
  {
    id: '3',
    user: mockUsers[2],
    effect: mockEffects[2],
    image: 'https://images.pexels.com/photos/1308881/pexels-photo-1308881.jpeg?auto=compress&cs=tinysrgb&w=400',
    caption: 'Loving the vintage film aesthetic! Takes me back to the analog photography days 📸',
    likesCount: 189,
    commentsCount: 15,
    isLiked: false,
    isBookmarked: false,
    createdAt: '2024-01-14T14:45:00Z',
    comments: [],
  },
];

export function createMockUser(): UserProfile {
  return {
    id: 'current-user',
    username: 'creative_user',
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