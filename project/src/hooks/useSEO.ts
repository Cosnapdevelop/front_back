import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SEOMetadata, getSEOForRoute } from '../utils/seo/metaUtils';

interface UseSEOOptions {
  customSEO?: Partial<SEOMetadata>;
  data?: any;
  enableStructuredData?: boolean;
  enableBreadcrumbs?: boolean;
}

export const useSEO = (options: UseSEOOptions = {}) => {
  const location = useLocation();
  const {
    customSEO,
    data,
    enableStructuredData = true,
    enableBreadcrumbs = true
  } = options;

  useEffect(() => {
    // Get default SEO for current route
    const defaultSEO = getSEOForRoute(location.pathname, data);
    
    // Merge with custom SEO overrides
    const seoData: SEOMetadata = {
      ...defaultSEO,
      ...customSEO
    };

    // Update document title
    if (seoData.title) {
      document.title = seoData.title;
    }

    // Update meta tags
    updateMetaTag('description', seoData.description || '');
    updateMetaTag('keywords', seoData.keywords?.join(', ') || '');
    updateMetaTag('robots', seoData.noindex ? 'noindex, nofollow' : 'index, follow');

    // Update Open Graph tags
    updateMetaTag('og:title', seoData.title || '', 'property');
    updateMetaTag('og:description', seoData.description || '', 'property');
    updateMetaTag('og:url', seoData.canonicalUrl || `https://cosnap.ai${location.pathname}`, 'property');
    
    if (seoData.ogImage) {
      const fullOgImage = seoData.ogImage.startsWith('http') 
        ? seoData.ogImage 
        : `https://cosnap.ai${seoData.ogImage}`;
      updateMetaTag('og:image', fullOgImage, 'property');
    }

    // Update Twitter Card tags
    updateMetaTag('twitter:title', seoData.title || '');
    updateMetaTag('twitter:description', seoData.description || '');
    
    if (seoData.ogImage) {
      const fullTwitterImage = seoData.ogImage.startsWith('http') 
        ? seoData.ogImage 
        : `https://cosnap.ai${seoData.ogImage}`;
      updateMetaTag('twitter:image', fullTwitterImage);
    }

    // Update canonical URL
    const canonicalUrl = seoData.canonicalUrl || `https://cosnap.ai${location.pathname}`;
    updateCanonicalLink(canonicalUrl);

    // Update structured data
    if (enableStructuredData && seoData.structuredData) {
      updateStructuredData(seoData.structuredData);
    }

  }, [location.pathname, customSEO, data, enableStructuredData]);

  return {
    pathname: location.pathname,
    updateSEO: (newSEO: Partial<SEOMetadata>) => {
      // This could trigger a re-render with new SEO data
      // Implementation depends on how you want to handle dynamic updates
    }
  };
};

// Utility functions for meta tag management
const updateMetaTag = (name: string, content: string, attribute: string = 'name') => {
  if (!content) return;

  let element = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
  
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  
  element.setAttribute('content', content);
};

const updateCanonicalLink = (url: string) => {
  let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  
  canonical.setAttribute('href', url);
};

const updateStructuredData = (data: object) => {
  // Remove existing structured data script added by React
  const existingScript = document.querySelector('script[type="application/ld+json"][data-react-seo="true"]');
  if (existingScript) {
    existingScript.remove();
  }
  
  // Add new structured data script
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-react-seo', 'true');
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
};

// Hook for page-specific SEO
export const usePageSEO = (pageType: string, data?: any) => {
  return useSEO({
    data,
    enableStructuredData: true,
    enableBreadcrumbs: true
  });
};

// Hook for effect page SEO
export const useEffectSEO = (effect: any) => {
  const customSEO = effect ? {
    title: `${effect.name} - AI ${effect.category} Effect | Cosnap AI`,
    description: `Apply ${effect.name} AI effect to your photos. ${effect.description}. Free online ${effect.category.toLowerCase()} photo editing tool.`,
    keywords: [
      effect.name.toLowerCase(),
      `AI ${effect.category.toLowerCase()}`,
      ...(effect.tags || []),
      "free photo editor",
      "online image processing"
    ],
    ogImage: effect.previewImage || '/effects/default-preview.jpg',
    structuredData: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": effect.name,
      "description": effect.description,
      "applicationCategory": "PhotoApplication",
      "screenshot": effect.previewImage,
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      }
    }
  } : undefined;

  return useSEO({ customSEO, data: effect });
};

// Hook for user profile SEO
export const useUserProfileSEO = (user: any) => {
  const customSEO = user ? {
    title: `${user.name} - AI Photo Artist | Cosnap AI Community`,
    description: `Discover ${user.name}'s AI-enhanced photo gallery. ${user.bio || 'Creative AI photo artist in the Cosnap community.'}`,
    keywords: ["AI photo artist", "photo gallery", "creative community"],
    ogImage: user.avatar || '/avatars/default-avatar.png',
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": user.name,
      "description": user.bio,
      "image": user.avatar,
      "url": `https://cosnap.ai/user/${user.id}`
    }
  } : undefined;

  return useSEO({ customSEO, data: user });
};

// Hook for post SEO
export const usePostSEO = (post: any) => {
  const customSEO = post ? {
    title: `${post.title} - AI Photo Gallery | Cosnap AI Community`,
    description: `${post.description || 'Amazing AI-enhanced photo transformation.'} Created by ${post.author?.name || 'Cosnap user'}.`,
    keywords: ["AI photo gallery", "photo transformation", "AI effects"],
    ogImage: post.imageUrl,
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
      "dateCreated": post.createdAt
    }
  } : undefined;

  return useSEO({ customSEO, data: post });
};

export default useSEO;