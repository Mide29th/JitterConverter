import fs from 'fs';
import path from 'path';
import * as fflate from 'fflate';

async function verifyRemotion() {
    console.log('Generating a complex mock Lottie JSON (approx 8MB, 50,000 layers)');
    
    // Create a heavy Lottie JSON
    const layers = [];
    for (let i = 0; i < 50000; i++) {
        layers.push({
            ddd: 0,
            ind: i,
            ty: 4,
            nm: `Layer ${i}`,
            sr: 1,
            ks: {
                o: { a: 0, k: 100, ix: 11 },
                r: { a: 0, k: 0, ix: 10 },
                p: { a: 0, k: [Math.random() * 1920, Math.random() * 1080, 0], ix: 2 },
                a: { a: 0, k: [0, 0, 0], ix: 1 },
                s: { a: 0, k: [100, 100, 100], ix: 6 }
            },
            ao: 0,
            shapes: [
                {
                    ty: 'gr',
                    it: [
                        {
                            d: 1,
                            ty: 'el',
                            s: { a: 0, k: [10, 10], ix: 2 },
                            p: { a: 0, k: [0, 0], ix: 3 },
                            nm: 'Oval'
                        },
                        {
                            ty: 'fl',
                            c: { a: 0, k: [Math.random(), Math.random(), Math.random(), 1], ix: 4 },
                            o: { a: 0, k: 100, ix: 5 },
                            nm: 'Fill'
                        }
                    ]
                }
            ],
            ip: 0,
            op: 60,
            st: 0,
            bm: 0
        });
    }

    const lottieJson = {
        v: '5.7.1',
        fr: 30,
        ip: 0,
        op: 60,
        w: 1920,
        h: 1080,
        nm: 'Stress Test',
        ddd: 0,
        assets: [],
        layers: layers
    };

    const jsonStr = JSON.stringify(lottieJson);
    console.log(`Original Size: ${(jsonStr.length / 1024 / 1024).toFixed(2)} MB`);

    console.log('Compressing...');
    const compressed = fflate.zlibSync(Buffer.from(jsonStr));
    const compressedBuffer = Buffer.from(compressed);

    const formData = new FormData();
    const blob = new Blob([compressedBuffer], { type: 'application/octet-stream' });
    formData.append('file', blob, 'stress-test.json.zlib');
    formData.append('formats', JSON.stringify(['mp4']));

    console.log('Sending request to http://localhost:3000/api/convert...');
    const startTime = Date.now();
    try {
        const response = await fetch('http://localhost:3000/api/convert', {
            method: 'POST',
            body: formData
        });

        const endTime = Date.now();
        console.log(`Status: ${response.status}`);
        console.log(`Time taken: ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
        const data = await response.json();
        
        if (response.ok) {
            console.log('SUCCESS: Server accepted and converted via Remotion.');
            console.log('Result:', data);
        } else {
            console.error('FAILURE: Server returned error.');
            console.error(JSON.stringify(data, null, 2));
        }
    } catch (err) {
        console.error('ERROR:', err.message);
    }
}

verifyRemotion();
