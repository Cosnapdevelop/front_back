#!/usr/bin/env node

/**
 * Backend Health Checker for Render Deployment
 * Checks if the backend service is running and has the latest API endpoints
 */

// Using built-in fetch API (Node.js 18+)

const BACKEND_URL = 'https://cosnap-back.onrender.com';

async function checkEndpoint(endpoint, method = 'GET') {
  try {
    console.log(`📡 Checking ${method} ${endpoint}...`);
    
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.text();
      console.log(`   ✅ Response: ${data.substring(0, 100)}${data.length > 100 ? '...' : ''}`);
    } else {
      const error = await response.text();
      console.log(`   ❌ Error: ${error.substring(0, 200)}`);
    }
    
    return { status: response.status, ok: response.ok };
    
  } catch (error) {
    console.log(`   💥 Network Error: ${error.message}`);
    return { status: 0, ok: false, error: error.message };
  }
}

async function main() {
  console.log('🔍 Backend Service Health Check');
  console.log('=====================================\n');
  
  const endpoints = [
    { path: '/health', method: 'GET', description: 'Basic health check' },
    { path: '/api/admin/generate-admin-key', method: 'POST', description: 'Admin key generation (new)' },
    { path: '/api/admin/database-stats', method: 'GET', description: 'Admin stats endpoint (new)' },
    { path: '/auth/me', method: 'GET', description: 'Auth endpoint (existing)' }
  ];

  const results = [];
  
  for (const endpoint of endpoints) {
    console.log(`\n🎯 ${endpoint.description}`);
    const result = await checkEndpoint(endpoint.path, endpoint.method);
    results.push({ ...endpoint, ...result });
    
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n📊 Summary Report');
  console.log('=================');
  
  results.forEach(result => {
    const status = result.ok ? '✅' : '❌';
    console.log(`${status} ${result.method} ${result.path} (${result.status || 'N/A'})`);
  });

  const newEndpointsWorking = results
    .filter(r => r.path.startsWith('/api/admin'))
    .every(r => r.status === 500 || r.status === 403); // 500/403 means endpoint exists but needs auth

  const serviceUp = results.some(r => r.ok);

  console.log('\n🎯 Deployment Status Analysis:');
  
  if (serviceUp) {
    console.log('✅ Backend service is running');
    
    if (newEndpointsWorking) {
      console.log('✅ New admin API endpoints are deployed');
      console.log('💡 500 errors are expected without proper admin key');
    } else {
      console.log('⚠️  New admin API endpoints may not be deployed yet');
      console.log('💡 Render may still be building/deploying the latest code');
    }
  } else {
    console.log('❌ Backend service appears to be down or unreachable');
    console.log('💡 This could be due to:');
    console.log('   - Render service is restarting');
    console.log('   - Deployment is in progress');
    console.log('   - Network connectivity issues');
  }

  console.log('\n🚀 Next Steps:');
  if (serviceUp && newEndpointsWorking) {
    console.log('1. Add the generated admin key to Render environment variables');
    console.log('2. Redeploy the service');
    console.log('3. Test the reset tool again');
  } else {
    console.log('1. Check Render Dashboard for deployment status');
    console.log('2. Review deployment logs for errors');
    console.log('3. Wait 2-3 minutes for deployment to complete');
  }
}

main().catch(console.error);