import { pool } from "./lib/db";
import { EmployeeService } from "./services/employeeService";
import dotenv from "dotenv";

// تحميل متغيرات البيئة
dotenv.config();

interface TestResult {
  test: string;
  status: "PASS" | "FAIL";
  message: string;
  duration?: number;
}

class DatabaseTester {
  private results: TestResult[] = [];

  private addResult(
    test: string,
    status: "PASS" | "FAIL",
    message: string,
    duration?: number
  ) {
    this.results.push({ test, status, message, duration });
  }

  private async runTest(
    testName: string,
    testFunction: () => Promise<void>
  ): Promise<void> {
    const startTime = Date.now();
    try {
      console.log(`🧪 Running test: ${testName}...`);
      await testFunction();
      const duration = Date.now() - startTime;
      this.addResult(testName, "PASS", "Test passed successfully", duration);
      console.log(`✅ ${testName} - PASSED (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.addResult(testName, "FAIL", error.message, duration);
      console.log(`❌ ${testName} - FAILED (${duration}ms): ${error.message}`);
    }
  }

  async testDatabaseConnection(): Promise<void> {
    const result = await pool.query(
      "SELECT NOW() as current_time, version() as db_version"
    );

    if (!result.rows[0]) {
      throw new Error("No response from database");
    }

    console.log(`   📅 Database time: ${result.rows[0].current_time}`);
    console.log(
      `   🗄️ Database version: ${result.rows[0].db_version.split(" ")[0]}`
    );
  }

  async testDatabaseTables(): Promise<void> {
    const requiredTables = [
      "employees",
      "attendance",
      "financial_transactions",
      "salary_payments",
    ];

    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ANY($1)
      ORDER BY table_name
    `;

    const result = await pool.query(tablesQuery, [requiredTables]);
    const existingTables = result.rows.map((row) => row.table_name);

    console.log(`   📊 Found tables: ${existingTables.join(", ")}`);

    const missingTables = requiredTables.filter(
      (table) => !existingTables.includes(table)
    );

    if (missingTables.length > 0) {
      throw new Error(`Missing required tables: ${missingTables.join(", ")}`);
    }
  }

  async testEmployeeService(): Promise<void> {
    const isConnected = await EmployeeService.testConnection();

    if (!isConnected) {
      throw new Error("EmployeeService connection test failed");
    }
  }

  async testEmployeeOperations(): Promise<void> {
    // Test getting all employees
    const employees = await EmployeeService.getAllEmployees();
    console.log(`   👥 Found ${employees.length} employees`);

    if (employees.length === 0) {
      console.log(
        "   ℹ️ No employees found - this is normal for a fresh database"
      );
      return;
    }

    // Test getting employee by ID
    const firstEmployee = employees[0];
    const employee = await EmployeeService.getEmployeeById(firstEmployee.id);

    if (!employee || employee.id !== firstEmployee.id) {
      throw new Error("Failed to retrieve employee by ID");
    }

    console.log(`   👤 Successfully retrieved employee: ${employee.name}`);
  }

  async testEmployeeSummary(): Promise<void> {
    const summary = await EmployeeService.getEmployeeSummary();

    console.log(
      `   📈 Summary - Total: ${summary.total_employees}, Active: ${summary.active_employees}, Present: ${summary.present_today}`
    );
    console.log(
      `   💰 Wages: ${summary.total_daily_wages} ج.م, Balance: ${summary.total_current_balance} ج.م`
    );

    if (typeof summary.total_employees !== "number") {
      throw new Error("Invalid summary data structure");
    }
  }

  async testTransactionOperations(): Promise<void> {
    const employees = await EmployeeService.getAllEmployees();

    if (employees.length === 0) {
      console.log("   ℹ️ Skipping transaction test - no employees available");
      return;
    }

    const employee = employees[0];
    const originalBalance = employee.current_balance;

    // Test adding a bonus transaction
    try {
      await EmployeeService.addFinancialTransaction(employee.id, {
        transaction_type: "bonus",
        amount: 1.0,
        description: "Test bonus transaction",
        created_by: "test",
      });

      // Verify balance updated
      const updatedEmployee = await EmployeeService.getEmployeeById(
        employee.id
      );
      const expectedBalance = originalBalance + 1.0;

      if (Math.abs(updatedEmployee.current_balance - expectedBalance) > 0.01) {
        throw new Error(
          `Balance update failed. Expected: ${expectedBalance}, Got: ${updatedEmployee.current_balance}`
        );
      }

      console.log(`   💵 Transaction test passed - balance updated correctly`);
    } catch (error) {
      throw new Error(`Transaction test failed: ${error.message}`);
    }
  }

  async testAttendanceOperations(): Promise<void> {
    const employees = await EmployeeService.getAllEmployees();

    if (employees.length === 0) {
      console.log("   ℹ️ Skipping attendance test - no employees available");
      return;
    }

    const employee = employees[0];

    // Test marking attendance
    await EmployeeService.markAttendance(employee.id, {
      status: "present",
      notes: "Test attendance record",
    });

    // Test getting attendance history
    const attendance = await EmployeeService.getAttendanceHistory(employee.id);

    console.log(
      `   📅 Attendance test passed - found ${attendance.length} records`
    );
  }

  async testDatabaseConstraints(): Promise<void> {
    // Test invalid employee data
    try {
      await EmployeeService.addEmployee({
        name: "",
        position: "Test",
        phone: "",
        daily_wage: -100,
      });
      throw new Error("Should have failed with invalid employee data");
    } catch (error) {
      if (
        error.message.includes("بيانات غير صحيحة") ||
        error.message.includes("validation")
      ) {
        console.log("   ✅ Constraint validation working correctly");
      } else {
        throw error;
      }
    }
  }

  async testDatabasePerformance(): Promise<void> {
    const startTime = Date.now();

    // Run multiple queries in parallel
    const promises = [
      EmployeeService.getAllEmployees(),
      EmployeeService.getEmployeeSummary(),
      pool.query("SELECT COUNT(*) FROM employees"),
      pool.query("SELECT COUNT(*) FROM attendance"),
      pool.query("SELECT COUNT(*) FROM financial_transactions"),
    ];

    await Promise.all(promises);

    const duration = Date.now() - startTime;
    console.log(`   ⚡ Performance test completed in ${duration}ms`);

    if (duration > 5000) {
      throw new Error(`Database queries too slow: ${duration}ms`);
    }
  }

  async runAllTests(): Promise<void> {
    console.log("🚀 Starting database tests...");
    console.log("=".repeat(50));

    // Connection tests
    await this.runTest("Database Connection", () =>
      this.testDatabaseConnection()
    );
    await this.runTest("Database Tables", () => this.testDatabaseTables());

    // Service tests
    await this.runTest("Employee Service", () => this.testEmployeeService());
    await this.runTest("Employee Operations", () =>
      this.testEmployeeOperations()
    );
    await this.runTest("Employee Summary", () => this.testEmployeeSummary());

    // Feature tests
    await this.runTest("Transaction Operations", () =>
      this.testTransactionOperations()
    );
    await this.runTest("Attendance Operations", () =>
      this.testAttendanceOperations()
    );

    // Validation tests
    await this.runTest("Database Constraints", () =>
      this.testDatabaseConstraints()
    );

    // Performance tests
    await this.runTest("Database Performance", () =>
      this.testDatabasePerformance()
    );

    console.log("=".repeat(50));
    this.printSummary();
  }

  private printSummary(): void {
    const totalTests = this.results.length;
    const passedTests = this.results.filter((r) => r.status === "PASS").length;
    const failedTests = this.results.filter((r) => r.status === "FAIL").length;
    const totalDuration = this.results.reduce(
      (sum, r) => sum + (r.duration || 0),
      0
    );

    console.log("📊 Test Summary:");
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   ⏱️ Total Time: ${totalDuration}ms`);
    console.log(
      `   📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`
    );

    if (failedTests > 0) {
      console.log("\n❌ Failed Tests:");
      this.results
        .filter((r) => r.status === "FAIL")
        .forEach((r) => console.log(`   - ${r.test}: ${r.message}`));
    }

    console.log("=".repeat(50));

    if (failedTests === 0) {
      console.log("🎉 All tests passed! Database is ready for use.");
    } else {
      console.log("⚠️ Some tests failed. Please check the database setup.");
    }
  }
}

// Main execution
async function main() {
  const tester = new DatabaseTester();

  try {
    await tester.runAllTests();
    process.exit(0);
  } catch (error) {
    console.error("💥 Test runner failed:", error);
    process.exit(1);
  } finally {
    // Close database connection
    await pool.end();
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Tests interrupted. Cleaning up...");
  await pool.end();
  process.exit(1);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Tests terminated. Cleaning up...");
  await pool.end();
  process.exit(1);
});

// Run tests if this file is executed directly
if (require.main === module) {
  main();
}

export { DatabaseTester };
