import admin from 'firebase-admin';
import crypto from 'crypto';

function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(pin, salt, 120000, 32, 'sha256').toString('hex');
  return `pbkdf2$120000$${salt}$${hash}`;
}
function serviceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) return JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8'));
  return { projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') };
}
admin.initializeApp({ credential: admin.credential.cert(serviceAccount()) });
const db = admin.firestore();
const employeeCode = (process.env.DEFAULT_ADMIN_CODE || 'ADMIN').toUpperCase();
const pin = process.env.DEFAULT_ADMIN_PIN || '123456';
await db.collection('user_accounts').doc(employeeCode).set({ employee_code: employeeCode, pin_hash: hashPin(pin), role: 'super_admin', scope_type: 'ALL', status: 'ACTIVE', is_locked: false, failed_login_count: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { merge: true });
await db.collection('employees').doc(employeeCode).set({ employee_code: employeeCode, employee_name: 'ผู้ดูแลระบบ', employment_status: 'ACTIVE', updated_at: new Date().toISOString() }, { merge: true });
console.log(`Seeded admin: ${employeeCode} / ${pin}`);
process.exit(0);
