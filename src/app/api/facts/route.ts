import { NextResponse } from 'next/server';
import { getFacts, createFact, updateFact, deleteFact, addAuditLog } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const facts = await getFacts();
    return NextResponse.json(facts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, statement, actor, role } = body;

    if (!code || !statement) {
      return NextResponse.json({ error: 'Code and statement are required' }, { status: 400 });
    }

    const created = await createFact({ code, statement });

    await addAuditLog({
      actor: actor || 'Admin',
      role: role || 'Admin',
      action: `Created approved fact ${code}`,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, code, statement, actor, role } = body;

    if (!id) {
      return NextResponse.json({ error: 'Fact id is required' }, { status: 400 });
    }

    const updated = await updateFact(id, { code, statement });

    await addAuditLog({
      actor: actor || 'Admin',
      role: role || 'Admin',
      action: `Updated approved fact ${code || id}`,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const actor = searchParams.get('actor') || 'Admin';
    const role = (searchParams.get('role') as any) || 'Admin';

    if (!id) {
      return NextResponse.json({ error: 'Fact id is required' }, { status: 400 });
    }

    await deleteFact(id);

    await addAuditLog({
      actor,
      role,
      action: `Deleted approved fact ${id}`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
