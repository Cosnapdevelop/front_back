import React from 'react';

interface StructuredDataProps {
  data: object;
  type?: string;
}

export const StructuredData: React.FC<StructuredDataProps> = ({ data, type = "default" }) => {
  return (
    <script
      type="application/ld+json"
      data-schema-type={type}
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data, null, 0)
      }}
    />
  );
};

// Predefined schema generators
export const generateWebApplicationSchema = (appData: {
  name: string;
  description: string;
  url: string;
  category?: string;
  offers?: object;
  author?: object;
  aggregateRating?: object;
}) => ({
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": appData.name,
  "description": appData.description,
  "url": appData.url,
  "applicationCategory": appData.category || "PhotoApplication",
  "operatingSystem": "Web Browser, iOS, Android",
  "offers": appData.offers || {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "author": appData.author || {
    "@type": "Organization",
    "name": "Cosnap Team"
  },
  "aggregateRating": appData.aggregateRating
});

export const generateSoftwareApplicationSchema = (effectData: {
  name: string;
  description: string;
  category: string;
  screenshot?: string;
  rating?: object;
}) => ({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": effectData.name,
  "description": effectData.description,
  "applicationCategory": "PhotoApplication",
  "screenshot": effectData.screenshot,
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "aggregateRating": effectData.rating
});

export const generateImageObjectSchema = (imageData: {
  name: string;
  description?: string;
  contentUrl: string;
  creator?: object;
  dateCreated?: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "ImageObject",
  "name": imageData.name,
  "description": imageData.description,
  "contentUrl": imageData.contentUrl,
  "creator": imageData.creator,
  "dateCreated": imageData.dateCreated,
  "copyrightHolder": {
    "@type": "Organization",
    "name": "Cosnap AI"
  },
  "license": "https://cosnap.ai/terms"
});

export const generatePersonSchema = (userData: {
  name: string;
  description?: string;
  image?: string;
  url?: string;
  sameAs?: string[];
}) => ({
  "@context": "https://schema.org",
  "@type": "Person",
  "name": userData.name,
  "description": userData.description,
  "image": userData.image,
  "url": userData.url,
  "sameAs": userData.sameAs || []
});

export const generateCollectionPageSchema = (collectionData: {
  name: string;
  description: string;
  url: string;
  numberOfItems?: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": collectionData.name,
  "description": collectionData.description,
  "url": collectionData.url,
  "numberOfItems": collectionData.numberOfItems
});

export const generateBreadcrumbSchema = (breadcrumbs: Array<{
  name: string;
  url: string;
}>) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": breadcrumbs.map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": item.name,
    "item": item.url
  }))
});

export const generateFAQSchema = (faqs: Array<{
  question: string;
  answer: string;
}>) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map(faq => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.answer
    }
  }))
});

export const generateOrganizationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Cosnap AI",
  "alternateName": "Cosnap",
  "url": "https://cosnap.ai",
  "logo": "https://cosnap.ai/logo.png",
  "description": "Leading AI image processing platform providing professional photo effects and enhancement tools",
  "foundingDate": "2024",
  "sameAs": [
    "https://twitter.com/CosnopAI",
    "https://github.com/cosnap-ai"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "email": "support@cosnap.ai"
  }
});

export default StructuredData;