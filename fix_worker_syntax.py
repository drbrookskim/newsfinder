import re

with open('worker.js', 'r', encoding='utf-8') as f:
    content = f.read()

# The corrupted part starts around "dynamicRisk = '클라우드 인프라 운"
# and ends right before "let promptContents = '';"
# We need to replace this corrupted chunk with the correct chunk from server.js

with open('server.js', 'r', encoding='utf-8') as f:
    server_content = f.read()

# Extract correct block from server.js
server_match = re.search(r"(dynamicRisk = '클라우드 인프라 운영 비용.*?\}\n\n    sentiment = '중립적 \(Neutral\)';.*?\}\n\n  return \{\n    modelUsed: 'AI Engine Working'.*?\n  \};\n\})", server_content, re.DOTALL)

if server_match:
    correct_block = server_match.group(1)
    
    # In worker.js, find where it broke
    broken_match = re.search(r"dynamicRisk = '클라우드 인프라 운[^\n]*\n\s*let promptContents = '';", content, re.DOTALL)
    if broken_match:
        # We also need to add back the fetchAnalyzeData function signature because let promptContents = ''; is inside it!
        # Wait, let's check what let promptContents = ''; belongs to in server.js
        fetch_analyze_match = re.search(r"(async function fetchAnalyzeData\(.*?\)\s*\{[^\}]*?let promptContents = '';)", server_content, re.DOTALL)
        if fetch_analyze_match:
            correct_replacement = correct_block + "\n\n" + fetch_analyze_match.group(1)
            # wait, it's better to just copy everything from "dynamicRisk = '클라우드 인프라 운영" to "let promptContents = '';"
            full_correct_match = re.search(r"(dynamicRisk = '클라우드 인프라 운영 비용.*?let promptContents = '';)", server_content, re.DOTALL)
            if full_correct_match:
                new_content = content.replace(broken_match.group(0), full_correct_match.group(1))
                with open('worker.js', 'w', encoding='utf-8') as out:
                    out.write(new_content)
                print("Successfully patched worker.js")
            else:
                print("Could not find full block in server.js")
        else:
            print("Could not find fetchAnalyzeData in server.js")
    else:
        print("Could not find broken part in worker.js")
else:
    print("Could not find correct block in server.js")
