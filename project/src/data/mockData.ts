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
  // ⚠️ 重要：Cosnap换背景 - AI智能背景替换
  // 🎯 这是 RunningHub ComfyUI API 调用的示例配置
  // 展示了如何正确配置 parameters 和 nodeInfoTemplate
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
    
    // ⚠️ 重要：参数配置
    // 📋 parameters: 定义前端表单参数，用于用户输入
    // - name: 参数键名，必须与 nodeInfoTemplate 中的 paramKey 对应
    // - type: 参数类型（'image' 或 'text'）
    // - description: 用户界面显示的描述
    // - default: 默认值（可选）
    parameters: [
      { name: 'image_240', type: 'image', description: '上传原始图片（要换背景的主体图片）' },
      { name: 'image_284', type: 'image', description: '上传背景参考图（想要的背景风格参考）' },
      { name: 'prompt_279', type: 'text', default: 'describe the style of the image and atmosphere of the image in two sentence. start your answer with Change the background to', description: 'LLM提示词指令（如何描述背景变换）' }
    ],
    
    // ⚠️ 重要：nodeInfoTemplate 配置
    // 🎯 这是 RunningHub ComfyUI API 调用的核心配置
    // 定义了要修改的工作流节点和对应的参数映射
    //
    // 📋 配置规则：
    // 1. nodeId: 工作流界面中节点右上角的数字标识
    // 2. fieldName: 对应节点inputs部分的键名（如"image", "text", "prompt"）
    // 3. paramKey: 对应 parameters 数组中的 name，用于参数匹配
    //
    // 🔧 获取方法：
    // 1. 在 RunningHub 界面点击下载图标
    // 2. 选择 "Export Workflow API"
    // 3. 打开下载的 JSON 文件，查看每个节点的 inputs 部分
    // 4. 根据需要的参数配置 nodeInfoTemplate
    //
    // ⚠️ 注意事项：
    // - nodeId 必须与工作流中的实际节点ID一致
    // - fieldName 必须与节点inputs中的键名一致
    // - paramKey 必须与 parameters 中的 name 一致
    nodeInfoTemplate: [
      { nodeId: '240', fieldName: 'image', paramKey: 'image_240' },  // LoadImage 节点 - 主体图片
      { nodeId: '284', fieldName: 'image', paramKey: 'image_284' },  // LoadImage 节点 - 背景参考图
      { nodeId: '279', fieldName: 'prompt', paramKey: 'prompt_279' } // 文本提示词节点
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
  },
  // 背景一键生成，风格迁移_放大_ic控光_F1修复
  {
    id: 'background-generation-style-transfer',
    name: '背景一键生成，风格迁移_放大_ic控光_F1修复',
    description: '全能型背景处理工作流，集成风格迁移、AI放大、IC控光、F1修复等多种技术，实现专业级背景生成与优化，适用于高质量图像制作。',
    author: mockUsers[0],
    category: 'Artistic',
    tags: ['background', 'generation', 'style-transfer', 'upscale', 'ic-light', 'flux', 'professional'],
    beforeImage: 'https://images.pexels.com/photos/1308881/pexels-photo-1308881.jpeg?auto=compress&cs=tinysrgb&w=400',
    afterImage: 'https://images.pexels.com/photos/3680219/pexels-photo-3680219.jpeg?auto=compress&cs=tinysrgb&w=400',
    likesCount: 756,
    isLiked: false,
    isBookmarked: false,
    createdAt: '2024-04-20',
    difficulty: 'Expert',
    processingTime: '5-8 minutes',
    workflowId: '1950890208722092034', // 新工作流ID
    isTrending: true,
    parameters: [
      { name: 'image_62', type: 'image', description: '上传主体图片（要处理的原始图片）' },
      { name: 'image_84', type: 'image', description: '上传背景风格参考图（目标风格图片）' },
      { name: 'prompt_257', type: 'text', default: '杰作，最佳细节，最佳画质，最佳质量，逼真，RAW照片，8k', description: '图像质量描述提示词（用于翻译和优化）' }
    ],
    nodeInfoTemplate: [
      { nodeId: '62', fieldName: 'image', paramKey: 'image_62' },
      { nodeId: '84', fieldName: 'image', paramKey: 'image_84' },
      { nodeId: '257', fieldName: 'text', paramKey: 'prompt_257' }
    ]
  },
  // 一键去除人物还原背景
  {
    id: 'remove-person-restore-background',
    name: '一键去除人物还原背景',
    description: '智能人物去除与背景还原技术，自动识别并移除图片中的人物，同时智能生成或还原原始背景，适用于产品展示、场景重建等应用场景。',
    author: mockUsers[0],
    category: 'Artistic',
    tags: ['person-removal', 'background-restoration', 'AI', 'inpainting', 'scene-reconstruction'],
    beforeImage: 'https://images.pexels.com/photos/1308881/pexels-photo-1308881.jpeg?auto=compress&cs=tinysrgb&w=400',
    afterImage: 'https://images.pexels.com/photos/3680219/pexels-photo-3680219.jpeg?auto=compress&cs=tinysrgb&w=400',
    likesCount: 634,
    isLiked: false,
    isBookmarked: false,
    createdAt: '2024-05-01',
    difficulty: 'Advanced',
    processingTime: '3-5 minutes',
    webappId: '1904892320519475201', // 从API调用中获取的webappId
    isWebapp: true, // 标记为AI应用任务
    isTrending: true,
    parameters: [
      { name: 'image_65', type: 'image', description: '上传包含人物的图片（要处理的原始图片）' },
      { name: 'prompt_842', type: 'text', default: 'human', description: '人物识别提示词（用于识别要移除的人物类型）' },
      { name: 'text_799', type: 'text', default: 'empty scene blur', description: '背景描述提示词（描述期望的背景场景）' },
      { name: 'text_800', type: 'text', default: 'person,woman,man,boy,girl,human', description: '人物类型识别词（用于精确识别要移除的人物）' },
      { name: 'text_825', type: 'text', default: 'empty scene', description: '额外背景描述（可选，用于更精确的背景生成）' }
    ],
    nodeInfoTemplate: [
      { nodeId: '65', fieldName: 'image', paramKey: 'image_65' },      // 输入图片
      { nodeId: '842', fieldName: 'prompt', paramKey: 'prompt_842' },  // 人物识别提示词
      { nodeId: '799', fieldName: 'text', paramKey: 'text_799' },      // 背景描述
      { nodeId: '800', fieldName: 'text', paramKey: 'text_800' },      // 人物类型识别
      { nodeId: '825', fieldName: 'text', paramKey: 'text_825' }       // 额外背景描述
    ]
  },
  // Cosnap换背景置换参考背景
  {
    id: 'cosnap-background-replacement-reference',
    name: 'Cosnap换背景置换参考背景',
    description: '专业级背景置换工作流，集成VAE加载、图像缩放、风格模型、CLIP视觉、ControlNet、深度处理、颜色匹配等多种先进技术，支持参考背景图片进行智能背景置换，适用于高质量图像处理。',
    author: mockUsers[2],
    category: 'Professional',
    tags: ['advanced', 'image-processing', 'vae', 'clip', 'controlnet', 'depth', 'color-matching', 'flux', 'professional'],
    beforeImage: 'https://images.pexels.com/photos/1308881/pexels-photo-1308881.jpeg?auto=compress&cs=tinysrgb&w=400',
    afterImage: 'https://images.pexels.com/photos/3680219/pexels-photo-3680219.jpeg?auto=compress&cs=tinysrgb&w=400',
    likesCount: 445,
    isLiked: false,
    isBookmarked: false,
    createdAt: '2024-05-15',
    difficulty: 'Expert',
    processingTime: '8-12 minutes',
    workflowId: '1951208640185311234', // 你提供的workflowId
    isTrending: false,
    parameters: [
      { name: 'image_4', type: 'image', description: '上传主要输入图片（要处理的主体图片）' },
      { name: 'image_5', type: 'image', description: '上传辅助输入图片（用于对比或参考的图片）' },
      { name: 'prompt_396', type: 'text', default: 'MAN,', description: '主要提示词（描述要生成的内容）' },
      { name: 'text_1171', type: 'text', default: 'Follow the perspective from right.', description: '视角指导提示词（描述图像视角和方向）' },
      { name: 'seed_587', type: 'text', default: '679932141276277', description: '随机种子（控制生成结果的随机性）' }
    ],
    nodeInfoTemplate: [
      { nodeId: '4', fieldName: 'image', paramKey: 'image_4' },        // LoadImage 节点 - 主要输入图片
      { nodeId: '5', fieldName: 'image', paramKey: 'image_5' },        // LoadImage 节点 - 辅助输入图片
      { nodeId: '396', fieldName: 'prompt', paramKey: 'prompt_396' },  // RH_Translator 节点 - 主要提示词
      { nodeId: '1171', fieldName: 'text', paramKey: 'text_1171' },    // Text 节点 - 视角指导
      { nodeId: '587', fieldName: 'seed', paramKey: 'seed_587' }       // EasySeed 节点 - 随机种子
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