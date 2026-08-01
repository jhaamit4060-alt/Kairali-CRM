const mysql = require("mysql2/promise");

async function run() {
  const conn = await mysql.createConnection({
    host: '165.22.220.165',
    port: 3306,
    database: 'spalabsdomain_Kairali_CRM_Db',
    user: 'spalabsdomain_developer',
    password: '$c0%r!zKF~66=,q{',
  });
  try {
    const [rows] = await conn.query("SHOW COLUMNS FROM ktahv_bookings_fms_v3_part1 LIKE 'nb_aphs_approved_till_date'");
    console.log("UPDATED COLUMN:", JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await conn.end();
    process.exit(0);
  }
}

run();
