import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { StructuredData, generateBreadcrumbSchema } from './StructuredData';

interface BreadcrumbItem {
  name: string;
  href: string;
  current?: boolean;
}

interface BreadcrumbNavigationProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export const BreadcrumbNavigation: React.FC<BreadcrumbNavigationProps> = ({ 
  items, 
  className = '' 
}) => {
  const location = useLocation();
  
  // Auto-generate breadcrumbs if not provided
  const breadcrumbItems = items || generateBreadcrumbsFromPath(location.pathname);
  
  // Generate structured data for breadcrumbs
  const breadcrumbSchema = generateBreadcrumbSchema(
    breadcrumbItems.map(item => ({
      name: item.name,
      url: `https://cosnap.ai${item.href}`
    }))
  );

  if (breadcrumbItems.length <= 1) {
    return null; // Don't show breadcrumbs for home page or single-level pages
  }

  return (
    <>
      <StructuredData data={breadcrumbSchema} type="breadcrumb" />
      <nav 
        aria-label="Breadcrumb" 
        className={`flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400 ${className}`}
      >
        <ol className="flex items-center space-x-1">
          {breadcrumbItems.map((item, index) => (
            <li key={item.href} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="w-4 h-4 mx-1 text-gray-400" />
              )}
              
              {item.current ? (
                <span 
                  className="font-medium text-gray-900 dark:text-gray-100"
                  aria-current="page"
                >
                  {index === 0 && <Home className="w-4 h-4 mr-1 inline" />}
                  {item.name}
                </span>
              ) : (
                <Link
                  to={item.href}
                  className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                  title={`Go to ${item.name}`}
                >
                  {index === 0 && <Home className="w-4 h-4 mr-1 inline" />}
                  {item.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
};

// Utility function to generate breadcrumbs from URL path
const generateBreadcrumbsFromPath = (pathname: string): BreadcrumbItem[] => {
  const pathSegments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', href: '/' }
  ];

  let currentPath = '';
  
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === pathSegments.length - 1;
    
    // Generate human-readable names for path segments
    const name = getBreadcrumbName(segment, pathSegments, index);
    
    breadcrumbs.push({
      name,
      href: currentPath,
      current: isLast
    });
  });

  return breadcrumbs;
};

// Helper function to get human-readable breadcrumb names
const getBreadcrumbName = (segment: string, pathSegments: string[], index: number): string => {
  // Handle specific route patterns
  switch (segment) {
    case 'effects':
      return 'AI Effects';
    case 'community':
      return 'Community';
    case 'user':
      return 'Artists';
    case 'post':
      return 'Gallery';
    case 'profile':
      return 'Profile';
    case 'login':
      return 'Login';
    case 'register':
      return 'Register';
    default:
      // Handle dynamic segments (IDs, slugs)
      if (pathSegments[index - 1] === 'effects' && segment !== 'effects') {
        return formatEffectName(segment);
      }
      if (pathSegments[index - 1] === 'user' && segment !== 'user') {
        return 'Artist Profile';
      }
      if (pathSegments[index - 1] === 'post' && segment !== 'post') {
        return 'Photo';
      }
      
      // Default: capitalize and replace dashes/underscores with spaces
      return segment
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
  }
};

// Helper function to format effect names for breadcrumbs
const formatEffectName = (slug: string): string => {
  return slug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/\b(ai|id)\b/gi, match => match.toUpperCase());
};

// Predefined breadcrumb configurations for common pages
export const predefinedBreadcrumbs = {
  effects: [
    { name: 'Home', href: '/' },
    { name: 'AI Effects', href: '/effects', current: true }
  ],
  community: [
    { name: 'Home', href: '/' },
    { name: 'Community', href: '/community', current: true }
  ],
  profile: [
    { name: 'Home', href: '/' },
    { name: 'Profile', href: '/profile', current: true }
  ]
};

// Hook to get breadcrumbs for current page
export const useBreadcrumbs = (customItems?: BreadcrumbItem[]) => {
  const location = useLocation();
  
  return customItems || generateBreadcrumbsFromPath(location.pathname);
};

export default BreadcrumbNavigation;