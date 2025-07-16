// Employee interface - main employee data structure
export interface Employee {
  id: number;
  name: string;
  position: string;
  phone: string;
  daily_wage: number;
  current_balance: number;
  total_bonuses: number;
  total_deductions: number;
  payment_status: PaymentStatus;
  is_active: boolean;
  hire_date: string;
  last_payment_date?: string;
  created_at?: string;
  updated_at?: string;

  // Runtime calculated fields (from joins/aggregations)
  today_attendance?: AttendanceStatus;
  today_withdrawals?: number;
  today_bonuses?: number;
  today_deductions?: number;
}

// Payment status enum
export type PaymentStatus = "pending" | "paid" | "deferred";

// Attendance status enum
export type AttendanceStatus = "present" | "absent";

// Transaction types enum
export type TransactionType =
  | "withdrawal"
  | "deduction"
  | "bonus"
  | "salary_payment";

// Financial Transaction interface
export interface FinancialTransaction {
  id: number;
  employee_id: number;
  transaction_type: TransactionType;
  amount: number;
  description?: string;
  transaction_date: string;
  created_by?: string;
  created_at?: string;
}

// Attendance Record interface
export interface AttendanceRecord {
  id: number;
  employee_id: number;
  attendance_date: string;
  status: AttendanceStatus;
  check_in_time?: string;
  check_out_time?: string;
  notes?: string;
  created_at?: string;
}

// Salary Payment interface
export interface SalaryPayment {
  id: number;
  employee_id: number;
  payment_date: string;
  daily_wage: number;
  days_worked: number;
  total_wage: number;
  total_bonuses: number;
  total_deductions: number;
  total_withdrawals: number;
  net_payment: number;
  payment_method: string;
  notes?: string;
  created_at?: string;
}

// DTOs (Data Transfer Objects)

// Create Employee DTO - for adding new employees
export interface CreateEmployeeDTO {
  name: string;
  position: string;
  phone: string;
  daily_wage: number;
  current_balance?: number;
}

// Update Employee DTO - for updating employee data
export interface UpdateEmployeeDTO {
  name?: string;
  position?: string;
  phone?: string;
  daily_wage?: number;
  current_balance?: number;
  payment_status?: PaymentStatus;
  is_active?: boolean;
}

// Create Transaction DTO - for adding financial transactions
export interface CreateTransactionDTO {
  transaction_type: TransactionType;
  amount: number;
  description?: string;
  transaction_date?: string;
  created_by?: string;
}

// Mark Attendance DTO - for marking attendance
export interface MarkAttendanceDTO {
  status: AttendanceStatus;
  attendance_date?: string;
  check_in_time?: string;
  check_out_time?: string;
  notes?: string;
}

// Response interfaces

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// Employee Summary for dashboard/reports
export interface EmployeeSummary {
  total_employees: number;
  active_employees: number;
  present_today: number;
  total_daily_wages: number;
  total_current_balance: number;
  total_withdrawals_today: number;
  total_bonuses_today: number;
  total_deductions_today: number;
}

// Attendance Report interface
export interface AttendanceReportItem {
  employee_id: number;
  name: string;
  position: string;
  present_days: number;
  absent_days: number;
  total_days: number;
  attendance_percentage: number;
}

// Financial Report interface
export interface FinancialReportItem {
  employee_id: number;
  name: string;
  position: string;
  total_earnings: number;
  total_withdrawals: number;
  total_bonuses: number;
  total_deductions: number;
  current_balance: number;
  last_payment_date?: string;
}

// Database query result interfaces

// Employee with aggregated data (for main listing)
export interface EmployeeWithAggregates extends Employee {
  today_withdrawals: number;
  today_bonuses: number;
  today_deductions: number;
  today_attendance: AttendanceStatus;
}

// Search and filter interfaces

// Employee search criteria
export interface EmployeeSearchCriteria {
  name?: string;
  position?: string;
  payment_status?: PaymentStatus;
  attendance_status?: AttendanceStatus;
  is_active?: boolean;
  date_from?: string;
  date_to?: string;
}

// Pagination interface
export interface PaginationParams {
  page: number;
  limit: number;
  sort_by?: string;
  sort_order?: "ASC" | "DESC";
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
    has_next: boolean;
    has_previous: boolean;
  };
}

// Validation interfaces

// Validation error
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Constants and enums

// Position types commonly used
export const POSITIONS = {
  CRAFTSMAN: "صنايعي",
  ASSISTANT: "مساعد",
  SUPERVISOR: "مشرف",
  MANAGER: "مدير",
  CASHIER: "كاشير",
  CLEANER: "عامل نظافة",
  SECURITY: "أمن",
  OTHER: "أخرى",
} as const;

// Payment methods
export const PAYMENT_METHODS = {
  CASH: "cash",
  BANK_TRANSFER: "bank_transfer",
  CHECK: "check",
  MOBILE_WALLET: "mobile_wallet",
} as const;

// Transaction type descriptions in Arabic
export const TRANSACTION_TYPE_LABELS = {
  withdrawal: "سحب نقدي",
  deduction: "خصم",
  bonus: "بونص",
  salary_payment: "دفع راتب",
} as const;

// Payment status labels in Arabic
export const PAYMENT_STATUS_LABELS = {
  pending: "معلق",
  paid: "مدفوع",
  deferred: "مؤجل",
} as const;

// Attendance status labels in Arabic
export const ATTENDANCE_STATUS_LABELS = {
  present: "حاضر",
  absent: "غائب",
} as const;

// Type guards for runtime type checking

export function isValidPaymentStatus(status: string): status is PaymentStatus {
  return ["pending", "paid", "deferred"].includes(status);
}

export function isValidAttendanceStatus(
  status: string
): status is AttendanceStatus {
  return ["present", "absent"].includes(status);
}

export function isValidTransactionType(type: string): type is TransactionType {
  return ["withdrawal", "deduction", "bonus", "salary_payment"].includes(type);
}

// Utility types

// Make all properties optional for partial updates
export type PartialEmployee = Partial<Employee>;

// Pick specific fields for forms
export type EmployeeFormData = Pick<
  Employee,
  "name" | "position" | "phone" | "daily_wage"
>;

// Omit system fields for creation
export type NewEmployee = Omit<
  Employee,
  | "id"
  | "created_at"
  | "updated_at"
  | "today_attendance"
  | "today_withdrawals"
  | "today_bonuses"
  | "today_deductions"
>;

export default {
  POSITIONS,
  PAYMENT_METHODS,
  TRANSACTION_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  ATTENDANCE_STATUS_LABELS,
  isValidPaymentStatus,
  isValidAttendanceStatus,
  isValidTransactionType,
};
