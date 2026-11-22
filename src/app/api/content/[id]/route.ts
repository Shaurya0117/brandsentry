import { NextResponse } from 'next/server';
import {
  getContentItem,
  getVersions,
  getFindings,
  getComments,
  getAuditLogs,
  updateContentItemStatus,
  addAuditLog,
  addComment,
} from '@/lib/db';
import { ContentStatus, UserRole } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const content = await getContentItem(id);

    if (!content) {
      return NextResponse.json({ error: 'Content item not found' }, { status: 404 });
    }

    const versions = await getVersions(id);
    const latestVersion = versions.length > 0 ? versions[versions.length - 1] : null;

    let findings: any[] = [];
    if (latestVersion) {
      findings = await getFindings(latestVersion.id);
    }

    const [comments, auditLogs] = await Promise.all([
      getComments(id),
      getAuditLogs(id),
    ]);

    return NextResponse.json({
      content,
      versions,
      currentVersion: latestVersion,
      findings,
      comments,
      auditLogs,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, actor = 'User', role = 'Reviewer', commentText } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // Server-side role enforcement
    if (status === 'approved') {
      if (!['Manager', 'Admin'].includes(role)) {
        return NextResponse.json(
          { error: `Users with role "${role}" cannot authorize publication. Only Managers and Admins have approval authority.` },
          { status: 403 }
        );
      }
    } else if (status === 'changes_requested') {
      if (!['Manager', 'Reviewer', 'Admin'].includes(role)) {
        return NextResponse.json(
          { error: `Users with role "${role}" cannot request changes. Manager, Reviewer, or Admin role required.` },
          { status: 403 }
        );
      }
    }

    // Enforce required comment when requesting changes
    if (status === 'changes_requested' && (!commentText || !commentText.trim())) {
      return NextResponse.json(
        { error: 'A comment explaining the required changes is mandatory when requesting changes.' },
        { status: 400 }
      );
    }

    const updated = await updateContentItemStatus(id, status as ContentStatus);

    if (commentText && commentText.trim()) {
      await addComment({
        content_id: id,
        author: actor,
        role: role as UserRole,
        text: commentText.trim(),
      });
    }

    await addAuditLog({
      actor,
      role: role as UserRole,
      action: `Changed content status to "${status}"${commentText ? `: "${commentText.trim()}"` : ''}`,
      content_id: id,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
