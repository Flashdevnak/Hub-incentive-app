import { NextRequest } from 'next/server';
import { ok, requireAuth, handleError } from '@/lib/http';
import { getPendingSummary } from '@/lib/pendingSummary';

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    return ok({ summary: await getPendingSummary(user) });
  } catch (e) {
    return handleError(e);
  }
}
