import { NextRequest, NextResponse } from 'next/server';
import { convertLottieToVideo } from '@/lib/converter';
import * as fflate from 'fflate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Max allowed for Vercel Pro, Hobby is 10s

console.log('[API] Convert route file loaded');

export async function POST(req: NextRequest) {
    console.log('[API] POST /api/convert received');
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const formatsString = formData.get('formats') as string;

        console.log(`[API] File: ${file?.name}, Size: ${file?.size} bytes, Formats: ${formatsString}`);

        if (!file) {
            console.error('[API] No file uploaded');
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        if (!formatsString) {
            console.error('[API] No formats selected');
            return NextResponse.json({ error: 'No formats selected' }, { status: 400 });
        }

        const formats = JSON.parse(formatsString);

        console.log('[API] Decompressing file...');
        const compressedBuffer = await file.arrayBuffer();
        const decompressed = fflate.unzlibSync(new Uint8Array(compressedBuffer));
        const fileContent = new TextDecoder().decode(decompressed);

        console.log(`[API] Decompressed size: ${fileContent.length} bytes`);
        const lottieJson = JSON.parse(fileContent);

        console.log('[API] Starting conversion utility...');
        const results = await convertLottieToVideo(lottieJson, formats);
        console.log('[API] Conversion complete:', results);
        console.log(`[API] Returning success response to frontend`);
        return NextResponse.json({
            success: true,
            downloads: results
        });

    } catch (error: any) {
        console.error('[API] Fatal Error:', error);
        return NextResponse.json({
            error: 'Failed to convert Lottie to video',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
