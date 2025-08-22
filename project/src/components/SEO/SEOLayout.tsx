import React from 'react';
import { MetaManager } from './MetaManager';
import { StructuredData, generateOrganizationSchema } from './StructuredData';
import { BreadcrumbNavigation } from './BreadcrumbNavigation';
import { PerformanceOptimizer } from './PerformanceOptimizer';
import { useSEO } from '../../hooks/useSEO';
import { SEOMetadata } from '../../utils/seo/metaUtils';

interface SEOLayoutProps {
  children: React.ReactNode;
  seo?: Partial<SEOMetadata>;
  data?: any;
  showBreadcrumbs?: boolean;
  enablePerformanceOptimization?: boolean;
  className?: string;
}

export const SEOLayout: React.FC<SEOLayoutProps> = ({
  children,
  seo,
  data,
  showBreadcrumbs = true,
  enablePerformanceOptimization = true,
  className = ''
}) => {
  // Use SEO hook to manage meta tags and structured data
  useSEO({
    customSEO: seo,
    data,
    enableStructuredData: true,
    enableBreadcrumbs: showBreadcrumbs
  });

  // Organization schema should be on every page
  const organizationSchema = generateOrganizationSchema();

  return (
    <div className={`min-h-screen ${className}`}>
      {/* Global Organization Schema */}
      <StructuredData data={organizationSchema} type="organization" />
      
      {/* Performance Optimization */}
      {enablePerformanceOptimization && (
        <PerformanceOptimizer
          enableWebVitals={true}
          enableResourceHints={true}
          enableFontOptimization={true}
        />
      )}

      {/* Breadcrumb Navigation */}
      {showBreadcrumbs && (
        <div className="container mx-auto px-4 py-2">
          <BreadcrumbNavigation />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

// Specialized layouts for different page types
export const HomePageLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SEOLayout
      showBreadcrumbs={false} // Don't show breadcrumbs on home page
      enablePerformanceOptimization={true}
    >
      {children}
    </SEOLayout>
  );
};

export const EffectPageLayout: React.FC<{
  children: React.ReactNode;
  effect?: any;
}> = ({ children, effect }) => {
  const seo = effect ? {
    title: `${effect.name} - AI ${effect.category} Effect | Cosnap AI`,
    description: `Apply ${effect.name} AI effect to your photos. ${effect.description}. Free online ${effect.category.toLowerCase()} photo editing tool.`,
    keywords: [
      effect.name.toLowerCase(),
      `AI ${effect.category.toLowerCase()}`,
      ...(effect.tags || []),
      "free photo editor",
      "online image processing"
    ],
    ogImage: effect.previewImage || '/effects/default-preview.jpg'
  } : undefined;

  return (
    <SEOLayout
      seo={seo}
      data={effect}
      showBreadcrumbs={true}
      enablePerformanceOptimization={true}
    >
      {children}
    </SEOLayout>
  );
};

export const UserProfileLayout: React.FC<{
  children: React.ReactNode;
  user?: any;
}> = ({ children, user }) => {
  const seo = user ? {
    title: `${user.name} - AI Photo Artist | Cosnap AI Community`,
    description: `Discover ${user.name}'s AI-enhanced photo gallery. ${user.bio || 'Creative AI photo artist in the Cosnap community.'}`,
    keywords: ["AI photo artist", "photo gallery", "creative community"],
    ogImage: user.avatar || '/avatars/default-avatar.png'
  } : undefined;

  return (
    <SEOLayout
      seo={seo}
      data={user}
      showBreadcrumbs={true}
      enablePerformanceOptimization={true}
    >
      {children}
    </SEOLayout>
  );
};

export const CommunityLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const seo = {
    title: "AI Photo Community - Share & Discover Amazing AI Effects | Cosnap AI",
    description: "Join the Cosnap AI community to share your AI-enhanced photos, discover amazing effects, and connect with creative artists worldwide.",
    keywords: ["AI photo community", "photo sharing", "AI effects gallery", "creative community"]
  };

  return (
    <SEOLayout
      seo={seo}
      showBreadcrumbs={true}
      enablePerformanceOptimization={true}
    >
      {children}
    </SEOLayout>
  );
};

// Higher-order component for automatic SEO
export const withSEO = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  seoConfig?: Partial<SEOMetadata>
) => {
  const WithSEOComponent: React.FC<P> = (props) => {
    return (
      <SEOLayout seo={seoConfig}>
        <WrappedComponent {...props} />
      </SEOLayout>
    );
  };

  WithSEOComponent.displayName = `withSEO(${WrappedComponent.displayName || WrappedComponent.name})`;
  return WithSEOComponent;
};

export default SEOLayout;