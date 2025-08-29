#!/usr/bin/env node

// Quick admin key test
const BACKEND_URL = 'https://cosnap-back.onrender.com';
const OLD_KEY = '50ea063c4682b9bd053479431685606ad9e0a13abd23fd29c8e49ce54b6d4247';
const NEW_KEY = '4e8c81709356c81955bfd63c43df19ce';

async function testKey(key, name) {
  try {
    console.log(`🔑 Testing ${name}: ${key.substring(0, 8)}...`);
    
    const response = await fetch(`${BACKEND_URL}/api/admin/database-stats`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'X-Admin-Key': key
      }
    });

    console.log(`   Status: ${response.status}`);
    const result = await response.json();
    
    if (result.success) {
      console.log(`   ✅ SUCCESS: Found ${result.stats.users} users`);
      return true;
    } else {
      console.log(`   ❌ FAILED: ${result.error}`);
      return false;
    }
    
  } catch (error) {
    console.log(`   💥 ERROR: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🧪 Admin Key Verification Test\n');
  
  await testKey(OLD_KEY, 'Original Key');
  console.log('');
  await testKey(NEW_KEY, 'New Short Key');
  
  console.log('\n💡 Use the key that shows ✅ SUCCESS in your reset tool.');
}

main().catch(console.error);