import re

with open('worker.js', 'r', encoding='utf-8', errors='replace') as f:
    worker_lines = f.readlines()

with open('server.js', 'r', encoding='utf-8') as f:
    server_content = f.read()

# 1. server.js에서 필요한 올바른 코드 블록 추출
match = re.search(r"(dynamicRisk = '클라우드 인프라 운영 비용.*?let promptContents = '';)", server_content, re.DOTALL)
if not match:
    print("Failed to find block in server.js")
    exit(1)

correct_block = match.group(1)

# 2. worker.js에서 해당 라인들을 통째로 찾아서 치환
# 깨진 시작 라인은 "dynamicRisk = '클라우드 인프라 운" 으로 시작함.
start_idx = -1
end_idx = -1

for i, line in enumerate(worker_lines):
    if "dynamicRisk = '클라우드 인프라 운" in line:
        start_idx = i
        break

if start_idx != -1:
    # promptContents = ''; 가 같은 줄(start_idx)에 있으므로
    # 치환할 부분은 사실상 start_idx 번째 줄 1개입니다.
    worker_lines[start_idx] = "        " + correct_block + "\n"
    
    with open('worker.js', 'w', encoding='utf-8') as f:
        f.writelines(worker_lines)
    print("Success: Replaced corrupted line in worker.js")
else:
    print("Could not find the corrupted line.")
