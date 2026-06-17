with open('worker.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# delete lines 965 to end
with open('worker.js', 'w', encoding='utf-8') as f:
    f.writelines(lines[:965])
    
print("Removed end lines from worker.js")
