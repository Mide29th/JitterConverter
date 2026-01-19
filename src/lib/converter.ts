import puppeteer from 'puppeteer';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { PassThrough } from 'stream';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

// Dynamic paths for ffmpeg and ffprobe binaries
const ffmpegPath = ffmpegInstaller.path;
const ffprobePath = ffprobeInstaller.path;

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const CONCURRENCY = 4; // Reduced to 4 for better reliability across different hardware

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
    console.log(`[Converter] Starting conversion for session ${sessionId}`);
    const tempDir = path.join(os.tmpdir(), 'jitter-converter', sessionId);

    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const jsonPath = path.join(tempDir, 'animation.json');
    fs.writeFileSync(jsonPath, JSON.stringify(lottieJson));

    const mp4Path = path.join(tempDir, 'output.mp4');

    // Puppeteer rendering and recording
    console.log('[Converter] Launching Puppeteer...');
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--proxy-server="direct://"',
            '--proxy-bypass-list=*'
        ],
    });

    const page = await browser.newPage();
    console.log('[Converter] Page created');

    // Capture browser console logs
    page.on('console', msg => console.log(`[Browser] ${msg.text()}`));

    // Create a minimal HTML to render Lottie
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js"></script>
      <style>
        body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background-color: white; /* Flatten against white by default */
        }
        #lottie {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
      </style>
    </head>
    <body>
      <div id="lottie"></div>
      <script>
        console.log('Lottie script starting...');
        let animation;
        window.loadLottie = (data) => {
            console.log('Loading animation data...');
            window.animation = lottie.loadAnimation({
                container: document.getElementById('lottie'),
                renderer: 'svg',
                loop: false,
                autoplay: false,
                animationData: data
            });
            console.log('Animation loaded. Duration:', window.animation.getDuration(false));
        };

        window.getDuration = () => window.animation ? window.animation.getDuration(false) : 0;
      </script>
    </body>
    </html>
  `;

    console.log('[Converter] Setting page content...');
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    console.log('[Converter] Loading Lottie data into page...');
    await page.evaluate((data) => (window as any).loadLottie(data), lottieJson);

    const duration = await page.evaluate(() => (window as any).getDuration());
    console.log(`[Converter] Animation duration: ${duration}s`);

    // Use a reasonable viewport size based on the Lottie JSON
    const width = lottieJson.w || 1920;
    const height = lottieJson.h || 1080;
    await page.setViewport({ width, height, deviceScaleFactor: 1.5 });

    // Debug screenshot
    const debugScreenshotBefore = path.join(tempDir, 'before.png');
    await page.screenshot({ path: debugScreenshotBefore });
    console.log(`[Converter] Debug screenshot (before) saved to ${debugScreenshotBefore}`);

    console.log(`[Converter] Using FFmpeg at: ${ffmpegPath}`);
    console.log(`[Converter] FFmpeg exists: ${fs.existsSync(ffmpegPath)}`);

    const metadata = await page.evaluate(() => {
        return {
            totalFrames: (window as any).animation.totalFrames,
            frameRate: (window as any).animation.frameRate,
        };
    });
    const { totalFrames, frameRate } = metadata;
    console.log(`[Converter] Animation metadata: ${totalFrames} frames, ${frameRate} fps`);

    const framesDir = path.join(tempDir, 'frames');
    if (!fs.existsSync(framesDir)) {
        fs.mkdirSync(framesDir, { recursive: true });
    }

    const viewport = { width, height };

    // Close the initial page used for metadata
    await page.close();

    console.log(`[Converter] Splitting into ${CONCURRENCY} chunks for parallel processing...`);
    const chunkSize = Math.ceil(totalFrames / CONCURRENCY);
    const workers = [];

    for (let i = 0; i < CONCURRENCY; i++) {
        const startFrame = i * chunkSize;
        const endFrame = Math.min(startFrame + chunkSize, totalFrames);

        if (startFrame >= totalFrames) break;

        const segmentPath = path.join(tempDir, `segment_${i}.mp4`);

        workers.push((async (workerId: number, start: number, end: number, outputPath: string) => {
            let workerPage;
            let ffmpegProcess: any;
            try {
                console.log(`[Worker ${workerId}] Processing frames ${start} to ${end - 1}`);
                workerPage = await browser.newPage();
                await workerPage.setViewport({ ...viewport, deviceScaleFactor: 1.5 });
                await workerPage.setContent(htmlContent, { waitUntil: 'networkidle0' });
                await workerPage.evaluate((data) => (window as any).loadLottie(data), lottieJson);

                // Spawn a local FFmpeg for this segment
                const passThrough = new PassThrough();
                ffmpegProcess = ffmpeg()
                    .input(passThrough)
                    .inputFormat('image2pipe')
                    .inputOptions([
                        `-framerate ${frameRate}`,
                        '-vcodec png' // Explicitly tell FFmpeg to expect PNGs
                    ])
                    .outputOptions([
                        '-c:v libx264',
                        '-pix_fmt yuv420p',
                        '-preset ultrafast',
                        '-crf 18',
                        `-r ${frameRate}`
                    ])
                    .on('error', (err) => {
                        console.error(`[Worker ${workerId}] FFmpeg error:`, err.message);
                        // Cleanly end the pipe to avoid hanging
                        passThrough.end();
                    })
                    .save(outputPath);

                for (let f = start; f < end; f++) {
                    await workerPage.evaluate(async (frame) => {
                        (window as any).animation.goToAndStop(frame, true);
                        // Bare minimum wait for paint stabilization
                        return new Promise(r => requestAnimationFrame(r));
                    }, f);

                    const screenshot = await workerPage.screenshot({ type: 'png' });
                    if (passThrough.writable) {
                        passThrough.write(screenshot);
                    } else {
                        console.warn(`[Worker ${workerId}] Pipe not writable at frame ${f}`);
                        break;
                    }

                    if ((f - start) % 50 === 0) {
                        console.log(`[Worker ${workerId}] Progress: ${f - start}/${end - start} frames`);
                    }
                }

                passThrough.end();

                // Wait for this segment's FFmpeg to finish
                await new Promise<void>((resolve, reject) => {
                    ffmpegProcess.on('end', () => resolve());
                    ffmpegProcess.on('error', (err: any) => reject(err));
                });

                console.log(`[Worker ${workerId}] Segment finished: ${outputPath}`);
            } catch (err: any) {
                console.error(`[Worker ${workerId}] Failed:`, err.message);
                throw err;
            } finally {
                if (workerPage) await workerPage.close();
            }
        })(i, startFrame, endFrame, segmentPath));
    }

    await Promise.all(workers);

    console.log(`[Converter] All segments encoded. Merging with FFmpeg...`);

    const concatFilePath = path.join(tempDir, 'concat.txt');
    // Use absolute paths in concat file to be safe
    const concatContent = Array.from({ length: workers.length }, (_, i) => {
        const p = path.join(tempDir, `segment_${i}.mp4`).replace(/\\/g, '/');
        return `file '${p}'`;
    }).join('\n');
    fs.writeFileSync(concatFilePath, concatContent);

    const command = ffmpeg()
        .input(concatFilePath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions(['-c copy'])
        .on('error', (err) => console.error('[Converter] Merge error:', err))
        .on('end', () => console.log('[Converter] Merge finished'))
        .save(mp4Path);

    await new Promise<void>((resolve, reject) => {
        command.on('end', () => resolve());
        command.on('error', (err) => reject(err));
    });

    await browser.close();
    console.log('[Converter] Puppeteer closed');

    if (!fs.existsSync(mp4Path)) {
        console.error(`[Converter] MP4 file not found at ${mp4Path}`);
        throw new Error(`MP4 recording failed. File not found at ${mp4Path}`);
    }

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
        await new Promise<void>((resolve, reject) => {
            ffmpeg(mp4Path)
                .outputOptions([
                    '-vf', `fps=15,scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
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
        await new Promise<void>((resolve, reject) => {
            ffmpeg(mp4Path)
                .outputOptions([
                    '-vcodec', 'libwebp',
                    '-filter:v', `fps=fps=20`,
                    '-lossless', '1',
                    '-loop', '0',
                    '-preset', 'default',
                    '-an',
                    '-vsync', '0'
                ])
                .save(webpPath)
                .on('end', () => resolve())
                .on('error', (err) => reject(err));
        });
        results.webp = `/exports/${sessionId}.webp`;
    }

    // Cleanup temp dir
    // fs.rmSync(tempDir, { recursive: true, force: true });

    return results;
}

function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}
