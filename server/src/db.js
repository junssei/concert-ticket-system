import mysql from 'mysql2/promise';

let pool = null;

function getConfigFromEnv() {
  const url = process.env.DATABASE_URL || process.env.MYSQL_URL;
  if (url) {
    return { url };
  }
  const host = process.env.MYSQL_HOST;
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE;
  const port = Number(process.env.MYSQL_PORT || 3306);
  if (host && user && database) {
    return { host, user, password, database, port };
  }
  return null;
}

export async function getPool() {
  if (pool) return pool;
  const cfg = getConfigFromEnv();
  if (!cfg) return null; // not configured yet

  if (cfg.url) {
    pool = mysql.createPool({
      uri: cfg.url,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      // ssl: { rejectUnauthorized: true }, // enable if your provider requires SSL
    });
  } else {
    pool = mysql.createPool({
      host: cfg.host,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      port: cfg.port,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}

export async function query(sql, params = []) {
  const p = await getPool();
  if (!p) throw new Error('Database not configured');
  const [rows] = await p.execute(sql, params);
  return rows;
}
