import { NextResponse } from 'next/server';
import {
  getContentItem,
  getVersions,
  createVersion,
  saveFindings,
  addAuditLog,
  getGuidelines,
  getFacts,
  getTerms,
  updateFindingStatus,
} from '@/lib/db';
import { runRuleEngine } from '@/lib/rule-engine';
import { runAIJudge } from '@/lib/ai-judge';
import { validateAndMergeFindings } from '@/lib/validator';
import { UserRole } from '@/lib/types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      newBody,
      acceptedFindingId,
      actor = 'Alex (Creator)',
      role = 'Creator',
      actionDescription,
    } = body;

    const contentItem = await getContentItem(id);
    if (!contentItem) {
      return NextResponse.json({ error: 'Content item not found' }, { status: 404 });
    }

    if (!['Creator', 'Admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Only Creator or Admin roles can revise content and create new versions.' },
        { status: 403 }
      );
    }

    if (!newBody || !newBody.trim()) {
      return NextResponse.json({ error: 'Content body cannot be empty.' }, { status: 400 });
    }

    // Get current version number
    const existingVersions = await getVersions(id);
    const nextVersionNo = existingVersions.length > 0 ? existingVersions[existingVersions.length - 1].version_no + 1 : 1;

    // Create the new version
    const newVersion = await createVersion({
      content_id: id,
      version_no: nextVersionNo,
      body: newBody,
    });

    // If this was triggered by accepting a specific finding, mark it accepted
    if (acceptedFindingId) {
      await updateFindingStatus(acceptedFindingId, 'accepted');
    }

    // Run audit review on the new revised version to generate fresh findings
    const [guidelines, facts, terms] = await Promise.all([
      getGuidelines(),
      getFacts(),
      getTerms(),
    ]);

    const ruleFindings = runRuleEngine({
      content: newBody,
      channel: contentItem.channel,
      terms,
      guidelines,
      imageUrl: contentItem.image_url,
      imageAlt: contentItem.image_alt,
      textColor: contentItem.text_color,
      bgColor: contentItem.bg_color,
    });

    let aiFindings: any[] = [];
    if (!contentItem.is_confidential) {
      const aiResult = await runAIJudge({
        content: newBody,
        channel: contentItem.channel,
        isConfidential: false,
        guidelines,
        facts,
      });
      if (!aiResult.aiUnavailable && !aiResult.skippedConfidential) {
        aiFindings = aiResult.findings;
      }
    }

    const merged = validateAndMergeFindings({
      content: newBody,
      ruleFindings,
      aiFindings,
      guidelines,
      facts,
    });

    const findingsWithVersion = merged.map((f) => ({
      ...f,
      version_id: newVersion.id,
    }));

    const savedFindings = await saveFindings(findingsWithVersion);

    // Audit log
    await addAuditLog({
      actor,
      role: role as UserRole,
      action: actionDescription || `Created Version ${nextVersionNo} (applied revision/fix). ${savedFindings.length} open findings remaining.`,
      content_id: id,
    });

    return NextResponse.json({
      success: true,
      version: newVersion,
      findings: savedFindings,
    });
  } catch (error: any) {
    console.error('Error creating new version:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
