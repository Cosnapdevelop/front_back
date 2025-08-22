interface SitemapEntry {
  url: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

interface SitemapConfig {
  baseUrl: string;
  staticPages: Array<{
    path: string;
    priority: number;
    changefreq: SitemapEntry['changefreq'];
  }>;
}

const defaultConfig: SitemapConfig = {
  baseUrl: 'https://cosnap.ai',
  staticPages: [
    { path: '/', priority: 1.0, changefreq: 'daily' },
    { path: '/effects', priority: 0.9, changefreq: 'daily' },
    { path: '/community', priority: 0.8, changefreq: 'hourly' },
    { path: '/login', priority: 0.3, changefreq: 'monthly' },
    { path: '/register', priority: 0.3, changefreq: 'monthly' }
  ]
};

export const generateSitemapXML = (entries: SitemapEntry[]): string => {
  const xmlContent = entries
    .map(entry => `
  <url>
    <loc>${entry.url}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`)
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${xmlContent}
</urlset>`;
};

export const generateSitemapIndexXML = (sitemaps: Array<{
  location: string;
  lastmod?: string;
}>): string => {
  const xmlContent = sitemaps
    .map(sitemap => `
  <sitemap>
    <loc>${sitemap.location}</loc>
    ${sitemap.lastmod ? `<lastmod>${sitemap.lastmod}</lastmod>` : ''}
  </sitemap>`)
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${xmlContent}
</sitemapindex>`;
};

export const generateMainSitemap = async (): Promise<string> => {
  const { baseUrl, staticPages } = defaultConfig;
  const entries: SitemapEntry[] = [];

  // Add static pages
  staticPages.forEach(page => {
    entries.push({
      url: `${baseUrl}${page.path}`,
      lastmod: new Date().toISOString(),
      changefreq: page.changefreq,
      priority: page.priority
    });
  });

  return generateSitemapXML(entries);
};

export const generateEffectsSitemap = async (effects: any[] = []): Promise<string> => {
  const { baseUrl } = defaultConfig;
  const entries: SitemapEntry[] = [];

  // If no effects data provided, generate sample entries
  if (effects.length === 0) {
    // Sample effect categories for sitemap
    const sampleCategories = [
      'portrait-enhancement',
      'artistic-filters',
      'background-removal',
      'style-transfer',
      'color-enhancement'
    ];

    sampleCategories.forEach(category => {
      entries.push({
        url: `${baseUrl}/effects/${category}`,
        lastmod: new Date().toISOString(),
        changefreq: 'weekly',
        priority: 0.8
      });
    });
  } else {
    // Add actual effects
    effects.forEach(effect => {
      const slug = effect.slug || effect.name?.toLowerCase().replace(/\s+/g, '-') || effect.id;
      entries.push({
        url: `${baseUrl}/effects/${slug}`,
        lastmod: effect.updatedAt || new Date().toISOString(),
        changefreq: 'weekly',
        priority: 0.8
      });
    });
  }

  return generateSitemapXML(entries);
};

export const generateUsersSitemap = async (users: any[] = []): Promise<string> => {
  const { baseUrl } = defaultConfig;
  const entries: SitemapEntry[] = [];

  // Public user profiles only
  users
    .filter(user => user.isPublic !== false)
    .forEach(user => {
      entries.push({
        url: `${baseUrl}/user/${user.id}`,
        lastmod: user.updatedAt || new Date().toISOString(),
        changefreq: 'weekly',
        priority: 0.6
      });
    });

  return generateSitemapXML(entries);
};

export const generatePostsSitemap = async (posts: any[] = []): Promise<string> => {
  const { baseUrl } = defaultConfig;
  const entries: SitemapEntry[] = [];

  // Public posts only
  posts
    .filter(post => post.isPublic !== false)
    .forEach(post => {
      entries.push({
        url: `${baseUrl}/post/${post.id}`,
        lastmod: post.updatedAt || new Date().toISOString(),
        changefreq: 'monthly',
        priority: 0.5
      });
    });

  return generateSitemapXML(entries);
};

export const generateSitemapIndex = async (): Promise<string> => {
  const { baseUrl } = defaultConfig;
  const currentDate = new Date().toISOString();

  const sitemaps = [
    {
      location: `${baseUrl}/sitemap-main.xml`,
      lastmod: currentDate
    },
    {
      location: `${baseUrl}/sitemap-effects.xml`,
      lastmod: currentDate
    },
    {
      location: `${baseUrl}/sitemap-users.xml`,
      lastmod: currentDate
    },
    {
      location: `${baseUrl}/sitemap-posts.xml`,
      lastmod: currentDate
    }
  ];

  return generateSitemapIndexXML(sitemaps);
};

// API functions for sitemap generation (to be called by backend)
export const generateAllSitemaps = async (data?: {
  effects?: any[];
  users?: any[];
  posts?: any[];
}) => {
  const sitemaps = {
    index: await generateSitemapIndex(),
    main: await generateMainSitemap(),
    effects: await generateEffectsSitemap(data?.effects),
    users: await generateUsersSitemap(data?.users),
    posts: await generatePostsSitemap(data?.posts)
  };

  return sitemaps;
};

// Utility function to validate sitemap URLs
export const validateSitemapEntry = (entry: SitemapEntry): boolean => {
  try {
    new URL(entry.url);
    return true;
  } catch {
    return false;
  }
};

// Function to get sitemap priority based on page type
export const getSitemapPriority = (path: string): number => {
  if (path === '/') return 1.0;
  if (path === '/effects') return 0.9;
  if (path === '/community') return 0.8;
  if (path.startsWith('/effects/')) return 0.8;
  if (path.startsWith('/user/')) return 0.6;
  if (path.startsWith('/post/')) return 0.5;
  return 0.4;
};

// Function to get change frequency based on page type
export const getChangeFrequency = (path: string): SitemapEntry['changefreq'] => {
  if (path === '/') return 'daily';
  if (path === '/effects') return 'daily';
  if (path === '/community') return 'hourly';
  if (path.startsWith('/effects/')) return 'weekly';
  if (path.startsWith('/user/')) return 'weekly';
  if (path.startsWith('/post/')) return 'monthly';
  return 'monthly';
};

export default {
  generateMainSitemap,
  generateEffectsSitemap,
  generateUsersSitemap,
  generatePostsSitemap,
  generateSitemapIndex,
  generateAllSitemaps
};