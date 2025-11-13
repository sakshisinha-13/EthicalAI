# sample_rules_from_dump.py
import re, json
from itertools import islice

DUMP = "model/model_tree_named.txt"

# split trees by 'booster[' or blank lines; handle both
with open(DUMP, "r", encoding="utf-8") as f:
    txt = f.read()

if "booster[" in txt:
    trees = txt.split("booster[")
else:
    trees = txt.strip().split("\n\n")

def parse_tree_lines(tree_text):
    lines = [l for l in tree_text.splitlines() if l.strip()]
    return lines

def extract_paths(lines, max_paths=10):
    # basic DFS using node indices found in lines
    nodes = {}
    for l in lines:
        m = re.match(r"\s*(\d+):\[(.+?)<(.+?)\].*yes=(\d+),no=(\d+)", l)
        if m:
            idx = int(m.group(1)); feat = m.group(2).strip(); thr = m.group(3).strip(); yes = int(m.group(4)); no = int(m.group(5))
            nodes[idx] = {"feat": feat, "thr": thr, "yes": yes, "no": no}
        else:
            m2 = re.match(r"\s*(\d+):leaf=([-\d.eE]+)", l)
            if m2:
                idx = int(m2.group(1)); leaf = float(m2.group(2))
                nodes[idx] = {"leaf": leaf}
    # DFS
    paths = []
    stack = [(0, [])]  # node, conditions
    while stack and len(paths) < max_paths:
        node, conds = stack.pop()
        info = nodes.get(node)
        if info is None:
            continue
        if "leaf" in info:
            paths.append({"conds": conds.copy(), "leaf": info["leaf"]})
            continue
        # push no then yes so yes (left) explored first
        stack.append((info["no"], conds + [f"{info['feat']} >= {info['thr']}"]))
        stack.append((info["yes"], conds + [f"{info['feat']} < {info['thr']}"]))
    return paths

# choose how many trees to inspect
M = 5
summary = []
for i, tree in enumerate(islice(trees, 1, M+1)):  # skip possible empty leading split
    lines = parse_tree_lines(tree)
    paths = extract_paths(lines, max_paths=6)
    summary.append({"tree": i, "paths": paths})

print(json.dumps(summary, indent=2))
# also save to file
with open("model/sample_rules.json", "w", encoding="utf-8") as f:
    json.dump(summary, f, indent=2)
print("Saved sample_rules.json")
