"""从维基共享资源取古文字字形（甲骨文 / 金文 / 小篆）的 500px 缩略图。

字形属公有领域（Ancient Chinese characters 项目，原始数据 Richard Sears）。
走缩略图而不是原始 SVG，是维基媒体对批量抓取的建议做法；脚本限速、可断点续取。

用法:  python tools/fetch_glyphs.py <输出目录>
然后:  python tools/trace_glyphs.py <输出目录> js/glyph-data.js
"""
import json, os, sys, time, urllib.parse, urllib.request, urllib.error
OUT = sys.argv[1]
UA = {"User-Agent": "glyph-fetch/1.2 (static educational site build script; low rate)"}
CORE = {
 "日":"日","月":"月","星":"星","云":"雲云","雨":"雨","雪":"雪","风":"風","雷":"雷","虹":"虹","霞":"霞","烟":"煙烟",
 "山":"山","水":"水","竹":"竹","松":"松","柳":"柳","梅":"梅","花":"花華","荷":"荷","菊":"菊","草":"草艸",
 "鸟":"鳥","燕":"燕","雁":"雁","莺":"鶯","鹤":"鶴","蝶":"蝶","虫":"蟲虫","鱼":"魚","龙":"龍",
 "舟":"舟","楼":"樓","钟":"鐘鍾","鼓":"鼓","剑":"劍","火":"火","灯":"燈",
 "春":"春","夏":"夏","秋":"秋","冬":"冬","夜":"夜","昼":"晝","空":"空",
}
EXTRA = {
 "天":"天","地":"地","人":"人","木":"木","石":"石","虎":"虎","马":"馬","江":"江","海":"海","霜":"霜","露":"露",
 "乌":"烏","鸿":"鴻","凤":"鳳","弓":"弓","琴":"琴","酒":"酒","茶":"茶","诗":"詩","书":"書","门":"門","田":"田",
 "川":"川","泉":"泉","林":"林","鹿":"鹿","牛":"牛","羊":"羊","犬":"犬","龟":"龜","象":"象","兔":"兔","鼎":"鼎",
 "车":"車","心":"心","手":"手","目":"目","女":"女","子":"子","王":"王","玉":"玉","金":"金","土":"土","光":"光",
 "明":"明","家":"家","东":"東","西":"西","南":"南","北":"北","中":"中","大":"大","小":"小","上":"上","下":"下",
 "对":"對","声":"聲","律":"律","墨":"墨","韵":"韻","字":"字","文":"文","笔":"筆","画":"畫","梦":"夢","爱":"愛",
 "福":"福","寿":"壽","喜":"喜","乐":"樂","蜂":"蜂","红":"紅","绿":"綠","青":"青","白":"白","黄":"黃",
 "鸥":"鷗","鹭":"鷺","蝉":"蟬","萤":"螢","莲":"蓮","桃":"桃","杏":"杏","杨":"楊","兰":"蘭","雾":"霧","河":"河",
 "溪":"溪","峰":"峰","岭":"嶺","台":"臺","阁":"閣","亭":"亭","船":"船","帆":"帆","烛":"燭","电":"電","冰":"冰",
 "晓":"曉","晨":"晨","暮":"暮","晚":"晚","晴":"晴","寒":"寒","暑":"暑","古":"古","今":"今","我":"我","你":"你",
 # 《洛神赋》一卷添的字
 "波":"波","芝":"芝","蕖":"蕖","珠":"珠","羽":"羽","凫":"鳧","泪":"淚涙","渊":"淵","曙":"曙","神":"神","岩":"巖岩嵒","旗":"旗","流":"流","鲸":"鯨","禽":"禽","驾":"駕",
 # 《琵琶行》一卷添的字
 "笛":"笛","香":"香","叶":"葉","虾":"蝦鰕",
 "枫":"楓","弦":"弦絃","面":"面","城":"城","绡":"綃","芦":"蘆","鹃":"鵑","猿":"猿猨","瓶":"瓶缾","骑":"騎","刀":"刀","帛":"帛","泣":"泣","衫":"衫",
}
STAGES = ["oracle", "bronze", "seal"]
def api(titles):
    q = urllib.parse.urlencode({"action":"query","titles":"|".join(titles),"prop":"imageinfo","iiprop":"url","iiurlwidth":"500","format":"json","maxlag":"5"})
    for attempt in range(5):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request("https://commons.wikimedia.org/w/api.php?" + q, headers=UA), timeout=30))
        except urllib.error.HTTPError as e:
            if e.code != 429: raise
            ra = min(600, int(e.headers.get("Retry-After", "60") or 60)); print("api 429 sleep", ra, flush=True); time.sleep(ra + 3)
    raise SystemExit("api: still throttled, try again later")
# plan.json 记着查到的缩略图地址；"_asked" 记着已经问过的字。字表添了新字，只去问新添的那几个。
plan_path = os.path.join(OUT, "plan.json")
plan = json.load(open(plan_path, encoding="utf-8")) if os.path.exists(plan_path) else {}
asked = set(plan.get("_asked", [])) | {k.split("|")[0] for k in plan if "|" in k}
wanted = [(s, f, st, f"File:{f}-{st}.svg") for grp in (CORE, EXTRA) for s, forms in grp.items() if s not in asked for f in forms for st in STAGES]
for i in range(0, len(wanted), 40):
    batch = wanted[i:i+40]
    d = api([w[3] for w in batch])
    norm = {n["from"]: n["to"] for n in d["query"].get("normalized", [])}
    pages = {p["title"]: p for p in d["query"]["pages"].values()}
    for simp, form, st, title in batch:
        p = pages.get(norm.get(title, title))
        if p and "imageinfo" in p and p["imageinfo"][0].get("thumburl"):
            plan.setdefault(simp + "|" + st, {"form": form, "thumb": p["imageinfo"][0]["thumburl"], "page": p["imageinfo"][0].get("descriptionurl", "")})
    time.sleep(1.0)
if wanted:
    plan["_asked"] = sorted(asked | {w[0] for w in wanted})
    json.dump(plan, open(plan_path, "w", encoding="utf-8"), ensure_ascii=False)
plan = {k: v for k, v in plan.items() if "|" in k}
print("planned", len(plan), flush=True)
got = 0
for key, info in plan.items():
    simp, st = key.split("|")
    path = os.path.join(OUT, f"{ord(simp):x}-{st}.png")
    if os.path.exists(path) and os.path.getsize(path) > 300: continue
    for attempt in range(4):
        try:
            data = urllib.request.urlopen(urllib.request.Request(info["thumb"], headers=UA), timeout=40).read()
            if data[:4] == b"\x89PNG": open(path, "wb").write(data); got += 1
            break
        except urllib.error.HTTPError as e:
            if e.code == 429:
                ra = min(600, int(e.headers.get("Retry-After", "120") or 120)); print("429 sleep", ra, flush=True); time.sleep(ra + 3)
            else: print("http", e.code, key.encode("unicode_escape").decode(), flush=True); break
        except Exception as e:
            print("err", type(e).__name__, flush=True); time.sleep(10)
    time.sleep(1.5)
print("DONE got", got, "have", len([f for f in os.listdir(OUT) if f.endswith(".png")]), flush=True)
