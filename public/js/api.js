/* ============================================================
   API 层：分类定义、请求封装、播放地址解析
   ============================================================ */

(function () {
'use strict';

const API_BASE = '/api/vod';

/* 主导航分组（id 使用真实分类 ID，经接口实测） */
const NAV_GROUPS = [
  { id: 'home', name: '首页', hash: '#/' },
  { id: 6, name: '电影', hash: '#/type/6' },
  { id: 13, name: '剧集', hash: '#/type/13' },
  { id: 25, name: '综艺', hash: '#/type/25' },
  { id: 29, name: '动漫', hash: '#/type/29' },
  { id: 20, name: '纪录片', hash: '#/type/20' },
  { id: 54, name: '短剧', hash: '#/type/54' },
  { id: 49, name: '体育', hash: '#/type/49' }
];

/* 分类页的子分类筛选条 */
const SUB_TYPES = {
  6: [
    { id: 6, name: '动作片' }, { id: 7, name: '喜剧片' }, { id: 8, name: '爱情片' },
    { id: 9, name: '科幻片' }, { id: 10, name: '恐怖片' }, { id: 11, name: '剧情片' },
    { id: 12, name: '战争片' }, { id: 62, name: '4K电影' }, { id: 70, name: '邵氏电影' },
    { id: 71, name: 'Netflix电影' }
  ],
  13: [
    { id: 13, name: '国产剧' }, { id: 14, name: '欧美剧' }, { id: 15, name: '韩剧' },
    { id: 16, name: '日剧' }, { id: 17, name: '港剧' }, { id: 18, name: '台剧' },
    { id: 19, name: '泰剧' }, { id: 23, name: '海外剧' }, { id: 72, name: 'Netflix自制剧' }
  ],
  25: [
    { id: 25, name: '大陆综艺' }, { id: 26, name: '日韩综艺' },
    { id: 27, name: '港台综艺' }, { id: 28, name: '欧美综艺' }, { id: 47, name: '演唱会' }
  ],
  29: [
    { id: 29, name: '国产动漫' }, { id: 30, name: '日韩动漫' }, { id: 31, name: '欧美动漫' },
    { id: 39, name: '动画片' }, { id: 44, name: '港台动漫' }, { id: 45, name: '海外动漫' },
    { id: 63, name: '有声动漫' }, { id: 75, name: '漫剧' }
  ],
  54: [
    { id: 54, name: '爽文短剧' }, { id: 64, name: '女频恋爱' }, { id: 65, name: '反转爽剧' },
    { id: 66, name: '古装仙侠' }, { id: 67, name: '年代穿越' }, { id: 68, name: '脑洞悬疑' },
    { id: 69, name: '现代都市' }, { id: 73, name: '擦边短剧' }
  ],
  49: [{ id: 49, name: '篮球' }, { id: 50, name: '足球' }],
  20: [{ id: 20, name: '纪录片' }, { id: 74, name: '科普学习' }, { id: 53, name: '影视解说' }, { id: 51, name: '预告片' }]
};

/* 首页各轨道推荐的分类（取热门内容丰富的栏目） */
const HOME_RAILS = [6, 13, 30, 25, 9, 15, 69, 10];

async function vodRequest(params) {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const resp = await fetch(`${API_BASE}?${qs}`, { signal: controller.signal });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (data.success === false) throw new Error(data.error?.message || '请求失败');
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/* 使用 ac=detail 取列表：海报、年份等字段完整（接口实测支持 t/pg/wd/h） */
function fetchList({ t, pg, wd, h } = {}) {
  return vodRequest({ ac: 'detail', t, pg, wd, h });
}

function fetchDetail(ids) {
  return vodRequest({ ac: 'detail', ids: String(ids) });
}

/* 解析 vod_play_from / vod_play_url —— 严格按文档三层分隔，容错空数据与数量不一致 */
function parsePlaySources(playFrom = '', playUrl = '') {
  const sources = playFrom.split('$$$').map((s) => s.trim()).filter(Boolean);
  const groups = playUrl.split('$$$').map((s) => s.trim());

  return sources.map((name, index) => {
    const group = groups[index] || '';
    const episodes = group
      .split('#')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const at = item.indexOf('$');
        if (at === -1) return { name: item, url: '' };
        return { name: item.slice(0, at).trim(), url: item.slice(at + 1).trim() };
      });
    return { name, episodes };
  });
}

/* 播放地址走外部 m3u8 代理播放器 */
function mediaUrl(rawUrl) {
  return `https://jx.zdplay.cc/m3u8Player/?url=${encodeURIComponent(rawUrl)}`;
}

function isHls(url = '') {
  return /\.m3u8(\?|$)/i.test(url);
}

/* 去掉简介中的 HTML 标签与多余空白 */
function plainText(html = '') {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function safePic(vod) {
  return vod.vod_pic || '';
}

window.ZD = {
  NAV_GROUPS,
  SUB_TYPES,
  HOME_RAILS,
  fetchList,
  fetchDetail,
  parsePlaySources,
  mediaUrl,
  isHls,
  plainText,
  safePic
};

})();
