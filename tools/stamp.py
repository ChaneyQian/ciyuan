"""给 index.html 里的样式与脚本地址盖一个版本戳（?v=…），让访客的浏览器在上线后取新文件而不是用缓存。

GitHub Pages 对静态文件有十分钟左右的缓存，浏览器自己也会留着旧的 js / css；
每次上线前跑一下，戳子取各文件内容的摘要，文件没变戳子就不变。

用法:  python tools/stamp.py
"""
import hashlib, io, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
path = os.path.join(ROOT, 'index.html')
html = io.open(path, encoding='utf-8', newline='').read()


def stamp(m):
    attr, url = m.group(1), m.group(2).split('?')[0]
    f = os.path.join(ROOT, url.replace('/', os.sep))
    if not os.path.exists(f):
        return m.group(0)
    h = hashlib.sha1(open(f, 'rb').read().replace(b'\r\n', b'\n')).hexdigest()[:8]
    return '%s="%s?v=%s"' % (attr, url, h)


out = re.sub(r'(src|href)="((?:js|css)/[^"?]+(?:\?v=[0-9a-f]+)?)"', stamp, html)
if out != html:
    io.open(path, 'w', encoding='utf-8', newline='').write(out)
print(len(re.findall(r'\?v=[0-9a-f]{8}"', out)), 'stamped')
