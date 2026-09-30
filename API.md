# 最大资源网 zuidapi API
## OpenAPI / Swagger 风格开发文档

**Version:** 1.0.0  
**API Base URL:**

```text
https://api.zuidapi.com
```

**API 类型：**

- Apple CMS / MacCMS Provide API
- JSON
- XML
- M3U8 资源采集

---

# 1. 概述

最大资源网提供一套兼容苹果 CMS Provide API 规范的视频资源接口。

官方帮助页明确提供：

```text
视频 JSON 列表：
https://api.zuidapi.com/api.php/provide/vod/?ac=list

视频 JSON 详情：
https://api.zuidapi.com/api.php/provide/vod/?ac=detail

M3U8 XML：
https://api.zuidapi.com/api.php/provide/vod/from/zuidam3u8/at/xml/

M3U8 JSON：
https://api.zuidapi.com/api.php/provide/vod/from/zuidam3u8/

下载资源 XML：
https://api.zuidapi.com/api.php/provide/vod/from/http/at/xml/
```

最大资源网的苹果 CMS V10 配置页面明确列出了上述接口，并说明下载资源需要增加 `ct=1`。

---

# 2. API 总览

| Method | Endpoint | 用途 |
|---|---|---|
| GET | `/api.php/provide/vod/?ac=list` | 视频列表 / 搜索 |
| GET | `/api.php/provide/vod/?ac=detail` | 视频详情 |
| GET | `/api.php/provide/vod/from/zuidam3u8/` | M3U8 JSON |
| GET | `/api.php/provide/vod/from/zuidam3u8/at/xml/` | M3U8 XML |
| GET | `/api.php/provide/vod/from/http/at/xml/` | 下载资源 XML |

---

# 3. API 认证

当前公开接口文档没有要求：

```text
Authorization
Bearer Token
API Key
Access Token
```

因此默认按照**公开 GET API**处理。

但是最大资源网帮助页特别说明：

> 无法采集时可能需要联系管理员加入白名单。

因此生产环境不要假定任何服务器 IP 永远可以访问。

---

# 4. 通用请求规范

所有接口均使用：

```http
GET
```

字符集：

```text
UTF-8
```

建议请求头：

```http
Accept: application/json
User-Agent: your-app/1.0
```

搜索关键词必须进行 URL Encoding。

例如：

```text
三体
```

应编码为：

```text
%E4%B8%89%E4%BD%93
```

---

# 5. GET /api.php/provide/vod/?ac=list

## 视频列表

用于：

- 获取视频列表
- 模糊搜索
- 分类查询
- 分页
- 增量同步

这是最主要的接口。

苹果 CMS 官方 API 文档明确将：

```text
ac=list
t=类别ID
pg=页码
wd=搜索关键字
h=几小时内的数据
```

定义为列表接口参数。

---

## 5.1 Request

```http
GET /api.php/provide/vod/?ac=list
```

完整地址：

```text
https://api.zuidapi.com/api.php/provide/vod/?ac=list
```

---

## 5.2 Query Parameters

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---:|---:|---|
| `ac` | string | 是 | `list` | 固定为 `list` |
| `t` | integer | 否 | - | 分类 ID |
| `pg` | integer | 否 | - | 页码 |
| `wd` | string | 否 | - | 搜索关键词 |
| `h` | integer | 否 | - | 最近 N 小时更新的数据 |

### 参数说明

#### ac

```text
ac=list
```

固定值。

---

#### t

分类 ID：

```text
t=1
```

---

#### pg

页码：

```text
pg=1
```

例如：

```text
pg=2
```

表示第二页。

---

#### wd

模糊搜索关键词：

```text
wd=三体
```

完整：

```text
https://api.zuidapi.com/api.php/provide/vod/?ac=list&wd=三体
```

程序中必须 URL Encode。

---

#### h

最近 N 小时更新：

```text
h=24
```

表示查询最近 24 小时的数据。

该参数特别适合增量同步。

---

# 6. List API 请求示例

## 6.1 获取第一页

```http
GET https://api.zuidapi.com/api.php/provide/vod/?ac=list
```

---

## 6.2 搜索

```http
GET https://api.zuidapi.com/api.php/provide/vod/?ac=list&wd=三体
```

---

## 6.3 搜索 + 分页

```http
GET https://api.zuidapi.com/api.php/provide/vod/?ac=list&wd=三体&pg=2
```

---

## 6.4 分类

```http
GET https://api.zuidapi.com/api.php/provide/vod/?ac=list&t=1
```

---

## 6.5 分类 + 分页

```http
GET https://api.zuidapi.com/api.php/provide/vod/?ac=list&t=1&pg=5
```

官方 CMS API 文档也使用该形式作为示例。

---

## 6.6 增量同步

```http
GET https://api.zuidapi.com/api.php/provide/vod/?ac=list&h=24
```

---

# 7. List API Response

成功返回：

```json
{
  "code": 1,
  "msg": "数据列表",
  "page": 1,
  "pagecount": 1,
  "limit": "20",
  "total": 15,
  "list": [
    {
      "vod_id": 21,
      "vod_name": "测试影片",
      "type_id": 6,
      "type_name": "动作片",
      "vod_en": "qingjian",
      "vod_time": "2018-03-29 20:50:19",
      "vod_remarks": "超清",
      "vod_play_from": "youku",
      "vod_pic": "https://example.com/poster.jpg",
      "vod_area": "大陆",
      "vod_lang": "国语",
      "vod_year": "2018",
      "vod_serial": "0",
      "vod_actor": "演员",
      "vod_director": "导演",
      "vod_content": "影片简介",
      "vod_play_url": "正片$https://example.com/video.m3u8"
    }
  ]
}
```

该字段结构来自 MacCMS 官方 Provide API 文档；最大资源网使用的是这一套接口规范。

---

# 8. List Response Schema

```yaml
ListResponse:
  type: object
  properties:

    code:
      type: integer
      description: 状态码
      example: 1

    msg:
      type: string
      description: 消息
      example: 数据列表

    page:
      type: integer
      description: 当前页

    pagecount:
      type: integer
      description: 总页数

    limit:
      type: string
      description: 每页记录数
      example: "20"

    total:
      type: integer
      description: 总记录数

    list:
      type: array
      items:
        $ref: '#/components/schemas/Vod'
```

---

# 9. Vod Schema

```yaml
Vod:
  type: object

  properties:

    vod_id:
      type: integer
      description: 视频 ID

    vod_name:
      type: string
      description: 视频名称

    type_id:
      type: integer
      description: 分类 ID

    type_name:
      type: string
      description: 分类名称

    vod_en:
      type: string
      description: 英文名 / 拼音

    vod_time:
      type: string
      format: date-time
      description: 更新时间

    vod_remarks:
      type: string
      description: 备注
      example: 更新至12集

    vod_pic:
      type: string
      format: uri
      description: 海报地址

    vod_area:
      type: string
      description: 地区

    vod_lang:
      type: string
      description: 语言

    vod_year:
      type: string
      description: 年份

    vod_serial:
      type: string
      description: 连载状态

    vod_actor:
      type: string
      description: 演员

    vod_director:
      type: string
      description: 导演

    vod_content:
      type: string
      description: 剧情简介

    vod_play_from:
      type: string
      description: 播放来源

    vod_play_url:
      type: string
      description: 播放地址
```

---

# 10. List 与 Detail 的字段差异

实际开发建议注意：

### List

列表接口可能只返回部分字段，例如：

```text
vod_id
vod_name
type_id
type_name
vod_en
vod_time
vod_remarks
vod_play_from
```

### Detail

详情接口会提供更多字段：

```text
vod_pic
vod_area
vod_lang
vod_year
vod_serial
vod_actor
vod_director
vod_content
vod_play_url
```

MacCMS 官方示例也明确区分了列表数据和内容数据。

因此：

> **搜索列表不要依赖 `vod_play_url` 一定存在。**

用户点击影片后，再调用 Detail 获取完整播放信息。

---

# 11. GET /api.php/provide/vod/?ac=detail

## 视频详情

用于根据视频 ID 获取完整信息。

---

## 11.1 Request

```http
GET /api.php/provide/vod/?ac=detail&ids=123
```

---

## 11.2 Query Parameters

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `ac` | string | 是 | 固定 `detail` |
| `ids` | string | 否 | 视频 ID，多个用 `,` 分隔 |
| `t` | integer | 否 | 分类 ID |
| `pg` | integer | 否 | 页码 |
| `h` | integer | 否 | 最近 N 小时更新 |

官方文档明确说明 `ids` 支持多个 ID，并使用逗号分隔。

---

# 12. Detail 请求示例

## 单个 ID

```http
GET /api.php/provide/vod/?ac=detail&ids=123
```

## 多个 ID

```http
GET /api.php/provide/vod/?ac=detail&ids=123,456,789
```

等价：

```text
ids=123,456,789
```

---

## 最近更新详情

```http
GET /api.php/provide/vod/?ac=detail&h=24
```

官方文档明确给出了这个用法。

---

# 13. Detail Response

```json
{
  "code": 1,
  "msg": "数据列表",
  "page": 1,
  "pagecount": 1,
  "limit": "20",
  "total": 1,
  "list": [
    {
      "vod_id": 123,
      "vod_name": "三体",
      "type_id": 1,
      "type_name": "科幻片",
      "vod_en": "santi",
      "vod_time": "2026-09-15 10:00:00",
      "vod_remarks": "更新至12集",
      "vod_pic": "https://example.com/poster.jpg",
      "vod_area": "大陆",
      "vod_lang": "国语",
      "vod_year": "2026",
      "vod_serial": "1",
      "vod_actor": "演员A,演员B",
      "vod_director": "导演A",
      "vod_content": "剧情简介",
      "vod_play_from": "zuidam3u8",
      "vod_play_url": "第1集$https://example.com/1.m3u8#第2集$https://example.com/2.m3u8"
    }
  ]
}
```

---

# 14. M3U8 JSON API

## Endpoint

```text
GET /api.php/provide/vod/from/zuidam3u8/
```

完整地址：

```text
https://api.zuidapi.com/api.php/provide/vod/from/zuidam3u8/
```

最大资源网官方苹果 CMS V10 教程明确将此接口定义为：

```text
最大m3u8 json接口
```

并指定：

```text
接口类型：json
资源类型：视频
```



---

# 15. M3U8 XML API

## Endpoint

```text
GET /api.php/provide/vod/from/zuidam3u8/at/xml/
```

完整：

```text
https://api.zuidapi.com/api.php/provide/vod/from/zuidam3u8/at/xml/
```

这是最大资源网官方提供的 M3U8 XML 采集接口。

---

# 16. Download XML API

## Endpoint

```text
GET /api.php/provide/vod/from/http/at/xml/
```

完整：

```text
https://api.zuidapi.com/api.php/provide/vod/from/http/at/xml/
```

用于下载资源。

最大资源网官方说明该接口需要：

```text
ct=1
```

作为附加参数。

因此：

```text
https://api.zuidapi.com/api.php/provide/vod/from/http/at/xml/?ct=1
```

---

# 17. XML 输出

苹果 CMS Provide API 支持 XML 格式。

标准接口：

```text
/api.php/provide/vod/at/xml/?ac=list
```

或者使用：

```text
&at=xml
```

官方 MacCMS 文档明确说明视频接口支持 XML，并给出了列表、详情 XML 格式。

---

# 18. XML Response

典型结构：

```xml
<?xml version="1.0" encoding="utf-8"?>

<rss version="5.0">

  <list
    page="1"
    pagecount="23"
    pagesize="20"
    recordcount="449">

    <video>

      <last>
        2012-05-06 13:32:28
      </last>

      <id>493</id>

      <tid>9</tid>

      <name><![CDATA[测试]]></name>

      <type>子类1</type>

      <dt>dplayer</dt>

      <note><![CDATA[]]></note>

      <vlink>
        <![CDATA[http://example.com/vod/493]]
      </vlink>

      <plink>
        <![CDATA[http://example.com/vodplay/493-1-1]]
      </plink>

    </video>

  </list>

</rss>
```

---

# 19. `vod_play_from` 解析

这是开发时最容易出错的字段之一。

例如：

```text
vod_play_from
=
zuidam3u8
```

表示：

```text
播放来源 = zuidam3u8
```

最大资源网官方帮助页明确要求播放器标识使用：

```text
zuidam3u8
```

例如海洋 CMS 中：

```text
来源名称：最大m3u8
后缀：zuidam3u8
```



---

# 20. 多播放源

`vod_play_from` 可能包含多个播放源：

```text
zuidam3u8$$$http
```

逻辑：

```text
$$$
```

表示：

> 播放源之间的分隔符。

例如：

```text
zuidam3u8$$$youku$$$qiyi
```

表示：

```text
播放源1 = zuidam3u8
播放源2 = youku
播放源3 = qiyi
```

---

# 21. `vod_play_url` 解析

这是核心。

典型：

```text
第1集$https://example.com/1.m3u8#第2集$https://example.com/2.m3u8
```

需要分三层处理。

---

## 第一层：播放源

使用：

```text
$$$
```

分割。

---

## 第二层：剧集

使用：

```text
#
```

分割。

---

## 第三层：名称与 URL

使用：

```text
$
```

分割。

---

# 22. 完整解析算法

假设：

```text
vod_play_from =
zuidam3u8$$$http
```

同时：

```text
vod_play_url =
第1集$url1#第2集$url2$$$下载$url3
```

第一步：

```text
split("$$$")
```

得到：

```text
play_sources = [
    "zuidam3u8",
    "http"
]
```

同时：

```text
play_urls = [
    "第1集$url1#第2集$url2",
    "下载$url3"
]
```

然后：

```text
zuidam3u8
    ↓
第1集$url1
第2集$url2

http
    ↓
下载$url3
```

---

# 23. 推荐的数据结构

不要直接把：

```text
vod_play_from
vod_play_url
```

交给前端。

后端解析成：

```json
{
  "play_sources": [
    {
      "name": "zuidam3u8",
      "episodes": [
        {
          "name": "第1集",
          "url": "https://example.com/1.m3u8"
        },
        {
          "name": "第2集",
          "url": "https://example.com/2.m3u8"
        }
      ]
    }
  ]
}
```

---

# 24. 推荐 TypeScript Schema

```typescript
interface PlayEpisode {
  name: string;
  url: string;
}

interface PlaySource {
  name: string;
  episodes: PlayEpisode[];
}

interface Vod {
  vod_id: number;
  vod_name: string;
  type_id?: number;
  type_name?: string;
  vod_en?: string;
  vod_time?: string;
  vod_remarks?: string;
  vod_pic?: string;
  vod_area?: string;
  vod_lang?: string;
  vod_year?: string;
  vod_serial?: string;
  vod_actor?: string;
  vod_director?: string;
  vod_content?: string;
  vod_play_from?: string;
  vod_play_url?: string;

  play_sources?: PlaySource[];
}
```

---

# 25. TypeScript 播放地址解析

```typescript
function parsePlaySources(
  playFrom: string = "",
  playUrl: string = ""
) {
  const sources = playFrom
    .split("$$$")
    .map(s => s.trim());

  const groups = playUrl
    .split("$$$")
    .map(s => s.trim());

  return sources.map((source, index) => {
    const group = groups[index] || "";

    const episodes = group
      .split("#")
      .filter(Boolean)
      .map(item => {
        const separatorIndex = item.indexOf("$");

        if (separatorIndex === -1) {
          return {
            name: item.trim(),
            url: ""
          };
        }

        return {
          name: item.slice(0, separatorIndex).trim(),
          url: item.slice(separatorIndex + 1).trim()
        };
      });

    return {
      name: source,
      episodes
    };
  });
}
```

这里特意使用：

```typescript
indexOf("$")
```

而不是简单：

```typescript
split("$")
```

原因是 URL 本身或者某些资源字段可能出现额外 `$`，应该只把第一个 `$` 当作“名称 / 地址”分隔符。

---

# 26. Python 播放地址解析

```python
def parse_play_sources(play_from="", play_url=""):
    sources = [
        x.strip()
        for x in play_from.split("$$$")
        if x.strip()
    ]

    groups = [
        x.strip()
        for x in play_url.split("$$$")
    ]

    result = []

    for index, source in enumerate(sources):
        group = groups[index] if index < len(groups) else ""

        episodes = []

        for item in group.split("#"):
            item = item.strip()

            if not item:
                continue

            if "$" in item:
                name, url = item.split("$", 1)

                episodes.append({
                    "name": name.strip(),
                    "url": url.strip()
                })
            else:
                episodes.append({
                    "name": item,
                    "url": ""
                })

        result.append({
            "name": source,
            "episodes": episodes
        })

    return result
```

---

# 27. 非法 / 不完整播放数据处理

必须考虑：

```text
vod_play_from = ""
```

或者：

```text
vod_play_url = ""
```

或者：

```text
vod_play_from = zuidam3u8
vod_play_url = ""
```

建议返回：

```json
{
  "play_sources": []
}
```

而不是直接抛异常。

---

# 28. 播放源与 URL 数量不一致

例如：

```text
vod_play_from =
zuidam3u8$$$http$$$youku
```

但：

```text
vod_play_url =
第1集$url1$$$下载$url2
```

只有两个 URL Group。

处理方式：

```text
zuidam3u8 → 第1集$url1
http      → 下载$url2
youku     → []
```

不要因为数量不一致导致整个影片解析失败。

---

# 29. 错误处理

API 本身属于传统 CMS API，不一定严格遵循 HTTP REST API 的错误规范。

因此客户端需要同时检查：

```text
HTTP Status
+
JSON code
+
list
```

---

## HTTP 200

HTTP 200：

```text
不代表业务一定成功。
```

例如：

```json
{
  "code": 0,
  "msg": "暂无数据"
}
```

仍然应该视为业务失败/无数据。

---

# 30. 推荐错误判断

```typescript
if (!response.ok) {
  throw new Error(
    `HTTP error: ${response.status}`
  );
}

const data = await response.json();

if (data.code !== 1) {
  throw new Error(
    data.msg || "API request failed"
  );
}
```

---

# 31. 常见错误分类

建议自己的 API 层统一成：

| 类型 | HTTP | 内部错误码 |
|---|---:|---|
| API 请求成功 | 200 | 0 |
| 无搜索结果 | 200 | 1001 |
| 参数错误 | 400 | 1002 |
| 上游 API 不可用 | 502 | 1003 |
| 上游超时 | 504 | 1004 |
| JSON 解析失败 | 502 | 1005 |
| 播放地址为空 | 200 | 1006 |

---

# 32. 上游 API 超时

建议：

```text
Connect Timeout:
5 秒

Read Timeout:
15 秒

Total Timeout:
20 秒
```

不要让用户请求一直阻塞。

---

# 33. Retry

对于：

```text
502
503
504
timeout
connection reset
```

可以重试：

```text
第一次：立即
第二次：500ms
第三次：1500ms
```

不要无限重试。

---

# 34. 搜索接口推荐实现

你的业务 API 可以设计成：

```http
GET /api/search?keyword=三体&page=1
```

然后内部转换：

```text
keyword
   ↓
wd
```

请求：

```http
GET https://api.zuidapi.com/api.php/provide/vod/?ac=list&wd=三体&pg=1
```

---

# 35. 详情接口推荐实现

自己的接口：

```http
GET /api/videos/123
```

内部：

```http
GET https://api.zuidapi.com/api.php/provide/vod/?ac=detail&ids=123
```

---

# 36. 增量同步接口

推荐：

```http
GET /api/sync/latest?hours=24
```

内部：

```http
GET https://api.zuidapi.com/api.php/provide/vod/?ac=list&h=24
```

或者：

```http
GET https://api.zuidapi.com/api.php/provide/vod/?ac=detail&h=24
```

如果需要完整影片详情，优先使用：

```text
ac=detail&h=24
```

因为详情数据包含播放地址等完整字段。

---

# 37. 增量同步推荐流程

```text
┌────────────────────┐
│ 定时任务            │
└─────────┬──────────┘
          ↓
       h=24
          ↓
┌────────────────────┐
│ zuidapi             │
└─────────┬──────────┘
          ↓
      vod_id
          ↓
┌────────────────────┐
│ 查询本地数据库       │
└───────┬───────┬────┘
        │       │
       新数据   已存在
        │       │
       INSERT  UPDATE
        │       │
        └───┬───┘
            ↓
        更新完成
```

---

# 38. 数据库唯一键

推荐：

```text
vod_id
```

作为上游数据的唯一标识。

例如：

```sql
UNIQUE KEY uk_vod_id (vod_id)
```

不要使用：

```text
vod_name
```

作为唯一键。

因为同名影片可能存在。

---

# 39. 搜索缓存

建议缓存：

```text
keyword + page
```

例如：

```text
search:三体:1
search:三体:2
```

TTL：

```text
60 ~ 300 秒
```

这样可以显著降低重复搜索压力。

---

# 40. 详情缓存

详情缓存可以更久：

```text
TTL = 10 ~ 60 分钟
```

如果是热门影视，可以更长。

---

# 41. 图片缓存

最大资源网官方特别提醒图片后期可能使用图床，并建议采集时同步到本地。

建议：

```text
vod_pic
   ↓
下载
   ↓
对象存储 / CDN
   ↓
自己的图片 URL
```

数据库保存：

```text
original_pic
local_pic
```

---

# 42. 播放地址不要过度缓存

播放地址可能发生变化。

建议：

```text
影片信息：
长缓存

播放 URL：
短缓存
```

例如：

```text
影片：
1小时

播放地址：
5~15分钟
```

或者播放时实时获取详情。

---

# 43. OpenAPI 3.0 示例

下面这个可以直接作为 Swagger/OpenAPI 的基础：

```yaml
openapi: 3.0.3

info:
  title: zuidapi Video API
  version: 1.0.0
  description: 最大资源网 Apple CMS / MacCMS 视频 API

servers:
  - url: https://api.zuidapi.com

paths:

  /api.php/provide/vod/:

    get:
      summary: 视频列表 / 详情
      parameters:

        - name: ac
          in: query
          required: true
          schema:
            type: string
            enum:
              - list
              - detail

        - name: t
          in: query
          schema:
            type: integer

        - name: pg
          in: query
          schema:
            type: integer
            minimum: 1

        - name: wd
          in: query
          schema:
            type: string

        - name: h
          in: query
          schema:
            type: integer
            minimum: 1

        - name: ids
          in: query
          schema:
            type: string
          description: 多个 ID 使用逗号分隔

      responses:

        "200":
          description: API response
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/VodResponse"

components:

  schemas:

    VodResponse:
      type: object
      properties:

        code:
          type: integer

        msg:
          type: string

        page:
          type: integer

        pagecount:
          type: integer

        limit:
          type: string

        total:
          type: integer

        list:
          type: array
          items:
            $ref: "#/components/schemas/Vod"

    Vod:
      type: object
      properties:

        vod_id:
          type: integer

        vod_name:
          type: string

        type_id:
          type: integer

        type_name:
          type: string

        vod_en:
          type: string

        vod_time:
          type: string

        vod_remarks:
          type: string

        vod_pic:
          type: string

        vod_area:
          type: string

        vod_lang:
          type: string

        vod_year:
          type: string

        vod_serial:
          type: string

        vod_actor:
          type: string

        vod_director:
          type: string

        vod_content:
          type: string

        vod_play_from:
          type: string

        vod_play_url:
          type: string
```

---

# 44. 实际开发时的推荐接口层

如果你不是直接给 CMS 用，而是在开发自己的 App / Web：

```text
                    ┌──────────────┐
                    │   Frontend   │
                    └──────┬───────┘
                           │
                           ↓
                    ┌──────────────┐
                    │  Your API    │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ↓            ↓            ↓
           Search        Detail       Sync
              │            │            │
              ↓            ↓            ↓
             wd           ids           h
              │            │            │
              └────────────┼────────────┘
                           ↓
                    ┌──────────────┐
                    │  zuidapi     │
                    └──────────────┘
```

---

# 45. 推荐自己的 API Schema

### Search

```http
GET /api/search
```

参数：

```text
keyword
page
category
```

---

### Detail

```http
GET /api/videos/{id}
```

---

### Latest

```http
GET /api/videos/latest
```

参数：

```text
hours
```

---

### Category

```http
GET /api/categories/{id}/videos
```

---

# 46. 推荐自己的统一返回格式

不要直接透传上游 API。

建议：

```json
{
  "success": true,
  "data": {
    "page": 1,
    "page_size": 20,
    "total": 100,
    "items": []
  },
  "error": null
}
```

失败：

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "UPSTREAM_TIMEOUT",
    "message": "视频资源服务请求超时"
  }
}
```

---

# 47. 开发注意事项

## 47.1 不要假定 `limit` 是请求参数

API 返回：

```json
"limit": "20"
```

但官方 Provide API 文档把它作为**响应字段**，不是列表请求参数。

因此不要默认：

```text
?limit=100
```

一定有效。

---

## 47.2 不要假定所有列表结果都有播放 URL

列表结果可能是精简数据。

详情接口才是获取完整播放数据的主要接口。

---

## 47.3 `vod_play_from` 和 `vod_play_url` 必须配对

正确：

```text
zuidam3u8
```

对应：

```text
第1集$url1#第2集$url2
```

多个来源：

```text
zuidam3u8$$$http
```

对应：

```text
第1集$url1#第2集$url2$$$下载$url3
```

---

## 47.4 不要用固定 `$` 数量解析

推荐：

```python
item.split("$", 1)
```

而不是：

```python
item.split("$")
```

---

## 47.5 不要用 `#` 解析 URL 本身

正常情况下播放地址中不应该将 `#` 作为 URL 内容使用。

因此当前 CMS 规范使用：

```text
#
```

作为剧集分隔符。

---

# 48. 最终接口速查

```text
# 搜索
GET /api.php/provide/vod/?ac=list&wd=关键词

# 分类
GET /api.php/provide/vod/?ac=list&t=分类ID

# 分页
GET /api.php/provide/vod/?ac=list&pg=2

# 增量
GET /api.php/provide/vod/?ac=list&h=24

# 搜索 + 分页
GET /api.php/provide/vod/?ac=list&wd=关键词&pg=2

# 详情
GET /api.php/provide/vod/?ac=detail&ids=123

# 多个详情
GET /api.php/provide/vod/?ac=detail&ids=123,456,789

# 最近更新详情
GET /api.php/provide/vod/?ac=detail&h=24

# M3U8 JSON
GET /api.php/provide/vod/from/zuidam3u8/

# M3U8 XML
GET /api.php/provide/vod/from/zuidam3u8/at/xml/

# 下载 XML
GET /api.php/provide/vod/from/http/at/xml/?ct=1
```

---

# 49. 官方资料依据

最大资源网官方帮助页确认：

- APP JSON 列表接口
- APP JSON 详情接口
- M3U8 XML
- M3U8 JSON
- HTTP 下载 XML
- `ct=1` 下载参数
- `zuidam3u8` 播放源
- 苹果 CMS V10 配置方式



MacCMS 官方 API 文档确认：

- `ac=list`
- `ac=detail`
- `t`
- `pg`
- `wd`
- `h`
- `ids`
- JSON 返回结构
- XML 返回结构
- 多 ID 查询方式



---

# 50. 实现优先级

如果开发一个自己的影视搜索系统，推荐按照以下顺序实现：

```text
P0
├── GET /vod/?ac=list
├── wd 搜索
├── pg 分页
└── ac=detail&ids=

P1
├── t 分类
├── h 增量同步
└── vod_play_from / vod_play_url 解析

P2
├── Redis 搜索缓存
├── 详情缓存
├── 图片缓存
└── 定时增量同步

P3
├── 多资源站
├── 资源去重
├── 播放源故障切换
└── 统一资源模型
```

**最核心的实现只有四个：**

```text
wd      → 搜索
pg      → 分页
ids     → 详情
h       → 增量同步
```

再加上：

```text
vod_play_from
+
vod_play_url
```

就可以完整处理影视搜索和播放源数据。