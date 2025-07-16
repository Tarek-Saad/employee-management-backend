# 👥 Employee Management System - Backend

نظام إدارة الموظفين - الخادم الخلفي

![Node.js](https://img.shields.io/badge/Node.js-v16+-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)
![Express.js](https://img.shields.io/badge/Express.js-4.18+-lightgrey.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## 📋 جدول المحتويات

- [نظرة عامة](#نظرة-عامة)
- [المميزات](#المميزات)
- [متطلبات النظام](#متطلبات-النظام)
- [التثبيت والإعداد](#التثبيت-والإعداد)
- [التشغيل](#التشغيل)
- [API Documentation](#api-documentation)
- [هيكل المشروع](#هيكل-المشروع)
- [قاعدة البيانات](#قاعدة-البيانات)
- [البيئات](#البيئات)
- [الاختبارات](#الاختبارات)
- [النشر](#النشر)
- [المساهمة](#المساهمة)
- [الدعم](#الدعم)

## 🎯 نظرة عامة

نظام إدارة الموظفين هو تطبيق ويب مخصص لإدارة الموظفين في الشركات الصغيرة والمتوسطة. يوفر النظام إدارة شاملة للموظفين، الحضور، المرتبات، والمعاملات المالية.

### التقنيات المستخدمة

- **Backend**: Node.js + TypeScript + Express.js
- **Database**: PostgreSQL
- **ORM**: Raw SQL queries مع pg library
- **Authentication**: لاحقاً (JWT)
- **Validation**: Custom validation functions
- **API Style**: RESTful API

## ✨ المميزات

### 👤 إدارة الموظفين

- ✅ إضافة وتعديل وحذف الموظفين
- ✅ البحث والتصفية المتقدمة
- ✅ تتبع الأجور والمناصب
- ✅ إدارة حالات الدفع

### 📅 إدارة الحضور

- ✅ تسجيل الحضور اليومي
- ✅ تتبع أوقات الدخول والخروج
- ✅ تقارير الحضور المفصلة
- ✅ إحصائيات الحضور الشهرية

### 💰 المعاملات المالية

- ✅ تسجيل السحوبات
- ✅ إدارة البونص والخصومات
- ✅ تسوية الحسابات
- ✅ تتبع التاريخ المالي

### 📊 التقارير والإحصائيات

- ✅ ملخص الموظفين
- ✅ التقارير المالية
- ✅ تقارير الحضور
- ✅ لوحة المعلومات

## 💻 متطلبات النظام

### الحد الأدنى

- **Node.js**: v16.0.0 أو أحدث
- **npm**: v8.0.0 أو أحدث
- **PostgreSQL**: v12.0 أو أحدث
- **Memory**: 512MB RAM
- **Storage**: 100MB مساحة فارغة

### المستحسن

- **Node.js**: v18.0.0 أو أحدث
- **PostgreSQL**: v15.0 أو أحدث
- **Memory**: 1GB RAM
- **Storage**: 500MB مساحة فارغة

## 🚀 التثبيت والإعداد

### 1. استنساخ المشروع

```bash
git clone https://github.com/your-username/employee-management-backend.git
cd employee-management-backend
```

### 2. تثبيت المكتبات

```bash
npm install
```

### 3. إعداد قاعدة البيانات

#### خيار أ: إعداد قاعدة بيانات محلية

```bash
# إنشاء قاعدة بيانات جديدة
createdb employee_management

# تطبيق SQL schema
psql employee_management -f database.sql
```

#### خيار ب: استخدام Neon Database (مُستحسن)

1. إنشاء حساب على [Neon](https://neon.tech)
2. إنشاء قاعدة بيانات جديدة
3. نسخ connection string
4. تطبيق database.sql

```bash
psql "your-connection-string" -f database.sql
```

### 4. إعداد متغيرات البيئة

```bash
# نسخ ملف البيئة المثال
cp .env.example .env

# تعديل الملف
nano .env
```

تحديث المتغيرات التالية:

```env
DATABASE_URL=your-postgresql-connection-string
PORT=3001
NODE_ENV=development
```

### 5. اختبار الإعداد

```bash
# اختبار قاعدة البيانات
npm run test-db

# اختبار الخادم
npm run dev
```

## 🏃‍♂️ التشغيل

### Development Mode

```bash
npm run dev
```

الخادم سيعمل على: `http://localhost:3001`

### Production Mode

```bash
# بناء المشروع
npm run build

# تشغيل النسخة المبنية
npm start
```

### أوامر npm المتاحة

```bash
npm run dev          # تشغيل development mode مع hot reload
npm run build        # بناء المشروع للإنتاج
npm start            # تشغيل النسخة المبنية
npm run test-db      # اختبار قاعدة البيانات
npm run lint         # فحص الكود
npm run lint:fix     # إصلاح مشاكل الكود تلقائياً
npm test             # تشغيل الاختبارات
```

## 🔌 API Documentation

### Base URL

```
http://localhost:3001/api
```

### Authentication

حالياً لا يوجد authentication (سيُضاف لاحقاً)

### Endpoints

#### 👥 Employees

| Method | Endpoint         | Description       |
| ------ | ---------------- | ----------------- |
| GET    | `/employees`     | جلب جميع الموظفين |
| GET    | `/employees/:id` | جلب موظف بالمعرف  |
| POST   | `/employees`     | إضافة موظف جديد   |
| PUT    | `/employees/:id` | تحديث بيانات موظف |
| DELETE | `/employees/:id` | حذف موظف          |

#### 📅 Attendance

| Method | Endpoint                    | Description    |
| ------ | --------------------------- | -------------- |
| POST   | `/employees/:id/attendance` | تسجيل الحضور   |
| GET    | `/employees/:id/attendance` | جلب سجل الحضور |

#### 💰 Financial Transactions

| Method | Endpoint                      | Description        |
| ------ | ----------------------------- | ------------------ |
| POST   | `/employees/:id/transactions` | إضافة معاملة مالية |
| GET    | `/employees/:id/transactions` | جلب معاملات الموظف |
| POST   | `/employees/:id/settle`       | تسوية الحساب       |

#### 📊 Reports

| Method | Endpoint                        | Description   |
| ------ | ------------------------------- | ------------- |
| GET    | `/employees/reports/summary`    | ملخص الموظفين |
| GET    | `/employees/reports/attendance` | تقرير الحضور  |

### أمثلة على الاستخدام

#### إضافة موظف جديد

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

#### تسجيل الحضور

```bash
curl -X POST http://localhost:3001/api/employees/1/attendance \
  -H "Content-Type: application/json" \
  -d '{
    "status": "present",
    "check_in_time": "09:00:00"
  }'
```

#### إضافة معاملة مالية

```bash
curl -X POST http://localhost:3001/api/employees/1/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_type": "bonus",
    "amount": 100,
    "description": "بونص أداء شهري"
  }'
```

## 📁 هيكل المشروع

```
employee-management-backend/
├── src/
│   ├── lib/
│   │   └── db.ts                 # إعداد قاعدة البيانات
│   ├── types/
│   │   └── employee.ts           # أنواع البيانات
│   ├── services/
│   │   └── employeeService.ts    # خدمات الموظفين
│   ├── routes/
│   │   └── employees.ts          # مسارات API
│   ├── server.ts                 # الملف الرئيسي
│   └── test-db.ts               # اختبار قاعدة البيانات
├── dist/                        # الملفات المبنية
├── database.sql                 # SQL schema
├── package.json
├── tsconfig.json
├── .env                         # متغيرات البيئة
├── .gitignore
└── README.md
```

## 🗄️ قاعدة البيانات

### الجداول الرئيسية

#### `employees` - الموظفين

- `id` - المعرف الفريد
- `name` - الاسم
- `position` - المنصب
- `phone` - رقم الهاتف
- `daily_wage` - الأجر اليومي
- `current_balance` - الرصيد الحالي
- `payment_status` - حالة الدفع

#### `attendance` - الحضور

- `id` - المعرف الفريد
- `employee_id` - معرف الموظف
- `attendance_date` - تاريخ الحضور
- `status` - حالة الحضور (present/absent)

#### `financial_transactions` - المعاملات المالية

- `id` - المعرف الفريد
- `employee_id` - معرف الموظف
- `transaction_type` - نوع المعاملة
- `amount` - المبلغ
- `description` - الوصف

### العلاقات

- `attendance.employee_id` → `employees.id`
- `financial_transactions.employee_id` → `employees.id`

### المؤشرات (Indexes)

- فهارس على `employee_id` لتحسين الأداء
- فهارس على `attendance_date` و `transaction_date`
- فهارس على `status` و `transaction_type`

## 🌍 البيئات

### Development

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://localhost/employee_management_dev
LOG_LEVEL=debug
```

### Testing

```env
NODE_ENV=test
PORT=3002
DATABASE_URL=postgresql://localhost/employee_management_test
LOG_LEVEL=warn
```

### Production

```env
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://production-host/employee_management
LOG_LEVEL=error
RATE_LIMIT_ENABLED=true
```

## 🧪 الاختبارات

### تشغيل جميع الاختبارات

```bash
npm test
```

### اختبار قاعدة البيانات فقط

```bash
npm run test-db
```

### اختبارات الأداء

```bash
npm run test:performance
```

### اختبارات التكامل

```bash
npm run test:integration
```

## 🚢 النشر

### Docker (مُستحسن)

```bash
# بناء الصورة
docker build -t employee-management-backend .

# تشغيل الحاوية
docker run -p 3001:3001 -e DATABASE_URL="your-connection-string" employee-management-backend
```

### Manual Deployment

```bash
# على الخادم
git clone https://github.com/your-username/employee-management-backend.git
cd employee-management-backend
npm install
npm run build
npm start
```

### استخدام PM2

```bash
# تثبيت PM2
npm install -g pm2

# تشغيل التطبيق
pm2 start dist/server.js --name "employee-api"

# مراقبة التطبيق
pm2 monitor
```

## 🔧 التكوين المتقدم

### إعدادات قاعدة البيانات

```env
# Connection Pool
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT=30000
DB_POOL_CONNECTION_TIMEOUT=2000

# SSL
DB_SSL_ENABLED=true
DB_SSL_REJECT_UNAUTHORIZED=false
```

### إعدادات الأمان

```env
# CORS
CORS_ORIGIN=http://localhost:3000,https://yourdomain.com
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### إعدادات السجلات

```env
# Logging
LOG_LEVEL=info
LOG_FORMAT=combined
ENABLE_REQUEST_LOGGING=true
ENABLE_SQL_LOGGING=false
```

## 🐛 استكشاف الأخطاء

### مشاكل شائعة

#### خطأ الاتصال بقاعدة البيانات

```bash
Error: getaddrinfo ENOTFOUND
```

**الحل**: تحقق من connection string في `.env`

#### خطأ في المنافذ

```bash
Error: listen EADDRINUSE :::3001
```

**الحل**: غير PORT في `.env` أو أوقف العملية الأخرى

#### خطأ في الصلاحيات

```bash
Error: permission denied for table employees
```

**الحل**: تحقق من صلاحيات قاعدة البيانات

### تشخيص المشاكل

```bash
# اختبار قاعدة البيانات
npm run test-db

# فحص logs
npm run dev | grep ERROR

# اختبار API endpoints
curl http://localhost:3001/health
```

## 📈 مراقبة الأداء

### مقاييس الأداء

- Response time للـ APIs
- Database query performance
- Memory usage
- Error rates

### أدوات المراقبة

- Built-in health check endpoint
- Database connection monitoring
- Error logging with timestamps

## 🔒 الأمان

### مُطبق حالياً

- Input validation
- SQL injection protection
- CORS configuration
- Error handling

### قادم لاحقاً

- JWT authentication
- Role-based access control
- API rate limiting
- Request encryption

## 🤝 المساهمة

### كيفية المساهمة

1. Fork المشروع
2. إنشاء branch جديد (`git checkout -b feature/amazing-feature`)
3. Commit التغييرات (`git commit -m 'Add amazing feature'`)
4. Push للـ branch (`git push origin feature/amazing-feature`)
5. فتح Pull Request

### معايير الكود

- استخدام TypeScript
- اتباع ESLint rules
- كتابة تعليقات باللغة العربية
- إضافة tests للميزات الجديدة

### البلاغات والاقتراحات

أرسل [issue جديد](https://github.com/your-username/employee-management-backend/issues) لبلاغ مشكلة أو اقتراح ميزة.

## 📞 الدعم

### التوثيق

- [API Documentation](./docs/api.md)
- [Database Schema](./docs/database.md)
- [Deployment Guide](./docs/deployment.md)

### المجتمع

- [GitHub Issues](https://github.com/your-username/employee-management-backend/issues)
- [Discussions](https://github.com/your-username/employee-management-backend/discussions)

### التواصل

- Email: your-email@example.com
- Telegram: @your-username

## 📄 الترخيص

هذا المشروع مرخص تحت رخصة MIT. انظر ملف [LICENSE](LICENSE) للتفاصيل.

## 🙏 شكر وتقدير

- [Express.js](https://expressjs.com/) - Web framework
- [PostgreSQL](https://www.postgresql.org/) - Database
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Node.js](https://nodejs.org/) - Runtime

---

**Made with ❤️ for small businesses**

_نظام إدارة الموظفين - حل شامل لإدارة الموارد البشرية_
