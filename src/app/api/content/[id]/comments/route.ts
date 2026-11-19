import { NextResponse } from 'next/server';
import { getComments, addComment, addAuditLog } from '@/lib/db';
import { UserRole } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const comments = await getComments(id);
    return NextResponse.json(comments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { text, author, role } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Comment text cannot be empty' }, { status: 400 });
    }

    const comment = await addComment({
      content_id: id,
      author: author || 'User',
      role: (role as UserRole) || 'Reviewer',
      text: text.trim(),
    });

    await addAuditLog({
      actor: author || 'User',
      role: (role as UserRole) || 'Reviewer',
      action: `Added comment: "${text.trim().slice(0, 60)}${text.trim().length > 60 ? '...' : ''}"`,
      content_id: id,
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
