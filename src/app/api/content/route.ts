import { NextResponse } from 'next/server';
import { getContentItems, getVersions, getFindings } from '@/lib/db';
import { computeComplianceScore } from '@/components/ComplianceScoreRing';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const items = await getContentItems(status);

    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        try {
          const versions = await getVersions(item.id);
          const latestVersion = versions.length > 0 ? versions[versions.length - 1] : null;
          let findings: any[] = [];
          if (latestVersion) {
            findings = await getFindings(latestVersion.id);
          }
          const activeFindings = findings.filter(
            (f) => f.status === 'open' || f.status === 'needs_human_check'
          );
          const score = computeComplianceScore(findings);
          let riskLevel: 'Critical' | 'Medium' | 'Low' = 'Low';
          if (score < 50 || activeFindings.some((f) => f.severity === 'high')) {
            riskLevel = 'Critical';
          } else if (score < 85 || activeFindings.some((f) => f.severity === 'medium')) {
            riskLevel = 'Medium';
          }

          return {
            ...item,
            compliance_score: score,
            risk_level: riskLevel,
            open_findings_count: activeFindings.length,
          };
        } catch (e) {
          return item;
        }
      })
    );

    return NextResponse.json(enrichedItems);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
