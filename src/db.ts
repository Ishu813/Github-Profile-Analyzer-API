import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString)
  throw new Error("DATABASE_URL is not set in environment variables");

export const pool = mysql.createPool(connectionString);

export async function initializeDatabase(): Promise<void> {
  await pool.query("SELECT 1");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS github_profiles (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      username        VARCHAR(255)  NOT NULL UNIQUE,
      name            VARCHAR(255),
      bio             TEXT,
      public_repos    INT           NOT NULL DEFAULT 0,
      followers       INT           NOT NULL DEFAULT 0,
      following       INT           NOT NULL DEFAULT 0
    )
  `);
}
