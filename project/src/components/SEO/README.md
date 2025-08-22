# SEO Components Library - Integration Guide

This directory contains a comprehensive SEO component library for Cosnap AI. These components provide dynamic meta tag management, structured data, performance optimization, and enhanced user experience for search engine optimization.

## Quick Start

### 1. Install Dependencies (REQUIRED)
```bash
npm install react-helmet-async sitemap web-vitals
```

### 2. Basic Usage

#### Import SEO Components
```typescript
import { useSEO } from '../hooks/useSEO';
import { SEOLayout } from '../components/SEO/SEOLayout';
import { SEOOptimizedImage } from '../components/SEO/SEOOptimizedImage';
import { FAQSection } from '../components/SEO/FAQSection';
```

#### Use SEO Hook in Any Page
```typescript
const MyPage = () => {
  useSEO({
    customSEO: {
      title: "My Page Title | Cosnap AI",
      description: "Page description for SEO",
      keywords: ["keyword1", "keyword2"]
    }
  });

  return <div>Page content</div>;
};
```

#### Use SEO Layout (Recommended)
```typescript
const MyPage = () => {
  return (
    <SEOLayout
      seo={{
        title: "My Page Title | Cosnap AI",
        description: "Page description for SEO"
      }}
      showBreadcrumbs={true}
    >
      <div>Page content</div>
    </SEOLayout>
  );
};
```

## Component Overview

### Core Components

#### `MetaManager.tsx`
Manages dynamic meta tags including Open Graph and Twitter Cards.
```typescript
<MetaManager
  title="Page Title"
  description="Page description"
  keywords={["keyword1", "keyword2"]}
  ogImage="/custom-og-image.jpg"
  structuredData={schemaObject}
/>
```

#### `StructuredData.tsx`
Provides schema markup for rich snippets.
```typescript
<StructuredData
  data={schemaObject}
  type="product" // Optional identifier
/>
```

#### `SEOOptimizedImage.tsx`
Performance-optimized images with SEO benefits.
```typescript
<SEOOptimizedImage
  src="/image.jpg"
  alt="Descriptive alt text"
  width={300}
  height={200}
  priority={true} // For above-fold images
/>
```

#### `BreadcrumbNavigation.tsx`
SEO-friendly breadcrumb navigation with structured data.
```typescript
<BreadcrumbNavigation
  items={[
    { name: 'Home', href: '/' },
    { name: 'Effects', href: '/effects' },
    { name: 'Portrait', href: '/effects/portrait', current: true }
  ]}
/>
```

#### `FAQSection.tsx`
FAQ component with structured data for rich snippets.
```typescript
<FAQSection
  faqs={[
    {
      question: "How does this work?",
      answer: "Detailed answer with keywords.",
      keywords: ["how", "work", "process"]
    }
  ]}
  title="Frequently Asked Questions"
  collapsible={true}
/>
```

#### `PerformanceOptimizer.tsx`
Automatic performance optimization and Web Vitals tracking.
```typescript
<PerformanceOptimizer
  enableWebVitals={true}
  enableResourceHints={true}
  enableFontOptimization={true}
/>
```

#### `SEOLayout.tsx`
Unified layout component that combines all SEO features.
```typescript
<SEOLayout
  seo={{
    title: "Page Title",
    description: "Page description",
    keywords: ["keyword1", "keyword2"]
  }}
  data={pageData} // For dynamic content
  showBreadcrumbs={true}
  enablePerformanceOptimization={true}
>
  <PageContent />
</SEOLayout>
```

### Specialized Components

#### `EffectPreviewImage`
Optimized for effect preview images with SEO metadata.
```typescript
<EffectPreviewImage
  effect={effectData}
  priority={true}
  className="w-full h-48 object-cover"
/>
```

#### `UserAvatarImage`
Optimized for user profile images.
```typescript
<UserAvatarImage
  user={userData}
  size={64}
  className="rounded-full"
/>
```

#### `PostImage`
Optimized for community post images.
```typescript
<PostImage
  post={postData}
  priority={false}
  className="w-full h-auto"
/>
```

## Hooks and Utilities

### `useSEO` Hook
Central hook for SEO management in any component.

```typescript
const { pathname, updateSEO } = useSEO({
  customSEO: {
    title: "Dynamic Title",
    description: "Dynamic description"
  },
  data: dynamicData,
  enableStructuredData: true,
  enableBreadcrumbs: true
});
```

### Specialized SEO Hooks

#### `useEffectSEO`
Optimized for effect pages.
```typescript
const MyEffectPage = ({ effect }) => {
  useEffectSEO(effect);
  return <div>Effect content</div>;
};
```

#### `useUserProfileSEO`
Optimized for user profile pages.
```typescript
const UserProfile = ({ user }) => {
  useUserProfileSEO(user);
  return <div>User profile content</div>;
};
```

#### `usePostSEO`
Optimized for community post pages.
```typescript
const PostDetail = ({ post }) => {
  usePostSEO(post);
  return <div>Post content</div>;
};
```

### Utility Functions

#### Meta Utils (`utils/seo/metaUtils.ts`)
```typescript
import { getSEOForRoute, generateEffectPageSEO } from '../utils/seo/metaUtils';

// Get SEO data for current route
const seoData = getSEOForRoute('/effects', effectData);

// Generate effect-specific SEO
const effectSEO = generateEffectPageSEO(effectData);
```

#### Sitemap Generator (`utils/seo/sitemapGenerator.ts`)
```typescript
import { generateAllSitemaps } from '../utils/seo/sitemapGenerator';

// Generate all sitemaps
const sitemaps = await generateAllSitemaps({
  effects: effectsData,
  users: usersData,
  posts: postsData
});
```

#### Web Vitals Tracker (`utils/seo/webVitalsTracker.ts`)
```typescript
import { initWebVitalsTracking, trackCustomMetric } from '../utils/seo/webVitalsTracker';

// Initialize tracking
initWebVitalsTracking();

// Track custom metrics
trackCustomMetric('custom_interaction', 1200);
```

## Page Integration Examples

### Homepage Integration
```typescript
import { HomePageLayout } from '../components/SEO/SEOLayout';
import { FAQSection, homepageFAQs } from '../components/SEO/FAQSection';

const Home = () => {
  return (
    <HomePageLayout>
      {/* Hero section */}
      <section>Hero content</section>
      
      {/* FAQ for SEO */}
      <FAQSection faqs={homepageFAQs} />
    </HomePageLayout>
  );
};
```

### Effects Gallery Integration
```typescript
import { useSEO } from '../hooks/useSEO';
import { BreadcrumbNavigation } from '../components/SEO/BreadcrumbNavigation';
import { categoryPageSEO } from '../utils/seo/metaUtils';

const Effects = () => {
  const seoData = categoryPageSEO[selectedCategory] || defaultSEO;
  
  useSEO({ customSEO: seoData });
  
  return (
    <div>
      <BreadcrumbNavigation />
      {/* Effects grid */}
    </div>
  );
};
```

### Effect Detail Page Integration
```typescript
import { EffectPageLayout } from '../components/SEO/SEOLayout';
import { EffectPreviewImage } from '../components/SEO/SEOOptimizedImage';

const EffectDetail = ({ effect }) => {
  return (
    <EffectPageLayout effect={effect}>
      <EffectPreviewImage effect={effect} priority={true} />
      {/* Effect details */}
    </EffectPageLayout>
  );
};
```

## Performance Considerations

### Lazy Loading
All SEO components support lazy loading:
```typescript
<SEOOptimizedImage
  src="/image.jpg"
  alt="Description"
  loading="lazy" // Default for non-critical images
/>
```

### Code Splitting
SEO components are optimized for code splitting:
```typescript
// Lazy load FAQ section
const FAQSection = React.lazy(() => import('../components/SEO/FAQSection'));
```

### Bundle Size
- Core SEO components: ~15KB gzipped
- Optional dependencies loaded only when needed
- Web Vitals library: ~5KB (lazy loaded)

## Browser Support

### Modern Browsers
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

### Fallbacks
- Intersection Observer: Polyfill included
- Web Vitals: Graceful degradation
- Structured Data: Always supported

## Development Tools

### Debug Mode
Enable SEO debugging in development:
```typescript
// Add to main.tsx
if (process.env.NODE_ENV === 'development') {
  window.COSNAP_SEO_DEBUG = true;
}
```

### Performance Monitoring
View Web Vitals in browser console:
```javascript
// Check current Web Vitals
console.log(JSON.parse(localStorage.getItem('cosnap_web_vitals')));
```

### SEO Validation
Test structured data:
1. Open Google's Rich Results Test
2. Enter page URL
3. Verify schema markup

## Common Patterns

### Page-Level SEO
```typescript
const MyPage = () => {
  return (
    <SEOLayout
      seo={{
        title: "Page Title | Cosnap AI",
        description: "Page description for search engines",
        keywords: ["primary", "secondary", "long-tail keyword"]
      }}
    >
      <PageContent />
    </SEOLayout>
  );
};
```

### Component-Level SEO
```typescript
const MyComponent = ({ data }) => {
  useSEO({
    customSEO: {
      title: `${data.name} | Cosnap AI`,
      description: data.description
    },
    data
  });
  
  return <ComponentContent />;
};
```

### Image SEO Best Practices
```typescript
<SEOOptimizedImage
  src={imageUrl}
  alt={`${item.name} - ${item.description}`} // Descriptive alt text
  title={item.name} // Tooltip text
  width={300}
  height={200}
  priority={isAboveFold} // True for LCP images
  loading={isAboveFold ? 'eager' : 'lazy'}
/>
```

## Troubleshooting

### Common Issues

#### Meta Tags Not Updating
- Ensure `useSEO` hook is called in component
- Check for JavaScript errors in console
- Verify component mounting order

#### Structured Data Errors
- Validate JSON-LD syntax
- Check required schema properties
- Use Google's Structured Data Testing Tool

#### Performance Issues
- Enable lazy loading for below-fold content
- Use code splitting for large components
- Monitor Web Vitals in development

### Debug Commands
```javascript
// View current SEO state
window.COSNAP_SEO_DEBUG && console.log('SEO State:', window.COSNAP_SEO_STATE);

// Check Web Vitals
console.log('Web Vitals:', JSON.parse(localStorage.getItem('cosnap_web_vitals')));

// Validate structured data
console.log('Schema:', document.querySelectorAll('script[type="application/ld+json"]'));
```

## Next Steps

1. **Install Dependencies**: `npm install react-helmet-async sitemap web-vitals`
2. **Integrate Core Components**: Start with `SEOLayout` for main pages
3. **Add Structured Data**: Implement FAQ sections and schema markup
4. **Optimize Images**: Replace img tags with `SEOOptimizedImage`
5. **Monitor Performance**: Set up Web Vitals tracking
6. **Test and Validate**: Use Google's SEO tools for validation

## Support

For questions or issues with SEO components:
1. Check this README for common patterns
2. Review component prop interfaces
3. Test with Google's SEO tools
4. Monitor Web Vitals performance

---

**SEO Components Version**: 1.0.0  
**React Compatibility**: 18+  
**TypeScript**: Full support included  
**Performance**: Optimized for Core Web Vitals