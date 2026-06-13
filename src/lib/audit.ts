import { db, ts } from './firebaseAdmin';

export async function audit(actorCode: string, actorRole: string, action: string, targetType: string, targetId: string, detail: any = {}, req?: Request) {
  try {
    await db().collection('audit_logs').add({
      actor_code: actorCode,
      actor_role: actorRole,
      action,
      target_type: targetType,
      target_id: targetId,
      detail_json: detail,
      ip_address: req?.headers.get('x-forwarded-for') || '',
      device_info: req?.headers.get('user-agent') || '',
      created_at: ts()
    });
  } catch (e) {
    console.error('audit log failed', e);
  }
}
