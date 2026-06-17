import re

# Read clean server.js
with open('server.js', 'r', encoding='utf-8') as f:
    server_code = f.read()

# Extract functions from server.js
fetch_google = re.search(r"(async function fetchGoogleNewsRSS.*?^})", server_code, re.MULTILINE | re.DOTALL).group(1)
fetch_naver = re.search(r"(async function fetchNaverNews.*?^})", server_code, re.MULTILINE | re.DOTALL).group(1)
resolve_ticker = re.search(r"(function resolveTickerSymbol.*?^})", server_code, re.MULTILINE | re.DOTALL).group(1)
fetch_stock = re.search(r"(async function fetchStockPrice.*?^})", server_code, re.MULTILINE | re.DOTALL).group(1)
expand_query = re.search(r"(function expandSearchQuery.*?^})", server_code, re.MULTILINE | re.DOTALL).group(1)
detect_industry = re.search(r"(function detectIndustry.*?^})", server_code, re.MULTILINE | re.DOTALL).group(1)
get_mock = re.search(r"(async function getMockData.*?^})", server_code, re.MULTILINE | re.DOTALL).group(1)

# Extract handleAnalyze logic
handle_analyze_match = re.search(r"app\.post\('/api/analyze', async \(req, res\) => \{(.*?^\})\);", server_code, re.MULTILINE | re.DOTALL)
handle_analyze_code = handle_analyze_match.group(1)

# Modify handle_analyze_code for Cloudflare Worker environment
handle_analyze_code = handle_analyze_code.replace("const { companyName } = req.body;", "const { companyName } = await request.json();")
handle_analyze_code = handle_analyze_code.replace("return res.status(400).json(", "return createResponse(")
handle_analyze_code = handle_analyze_code.replace("return res.status(500).json(", "return createResponse(")
handle_analyze_code = handle_analyze_code.replace("return res.json(", "return createResponse(")

worker_template = f"""import {{ GoogleGenAI }} from '@google/genai';

const CORS_HEADERS = {{
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Naver-Client-Id, X-Naver-Client-Secret',
}};

function createResponse(data, status = 200) {{
  return new Response(JSON.stringify(data), {{
    status,
    headers: {{
      'Content-Type': 'application/json',
      ...CORS_HEADERS
    }}
  }});
}}

export default {{
  async fetch(request, env, ctx) {{
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {{
      return new Response(null, {{ headers: CORS_HEADERS }});
    }}

    if (url.pathname === '/api/stock-price' && request.method === 'GET') {{
      const companyName = url.searchParams.get('company');
      if (!companyName) return createResponse({{ error: 'company parameter is required' }}, 400);
      try {{
        const priceData = await fetchStockPrice(companyName);
        return createResponse(priceData);
      }} catch (e) {{
        return createResponse({{ error: 'Failed to fetch stock price' }}, 500);
      }}
    }}

    if (url.pathname === '/api/analyze' && request.method === 'POST') {{
      {handle_analyze_code}
    }}

    return createResponse({{ error: 'Not Found' }}, 404);
  }}
}};

{expand_query}
{detect_industry}
{get_mock}
{fetch_google}
{fetch_naver}
{resolve_ticker}
{fetch_stock}
"""

with open('worker.js', 'w', encoding='utf-8') as f:
    f.write(worker_template)
    
print("Successfully generated clean worker.js from server.js")
