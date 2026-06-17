import re

# Read worker.js safely
with open('worker.js', 'r', encoding='utf-8', errors='ignore') as f:
    worker_lines = f.readlines()

# Read server.js safely
with open('server.js', 'r', encoding='utf-8') as f:
    server_content = f.read()

# Match the correct chunk from server.js
# Start: dynamicRisk = '클라우드 인프라 운영 비용
# End: end of getMockData function -> return { ... }; }
match = re.search(r"(        dynamicRisk = '클라우드 인프라 운영 비용.*?  \};\n\})", server_content, re.DOTALL)
if not match:
    print("Cannot find correct block in server.js")
    exit(1)

correct_block = match.group(1)

# Find corrupted line in worker.js
broken_idx = -1
for i, line in enumerate(worker_lines):
    if "dynamicRisk = '클라우드 인프라 운" in line:
        broken_idx = i
        break

if broken_idx != -1:
    # Replace the broken line with the correct block, plus the promptContents variable declaration that was squashed
    worker_lines[broken_idx] = correct_block + "\n\n            let promptContents = '';\n"
    
    with open('worker.js', 'w', encoding='utf-8') as f:
        f.writelines(worker_lines)
    print("Successfully patched worker.js")
else:
    print("Cannot find broken line in worker.js")

