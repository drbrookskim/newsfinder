const fs = require('fs');

const serverCode = fs.readFileSync('server.js', 'utf8');

// 1. Extract the content of app.post('/api/analyze', ...)
const analyzeStartStr = "app.post('/api/analyze', async (req, res) => {";
const analyzeStart = serverCode.indexOf(analyzeStartStr);
if (analyzeStart === -1) throw new Error("Could not find app.post('/api/analyze'");
const analyzeContentStart = analyzeStart + analyzeStartStr.length;

// Find the matching closing bracket for app.post
let openBrackets = 1;
let analyzeContentEnd = analyzeContentStart;
for (let i = analyzeContentStart; i < serverCode.length; i++) {
  if (serverCode[i] === '{') openBrackets++;
  if (serverCode[i] === '}') openBrackets--;
  if (openBrackets === 0) {
    analyzeContentEnd = i;
    break;
  }
}

let handleAnalyzeCode = serverCode.substring(analyzeContentStart, analyzeContentEnd);

// Modify handleAnalyzeCode for Worker env
handleAnalyzeCode = handleAnalyzeCode.replace(/const \{ companyName \} = req\.body;/g, 'const { companyName } = await request.json();');
handleAnalyzeCode = handleAnalyzeCode.replace(/return res\.status\(400\)\.json\(/g, 'return createResponse(');
handleAnalyzeCode = handleAnalyzeCode.replace(/return res\.status\(500\)\.json\(/g, 'return createResponse(');
handleAnalyzeCode = handleAnalyzeCode.replace(/return res\.json\(/g, 'return createResponse(');

// Remove specific Express responses
handleAnalyzeCode = handleAnalyzeCode.replace(/res\.status\(\d+\)\.json\([^)]+\);/g, (match) => {
    return match.replace(/res\.status\(\d+\)\.json\(/, 'createResponse(');
});

// Replace process.env with globalEnv
handleAnalyzeCode = handleAnalyzeCode.replace(/process\.env\./g, 'globalEnv.');

// 2. Extract helper functions
// The helper functions are located after app.listen(...) or before app.post(...)
// Let's just grab everything from `async function fetchGoogleNewsRSS` to the end of the file.
const helperStart = serverCode.indexOf('async function fetchGoogleNewsRSS');
let helperCode = serverCode.substring(helperStart);

// Replace process.env in helper code as well
helperCode = helperCode.replace(/process\.env\./g, 'globalEnv.');

// Replace app.listen and other express stuff that might be at the end (there isn't any in helper functions usually, but let's be safe)
const appListenIdx = helperCode.indexOf('app.listen(');
if (appListenIdx !== -1) {
  helperCode = helperCode.substring(0, appListenIdx);
}

// 3. Construct the final worker.js
const workerCode = `import { GoogleGenAI } from '@google/genai';

let globalEnv = null;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Naver-Client-Id, X-Naver-Client-Secret',
};

function createResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS
    }
  });
}

export default {
  async fetch(request, env, ctx) {
    globalEnv = env;
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (url.pathname === '/api/stock-price' && request.method === 'GET') {
      const companyName = url.searchParams.get('company');
      if (!companyName) return createResponse({ error: 'company parameter is required' }, 400);
      try {
        const priceData = await fetchStockPrice(companyName);
        return createResponse(priceData);
      } catch (e) {
        return createResponse({ error: 'Failed to fetch stock price' }, 500);
      }
    }

    if (url.pathname === '/api/analyze' && request.method === 'POST') {
      ${handleAnalyzeCode}
    }

    return createResponse({ error: 'Not Found' }, 404);
  }
};

${helperCode}
`;

fs.writeFileSync('worker.js', workerCode, 'utf8');
console.log('Worker generated successfully.');
