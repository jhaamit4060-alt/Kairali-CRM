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
    const [tracker] = await conn.query("SELECT * FROM ktahv_guest_tracker WHERE booking_id = 'KTAHV-PMS-9255'");
    console.log("TRACKER:", JSON.stringify(tracker, null, 2));
    
    const [booking] = await conn.query("SELECT * FROM ktahv_bookings_fms_v3_part1 WHERE reservation_id = 'KTAHV-PMS-9255'");
    console.log("BOOKING:", JSON.stringify(booking, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await conn.end();
    process.exit(0);
  }
}

run();
