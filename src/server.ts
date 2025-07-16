import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./lib/db";
import employeeRoutes from "./routes/employees";

// تحميل متغيرات البيئة
dotenv.config();

const app = express();

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5173",
      "http://localhost:3001",
      // إضافة Vercel domains
      "https://*.vercel.app",
      "https://yourdomain.com", // حط domain بتاعك هنا
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware (مُبسط للـ serverless)
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== "production") {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
  }
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "نظام إدارة الموظفين يعمل بشكل طبيعي",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
  });
});

// Database test endpoint
app.get("/api/test-db", async (req, res) => {
  try {
    console.log("🔍 Testing database connection...");

    // Basic connection test
    const timeResult = await pool.query("SELECT NOW() as current_time");

    // Check tables
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('employees', 'attendance', 'financial_transactions')
      ORDER BY table_name
    `;
    const tablesResult = await pool.query(tablesQuery);

    // Employee stats (optional)
    let employeeStats = {};
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_employees,
          COUNT(CASE WHEN payment_status = 'settled' THEN 1 END) as settled_employees,
          COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_employees
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

// ============================================
// تم إزالة منطق بدء الخادم للـ Serverless
// ============================================

// Export the Express app for Vercel
export default app;
