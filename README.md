# 最大影视 · 在线影院

基于「最大资源网 zuidapi」Apple CMS / MacCMS JSON 接口构建的在线影视站，采用 Apple TV+ 风格深色 UI。

## 技术栈

- **后端**：零依赖 Node.js 原生 HTTP 服务（无需 npm install）
- **前端**：原生 HTML/CSS/JS 单页应用（无框架、无构建工具）
- **播放器**：[hls.js](https://github.com/video-dev/hls.js/)（已内置本地副本）
- **数据源**：最大资源网公开 JSON API (`https://api.zuidapi.com`)

## 功能

| 页面 | 说明 |
|------|------|
| 首页 | Hero 自动轮播 + 8 条横向分类轨道（动作片/国产剧/日韩动漫/大陆综艺等） |
| 分类页 | 电影/剧集/综艺/动漫/纪录片/短剧/体育 7 大分组，子分类胶囊筛选，6 列海报网格，窗口式分页 |
| 搜索 | 关键词模糊搜索（`wd` 参数），结果数统计与空状态提示 |
| 详情页 | 海报模糊背景、年份/地区/语言标签、导演主演、简介、多播放源 Tab、选集网格 |
| 播放页 | hls.js 播放器、播放源切换、上/下一集、选集高亮、加载态与错误兜底 |

## 项目结构

```
zuida/
├── server.js                      # Node 服务（静态托管 + API 代理 + HLS 媒体代理）
├── README.md
├── 最大资源网 zuidapi API — OpenAPI - Swagger 风格开发文档.md
└── public/
    ├── index.html                  # 单页骨架
    ├── css/
    │   └── style.css               # Apple TV+ 风格深色主题
    └── js/
        ├── api.js                  # 分类定义、接口封装、播放地址解析
        ├── app.js                  # 路由 + 页面 + 播放器逻辑
        └── vendor/
            └── hls.min.js          # hls.js 播放器库（本地内置）
```

## 环境要求

- **Node.js >= 14**（开发环境使用 v24，更低版本需支持 `URL` 全局对象与 `async/await`）

## 安装与启动

### 1. 克隆 / 下载项目

将项目目录放到本地任意位置，例如：

```
git clone https://github.com/jetamie/zuida-web.git
cd zuida-web
```

### 2. 启动服务

项目零 npm 依赖，无需 `npm install`，直接运行：

```bash
node server.js
```

启动后终端输出：

```
  最大影视站已启动
  → http://localhost:3000
```

### 3. 打开浏览器

访问 **http://localhost:3000** 即可。

### 自定义端口

默认端口 3000，可通过环境变量修改：

```bash
# Linux / macOS
PORT=8080 node server.js

# Windows PowerShell
$env:PORT=8080; node server.js

# Windows CMD
set PORT=8080 && node server.js
```

## 架构说明

```
浏览器                          Node 服务 (server.js)                    上游
┌──────────┐   /api/vod?ac=…    ┌──────────────┐   GET    ┌──────────────────┐
│ 前端 SPA │ ──────────────────→│ API 代理     │────────→│ api.zuidapi.com  │
│          │                    │ (90秒缓存    │←────────│ JSON 接口        │
│          │   /media?u=…       │  超时重试)   │         └──────────────────┘
│  <video> │ ──────────────────→│              │
│  hls.js  │← m3u8 重写 + ts 透传│ HLS 媒体代理 │────────→  播放节点 m3u8/ts
└──────────┘                    └──────────────┘           (防盗链/跨域)
```

### 为什么需要代理？

1. **API 代理**（`/api/vod`）：上游接口未设置 CORS 头，浏览器直接请求会被拦截。代理在服务端转发并补充 CORS 头。
2. **HLS 媒体代理**（`/media`）：播放节点存在跨域限制与防盗链。代理自动重写 m3u8 播放列表中的所有地址（子播放列表、分片、密钥），让 hls.js 始终通过本地代理获取流媒体数据。

### API 代理支持的参数

| 参数 | 说明 |
|------|------|
| `ac` | `list` 或 `detail`（默认 `list`） |
| `t` | 分类 ID |
| `pg` | 页码 |
| `wd` | 搜索关键词 |
| `h` | 最近 N 小时更新 |
| `ids` | 视频 ID（多个用逗号分隔） |

## 数据来源

所有影视数据来源于最大资源网（zuidapi）公开 JSON 接口：

- 列表/搜索：`GET /api.php/provide/vod/?ac=list`
- 视频详情：`GET /api.php/provide/vod/?ac=detail`
- M3U8 JSON：`GET /api.php/provide/vod/from/zuidam3u8/`

本站仅作为前端展示与播放工具，不存储任何视频内容，所有内容由第三方提供，仅供学习交流使用。

## 常见问题

**Q: 播放页显示"无法访问播放节点"？**

播放节点（`*.zuidazym3u8.com`）可能对部分网络环境有 IP 或地域限制。服务已内置有限次重试，若仍失败会显示友好错误提示。可尝试切换网络或稍后重试。

**Q: 首页海报图片不显示？**

图片来源于上游图床（`ok.zuidapic.com`），网络波动时可能加载失败，前端会自动隐藏加载失败的图片占位。

**Q: 搜索没有结果？**

确认关键词拼写正确，接口为模糊匹配。部分冷门内容可能未被收录。
