// db.js
import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT || 5432,
});

// Test DB connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log("✅ PostgreSQL connected successfully");
    client.release(); // release the client back to the pool
  } catch (err) {
    console.error("❌ PostgreSQL connection failed:", err.message);
    process.exit(1); // optional: exit if connection fails
  }
};

testConnection();

export default pool;
