import { Pool, PoolConfig } from "pg";
import dotenv from "dotenv";

// تحميل متغيرات البيئة
dotenv.config();

// إعدادات الاتصال بقاعدة البيانات
const config: PoolConfig = {
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://neondb_owner:npg_j0cReGDu8TNX@ep-red-paper-ae01fnqr-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: {
    rejectUnauthorized: false,
  },
  // Connection pool settings
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // how long to wait when connecting to database
  maxUses: 7500, // close (and replace) a connection after it has been used this many times
};

// إنشاء pool الاتصال
const pool = new Pool(config);

// Event listeners for pool
pool.on("connect", (client) => {
  console.log("🔗 New database client connected");
});

pool.on("error", (err, client) => {
  console.error("💥 Unexpected error on idle database client:", err);
  process.exit(-1);
});

pool.on("acquire", (client) => {
  console.log("📊 Client acquired from pool");
});

pool.on("release", (client) => {
  console.log("🔄 Client released back to pool");
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
    console.log("⏰ Database time:", result.rows[0].current_time);

    return true;
  } catch (error) {
    console.error("❌ Database connection test failed:", error);
    return false;
  }
}

// Helper function to execute queries with error handling
export async function query(text: string, params?: any[]): Promise<any> {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log("📝 Executed query", {
      text: text.substring(0, 50) + "...",
      duration: duration + "ms",
      rows: result.rowCount,
    });
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error("❌ Query error", {
      text: text.substring(0, 50) + "...",
      duration: duration + "ms",
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

// Graceful shutdown function
export async function closePool(): Promise<void> {
  try {
    await pool.end();
    console.log("✅ Database pool closed gracefully");
  } catch (error) {
    console.error("❌ Error closing database pool:", error);
    throw error;
  }
}

// Health check function
export async function healthCheck(): Promise<{
  status: string;
  database: string;
  timestamp: string;
  pool_stats: {
    total_count: number;
    idle_count: number;
    waiting_count: number;
  };
}> {
  try {
    const result = await pool.query("SELECT NOW() as current_time");

    return {
      status: "healthy",
      database: "connected",
      timestamp: result.rows[0].current_time,
      pool_stats: {
        total_count: pool.totalCount,
        idle_count: pool.idleCount,
        waiting_count: pool.waitingCount,
      },
    };
  } catch (error) {
    return {
      status: "unhealthy",
      database: "disconnected",
      timestamp: new Date().toISOString(),
      pool_stats: {
        total_count: pool.totalCount,
        idle_count: pool.idleCount,
        waiting_count: pool.waitingCount,
      },
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
  closePool,
  healthCheck,
};
