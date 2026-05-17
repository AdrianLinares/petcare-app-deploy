const bcrypt = require('bcrypt');

const password = 'password123';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, function(err, hash) {
  if (err) {
    console.error('Error:', err);
    return;
  }
  console.log('\n=== Password Hash for: password123 ===');
  console.log(hash);
  console.log('\nUpdate your seed script with this hash, or run this SQL:');
  console.log(`\nUPDATE users SET password_hash = '${hash}' WHERE email IN ('owner@petcare.com', 'vet@petcare.com', 'admin@petcare.com');\n`);
});
