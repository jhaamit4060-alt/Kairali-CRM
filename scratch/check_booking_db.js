const mysql = require('mysql2/promise');
const fs = require('fs');

const env = {};
fs.readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length > 1) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^"|"$/g, '');
  }
});

async function check() {
  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  });

  try {
    const [rows] = await connection.execute(
      'SELECT id, reservation_id, stage3_help_slip_created_status FROM ktahv_account_tracker LIMIT 5'
    );
    console.log('Bookings for checkout:', rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await connection.end();
  }
}

check();
