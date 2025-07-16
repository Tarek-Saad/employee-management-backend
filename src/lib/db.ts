import { Pool, PoolConfig } from "pg";
import dotenv from "dotenv";

// تحميل متغيرات البيئة
dotenv.config();

// إعدادات الاتصال بقاعدة البيانات - محسنة للـ serverless
const config: PoolConfig = {
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://neondb_owner:npg_j0cReGDu8TNX@ep-red-paper-ae01fnqr-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: {
    rejectUnauthorized: false,
  },
  // Serverless-optimized connection pool settings
  max: 1, // Keep minimal connections for serverless
  idleTimeoutMillis: 0, // Close idle connections immediately
  connectionTimeoutMillis: 10000, // Longer timeout for serverless cold starts
  allowExitOnIdle: true, // Allow process to exit when all connections are idle
};

// إنشاء pool الاتصال
const pool = new Pool(config);

// Simplified event listeners for serverless
pool.on("error", (err) => {
  console.error("💥 Database pool error:", err);
});

// Helper function to test connection
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    const result = await client.query(
      "SELECT NOW() as current_time, version() as version"
    );
    client.release();

    console.log("✅ Database connection test successful");
    return true;
  } catch (error) {
    console.error("❌ Database connection test failed:", error);
    return false;
  }
}

// Helper function to execute queries with error handling
export async function query(text: string, params?: any[]): Promise<any> {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error("❌ Query error:", {
      text: text.substring(0, 50) + "...",
      error: error.message,
    });
    throw error;
  }
}

// Helper function to execute transaction
export async function transaction(
  callback: (client: any) => Promise<any>
): Promise<any> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Simplified health check for serverless
export async function healthCheck(): Promise<{
  status: string;
  database: string;
  timestamp: string;
}> {
  try {
    const result = await pool.query("SELECT NOW() as current_time");
    return {
      status: "healthy",
      database: "connected",
      timestamp: result.rows[0].current_time,
    };
  } catch (error) {
    return {
      status: "unhealthy",
      database: "disconnected",
      timestamp: new Date().toISOString(),
    };
  }
}

// Export the pool for direct use
export { pool };

// Default export
export default {
  pool,
  query,
  transaction,
  testConnection,
  healthCheck,
};
