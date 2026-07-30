const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

async function main() {
  if (!DB_CONFIG.host || !DB_CONFIG.database || !DB_CONFIG.user || !DB_CONFIG.password) {
    throw new Error('DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD are required');
  }
  const connection = await mysql.createConnection(DB_CONFIG);
  try {
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('Tables in database:', tables.map(t => Object.values(t)[0]));
    
    // Check if table 'leads' exists
    const tableNames = tables.map(t => Object.values(t)[0]);
    const leadsTable = tableNames.find(t => t.toLowerCase() === 'leads');
    if (leadsTable) {
      console.log(`\nDescribing '${leadsTable}':`);
      const [columns] = await connection.execute(`DESCRIBE ${leadsTable}`);
      console.log(columns);
    } else {
      console.log('\nNo table named "leads" (case-insensitive) found.');
      // Find tables that contain 'lead'
      const similarTables = tableNames.filter(t => t.toLowerCase().includes('lead'));
      console.log('Similar tables:', similarTables);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await connection.end();
  }
}

main();
