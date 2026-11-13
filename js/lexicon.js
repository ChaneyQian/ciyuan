/* 词源 · lexicon.js — 词库：起于《声律启蒙》，随所演的古文扩充
 * MS.CHARS   可以「活过来」的字：它化成什么（kind）、平仄（tone）、字源（note）、别名（alias）
 * MS.Lex     从《声律启蒙》全文（shenglv-data.js）里算出：对仗关系、可引的句子
 */
(function () {
  'use strict';
  const MS = (window.MS = window.MS || {});

  // tone：平水韵的平仄。平声字音长而平，仄声字（上去入）音短而折——声音模块据此决定是「长音」还是「滑音」。
  // alias：《声律启蒙》里指同一物的其它字（鸿即雁，蛩即虫，釭即灯……），检索诗句时一并算上。
  const C = {
    // —— 天象
    '日': { kind: 'sun', tone: '仄', group: '天', note: '象太阳之形，中有一点', alias: '乌曦晖' },
    '月': { kind: 'moon', tone: '仄', group: '天', note: '象半月之形', alias: '蟾兔' },
    '星': { kind: 'stars', tone: '平', group: '天', note: '初文象众星罗列，后加「生」为声' },
    '云': { kind: 'cloud', tone: '平', group: '天', note: '象云气回卷之形，后加「雨」作雲' },
    '雨': { kind: 'rain', tone: '仄', group: '天', note: '象水滴自天而降' },
    '雪': { kind: 'snow', tone: '仄', group: '天', note: '从雨，下象雪片如羽' },
    '风': { kind: 'wind', tone: '平', group: '天', note: '甲骨文借「凤」为风，后改从虫凡声' },
    '雷': { kind: 'thunder', tone: '平', group: '天', note: '象闪电回曲，间有雷声滚滚', alias: '霆' },
    '虹': { kind: 'rainbow', tone: '平', group: '天', note: '甲骨文象双首之龙，俯饮于河', alias: '霓' },
    '霞': { kind: 'glow', tone: '平', group: '天', note: '形声字，从雨叚声' },
    '烟': { kind: 'mist', tone: '平', group: '天', note: '形声字，从火垔声', alias: '岚霭' },
    // —— 山水
    '山': { kind: 'mountain', tone: '平', group: '地', note: '象群峰并立之形', alias: '峰岭岳' },
    '水': { kind: 'water', tone: '仄', group: '地', note: '象流水之形，中为水脉，旁为水点', alias: '江河溪池湖' },
    // —— 草木
    '竹': { kind: 'bamboo', tone: '仄', group: '木', note: '象竹叶下垂之形', alias: '篁' },
    '松': { kind: 'pine', tone: '平', group: '木', note: '形声字，从木公声' },
    '柳': { kind: 'willow', tone: '仄', group: '木', note: '形声字，从木卯声' },
    '梅': { kind: 'plum', tone: '平', group: '木', note: '形声字，从木每声' },
    '花': { kind: 'flower', tone: '平', group: '木', note: '本作「华」，象草木花开之形', alias: '杏桃棠蕊李梨' },
    '荷': { kind: 'lotus', tone: '平', group: '木', note: '形声字，从艸何声', alias: '莲菡萏蓉芰' },
    '菊': { kind: 'mum', tone: '仄', group: '木', note: '形声字，从艸匊声' },
    '草': { kind: 'grass', tone: '仄', group: '木', note: '本作「艸」，象草芽并生', alias: '莎茸蒲' },
    // —— 禽鸟
    '鸟': { kind: 'birds', tone: '仄', group: '羽', note: '象鸟侧立之形，喙、羽、足俱全', alias: '雀禽' },
    '燕': { kind: 'swallow', tone: '仄', group: '羽', note: '象燕子张口、展翅、剪尾之形' },
    '雁': { kind: 'geese', tone: '仄', group: '羽', note: '从隹从人，厂声；雁行有序如人' },
    '莺': { kind: 'oriole', tone: '平', group: '羽', note: '形声字，从鸟，荣省声', alias: '鹂' },
    '鹤': { kind: 'crane', tone: '仄', group: '羽', note: '形声字，从鸟隺声' },
    // —— 虫鱼
    '蝶': { kind: 'butterfly', tone: '仄', group: '鳞', note: '形声字，从虫枼声' },
    '虫': { kind: 'insects', tone: '平', group: '鳞', note: '象蛇之形，后泛指百虫', alias: '蛩萤蝉' },
    '鱼': { kind: 'fish', tone: '平', group: '鳞', note: '象鱼之形，首、鳞、尾俱全', alias: '鲤' },
    '龙': { kind: 'dragon', tone: '平', group: '鳞', note: '象巨口长身、头上有冠的神物', alias: '蛟' },
    // —— 器物
    '舟': { kind: 'boat', tone: '平', group: '器', note: '象木船之形', alias: '船棹艇舫帆渔' },
    '楼': { kind: 'tower', tone: '平', group: '器', note: '形声字，从木娄声', alias: '台阁殿亭宫' },
    '钟': { kind: 'bell', tone: '平', group: '器', note: '形声字，从金童声' },
    '鼓': { kind: 'drum', tone: '仄', group: '器', note: '左象鼓形，右象手持槌而击' },
    '剑': { kind: 'sword', tone: '仄', group: '器', note: '形声字，从刃佥声' },
    '火': { kind: 'fire', tone: '仄', group: '器', note: '象火焰升腾之形', alias: '焰炬烽' },
    '灯': { kind: 'lantern', tone: '平', group: '器', note: '形声字，从火登声；古作「镫」', alias: '釭缸烛' },
    // —— 四时与昼夜
    '春': { kind: 'season', tone: '平', group: '时', note: '从日从艸，屯声；草木向日而生' },
    '夏': { kind: 'season', tone: '仄', group: '时', note: '金文象人形，本指中原之人' },
    '秋': { kind: 'season', tone: '平', group: '时', note: '甲骨文象蟋蟀之形，借其鸣声为秋' },
    '冬': { kind: 'season', tone: '平', group: '时', note: '甲骨文象丝绳两端打结，表终了' },
    '夜': { kind: 'night', tone: '仄', group: '时', note: '从夕，亦省声；人腋下见月', alias: '宵' },
    '昼': { kind: 'day', tone: '仄', group: '时', note: '从日从画省；日之出入，与夜为界', alias: '晓晨' },
    '空': { kind: 'clear', tone: '平', group: '时', note: '形声字，从穴工声；万象归于空' },
    // —— 以下不出自《声律启蒙》的选字，是为演别的古文添的（先是《洛神赋》）
    //    标了 only:'scroll' 的是戏里的人物与车马仪仗：只在「人间词话」的卷中出现，首页不列、不认、不化
    '霜': { kind: 'frost', tone: '平', group: '天', note: '形声字，从雨相声' },
    '雾': { kind: 'mist', tone: '仄', group: '天', note: '形声字，从雨务声' },
    '光': { kind: 'light', tone: '平', group: '天', note: '甲骨文象人头上有火，光明之意' },
    '曙': { kind: 'sun', tone: '仄', group: '天', note: '形声字，从日署声；天刚亮' },
    '川': { kind: 'water', tone: '平', group: '地', note: '象两岸之间有水流过' },
    '波': { kind: 'water', tone: '平', group: '地', note: '形声字，从水皮声' },
    '渊': { kind: 'pool', tone: '平', group: '地', note: '象回旋的深水，外有岸' },
    '岩': { kind: 'rock', tone: '平', group: '地', note: '山上之石；古作「巖」，从山严声', alias: '石' },
    '林': { kind: 'grove', tone: '平', group: '木', note: '二木相并，树木丛生' },
    '兰': { kind: 'orchid', tone: '平', group: '木', note: '形声字，繁体作「蘭」，从艸阑声' },
    '芝': { kind: 'zhi', tone: '平', group: '木', note: '形声字，从艸之声；瑞草' },
    '蕖': { kind: 'lotus', tone: '平', group: '木', note: '形声字，从艸渠声；芙蕖即荷花' },
    '鸿': { kind: 'geese', tone: '平', group: '羽', note: '形声字，从鸟江声；大雁' },
    '凫': { kind: 'duck', tone: '平', group: '羽', note: '从鸟从几；野鸭' },
    '羽': { kind: 'feather', tone: '仄', group: '羽', note: '象鸟翼上两排长毛之形' },
    '珠': { kind: 'pearl', tone: '平', group: '器', note: '形声字，从玉朱声' },
    '旗': { only: 'scroll', kind: 'banner', tone: '平', group: '器', note: '形声字，从㫃其声' },
    '车': { only: 'scroll', kind: 'cart', tone: '平', group: '器', note: '象车之形，有轮、舆、辕' },
    '神': { only: 'scroll', kind: 'goddess', tone: '平', group: '人', note: '从示申声；「申」本象闪电' },
    '人': { only: 'scroll', kind: 'person', tone: '平', group: '人', note: '象人侧立之形' },
    '马': { only: 'scroll', kind: 'horse', tone: '仄', group: '人', note: '象马之形，有鬃、尾、四足' },
    '泪': { kind: 'tears', tone: '仄', group: '人', note: '目中之水；古作「淚」，从水戾声' },
    // —— 为演《琵琶行》添的
    '枫': { kind: 'maple', tone: '平', group: '木', note: '形声字，从木风声；霜后叶丹' },
    '泉': { kind: 'spring', tone: '平', group: '地', note: '象水从石穴中流出之形' },
    '冰': { kind: 'ice', tone: '平', group: '地', note: '古作「仌」，象冰裂之纹，后加水旁' },
    '酒': { kind: 'wine', tone: '仄', group: '器', note: '从水从酉；「酉」象酒坛之形' },
    // —— 再从《声律启蒙》里请出的一批（画法见 wanxiang.js）
    '露': { kind: 'dew', tone: '仄', group: '天', note: '形声字，从雨路声' },
    '海': { kind: 'sea', tone: '仄', group: '地', note: '形声字，从水每声；百川所归', alias: '浪涛' },
    '城': { kind: 'city', tone: '平', group: '地', note: '从土成声；金文象城垣与门楼', alias: '塞关' },
    '叶': { kind: 'leaf', tone: '仄', group: '木', note: '繁体作「葉」，从艸枼声；「枼」象木上有叶' },
    '凤': { kind: 'phoenix', tone: '仄', group: '羽', note: '甲骨文象高冠长尾之鸟，后加凡声', alias: '鸾' },
    '鹭': { kind: 'egret', tone: '仄', group: '羽', note: '形声字，从鸟路声', alias: '鸥' },
    '蜂': { kind: 'bee', tone: '平', group: '鳞', note: '形声字，从虫夆声' },
    '虾': { kind: 'shrimp', tone: '平', group: '鳞', note: '繁体作「蝦」，从虫叚声' },
    '虎': { kind: 'tiger', tone: '仄', group: '兽', note: '象虎之形：巨口、利爪、斑纹' },
    '牛': { kind: 'ox', tone: '平', group: '兽', note: '象牛头之形，突出一对弯角', alias: '犊' },
    '猿': { kind: 'ape', tone: '平', group: '兽', note: '形声字，从犬袁声' },
    '琴': { kind: 'qin', tone: '平', group: '器', note: '象琴之形；小篆上象弦与琴柱', alias: '瑟' },
    '书': { kind: 'book', tone: '平', group: '器', note: '繁体作「書」，从聿者声；「聿」是手执笔', alias: '卷' },
    '笔': { kind: 'pen', tone: '仄', group: '器', note: '繁体作「筆」，从竹从聿；手执笔之形', alias: '墨砚' },
    '茶': { kind: 'tea', tone: '平', group: '器', note: '古作「荼」，唐以后减去一横' },
    '笛': { kind: 'flute', tone: '仄', group: '器', note: '形声字，从竹由声', alias: '箫管' },
    '香': { kind: 'incense', tone: '平', group: '器', note: '从黍从甘，黍稷之馨', alias: '炉' },
    // —— 为演《春江花月夜》添的
    '潮': { kind: 'tide', tone: '平', group: '地', note: '形声字，从水朝声；海水朝夕涨落' }
  };
  // 拼音（内置拼音输入用）与笔画数（手写判定用）
  const PY = {
    '日': 'ri', '月': 'yue', '星': 'xing', '云': 'yun', '雨': 'yu', '雪': 'xue', '风': 'feng', '雷': 'lei', '虹': 'hong', '霞': 'xia', '烟': 'yan',
    '山': 'shan', '水': 'shui', '竹': 'zhu', '松': 'song', '柳': 'liu', '梅': 'mei', '花': 'hua', '荷': 'he', '菊': 'ju', '草': 'cao',
    '鸟': 'niao', '燕': 'yan', '雁': 'yan', '莺': 'ying', '鹤': 'he', '蝶': 'die', '虫': 'chong', '鱼': 'yu', '龙': 'long',
    '舟': 'zhou', '楼': 'lou', '钟': 'zhong', '鼓': 'gu', '剑': 'jian', '火': 'huo', '灯': 'deng',
    '春': 'chun', '夏': 'xia', '秋': 'qiu', '冬': 'dong', '夜': 'ye', '昼': 'zhou', '空': 'kong',
    '霜': 'shuang', '雾': 'wu', '光': 'guang', '曙': 'shu', '川': 'chuan', '波': 'bo', '渊': 'yuan', '岩': 'yan',
    '林': 'lin', '兰': 'lan', '芝': 'zhi', '蕖': 'qu', '鸿': 'hong', '凫': 'fu', '羽': 'yu',
    '珠': 'zhu', '旗': 'qi', '车': 'che', '神': 'shen', '人': 'ren', '马': 'ma', '泪': 'lei',
    '枫': 'feng', '泉': 'quan', '冰': 'bing', '酒': 'jiu',
    '露': 'lu', '海': 'hai', '城': 'cheng', '叶': 'ye', '凤': 'feng', '鹭': 'lu', '蜂': 'feng', '虾': 'xia', '虎': 'hu', '牛': 'niu', '猿': 'yuan',
    '琴': 'qin', '书': 'shu', '笔': 'bi', '茶': 'cha', '笛': 'di', '香': 'xiang',
    '潮': 'chao'
  };
  const STROKES = {
    '日': 4, '月': 4, '星': 9, '云': 4, '雨': 8, '雪': 11, '风': 4, '雷': 13, '虹': 9, '霞': 17, '烟': 10,
    '山': 3, '水': 4, '竹': 6, '松': 8, '柳': 9, '梅': 11, '花': 7, '荷': 10, '菊': 11, '草': 9,
    '鸟': 5, '燕': 16, '雁': 12, '莺': 10, '鹤': 15, '蝶': 15, '虫': 6, '鱼': 8, '龙': 5,
    '舟': 6, '楼': 13, '钟': 9, '鼓': 13, '剑': 9, '火': 4, '灯': 6,
    '春': 9, '夏': 10, '秋': 9, '冬': 5, '夜': 8, '昼': 9, '空': 8,
    '霜': 17, '雾': 13, '光': 6, '曙': 17, '川': 3, '波': 8, '渊': 11, '岩': 8,
    '林': 8, '兰': 5, '芝': 6, '蕖': 14, '鸿': 11, '凫': 6, '羽': 6,
    '珠': 10, '旗': 14, '车': 4, '神': 9, '人': 2, '马': 3, '泪': 8,
    '枫': 8, '泉': 9, '冰': 6, '酒': 10,
    '露': 21, '海': 10, '城': 9, '叶': 5, '凤': 4, '鹭': 18, '蜂': 13, '虾': 9, '虎': 8, '牛': 4, '猿': 13,
    '琴': 12, '书': 4, '笔': 10, '茶': 9, '笛': 11, '香': 9,
    '潮': 15
  };
  for (const ch in C) { C[ch].py = PY[ch]; C[ch].strokes = STROKES[ch]; }
  MS.CHARS = C;
  MS.CHAR_LIST = Object.keys(C);
  MS.HOME_LIST = MS.CHAR_LIST.filter((ch) => C[ch].only !== 'scroll');   // 首页可写的字
  MS.GROUPS = [['天', '天象'], ['地', '山水'], ['木', '草木'], ['羽', '禽鸟'], ['鳞', '虫鱼'], ['兽', '走兽'], ['器', '器物'], ['人', '人事'], ['时', '四时']];

  /* 字 -> 世界中的那个字（把别名折回去） */
  const canon = {};
  for (const ch of MS.HOME_LIST) { canon[ch] = ch; for (const a of (C[ch].alias || '')) if (!canon[a]) canon[a] = ch; }

  const Lex = (MS.Lex = { pairs: {}, lines: [], canon });

  (function build() {
    const data = MS.SHENGLV || [];
    const seen = new Set();
    data.forEach((sec, si) => {
      sec.stanzas.forEach((st, ti) => {
        st.forEach((sent, li) => {
          const clean = sent.replace(/[。；]/g, '');
          const chars = new Set();
          for (const c of clean) if (canon[c]) chars.add(canon[c]);
          if (chars.size) Lex.lines.push({ text: clean, chars, sec: si, stanza: ti, idx: li, rhyme: sec.rhyme, vol: sec.vol });
          // 「甲对乙」：逐字相对
          for (const part of clean.split('，')) {
            const m = part.match(/^(.+)对(.+)$/);
            if (!m || m[1].length !== m[2].length) continue;
            for (let i = 0; i < m[1].length; i++) {
              const a = canon[m[1][i]], b = canon[m[2][i]];
              if (!a || !b || a === b) continue;
              const key = a < b ? a + b : b + a;
              if (seen.has(key + part)) continue;
              seen.add(key + part);
              const exact = m[1][i] === a && m[2][i] === b || m[1][i] === b && m[2][i] === a;   // 原字相对，而非别名
              (Lex.pairs[a] = Lex.pairs[a] || []).push({ other: b, text: part, rhyme: sec.rhyme, exact });
              (Lex.pairs[b] = Lex.pairs[b] || []).push({ other: a, text: part, rhyme: sec.rhyme, exact });
            }
          }
        });
      });
    });
    // 原字相对的排前面，其次取短的
    for (const k in Lex.pairs) Lex.pairs[k].sort((x, y) => (y.exact - x.exact) || (x.text.length - y.text.length));
  })();

  /* 拼音前缀 → 候选字（按字表次序）。整拼且独一无二时 exact 为真，可以直接落字 */
  Lex.pinyin = function (buf) {
    const list = MS.HOME_LIST.filter((ch) => C[ch].py.indexOf(buf) === 0);
    const full = list.filter((ch) => C[ch].py === buf);
    return { list: full.concat(list.filter((ch) => C[ch].py !== buf)), exact: full.length === 1 && list.length === 1 };
  };

  /* 与某字相对的字（去重） */
  Lex.partners = function (ch) {
    const out = [], seen = new Set();
    for (const p of Lex.pairs[ch] || []) if (!seen.has(p.other)) { seen.add(p.other); out.push(p); }
    return out;
  };

  /* 新落一字后：世上是否凑成了一副「对」？返回 {text, rhyme, other} 或 null */
  Lex.matchPair = function (ch, present) {
    const hits = (Lex.pairs[ch] || []).filter((p) => present.has(p.other));
    return hits.length ? hits[0] : null;
  };

  /* 为眼前的世界挑一句《声律启蒙》：必须含刚写的字，且尽量多含在场的字 */
  Lex.verseFor = function (ch, present, avoid) {
    let best = null, bestScore = -1;
    for (const L of Lex.lines) {
      if (!L.chars.has(ch) || L.text === avoid) continue;
      if (/对/.test(L.text) && L.text.length < 8) continue;        // 短短的「云对雨」留给「对仗」提示
      let n = 0;
      for (const c of L.chars) if (present.has(c)) n++;
      const len = L.text.replace(/，/g, '').length;
      const score = n * 10 + (len >= 10 && len <= 14 ? 3 : 0) + Math.random() * 4;
      if (score > bestScore) { bestScore = score; best = L; }
    }
    return best;
  };

  /* 「自在」模式：随机取一阕，返回其中依次出现的可活之字 */
  Lex.randomStanza = function () {
    const data = MS.SHENGLV || [];
    for (let tries = 0; tries < 40; tries++) {
      const si = (Math.random() * data.length) | 0, sec = data[si], ti = (Math.random() * sec.stanzas.length) | 0;
      const st = sec.stanzas[ti], steps = [];
      let count = 0;
      st.forEach((sent) => {
        const clean = sent.replace(/[。；]/g, ''), chars = [];
        for (const c of clean) { const k = canon[c]; if (k && C[k].kind !== 'clear' && !chars.includes(k)) chars.push(k); }
        count += chars.length;
        steps.push({ text: clean, chars });
      });
      if (count >= 5) return { rhyme: sec.rhyme, vol: sec.vol, steps };
    }
    return null;
  };
})();
