import { body, param, query, validationResult } from 'express-validator';
import mongoSanitize from 'express-mongo-sanitize';

/**
 * 通用验证结果处理中间件
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn(`[验证失败] ${req.method} ${req.path}:`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      errors: errors.array()
    });
    return res.status(400).json({ 
      success: false, 
      error: '输入验证失败', 
      details: errors.array() 
    });
  }
  next();
};

/**
 * 输入清理中间件 - 防止 NoSQL 注入
 */
export const sanitizeInput = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`[输入清理] 检测到潜在注入尝试 - IP: ${req.ip}, 字段: ${key}`);
  }
});

/**
 * 通用字符串验证规则
 */
export const stringValidation = {
  username: body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('用户名长度必须在3-50个字符之间')
    .custom((value) => {
      // Allow email addresses as usernames along with traditional usernames
      if (!/^[a-zA-Z0-9_.-@]+$/.test(value)) {
        throw new Error('用户名只能包含字母、数字、下划线、连字符、句点和@符号');
      }
      return true;
    }),
    
  email: body('email')
    .isEmail()
    .withMessage('请提供有效的邮箱地址')
    .normalizeEmail()
    .isLength({ max: 254 })
    .withMessage('邮箱地址过长'),
    
  password: body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('密码长度必须在6-128个字符之间')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('密码必须包含至少一个小写字母、一个大写字母和一个数字'),
    
  bio: body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('个人简介不能超过500个字符')
    .trim()
    .escape(),
    
  title: body('title')
    .isLength({ min: 1, max: 200 })
    .withMessage('标题长度必须在1-200个字符之间')
    .trim()
    .escape(),
    
  description: body('description')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('描述不能超过2000个字符')
    .trim()
    .escape(),
    
  tags: body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('标签数量不能超过10个')
    .custom((tags) => {
      if (tags && tags.some(tag => typeof tag !== 'string' || tag.length > 50)) {
        throw new Error('每个标签必须是字符串且不超过50个字符');
      }
      return true;
    })
};

/**
 * ID验证规则
 */
export const idValidation = {
  userId: param('userId')
    .isInt({ min: 1 })
    .withMessage('用户ID必须是正整数'),
    
  taskId: param('taskId')
    .isInt({ min: 1 })
    .withMessage('任务ID必须是正整数'),
    
  postId: param('postId')
    .isInt({ min: 1 })
    .withMessage('帖子ID必须是正整数'),
    
  workflowId: body('workflowId')
    .isString()
    .withMessage('工作流ID必须是字符串')
    .isLength({ min: 1, max: 100 })
    .withMessage('工作流ID长度必须在1-100个字符之间'),
    
  webappId: body('webappId')
    .isString()
    .withMessage('WebApp ID必须是字符串')
    .isLength({ min: 1, max: 100 })
    .withMessage('WebApp ID长度必须在1-100个字符之间')
};

/**
 * 分页验证规则
 */
export const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('页码必须是1-1000之间的整数'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量必须是1-100之间的整数')
];

/**
 * 文件上传验证规则
 */
export const fileValidation = {
  image: (req, res, next) => {
    // 支持单文件上传 (req.file) 和多文件上传 (req.files)
    const files = req.files || (req.file ? [req.file] : []);
    
    if (!files || files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: '请上传图片文件' 
      });
    }
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 30 * 1024 * 1024; // 30MB 文件大小限制
    
    // 验证每个文件
    for (const file of files) {
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ 
          success: false, 
          error: `文件 "${file.originalname}" 格式不支持，仅支持 JPEG、PNG、GIF、WebP 格式的图片` 
        });
      }
      
      if (file.size > maxSize) {
        return res.status(400).json({ 
          success: false, 
          error: `文件 "${file.originalname}" 大小不能超过30MB` 
        });
      }
    }
    
    next();
  },
  
  lora: (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: '请上传LoRA文件' 
      });
    }
    
    const allowedExtensions = ['.safetensors', '.ckpt', '.pt', '.pth'];
    const fileName = req.file.originalname.toLowerCase();
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension) {
      return res.status(400).json({ 
        success: false, 
        error: '仅支持 .safetensors、.ckpt、.pt、.pth 格式的LoRA文件' 
      });
    }
    
    // 2GB 文件大小限制
    const maxSize = 2 * 1024 * 1024 * 1024;
    if (req.file.size > maxSize) {
      return res.status(400).json({ 
        success: false, 
        error: 'LoRA文件大小不能超过2GB' 
      });
    }
    
    next();
  }
};

/**
 * 认证相关验证规则
 */
export const authValidation = {
  register: [
    stringValidation.email,
    stringValidation.username,
    stringValidation.password,
    handleValidationErrors
  ],
  
  login: [
    body('email')
      .isString()
      .withMessage('邮箱/用户名必须是字符串')
      .isLength({ min: 1, max: 254 })
      .withMessage('邮箱/用户名长度必须在1-254个字符之间'),
    body('password')
      .isString()
      .withMessage('密码必须是字符串')
      .isLength({ min: 1, max: 128 })
      .withMessage('密码长度必须在1-128个字符之间'),
    handleValidationErrors
  ],
  
  refresh: [
    body('refreshToken')
      .isString()
      .withMessage('刷新令牌必须是字符串')
      .isLength({ min: 1, max: 1000 })
      .withMessage('刷新令牌格式无效'),
    handleValidationErrors
  ],
  
  updateProfile: [
    stringValidation.username.optional(),
    stringValidation.email.optional(),
    stringValidation.bio,
    body('avatar')
      .optional()
      .isURL()
      .withMessage('头像必须是有效的URL地址'),
    handleValidationErrors
  ],

  changeEmail: [
    body('newEmail')
      .isEmail()
      .withMessage('请提供有效的新邮箱地址')
      .normalizeEmail()
      .isLength({ max: 254 })
      .withMessage('邮箱地址过长'),
    body('newEmailCode')
      .isLength({ min: 6, max: 6 })
      .withMessage('新邮箱验证码必须为6位数字')
      .isNumeric()
      .withMessage('验证码必须为数字'),
    stringValidation.password,
    handleValidationErrors
  ],

  sendCode: [
    body('email')
      .isEmail()
      .withMessage('请提供有效邮箱')
      .normalizeEmail()
      .isLength({ max: 254 })
      .withMessage('邮箱地址过长'),
    body('scene')
      .optional()
      .isIn(['register', 'reset_password', 'delete_account', 'change_email'])
      .withMessage('无效的验证场景'),
    handleValidationErrors
  ],

  forgotPassword: [
    body('email')
      .isEmail()
      .withMessage('请提供有效邮箱')
      .normalizeEmail()
      .isLength({ max: 254 })
      .withMessage('邮箱地址过长'),
    handleValidationErrors
  ],

  resetPassword: [
    body('token')
      .notEmpty()
      .withMessage('重置令牌不能为空')
      .isLength({ min: 10, max: 500 })
      .withMessage('重置令牌格式无效'),
    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('密码长度必须在8-128个字符之间')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('密码必须包含大小写字母、数字和特殊字符'),
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('确认密码不匹配');
        }
        return true;
      }),
    handleValidationErrors
  ],

  verifyResetToken: [
    param('token')
      .notEmpty()
      .withMessage('重置令牌不能为空')
      .isLength({ min: 10, max: 500 })
      .withMessage('重置令牌格式无效'),
    handleValidationErrors
  ]
};

/**
 * AI效果相关验证规则
 */
export const effectsValidation = {
  webappTask: [
    idValidation.webappId,
    body('fieldConfigs')
      .isArray()
      .withMessage('字段配置必须是数组')
      .custom((configs) => {
        if (configs.length > 50) {
          throw new Error('字段配置数量不能超过50个');
        }
        return true;
      }),
    body('fieldConfigs.*.fieldId')
      .isString()
      .withMessage('字段ID必须是字符串')
      .isLength({ min: 1, max: 100 })
      .withMessage('字段ID长度必须在1-100个字符之间'),
    body('fieldConfigs.*.fieldValue')
      .custom((value) => {
        if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
          throw new Error('字段值必须是字符串、数字或布尔值');
        }
        return true;
      }),
    handleValidationErrors
  ],
  
  comfyUITask: [
    idValidation.workflowId,
    body('inputNodes')
      .optional()
      .isObject()
      .withMessage('输入节点必须是对象'),
    handleValidationErrors
  ],
  
  taskQuery: [
    param('taskId')
      .isString()
      .withMessage('任务ID必须是字符串')
      .isLength({ min: 1, max: 100 })
      .withMessage('任务ID格式无效'),
    handleValidationErrors
  ]
};

/**
 * 社区相关验证规则
 */
export const communityValidation = {
  createPost: [
    stringValidation.title,
    stringValidation.description,
    stringValidation.tags,
    body('imageUrl')
      .optional()
      .isURL()
      .withMessage('图片URL格式无效'),
    handleValidationErrors
  ],
  
  updatePost: [
    idValidation.postId,
    stringValidation.title.optional(),
    stringValidation.description.optional(),
    stringValidation.tags.optional(),
    handleValidationErrors
  ],
  
  getPosts: [
    ...paginationValidation,
    query('tag')
      .optional()
      .isString()
      .withMessage('标签必须是字符串')
      .isLength({ max: 50 })
      .withMessage('标签长度不能超过50个字符'),
    query('search')
      .optional()
      .isString()
      .withMessage('搜索关键词必须是字符串')
      .isLength({ max: 100 })
      .withMessage('搜索关键词长度不能超过100个字符'),
    handleValidationErrors
  ]
};

/**
 * 安全头部验证中间件
 */
export const validateSecurityHeaders = (req, res, next) => {
  // 检查必要的安全头部
  const requiredHeaders = ['user-agent'];
  const missingHeaders = requiredHeaders.filter(header => !req.get(header));
  
  if (missingHeaders.length > 0) {
    console.warn(`[安全检查] 缺少必要头部 - IP: ${req.ip}, 缺少: ${missingHeaders.join(', ')}`);
    return res.status(400).json({ 
      success: false, 
      error: '请求头部不完整' 
    });
  }
  
  // 检查可疑的用户代理
  const userAgent = req.get('User-Agent');
  const suspiciousPatterns = [
    /curl/i,
    /wget/i,
    /python/i,
    /bot/i,
    /crawler/i,
    /spider/i
  ];
  
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));
  if (isSuspicious && process.env.NODE_ENV === 'production') {
    console.warn(`[安全检查] 可疑用户代理 - IP: ${req.ip}, UA: ${userAgent}`);
    // 可以选择阻止或者只是记录
    // return res.status(403).json({ success: false, error: '访问被拒绝' });
  }
  
  next();
};