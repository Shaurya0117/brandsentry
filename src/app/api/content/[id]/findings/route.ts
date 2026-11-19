import { NextResponse } from 'next/server';
import { updateFindingStatus, addAuditLog } from '@/lib/db';
import { FindingStatus, UserRole } from '@/lib/types';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contentId } = await params;
    const body = await request.json();
    const { findingId, status, actor = 'User', role = 'Creator', explanation } = body;

    if (!findingId || !status) {
      return NextResponse.json({ error: 'Finding ID and status are required' }, { status: 400 });
    }

    const updated = await updateFindingStatus(findingId, status as FindingStatus);

    await addAuditLog({
      actor,
      role: role as UserRole,
      action: `Marked finding [${findingId.slice(0, 8)}] as ${status}${explanation ? ` (${explanation})` : ''}`,
      content_id: contentId,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
