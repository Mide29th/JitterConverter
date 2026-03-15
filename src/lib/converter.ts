import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import ffmpeg from 'fluent-ffmpeg';

import chromium from "@sparticuz/chromium";

// Helper to get executable path
async function getExecutablePath() {
    if (process.env.VERCEL) {
        return await chromium.executablePath();
    }
    // Fallback for local development
    return "C:\\Users\\RLS\\.cache\\puppeteer\\chrome\\win64-143.0.7499.192\\chrome-win64\\chrome.exe";
}

export interface ConversionResult {
    mp4?: string;
    gif?: string;
    webp?: string;
}

export async function convertLottieToVideo(
    lottieJson: any,
    formats: string[]
): Promise<ConversionResult> {
    const sessionId = uuidv4();
    console.log(`[Converter] Starting Remotion conversion for session ${sessionId}`);
    const tempDir = path.join(os.tmpdir(), 'jitter-converter', sessionId);

    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    // Force even dimensions to prevent FFmpeg scaling/codec glitches
    const width = (lottieJson.w || 1920) % 2 === 0 ? (lottieJson.w || 1920) : (lottieJson.w || 1920) - 1;
    const height = (lottieJson.h || 1080) % 2 === 0 ? (lottieJson.h || 1080) : (lottieJson.h || 1080) - 1;
    const fps = lottieJson.fr || 30;
    const durationInFrames = Math.ceil((lottieJson.op - lottieJson.ip) || 150);

    const entryPoint = path.join(process.cwd(), "src", "remotion", "index.tsx");

    console.log("[Converter] Bundling Remotion project...");
    const bundleLocation = await bundle({
        entryPoint,
    });

    const compositionId = "LottieComposition";

    const browserExecutable = await getExecutablePath();

    const composition = await selectComposition({
        serveUrl: bundleLocation,
        id: compositionId,
        inputProps: {
            lottieJson,
            width,
            height,
        },
        browserExecutable,
        chromiumOptions: {
            headless: true,
            args: process.env.VERCEL ? chromium.args : [],
        } as any,
        timeoutInMilliseconds: 120000,
    });

    const mp4Path = path.join(tempDir, 'output.mp4');

    console.log(`[Converter] Rendering composition (${durationInFrames} frames)...`);
    await renderMedia({
        composition: {
            ...composition,
            durationInFrames,
            fps,
            width,
            height,
        },
        serveUrl: bundleLocation,
        codec: "h264",
        outputLocation: mp4Path,
        inputProps: {
            lottieJson,
            width,
            height,
        },
        browserExecutable,
        chromiumOptions: {
            headless: true,
            args: process.env.VERCEL ? chromium.args : [],
        } as any,
        timeoutInMilliseconds: 120000,
        onProgress: (progress) => {
            console.log(`[Converter] Rendering progress: ${Math.round(progress.progress * 100)}% (Frame ${progress.renderedFrames}/${durationInFrames})`);
        },
        // Quality settings
        crf: 18,
        pixelFormat: "yuv420p",
        x264Preset: "fast",
    });

    console.log(`[Converter] Remotion render finished: ${mp4Path}`);

    const results: ConversionResult = {};

    if (formats.includes('mp4')) {
        const finalMp4 = path.join(process.cwd(), 'public', 'exports', `${sessionId}.mp4`);
        ensureDir(path.dirname(finalMp4));
        fs.copyFileSync(mp4Path, finalMp4);
        results.mp4 = `/exports/${sessionId}.mp4`;
    }

    if (formats.includes('gif')) {
        const gifPath = path.join(process.cwd(), 'public', 'exports', `${sessionId}.gif`);
        ensureDir(path.dirname(gifPath));
        const gifFps = Math.min(fps, 30);
        console.log(`[Converter] Generating stabilized GIF at ${gifFps}fps (${width}x${height})...`);
        await new Promise<void>((resolve, reject) => {
            ffmpeg(mp4Path)
                .outputOptions([
                    // Use rectangle diff mode and bayer dither for maximum stability
                    '-vf', `fps=${gifFps},scale=${width}:${height}:flags=lanczos,split[s0][s1];[s0]palettegen=stats_mode=full[p];[s1][p]paletteuse=diff_mode=rectangle:dither=bayer:bayer_scale=3`,
                    '-loop', '0'
                ])
                .save(gifPath)
                .on('end', () => resolve())
                .on('error', (err) => reject(err));
        });
        results.gif = `/exports/${sessionId}.gif`;
    }

    if (formats.includes('webp')) {
        const webpPath = path.join(process.cwd(), 'public', 'exports', `${sessionId}.webp`);
        ensureDir(path.dirname(webpPath));
        const webpFps = Math.min(fps, 30);
        console.log(`[Converter] Generating stabilized WebP at ${webpFps}fps (${width}x${height})...`);
        await new Promise<void>((resolve, reject) => {
            ffmpeg(mp4Path)
                .outputOptions([
                    '-vcodec', 'libwebp',
                    '-filter:v', `fps=${webpFps},scale=${width}:${height}:flags=lanczos`,
                    '-lossless', '1',
                    '-q:v', '75',
                    '-loop', '0',
                    '-preset', 'picture',
                    '-an',
                    '-vsync', '0'
                ])
                .save(webpPath)
                .on('end', () => resolve())
                .on('error', (err) => reject(err));
        });
        results.webp = `/exports/${sessionId}.webp`;
    }

    // Cleanup
    // fs.rmSync(tempDir, { recursive: true, force: true });

    return results;
}

function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}
