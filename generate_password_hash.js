const bcrypt = require('bcryptjs');

async function generateHash() {
  console.log('🔒 Password Hash Generator');
  console.log('='.repeat(80));
  
  const passwords = [
    'EventMarketers2024!',
    'admin123',
    'Admin@123'
  ];
  
  console.log('\n📝 Generating bcrypt hashes for passwords...\n');
  
  for (const password of passwords) {
    const hash = await bcrypt.hash(password, 12);
    console.log(`Password: ${password}`);
    console.log(`Hash:     ${hash}`);
    console.log('-'.repeat(80));
  }
  
  console.log('\n✅ Done! Copy the hash you need for SQL INSERT');
  console.log('='.repeat(80));
}

generateHash();






