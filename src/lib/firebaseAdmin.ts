import * as admin from 'firebase-admin';

function getServiceAccount(): admin.ServiceAccount {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (b64) {
    const json = Buffer.from(b64, 'base64').toString('utf8');
    return JSON.parse(json);
  }
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin environment variables. See .env.example');
  }
  return { projectId, clientEmail, privateKey };
}

export function getAdminApp() {
  if (admin.apps.length > 0) return admin.app();
  return admin.initializeApp({ credential: admin.credential.cert(getServiceAccount()) });
}

export function db() {
  return getAdminApp().firestore();
}

export function ts() {
  return new Date().toISOString();
}
