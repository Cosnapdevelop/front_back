export interface SEOMetadata {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
  canonicalUrl?: string;
  structuredData?: object;
  noindex?: boolean;
}

// Page-specific SEO configurations
export const homepageSEO: SEOMetadata = {
  title: "Cosnap AI - Free Online AI Photo Editor | 50+ Professional Effects | 智能图像处理",
  description: "Transform photos with AI-powered effects. Free online image editor with portrait enhancement, background removal & artistic filters. Professional results in seconds. 专业AI图像处理工具。",
  keywords: [
    "AI photo editor", "image processing", "photo effects", "portrait enhancement",
    "智能图像处理", "AI特效", "图片编辑", "免费在线工具", "AI美颜", "图片美化"
  ],
  canonicalUrl: "https://cosnap.ai/",
  structuredData: {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Cosnap AI",
    "alternateName": "Cosnap",
    "description": "Free online AI image processing platform with professional photo effects",
    "url": "https://cosnap.ai",
    "applicationCategory": "PhotoApplication",
    "operatingSystem": "Web Browser, iOS, Android",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "author": {
      "@type": "Organization",
      "name": "Cosnap Team",
      "url": "https://cosnap.ai"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "2150"
    }
  }
};

export const effectsGallerySEO: SEOMetadata = {
  title: "AI Photo Effects Gallery - Professional Image Enhancement | Cosnap AI",
  description: "Explore 50+ AI-powered photo effects. Portrait enhancement, artistic filters, background removal, and professional image editing tools. Free online photo editor.",
  keywords: [
    "AI photo effects", "image filters", "photo enhancement", "artistic effects",
    "智能特效", "图片滤镜", "照片处理", "艺术效果"
  ],
  canonicalUrl: "https://cosnap.ai/effects",
  structuredData: {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "AI Photo Effects Gallery",
    "description": "Collection of AI-powered photo effects and filters",
    "url": "https://cosnap.ai/effects",
    "numberOfItems": "50+"
  }
};

// Category-specific SEO templates
export const categoryPageSEO = {
  'Portrait': {
    title: "AI Portrait Effects - Professional Photo Enhancement | Cosnap AI",
    description: "Enhance portraits with AI-powered effects. Professional photo retouching, beauty filters, and skin smoothing. Free online portrait editing tools.",
    keywords: ["AI portrait effects", "photo retouching", "beauty filters", "portrait enhancement", "AI美颜", "人像处理"],
    canonicalUrl: "https://cosnap.ai/effects/portrait"
  },
  'Artistic': {
    title: "Artistic AI Filters - Transform Photos into Art | Cosnap AI",
    description: "Convert photos into stunning artwork with AI artistic filters. Oil painting, watercolor, and abstract art effects. Free artistic photo transformation.",
    keywords: ["artistic filters", "photo to art", "AI art generator", "painting effects", "艺术滤镜", "图片转艺术"],
    canonicalUrl: "https://cosnap.ai/effects/artistic"
  },
  'Background': {
    title: "AI Background Effects - Remove & Replace Backgrounds | Cosnap AI",
    description: "AI-powered background removal and replacement. Professional background effects, blur, and enhancement tools. Free online background editor.",
    keywords: ["background removal", "AI background", "photo background", "background replacement", "背景处理", "背景替换"],
    canonicalUrl: "https://cosnap.ai/effects/background"
  }
};

// Effect-specific SEO template generator
export const generateEffectPageSEO = (effect: any): SEOMetadata => ({
  title: `${effect.name} - AI ${effect.category} Effect | Cosnap AI`,
  description: `Apply ${effect.name} AI effect to your photos. ${effect.description}. Free online ${effect.category.toLowerCase()} photo editing tool with professional results.`,
  keywords: [
    effect.name.toLowerCase(),
    `AI ${effect.category.toLowerCase()}`,
    ...effect.tags || [],
    "free photo editor",
    "online image processing",
    "AI特效",
    "图片处理"
  ],
  canonicalUrl: `https://cosnap.ai/effects/${effect.slug || effect.id}`,
  structuredData: {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": effect.name,
    "description": effect.description,
    "applicationCategory": "PhotoApplication",
    "screenshot": effect.previewImage || "/effects/default-preview.jpg",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "aggregateRating": effect.rating ? {
      "@type": "AggregateRating",
      "ratingValue": effect.rating.average || "4.5",
      "reviewCount": effect.rating.count || "100"
    } : undefined
  }
});

// User profile SEO template generator
export const generateUserProfileSEO = (user: any): SEOMetadata => ({
  title: `${user.name} - AI Photo Artist | Cosnap AI Community`,
  description: `Discover ${user.name}'s AI-enhanced photo gallery. ${user.bio || 'Creative AI photo artist in the Cosnap community.'}. Join the Cosnap AI community of creative artists.`,
  keywords: ["AI photo artist", "photo gallery", "creative community", "AI art showcase", "用户作品", "创意社区"],
  canonicalUrl: `https://cosnap.ai/user/${user.id}`,
  structuredData: {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": user.name,
    "description": user.bio,
    "image": user.avatar,
    "url": `https://cosnap.ai/user/${user.id}`,
    "sameAs": user.socialLinks || []
  }
});

// Community post SEO template generator
export const generatePostSEO = (post: any): SEOMetadata => ({
  title: `${post.title} - AI Photo Gallery | Cosnap AI Community`,
  description: `${post.description || 'Amazing AI-enhanced photo transformation.'} Created by ${post.author?.name || 'Cosnap user'} using Cosnap AI effects.`,
  keywords: ["AI photo gallery", "photo transformation", "AI effects", "creative photography", "AI作品", "图片分享"],
  canonicalUrl: `https://cosnap.ai/post/${post.id}`,
  structuredData: {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    "name": post.title,
    "description": post.description,
    "contentUrl": post.imageUrl,
    "creator": {
      "@type": "Person",
      "name": post.author?.name || "Anonymous"
    },
    "dateCreated": post.createdAt,
    "copyrightHolder": {
      "@type": "Organization",
      "name": "Cosnap AI"
    }
  }
});

// Utility function to get SEO data based on route
export const getSEOForRoute = (pathname: string, data?: any): SEOMetadata => {
  switch (pathname) {
    case '/':
      return homepageSEO;
    case '/effects':
      return effectsGallerySEO;
    default:
      if (pathname.startsWith('/effects/') && data) {
        return generateEffectPageSEO(data);
      }
      if (pathname.startsWith('/user/') && data) {
        return generateUserProfileSEO(data);
      }
      if (pathname.startsWith('/post/') && data) {
        return generatePostSEO(data);
      }
      // Default fallback
      return {
        title: "Cosnap AI - AI Image Processing Platform",
        description: "Professional AI-powered photo editing and enhancement tools.",
        keywords: ["AI photo editor", "image processing", "photo effects"]
      };
  }
};