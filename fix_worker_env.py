with open('worker.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Make env global
content = content.replace("export default {", "let globalEnv = null;\n\nexport default {")
content = content.replace("async fetch(request, env, ctx) {", "async fetch(request, env, ctx) {\n    globalEnv = env;")

# Replace process.env with globalEnv
content = content.replace("process.env.GEMINI_API_KEY || apiKey", "globalEnv.GEMINI_API_KEY")
content = content.replace("process.env.GEMINI_MODEL", "globalEnv.GEMINI_MODEL")
content = content.replace("process.env.NAVER_CLIENT_ID", "globalEnv.NAVER_CLIENT_ID")
content = content.replace("process.env.NAVER_CLIENT_SECRET", "globalEnv.NAVER_CLIENT_SECRET")
content = content.replace("ai || new GoogleGenAI", "new GoogleGenAI")

with open('worker.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed env references in worker.js")
