import { NextResponse } from 'next/server';
import { getAllFindings, getGuidelines, getContentItems, getVersions, getFindings } from '@/lib/db';
import { Guideline, Finding } from '@/lib/types';
import { computeComplianceScore } from '@/components/ComplianceScoreRing';

export async function GET(request: Request) {
  try {
    const [findings, guidelines, contentItems] = await Promise.all([
      getAllFindings(),
      getGuidelines(),
      getContentItems(),
    ]);

    // 1. Findings count by category
    const categoryCounts: Record<string, number> = {
      tone: 0,
      terminology: 0,
      fact: 0,
      claim: 0,
      visual: 0,
      accessibility: 0,
    };

    findings.forEach((f) => {
      const cat = f.category || 'tone';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    // 2. Top 5 most-triggered guideline / source codes
    const codeCounts: Record<string, { code: string; count: number; category: string }> = {};

    findings.forEach((f) => {
      const code = f.source_code || 'OTHER';
      if (!codeCounts[code]) {
        codeCounts[code] = { code, count: 0, category: f.category };
      }
      codeCounts[code].count += 1;
    });

    const top5Codes = Object.values(codeCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 3. Campaign & Submission Stats (Directly matching actual submissions)
    const totalCampaigns = contentItems.length;
    const approvedCampaigns = contentItems.filter((i) => i.status === 'approved').length;
    const inReviewCampaigns = contentItems.filter((i) => i.status === 'in_review').length;
    const changesRequestedCampaigns = contentItems.filter((i) => i.status === 'changes_requested').length;
    const draftCampaigns = contentItems.filter((i) => i.status === 'draft').length;

    // Calculate real scores per campaign
    const campaignScores: number[] = [];
    const channelMap: Record<string, { total: number; approved: number; scores: number[] }> = {};

    for (const item of contentItems) {
      const channel = item.channel || 'Other';
      if (!channelMap[channel]) {
        channelMap[channel] = { total: 0, approved: 0, scores: [] };
      }
      channelMap[channel].total += 1;
      if (item.status === 'approved') channelMap[channel].approved += 1;

      // Item score calculation
      let itemScore = 100;
      if (item.compliance_score !== undefined) {
        itemScore = item.compliance_score;
      } else {
        const itemVersions = await getVersions(item.id);
        if (itemVersions.length > 0) {
          const itemFindings = await getFindings(itemVersions[itemVersions.length - 1].id);
          itemScore = computeComplianceScore(itemFindings);
        }
      }
      campaignScores.push(itemScore);
      channelMap[channel].scores.push(itemScore);
    }

    const averageComplianceScore =
      campaignScores.length > 0
        ? Math.round(campaignScores.reduce((acc, s) => acc + s, 0) / campaignScores.length)
        : 100;

    const channelTrends = Object.entries(channelMap).map(([channel, stats]) => ({
      channel,
      total: stats.total,
      approved: stats.approved,
      approvalRate: stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0,
      averageScore:
        stats.scores.length > 0
          ? Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length)
          : 100,
    }));

    // Critical violations count
    const criticalViolationsCount = findings.filter((f) => f.severity === 'high').length;

    // 4. Repeated mistakes by creator
    const creatorMistakes: Record<string, { creator: string; totalFindings: number; categories: Record<string, number>; commonCodes: Record<string, number> }> = {};

    for (const item of contentItems) {
      const creator = item.created_by || 'Unknown';
      if (!creatorMistakes[creator]) {
        creatorMistakes[creator] = {
          creator,
          totalFindings: 0,
          categories: {},
          commonCodes: {},
        };
      }
    }

    findings.forEach((f) => {
      const creator = contentItems[0]?.created_by || 'Alex (Creator)';
      if (!creatorMistakes[creator]) {
        creatorMistakes[creator] = {
          creator,
          totalFindings: 0,
          categories: {},
          commonCodes: {},
        };
      }
      creatorMistakes[creator].totalFindings += 1;
      creatorMistakes[creator].categories[f.category] = (creatorMistakes[creator].categories[f.category] || 0) + 1;
      creatorMistakes[creator].commonCodes[f.source_code] = (creatorMistakes[creator].commonCodes[f.source_code] || 0) + 1;
    });

    const creatorList = Object.values(creatorMistakes).sort((a, b) => b.totalFindings - a.totalFindings);

    // 5. Guideline Health Analysis
    const guidelineHealth = guidelines.map((g) => {
      const triggeredFindings = findings.filter(
        (f) => f.source_code.trim().toUpperCase() === g.code.trim().toUpperCase()
      );
      const total_triggered = triggeredFindings.length;
      const total_rejected = triggeredFindings.filter((f) => f.status === 'rejected').length;
      const rejection_rate = total_triggered > 0 ? Math.round((total_rejected / total_triggered) * 100) : 0;

      const is_unclear = total_rejected > 0 || (total_triggered >= 2 && rejection_rate >= 15);
      const health_label = is_unclear ? 'Review wording' : 'Clear';

      let suggestion = 'Guideline performance is stable and adherence is high.';
      if (is_unclear) {
        if (g.code.startsWith('TONE')) {
          suggestion = `Clarify specific permitted vs prohibited adjectives in ${g.code}. Creators frequently dispute subjective tone flags because the boundary between "friendly" and "casual" needs concrete sentence examples.`;
        } else if (g.code.startsWith('CLAIM')) {
          suggestion = `Add an approved whitelist of verified third-party award citations to ${g.code} so authors know which superlative credentials are pre-authorized without manual verification.`;
        } else if (g.code.startsWith('LEGAL')) {
          suggestion = `Provide standardized mandatory disclaimer snippets in ${g.code} that can be inserted with one click instead of generic warnings.`;
        } else if (g.code.startsWith('VIS')) {
          suggestion = `Embed standard corporate hex color swatches in ${g.code} with pre-calculated contrast ratios for brand assets.`;
        } else {
          suggestion = `Review phrasing in ${g.code}. High rejection rate indicates creators perceive this rule as ambiguous or overly restrictive.`;
        }
      }

      return {
        guideline: g,
        total_triggered,
        total_rejected,
        rejection_rate,
        is_unclear,
        health_label,
        suggestion,
      };
    });

    return NextResponse.json({
      totalFindings: findings.length,
      categoryCounts,
      top5Codes,
      campaignStats: {
        total: totalCampaigns,
        approved: approvedCampaigns,
        inReview: inReviewCampaigns,
        changesRequested: changesRequestedCampaigns,
        drafts: draftCampaigns,
      },
      averageComplianceScore,
      criticalViolationsCount,
      channelTrends,
      creatorMistakes: creatorList,
      guidelineHealth,
    });
  } catch (error: any) {
    console.error('Error generating insights:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
