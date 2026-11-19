import { NextResponse } from 'next/server';
import { getTerms, createTerm, updateTerm, deleteTerm, addAuditLog } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const terms = await getTerms();
    return NextResponse.json(terms);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { preferred, banned, note, actor, role } = body;

    if (!preferred || !banned) {
      return NextResponse.json({ error: 'Preferred and banned terms are required' }, { status: 400 });
    }

    const created = await createTerm({ preferred, banned, note });

    await addAuditLog({
      actor: actor || 'Admin',
      role: role || 'Admin',
      action: `Added brand term rule: prefer "${preferred}" over "${banned}"`,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, preferred, banned, note, actor, role } = body;

    if (!id) {
      return NextResponse.json({ error: 'Term id is required' }, { status: 400 });
    }

    const updated = await updateTerm(id, { preferred, banned, note });

    await addAuditLog({
      actor: actor || 'Admin',
      role: role || 'Admin',
      action: `Updated brand term rule for "${preferred}"`,
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
      return NextResponse.json({ error: 'Term id is required' }, { status: 400 });
    }

    await deleteTerm(id);

    await addAuditLog({
      actor,
      role,
      action: `Deleted brand term rule ${id}`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
