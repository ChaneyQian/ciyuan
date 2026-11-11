"""《声律启蒙》（清 · 车万育，公有领域）全文 -> js/shenglv-data.js

输入是维基文库《聲律啓蒙》页面的 wikitext（https://zh.wikisource.org/wiki/聲律啓蒙?action=raw 另存为文本），
脚本把它转成简体、按韵部 / 阕 / 句切开。

用法:  python tools/build_lexicon.py <wikitext 文件> js/shenglv-data.js
依赖:  opencc-python-reimplemented
"""
import re, json, sys
from opencc import OpenCC
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding="utf-8").read()
s = re.sub(r"\{\{另\|([^|}]*)\|[^}]*\}\}", r"\1", s)
cc = OpenCC("t2s")
NUM = "一二三四五六七八九十"
sections = []
vol = ""
for m in re.finditer(r"==(卷[上下])==|===\s*([^=]+?)\s*===\s*<poem>(.*?)</poem>", s, re.S):
    if m.group(1): vol = m.group(1); continue
    name = cc.convert(m.group(2)).replace("、", "")
    body = m.group(3)
    body = re.sub(r"\{\{[^}]*\}\}|<[^>]+>|\[\[[^\]]*\]\]", "", body)
    stanzas = []
    for block in re.split(r"\n\s*\n", body.strip()):
        t = cc.convert(re.sub(r"\s+", "", block))
        if not t: continue
        sents = [x for x in re.split(r"(?<=[。；])", t) if x]
        stanzas.append(sents)
    sections.append({"vol": vol, "rhyme": name, "stanzas": stanzas})
fix = {"雝雝": "雍雍", "荼縻": "荼蘼", "余": "余"}
js = json.dumps(sections, ensure_ascii=False, separators=(",", ":"))
for a, b in fix.items(): js = js.replace(a, b)
open(out, "w", encoding="utf-8", newline="\n").write(
  "/* 《声律启蒙》全文 · 清 · 车万育（公有领域）。文本据维基文库《聲律啓蒙》转为简体，由 tools/build_lexicon.py 生成。 */\n"
  "window.MS = window.MS || {};\nMS.SHENGLV = " + js + ";\n")
print(len(sections), "sections", sum(len(x["stanzas"]) for x in sections), "stanzas", len(js), "chars")
for sec in sections[:2] + sections[-1:]:
    print(sec["vol"], sec["rhyme"]); [print("  ", "".join(st)) for st in sec["stanzas"][:1]]
print([x["rhyme"] for x in sections])
