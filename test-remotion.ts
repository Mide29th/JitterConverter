import { convertLottieToVideo } from './src/lib/converter';
import fs from 'fs';
import path from 'path';

async function test() {
    try {
        console.log('[Test] Starting standalone Remotion test...');
        const lottieJson = JSON.parse(fs.readFileSync('./sample-lottie.json', 'utf8'));
        const formats = ['mp4'];
        
        console.log('[Test] Calling convertLottieToVideo...');
        const results = await convertLottieToVideo(lottieJson, formats);
        
        console.log('[Test] Success! Results:', results);
    } catch (error) {
        console.error('[Test] Failed:', error);
    }
}

test();
