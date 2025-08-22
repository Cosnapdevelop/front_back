// Quick test for sitemap generation functionality
import { 
  generateMainSitemap, 
  generateEffectsSitemap, 
  generateSitemapIndex,
  generateAllSitemaps 
} from './src/utils/seo/sitemapGenerator.js';

async function testSitemapGeneration() {
  console.log('Testing sitemap generation...');
  
  try {
    // Test main sitemap
    console.log('\n1. Testing main sitemap generation...');
    const mainSitemap = await generateMainSitemap();
    console.log('Main sitemap generated successfully');
    console.log('Sample content:', mainSitemap.substring(0, 200) + '...');

    // Test effects sitemap with sample data
    console.log('\n2. Testing effects sitemap generation...');
    const sampleEffects = [
      { id: 1, name: 'Portrait Enhancement', slug: 'portrait-enhancement', updatedAt: new Date().toISOString() },
      { id: 2, name: 'Artistic Filter', slug: 'artistic-filter', updatedAt: new Date().toISOString() }
    ];
    const effectsSitemap = await generateEffectsSitemap(sampleEffects);
    console.log('Effects sitemap generated successfully');
    console.log('Sample content:', effectsSitemap.substring(0, 200) + '...');

    // Test sitemap index
    console.log('\n3. Testing sitemap index generation...');
    const sitemapIndex = await generateSitemapIndex();
    console.log('Sitemap index generated successfully');
    console.log('Sample content:', sitemapIndex.substring(0, 200) + '...');

    // Test all sitemaps generation
    console.log('\n4. Testing all sitemaps generation...');
    const allSitemaps = await generateAllSitemaps({
      effects: sampleEffects,
      users: [{ id: 1, isPublic: true, updatedAt: new Date().toISOString() }],
      posts: [{ id: 1, isPublic: true, updatedAt: new Date().toISOString() }]
    });
    
    console.log('All sitemaps generated successfully');
    console.log('Generated sitemaps:', Object.keys(allSitemaps));

    console.log('\n✅ All sitemap generation tests passed!');
    
  } catch (error) {
    console.error('❌ Sitemap generation test failed:', error);
  }
}

// Run the test
testSitemapGeneration();