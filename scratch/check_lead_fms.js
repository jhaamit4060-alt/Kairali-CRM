const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'db_schema.json');
if (fs.existsSync(schemaPath)) {
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  console.log('Tables present in details keys:', Object.keys(schema.details));
  
  if (schema.details['lead_fms']) {
    console.log('\nlead_fms schema details:');
    console.log(JSON.stringify(schema.details['lead_fms'], null, 2));
  } else {
    console.log('\nlead_fms table details not found in JSON.');
  }
} else {
  console.log('schema file not found');
}
