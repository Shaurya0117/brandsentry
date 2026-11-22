import { NextResponse } from 'next/server';
import {
  getGuidelines,
  getFacts,
  getTerms,
  createContentItem,
  createVersion,
  saveFindings,
  addAuditLog,
} from '@/lib/db';
import { runRuleEngine } from '@/lib/rule-engine';
import { runAIJudge } from '@/lib/ai-judge';
import { validateAndMergeFindings } from '@/lib/validator';
import { UserRole } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const {
      title,
      channel,
      body,
      created_by = 'Alex (Creator)',
      role = 'Creator',
      is_confidential = false,
      image_url = null,
      image_alt = null,
      text_color = null,
      bg_color = null,
    } = data;

    const trimmedTitle = typeof title === 'string' ? title.trim() : '';
    const trimmedBody = typeof body === 'string' ? body.trim() : '';

    if (!trimmedTitle) {
      return NextResponse.json(
        { error: 'Content title cannot be empty or whitespace only.' },
        { status: 400 }
      );
    }

    if (trimmedTitle.length > 200) {
      return NextResponse.json(
        { error: `Title exceeds maximum limit of 200 characters (submitted ${trimmedTitle.length} characters).` },
        { status: 400 }
      );
    }

    if (!trimmedBody) {
      return NextResponse.json(
        { error: 'Content body cannot be empty or whitespace only.' },
        { status: 400 }
      );
    }

    if (trimmedBody.length > 50000) {
      return NextResponse.json(
        { error: `Content body exceeds maximum limit of 50,000 characters (submitted ${trimmedBody.length} characters). Please submit content in sections.` },
        { status: 400 }
      );
    }

    if (!channel) {
      return NextResponse.json(
        { error: 'Publication channel is required.' },
        { status: 400 }
      );
    }

    // 1. Fetch Knowledge Base
    const [guidelines, facts, terms] = await Promise.all([
      getGuidelines(),
      getFacts(),
      getTerms(),
    ]);

    // Step 1: Rule Engine (no AI)
    const ruleFindings = runRuleEngine({
      content: body,
      channel,
      terms,
      guidelines,
      imageUrl: image_url,
      imageAlt: image_alt,
      textColor: text_color,
      bgColor: bg_color,
    });

    // Step 2: AI Judge (Gemini 2.5 Flash with PII masking & confidential bypass)
    let aiFindings: any[] = [];
    let aiUnavailable = false;
    let aiSkippedConfidential = false;
    let aiMessage = '';

    if (is_confidential) {
      aiSkippedConfidential = true;
      aiMessage = 'AI analysis bypassed for confidential document.';
    } else {
      const aiResult = await runAIJudge({
        content: body,
        channel,
        isConfidential: Boolean(is_confidential),
        guidelines,
        facts,
      });

      if (aiResult.aiUnavailable) {
        aiUnavailable = true;
        aiMessage = aiResult.error || 'AI service temporarily unavailable.';
      } else if (aiResult.skippedConfidential) {
        aiSkippedConfidential = true;
      } else {
        aiFindings = aiResult.findings;
      }
    }

    // Step 3: Validator & De-duplication
    const finalFindingsToSave = validateAndMergeFindings({
      content: body,
      ruleFindings,
      aiFindings,
      guidelines,
      facts,
    });

    // 4. Persist Content Item & Version 1
    const contentItem = await createContentItem({
      title,
      channel,
      status: 'draft',
      created_by,
      is_confidential: Boolean(is_confidential),
      image_url,
      image_alt,
      text_color,
      bg_color,
    });

    const initialVersion = await createVersion({
      content_id: contentItem.id,
      version_no: 1,
      body,
    });

    // Save findings with version_id
    const findingsWithVersion = finalFindingsToSave.map((f) => ({
      ...f,
      version_id: initialVersion.id,
    }));

    const savedFindings = await saveFindings(findingsWithVersion);

    // Audit Log
    await addAuditLog({
      actor: created_by,
      role: role as UserRole,
      action: `Created draft content "${title}" (v1) and executed BrandSentry audit pipeline. Identified ${savedFindings.length} findings (${savedFindings.filter((f) => !f.is_ai).length} rule-based, ${savedFindings.filter((f) => f.is_ai).length} AI-assisted).`,
      content_id: contentItem.id,
    });

    return NextResponse.json({
      success: true,
      content_id: contentItem.id,
      version_id: initialVersion.id,
      version_no: 1,
      findings: savedFindings,
      ai_unavailable: aiUnavailable,
      ai_skipped_confidential: aiSkippedConfidential,
      message: aiMessage,
    });
  } catch (error: any) {
    console.error('[BrandSentry Review API] Uncaught pipeline error:', error);
    return NextResponse.json(
      {
        error: error.message || 'An unexpected error occurred during the review pipeline.',
      },
      { status: 500 }
    );
  }
}
