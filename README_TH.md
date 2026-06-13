# NAK Incentive Web App - ระบบฟูลฟังก์ชั่น

ไฟล์นี้เป็นโปรเจกต์เว็บแอปภาษาไทยเวอร์ชัน **Vercel + Firebase Firestore Online Ready**

## มีอะไรในระบบ

- หน้า Login ด้วยรหัสพนักงาน + PIN
- ขอเปิดใช้งานครั้งแรกด้วยรหัสพนักงาน + วันเริ่มงาน
- Manager/Admin อนุมัติเปิดใช้งาน
- ตั้ง PIN 6 หลัก
- อุปกรณ์ที่เชื่อถือได้
- Staff Dashboard
- หน้ารายละเอียด Incentive
- ประวัติย้อนหลัง
- แจ้งปัญหาข้อมูล
- หลังบ้าน Manager
- หลังบ้าน Admin
- อัปโหลด Excel
- Mapping คอลัมน์
- ประวัติ Import Batch
- Audit Log
- รองรับไฟล์อนาคต เช่น เบี้ยขยัน OT Bonus Attendance

## วิธีรันในเครื่อง

```bash
npm install
cp .env.example .env.local
npm run dev
```

เปิดเว็บ:

```text
http://localhost:3000
```

## วิธีขึ้น Vercel

1. สร้าง Firebase Project
2. เปิด Firestore Database
3. สร้าง Service Account
4. เอา Service Account JSON ไปแปลงเป็น Base64
5. ใส่ Environment Variables ใน Vercel
6. Push โปรเจกต์ขึ้น GitHub
7. Import GitHub Repo ใน Vercel
8. Deploy
9. สร้าง Admin ครั้งแรก

## Environment Variables สำคัญ

```env
FIREBASE_PROJECT_ID=
FIREBASE_SERVICE_ACCOUNT_BASE64=
SESSION_SECRET=
SETUP_SECRET=
DEFAULT_ADMIN_CODE=ADMIN
DEFAULT_ADMIN_PIN=123456
MAX_TRUSTED_DEVICES=2
MAX_FAILED_PIN=5
SESSION_DAYS=7
```

## สร้าง Admin ครั้งแรก

เรียก API นี้หลัง Deploy:

```bash
curl -X POST https://your-domain.vercel.app/api/admin/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"setupSecret":"ใส่ค่า SETUP_SECRET","employeeCode":"ADMIN","pin":"123456"}'
```

จากนั้นเข้าเว็บด้วย:

```text
รหัส: ADMIN
PIN: 123456
```

## Flow ใช้งานจริง

1. Admin Login
2. Admin ไปเมนูอัปโหลด Excel
3. เลือกประเภทไฟล์ Incentive
4. เลือกเดือน/ปี และ HUB
5. อัปโหลดไฟล์ Excel
6. ตรวจ Mapping
7. กดยืนยันนำเข้า
8. พนักงานขอเปิดใช้งานครั้งแรก
9. Manager/Admin อนุมัติ
10. พนักงานตั้ง PIN
11. พนักงานดูข้อมูลตัวเองได้

## หมายเหตุสำคัญ

ระบบจะแสดงข้อความในหน้า Dashboard และหน้ารายละเอียดว่า:

> ยอดที่แสดงเป็นข้อมูลจากไฟล์ Incentive เท่านั้น ยังไม่รวมรายได้จากเบี้ยขยัน

## ข้อควรระวัง

- ถ้าใช้ Vercel Hobby สำหรับงานบริษัทจริง ต้องตรวจเงื่อนไขของ Vercel เอง
- Firebase Storage ไม่ได้ใช้ในเวอร์ชันนี้ เพื่อประหยัดค่าใช้จ่าย
- ถ้าต้องเก็บไฟล์ Excel ต้นฉบับ ต้องเพิ่ม Firebase Storage และอาจต้องใช้ Blaze Plan
