// Chair Library 데이터 변환 규칙 — 브라우저(chair-library.html)와 node(build-data.mjs)가 같은 파일을 쓴다.
// 원본 JSON(product_data_v2.json · image_manifest.json · brand_history.json)을 화면이 쓰는 형태로 바꾼다.
// 예전에는 build_chair_library.py 가 이 결과를 HTML 안에 통째로 박아 넣었다(const DATA = [...] 2MB+).
(function (root) {
  // 이미지 주소의 앞부분. 앱 서버(server.mjs)가 사내 Storage 에서 사진을 꺼내 전달한다.
  const IMAGE_BASE = "img/chair/";
  // 예전 사진 주소(개인 GitHub) — build-data.mjs 가 옛 HTML 과 비교 검증할 때만 쓴다.
  const LEGACY_IMAGE_BASE = "https://raw.githubusercontent.com/jaeyoungkim-jay/chair-market-watch-images/main/";

  function yearBucketInfo(year) {
    if (!year) return null;
    // build_chair_library.py 의 int(str(year).lstrip("~").strip()[:4]) 와 같게 — 숫자가 아니면 null
    const head = String(year).replace(/^~+/, "").trim().slice(0, 4);
    if (!/^\s*[+-]?\d+\s*$/.test(head)) return null;
    const y = parseInt(head, 10);
    if (y >= 2010) return { key: String(y), label: String(y), sort: y };
    if (y >= 2000) {
      const start = Math.floor(y / 5) * 5;
      return { key: `${start}-${start + 4}`, label: `${start}–${start + 4}`, sort: start };
    }
    const start = Math.floor(y / 10) * 10;
    return { key: `${start}s`, label: `${start}s`, sort: start };
  }

  function slugify(text) {
    const s = text.trim().toLowerCase().replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return s || "x";
  }

  function buildLibrary(products, manifest, history, imageBase) {
    const base = imageBase || IMAGE_BASE;
    const img = (id) => (manifest[id] ? base + manifest[id] : "");

    const pidSeen = {};
    const DATA = [];
    for (const b of products.brands) {
      for (const p of b.products) {
        const images = (p.images || []).map(img).filter(Boolean);
        const yb = yearBucketInfo(p.year);
        const pidBase = b.id + "__" + (p.image_id || slugify(p.name));
        const n = pidSeen[pidBase] || 0;
        pidSeen[pidBase] = n + 1;
        DATA.push({
          pid: n === 0 ? pidBase : `${pidBase}-${n}`,
          brand_id: b.id,
          brand: b.name,
          continent: b.continent,
          homepage: b.homepage,
          news_url: b.news_url,
          logo: img(b.logo_id),
          name: p.name,
          desc: p.desc,
          price: p.price,
          year: p.year ?? null,
          year_bucket: yb ? yb.key : "unknown",
          category: p.category ?? null,
          base: p.base ?? null,
          type: p.type ?? null,
          material: p.material ?? null,
          designer: p.designer ?? null,
          url: p.url,
          images,
        });
      }
    }

    const BRANDS = products.brands.map((b) => [b.id, b.name, b.continent]);
    const CATEGORIES = [...new Set(DATA.map((p) => p.category).filter(Boolean))].sort();
    const TYPES = [...new Set(DATA.map((p) => p.type).filter(Boolean))].sort();

    const bucketMap = new Map();
    for (const p of DATA) {
      const yb = yearBucketInfo(p.year);
      const key = yb ? yb.key : "unknown";
      if (!bucketMap.has(key)) bucketMap.set(key, { key, label: yb ? yb.label : "Unknown", sort: yb ? yb.sort : -999999 });
    }
    const sorted = [...bucketMap.values()].sort((a, b) => b.sort - a.sort);
    const YEAR_BUCKETS = sorted.filter((x) => x.key !== "unknown").concat(sorted.filter((x) => x.key === "unknown"));

    const logos = {};
    for (const b of products.brands) logos[b.id] = img(b.logo_id);

    const BRAND_HISTORY = {};
    for (const [bid, info] of Object.entries(history || {})) {
      const copy = Object.assign({}, info);
      if (copy.html) copy.html = copy.html.replace(/\{\{IMG:([a-zA-Z0-9_\-]+)\}\}/g, (_, id) => img(id));
      copy.logo = logos[bid] || "";
      BRAND_HISTORY[bid] = copy;
    }

    const BRAND_MISC = {};
    for (const b of products.brands) BRAND_MISC[b.id] = { logo: logos[b.id] || "", homepage: b.homepage || "", name: b.name };

    return { DATA, BRANDS, CATEGORIES, TYPES, YEAR_BUCKETS, BRAND_HISTORY, BRAND_MISC };
  }

  const api = { IMAGE_BASE, LEGACY_IMAGE_BASE, yearBucketInfo, slugify, buildLibrary };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ChairData = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
