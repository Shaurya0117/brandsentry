import { NextResponse } from 'next/server';
import { getTerms } from '@/lib/db';
import { quickScanText } from '@/lib/rule-engine';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    const terms = await getTerms();
    const scan = quickScanText(text || '', terms);
    return NextResponse.json(scan);
  } catch (error: any) {
    return NextResponse.json({ count: 0, matches: [] });
  }
}
