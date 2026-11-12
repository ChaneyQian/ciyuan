"""《琵琶行》（唐 · 白居易，公有领域）-> js/pipa-data.js（序一句一行，诗一联一行）

输入是维基文库《琵琶行》页面的 wikitext（https://zh.wikisource.org/wiki/琵琶行?action=raw 另存为文本，
底本为《全唐诗》卷四三五）。页面里用 {{另|甲|乙}} 标出异文，脚本一律取前一种（正文）；校记丢掉；转成简体。
几个异体字换成通行写法：於→于、蟇→蟆、妬→妒、遶→绕、飜→翻。

用法:  python tools/build_pipa.py <wikitext 文件> js/pipa-data.js
依赖:  opencc-python-reimplemented
"""
import json, re, sys
from opencc import OpenCC

NL = chr(10)
SWAPS = (('於', '于'), ('蟇', '蟆'), ('妬', '妒'), ('遶', '绕'), ('飜', '翻'))

s = open(sys.argv[1], encoding='utf-8').read()
s = re.sub(r'<noinclude>.*?</noinclude>', '', s, flags=re.S)
s = re.sub(r'<ref[^>]*>.*?</ref>|<ref[^>]*/>', '', s, flags=re.S)
s = re.sub(r'-\{[^{}]*?zh-hans:([^;{}]*);[^{}]*\}-', r'\1', s)   # -{zh:撚;zh-hans:捻;…}-：取简体那一项
for _ in range(3):                                   # {{另|正文|异文…}}、{{YL|元和十年|815年}} 之类：取第一项
    s = re.sub(r'\{\{(?:另繁|另2|另|YL)\|([^|{}]*)(?:\|[^{}]*)?\}\}', r'\1', s)
cc = OpenCC('t2s')


def clean(t):
    t = re.sub(r'\{\{[^{}]*\}\}|<[^>]+>|\[\[|\]\]', '', t)
    t = cc.convert(t)
    for a, b in SWAPS:
        t = t.replace(a, b)
    return t.strip()


head, _, body = s.partition('<div class="Kaiti"')
pre = clean(head.split('<onlyinclude>')[-1])
# 序：一句一行；句内只留逗号
preface = []
for sent in re.split('[。]', pre):
    sent = re.sub('[《》「」、]', '', sent).strip('，； ' + NL)
    if sent:
        preface.append(re.sub('[；：]', '，', sent))
# 诗：一联一行，上下句之间一律用逗号
poem = []
for line in body.split(NL):
    if not line.startswith(':'):
        continue
    t = clean(line.lstrip(':'))
    t = re.sub('[《》「」]', '', t)
    halves = [h for h in re.split('[，。？！；]', t) if h.strip()]
    if halves:
        poem.append('，'.join(h.strip() for h in halves))

lines = preface + poem
out = json.dumps(lines, ensure_ascii=False, separators=(',', ':'))
headc = ('/* 《琵琶行》并序 · 唐 · 白居易（公有领域）。文本据维基文库《琵琶行》（《全唐诗》卷四三五）转为简体，异文取正文一种。' + NL +
         '   前 ' + str(len(preface)) + ' 行是序（一句一行），其后是诗（一联一行），由 tools/build_pipa.py 生成。 */' + NL +
         'window.MS = window.MS || {};' + NL + 'MS.PIPA_PREFACE = ' + str(len(preface)) + ';' + NL + 'MS.PIPA_TEXT = ')
with open(sys.argv[2], 'w', encoding='utf-8', newline=NL) as fh:
    fh.write(headc + out + ';' + NL)
n = sum(len(x.replace('，', '')) for x in poem)
print(len(preface), 'preface lines;', len(poem), 'couplets;', n, 'chars in the poem')
