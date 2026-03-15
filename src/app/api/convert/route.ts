import { NextRequest, NextResponse } from 'next/server';
import { convertLottieToVideo } from '@/lib/converter';
import * as fflate from 'fflate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Increased to 5 mins for very large animations

console.log('[API] Convert route file loaded');

import { del } from '@vercel/blob';

export async function POST(req: NextRequest) {
    console.log('[API] POST /api/convert received');
    try {
        const body = await req.json();
        const { fileUrl, fileName, formats } = body;

        console.log(`[API] Received file reference: ${fileName}, URL: ${fileUrl}`);

        if (!fileUrl) {
            console.error('[API] No file URL provided');
            return NextResponse.json({ error: 'No file URL provided' }, { status: 400 });
        }

        if (!formats || formats.length === 0) {
            console.error('[API] No formats selected');
            return NextResponse.json({ error: 'No formats selected' }, { status: 400 });
        }

        console.log('[API] Fetching file from Vercel Blob...');
        const response = await fetch(fileUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch file from blob storage: ${response.statusText}`);
        }
        
        const compressedBuffer = await response.arrayBuffer();

        console.log('[API] Decompressing file...');
        const decompressed = fflate.unzlibSync(new Uint8Array(compressedBuffer));
        const fileContent = new TextDecoder().decode(decompressed);

        console.log(`[API] Decompressed size: ${fileContent.length} bytes`);
        const lottieJson = JSON.parse(fileContent);

        console.log('[API] Starting conversion utility...');
        const results = await convertLottieToVideo(lottieJson, formats);
        
        // Optional: Cleanup the blob after conversion
        try {
            console.log('[API] Cleaning up blob storage...');
            await del(fileUrl);
        } catch (cleanupError) {
            console.error('[API] Failed to cleanup blob:', cleanupError);
        }

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
