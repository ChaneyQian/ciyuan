"""《春江花月夜》（唐 · 张若虚，公有领域）-> js/chunjiang-data.js（一联一行）

输入是维基文库《春江花月夜 (張若虛)》页面的 wikitext
（https://zh.wikisource.org/wiki/春江花月夜_(張若虛)?action=raw 另存为文本；「春江花月夜」本身是消歧义页。
底本为四部丛刊本《乐府诗集》卷四十七）。页面里用 {{另|甲|乙}}、{{另2|甲|注}} 标出异文，
脚本一律取前一种（正文）：千万里、望相似、妆镜台、玉户帘；转成简体。
异体字换成通行写法：遶→绕、擣→捣、閒→闲。

用法:  python tools/build_chunjiang.py <wikitext 文件> js/chunjiang-data.js
依赖:  opencc-python-reimplemented
"""
import json, re, sys
from opencc import OpenCC

NL = chr(10)
SWAPS = (('遶', '绕'), ('擣', '捣'), ('閒', '闲'), ('閑', '闲'))

s = open(sys.argv[1], encoding='utf-8').read()
m = re.search(r'<poem>(.*?)</poem>', s, flags=re.S)
if not m:
    sys.exit('没有找到 <poem>：这一页也许是消歧义页，要取「春江花月夜 (張若虛)」')
body = m.group(1)
body = re.sub(r'<ref[^>]*>.*?</ref>|<ref[^>]*/>', '', body, flags=re.S)
for _ in range(3):                                   # {{另|正文|异文}}、{{另2|正文|校记}}：取第一项
    body = re.sub(r'\{\{(?:另繁|另2|另)\|([^|{}]*)(?:\|[^{}]*)?\}\}', r'\1', body)
cc = OpenCC('t2s')

poem = []
for line in body.split(NL):
    t = re.sub(r'\{\{[^{}]*\}\}|<[^>]+>|\[\[|\]\]', '', line).strip()
    if not t:
        continue
    for a, b in SWAPS:                               # 先换异体，再转简体
        t = t.replace(a, b)
    t = cc.convert(t)
    halves = [h.strip() for h in re.split('[，。？！；]', t) if h.strip()]
    poem.append('，'.join(halves))

bad = [x for x in poem if [len(h) for h in x.split('，')] != [7, 7]]
n = sum(len(x.replace('，', '')) for x in poem)
if len(poem) != 18 or bad or n != 252:
    sys.exit('文本不对：%d 联，%d 字，不是七言的行：%s' % (len(poem), n, bad))

out = json.dumps(poem, ensure_ascii=False, separators=(',', ':'))
head = ('/* 《春江花月夜》 · 唐 · 张若虚（公有领域）。文本据维基文库《春江花月夜 (張若虛)》（四部丛刊本《乐府诗集》卷四十七）' + NL +
        '   转为简体，异文取正文一种。一联一行（共 ' + str(len(poem)) + ' 联、' + str(n) + ' 字），由 tools/build_chunjiang.py 生成。 */' + NL +
        'window.MS = window.MS || {};' + NL + 'MS.CHUNJIANG_TEXT = ')
with open(sys.argv[2], 'w', encoding='utf-8', newline=NL) as fh:
    fh.write(head + out + ';' + NL)
print(len(poem), 'couplets;', n, 'chars')
