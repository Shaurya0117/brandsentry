import { NextResponse } from 'next/server';
import mammoth from 'mammoth';

// Dynamic route handling
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file was provided in the upload request.' },
        { status: 400 }
      );
    }

    // 1. Enforce 5MB limit
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        { error: `File size (${sizeMB}MB) exceeds the 5MB limit. Please upload a smaller document.` },
        { status: 400 }
      );
    }

    const fileName = file.name.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = '';

    // 2. Extract based on file type
    if (fileName.endsWith('.pdf') || file.type === 'application/pdf') {
      try {
        // Dynamically import or require pdf-parse
        // @ts-ignore
        const pdfParseModule = await import('pdf-parse');
        const pdfParse = pdfParseModule.default || pdfParseModule;
        const pdfData = await pdfParse(buffer);
        extractedText = pdfData.text || '';
      } catch (pdfErr: any) {
        console.error('[BrandSentry Extract Text] PDF parse error:', pdfErr);
        return NextResponse.json(
          { error: `Failed to extract text from PDF document: ${pdfErr.message || 'Corrupt or password-protected PDF.'}` },
          { status: 422 }
        );
      }
    } else if (
      fileName.endsWith('.docx') ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value || '';
      } catch (docxErr: any) {
        console.error('[BrandSentry Extract Text] DOCX parse error:', docxErr);
        return NextResponse.json(
          { error: `Failed to extract text from Word document: ${docxErr.message || 'Corrupt or unreadable DOCX.'}` },
          { status: 422 }
        );
      }
    } else if (fileName.endsWith('.txt') || file.type === 'text/plain') {
      extractedText = buffer.toString('utf-8');
    } else {
      return NextResponse.json(
        {
          error: `Unsupported file format "${file.name}". BrandSentry accepts PDF (.pdf) and Word documents (.docx) up to 5MB.`,
        },
        { status: 400 }
      );
    }

    const trimmed = extractedText.trim();
    if (!trimmed) {
      return NextResponse.json(
        {
          error: `The file "${file.name}" was processed successfully, but contains no extractable text (it may be a scanned image or empty).`,
        },
        { status: 400 }
      );
    }

    // Limit extracted text to 50,000 characters to prevent memory exhaustion
    const cappedText = trimmed.length > 50000 ? trimmed.slice(0, 50000) : trimmed;
    const wasCapped = trimmed.length > 50000;

    return NextResponse.json({
      success: true,
      text: cappedText,
      fileName: file.name,
      characterCount: cappedText.length,
      wasCapped,
      message: wasCapped ? 'Text was capped at 50,000 characters maximum length.' : undefined,
    });
  } catch (err: any) {
    console.error('[BrandSentry Extract Text API] Unexpected error:', err);
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred while processing the file.' },
      { status: 500 }
    );
  }
}
