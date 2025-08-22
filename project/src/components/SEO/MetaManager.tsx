import React from 'react';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
  structuredData?: object;
  canonicalUrl?: string;
  noindex?: boolean;
}

export const MetaManager: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  ogImage = '/og-image.png',
  structuredData,
  canonicalUrl,
  noindex = false
}) => {
  const location = useLocation();
  const fullCanonical = canonicalUrl || `https://cosnap.ai${location.pathname}`;
  const fullOgImage = ogImage.startsWith('http') ? ogImage : `https://cosnap.ai${ogImage}`;

  React.useEffect(() => {
    // Update document title
    document.title = title;
    
    // Update meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords.join(', '));
    updateMetaTag('robots', noindex ? 'noindex, nofollow' : 'index, follow');
    
    // Update Open Graph tags
    updateMetaTag('og:title', title, 'property');
    updateMetaTag('og:description', description, 'property');
    updateMetaTag('og:image', fullOgImage, 'property');
    updateMetaTag('og:url', fullCanonical, 'property');
    updateMetaTag('og:type', 'website', 'property');
    
    // Update Twitter Card tags
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', fullOgImage);
    updateMetaTag('twitter:card', 'summary_large_image');
    
    // Update canonical URL
    updateCanonicalLink(fullCanonical);
    
    // Update structured data
    if (structuredData) {
      updateStructuredData(structuredData);
    }
  }, [title, description, keywords, fullOgImage, fullCanonical, structuredData, noindex]);

  return null;
};

// Utility functions for meta tag management
const updateMetaTag = (name: string, content: string, attribute: string = 'name') => {
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
  // Remove existing structured data script
  const existingScript = document.querySelector('script[type="application/ld+json"][data-react-helmet="true"]');
  if (existingScript) {
    existingScript.remove();
  }
  
  // Add new structured data script
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-react-helmet', 'true');
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
};

export default MetaManager;