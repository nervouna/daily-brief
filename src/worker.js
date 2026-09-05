const TOPICS = {
  ai: "AI",
  tablet: "平板",
  ce: "消费电子",
  supply: "供应链",
};

const TOPIC_KEYS = Object.keys(TOPICS);

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      ...extra,
    },
  });
}

function todayInTaipei(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function isDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeItems(items) {
  if (!Array.isArray(items)) {
    throw new Error("body must be a JSON array, or { date, items }");
  }
  return items.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`item ${index} must be an object`);
    }
    const { topic, title, blurb, url, time } = item;
    if (!TOPIC_KEYS.includes(topic)) {
      throw new Error(`item ${index}: topic must be one of ${TOPIC_KEYS.join("|")}`);
    }
    for (const key of ["title", "blurb", "url", "time"]) {
      if (typeof item[key] !== "string" || !item[key].trim()) {
        throw new Error(`item ${index}: ${key} required`);
      }
    }
    return {
      topic,
      title: title.trim(),
      blurb: blurb.trim(),
      url: url.trim(),
      time: time.trim(),
    };
  });
}

function itemKey(item) {
  return `${item.topic}|${item.url}|${item.title}`;
}

function mergeItems(existing, incoming) {
  const map = new Map();
  for (const item of existing) map.set(itemKey(item), item);
  for (const item of incoming) map.set(itemKey(item), item);
  return [...map.values()].sort((a, b) => String(b.time).localeCompare(String(a.time)));
}

async function readBrief(env, date) {
  const raw = await env.BRIEFS.get(`brief:${date}`);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeBrief(env, date, items) {
  await env.BRIEFS.put(`brief:${date}`, JSON.stringify(items, null, 2));
  await env.BRIEFS.put("brief:latest", date);
}

function pageHtml() {
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>每日快报</title>
  <style>
    :root { color-scheme: light dark; --bg:#0b0d10; --card:#151a21; --text:#e8eef7; --muted:#9aa7b8; --line:#243041; --accent:#6cb6ff; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); }
    main { max-width: 920px; margin: 0 auto; padding: 28px 18px 64px; }
    header { display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; align-items: end; margin-bottom: 24px; }
    h1 { margin: 0; font-size: 1.6rem; }
    .meta { color: var(--muted); font-size: 0.95rem; }
    input[type=date] { background: var(--card); color: var(--text); border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; }
    section { margin-top: 22px; }
    h2 { margin: 0 0 10px; font-size: 1.1rem; color: var(--accent); }
    .empty { color: var(--muted); padding: 14px; border: 1px dashed var(--line); border-radius: 12px; }
    article { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; }
    article a { color: var(--text); text-decoration: none; font-weight: 600; }
    article a:hover { color: var(--accent); }
    .blurb { margin: 8px 0 0; color: var(--muted); line-height: 1.5; }
    .time { margin-top: 8px; font-size: 0.8rem; color: var(--muted); }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>每日快报</h1>
        <div class="meta">AI · 平板 · 消费电子 · 供应链</div>
      </div>
      <input id="date" type="date" />
    </header>
    <div id="status" class="meta">加载中…</div>
    <div id="board"></div>
  </main>
  <script>
    const TOPICS = { ai: "AI", tablet: "平板", ce: "消费电子", supply: "供应链" };
    const dateInput = document.getElementById("date");
    const statusEl = document.getElementById("status");
    const board = document.getElementById("board");

    async function load(date) {
      statusEl.textContent = "加载中…";
      board.innerHTML = "";
      const res = await fetch("/api/briefs/" + date);
      if (!res.ok) {
        statusEl.textContent = "加载失败 " + res.status;
        return;
      }
      const items = await res.json();
      statusEl.textContent = date + " · " + items.length + " 条";
      for (const [key, label] of Object.entries(TOPICS)) {
        const section = document.createElement("section");
        const h2 = document.createElement("h2");
        h2.textContent = label;
        section.appendChild(h2);
        const subset = items.filter((item) => item.topic === key);
        if (!subset.length) {
          const empty = document.createElement("div");
          empty.className = "empty";
          empty.textContent = "暂无";
          section.appendChild(empty);
        } else {
          for (const item of subset) {
            const article = document.createElement("article");
            const a = document.createElement("a");
            a.href = item.url;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.textContent = item.title;
            const blurb = document.createElement("p");
            blurb.className = "blurb";
            blurb.textContent = item.blurb;
            const time = document.createElement("div");
            time.className = "time";
            time.textContent = item.time;
            article.append(a, blurb, time);
            section.appendChild(article);
          }
        }
        board.appendChild(section);
      }
    }

    async function init() {
      const latest = await fetch("/api/briefs/latest").then((r) => r.json()).catch(() => ({}));
      const date = latest.date || new Date().toISOString().slice(0, 10);
      dateInput.value = date;
      await load(date);
    }

    dateInput.addEventListener("change", () => {
      if (dateInput.value) load(dateInput.value);
    });

    init();
  </script>
</body>
</html>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, POST, OPTIONS",
          "access-control-allow-headers": "content-type, authorization",
        },
      });
    }

    if (request.method === "GET" && (pathname === "/" || pathname === "/index.html")) {
      return new Response(pageHtml(), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (request.method === "GET" && pathname === "/api/briefs/latest") {
      const date = (await env.BRIEFS.get("brief:latest")) || todayInTaipei();
      const items = await readBrief(env, date);
      return json({ date, count: items.length, items });
    }

    if (request.method === "GET" && pathname.startsWith("/api/briefs/")) {
      const date = pathname.slice("/api/briefs/".length);
      if (!isDateKey(date)) return json({ error: "date must be YYYY-MM-DD" }, 400);
      return json(await readBrief(env, date));
    }

    if (request.method === "POST" && pathname === "/api/ingest") {
      const auth = request.headers.get("authorization") || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!env.INGEST_TOKEN || token !== env.INGEST_TOKEN) {
        return json({ error: "unauthorized" }, 401);
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "invalid JSON" }, 400);
      }

      let date;
      let incoming;
      try {
        if (Array.isArray(body)) {
          date = todayInTaipei();
          incoming = normalizeItems(body);
        } else if (body && typeof body === "object") {
          date = body.date || todayInTaipei();
          if (!isDateKey(date)) throw new Error("date must be YYYY-MM-DD");
          incoming = normalizeItems(body.items);
        } else {
          throw new Error("body must be array or { date, items }");
        }
      } catch (error) {
        return json({ error: String(error.message || error) }, 400);
      }

      const existing = await readBrief(env, date);
      const merged = mergeItems(existing, incoming);
      await writeBrief(env, date, merged);
      return json({ ok: true, date, added_or_updated: incoming.length, total: merged.length });
    }

    return json({ error: "not found" }, 404);
  },
};
