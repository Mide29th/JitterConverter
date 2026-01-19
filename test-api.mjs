import fs from 'fs';
import path from 'path';

async function test() {
    const filePath = path.resolve('sample-lottie.json');
    const fileStats = fs.statSync(filePath);
    const fileContent = fs.readFileSync(filePath);

    const formData = new FormData();
    const file = new Blob([fileContent], { type: 'application/json' });
    formData.append('file', file, 'sample-lottie.json');
    formData.append('formats', JSON.stringify(['mp4', 'gif', 'webp']));

    try {
        console.log('Sending request to http://localhost:3000/api/convert...');
        const response = await fetch('http://localhost:3000/api/convert', {
            method: 'POST',
            body: formData,
        });

        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('Failed to parse JSON. Response status:', response.status);
            console.error('Response text:', text.substring(0, 500)); // Log first 500 chars
            return;
        }
        console.log('Response:', JSON.stringify(data, null, 2));

        if (data.success) {
            console.log('Conversion successful!');
            console.log('Downloads:', data.downloads);
        } else {
            console.error('Conversion failed:', data.error, data.details);
        }
    } catch (error) {
        console.error('Error during fetch:', error);
    }
}

test();
