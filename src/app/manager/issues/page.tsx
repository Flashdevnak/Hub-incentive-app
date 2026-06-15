'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';

export default function ManagerIssuesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/manager/approvals?tab=issue');
  }, [router]);

  return (
    <AppShell area="manager">
      <div className="card empty-state-card">
        <h2>Redirecting to Approval Center</h2>
        <p className="muted">Review requests are handled in the Approval Center.</p>
      </div>
    </AppShell>
  );
}
