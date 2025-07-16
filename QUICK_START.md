# 🚀 Quick Start Guide

دليل البداية السريعة لنظام إدارة الموظفين

## ⚡ التشغيل السريع (5 دقائق)

### 1. التحضير

```bash
# استنساخ المشروع
git clone https://github.com/your-username/employee-management-backend.git
cd employee-management-backend

# تشغيل script الإعداد التلقائي
chmod +x setup.sh
./setup.sh
```

### 2. الإعداد اليدوي (إذا لم يعمل script)

```bash
# تثبيت المكتبات
npm install

# إنشاء ملف البيئة
cp .env.example .env

# تحديث connection string في .env
nano .env

# إعداد قاعدة البيانات
psql "your-connection-string" -f database.sql

# تشغيل الخادم
npm run dev
```

### 3. التحقق من التشغيل

```bash
# اختبار الصحة العامة
curl http://localhost:3001/health

# اختبار قاعدة البيانات
curl http://localhost:3001/api/test-db

# جلب الموظفين
curl http://localhost:3001/api/employees
```

## 🛠️ الأوامر الأساسية

### تشغيل المشروع

```bash
npm run dev          # Development mode مع hot reload
npm run build        # بناء للإنتاج
npm start            # تشغيل الإنتاج
npm run test-db      # اختبار قاعدة البيانات
```

### إدارة قاعدة البيانات

```bash
# إعداد قاعدة البيانات
psql "CONNECTION_STRING" -f database.sql

# اختبار الاتصال
npm run test-db

# إعادة تعيين البيانات (احذر!)
psql "CONNECTION_STRING" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql "CONNECTION_STRING" -f database.sql
```

### التطوير

```bash
npm run lint         # فحص الكود
npm run lint:fix     # إصلاح المشاكل تلقائياً
npm test             # تشغيل الاختبارات
npm run clean        # تنظيف ملفات البناء
```

## 🔧 التكوين السريع

### ملف .env الأساسي

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://user:pass@host:5432/dbname
CORS_ORIGIN=http://localhost:3000
```

### connection strings مختلفة

```bash
# Local PostgreSQL
DATABASE_URL=postgresql://postgres:password@localhost:5432/employee_management

# Neon Database
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# Railway
DATABASE_URL=postgresql://postgres:pass@viaduct.proxy.rlwy.net:12345/railway

# Supabase
DATABASE_URL=postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres
```

## 📝 أمثلة API سريعة

### إضافة موظف

```bash
curl -X POST http://localhost:3001/api/employees \
  -H "Content-Type: application/json" \
  -d '{
    "name": "أحمد محمد",
    "position": "مطور",
    "phone": "01234567890",
    "daily_wage": 500
  }'
```

### تسجيل الحضور

```bash
curl -X POST http://localhost:3001/api/employees/1/attendance \
  -H "Content-Type: application/json" \
  -d '{"status": "present"}'
```

### إضافة بونص

```bash
curl -X POST http://localhost:3001/api/employees/1/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_type": "bonus",
    "amount": 100,
    "description": "بونص أداء"
  }'
```

### تسوية الحساب

```bash
curl -X POST http://localhost:3001/api/employees/1/settle
```

## 🐛 حل المشاكل السريع

### مشكلة: "فشل في جلب البيانات"

```bash
# تحقق من تشغيل الخادم
curl http://localhost:3001/health

# تحقق من قاعدة البيانات
npm run test-db

# تحقق من .env
cat .env | grep DATABASE_URL
```

### مشكلة: "Port already in use"

```bash
# غير PORT في .env
echo "PORT=3002" >> .env

# أو أوقف العملية المستخدمة للمنفذ
lsof -ti:3001 | xargs kill -9
```

### مشكلة: "Database connection failed"

```bash
# تحقق من connection string
psql "YOUR_CONNECTION_STRING" -c "SELECT NOW();"

# تحقق من firewall/network
ping your-database-host

# تحقق من SSL
psql "YOUR_CONNECTION_STRING?sslmode=require" -c "SELECT NOW();"
```

### مشكلة: "Table doesn't exist"

```bash
# أعد تطبيق database schema
psql "YOUR_CONNECTION_STRING" -f database.sql

# تحقق من الجداول
psql "YOUR_CONNECTION_STRING" -c "\dt"
```

## 🔄 إعادة التشغيل السريع

### إعادة تشغيل كاملة

```bash
# إيقاف الخادم (Ctrl+C)

# تنظيف وإعادة بناء
npm run clean
npm run build

# إعادة التشغيل
npm run dev
```

### إعادة تعيين قاعدة البيانات

```bash
# ⚠️ سيحذف جميع البيانات!
psql "YOUR_CONNECTION_STRING" -f database.sql

# اختبار
npm run test-db
```

## 📊 اختبار سريع للوظائف

### 1. إضافة موظف وتجربة الوظائف

```bash
# إضافة موظف
curl -X POST http://localhost:3001/api/employees \
  -H "Content-Type: application/json" \
  -d '{"name": "تجربة", "position": "موظف", "phone": "123", "daily_wage": 300}'

# تسجيل حضور
curl -X POST http://localhost:3001/api/employees/1/attendance \
  -H "Content-Type: application/json" \
  -d '{"status": "present"}'

# إضافة بونص
curl -X POST http://localhost:3001/api/employees/1/transactions \
  -H "Content-Type: application/json" \
  -d '{"transaction_type": "bonus", "amount": 50, "description": "تجربة"}'

# جلب بيانات الموظف
curl http://localhost:3001/api/employees/1

# تسوية الحساب
curl -X POST http://localhost:3001/api/employees/1/settle
```

### 2. اختبار التقارير

```bash
# ملخص الموظفين
curl http://localhost:3001/api/employees/reports/summary

# تقرير الحضور
curl "http://localhost:3001/api/employees/reports/attendance?start_date=2024-01-01&end_date=2024-12-31"
```

## 🌐 URLs مهمة

### Development

- **الخادم الرئيسي**: http://localhost:3001
- **فحص الصحة**: http://localhost:3001/health
- **اختبار قاعدة البيانات**: http://localhost:3001/api/test-db
- **API الموظفين**: http://localhost:3001/api/employees

### API Endpoints

```
GET    /health                           # فحص صحة الخادم
GET    /api/test-db                      # اختبار قاعدة البيانات

GET    /api/employees                    # جلب جميع الموظفين
POST   /api/employees                    # إضافة موظف
GET    /api/employees/:id                # جلب موظف محدد
PUT    /api/employees/:id                # تحديث موظف
DELETE /api/employees/:id                # حذف موظف

POST   /api/employees/:id/attendance     # تسجيل حضور
GET    /api/employees/:id/attendance     # جلب سجل حضور

POST   /api/employees/:id/transactions   # إضافة معاملة مالية
GET    /api/employees/:id/transactions   # جلب معاملات الموظف
POST   /api/employees/:id/settle         # تسوية الحساب

GET    /api/employees/reports/summary    # ملخص الموظفين
GET    /api/employees/reports/attendance # تقرير الحضور
```

## 📱 اختبار مع الفرونت إند

### تشغيل الفرونت إند

```bash
# في terminal منفصل
cd ../employee-management-frontend
npm run dev

# الفرونت إند على: http://localhost:3000
# الباك إند على: http://localhost:3001
```

### تحقق من CORS

```javascript
// في متصفح الفرونت إند
fetch("http://localhost:3001/api/employees")
  .then((r) => r.json())
  .then(console.log);
```

## 🎯 النصائح النهائية

### للتطوير السريع

1. **استخدم nodemon**: `npm run dev` يعيد التشغيل تلقائياً
2. **اختبر بانتظام**: `npm run test-db` للتأكد من قاعدة البيانات
3. **راجع logs**: اتبع console output لتتبع المشاكل
4. **استخدم curl**: لاختبار API endpoints بسرعة

### للنشر

1. **بناء أولاً**: `npm run build`
2. **اختبار الإنتاج**: `npm start`
3. **تحقق من .env**: قيم الإنتاج مختلفة
4. **مراقبة الأداء**: استخدم monitoring tools

### للمشاكل

1. **ابدأ بـ health check**: `curl http://localhost:3001/health`
2. **اختبر قاعدة البيانات**: `npm run test-db`
3. **راجع logs**: تحقق من console output
4. **تحقق من network**: ping, telnet, etc.

---

**🎉 مبروك! نظامك جاهز للعمل**

إذا واجهت أي مشاكل، راجع [README.md](./README.md) للتفاصيل الكاملة.
