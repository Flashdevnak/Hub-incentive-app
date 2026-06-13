# Firestore Collections

## employees
ข้อมูลหลักพนักงาน เช่น employee_code, employee_name, hub_name, position, start_date

## user_accounts
บัญชีล็อกอิน เช่น pin_hash, role, scope_type, status, failed_login_count

## activation_requests
คำขอเปิดใช้งานครั้งแรก

## import_batches
ประวัติการนำเข้าไฟล์ Excel

## raw_import_rows
ข้อมูล Excel ดิบทุกแถว เก็บเป็น JSON เพื่อรองรับคอลัมน์ใหม่

## incentive_records
ข้อมูล Incentive ที่แปลงแล้วสำหรับแสดงผล

## income_records
ข้อมูลไฟล์อื่น เช่น เบี้ยขยัน OT Bonus

## field_mappings / file_templates
Mapping หัวตาราง Excel → ฟิลด์ระบบ / ชื่อภาษาไทย

## issue_tickets
คำร้องแจ้งปัญหาข้อมูล

## audit_logs
ประวัติการใช้งานและการแก้ไขทั้งหมด
