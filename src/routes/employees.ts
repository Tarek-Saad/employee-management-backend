import express, { Request, Response, NextFunction } from "express";
import { EmployeeService } from "../services/employeeService";
import {
  CreateEmployeeDTO,
  UpdateEmployeeDTO,
  CreateTransactionDTO,
  MarkAttendanceDTO,
  ApiResponse,
  PaginationParams,
  EmployeeSearchCriteria,
  isValidPaymentStatus,
  isValidAttendanceStatus,
  isValidTransactionType,
} from "../types/employee";

const router = express.Router();

// Middleware for request validation
const validateEmployeeId = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const employeeId = parseInt(req.params.id);

  if (isNaN(employeeId) || employeeId <= 0) {
    return res.status(400).json({
      success: false,
      error: "معرف الموظف غير صحيح",
      message: "يجب أن يكون معرف الموظف رقم صحيح وموجب",
      timestamp: new Date().toISOString(),
    });
  }

  req.params.id = employeeId.toString();
  next();
};

// Helper function to create API response
const createResponse = <T>(
  success: boolean,
  data?: T,
  error?: string,
  message?: string
): ApiResponse<T> => ({
  success,
  data,
  error,
  message,
  timestamp: new Date().toISOString(),
});

// ==================== EMPLOYEE CRUD ROUTES ====================

// GET /api/employees - جلب جميع الموظفين
router.get("/", async (req: Request, res: Response) => {
  try {
    console.log("🔍 GET /api/employees - Fetching all employees");
    console.log("Query params:", req.query);

    // Parse search criteria
    const searchCriteria: EmployeeSearchCriteria = {};

    if (req.query.name) {
      searchCriteria.name = req.query.name as string;
    }

    if (req.query.position) {
      searchCriteria.position = req.query.position as string;
    }

    if (
      req.query.payment_status &&
      isValidPaymentStatus(req.query.payment_status as string)
    ) {
      searchCriteria.payment_status = req.query.payment_status as any;
    }

    if (
      req.query.attendance_status &&
      isValidAttendanceStatus(req.query.attendance_status as string)
    ) {
      searchCriteria.attendance_status = req.query.attendance_status as any;
    }

    if (req.query.is_active !== undefined) {
      searchCriteria.is_active = req.query.is_active === "true";
    }

    // Parse pagination
    const pagination: PaginationParams | undefined = req.query.page
      ? {
          page: parseInt(req.query.page as string) || 1,
          limit: parseInt(req.query.limit as string) || 50,
          sort_by: req.query.sort_by as string,
          sort_order:
            (req.query.sort_order as string)?.toUpperCase() === "DESC"
              ? "DESC"
              : "ASC",
        }
      : undefined;

    const employees = await EmployeeService.getAllEmployees(
      searchCriteria,
      pagination
    );

    console.log(`✅ Successfully fetched ${employees.length} employees`);
    res.json(
      createResponse(
        true,
        employees,
        undefined,
        `تم جلب ${employees.length} موظف بنجاح`
      )
    );
  } catch (error) {
    console.error("❌ Error in GET /api/employees:", error);
    res
      .status(500)
      .json(
        createResponse(
          false,
          undefined,
          error.message,
          "فشل في جلب بيانات الموظفين"
        )
      );
  }
});

// GET /api/employees/:id - جلب موظف بالمعرف
router.get("/:id", validateEmployeeId, async (req: Request, res: Response) => {
  try {
    const employeeId = parseInt(req.params.id);
    console.log(
      `🔍 GET /api/employees/${employeeId} - Fetching employee by ID`
    );

    const employee = await EmployeeService.getEmployeeById(employeeId);

    if (!employee) {
      console.log(`❌ Employee ${employeeId} not found`);
      return res
        .status(404)
        .json(
          createResponse(
            false,
            undefined,
            "الموظف غير موجود",
            "لم يتم العثور على الموظف المطلوب"
          )
        );
    }

    console.log(`✅ Successfully fetched employee: ${employee.name}`);
    res.json(
      createResponse(true, employee, undefined, "تم جلب بيانات الموظف بنجاح")
    );
  } catch (error) {
    console.error(`❌ Error in GET /api/employees/${req.params.id}:`, error);
    res
      .status(500)
      .json(
        createResponse(
          false,
          undefined,
          error.message,
          "فشل في جلب بيانات الموظف"
        )
      );
  }
});

// POST /api/employees - إضافة موظف جديد
router.post("/", async (req: Request, res: Response) => {
  try {
    console.log("➕ POST /api/employees - Adding new employee");
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    // Validate required fields
    const { name, position, daily_wage } = req.body;

    if (!name || !position || daily_wage === undefined) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            undefined,
            "بيانات ناقصة",
            "الاسم والمنصب والأجر اليومي مطلوبان"
          )
        );
    }

    const employeeData: CreateEmployeeDTO = {
      name: name.trim(),
      position: position.trim(),
      phone: req.body.phone?.trim() || "",
      daily_wage: parseFloat(daily_wage),
      current_balance: parseFloat(req.body.current_balance) || 0,
    };

    // Additional validation
    if (employeeData.daily_wage < 0) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            undefined,
            "الأجر اليومي غير صحيح",
            "يجب أن يكون الأجر اليومي رقم موجب"
          )
        );
    }

    const employee = await EmployeeService.addEmployee(employeeData);

    console.log(
      `✅ Successfully added employee: ${employee.name} with ID: ${employee.id}`
    );
    res
      .status(201)
      .json(createResponse(true, employee, undefined, "تم إضافة الموظف بنجاح"));
  } catch (error) {
    console.error("❌ Error in POST /api/employees:", error);
    if (error.message.includes("بيانات غير صحيحة")) {
      res
        .status(400)
        .json(
          createResponse(false, undefined, error.message, "فشل في إضافة الموظف")
        );
    } else {
      res
        .status(500)
        .json(
          createResponse(false, undefined, error.message, "فشل في إضافة الموظف")
        );
    }
  }
});

// PUT /api/employees/:id - تحديث بيانات موظف
router.put("/:id", validateEmployeeId, async (req: Request, res: Response) => {
  try {
    const employeeId = parseInt(req.params.id);
    console.log(`📝 PUT /api/employees/${employeeId} - Updating employee`);
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    const updates: UpdateEmployeeDTO = {};

    // Only include fields that are present in request body
    if (req.body.name !== undefined) {
      updates.name = req.body.name.trim();
    }

    if (req.body.position !== undefined) {
      updates.position = req.body.position.trim();
    }

    if (req.body.phone !== undefined) {
      updates.phone = req.body.phone.trim();
    }

    if (req.body.daily_wage !== undefined) {
      updates.daily_wage = parseFloat(req.body.daily_wage);
      if (updates.daily_wage < 0) {
        return res
          .status(400)
          .json(
            createResponse(
              false,
              undefined,
              "الأجر اليومي غير صحيح",
              "يجب أن يكون الأجر اليومي رقم موجب"
            )
          );
      }
    }

    if (req.body.current_balance !== undefined) {
      updates.current_balance = parseFloat(req.body.current_balance);
    }

    if (
      req.body.payment_status !== undefined &&
      isValidPaymentStatus(req.body.payment_status)
    ) {
      updates.payment_status = req.body.payment_status;
    }

    if (req.body.is_active !== undefined) {
      updates.is_active = Boolean(req.body.is_active);
    }

    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            undefined,
            "لا توجد بيانات للتحديث",
            "يجب تقديم بيانات للتحديث"
          )
        );
    }

    const employee = await EmployeeService.updateEmployee(employeeId, updates);

    console.log(`✅ Successfully updated employee: ${employee.name}`);
    res.json(
      createResponse(true, employee, undefined, "تم تحديث بيانات الموظف بنجاح")
    );
  } catch (error) {
    console.error(`❌ Error in PUT /api/employees/${req.params.id}:`, error);
    if (
      error.message.includes("غير موجود") ||
      error.message.includes("غير نشط")
    ) {
      res
        .status(404)
        .json(
          createResponse(false, undefined, error.message, "فشل في تحديث الموظف")
        );
    } else {
      res
        .status(500)
        .json(
          createResponse(false, undefined, error.message, "فشل في تحديث الموظف")
        );
    }
  }
});

// DELETE /api/employees/:id - حذف (تعطيل) موظف
router.delete(
  "/:id",
  validateEmployeeId,
  async (req: Request, res: Response) => {
    try {
      const employeeId = parseInt(req.params.id);
      console.log(
        `🗑️ DELETE /api/employees/${employeeId} - Deactivating employee`
      );

      const success = await EmployeeService.deleteEmployee(employeeId);

      console.log(`✅ Successfully deactivated employee ID: ${employeeId}`);
      res.json(
        createResponse(
          true,
          { deleted: success },
          undefined,
          "تم حذف الموظف بنجاح"
        )
      );
    } catch (error) {
      console.error(
        `❌ Error in DELETE /api/employees/${req.params.id}:`,
        error
      );
      if (error.message.includes("غير موجود")) {
        res
          .status(404)
          .json(
            createResponse(false, undefined, error.message, "فشل في حذف الموظف")
          );
      } else {
        res
          .status(500)
          .json(
            createResponse(false, undefined, error.message, "فشل في حذف الموظف")
          );
      }
    }
  }
);

// ==================== ATTENDANCE ROUTES ====================

// POST /api/employees/:id/attendance - تسجيل الحضور
router.post(
  "/:id/attendance",
  validateEmployeeId,
  async (req: Request, res: Response) => {
    try {
      const employeeId = parseInt(req.params.id);
      console.log(
        `📅 POST /api/employees/${employeeId}/attendance - Marking attendance`
      );
      console.log("Request body:", JSON.stringify(req.body, null, 2));

      const { status, attendance_date, check_in_time, check_out_time, notes } =
        req.body;

      if (!status || !isValidAttendanceStatus(status)) {
        return res
          .status(400)
          .json(
            createResponse(
              false,
              undefined,
              "حالة الحضور غير صحيحة",
              'حالة الحضور يجب أن تكون "present" أو "absent"'
            )
          );
      }

      const attendanceData: MarkAttendanceDTO = {
        status,
        attendance_date,
        check_in_time,
        check_out_time,
        notes,
      };

      const attendance = await EmployeeService.markAttendance(
        employeeId,
        attendanceData
      );

      console.log(
        `✅ Successfully marked attendance for employee ${employeeId}: ${status}`
      );
      res.json(
        createResponse(true, attendance, undefined, "تم تسجيل الحضور بنجاح")
      );
    } catch (error) {
      console.error(
        `❌ Error in POST /api/employees/${req.params.id}/attendance:`,
        error
      );
      res
        .status(500)
        .json(
          createResponse(false, undefined, error.message, "فشل في تسجيل الحضور")
        );
    }
  }
);

// GET /api/employees/:id/attendance - جلب سجل الحضور
router.get(
  "/:id/attendance",
  validateEmployeeId,
  async (req: Request, res: Response) => {
    try {
      const employeeId = parseInt(req.params.id);
      const startDate = req.query.start_date as string;
      const endDate = req.query.end_date as string;

      console.log(
        `📊 GET /api/employees/${employeeId}/attendance - Fetching attendance history`
      );

      const attendance = await EmployeeService.getAttendanceHistory(
        employeeId,
        startDate,
        endDate
      );

      console.log(
        `✅ Successfully fetched ${attendance.length} attendance records`
      );
      res.json(
        createResponse(
          true,
          attendance,
          undefined,
          `تم جلب ${attendance.length} سجل حضور`
        )
      );
    } catch (error) {
      console.error(
        `❌ Error in GET /api/employees/${req.params.id}/attendance:`,
        error
      );
      res
        .status(500)
        .json(
          createResponse(
            false,
            undefined,
            error.message,
            "فشل في جلب سجل الحضور"
          )
        );
    }
  }
);

// ==================== FINANCIAL ROUTES ====================

// POST /api/employees/:id/transactions - إضافة معاملة مالية
router.post(
  "/:id/transactions",
  validateEmployeeId,
  async (req: Request, res: Response) => {
    try {
      const employeeId = parseInt(req.params.id);
      console.log(
        `💰 POST /api/employees/${employeeId}/transactions - Adding financial transaction`
      );
      console.log("Request body:", JSON.stringify(req.body, null, 2));

      const {
        transaction_type,
        amount,
        description,
        transaction_date,
        created_by,
      } = req.body;

      if (!transaction_type || !isValidTransactionType(transaction_type)) {
        return res
          .status(400)
          .json(
            createResponse(
              false,
              undefined,
              "نوع المعاملة غير صحيح",
              "نوع المعاملة يجب أن يكون أحد القيم: withdrawal, deduction, bonus, salary_payment"
            )
          );
      }

      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res
          .status(400)
          .json(
            createResponse(
              false,
              undefined,
              "المبلغ غير صحيح",
              "المبلغ يجب أن يكون رقم موجب"
            )
          );
      }

      const transactionData: CreateTransactionDTO = {
        transaction_type,
        amount: parseFloat(amount),
        description,
        transaction_date,
        created_by,
      };

      const transaction = await EmployeeService.addFinancialTransaction(
        employeeId,
        transactionData
      );

      console.log(
        `✅ Successfully added ${transaction_type} transaction: ${amount} ج.م`
      );
      res
        .status(201)
        .json(
          createResponse(
            true,
            transaction,
            undefined,
            "تم إضافة المعاملة المالية بنجاح"
          )
        );
    } catch (error) {
      console.error(
        `❌ Error in POST /api/employees/${req.params.id}/transactions:`,
        error
      );
      if (
        error.message.includes("أكبر من الرصيد") ||
        error.message.includes("غير موجود")
      ) {
        res
          .status(400)
          .json(
            createResponse(
              false,
              undefined,
              error.message,
              "فشل في إضافة المعاملة"
            )
          );
      } else {
        res
          .status(500)
          .json(
            createResponse(
              false,
              undefined,
              error.message,
              "فشل في إضافة المعاملة"
            )
          );
      }
    }
  }
);

// GET /api/employees/:id/transactions - جلب معاملات الموظف
router.get(
  "/:id/transactions",
  validateEmployeeId,
  async (req: Request, res: Response) => {
    try {
      const employeeId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 50;

      console.log(
        `📊 GET /api/employees/${employeeId}/transactions - Fetching transactions`
      );

      const transactions = await EmployeeService.getEmployeeTransactions(
        employeeId,
        limit
      );

      console.log(
        `✅ Successfully fetched ${transactions.length} transactions`
      );
      res.json(
        createResponse(
          true,
          transactions,
          undefined,
          `تم جلب ${transactions.length} معاملة مالية`
        )
      );
    } catch (error) {
      console.error(
        `❌ Error in GET /api/employees/${req.params.id}/transactions:`,
        error
      );
      res
        .status(500)
        .json(
          createResponse(
            false,
            undefined,
            error.message,
            "فشل في جلب المعاملات المالية"
          )
        );
    }
  }
);

// POST /api/employees/:id/settle - تسوية الحساب
router.post(
  "/:id/settle",
  validateEmployeeId,
  async (req: Request, res: Response) => {
    try {
      const employeeId = parseInt(req.params.id);
      console.log(
        `💳 POST /api/employees/${employeeId}/settle - Settling account`
      );

      const success = await EmployeeService.settleEmployeeAccount(employeeId);

      console.log(`✅ Successfully settled account for employee ${employeeId}`);
      res.json(
        createResponse(
          true,
          { settled: success },
          undefined,
          "تم تسوية الحساب بنجاح"
        )
      );
    } catch (error) {
      console.error(
        `❌ Error in POST /api/employees/${req.params.id}/settle:`,
        error
      );
      if (
        error.message.includes("لا يوجد رصيد") ||
        error.message.includes("غير موجود")
      ) {
        res
          .status(400)
          .json(
            createResponse(
              false,
              undefined,
              error.message,
              "فشل في تسوية الحساب"
            )
          );
      } else {
        res
          .status(500)
          .json(
            createResponse(
              false,
              undefined,
              error.message,
              "فشل في تسوية الحساب"
            )
          );
      }
    }
  }
);

// ==================== REPORTING ROUTES ====================

// GET /api/employees/reports/summary - ملخص الموظفين
router.get("/reports/summary", async (req: Request, res: Response) => {
  try {
    console.log(
      "📊 GET /api/employees/reports/summary - Fetching employee summary"
    );

    const summary = await EmployeeService.getEmployeeSummary();

    console.log("✅ Successfully generated employee summary");
    res.json(
      createResponse(true, summary, undefined, "تم إنشاء ملخص الموظفين بنجاح")
    );
  } catch (error) {
    console.error("❌ Error in GET /api/employees/reports/summary:", error);
    res
      .status(500)
      .json(
        createResponse(
          false,
          undefined,
          error.message,
          "فشل في إنشاء ملخص الموظفين"
        )
      );
  }
});

// GET /api/employees/reports/attendance - تقرير الحضور
router.get("/reports/attendance", async (req: Request, res: Response) => {
  try {
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json(
          createResponse(
            false,
            undefined,
            "تواريخ غير مكتملة",
            "يجب تقديم تاريخ البداية وتاريخ النهاية"
          )
        );
    }

    console.log(
      `📊 GET /api/employees/reports/attendance - Generating attendance report from ${startDate} to ${endDate}`
    );

    const report = await EmployeeService.getAttendanceReport(
      startDate,
      endDate
    );

    console.log(
      `✅ Successfully generated attendance report for ${report.length} employees`
    );
    res.json(
      createResponse(true, report, undefined, "تم إنشاء تقرير الحضور بنجاح")
    );
  } catch (error) {
    console.error("❌ Error in GET /api/employees/reports/attendance:", error);
    res
      .status(500)
      .json(
        createResponse(
          false,
          undefined,
          error.message,
          "فشل في إنشاء تقرير الحضور"
        )
      );
  }
});

// ==================== UTILITY ROUTES ====================

// GET /api/employees/test - اختبار الخدمة
router.get("/test", async (req: Request, res: Response) => {
  try {
    console.log("🧪 GET /api/employees/test - Testing employee service");

    const isConnected = await EmployeeService.testConnection();

    if (isConnected) {
      res.json(
        createResponse(
          true,
          { connected: true },
          undefined,
          "خدمة الموظفين تعمل بشكل صحيح"
        )
      );
    } else {
      res
        .status(500)
        .json(
          createResponse(
            false,
            { connected: false },
            "فشل الاتصال بقاعدة البيانات",
            "خدمة الموظفين لا تعمل"
          )
        );
    }
  } catch (error) {
    console.error("❌ Error in GET /api/employees/test:", error);
    res
      .status(500)
      .json(
        createResponse(false, undefined, error.message, "فشل في اختبار الخدمة")
      );
  }
});

// Handle 404 for employee routes
router.use("*", (req: Request, res: Response) => {
  res
    .status(404)
    .json(
      createResponse(
        false,
        undefined,
        "المسار غير موجود",
        `المسار ${req.originalUrl} غير موجود في API الموظفين`
      )
    );
});

export default router;
