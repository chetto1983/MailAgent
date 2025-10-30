const http = require('http');

const API_URL = 'http://localhost:3000';
const PROVIDER_ID = 'cmhbquncu0001s5s6eloopfan';
const JWT_TOKEN = process.argv[2];

async function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          resolve({ raw: data, parseError: e.message });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function test() {
  console.log('Testing Gmail Labels...\n');
  const labels = await makeRequest(`/providers/${PROVIDER_ID}/test/gmail-labels`);
  console.log(JSON.stringify(labels, null, 2));
}

test().catch(console.error);
