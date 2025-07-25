import { Effect, Post, User, UserProfile, Comment } from '../types';

export const mockUsers: User[] = [
  {
    id: '1',
    username: 'ai_artist_pro',
    avatar: 'https://images.pexels.com/photos/1264210/pexels-photo-1264210.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
    bio: 'Professional AI artist specializing in portrait enhancement',
    followersCount: 15420,
    followingCount: 892,
    isFollowing: false,
    isPrivate: false,
  },
  {
    id: '2',
    username: 'creative_soul',
    avatar: 'https://images.pexels.com/photos/1858175/pexels-photo-1858175.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
    bio: 'Digital artist and ComfyUI enthusiast',
    followersCount: 8760,
    followingCount: 445,
    isFollowing: true,
    isPrivate: true,
  },
  {
    id: '3',
    username: 'tech_wizard',
    avatar: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
    bio: 'AI workflow developer and researcher',
    followersCount: 22100,
    followingCount: 156,
    isFollowing: false,
    isPrivate: false,
  },
];

export const mockEffects: Effect[] = [
  {
    id: '1',
    name: 'Cyberpunk Portrait',
    description: 'Transform your photos into stunning cyberpunk-style portraits with neon lighting and futuristic elements.',
    author: mockUsers[0],
    category: 'Portrait',
    tags: ['cyberpunk', 'neon', 'futuristic', 'portrait'],
    beforeImage: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=400',
    afterImage: 'https://images.pexels.com/photos/2182863/pexels-photo-2182863.jpeg?auto=compress&cs=tinysrgb&w=400',
    likesCount: 1240,
    isLiked: false,
    isBookmarked: false,
    createdAt: '2024-01-15',
    difficulty: 'Medium',
    processingTime: '2-3 minutes',
    comments: [
      {
        id: 'c1',
        user: mockUsers[1],
        content: 'This effect is absolutely stunning! The neon colors are perfect.',
        createdAt: '2024-01-16T10:30:00Z',
        likesCount: 12,
        isLiked: false,
        replies: [],
      },
      {
        id: 'c2',
        user: mockUsers[2],
        content: 'Great work! Could you share the workflow file?',
        createdAt: '2024-01-16T09:15:00Z',
        likesCount: 8,
        isLiked: true,
        replies: [],
      },
    ],
    parameters: [
      {
        name: 'Neon Intensity',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 75,
        description: 'Controls the intensity of neon lighting effects'
      },
      {
        name: 'Color Scheme',
        type: 'select',
        options: ['Blue/Pink', 'Green/Purple', 'Orange/Cyan', 'Random'],
        default: 'Blue/Pink',
        description: 'Choose the dominant color palette'
      },
      {
        name: 'Style Prompt',
        type: 'text',
        default: 'cyberpunk portrait, neon lights, futuristic',
        description: 'Additional style description'
      }
    ],
  },
  {
    id: '2',
    name: 'Anime Style Converter',
    description: 'Convert realistic photos into beautiful anime-style illustrations with vibrant colors and soft details.',
    author: mockUsers[1],
    category: 'Artistic',
    tags: ['anime', 'illustration', 'colorful', 'soft'],
    beforeImage: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400',
    afterImage: 'https://images.pexels.com/photos/1858175/pexels-photo-1858175.jpeg?auto=compress&cs=tinysrgb&w=400',
    likesCount: 2156,
    isLiked: true,
    isBookmarked: true,
    createdAt: '2024-01-12',
    difficulty: 'Easy',
    processingTime: '1-2 minutes',
    parameters: [
      {
        name: 'Anime Strength',
        type: 'slider',
        min: 0,
        max: 100,
        step: 5,
        default: 80,
        description: 'How much anime style to apply'
      },
      {
        name: 'Eye Enhancement',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 90,
        description: 'Enhance eye details in anime style'
      }
    ],
  },
  {
    id: '3',
    name: 'Vintage Film Look',
    description: 'Add authentic vintage film aesthetics with grain, color grading, and classic photography vibes.',
    author: mockUsers[2],
    category: 'Photography',
    tags: ['vintage', 'film', 'retro', 'grain'],
    beforeImage: 'https://images.pexels.com/photos/1674752/pexels-photo-1674752.jpeg?auto=compress&cs=tinysrgb&w=400',
    afterImage: 'https://images.pexels.com/photos/1308881/pexels-photo-1308881.jpeg?auto=compress&cs=tinysrgb&w=400',
    likesCount: 892,
    isLiked: false,
    isBookmarked: false,
    createdAt: '2024-01-10',
    difficulty: 'Hard',
    processingTime: '3-5 minutes',
    parameters: [
      {
        name: 'Film Type',
        type: 'select',
        options: ['Kodak Portra', 'Fuji Velvia', 'Ilford HP5', 'Polaroid'],
        default: 'Kodak Portra',
        description: 'Choose film emulation type'
      },
      {
        name: 'Grain Amount',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 45,
        description: 'Amount of film grain to add'
      },
      {
        name: 'Color Temperature',
        type: 'slider',
        min: -50,
        max: 50,
        step: 1,
        default: 10,
        description: 'Adjust color temperature (warm/cool)'
      }
    ],
  },
  {
    id: '4',
    name: 'Oil Painting Style',
    description: 'Transform photos into classical oil painting masterpieces with rich textures and artistic brushstrokes.',
    author: mockUsers[0],
    category: 'Artistic',
    tags: ['oil painting', 'classical', 'artistic', 'texture'],
    beforeImage: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=400',
    afterImage: 'https://images.pexels.com/photos/1212984/pexels-photo-1212984.jpeg?auto=compress&cs=tinysrgb&w=400',
    likesCount: 1456,
    isLiked: true,
    isBookmarked: false,
    createdAt: '2024-01-08',
    difficulty: 'Medium',
    processingTime: '2-4 minutes',
    parameters: [
      {
        name: 'Brush Size',
        type: 'slider',
        min: 1,
        max: 20,
        step: 1,
        default: 8,
        description: 'Size of paint brush strokes'
      },
      {
        name: 'Texture Intensity',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 70,
        description: 'Intensity of canvas texture'
      }
    ],
  },
  {
    id: '5',
    name: 'HDR Enhancement',
    description: 'Enhance dynamic range and create stunning HDR effects with balanced exposure and vivid details.',
    author: mockUsers[1],
    category: 'Photography',
    tags: ['hdr', 'enhancement', 'dynamic range', 'vivid'],
    beforeImage: 'https://images.pexels.com/photos/1366919/pexels-photo-1366919.jpeg?auto=compress&cs=tinysrgb&w=400',
    afterImage: 'https://images.pexels.com/photos/1266808/pexels-photo-1266808.jpeg?auto=compress&cs=tinysrgb&w=400',
    likesCount: 723,
    isLiked: false,
    isBookmarked: true,
    createdAt: '2024-01-05',
    difficulty: 'Easy',
    processingTime: '1-2 minutes',
    parameters: [
      {
        name: 'HDR Strength',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 60,
        description: 'Intensity of HDR effect'
      },
      {
        name: 'Shadow Recovery',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 50,
        description: 'Recover details in shadows'
      }
    ],
  },
  {
    id: '6',
    name: 'Fantasy Portrait',
    description: 'Create magical fantasy portraits with ethereal lighting, mystical elements, and enchanting atmospheres.',
    author: mockUsers[2],
    category: 'Fantasy',
    tags: ['fantasy', 'magical', 'ethereal', 'mystical'],
    beforeImage: 'https://images.pexels.com/photos/1264210/pexels-photo-1264210.jpeg?auto=compress&cs=tinysrgb&w=400',
    afterImage: 'https://images.pexels.com/photos/3680219/pexels-photo-3680219.jpeg?auto=compress&cs=tinysrgb&w=400',
    likesCount: 1890,
    isLiked: false,
    isBookmarked: false,
    createdAt: '2024-01-03',
    difficulty: 'Hard',
    processingTime: '3-6 minutes',
    parameters: [
      {
        name: 'Magic Elements',
        type: 'select',
        options: ['Sparkles', 'Fire', 'Ice', 'Nature', 'Cosmic'],
        default: 'Sparkles',
        description: 'Type of magical elements to add'
      },
      {
        name: 'Atmosphere Intensity',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 75,
        description: 'Intensity of magical atmosphere'
      }
    ],
  },
  {
    id: '7',
    name: 'Black & White Classic',
    description: 'Convert your photos to timeless black and white with enhanced contrast and dramatic lighting.',
    author: mockUsers[1],
    category: 'Photography',
    tags: ['black and white', 'classic', 'contrast', 'dramatic'],
    beforeImage: 'https://images.pexels.com/photos/1563356/pexels-photo-1563356.jpeg?auto=compress&cs=tinysrgb&w=400',
    afterImage: 'https://images.pexels.com/photos/1308881/pexels-photo-1308881.jpeg?auto=compress&cs=tinysrgb&w=400',
    likesCount: 1120,
    isLiked: false,
    isBookmarked: false,
    createdAt: '2024-01-02',
    difficulty: 'Easy',
    processingTime: '30 seconds',
    parameters: [
      {
        name: 'Contrast Level',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 70,
        description: 'Adjust the contrast intensity'
      },
      {
        name: 'Film Grain',
        type: 'slider',
        min: 0,
        max: 50,
        step: 1,
        default: 15,
        description: 'Add vintage film grain effect'
      }
    ],
  },
  {
    id: '8',
    name: 'Watercolor Art',
    description: 'Transform your photos into beautiful watercolor paintings with soft edges and flowing colors.',
    author: mockUsers[0],
    category: 'Artistic',
    tags: ['watercolor', 'painting', 'soft', 'artistic'],
    beforeImage: 'https://images.pexels.com/photos/1212984/pexels-photo-1212984.jpeg?auto=compress&cs=tinysrgb&w=400',
    afterImage: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=400',
    likesCount: 987,
    isLiked: true,
    isBookmarked: false,
    createdAt: '2024-01-01',
    difficulty: 'Medium',
    processingTime: '2-3 minutes',
    parameters: [
      {
        name: 'Paint Flow',
        type: 'slider',
        min: 0,
        max: 100,
        step: 5,
        default: 60,
        description: 'Control the watercolor flow effect'
      },
      {
        name: 'Color Saturation',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 80,
        description: 'Adjust color vibrancy'
      }
    ],
  },
  {
    id: '9',
    name: 'Neon Glow Effect',
    description: 'Add vibrant neon glow effects to your images with customizable colors and intensity.',
    author: mockUsers[2],
    category: 'Modern',
    tags: ['neon', 'glow', 'vibrant', 'modern'],
    beforeImage: 'https://images.pexels.com/photos/1674752/pexels-photo-1674752.jpeg?auto=compress&cs=tinysrgb&w=400',
    afterImage: 'https://images.pexels.com/photos/2182863/pexels-photo-2182863.jpeg?auto=compress&cs=tinysrgb&w=400',
    likesCount: 1567,
    isLiked: false,
    isBookmarked: true,
    createdAt: '2023-12-30',
    difficulty: 'Hard',
    processingTime: '3-4 minutes',
    parameters: [
      {
        name: 'Glow Intensity',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 85,
        description: 'Control the neon glow strength'
      },
      {
        name: 'Neon Color',
        type: 'select',
        options: ['Electric Blue', 'Hot Pink', 'Lime Green', 'Purple', 'Orange'],
        default: 'Electric Blue',
        description: 'Choose the neon color theme'
      }
    ],
  },
  {
    id: '10',
    name: 'Retro 80s Style',
    description: 'Give your photos a nostalgic 80s aesthetic with synthwave colors and retro vibes.',
    author: mockUsers[1],
    category: 'Vintage',
    tags: ['80s', 'retro', 'synthwave', 'nostalgic'],
    beforeImage: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400',
    afterImage: 'https://images.pexels.com/photos/1366919/pexels-photo-1366919.jpeg?auto=compress&cs=tinysrgb&w=400',
    likesCount: 834,
    isLiked: false,
    isBookmarked: false,
    createdAt: '2023-12-28',
    difficulty: 'Medium',
    processingTime: '2-3 minutes',
    parameters: [
      {
        name: 'Synthwave Intensity',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 75,
        description: 'Control the 80s aesthetic strength'
      },
      {
        name: 'Color Palette',
        type: 'select',
        options: ['Classic Pink/Blue', 'Purple/Orange', 'Teal/Magenta'],
        default: 'Classic Pink/Blue',
        description: 'Choose the retro color scheme'
      }
    ],
  },
  {
    id: '11',
    name: 'Sketch to Reality',
    description: 'Transform simple sketches into photorealistic images with AI-powered enhancement.',
    author: mockUsers[0],
    category: 'Modern',
    tags: ['sketch', 'realistic', 'enhancement', 'ai'],
    beforeImage: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=400',
    afterImage: 'https://images.pexels.com/photos/1563356/pexels-photo-1563356.jpeg?auto=compress&cs=tinysrgb&w=400',
    likesCount: 2234,
    isLiked: true,
    isBookmarked: true,
    createdAt: '2023-12-25',
    difficulty: 'Hard',
    processingTime: '4-6 minutes',
    parameters: [
      {
        name: 'Realism Level',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 90,
        description: 'How realistic the final image should be'
      },
      {
        name: 'Detail Enhancement',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 80,
        description: 'Level of detail to add'
      }
    ],
  },
  {
    id: '12',
    name: 'Double Exposure',
    description: 'Create stunning double exposure effects by blending two images with artistic transparency.',
    author: mockUsers[2],
    category: 'Artistic',
    tags: ['double exposure', 'blend', 'artistic', 'creative'],
    beforeImage: 'https://images.pexels.com/photos/1858175/pexels-photo-1858175.jpeg?auto=compress&cs=tinysrgb&w=400',
    afterImage: 'https://images.pexels.com/photos/1212984/pexels-photo-1212984.jpeg?auto=compress&cs=tinysrgb&w=400',
    likesCount: 1345,
    isLiked: false,
    isBookmarked: false,
    createdAt: '2023-12-22',
    difficulty: 'Medium',
    processingTime: '2-3 minutes',
    parameters: [
      {
        name: 'Blend Opacity',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 65,
        description: 'Control the transparency blend'
      },
      {
        name: 'Blend Mode',
        type: 'select',
        options: ['Screen', 'Multiply', 'Overlay', 'Soft Light'],
        default: 'Screen',
        description: 'Choose the blending technique'
      }
    ],
  },
  {
    id: '13',
    name: 'Pop Art Style',
    description: 'Transform your photos into vibrant pop art with bold colors and comic book aesthetics.',
    author: mockUsers[1],
    category: 'Artistic',
    tags: ['pop art', 'comic', 'bold', 'vibrant'],
    beforeImage: 'https://images.pexels.com/photos/1264210/pexels-photo-1264210.jpeg?auto=compress&cs=tinysrgb&w=400',
    afterImage: 'https://images.pexels.com/photos/3680219/pexels-photo-3680219.jpeg?auto=compress&cs=tinysrgb&w=400',
    likesCount: 1678,
    isLiked: true,
    isBookmarked: false,
    createdAt: '2023-12-20',
    difficulty: 'Easy',
    processingTime: '1-2 minutes',
    parameters: [
      {
        name: 'Color Intensity',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 85,
        description: 'Control the boldness of colors'
      },
      {
        name: 'Halftone Effect',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 40,
        description: 'Add comic book dot pattern'
      }
    ],
  },
  {
    id: '14',
    name: 'Dreamy Soft Focus',
    description: 'Create ethereal, dreamy portraits with soft focus and romantic lighting effects.',
    author: mockUsers[0],
    category: 'Portrait',
    tags: ['dreamy', 'soft focus', 'romantic', 'ethereal'],
    beforeImage: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=400',
    afterImage: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400',
    likesCount: 923,
    isLiked: false,
    isBookmarked: true,
    createdAt: '2023-12-18',
    difficulty: 'Easy',
    processingTime: '1-2 minutes',
    parameters: [
      {
        name: 'Softness Level',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 70,
        description: 'Control the soft focus intensity'
      },
      {
        name: 'Glow Amount',
        type: 'slider',
        min: 0,
        max: 100,
        step: 1,
        default: 50,
        description: 'Add dreamy glow effect'
      }
    ],
  },
  {
    id: '15',
    name: 'Cinematic Color Grade',
    description: 'Apply professional cinematic color grading to give your photos a movie-like quality.',
    author: mockUsers[2],
    category: 'Photography',
    tags: ['cinematic', 'color grade', 'movie', 'professional'],
    beforeImage: 'https://images.pexels.com/photos/1366919/pexels-photo-1366919.jpeg?auto=compress&cs=tinysrgb&w=400',
    afterImage: 'https://images.pexels.com/photos/1674752/pexels-photo-1674752.jpeg?auto=compress&cs=tinysrgb&w=400',
    likesCount: 1789,
    isLiked: false,
    isBookmarked: false,
    createdAt: '2023-12-15',
    difficulty: 'Medium',
    processingTime: '2-3 minutes',
    parameters: [
      {
        name: 'Color Temperature',
        type: 'slider',
        min: -100,
        max: 100,
        step: 1,
        default: -20,
        description: 'Adjust warm/cool tones'
      },
      {
        name: 'Film Look',
        type: 'select',
        options: ['Blockbuster', 'Indie Film', 'Noir', 'Sci-Fi'],
        default: 'Blockbuster',
        description: 'Choose cinematic style'
      }
    ],
  },
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
    parameters: [
      {
        name: 'image',
        type: 'image',
        default: '',
        description: '上传需要处理的图片'
      },
      {
        name: 'prompt',
        type: 'text',
        default: 'Transform this image with beautiful artistic enhancements',
        description: 'Describe how you want the AI to transform your image'
      }
    ],
    nodeInfoTemplate: [
      { nodeId: '39', fieldName: 'image', paramKey: 'image' },
      { nodeId: '37', fieldName: 'model', paramKey: 'model' },
      { nodeId: '37', fieldName: 'aspect_ratio', paramKey: 'aspect_ratio' },
      { nodeId: '52', fieldName: 'prompt', paramKey: 'prompt' }
    ]
  },
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
  };
}