"""《洛神赋》（魏 · 曹植，公有领域）-> js/luoshen-data.js（一行一句）

输入是维基文库《洛神賦》页面的 wikitext（https://zh.wikisource.org/wiki/洛神賦?action=raw 另存为文本，
底本为四部丛刊本《昭明文选》卷十九）。脚本取其中竖排的一段，转成简体；
几个字库里常缺的异体字换成通行写法：迺→乃、覩→睹、懽→欢、襛→秾；「騑」保留繁体（其简体是字库少有的扩展区字）。

用法:  python tools/build_luoshen.py <wikitext 文件> js/luoshen-data.js
依赖:  opencc-python-reimplemented
"""
import json, re, sys
from opencc import OpenCC

NL = chr(10)
s = open(sys.argv[1], encoding='utf-8').read()
s = s.split('==横排==')[0] if '==横排==' in s else s
s = re.sub(r'\{\{vtextStart\}\}(.*?)\{\{vtextEnd\}\}', r'{{vtext|\1}}', s)
cc = OpenCC('t2s')
swaps = (('迺', '乃'), ('覩', '睹'), ('懽', '欢'), ('襛', '秾'), (chr(0x2CD02), '騑'))
lines = []
for m in re.finditer(r'\{\{vtext\|([^}]*)\}\}', s):
    t = cc.convert(m.group(1)).strip()
    if not t:
        continue
    for a, b in swaps:
        t = t.replace(a, b)
    lines.append(re.sub('[' + chr(0x20) + chr(0x3000) + ']+', '，', t))
body = json.dumps(lines, ensure_ascii=False, separators=(',', ':'))
head = ('/* 《洛神赋》全文 · 魏 · 曹植（公有领域）。文本据维基文库《洛神賦》（四部丛刊本《昭明文选》卷十九）转为简体，' + NL +
        '   一行一句，由 tools/build_luoshen.py 生成。 */' + NL +
        'window.MS = window.MS || {};' + NL + 'MS.LUOSHEN_TEXT = ')
with open(sys.argv[2], 'w', encoding='utf-8', newline=NL) as fh:
    fh.write(head + body + ';' + NL)
print(len(lines), 'lines', sum(len(x) for x in lines), 'chars')
