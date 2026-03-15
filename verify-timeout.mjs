import fs from 'fs';
import path from 'path';
import * as fflate from 'fflate';

async function testLargeFile() {
    console.log('Generating a large mock Lottie JSON (approx 7MB)...');
    const largeObject = {
        v: "5.5.7",
        fr: 30,
        ip: 0,
        op: 60,
        w: 1920,
        h: 1080,
        nm: "Large Test",
        ddd: 0,
        assets: [],
        layers: Array.from({ length: 20000 }, (_, i) => ({
            ddd: 0,
            ind: i + 1,
            ty: 4,
            nm: `Layer ${i} ${Math.random().toString(36).substring(7)}`,
            sr: 1,
            ks: {
                p: { k: [Math.random() * 1000, Math.random() * 1000, 0] },
                s: { k: [100, 100, 100] },
                r: { k: Math.random() * 360 }
            },
            ao: 0,
            shapes: [],
            ip: 0,
            op: 60,
            st: 0,
            bm: 0,
            randomData: Math.random().toString(36).repeat(10)
        }))
    };

    const jsonString = JSON.stringify(largeObject);
    const originalSize = Buffer.byteLength(jsonString);
    console.log(`Original Size: ${(originalSize / (1024 * 1024)).toFixed(2)} MB`);

    console.log('Compressing...');
    const compressed = fflate.zlibSync(new TextEncoder().encode(jsonString), { level: 9 });
    console.log(`Compressed Size: ${(compressed.length / (1024 * 1024)).toFixed(2)} MB`);

    const formData = new FormData();
    const blob = new Blob([compressed], { type: 'application/octet-stream' });
    formData.append('file', blob, 'large-test.json.zlib');
    formData.append('formats', JSON.stringify(['mp4']));

    try {
        console.log('Sending request to http://localhost:3000/api/convert...');
        const response = await fetch('http://localhost:3000/api/convert', {
            method: 'POST',
            body: formData,
        });

        console.log('Status:', response.status);
        const data = await response.json();
        console.log('Response:', JSON.stringify(data, null, 2));

        if (response.status === 200 && data.success) {
            console.log('SUCCESS: Server accepted and converted the large payload.');
        } else {
            console.error('FAILURE: Server returned error.', data.error || response.status);
        }
    } catch (error) {
        console.error('Error during fetch:', error);
    }
}

testLargeFile();
