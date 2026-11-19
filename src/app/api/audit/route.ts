import { NextResponse } from 'next/server';
import { getAuditLogs, addAuditLog } from '@/lib/db';
import { UserRole } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('content_id') || undefined;
    const logs = await getAuditLogs(contentId);
    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { actor, role, action, content_id } = body;

    if (!actor || !role || !action) {
      return NextResponse.json({ error: 'Actor, role, and action are required' }, { status: 400 });
    }

    const log = await addAuditLog({
      actor,
      role: role as UserRole,
      action,
      content_id,
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
