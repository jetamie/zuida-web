/* ============================================================
   最大影视 SPA：路由 + 页面 + 播放器
   ============================================================ */

(function () {
'use strict';

const {
  NAV_GROUPS: NAV,
  SUB_TYPES: SUBTYPES,
  HOME_RAILS: RAIL_TYPES,
  fetchList,
  fetchDetail,
  parsePlaySources,
  mediaUrl,
  isHls,
  plainText,
  safePic
} = window.ZD;

const app = document.getElementById('app');
const navEl = document.getElementById('nav');
const navLinks = document.getElementById('navLinks');
const toastEl = document.getElementById('toast');

/* 子分类 -> 所属导航分组 */
const SUB_TO_ROOT = {};
Object.entries(SUBTYPES).forEach(([root, subs]) => {
  SUB_TO_ROOT[root] = Number(root);
  subs.forEach((s) => (SUB_TO_ROOT[s.id] = Number(root)));
});

/* ---------------- 工具 ---------------- */

function h(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  (Array.isArray(children) ? children : [children]).forEach((c) => {
    if (c === null || c === undefined || c === false) return;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return node;
}

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toastEl.classList.remove('show'), 2400);
}

function picUrl(vod) {
  return safePic(vod) || '';
}

function attachLazyImg(img, src) {
  if (!src) {
    img.remove();
    return;
  }
  img.loading = 'lazy';
  img.referrerPolicy = 'no-referrer';
  img.alt = '';
  if (img.dataset.done) return;
  img.dataset.done = '1';
  const test = new Image();
  test.onload = () => {
    img.src = src;
    img.classList.add('loaded');
  };
  test.onerror = () => img.remove();
  test.src = src;
}

/* 海报卡片 */
function vodCard(vod) {
  const cover = h('div', { class: 'card-cover' }, [
    h('img', { alt: vod.vod_name }),
    vod.vod_remarks ? h('span', { class: `card-badge ${isHotRemark(vod.vod_remarks) ? 'hot' : ''}` }, vod.vod_remarks) : null,
    h('span', { class: 'card-play' }, [
      h('span', {}, h('svg', { viewBox: '0 0 24 24' }, h('path', { d: 'M8 5v14l11-7z' })))
    ])
  ]);
  attachLazyImg(cover.querySelector('img'), picUrl(vod));

  const card = h('a', { class: 'card', href: `#/detail/${vod.vod_id}` }, [
    cover,
    h('div', { class: 'card-meta' }, [
      h('div', { class: 'card-title' }, vod.vod_name || '未命名'),
      h('div', { class: 'card-sub' },
        [vod.type_name, vod.vod_year].filter(Boolean).join(' · ') || vod.vod_remarks || '')
    ])
  ]);
  return card;
}

function isHotRemark(remark = '') {
  return /更|HD|全集|完结|更新/.test(remark);
}

function skeletonCards(n) {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < n; i++) {
    frag.appendChild(
      h('div', { class: 'card skeleton' }, [
        h('div', { class: 'card-cover' }),
        h('div', { class: 'sk-line' }),
        h('div', { class: 'sk-line short' })
      ])
    );
  }
  return frag;
}

function stateBox({ icon = '🎬', title, desc, actionText, actionHref }) {
  return h('div', { class: 'section state-box' }, [
    h('div', { class: 'state-icon' }, icon),
    h('div', { class: 'state-title' }, title),
    h('div', { class: 'state-desc' }, desc),
    actionText ? h('a', { class: 'btn btn-primary', href: actionHref || '#/' }, actionText) : null
  ]);
}

function errorBox(message) {
  return stateBox({
    icon: '⚠️',
    title: '加载失败',
    desc: message || '网络或上游服务暂时不可用，请稍后重试。',
    actionText: '重新加载',
    actionHref: location.hash || '#/'
  });
}

function makePagination(page, pagecount, buildHash) {
  if (pagecount <= 1) return null;
  const wrap = h('div', { class: 'pagination' });
  const nums = [];
  const start = Math.max(1, Math.min(page - 2, pagecount - 4));
  const end = Math.min(pagecount, start + 4);
  for (let i = start; i <= end; i++) nums.push(i);

  wrap.appendChild(h('a', {
    class: 'page-btn', href: buildHash(Math.max(1, page - 1)),
    'aria-label': '上一页'
  }, '‹'));
  if (start > 1) {
    wrap.appendChild(h('a', { class: 'page-btn', href: buildHash(1) }, '1'));
    if (start > 2) wrap.appendChild(h('span', { class: 'page-info' }, '…'));
  }
  nums.forEach((n) => {
    wrap.appendChild(h('a', {
      class: `page-btn${n === page ? ' active' : ''}`,
      href: buildHash(n)
    }, String(n)));
  });
  if (end < pagecount) {
    if (end < pagecount - 1) wrap.appendChild(h('span', { class: 'page-info' }, '…'));
    wrap.appendChild(h('a', { class: 'page-btn', href: buildHash(pagecount) }, String(pagecount)));
  }
  wrap.appendChild(h('a', {
    class: 'page-btn', href: buildHash(Math.min(pagecount, page + 1)),
    'aria-label': '下一页'
  }, '›'));
  wrap.appendChild(h('span', { class: 'page-info' }, `${page} / ${pagecount}`));
  return wrap;
}

/* ---------------- 路由 ---------------- */

function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, query = ''] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  const params = new URLSearchParams(query);
  return { parts, params };
}

let currentCleanup = null;

async function router() {
  if (currentCleanup) { currentCleanup(); currentCleanup = null; }
  window.scrollTo(0, 0);
  const { parts, params } = parseHash();
  updateNavActive(parts);

  app.innerHTML = '';
  try {
    if (parts.length === 0) return await renderHome();
    if (parts[0] === 'type' && parts[1]) return await renderType(Number(parts[1]), Number(params.get('pg')) || 1);
    if (parts[0] === 'search') return await renderSearch(params.get('q') || '');
    if (parts[0] === 'detail' && parts[1]) return await renderDetail(Number(parts[1]));
    if (parts[0] === 'play' && parts[1]) {
      return await renderPlay(Number(parts[1]), Number(params.get('si')) || 0, Number(params.get('ei')) || 0);
    }
    app.appendChild(stateBox({ icon: '🧭', title: '页面不存在', desc: '地址有误，返回首页继续浏览吧。', actionText: '回到首页' }));
  } catch (err) {
    app.appendChild(errorBox(err.message));
  }
}

window.addEventListener('hashchange', router);

/* ---------------- 导航 ---------------- */

function renderNav() {
  navLinks.innerHTML = '';
  NAV.forEach((g) => {
    navLinks.appendChild(h('a', {
      class: 'nav-link',
      href: g.hash,
      dataset: { id: g.id }
    }, g.name));
  });
}

function updateNavActive(parts) {
  let activeId = 'home';
  if (parts[0] === 'type') activeId = SUB_TO_ROOT[Number(parts[1])] || Number(parts[1]);
  navLinks.querySelectorAll('.nav-link').forEach((a) => {
    a.classList.toggle('active', Number(a.dataset.id) === Number(activeId) ||
      (activeId === 'home' && a.dataset.id === 'home' && parts.length === 0));
  });
}

const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const q = searchInput.value.trim();
  if (!q) return;
  location.hash = `#/search?q=${encodeURIComponent(q)}`;
  searchInput.blur();
  document.getElementById('searchForm').classList.remove('open');
});
document.getElementById('navSearchToggle').addEventListener('click', () => {
  const box = document.getElementById('searchForm');
  box.classList.toggle('open');
  if (box.classList.contains('open')) searchInput.focus();
});

window.addEventListener('scroll', () => {
  navEl.classList.toggle('solid', window.scrollY > 12);
}, { passive: true });

/* ---------------- 首页 ---------------- */

async function renderHome() {
  /* Hero 骨架 */
  const hero = h('section', { class: 'hero' }, [
    h('div', { class: 'hero-content' }, [
      h('div', { class: 'hero-kicker skeleton-line' })
    ]),
    h('div', { class: 'hero-dots' })
  ]);
  app.appendChild(hero);

  /* 轨道骨架 */
  const railsSection = h('section', { class: 'section' });
  RAIL_TYPES.forEach((t, i) => {
    if (i === 0) railsSection.appendChild(h('div', { class: 'section-head' }, h('div', { class: 'section-title' }, '正在加载…')));
    const track = h('div', { class: 'rail-track' });
    track.appendChild(skeletonCards(8));
    railsSection.appendChild(h('div', { class: 'rail' }, track));
  });
  app.appendChild(railsSection);

  /* 数据：最新内容（Hero） + 各分类轨道 */
  const [latestRes, ...railResults] = await Promise.all([
    fetchList({ pg: 1 }).catch(() => null),
    ...RAIL_TYPES.map((t) => fetchList({ t, pg: 1 }).catch(() => null))
  ]);

  if (!latestRes || !latestRes.list?.length) {
    app.innerHTML = '';
    app.appendChild(errorBox('无法获取最新影片，请检查网络后重试。'));
    return;
  }

  const heroItems = latestRes.list
    .filter((v) => v.vod_pic && ![49, 50].includes(Number(v.type_id)))
    .slice(0, 5);
  renderHero(hero, heroItems.length ? heroItems : latestRes.list.filter((v) => v.vod_pic).slice(0, 5));
  renderRails(railsSection, railResults);
}

let heroTimer = null;

function renderHero(hero, items) {
  if (!items.length) return;
  hero.innerHTML = '';
  const dots = h('div', { class: 'hero-dots' });
  let active = 0;

  function show(i) {
    active = i;
    hero.querySelectorAll('.hero-slide').forEach((s, idx) => s.classList.toggle('active', idx === i));
    dots.querySelectorAll('.hero-dot').forEach((d, idx) => d.classList.toggle('active', idx === i));
  }

  items.forEach((vod, i) => {
    const slide = h('div', { class: `hero-slide${i === 0 ? ' active' : ''}` }, [
      h('div', { class: 'hero-bg' }),
      h('div', { class: 'hero-overlay' }),
      h('div', { class: 'hero-content' }, [
        h('div', { class: 'hero-kicker' }, vod.type_name || '热门推荐'),
        h('h1', { class: 'hero-title' }, vod.vod_name),
        h('div', { class: 'hero-meta' },
          [vod.vod_year, vod.vod_area, vod.vod_remarks].filter(Boolean).flatMap((x, idx) =>
            idx ? [h('span', { class: 'dot' }), x] : [x]
          )),
        vod.vod_content ? h('p', { class: 'hero-desc' }, plainText(vod.vod_content).slice(0, 90)) : null,
        h('div', { class: 'hero-actions' }, [
          h('a', { class: 'btn btn-primary', href: `#/play/${vod.vod_id}?si=0&ei=0` }, [
            h('svg', { viewBox: '0 0 24 24' }, h('path', { fill: 'currentColor', d: 'M8 5v14l11-7z' })),
            '立即播放'
          ]),
          h('a', { class: 'btn btn-ghost', href: `#/detail/${vod.vod_id}` }, '查看详情')
        ])
      ])
    ]);
    const bg = slide.querySelector('.hero-bg');
    bg.style.backgroundImage = `url("${picUrl(vod)}")`;
    slide.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
    });
    hero.appendChild(slide);

    const dot = h('button', { class: `hero-dot${i === 0 ? ' active' : ''}`, 'aria-label': `第 ${i + 1} 张` });
    dot.addEventListener('click', () => { show(i); restart(); });
    dots.appendChild(dot);
  });
  hero.appendChild(dots);

  function next() { show((active + 1) % items.length); }
  function restart() { clearInterval(heroTimer); heroTimer = setInterval(next, 5500); }
  restart();
  currentCleanup = () => clearInterval(heroTimer);
}

function makeRail(title, list) {
  const head = h('div', { class: 'section-head' }, [
    h('div', { class: 'section-title' }, title),
  ]);
  const track = h('div', { class: 'rail-track' });
  list.slice(0, 14).forEach((v) => track.appendChild(vodCard(v)));

  const rail = h('div', { class: 'rail' }, [
    h('button', { class: 'rail-arrow prev', 'aria-label': '向左滚动' },
      h('svg', { viewBox: '0 0 24 24' }, h('path', { fill: 'currentColor', d: 'M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z' }))),
    track,
    h('button', { class: 'rail-arrow next', 'aria-label': '向右滚动' },
      h('svg', { viewBox: '0 0 24 24' }, h('path', { fill: 'currentColor', d: 'm8.6 7.4 4.6 4.6-4.6 4.6L10 18l6-6-6-6z' })))
  ]);
  rail.querySelector('.prev').addEventListener('click', () => track.scrollBy({ left: -track.clientWidth * 0.85, behavior: 'smooth' }));
  rail.querySelector('.next').addEventListener('click', () => track.scrollBy({ left: track.clientWidth * 0.85, behavior: 'smooth' }));
  return [head, rail];
}

function renderRails(container, results) {
  container.innerHTML = '';
  let hasAny = false;
  results.forEach((res, i) => {
    if (!res || !res.list?.length) return;
    hasAny = true;
    const name = res.list[0].type_name || '热门推荐';
    const t = RAIL_TYPES[i];
    const [head, rail] = makeRail(name, res.list);
    head.appendChild(h('a', { class: 'section-more', href: `#/type/${t}` }, '查看全部 ›'));
    container.appendChild(head);
    container.appendChild(rail);
  });
  if (!hasAny) {
    container.appendChild(stateBox({ icon: '📡', title: '暂时没有内容', desc: '分类数据加载失败，请稍后再试。' }));
  }
}

/* ---------------- 分类页 ---------------- */

async function renderType(typeId, pg) {
  const rootId = SUB_TO_ROOT[typeId] || typeId;
  const subs = SUBTYPES[rootId] || [{ id: typeId, name: '全部' }];
  const currentName = subs.find((s) => s.id === typeId)?.name || '影片';

  const section = h('section', { class: 'section' });
  section.appendChild(h('div', { class: 'page-head' }, [
    h('div', { class: 'page-title' }, currentName),
    h('div', { class: 'page-sub' }, '精选高分与最新更新作品')
  ]));

  const filterBar = h('div', { class: 'filter-bar' });
  subs.forEach((s) => {
    filterBar.appendChild(h('a', {
      class: `chip${s.id === typeId ? ' active' : ''}`,
      href: `#/type/${s.id}`
    }, s.name));
  });
  section.appendChild(filterBar);

  const grid = h('div', { class: 'grid skeleton' });
  grid.appendChild(skeletonCards(18));
  section.appendChild(grid);
  const pagerSlot = h('div');
  section.appendChild(pagerSlot);
  app.appendChild(section);

  const data = await fetchList({ t: typeId, pg });
  grid.classList.remove('skeleton');
  grid.innerHTML = '';

  if (!data.list?.length) {
    section.appendChild(stateBox({ icon: '🎞️', title: '该分类暂无内容', desc: '换个分类看看吧。', actionText: '返回首页' }));
    return;
  }

  data.list.forEach((v) => grid.appendChild(vodCard(v)));
  const pagecount = Number(data.pagecount) || 1;
  const pager = makePagination(pg, pagecount, (n) => `#/type/${typeId}?pg=${n}`);
  if (pager) pagerSlot.appendChild(pager);
}

/* ---------------- 搜索页 ---------------- */

async function renderSearch(keyword) {
  searchInput.value = keyword;
  const section = h('section', { class: 'section' });
  section.appendChild(h('div', { class: 'page-head' }, [
    h('div', { class: 'page-title' }, keyword ? `“${keyword}”` : '搜索'),
    h('div', { class: 'page-sub' }, '正在为你查找相关影片…')
  ]));

  if (!keyword) {
    section.querySelector('.page-sub').textContent = '输入片名、演员或导演试试';
    app.appendChild(section);
    return;
  }

  const grid = h('div', { class: 'grid skeleton' });
  grid.appendChild(skeletonCards(12));
  section.appendChild(grid);
  app.appendChild(section);

  const data = await fetchList({ wd: keyword });
  grid.classList.remove('skeleton');
  grid.innerHTML = '';

  const sub = section.querySelector('.page-sub');
  if (!data.list?.length) {
    sub.textContent = '';
    section.appendChild(stateBox({
      icon: '🔍',
      title: '没有找到相关影片',
      desc: `没有与 “${keyword}” 相关的结果，换个关键词试试。`,
      actionText: '返回首页'
    }));
    return;
  }
  sub.textContent = `共找到 ${data.total} 部相关影片`;
  data.list.forEach((v) => grid.appendChild(vodCard(v)));
}

/* ---------------- 详情页 ---------------- */

async function renderDetail(id) {
  const holder = h('div', { class: 'detail-skeleton' });
  holder.appendChild(h('div', { style: 'height:60vh' }));
  app.appendChild(h('div', { class: 'grid skeleton section', style: 'padding-top:60px' }, skeletonCards(6)));

  const data = await fetchDetail(id);
  const vod = data.list?.[0];
  if (!vod) {
    app.innerHTML = '';
    app.appendChild(stateBox({ icon: '🎬', title: '影片不存在', desc: '可能已下架，去看看其它作品吧。', actionText: '返回首页' }));
    return;
  }
  app.innerHTML = '';

  const sources = parsePlaySources(vod.vod_play_from, vod.vod_play_url);

  const heroSection = h('section', { class: 'detail-hero' });
  const bg = h('div', { class: 'detail-bg' });
  if (picUrl(vod)) bg.style.backgroundImage = `url("${picUrl(vod)}")`;
  heroSection.appendChild(bg);

  const poster = h('div', { class: 'detail-poster' }, h('img', { alt: vod.vod_name }));
  if (picUrl(vod)) {
    const im = poster.querySelector('img');
    im.referrerPolicy = 'no-referrer';
    const t = new Image();
    t.onload = () => (im.src = picUrl(vod));
    t.onerror = () => im.remove();
    t.src = picUrl(vod);
  }

  const tags = h('div', { class: 'detail-tags' },
    [vod.vod_remarks && h('span', { class: 'tag remark' }, vod.vod_remarks),
    vod.vod_year && h('span', { class: 'tag' }, vod.vod_year),
    vod.vod_area && h('span', { class: 'tag' }, vod.vod_area),
    vod.vod_lang && h('span', { class: 'tag' }, vod.vod_lang),
    vod.type_name && h('span', { class: 'tag' }, vod.type_name)]
      .filter(Boolean));

  const metaRows = [];
  if (vod.vod_director) metaRows.push(['导演', vod.vod_director]);
  if (vod.vod_actor) metaRows.push(['主演', vod.vod_actor]);
  if (vod.vod_time) metaRows.push(['更新', vod.vod_time]);

  const info = h('div', { class: 'detail-info' }, [
    h('div', { class: 'detail-type' }, vod.type_name || '影片'),
    h('h1', { class: 'detail-name' }, vod.vod_name),
    vod.vod_en ? h('div', { class: 'detail-en' }, vod.vod_en) : null,
    tags,
    h('div', { class: 'detail-actions' }, [
      sources.length && sources[0].episodes.length
        ? h('a', { class: 'btn btn-primary', href: `#/play/${id}?si=0&ei=0` }, [
            h('svg', { viewBox: '0 0 24 24' }, h('path', { fill: 'currentColor', d: 'M8 5v14l11-7z' })),
            '立即播放'
          ])
        : h('button', { class: 'btn btn-primary', disabled: true, onclick: () => toast('暂无可播放的源') }, '暂不可播放'),
      h('button', { class: 'btn btn-ghost', onclick: () => toast('已加入收藏（演示）') }, '＋ 收藏')
    ]),
    h('div', { class: 'detail-meta' },
      metaRows.map(([k, v]) => h('div', { class: 'meta-row' }, [
        h('span', { class: 'meta-label' }, k),
        h('span', { class: 'meta-value' }, v)
      ]))),
    vod.vod_content
      ? h('div', { class: 'detail-desc' }, plainText(vod.vod_content))
      : h('div', { class: 'detail-desc' }, '暂无简介。')
  ]);

  heroSection.appendChild(h('div', { class: 'section detail-inner' }, [poster, info]));
  app.appendChild(heroSection);

  /* 播放源与剧集 */
  const playSection = h('section', { class: 'section sources' });
  if (!sources.length || sources.every((s) => !s.episodes.length)) {
    playSection.appendChild(h('div', { class: 'no-play' }, '暂无可用播放地址'));
  } else {
    const tabs = h('div', { class: 'source-tabs' });
    const panels = h('div');

    sources.forEach((src, si) => {
      tabs.appendChild(h('button', {
        class: `source-tab${si === 0 ? ' active' : ''}`,
        onclick: () => {
          tabs.querySelectorAll('.source-tab').forEach((t) => t.classList.remove('active'));
          tabs.children[si].classList.add('active');
          panels.querySelectorAll('.source-panel').forEach((p, i) =>
            p.style.display = i === si ? '' : 'none');
        }
      }, [document.createTextNode(sourceName(src.name)), h('span', { class: 'source-count' }, `${src.episodes.length}集`)]));

      const grid = h('div', { class: 'episode-grid source-panel' },
        src.episodes.map((ep, ei) => h('a', {
          class: 'ep-btn',
          title: ep.name,
          href: ep.url ? `#/play/${id}?si=${si}&ei=${ei}` : undefined,
          onclick: ep.url ? undefined : (e) => { e.preventDefault(); toast('该集暂无播放地址'); }
        }, ep.name)));
      if (si !== 0) grid.style.display = 'none';
      panels.appendChild(grid);
    });

    playSection.appendChild(tabs);
    playSection.appendChild(panels);
  }
  app.appendChild(playSection);
}

function sourceName(raw) {
  const map = { zuidam3u8: '最大M3U8', http: '下载源', youku: '优酷', qiyi: '爱奇艺', tencent: '腾讯', mgtv: '芒果TV' };
  return map[raw] || raw;
}

/* ---------------- 播放页 ---------------- */

let hlsPlayer = null;

async function renderPlay(id, si, ei) {
  const wrap = h('div', { class: 'player-wrap' }, [
    h('div', { class: 'player-shell' }, h('div', { class: 'player-loading' }, [
      h('div', { class: 'spinner' }),
      h('div', {}, '正在加载影片信息…')
    ]))
  ]);
  app.appendChild(wrap);

  const data = await fetchDetail(id);
  const vod = data.list?.[0];
  if (!vod) {
    app.innerHTML = '';
    app.appendChild(stateBox({ icon: '🚫', title: '影片不存在', actionText: '返回首页' }));
    return;
  }

  const sources = parsePlaySources(vod.vod_play_from, vod.vod_play_url)
    .map((s) => ({ ...s, episodes: s.episodes.filter((e) => e.url) }))
    .filter((s) => s.episodes.length);

  if (!sources.length) {
    app.innerHTML = '';
    app.appendChild(stateBox({
      icon: '📺',
      title: '暂无播放源',
      desc: '该影片暂无可播放的地址，看看其它影片吧。',
      actionText: '返回影片详情',
      actionHref: `#/detail/${id}`
    }));
    return;
  }

  si = Math.min(Math.max(si, 0), sources.length - 1);
  const source = sources[si];
  ei = Math.min(Math.max(ei, 0), source.episodes.length - 1);
  const ep = source.episodes[ei];

  app.innerHTML = '';
  const container = h('div', { class: 'player-wrap' });

  const shell = h('div', { class: 'player-shell' }, [
    h('iframe', {
      src: mediaUrl(ep.url),
      class: 'player-iframe',
      allow: 'autoplay; fullscreen; encrypted-media; picture-in-picture',
      allowfullscreen: true,
      frameborder: '0'
    }),
    h('div', { class: 'player-loading' }, [
      h('div', { class: 'spinner' }),
      h('div', {}, `正在加载：${ep.name}`)
    ])
  ]);
  container.appendChild(shell);

  const loading = shell.querySelector('.player-loading');
  const iframe = shell.querySelector('.player-iframe');
  iframe.addEventListener('load', () => loading.classList.add('hidden'));
  /* 超时兜底：iframe 可能不触发 load 事件 */
  setTimeout(() => loading.classList.add('hidden'), 8000);

  /* 信息与上/下一集 */
  const hasPrev = ei > 0;
  const hasNext = ei < source.episodes.length - 1;
  container.appendChild(h('div', { class: 'player-info' }, [
    h('div', { class: 'player-title' }, vod.vod_name),
    h('div', { class: 'player-epname' },
      `${sourceName(source.name)} · ${ep.name} · ${source.episodes.length} 集`),
    h('div', { class: 'player-epbar' }, [
      h('a', {
        class: `btn btn-ghost${hasPrev ? '' : ' '}`,
        href: hasPrev ? `#/play/${id}?si=${si}&ei=${ei - 1}` : undefined,
        style: hasPrev ? '' : 'opacity:0.35;pointer-events:none;'
      }, '‹ 上一集'),
      h('a', { class: 'btn btn-ghost', href: `#/detail/${id}` }, '影片详情'),
      h('a', {
        class: 'btn btn-primary',
        href: hasNext ? `#/play/${id}?si=${si}&ei=${ei + 1}` : undefined,
        style: hasNext ? '' : 'opacity:0.35;pointer-events:none;'
      }, '下一集 ›')
    ])
  ]));

  /* 其它剧集 */
  const epPanel = h('section', { class: 'section sources' });
  const tabs = h('div', { class: 'source-tabs' });
  sources.forEach((s, idx) => {
    tabs.appendChild(h('a', {
      class: `source-tab${idx === si ? ' active' : ''}`,
      href: `#/play/${id}?si=${idx}&ei=0`
    }, document.createTextNode(sourceName(s.name))));
  });
  const epGrid = h('div', { class: 'episode-grid' });
  source.episodes.forEach((e, idx) => {
    epGrid.appendChild(h('a', {
      class: `ep-btn${idx === ei ? ' current' : ''}`,
      href: `#/play/${id}?si=${si}&ei=${idx}`,
      title: e.name
    }, e.name));
  });
  epPanel.appendChild(h('div', { class: 'section-head' }, h('div', { class: 'section-title' }, '选集')));
  epPanel.appendChild(tabs);
  epPanel.appendChild(epGrid);

  app.appendChild(container);
  app.appendChild(epPanel);

  currentCleanup = () => {};
}

/* ---------------- 启动 ---------------- */

renderNav();
if (!location.hash) location.hash = '#/';
router();

})();
