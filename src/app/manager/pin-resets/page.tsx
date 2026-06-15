'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';

export default function PinResetRequestsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/manager/approvals?tab=pin');
  }, [router]);

  return (
    <AppShell area="manager">
      <div className="card empty-state-card">
        <h2>Redirecting to Approval Center</h2>
        <p className="muted">PIN reset requests are handled in the Approval Center.</p>
      </div>
    </AppShell>
  );
}
