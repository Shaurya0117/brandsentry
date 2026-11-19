import { NextResponse } from 'next/server';
import { seedBrandPack, addAuditLog } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const counts = await seedBrandPack();
    return NextResponse.json({
      success: true,
      message: 'Nova Bank sample brand pack loaded successfully.',
      counts,
    });
  } catch (error: any) {
    console.error('Error seeding brand pack:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to seed brand pack' },
      { status: 500 }
    );
  }
}
