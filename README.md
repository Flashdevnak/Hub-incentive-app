# HUB Incentive Web App - Vercel + Firebase

เว็บแอปภาษาไทยสำหรับตรวจสอบ Incentive พนักงาน พร้อมระบบ Admin/Manager/Staff, Excel Import, Mapping คอลัมน์, Firestore Database, Trusted Device และ Audit Log

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

เปิด `http://localhost:3000`

## Deploy

1. สร้าง Firebase Project
2. สร้าง Service Account และใส่ค่าลง `.env.local` หรือ Environment Variables บน Vercel
3. Push ขึ้น GitHub
4. Import Repo ใน Vercel
5. ตั้ง Environment Variables
6. Deploy
7. สร้าง Admin ครั้งแรกด้วย API `/api/admin/bootstrap` หรือ `npm run seed:admin`

## Default Admin

ตั้งผ่าน env:

```env
DEFAULT_ADMIN_CODE=ADMIN
DEFAULT_ADMIN_PIN=123456
SETUP_SECRET=your-secret
```

แล้วเรียก:

```bash
curl -X POST https://your-domain.vercel.app/api/admin/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"setupSecret":"your-secret","employeeCode":"ADMIN","pin":"123456"}'
```

## Important

- This project is online-ready for Vercel + Firebase Firestore.
- Do not use SQLite for production.
- PIN is stored as PBKDF2 hash.
- Excel original files are not stored by default. Parsed rows are saved to Firestore.
- If you need to store original files, add Firebase Storage and use Blaze plan.
