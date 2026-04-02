const https = require('https');

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key not set' }) };
  }

  // Handle body - could be base64 encoded or plain string
  let bodyData = event.body;
  if (event.isBase64Encoded) {
    bodyData = Buffer.from(bodyData, 'base64').toString('utf8');
  }
  if (!bodyData) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Empty request body' }) };
  }

  // Validate it's proper JSON
  try {
    JSON.parse(bodyData);
  } catch(e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON: ' + e.message }) };
  }

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(bodyData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers, body: data });
      });
    });

    req.on('error', (err) => {
      resolve({ statusCode: 500, headers, body: JSON.stringify({ error: err.message }) });
    });

    req.write(bodyData);
    req.end();
  });
};
