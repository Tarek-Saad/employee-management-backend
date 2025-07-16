-- =========================================
-- Employee Management System Database Setup
-- PostgreSQL Database Schema
-- =========================================

-- Drop existing tables if they exist (be careful in production!)
-- DROP TABLE IF EXISTS salary_payments CASCADE;
-- DROP TABLE IF EXISTS financial_transactions CASCADE;
-- DROP TABLE IF EXISTS attendance CASCADE;
-- DROP TABLE IF EXISTS employees CASCADE;

-- =========================================
-- CREATE TABLES
-- =========================================

-- جدول الموظفين الأساسي
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    position VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    daily_wage DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (daily_wage >= 0),
    current_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_bonuses DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_bonuses >= 0),
    total_deductions DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_deductions >= 0),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'deferred')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    last_payment_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT employees_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT employees_position_not_empty CHECK (LENGTH(TRIM(position)) > 0),
    CONSTRAINT employees_daily_wage_reasonable CHECK (daily_wage <= 10000)
);

-- جدول الحضور
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status VARCHAR(10) NOT NULL CHECK (status IN ('present', 'absent')),
    check_in_time TIME,
    check_out_time TIME,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- منع تكرار تسجيل الحضور لنفس الموظف في نفس اليوم
    UNIQUE(employee_id, attendance_date),
    
    -- Constraints
    CONSTRAINT attendance_date_not_future CHECK (attendance_date <= CURRENT_DATE),
    CONSTRAINT attendance_check_times CHECK (
        check_out_time IS NULL OR 
        check_in_time IS NULL OR 
        check_out_time >= check_in_time
    )
);

-- جدول المعاملات المالية (سحوبات، خصومات، بونص)
CREATE TABLE IF NOT EXISTS financial_transactions (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('withdrawal', 'deduction', 'bonus', 'salary_payment')),
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    description TEXT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by VARCHAR(100) DEFAULT 'system',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT financial_transactions_amount_reasonable CHECK (amount <= 100000),
    CONSTRAINT financial_transactions_date_not_future CHECK (transaction_date <= CURRENT_DATE)
);

-- جدول تسديد المرتبات (للتتبع المفصل)
CREATE TABLE IF NOT EXISTS salary_payments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    daily_wage DECIMAL(10,2) NOT NULL CHECK (daily_wage >= 0),
    days_worked INTEGER NOT NULL DEFAULT 1 CHECK (days_worked > 0),
    total_wage DECIMAL(10,2) NOT NULL CHECK (total_wage >= 0),
    total_bonuses DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_bonuses >= 0),
    total_deductions DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_deductions >= 0),
    total_withdrawals DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_withdrawals >= 0),
    net_payment DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'check', 'mobile_wallet')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT salary_payments_calculation CHECK (
        net_payment = total_wage + total_bonuses - total_deductions - total_withdrawals
    )
);

-- =========================================
-- CREATE INDEXES للأداء
-- =========================================

-- Indexes للموظفين
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_position ON employees(position);
CREATE INDEX IF NOT EXISTS idx_employees_payment_status ON employees(payment_status);
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(name);
CREATE INDEX IF NOT EXISTS idx_employees_hire_date ON employees(hire_date);

-- Indexes للحضور
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_status ON attendance(employee_id, status);

-- Indexes للمعاملات المالية
CREATE INDEX IF NOT EXISTS idx_financial_transactions_employee ON financial_transactions(employee_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type ON financial_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_employee_date ON financial_transactions(employee_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_employee_type ON financial_transactions(employee_id, transaction_type);

-- Indexes لتسديد المرتبات
CREATE INDEX IF NOT EXISTS idx_salary_payments_employee ON salary_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_date ON salary_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_salary_payments_employee_date ON salary_payments(employee_id, payment_date);

-- =========================================
-- CREATE FUNCTIONS
-- =========================================

-- دالة تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ربط الـ trigger بجدول الموظفين
DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at 
    BEFORE UPDATE ON employees 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- دالة حساب الرصيد الحالي (للتحقق من صحة البيانات)
CREATE OR REPLACE FUNCTION calculate_employee_balance(emp_id INTEGER)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    daily_wage_val DECIMAL(10,2);
    total_bonuses_val DECIMAL(10,2);
    total_deductions_val DECIMAL(10,2);
    total_withdrawals_val DECIMAL(10,2);
    calculated_balance DECIMAL(10,2);
BEGIN
    -- جلب الأجر اليومي
    SELECT daily_wage INTO daily_wage_val 
    FROM employees 
    WHERE id = emp_id;
    
    IF daily_wage_val IS NULL THEN
        RETURN 0;
    END IF;
    
    -- حساب إجمالي البونص
    SELECT COALESCE(SUM(amount), 0) INTO total_bonuses_val
    FROM financial_transactions 
    WHERE employee_id = emp_id AND transaction_type = 'bonus';
    
    -- حساب إجمالي الخصومات
    SELECT COALESCE(SUM(amount), 0) INTO total_deductions_val
    FROM financial_transactions 
    WHERE employee_id = emp_id AND transaction_type = 'deduction';
    
    -- حساب إجمالي السحوبات
    SELECT COALESCE(SUM(amount), 0) INTO total_withdrawals_val
    FROM financial_transactions 
    WHERE employee_id = emp_id AND transaction_type IN ('withdrawal', 'salary_payment');
    
    -- حساب الرصيد
    calculated_balance := daily_wage_val + total_bonuses_val - total_deductions_val - total_withdrawals_val;
    
    RETURN calculated_balance;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- STORED PROCEDURES للعمليات الشائعة
-- =========================================

-- إجراء تسجيل الحضور
CREATE OR REPLACE FUNCTION mark_attendance(
    p_employee_id INTEGER,
    p_status VARCHAR(10),
    p_attendance_date DATE DEFAULT CURRENT_DATE,
    p_check_in_time TIME DEFAULT NULL,
    p_check_out_time TIME DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- تحقق من وجود الموظف
    IF NOT EXISTS (SELECT 1 FROM employees WHERE id = p_employee_id AND is_active = true) THEN
        RAISE EXCEPTION 'الموظف غير موجود أو غير نشط';
    END IF;
    
    -- تحقق من صحة حالة الحضور
    IF p_status NOT IN ('present', 'absent') THEN
        RAISE EXCEPTION 'حالة الحضور غير صحيحة';
    END IF;
    
    -- إدراج أو تحديث الحضور
    INSERT INTO attendance (employee_id, attendance_date, status, check_in_time, check_out_time, notes)
    VALUES (p_employee_id, p_attendance_date, p_status, p_check_in_time, p_check_out_time, p_notes)
    ON CONFLICT (employee_id, attendance_date) 
    DO UPDATE SET 
        status = EXCLUDED.status,
        check_in_time = EXCLUDED.check_in_time,
        check_out_time = EXCLUDED.check_out_time,
        notes = EXCLUDED.notes;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'فشل في تسجيل الحضور: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- إجراء إضافة معاملة مالية مع تحديث الرصيد
CREATE OR REPLACE FUNCTION add_financial_transaction(
    p_employee_id INTEGER,
    p_transaction_type VARCHAR(20),
    p_amount DECIMAL(10,2),
    p_description TEXT DEFAULT NULL,
    p_created_by VARCHAR(100) DEFAULT 'system'
)
RETURNS INTEGER AS $$
DECLARE
    transaction_id INTEGER;
    current_balance DECIMAL(10,2);
    balance_change DECIMAL(10,2) := 0;
    bonus_change DECIMAL(10,2) := 0;
    deduction_change DECIMAL(10,2) := 0;
BEGIN
    -- تحقق من وجود الموظف
    IF NOT EXISTS (SELECT 1 FROM employees WHERE id = p_employee_id AND is_active = true) THEN
        RAISE EXCEPTION 'الموظف غير موجود أو غير نشط';
    END IF;
    
    -- تحقق من صحة نوع المعاملة
    IF p_transaction_type NOT IN ('withdrawal', 'deduction', 'bonus', 'salary_payment') THEN
        RAISE EXCEPTION 'نوع المعاملة غير صحيح';
    END IF;
    
    -- تحقق من صحة المبلغ
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'المبلغ يجب أن يكون موجب';
    END IF;
    
    -- جلب الرصيد الحالي
    SELECT current_balance INTO current_balance FROM employees WHERE id = p_employee_id;
    
    -- تحقق من توفر الرصيد للسحب
    IF p_transaction_type IN ('withdrawal', 'salary_payment') AND p_amount > current_balance THEN
        RAISE EXCEPTION 'المبلغ المطلوب (%.2f ج.م) أكبر من الرصيد الحالي (%.2f ج.م)', 
            p_amount, current_balance;
    END IF;
    
    -- حساب التغيير في الرصيد
    CASE p_transaction_type
        WHEN 'withdrawal', 'salary_payment' THEN
            balance_change := -p_amount;
        WHEN 'deduction' THEN
            balance_change := -p_amount;
            deduction_change := p_amount;
        WHEN 'bonus' THEN
            balance_change := p_amount;
            bonus_change := p_amount;
    END CASE;
    
    -- إضافة المعاملة
    INSERT INTO financial_transactions (employee_id, transaction_type, amount, description, created_by)
    VALUES (p_employee_id, p_transaction_type, p_amount, p_description, p_created_by)
    RETURNING id INTO transaction_id;
    
    -- تحديث رصيد الموظف
    UPDATE employees 
    SET current_balance = current_balance + balance_change,
        total_bonuses = total_bonuses + bonus_change,
        total_deductions = total_deductions + deduction_change,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_employee_id;
    
    RETURN transaction_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'فشل في إضافة المعاملة المالية: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- إجراء تسوية الحساب
CREATE OR REPLACE FUNCTION settle_employee_account(p_employee_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    current_balance DECIMAL(10,2);
BEGIN
    -- جلب الرصيد الحالي
    SELECT current_balance INTO current_balance 
    FROM employees 
    WHERE id = p_employee_id AND is_active = true;
    
    IF current_balance IS NULL THEN
        RAISE EXCEPTION 'الموظف غير موجود أو غير نشط';
    END IF;
    
    IF current_balance <= 0 THEN
        RAISE EXCEPTION 'لا يوجد رصيد للتسوية';
    END IF;
    
    -- إضافة معاملة دفع الراتب
    PERFORM add_financial_transaction(
        p_employee_id,
        'salary_payment',
        current_balance,
        'تسوية الحساب - دفع الرصيد المستحق',
        'system'
    );
    
    -- تحديث حالة الدفع
    UPDATE employees 
    SET payment_status = 'paid',
        last_payment_date = CURRENT_DATE,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_employee_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'فشل في تسوية الحساب: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- VIEWS مفيدة للاستعلامات
-- =========================================

-- عرض ملخص الموظفين مع آخر حضور
CREATE OR REPLACE VIEW employees_summary AS
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
    e.hire_date,
    e.last_payment_date,
    e.created_at,
    e.updated_at,
    COALESCE(a.status, 'absent') as last_attendance_status,
    a.attendance_date as last_attendance_date,
    CASE 
        WHEN a.attendance_date = CURRENT_DATE THEN a.status
        ELSE 'absent'
    END as today_attendance
FROM employees e
LEFT JOIN attendance a ON e.id = a.employee_id 
    AND a.attendance_date = (
        SELECT MAX(attendance_date) 
        FROM attendance a2 
        WHERE a2.employee_id = e.id
    )
WHERE e.is_active = true
ORDER BY e.name;

-- عرض المعاملات المالية اليومية
CREATE OR REPLACE VIEW daily_financial_summary AS
SELECT 
    e.id as employee_id,
    e.name,
    e.position,
    e.daily_wage,
    e.current_balance,
    COALESCE(SUM(CASE WHEN ft.transaction_type = 'withdrawal' THEN ft.amount ELSE 0 END), 0) as today_withdrawals,
    COALESCE(SUM(CASE WHEN ft.transaction_type = 'bonus' THEN ft.amount ELSE 0 END), 0) as today_bonuses,
    COALESCE(SUM(CASE WHEN ft.transaction_type = 'deduction' THEN ft.amount ELSE 0 END), 0) as today_deductions,
    COALESCE(SUM(CASE WHEN ft.transaction_type = 'salary_payment' THEN ft.amount ELSE 0 END), 0) as today_payments
FROM employees e
LEFT JOIN financial_transactions ft ON e.id = ft.employee_id 
    AND ft.transaction_date = CURRENT_DATE
WHERE e.is_active = true
GROUP BY e.id, e.name, e.position, e.daily_wage, e.current_balance
ORDER BY e.name;

-- عرض إحصائيات الحضور الشهرية
CREATE OR REPLACE VIEW monthly_attendance_stats AS
SELECT 
    e.id as employee_id,
    e.name,
    e.position,
    DATE_TRUNC('month', a.attendance_date) as month,
    COUNT(a.id) as total_days,
    COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_days,
    COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_days,
    ROUND(
        COUNT(CASE WHEN a.status = 'present' THEN 1 END)::decimal / 
        NULLIF(COUNT(a.id), 0) * 100, 2
    ) as attendance_percentage
FROM employees e
LEFT JOIN attendance a ON e.id = a.employee_id
WHERE e.is_active = true
GROUP BY e.id, e.name, e.position, DATE_TRUNC('month', a.attendance_date)
ORDER BY e.name, month DESC;

-- =========================================
-- إضافة البيانات التجريبية
-- =========================================

-- إدراج الموظفين التجريبيين
INSERT INTO employees (name, position, phone, daily_wage, current_balance, total_bonuses, total_deductions, payment_status) 
VALUES
    ('أحمد الحلاق', 'صنايعي', '0501234567', 300.00, 180.00, 50.00, 20.00, 'pending'),
    ('محمد الأسطى', 'صنايعي', '0509876543', 300.00, 200.00, 0.00, 0.00, 'pending'),
    ('يوسف المساعد', 'مساعد', '0501122334', 120.00, 80.00, 20.00, 10.00, 'paid'),
    ('كريم الكاشير', 'مساعد', '0505566778', 120.00, 120.00, 0.00, 0.00, 'deferred'),
    ('فاطمة السكرتيرة', 'إدارية', '0507788990', 200.00, 200.00, 0.00, 0.00, 'pending')
ON CONFLICT DO NOTHING;

-- إدراج بيانات الحضور للأيام الماضية
INSERT INTO attendance (employee_id, attendance_date, status) VALUES
    -- أحمد الحلاق
    (1, CURRENT_DATE, 'present'),
    (1, CURRENT_DATE - INTERVAL '1 day', 'present'),
    (1, CURRENT_DATE - INTERVAL '2 days', 'absent'),
    
    -- محمد الأسطى  
    (2, CURRENT_DATE, 'present'),
    (2, CURRENT_DATE - INTERVAL '1 day', 'present'),
    (2, CURRENT_DATE - INTERVAL '2 days', 'present'),
    
    -- يوسف المساعد
    (3, CURRENT_DATE, 'present'),
    (3, CURRENT_DATE - INTERVAL '1 day', 'present'),
    (3, CURRENT_DATE - INTERVAL '2 days', 'present'),
    
    -- كريم الكاشير
    (4, CURRENT_DATE, 'present'),
    (4, CURRENT_DATE - INTERVAL '1 day', 'absent'),
    (4, CURRENT_DATE - INTERVAL '2 days', 'present'),
    
    -- فاطمة السكرتيرة
    (5, CURRENT_DATE, 'present'),
    (5, CURRENT_DATE - INTERVAL '1 day', 'present'),
    (5, CURRENT_DATE - INTERVAL '2 days', 'present')
ON CONFLICT (employee_id, attendance_date) DO NOTHING;

-- إدراج المعاملات المالية التجريبية
INSERT INTO financial_transactions (employee_id, transaction_type, amount, description, transaction_date) VALUES
    -- معاملات أحمد
    (1, 'withdrawal', 150.00, 'سحب نقدي', CURRENT_DATE),
    (1, 'bonus', 50.00, 'بونص أداء', CURRENT_DATE),
    (1, 'deduction', 20.00, 'خصم تأخير', CURRENT_DATE),
    
    -- معاملات محمد
    (2, 'withdrawal', 100.00, 'سحب نقدي', CURRENT_DATE),
    
    -- معاملات يوسف
    (3, 'withdrawal', 50.00, 'سحب نقدي', CURRENT_DATE),
    (3, 'bonus', 20.00, 'بونص حضور', CURRENT_DATE),
    (3, 'deduction', 10.00, 'خصم كسر', CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- =========================================
-- إحصائيات ختامية
-- =========================================

-- عرض ملخص المعلومات
DO $$
DECLARE
    employee_count INTEGER;
    transaction_count INTEGER;
    attendance_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO employee_count FROM employees WHERE is_active = true;
    SELECT COUNT(*) INTO transaction_count FROM financial_transactions;
    SELECT COUNT(*) INTO attendance_count FROM attendance;
    
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Database setup completed successfully!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Employees created: %', employee_count;
    RAISE NOTICE 'Transactions created: %', transaction_count;
    RAISE NOTICE 'Attendance records created: %', attendance_count;
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'You can now start the backend server!';
    RAISE NOTICE '===========================================';
END $$;