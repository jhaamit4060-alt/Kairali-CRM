const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: '165.22.220.165',
  port: 3306,
  database: 'spalabsdomain_Kairali_CRM_Db',
  user: 'spalabsdomain_developer',
  password: 'Kai#ra$li@123!',
};

async function main() {
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
