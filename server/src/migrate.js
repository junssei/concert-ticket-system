import { query, getPool } from './db.js';

export async function migrate() {
  // Ensure pool is available
  const pool = await getPool();
  if (!pool) {
    console.warn('[migrate] Database not configured; skipping migrations');
    return;
  }

  // Create tables if not exist
  await query(`
    CREATE TABLE IF NOT EXISTS reservations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      event_id VARCHAR(128),
      event_name VARCHAR(512),
      user_email VARCHAR(256),
      seats_json JSON,
      price_per_seat DECIMAL(10,2),
      total DECIMAL(10,2),
      status VARCHAR(64) DEFAULT 'pending_approval',
      payment_id VARCHAR(128),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      provider VARCHAR(64),
      external_id VARCHAR(128),
      status VARCHAR(64),
      amount DECIMAL(10,2),
      currency VARCHAR(16) DEFAULT 'USD',
      raw_json JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_external_id (external_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  console.log('[migrate] Migrations ensured');
}
