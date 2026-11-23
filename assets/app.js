(function () {
  'use strict';
  var S = { cfg: {}, contests: [], news: [], svc: {}, cases: [], updated: '', archive: null };
  var archLoading = false;
  function loadArchive() {
    if (archLoading) return; archLoading = true;
    fetch('archive/index.json?v=' + Math.floor(Date.now() / 600000), { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : { days: [] }; })
      .catch(function () { return { days: [] }; })
      .then(function (j) { S.archive = j; if (/^#\/?archive/.test(location.hash)) app.innerHTML = archive(); });
  }
  var F = { cat: '全部', st: '全部' };
  var app = document.getElementById('app');

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function safeUrl(u) { u = String(u || ''); return /^https?:\/\//i.test(u) ? u : '#'; }
  function load(name) {
    var v = Math.floor(Date.now() / 600000); // 10 分钟内复用缓存
    return fetch('data/' + name + '.json?v=' + v, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(name); return r.json();
    });
  }
  function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function pd(s) { if (!s) return null; var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function days(s) { var d = pd(s); return d ? Math.round((d - today()) / 864e5) : null; }
  function fmt(s) { var d = pd(s); return d ? (d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日') : ''; }
  function fmtShort(s) { var d = pd(s); return d ? ((d.getMonth() + 1) + '月' + d.getDate() + '日') : ''; }
  function dtText(x) { return x.text || fmt(x.date); }

  // 状态：报名截止日已过但仍标“报名中”的，自动显示为“报名已截止”
  function status(c) {
    if (c.status === '报名中') {
      var dl = (c.dates || []).filter(function (x) { return x.deadline && x.date; });
      if (dl.length && dl.every(function (x) { return days(x.date) < 0; })) return '报名已截止';
    }
    return c.status;
  }
  function nextDate(c) {
    var up = (c.dates || []).filter(function (x) { return x.date && days(x.date) >= 0; });
    up.sort(function (a, b) { return pd(a.date) - pd(b.date); });
    return up[0] || null;
  }
  function badge(s) { return '<span class="badge b-' + esc(s) + '">' + esc(s) + '</span>'; }
  function byId(id) { for (var i = 0; i < S.contests.length; i++) if (S.contests[i].id === id) return S.contests[i]; return null; }

  function contactBlock() {
    var c = S.cfg;
    var qr = c.wechatQr ? '<img src="' + esc(c.wechatQr) + '" alt="客服微信二维码">' : '<div class="ph">二维码<br>即将上线</div>';
    var wx = c.wechatId
      ? '<p>客服微信：<span class="wx" id="wxid">' + esc(c.wechatId) + '</span><button class="copy" data-copy="' + esc(c.wechatId) + '">复制</button></p>'
      : '<p>客服微信：即将开放</p>';
    var mp = c.mpName ? '<p>微信公众号：' + esc(c.mpName) + '</p>' : '';
    var em = c.email ? '<p>邮箱：' + esc(c.email) + '</p>' : '';
    return '<div class="card contact">' + qr + '<div><h3>备赛咨询</h3>' + wx + mp + em +
      '<p class="muted">添加时请备注“学校＋赛事名称”，便于老师对接。</p></div></div>';
  }

  // ---------- 页面 ----------
  function home() {
    var items = [];
    S.contests.forEach(function (c) {
      (c.dates || []).forEach(function (x) {
        if (x.date && !x.approx && days(x.date) >= 0) items.push({ c: c, x: x, d: days(x.date) });
      });
    });
    items.sort(function (a, b) { return a.d - b.d; });
    var due = items.slice(0, 6).map(function (it) {
      var hot = it.d <= 14;
      return '<a class="card" href="#/contest/' + esc(it.c.id) + '"><div class="cd' + (hot ? ' hot' : '') + '"><b>' +
        (it.d === 0 ? '今天' : it.d) + '</b><small>' + (it.d === 0 ? '' : '天后') + '</small></div><div><div class="t">' +
        esc(it.c.short) + ' · ' + esc(it.x.label) + '</div><div class="s">' + esc(dtText(it.x)) + '</div></div></a>';
    }).join('') || '<div class="card empty">暂无已公布具体日期的节点</div>';

    var cats = {}; S.contests.forEach(function (c) { cats[c.category] = (cats[c.category] || 0) + 1; });
    var catLinks = Object.keys(cats).map(function (k) {
      return '<button class="chip" data-gocat="' + esc(k) + '">' + esc(k) + '（' + cats[k] + '）</button>';
    }).join('');

    return '<section class="hero"><h1>' + esc(S.cfg.siteName) + '</h1><p>' + esc(S.cfg.slogan) + '</p>' +
      '<span class="upd">数据核对日期：' + esc(fmt(S.updated)) + '</span></section>' +
      '<section class="sec"><div class="sec-h"><h2>近期关键节点</h2><a href="#/contests">查看全部赛事 ›</a></div><div class="due">' + due + '</div></section>' +
      '<section class="sec"><div class="sec-h"><h2>最新通知</h2><a href="#/news">更多 ›</a></div>' + newsList(S.news.slice(0, 4)) + '</section>' +
      '<section class="sec"><div class="sec-h"><h2>按类别查看</h2></div><div class="chips">' + catLinks + '</div></section>' +
      '<section class="sec"><div class="sec-h"><h2>备赛指导</h2><a href="#/services">了解详情 ›</a></div>' + contactBlock() + '</section>';
  }

  function newsList(arr) {
    if (!arr.length) return '<div class="card empty">暂无通知</div>';
    return '<ul class="news card">' + arr.map(function (n) {
      var c = byId(n.contest);
      return '<li><div class="meta"><span class="tag t-' + esc(n.type) + '">' + esc(n.type) + '</span><span>' + esc(fmt(n.date)) + '</span>' +
        (c ? '<a href="#/contest/' + esc(c.id) + '">' + esc(c.short) + '</a>' : '') + '</div><h3>' + esc(n.title) + '</h3><p>' + esc(n.summary) + '</p>' +
        (n.source ? '<div class="src" style="margin-top:4px">来源：<a href="' + esc(safeUrl(n.source.url)) + '" target="_blank" rel="noopener">' + esc(n.source.title) + '</a></div>' : '') + '</li>';
    }).join('') + '</ul>';
  }

  function contests() {
    var cats = ['全部'], sts = ['全部'];
    S.contests.forEach(function (c) { if (cats.indexOf(c.category) < 0) cats.push(c.category); var s = status(c); if (sts.indexOf(s) < 0) sts.push(s); });
    function chips(arr, key) { return arr.map(function (v) { return '<button class="chip' + (F[key] === v ? ' on' : '') + '" data-f="' + key + '" data-v="' + esc(v) + '">' + esc(v) + '</button>'; }).join(''); }
    var order = { '报名中': 0, '即将开始': 1, '进行中': 2, '校内选拔': 3, '待通知': 4, '待核实': 5, '报名已截止': 6, '已结束': 7 };
    var list = S.contests.filter(function (c) {
      return (F.cat === '全部' || c.category === F.cat) && (F.st === '全部' || status(c) === F.st);
    }).sort(function (a, b) { return (order[status(a)] || 9) - (order[status(b)] || 9); });
    var cards = list.map(function (c) {
      var n = nextDate(c), s = status(c);
      var nx = n ? '<div class="nx"><span>' + esc(n.label) + '：' + esc(dtText(n)) + '</span>' + (n.approx ? '' : '<b>' + (days(n.date) === 0 ? '今天' : days(n.date) + ' 天后') + '</b>') + '</div>'
        : '<div class="nx"><span class="muted">具体时间以官方通知为准</span></div>';
      return '<a class="card cc" href="#/contest/' + esc(c.id) + '"><div class="top2"><span class="cat">' + esc(c.category) + ' · ' + esc(c.cycle) + '</span>' + badge(s) +
        '</div><h3>' + esc(c.name) + '</h3><div class="note">' + esc(c.statusNote) + '</div>' + nx + '</a>';
    }).join('') || '<div class="card empty">没有符合条件的赛事</div>';
    return '<section class="sec"><div class="sec-h"><h2>赛事日历</h2><span class="muted" style="font-size:13px">核对日期 ' + esc(fmt(S.updated)) + '</span></div>' +
      '<div class="filters"><div class="chips"><span class="lb">类别</span>' + chips(cats, 'cat') + '</div><div class="chips"><span class="lb">状态</span>' + chips(sts, 'st') + '</div></div>' +
      '<div class="clist">' + cards + '</div></section>';
  }

  function detail(id) {
    var c = byId(id);
    if (!c) return '<div class="card empty" style="margin-top:24px">未找到该赛事，<a href="#/contests">返回赛事日历</a></div>';
    var n = nextDate(c);
    var tl = (c.dates || []).map(function (x) {
      var cls = x.date ? (days(x.date) < 0 ? 'past' : (n && x === n ? 'next' : '')) : '';
      return '<li class="' + cls + '"><div class="lb">' + esc(x.label) + (x.verified ? '' : '<span class="pend">待官方确认</span>') + '</div><div class="dt">' + esc(dtText(x)) + '</div></li>';
    }).join('');
    var hl = (c.highlights || []).map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('');
    var src = (c.sources || []).map(function (s) { return '<li><a href="' + esc(safeUrl(s.url)) + '" target="_blank" rel="noopener">' + esc(s.title) + '</a></li>'; }).join('');
    var rel = S.news.filter(function (x) { return x.contest === c.id; });
    return '<div class="crumb"><a href="#/">首页</a> › <a href="#/contests">赛事日历</a> › ' + esc(c.short) + '</div>' +
      '<div class="card dhead"><div>' + badge(status(c)) + ' <span class="muted" style="font-size:13px;margin-left:6px">' + esc(c.category) + ' · ' + esc(c.cycle) + '</span></div>' +
      '<h1>' + esc(c.name) + '</h1><div class="org">主办单位：' + esc(c.organizer) + '</div><div class="notice">' + esc(c.statusNote) + '</div></div>' +
      '<div class="grid2"><div>' +
      '<div class="card block"><h2>赛事简介</h2><p>' + esc(c.summary) + '</p>' + (hl ? '<h2 style="margin-top:14px">参赛须知</h2><ul>' + hl + '</ul>' : '') + '</div>' +
      (rel.length ? '<div style="margin-top:16px">' + newsList(rel) + '</div>' : '') +
      '</div><div>' +
      '<div class="card block"><h2>关键时间节点</h2><ul class="tl">' + tl + '</ul>' +
      '<a class="btn" href="' + esc(safeUrl(c.official)) + '" target="_blank" rel="noopener">进入大赛官网</a></div>' +
      '<div class="card block" style="margin-top:16px"><h2>信息来源</h2><ul class="src">' + src + '</ul><p class="src" style="margin-top:8px">核对日期：' + esc(fmt(c.checked)) + '。如与官方最新通知不一致，以官方通知为准。</p></div>' +
      '</div></div>' +
      '<section class="sec">' + contactBlock() + '</section>';
  }

  function news() {
    return '<section class="sec"><div class="sec-h"><h2>最新通知</h2></div>' + newsList(S.news) + '</section>';
  }

  function services() {
    var v = S.svc || {};
    var items = (v.items || []).map(function (x, i) { return '<div class="card"><h3><span class="no">' + (i + 1) + '</span>' + esc(x.title) + '</h3><p>' + esc(x.desc) + '</p></div>'; }).join('');
    var pr = (v.principles || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('');
    var cs = S.cases.filter(function (x) { return x.authorized === true; });
    var csHtml = cs.length ? '<section class="sec"><div class="sec-h"><h2>往届项目方向</h2></div><div class="cases">' +
      cs.map(function (x) { return '<span>' + esc(x.title) + (x.field ? '<small>' + esc(x.field) + '</small>' : '') + '</span>'; }).join('') +
      '</div><p class="muted" style="font-size:13px">以上项目经团队同意展示，已隐去学校与成员信息。</p></section>' : '';
    return '<section class="sec"><div class="sec-h"><h2>备赛指导</h2></div><div class="card prose"><p style="margin:0">' + esc(v.intro) + '</p></div></section>' +
      '<section class="sec"><div class="svc">' + items + '</div></section>' +
      (pr ? '<section class="sec"><div class="promise"><h3>服务原则</h3><ul>' + pr + '</ul></div></section>' : '') +
      csHtml + '<section class="sec">' + contactBlock() + '</section>';
  }

  function archive() {
    var A = S.archive;
    if (A === null) return '<div class="loading">正在加载存档…</div>';
    if (!A || !A.days || !A.days.length) return '<section class="sec"><div class="sec-h"><h2>往期存档</h2></div><div class="card empty">暂无存档</div></section>';
    var html = A.days.map(function (d) {
      var nw = (d.news || []).map(function (n) {
        return '<li><span class="tag t-' + esc(n.type) + '">' + esc(n.type || '通知') + '</span> ' + (n.url ? '<a href="' + esc(safeUrl(n.url)) + '" target="_blank" rel="noopener">' + esc(n.title) + '</a>' : esc(n.title)) + '</li>';
      }).join('');
      var ar = (d.articles || []).map(function (a) {
        return '<li><span class="tag">' + esc(a.kicker || '推文') + '</span> <a href="posts/#/a/' + encodeURIComponent(a.id) + '">' + esc(a.title) + '</a></li>';
      }).join('');
      var ct = (d.contests || []).map(function (c) {
        return '<a class="chip" style="text-decoration:none" href="#/contest/' + esc(c.id) + '">' + esc(c.change) + '｜' + esc(c.name) + '</a>';
      }).join(' ');
      var base = 'archive/' + encodeURIComponent(d.date) + '/';
      return '<div class="card block" style="margin-bottom:14px"><h2>' + esc(fmt(d.date)) + '</h2>' +
        (nw ? '<p class="src" style="margin:0 0 4px">新增通知 ' + d.news.length + ' 条</p><ul class="arc">' + nw + '</ul>' : '') +
        (ar ? '<p class="src" style="margin:10px 0 4px">新增推文 ' + d.articles.length + ' 篇</p><ul class="arc">' + ar + '</ul>' : '') +
        (ct ? '<p class="src" style="margin:10px 0 6px">赛事变动 ' + d.contests.length + ' 项</p><div class="chips">' + ct + '</div>' : '') +
        (!nw && !ar && !ct ? '<p class="muted" style="margin:0">当日核对完毕，无新增内容。</p>' : '') +
        '<p class="src" style="margin:12px 0 0">当日完整数据：<a href="' + base + 'contests.json" target="_blank">赛事</a> · <a href="' + base + 'news.json" target="_blank">通知</a> · <a href="' + base + 'articles.json" target="_blank">推文</a></p></div>';
    }).join('');
    return '<section class="sec"><div class="sec-h"><h2>往期存档</h2><span class="muted" style="font-size:13px">每日自动存档，共 ' + A.days.length + ' 天</span></div>' + html + '</section>';
  }

  function about() {
    return '<section class="sec"><div class="sec-h"><h2>关于本站</h2></div><div class="card prose">' +
      '<h2>本站做什么</h2><p>' + esc(S.cfg.about) + '</p>' +
      '<h2>信息怎么来</h2><ul><li>赛事通知、时间节点取自赛事官网、主办单位及教育主管部门公开发布的文件。</li>' +
      '<li>每条赛事均标注信息来源与核对日期；尚未发布官方通知的节点标注“待官方确认”，仅供参考往届安排。</li>' +
      '<li>各赛事报名、提交等操作请以大赛官网为准，本站不代收报名、不代收费用。</li></ul>' +
      '<h2>纠错与联系</h2><p>如发现信息有误，欢迎通过下方方式告知，我们会在核实后及时更正。</p></div></section>' +
      '<section class="sec">' + contactBlock() + '</section>';
  }

  // ---------- 路由 ----------
  function route() {
    var h = location.hash.replace(/^#\/?/, '');
    var parts = h.split('/'), r = parts[0] || 'home', html;
    if (r === 'contests') html = contests();
    else if (r === 'contest') html = detail(decodeURIComponent(parts[1] || ''));
    else if (r === 'news') html = news();
    else if (r === 'services') html = services();
    else if (r === 'about') html = about();
    else if (r === 'archive') { html = archive(); if (S.archive === null) loadArchive(); }
    else { r = 'home'; html = home(); }
    app.innerHTML = html;
    var nr = r === 'contest' ? 'contests' : r;
    Array.prototype.forEach.call(document.querySelectorAll('#nav a'), function (a) { a.classList.toggle('on', a.getAttribute('data-r') === nr); });
    var c = r === 'contest' ? byId(decodeURIComponent(parts[1] || '')) : null;
    document.title = (c ? c.short + ' - ' : '') + S.cfg.siteName;
    window.scrollTo(0, 0);
  }

  app.addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t) return;
    if (t.hasAttribute('data-f')) { F[t.getAttribute('data-f')] = t.getAttribute('data-v'); app.innerHTML = contests(); }
    else if (t.hasAttribute('data-gocat')) { F.cat = t.getAttribute('data-gocat'); F.st = '全部'; location.hash = '#/contests'; }
    else if (t.hasAttribute('data-copy')) {
      var v = t.getAttribute('data-copy');
      var done = function () { t.textContent = '已复制'; setTimeout(function () { t.textContent = '复制'; }, 1500); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(done, function () { fallback(v); done(); });
      else { fallback(v); done(); }
    }
  });
  function fallback(v) {
    var ta = document.createElement('textarea'); ta.value = v; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(ta);
  }

  Promise.all([load('config'), load('contests'), load('news'), load('services'), load('cases')]).then(function (r) {
    S.cfg = r[0] || {}; S.contests = (r[1] && r[1].items) || []; S.updated = (r[1] && r[1].updated) || '';
    S.news = ((r[2] && r[2].items) || []).slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    S.svc = r[3] || {}; S.cases = (r[4] && r[4].items) || [];
    if (r[2] && r[2].updated > S.updated) S.updated = r[2].updated;
    document.getElementById('siteName').textContent = S.cfg.siteName || '大学生竞赛资讯';
    document.getElementById('footAbout').textContent = S.cfg.about || '';
    document.getElementById('footIcp').innerHTML = S.cfg.icp ? '<a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener">' + esc(S.cfg.icp) + '</a>' : '';
    window.addEventListener('hashchange', route);
    route();
  }).catch(function () {
    app.innerHTML = '<div class="card empty" style="margin-top:24px">赛事信息加载失败，请刷新页面重试。</div>';
  });
})();
