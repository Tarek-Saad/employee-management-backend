import { pool, transaction } from "../lib/db";
import {
  Employee,
  EmployeeWithAggregates,
  CreateEmployeeDTO,
  UpdateEmployeeDTO,
  FinancialTransaction,
  CreateTransactionDTO,
  AttendanceRecord,
  MarkAttendanceDTO,
  EmployeeSummary,
  AttendanceReportItem,
  FinancialReportItem,
  PaginatedResponse,
  PaginationParams,
  EmployeeSearchCriteria,
  ValidationResult,
  ValidationError,
  isValidPaymentStatus,
  isValidAttendanceStatus,
  isValidTransactionType,
} from "../types/employee";

export class EmployeeService {
  // Validation methods

  private static validateEmployee(
    employee: CreateEmployeeDTO | UpdateEmployeeDTO
  ): ValidationResult {
    const errors: ValidationError[] = [];

    if ("name" in employee) {
      if (!employee.name || employee.name.trim().length < 2) {
        errors.push({
          field: "name",
          message: "اسم الموظف يجب أن يكون أطول من حرفين",
          value: employee.name,
        });
      }
      if (employee.name && employee.name.length > 100) {
        errors.push({
          field: "name",
          message: "اسم الموظف لا يجب أن يتجاوز 100 حرف",
          value: employee.name,
        });
      }
    }

    if ("position" in employee) {
      if (!employee.position || employee.position.trim().length < 2) {
        errors.push({
          field: "position",
          message: "منصب الموظف مطلوب ويجب أن يكون أطول من حرفين",
          value: employee.position,
        });
      }
    }

    if ("daily_wage" in employee) {
      if (employee.daily_wage === undefined || employee.daily_wage < 0) {
        errors.push({
          field: "daily_wage",
          message: "الأجر اليومي يجب أن يكون رقم موجب",
          value: employee.daily_wage,
        });
      }
      if (employee.daily_wage && employee.daily_wage > 10000) {
        errors.push({
          field: "daily_wage",
          message: "الأجر اليومي يبدو مرتفع جداً",
          value: employee.daily_wage,
        });
      }
    }

    if ("phone" in employee && employee.phone) {
      if (employee.phone.length < 10 || employee.phone.length > 20) {
        errors.push({
          field: "phone",
          message: "رقم الهاتف غير صحيح",
          value: employee.phone,
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private static validateTransaction(
    transaction: CreateTransactionDTO
  ): ValidationResult {
    const errors: ValidationError[] = [];

    if (!isValidTransactionType(transaction.transaction_type)) {
      errors.push({
        field: "transaction_type",
        message: "نوع المعاملة غير صحيح",
        value: transaction.transaction_type,
      });
    }

    if (!transaction.amount || transaction.amount <= 0) {
      errors.push({
        field: "amount",
        message: "المبلغ يجب أن يكون رقم موجب",
        value: transaction.amount,
      });
    }

    if (transaction.amount && transaction.amount > 100000) {
      errors.push({
        field: "amount",
        message: "المبلغ مرتفع جداً، يرجى التأكد",
        value: transaction.amount,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Employee CRUD operations

  static async getAllEmployees(
    searchCriteria?: EmployeeSearchCriteria,
    pagination?: PaginationParams
  ): Promise<EmployeeWithAggregates[]> {
    try {
      let query = `
        SELECT 
          e.id,
          e.name,
          e.position,
          e.phone,
          e.daily_wage,
          e.current_balance,
          e.total_bonuses,
          e.total_deductions,
          e.payment_status,
          e.is_active,
          e.hire_date,
          e.last_payment_date,
          e.created_at,
          e.updated_at,
          COALESCE(a.status, 'absent') as today_attendance,
          COALESCE(w.today_withdrawals, 0) as today_withdrawals,
          COALESCE(b.today_bonuses, 0) as today_bonuses,
          COALESCE(d.today_deductions, 0) as today_deductions
        FROM employees e
        LEFT JOIN attendance a ON e.id = a.employee_id AND a.attendance_date = CURRENT_DATE
        LEFT JOIN (
          SELECT employee_id, SUM(amount) as today_withdrawals 
          FROM financial_transactions 
          WHERE transaction_type = 'withdrawal' AND transaction_date = CURRENT_DATE
          GROUP BY employee_id
        ) w ON e.id = w.employee_id
        LEFT JOIN (
          SELECT employee_id, SUM(amount) as today_bonuses
          FROM financial_transactions 
          WHERE transaction_type = 'bonus' AND transaction_date = CURRENT_DATE
          GROUP BY employee_id
        ) b ON e.id = b.employee_id
        LEFT JOIN (
          SELECT employee_id, SUM(amount) as today_deductions
          FROM financial_transactions 
          WHERE transaction_type = 'deduction' AND transaction_date = CURRENT_DATE
          GROUP BY employee_id
        ) d ON e.id = d.employee_id
        WHERE e.is_active = true
      `;

      const params: any[] = [];
      let paramCount = 0;

      // Apply search filters
      if (searchCriteria) {
        if (searchCriteria.name) {
          paramCount++;
          query += ` AND e.name ILIKE $${paramCount}`;
          params.push(`%${searchCriteria.name}%`);
        }

        if (searchCriteria.position) {
          paramCount++;
          query += ` AND e.position ILIKE $${paramCount}`;
          params.push(`%${searchCriteria.position}%`);
        }

        if (searchCriteria.payment_status) {
          paramCount++;
          query += ` AND e.payment_status = $${paramCount}`;
          params.push(searchCriteria.payment_status);
        }

        if (searchCriteria.attendance_status) {
          paramCount++;
          query += ` AND a.status = $${paramCount}`;
          params.push(searchCriteria.attendance_status);
        }
      }

      // Apply sorting
      if (pagination?.sort_by) {
        const validSortFields = [
          "name",
          "position",
          "daily_wage",
          "current_balance",
          "hire_date",
        ];
        if (validSortFields.includes(pagination.sort_by)) {
          query += ` ORDER BY e.${pagination.sort_by} ${
            pagination.sort_order || "ASC"
          }`;
        }
      } else {
        query += ` ORDER BY e.name ASC`;
      }

      // Apply pagination
      if (pagination) {
        const offset = (pagination.page - 1) * pagination.limit;
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(pagination.limit);

        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(offset);
      }

      console.log(
        "📋 Fetching employees with query:",
        query.substring(0, 100) + "..."
      );
      const result = await pool.query(query, params);

      console.log(`✅ Found ${result.rows.length} employees`);
      return result.rows;
    } catch (error) {
      console.error("❌ Error fetching employees:", error);
      throw new Error(`فشل في جلب بيانات الموظفين: ${error.message}`);
    }
  }

  static async getEmployeeById(
    id: number
  ): Promise<EmployeeWithAggregates | null> {
    try {
      const query = `
        SELECT 
          e.*,
          COALESCE(a.status, 'absent') as today_attendance,
          COALESCE(w.today_withdrawals, 0) as today_withdrawals,
          COALESCE(b.today_bonuses, 0) as today_bonuses,
          COALESCE(d.today_deductions, 0) as today_deductions
        FROM employees e
        LEFT JOIN attendance a ON e.id = a.employee_id AND a.attendance_date = CURRENT_DATE
        LEFT JOIN (
          SELECT employee_id, SUM(amount) as today_withdrawals 
          FROM financial_transactions 
          WHERE transaction_type = 'withdrawal' AND transaction_date = CURRENT_DATE
          GROUP BY employee_id
        ) w ON e.id = w.employee_id
        LEFT JOIN (
          SELECT employee_id, SUM(amount) as today_bonuses
          FROM financial_transactions 
          WHERE transaction_type = 'bonus' AND transaction_date = CURRENT_DATE
          GROUP BY employee_id
        ) b ON e.id = b.employee_id
        LEFT JOIN (
          SELECT employee_id, SUM(amount) as today_deductions
          FROM financial_transactions 
          WHERE transaction_type = 'deduction' AND transaction_date = CURRENT_DATE
          GROUP BY employee_id
        ) d ON e.id = d.employee_id
        WHERE e.id = $1 AND e.is_active = true
      `;

      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("❌ Error fetching employee by ID:", error);
      throw new Error(`فشل في جلب بيانات الموظف: ${error.message}`);
    }
  }

  static async addEmployee(employeeData: CreateEmployeeDTO): Promise<Employee> {
    try {
      // Validate input
      const validation = this.validateEmployee(employeeData);
      if (!validation.isValid) {
        throw new Error(
          `بيانات غير صحيحة: ${validation.errors
            .map((e) => e.message)
            .join(", ")}`
        );
      }

      const query = `
        INSERT INTO employees (name, position, phone, daily_wage, current_balance)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const values = [
        employeeData.name.trim(),
        employeeData.position.trim(),
        employeeData.phone?.trim() || "",
        employeeData.daily_wage,
        employeeData.current_balance || 0,
      ];

      console.log("➕ Adding new employee:", employeeData.name);
      const result = await pool.query(query, values);

      console.log("✅ Employee added successfully with ID:", result.rows[0].id);
      return result.rows[0];
    } catch (error) {
      console.error("❌ Error adding employee:", error);
      if (error.code === "23505") {
        throw new Error("موظف بهذا الاسم موجود بالفعل");
      }
      throw new Error(`فشل في إضافة الموظف: ${error.message}`);
    }
  }

  static async updateEmployee(
    id: number,
    updates: UpdateEmployeeDTO
  ): Promise<Employee> {
    try {
      // Validate input
      const validation = this.validateEmployee(updates);
      if (!validation.isValid) {
        throw new Error(
          `بيانات غير صحيحة: ${validation.errors
            .map((e) => e.message)
            .join(", ")}`
        );
      }

      const fields = Object.keys(updates);
      if (fields.length === 0) {
        throw new Error("لا توجد بيانات للتحديث");
      }

      const setClause = fields
        .map((field, index) => `${field} = $${index + 2}`)
        .join(", ");
      const query = `
        UPDATE employees 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND is_active = true
        RETURNING *
      `;

      const values = [id, ...Object.values(updates)];

      console.log("📝 Updating employee ID:", id);
      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        throw new Error("الموظف غير موجود أو غير نشط");
      }

      console.log("✅ Employee updated successfully");
      return result.rows[0];
    } catch (error) {
      console.error("❌ Error updating employee:", error);
      throw new Error(`فشل في تحديث بيانات الموظف: ${error.message}`);
    }
  }

  static async deleteEmployee(id: number): Promise<boolean> {
    try {
      const query =
        "UPDATE employees SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND is_active = true";

      console.log("🗑️ Deactivating employee ID:", id);
      const result = await pool.query(query, [id]);

      if (result.rowCount === 0) {
        throw new Error("الموظف غير موجود أو محذوف بالفعل");
      }

      console.log("✅ Employee deactivated successfully");
      return true;
    } catch (error) {
      console.error("❌ Error deactivating employee:", error);
      throw new Error(`فشل في حذف الموظف: ${error.message}`);
    }
  }

  // Attendance operations

  static async markAttendance(
    employeeId: number,
    attendanceData: MarkAttendanceDTO
  ): Promise<AttendanceRecord> {
    try {
      if (!isValidAttendanceStatus(attendanceData.status)) {
        throw new Error("حالة الحضور غير صحيحة");
      }

      const attendanceDate =
        attendanceData.attendance_date ||
        new Date().toISOString().split("T")[0];

      const query = `
        INSERT INTO attendance (employee_id, attendance_date, status, check_in_time, check_out_time, notes)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (employee_id, attendance_date) 
        DO UPDATE SET 
          status = EXCLUDED.status,
          check_in_time = EXCLUDED.check_in_time,
          check_out_time = EXCLUDED.check_out_time,
          notes = EXCLUDED.notes
        RETURNING *
      `;

      const values = [
        employeeId,
        attendanceDate,
        attendanceData.status,
        attendanceData.check_in_time || null,
        attendanceData.check_out_time || null,
        attendanceData.notes || null,
      ];

      console.log(
        `📅 Marking attendance for employee ${employeeId}: ${attendanceData.status}`
      );
      const result = await pool.query(query, values);

      console.log("✅ Attendance marked successfully");
      return result.rows[0];
    } catch (error) {
      console.error("❌ Error marking attendance:", error);
      throw new Error(`فشل في تسجيل الحضور: ${error.message}`);
    }
  }

  static async getAttendanceHistory(
    employeeId: number,
    startDate?: string,
    endDate?: string
  ): Promise<AttendanceRecord[]> {
    try {
      let query = `
        SELECT * FROM attendance 
        WHERE employee_id = $1
      `;
      const params = [employeeId];

      if (startDate) {
        query += ` AND attendance_date >= $2`;
        params.push(startDate);

        if (endDate) {
          query += ` AND attendance_date <= $3`;
          params.push(endDate);
        }
      }

      query += ` ORDER BY attendance_date DESC`;

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error("❌ Error fetching attendance history:", error);
      throw new Error(`فشل في جلب سجل الحضور: ${error.message}`);
    }
  }

  // Financial operations

  static async addFinancialTransaction(
    employeeId: number,
    transactionData: CreateTransactionDTO
  ): Promise<FinancialTransaction> {
    return await transaction(async (client) => {
      try {
        // Validate input
        const validation = this.validateTransaction(transactionData);
        if (!validation.isValid) {
          throw new Error(
            `بيانات المعاملة غير صحيحة: ${validation.errors
              .map((e) => e.message)
              .join(", ")}`
          );
        }

        // Check if employee exists
        const employeeCheck = await client.query(
          "SELECT id, current_balance FROM employees WHERE id = $1 AND is_active = true",
          [employeeId]
        );

        if (employeeCheck.rows.length === 0) {
          throw new Error("الموظف غير موجود أو غير نشط");
        }

        const currentBalance = parseFloat(
          employeeCheck.rows[0].current_balance
        );

        // Check if withdrawal amount doesn't exceed current balance
        if (
          transactionData.transaction_type === "withdrawal" &&
          transactionData.amount > currentBalance
        ) {
          throw new Error(
            `المبلغ المطلوب سحبه (${transactionData.amount} ج.م) أكبر من الرصيد الحالي (${currentBalance} ج.م)`
          );
        }

        // Add the transaction
        const transactionQuery = `
          INSERT INTO financial_transactions (employee_id, transaction_type, amount, description, transaction_date, created_by)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `;

        const transactionValues = [
          employeeId,
          transactionData.transaction_type,
          transactionData.amount,
          transactionData.description || null,
          transactionData.transaction_date ||
            new Date().toISOString().split("T")[0],
          transactionData.created_by || "system",
        ];

        const transactionResult = await client.query(
          transactionQuery,
          transactionValues
        );

        // Update employee balance and totals
        let balanceChange = 0;
        let bonusChange = 0;
        let deductionChange = 0;

        switch (transactionData.transaction_type) {
          case "withdrawal":
            balanceChange = -transactionData.amount;
            break;
          case "deduction":
            balanceChange = -transactionData.amount;
            deductionChange = transactionData.amount;
            break;
          case "bonus":
            balanceChange = transactionData.amount;
            bonusChange = transactionData.amount;
            break;
          case "salary_payment":
            balanceChange = -transactionData.amount;
            break;
        }

        const updateQuery = `
          UPDATE employees 
          SET current_balance = current_balance + $1,
              total_bonuses = total_bonuses + $2,
              total_deductions = total_deductions + $3,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
        `;

        await client.query(updateQuery, [
          balanceChange,
          bonusChange,
          deductionChange,
          employeeId,
        ]);

        console.log(
          `💰 Added ${transactionData.transaction_type} transaction for employee ${employeeId}: ${transactionData.amount} ج.م`
        );
        return transactionResult.rows[0];
      } catch (error) {
        console.error("❌ Error adding financial transaction:", error);
        throw error;
      }
    });
  }

  static async getEmployeeTransactions(
    employeeId: number,
    limit: number = 50
  ): Promise<FinancialTransaction[]> {
    try {
      const query = `
        SELECT * FROM financial_transactions 
        WHERE employee_id = $1 
        ORDER BY transaction_date DESC, created_at DESC
        LIMIT $2
      `;

      const result = await pool.query(query, [employeeId, limit]);
      return result.rows;
    } catch (error) {
      console.error("❌ Error fetching employee transactions:", error);
      throw new Error(`فشل في جلب معاملات الموظف: ${error.message}`);
    }
  }

  static async settleEmployeeAccount(employeeId: number): Promise<boolean> {
    try {
      // Check current balance first
      const balanceCheck = await pool.query(
        "SELECT current_balance FROM employees WHERE id = $1 AND is_active = true",
        [employeeId]
      );

      if (balanceCheck.rows.length === 0) {
        throw new Error("الموظف غير موجود أو غير نشط");
      }

      const currentBalance = parseFloat(balanceCheck.rows[0].current_balance);

      if (currentBalance <= 0) {
        throw new Error("لا يوجد رصيد للتسوية");
      }

      // Add settlement transaction
      await this.addFinancialTransaction(employeeId, {
        transaction_type: "salary_payment",
        amount: currentBalance,
        description: `تسوية الحساب - دفع الرصيد المستحق`,
        created_by: "system",
      });

      // Update payment status
      const query = `
        UPDATE employees 
        SET payment_status = 'paid',
            last_payment_date = CURRENT_DATE,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;

      await pool.query(query, [employeeId]);

      console.log(
        `💳 Account settled for employee ${employeeId}, amount: ${currentBalance} ج.م`
      );
      return true;
    } catch (error) {
      console.error("❌ Error settling account:", error);
      throw new Error(`فشل في تسوية الحساب: ${error.message}`);
    }
  }

  // Reporting and analytics

  static async getEmployeeSummary(): Promise<EmployeeSummary> {
    try {
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_employees,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_employees,
          SUM(CASE WHEN is_active = true THEN daily_wage ELSE 0 END) as total_daily_wages,
          SUM(CASE WHEN is_active = true THEN current_balance ELSE 0 END) as total_current_balance
        FROM employees
      `;

      const attendanceQuery = `
        SELECT COUNT(DISTINCT employee_id) as present_today
        FROM attendance 
        WHERE attendance_date = CURRENT_DATE AND status = 'present'
      `;

      const transactionsQuery = `
        SELECT 
          SUM(CASE WHEN transaction_type = 'withdrawal' THEN amount ELSE 0 END) as total_withdrawals_today,
          SUM(CASE WHEN transaction_type = 'bonus' THEN amount ELSE 0 END) as total_bonuses_today,
          SUM(CASE WHEN transaction_type = 'deduction' THEN amount ELSE 0 END) as total_deductions_today
        FROM financial_transactions 
        WHERE transaction_date = CURRENT_DATE
      `;

      const [summaryResult, attendanceResult, transactionsResult] =
        await Promise.all([
          pool.query(summaryQuery),
          pool.query(attendanceQuery),
          pool.query(transactionsQuery),
        ]);

      return {
        total_employees: parseInt(summaryResult.rows[0].total_employees) || 0,
        active_employees: parseInt(summaryResult.rows[0].active_employees) || 0,
        present_today: parseInt(attendanceResult.rows[0].present_today) || 0,
        total_daily_wages:
          parseFloat(summaryResult.rows[0].total_daily_wages) || 0,
        total_current_balance:
          parseFloat(summaryResult.rows[0].total_current_balance) || 0,
        total_withdrawals_today:
          parseFloat(transactionsResult.rows[0].total_withdrawals_today) || 0,
        total_bonuses_today:
          parseFloat(transactionsResult.rows[0].total_bonuses_today) || 0,
        total_deductions_today:
          parseFloat(transactionsResult.rows[0].total_deductions_today) || 0,
      };
    } catch (error) {
      console.error("❌ Error getting employee summary:", error);
      throw new Error(`فشل في جلب ملخص الموظفين: ${error.message}`);
    }
  }

  static async getAttendanceReport(
    startDate: string,
    endDate: string
  ): Promise<AttendanceReportItem[]> {
    try {
      const query = `
        SELECT 
          e.id as employee_id,
          e.name,
          e.position,
          COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_days,
          COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_days,
          COUNT(a.id) as total_days,
          CASE 
            WHEN COUNT(a.id) > 0 THEN 
              ROUND((COUNT(CASE WHEN a.status = 'present' THEN 1 END)::decimal / COUNT(a.id)) * 100, 2)
            ELSE 0 
          END as attendance_percentage
        FROM employees e
        LEFT JOIN attendance a ON e.id = a.employee_id 
          AND a.attendance_date BETWEEN $1 AND $2
        WHERE e.is_active = true
        GROUP BY e.id, e.name, e.position
        ORDER BY e.name
      `;

      const result = await pool.query(query, [startDate, endDate]);
      return result.rows.map((row) => ({
        ...row,
        present_days: parseInt(row.present_days) || 0,
        absent_days: parseInt(row.absent_days) || 0,
        total_days: parseInt(row.total_days) || 0,
        attendance_percentage: parseFloat(row.attendance_percentage) || 0,
      }));
    } catch (error) {
      console.error("❌ Error generating attendance report:", error);
      throw new Error(`فشل في إنشاء تقرير الحضور: ${error.message}`);
    }
  }

  // Test connection method
  static async testConnection(): Promise<boolean> {
    try {
      const result = await pool.query(
        "SELECT NOW() as current_time, COUNT(*) as employee_count FROM employees"
      );
      console.log("✅ Database connection test successful");
      console.log("Current time:", result.rows[0].current_time);
      console.log("Total employees:", result.rows[0].employee_count);
      return true;
    } catch (error) {
      console.error("❌ Database connection test failed:", error);
      return false;
    }
  }
}
