# daily-brief

每日快报公开只读站：AI / 平板 / 消费电子 / 供应链。

## 数据约定

雷达毛每轮推送 JSON 数组（空轮 `[]`）：

```json
[
  {
    "topic": "ai",
    "title": "标题",
    "blurb": "为什么要紧",
    "url": "https://example.com/story",
    "time": "2026-09-05T09:00:00+08:00"
  }
]
```

`topic`：`ai` | `tablet` | `ce` | `supply`。

## API

- `GET /` 首页
- `GET /api/briefs/YYYY-MM-DD` 当日数组
- `GET /api/briefs/latest` `{ date, count, items }`
- `POST /api/ingest` Bearer `INGEST_TOKEN`；body 为数组或 `{ date, items }`；同 `topic|url|title` 覆盖

## 部署

1. 创建 KV，填 `wrangler.toml` 的 id
2. `npx wrangler secret put INGEST_TOKEN`
3. `npm i && npm run deploy`
