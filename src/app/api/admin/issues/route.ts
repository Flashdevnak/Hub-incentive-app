import { NextRequest } from 'next/server';
import { db, ts } from '@/lib/firebaseAdmin';
import { ok, requireAuth, handleError } from '@/lib/http';
export async function GET(req: NextRequest) {
  try {
    requireAuth(req, ['super_admin','admin','area_manager','hub_manager','supervisor']);
    const snap = await db().collection('issue_tickets').orderBy('created_at','desc').limit(200).get();
    return ok({ issues: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch(e) { return handleError(e); }
}
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req, ['super_admin','admin','area_manager','hub_manager','supervisor']);
    const { id, status, resolutionNote } = await req.json();
    await db().collection('issue_tickets').doc(id).set({ status, resolution_note: resolutionNote || '', resolved_by: user.employeeCode, resolved_at: ts() }, { merge: true });
    return ok({ message: 'อัปเดตคำร้องแล้ว' });
  } catch(e) { return handleError(e); }
}
