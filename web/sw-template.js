"use strict";

const prefix = "medspell:" + new URL(self.registration.scope).pathname + ":";
const cacheName = prefix + "__VERSION__";
const root = self.registration.scope;
const core = __CORE__.map(path => new URL(path, root).href);
const audio = __RECORDINGS__.map(path => new URL(path, root).href);
const permitted = new Set([...core, ...audio]);
const tracks = new Set(audio);
const entry = new URL("index.html", root).href;
let warming;

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll(core.map(url => new Request(url, {cache: "reload"})));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(prefix) && key !== cacheName)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function loadTrack(cache, url) {
  const saved = await cache.match(url);
  if (saved) return saved;
  const response = await fetch(new Request(url, {cache: "reload", mode: "same-origin"}));
  if (response.status === 200 && response.type === "basic") {
    await cache.put(url, response.clone()).catch(() => {});
  }
  return response;
}

async function withRange(response, range) {
  if (!range || response.status !== 200) return response;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (!match[1] && !match[2])) return response;
  const buffer = await response.arrayBuffer();
  const length = buffer.byteLength;
  const start = match[1] ? Number(match[1]) : Math.max(0, length - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(length - 1, Number(match[2])) : length - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= length) {
    return new Response(null, {status: 416, headers: {"Content-Range": "bytes */" + length}});
  }
  return new Response(buffer.slice(start, end + 1), {status: 206, headers: {
    "Accept-Ranges": "bytes", "Content-Type": "audio/mpeg",
    "Content-Length": String(end - start + 1), "Content-Range": `bytes ${start}-${end}/${length}`
  }});
}

self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  const normalized = url.origin + url.pathname;
  if (req.mode === "navigate" && (normalized === root || normalized === entry)) {
    event.respondWith((async () => (await (await caches.open(cacheName)).match(entry)) || fetch(req))());
  } else if (permitted.has(normalized)) {
    event.respondWith((async () => {
      const cache = await caches.open(cacheName);
      if (tracks.has(normalized)) return withRange(await loadTrack(cache, normalized), req.headers.get("Range"));
      return await cache.match(normalized) || fetch(req);
    })());
  }
});

async function warmAll() {
  const cache = await caches.open(cacheName);
  const cached = new Set((await cache.keys()).map(req => req.url));
  const missing = audio.filter(url => !cached.has(url));
  let cursor = 0;
  async function worker() {
    while (cursor < missing.length) {
      const url = missing[cursor++];
      try {
        await loadTrack(cache, url);
      } catch {
        // Retry the remaining clips when connectivity returns.
        break;
      }
    }
  }
  await Promise.all(Array.from({length: Math.min(4, missing.length)}, worker));
  const saved = new Set((await cache.keys()).map(req => req.url));
  return audio.every(url => saved.has(url));
}

self.addEventListener("message", event => {
  if (event.data !== "warm-audio") return;
  event.waitUntil((async () => {
    if (!warming) warming = warmAll().finally(() => { warming = undefined; });
    const complete = await warming.catch(() => false);
    event.source?.postMessage({type: "audio-cache", complete});
  })());
});
