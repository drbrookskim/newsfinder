import re

with open('server.js', 'r', encoding='utf-8') as f:
    server_code = f.read()

# 1. Extract the content of app.post('/api/analyze', ...)
analyze_start_str = "app.post('/api/analyze', async (req, res) => {"
analyze_start = server_code.find(analyze_start_str)
if analyze_start == -1:
    raise ValueError("Could not find app.post")

analyze_content_start = analyze_start + len(analyze_start_str)

# Find matching closing bracket
open_brackets = 1
analyze_content_end = analyze_content_start
for i in range(analyze_content_start, len(server_code)):
    if server_code[i] == '{':
        open_brackets += 1
    elif server_code[i] == '}':
        open_brackets -= 1
        if open_brackets == 0:
            analyze_content_end = i
            break

# The full app.post block in server.js
full_app_post_block = server_code[analyze_start : analyze_content_end + 1]

handle_analyze_code = server_code[analyze_content_start:analyze_content_end]

# Modify for Worker env
handle_analyze_code = handle_analyze_code.replace("const { companyName } = req.body;", "const { companyName } = await request.json();")
handle_analyze_code = handle_analyze_code.replace("return res.status(400).json(", "return createResponse(")
handle_analyze_code = handle_analyze_code.replace("return res.status(500).json(", "return createResponse(")
handle_analyze_code = handle_analyze_code.replace("return res.json(", "return createResponse(")
handle_analyze_code = re.sub(r'res\.status\(\d+\)\.json\(', 'createResponse(', handle_analyze_code)
handle_analyze_code = handle_analyze_code.replace("process.env.", "globalEnv.")

# 2. Extract helper functions
# Basically take the whole server.js, but remove:
# - Imports and Express initialization at the top
# - the full app.post block
# - app.listen block
# - process.env initialization

helper_code = server_code

# Remove Express imports and setup
helper_code = re.sub(r"import express from 'express';.*?(?=async function)", "", helper_code, flags=re.DOTALL)
helper_code = helper_code.replace("import { GoogleGenAI } from '@google/genai';", "")
helper_code = helper_code.replace(full_app_post_block, "")
helper_code = re.sub(r"app\.listen\(.*?\);", "", helper_code, flags=re.DOTALL)

# Replace process.env in helper code
helper_code = helper_code.replace("process.env.", "globalEnv.")

# 3. Construct the final worker.js
worker_code = f"""import {{ GoogleGenAI }} from '@google/genai';

let globalEnv = null;

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
    globalEnv = env;
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

{helper_code}
"""

with open('worker.js', 'w', encoding='utf-8') as f:
    f.write(worker_code)

print("Worker generated correctly.")
