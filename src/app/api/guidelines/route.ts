import { NextResponse } from 'next/server';
import { getGuidelines, createGuideline, updateGuideline, deleteGuideline, addAuditLog } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const guidelines = await getGuidelines();
    return NextResponse.json(guidelines);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, category, text, actor, role } = body;

    if (!code || !category || !text) {
      return NextResponse.json({ error: 'Code, category, and text are required' }, { status: 400 });
    }

    const created = await createGuideline({ code, category, text });

    await addAuditLog({
      actor: actor || 'Admin',
      role: role || 'Admin',
      action: `Created brand guideline ${code} (${category})`,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, code, category, text, is_active, actor, role } = body;

    if (!id) {
      return NextResponse.json({ error: 'Guideline id is required' }, { status: 400 });
    }

    const updates: any = {};
    if (code !== undefined) updates.code = code;
    if (category !== undefined) updates.category = category;
    if (text !== undefined) updates.text = text;
    if (is_active !== undefined) updates.is_active = is_active;

    const updated = await updateGuideline(id, updates);

    await addAuditLog({
      actor: actor || 'Admin',
      role: role || 'Admin',
      action: is_active !== undefined
        ? `${is_active ? 'Activated' : 'Deactivated'} brand guideline ${code || id}`
        : `Updated brand guideline ${code || id}`,
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
      return NextResponse.json({ error: 'Guideline id is required' }, { status: 400 });
    }

    await deleteGuideline(id);

    await addAuditLog({
      actor,
      role,
      action: `Deleted brand guideline ${id}`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
