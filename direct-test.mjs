import { convertLottieToVideo } from './src/lib/converter.js';
import fs from 'fs';
import path from 'path';

async function test() {
    try {
        const lottieJson = JSON.parse(fs.readFileSync('./sample-lottie.json', 'utf8'));
        const formats = ['mp4'];
        console.log('Starting direct test...');
        const results = await convertLottieToVideo(lottieJson, formats);
        console.log('Test successful:', results);
    } catch (error) {
        console.error('Test failed:', error);
    }
}

test();
