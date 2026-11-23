(function () {
  'use strict';
  var TH = {
    navy: { c: '#173f72', s: '#eef3fa' }, pine: { c: '#1d6b52', s: '#e8f4ef' },
    sky: { c: '#1f6fb2', s: '#e9f2fb' }, brick: { c: '#a23b2a', s: '#fbefec' }
  };
  var S = { cfg: {}, arts: [] }, cat = '全部', app = document.getElementById('app');

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rich(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }
  function safeUrl(u) { u = String(u || ''); return /^https?:\/\//i.test(u) ? u : '#'; }
  function fmt(s) { var p = String(s || '').split('-'); return p.length === 3 ? (+p[0]) + '年' + (+p[1]) + '月' + (+p[2]) + '日' : ''; }
  function th(a) { return TH[a.theme] || TH.navy; }
  function load(n) { return fetch('data/' + n + '.json?v=' + Math.floor(Date.now() / 600000), { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw 0; return r.json(); }); }

  function card(a) {
    return '<a class="item" href="#/a/' + esc(a.id) + '"><div class="cover th-' + esc(TH[a.theme] ? a.theme : 'navy') + '"><div class="k">' + esc(a.kicker || a.category) +
      '</div><div class="t">' + esc(a.title) + '</div></div><div class="bd"><p class="sm">' + esc(a.summary) + '</p><div class="mt"><span>' +
      esc(fmt(a.date)) + '</span><span>' + esc(a.category) + '</span></div></div></a>';
  }

  function listPage() {
    var cats = ['全部'];
    S.arts.forEach(function (a) { if (cats.indexOf(a.category) < 0) cats.push(a.category); });
    var arr = S.arts.filter(function (a) { return cat === '全部' || a.category === cat; });
    return '<div class="head"><h1>' + esc(S.cfg.siteName) + '</h1><p>' + esc(S.cfg.slogan) + '</p></div>' +
      '<div class="cats">' + cats.map(function (c) { return '<button class="cat' + (c === cat ? ' on' : '') + '" data-c="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') + '</div>' +
      '<div class="list">' + (arr.map(card).join('') || '<div class="empty">暂无文章</div>') + '</div>' + foot();
  }

  function block(b, t, n) {
    switch (b.type) {
      case 'p': return '<p>' + rich(b.text) + '</p>';
      case 'h': return '<div class="sh"><span class="n" style="background:' + t.c + '">' + (n < 10 ? '0' + n : n) + '</span>' + esc(b.text) + '</div>';
      case 'callout': return '<div class="co" style="background:' + t.s + ';border-color:' + t.c + '">' + (b.title ? '<b style="color:' + t.c + '">' + esc(b.title) + '</b>' : '') + rich(b.text) + '</div>';
      case 'timeline': return '<ul class="tl">' + (b.items || []).map(function (x) { return '<li style="--c:' + t.c + '"><div class="d" style="color:' + t.c + '">' + esc(x.date) + '</div><div class="l">' + rich(x.label) + '</div></li>'; }).join('').replace(/<li style="--c:[^"]*">/g, '<li>') + '</ul>';
      case 'table': return '<div style="overflow-x:auto"><table class="tb"><thead><tr>' + (b.head || []).map(function (h) { return '<th style="background:' + t.c + '">' + esc(h) + '</th>'; }).join('') +
        '</tr></thead><tbody>' + (b.rows || []).map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + rich(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
      case 'list': return '<ul class="ul">' + (b.items || []).map(function (x) { return '<li><i style="position:absolute;left:2px;top:11px;width:7px;height:7px;border-radius:50%;background:' + t.c + '"></i>' + rich(x) + '</li>'; }).join('') + '</ul>';
      case 'source': return '<div class="src">信息来源<ol>' + (b.items || []).map(function (x) { return '<li><a href="' + esc(safeUrl(x.url)) + '" target="_blank" rel="noopener">' + esc(x.title) + '</a></li>'; }).join('') + '</ol></div>';
      default: return '';
    }
  }

  function endBlock() {
    var c = S.cfg;
    var qr = c.wechatQr ? '<img src="' + esc(c.wechatQr) + '" alt="客服微信二维码">' : '';
    var wx = c.wechatId ? '<p>客服微信：<span class="wx">' + esc(c.wechatId) + '</span></p>' : '<p>客服微信即将开放</p>';
    var mp = c.mpName ? '<p>关注公众号“' + esc(c.mpName) + '”，第一时间获取赛事通知</p>' : '';
    return '<div class="endb"><div class="t">备赛有疑问？</div><p>赛事选择、材料结构、答辩训练，欢迎咨询</p>' + wx + qr + mp + '</div>' +
      '<div class="disc">本文信息整理自官方公开通知，如有变动，以官方最新通知为准。</div>';
  }

  function artPage(id) {
    var a = null; S.arts.forEach(function (x) { if (x.id === id) a = x; });
    if (!a) return '<div class="empty">文章不存在，<a href="#/" style="color:#173f72">返回列表</a></div>';
    var t = th(a), n = 0;
    var body = (a.blocks || []).map(function (b) { if (b.type === 'h') n++; return block(b, t, n); }).join('');
    // 时间轴圆点颜色
    body = body.replace(/<ul class="tl">/g, '<ul class="tl" style="--tc:' + t.c + '">');
    var more = S.arts.filter(function (x) { return x.id !== a.id; }).slice(0, 3);
    return '<a class="back" href="#/">‹ 全部文章</a><article class="art"><h1>' + esc(a.title) + '</h1>' +
      '<div class="meta"><span class="acc">' + esc(S.cfg.accountName) + '</span><span>' + esc(fmt(a.date)) + '</span><span>' + esc(a.category) + '</span></div>' +
      '<div class="hero th-' + esc(TH[a.theme] ? a.theme : 'navy') + '"><div class="k">' + esc(a.kicker || a.category) + '</div><p>' + esc(a.summary) + '</p></div>' +
      body + endBlock() + '</article>' +
      (more.length ? '<div class="more"><h3>相关推荐</h3><div class="list" style="padding:0">' + more.map(card).join('') + '</div></div>' : '') + foot();
  }

  function foot() { return '<div class="foot">' + esc(S.cfg.siteName) + ' · 内容核对日期 ' + esc(fmt(S.updated)) + '</div>'; }

  function route() {
    var h = location.hash.replace(/^#\/?/, '').split('/');
    app.innerHTML = h[0] === 'a' ? artPage(decodeURIComponent(h[1] || '')) : listPage();
    var a = null; if (h[0] === 'a') S.arts.forEach(function (x) { if (x.id === decodeURIComponent(h[1] || '')) a = x; });
    document.title = a ? a.title : S.cfg.siteName;
    var tl = document.querySelectorAll('.tl');
    Array.prototype.forEach.call(tl, function (u) { var c = u.style.getPropertyValue('--tc'); Array.prototype.forEach.call(u.querySelectorAll('li'), function (li) { li.style.setProperty('--tc', c); }); });
    window.scrollTo(0, 0);
  }

  app.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-c]');
    if (b) { cat = b.getAttribute('data-c'); app.innerHTML = listPage(); }
  });

  Promise.all([load('config'), load('articles')]).then(function (r) {
    S.cfg = r[0] || {}; S.updated = (r[1] && r[1].updated) || '';
    S.arts = ((r[1] && r[1].items) || []).map(function (a, i) { a._i = i; return a; })
      .sort(function (x, y) { return x.date === y.date ? x._i - y._i : (x.date < y.date ? 1 : -1); });
    document.getElementById('siteName').textContent = S.cfg.siteName || '竞赛推文';
    var il = document.getElementById('infoLink');
    if (S.cfg.infoSite) il.href = /^https?:\/\//.test(S.cfg.infoSite) ? S.cfg.infoSite : String(S.cfg.infoSite).replace(/[^\w.\/-]/g, ''); else il.style.display = 'none';
    window.addEventListener('hashchange', route);
    route();
  }).catch(function () { app.innerHTML = '<div class="empty">内容加载失败，请刷新重试。</div>'; });
})();
