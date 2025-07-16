import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./lib/db";
import employeeRoutes from "./routes/employees";

// تحميل متغيرات البيئة
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5173",
      "http://localhost:3001",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  if (req.method !== "GET") {
    console.log("Body:", JSON.stringify(req.body, null, 2));
  }
  next();
});

// Response logging middleware
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function (body) {
    if (res.statusCode >= 400) {
      console.log(`[ERROR] ${res.statusCode} - ${req.method} ${req.path}`);
      console.log("Response:", body);
    }
    return originalSend.call(this, body);
  };
  next();
});

// Test database connection on startup
async function testDatabaseConnection() {
  try {
    console.log("🔍 Testing database connection...");

    const result = await pool.query(
      "SELECT NOW() as current_time, version() as db_version"
    );
    console.log("✅ Database connected successfully!");
    console.log("⏰ Current time:", result.rows[0].current_time);
    console.log(
      "🗄️ Database version:",
      result.rows[0].db_version.split(" ")[0]
    );

    // Test if required tables exist
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('employees', 'attendance', 'financial_transactions')
      ORDER BY table_name
    `;

    const tablesResult = await pool.query(tablesQuery);
    const existingTables = tablesResult.rows.map((row) => row.table_name);

    console.log("📊 Available tables:", existingTables);

    const requiredTables = [
      "employees",
      "attendance",
      "financial_transactions",
    ];
    const missingTables = requiredTables.filter(
      (table) => !existingTables.includes(table)
    );

    if (missingTables.length > 0) {
      console.warn("⚠️ Missing tables:", missingTables);
      console.warn("Please run the database setup SQL script first.");
    }

    // Test employee count if employees table exists
    if (existingTables.includes("employees")) {
      try {
        const countQuery =
          "SELECT COUNT(*) as employee_count FROM employees WHERE is_active = true";
        const countResult = await pool.query(countQuery);
        console.log("👥 Active employees:", countResult.rows[0].employee_count);
      } catch (error) {
        console.warn("⚠️ Could not count employees:", error.message);
      }
    }

    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    console.error(
      "💡 Make sure your database is running and the connection string is correct."
    );
    return false;
  }
}

// Routes

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const dbResult = await pool.query("SELECT NOW() as db_time");
    res.json({
      status: "OK",
      message: "Employee Management API is running",
      timestamp: new Date().toISOString(),
      database: "Connected",
      server_time: new Date().toISOString(),
      db_time: dbResult.rows[0].db_time,
      version: "1.0.0",
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      message: "Database connection failed",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// Database test endpoint
app.get("/api/test-db", async (req, res) => {
  try {
    console.log("🧪 Running database test...");

    // Basic connection test
    const timeResult = await pool.query("SELECT NOW() as current_time");

    // Check tables
    const tablesQuery = `
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_name IN ('employees', 'attendance', 'financial_transactions')
      ORDER BY table_name
    `;
    const tablesResult = await pool.query(tablesQuery);

    // Check employee data
    let employeeStats = null;
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_employees,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_employees,
          COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_employees
        FROM employees
      `;
      const statsResult = await pool.query(statsQuery);
      employeeStats = statsResult.rows[0];
    } catch (error) {
      employeeStats = { error: "Employees table not accessible" };
    }

    res.json({
      status: "success",
      connection: "OK",
      timestamp: timeResult.rows[0].current_time,
      tables: tablesResult.rows,
      employee_stats: employeeStats,
      message: "Database test completed successfully",
    });

    console.log("✅ Database test completed successfully");
  } catch (error) {
    console.error("❌ Database test failed:", error);
    res.status(500).json({
      status: "error",
      connection: "FAILED",
      error: error.message,
      timestamp: new Date().toISOString(),
      message: "Database test failed",
    });
  }
});

// API routes
app.use("/api/employees", employeeRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "مرحباً بك في نظام إدارة الموظفين",
    api_version: "1.0.0",
    endpoints: {
      health: "/health",
      database_test: "/api/test-db",
      employees: "/api/employees",
      documentation: "قريباً...",
    },
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use(
  (
    error: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("💥 Unhandled error:", error);

    // Database errors
    if (error.code === "23505") {
      return res.status(409).json({
        error: "البيانات مكررة",
        details: "هذا السجل موجود بالفعل",
        timestamp: new Date().toISOString(),
      });
    }

    if (error.code === "23503") {
      return res.status(400).json({
        error: "مرجع غير صحيح",
        details: "البيانات المرجعية غير موجودة",
        timestamp: new Date().toISOString(),
      });
    }

    // Validation errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        error: "بيانات غير صحيحة",
        details: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    // Default error
    res.status(500).json({
      error: "خطأ داخلي في الخادم",
      details: error.message || "حدث خطأ غير متوقع",
      timestamp: new Date().toISOString(),
      request_id: req.headers["x-request-id"] || "unknown",
    });
  }
);

// 404 handler for undefined routes
app.use("*", (req, res) => {
  res.status(404).json({
    error: "المسار غير موجود",
    path: req.originalUrl,
    method: req.method,
    available_endpoints: [
      "GET /",
      "GET /health",
      "GET /api/test-db",
      "GET /api/employees",
      "POST /api/employees",
      "PUT /api/employees/:id",
      "DELETE /api/employees/:id",
      "POST /api/employees/:id/attendance",
      "POST /api/employees/:id/transactions",
      "POST /api/employees/:id/settle",
    ],
    timestamp: new Date().toISOString(),
  });
});

// Start server function
async function startServer() {
  try {
    console.log("🚀 Starting Employee Management Server...");

    // Test database connection first
    const dbConnected = await testDatabaseConnection();

    if (!dbConnected) {
      console.warn("⚠️ Starting server despite database connection issues...");
    }

    const server = app.listen(PORT, () => {
      console.log("=".repeat(50));
      console.log("🎉 Server is running successfully!");
      console.log("=".repeat(50));
      console.log(`📍 Server URL: http://localhost:${PORT}`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`🧪 Database Test: http://localhost:${PORT}/api/test-db`);
      console.log(`👥 Employees API: http://localhost:${PORT}/api/employees`);
      console.log("=".repeat(50));
      console.log("📝 Server logs:");
    });

    return server;
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown handling
process.on("SIGINT", async () => {
  console.log("\n🛑 Received SIGINT. Shutting down gracefully...");
  try {
    await pool.end();
    console.log("✅ Database connection closed.");
    console.log("👋 Server stopped. Goodbye!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Received SIGTERM. Shutting down gracefully...");
  try {
    await pool.end();
    console.log("✅ Database connection closed.");
    console.log("👋 Server stopped. Goodbye!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

export default app;
