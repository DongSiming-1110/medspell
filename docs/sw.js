"use strict";

const prefix = "medspell:" + new URL(self.registration.scope).pathname + ":";
const cacheName = prefix + "73daf6b5cc1d0b67";
const root = self.registration.scope;
const core = ["index.html", "manifest.webmanifest", "install.js", "mascot.webp", "doctor_icon.png", "icon-192.png"].map(path => new URL(path, root).href);
const audio = ["audio/1-1.mp3", "audio/1-2.mp3", "audio/1-3.mp3", "audio/1-4.mp3", "audio/1-5.mp3", "audio/1-6.mp3", "audio/1-7.mp3", "audio/1-8.mp3", "audio/1-9.mp3", "audio/1-10.mp3", "audio/1-11.mp3", "audio/1-12.mp3", "audio/1-13.mp3", "audio/1-14.mp3", "audio/1-15.mp3", "audio/1-16.mp3", "audio/1-17.mp3", "audio/1-18.mp3", "audio/1-19.mp3", "audio/1-20.mp3", "audio/1-21.mp3", "audio/1-22.mp3", "audio/1-23.mp3", "audio/1-24.mp3", "audio/1-25.mp3", "audio/1-26.mp3", "audio/1-27.mp3", "audio/1-28.mp3", "audio/1-29.mp3", "audio/1-30.mp3", "audio/1-31.mp3", "audio/1-32.mp3", "audio/1-33.mp3", "audio/1-34.mp3", "audio/1-35.mp3", "audio/1-36.mp3", "audio/1-37.mp3", "audio/1-38.mp3", "audio/2-1.mp3", "audio/2-2.mp3", "audio/2-3.mp3", "audio/2-4.mp3", "audio/2-5.mp3", "audio/2-6.mp3", "audio/2-7.mp3", "audio/2-8.mp3", "audio/2-9.mp3", "audio/2-10.mp3", "audio/2-11.mp3", "audio/2-12.mp3", "audio/2-13.mp3", "audio/2-14.mp3", "audio/2-15.mp3", "audio/2-16.mp3", "audio/2-17.mp3", "audio/2-18.mp3", "audio/2-19.mp3", "audio/2-20.mp3", "audio/2-21.mp3", "audio/2-22.mp3", "audio/2-23.mp3", "audio/2-24.mp3", "audio/2-25.mp3", "audio/2-26.mp3", "audio/2-27.mp3", "audio/2-28.mp3", "audio/3-1.mp3", "audio/3-2.mp3", "audio/3-3.mp3", "audio/3-4.mp3", "audio/3-5.mp3", "audio/3-6.mp3", "audio/3-7.mp3", "audio/3-8.mp3", "audio/3-9.mp3", "audio/3-10.mp3", "audio/3-11.mp3", "audio/3-12.mp3", "audio/3-13.mp3", "audio/3-14.mp3", "audio/3-15.mp3", "audio/3-16.mp3", "audio/3-17.mp3", "audio/3-18.mp3", "audio/3-19.mp3", "audio/3-20.mp3", "audio/3-21.mp3", "audio/3-22.mp3", "audio/3-23.mp3", "audio/3-24.mp3", "audio/3-25.mp3", "audio/3-26.mp3", "audio/3-27.mp3", "audio/3-28.mp3", "audio/3-29.mp3", "audio/3-30.mp3", "audio/3-31.mp3", "audio/3-32.mp3", "audio/3-33.mp3", "audio/3-34.mp3", "audio/3-35.mp3", "audio/3-36.mp3", "audio/3-37.mp3", "audio/3-38.mp3", "audio/3-39.mp3", "audio/3-40.mp3", "audio/3-41.mp3", "audio/3-42.mp3", "audio/3-43.mp3", "audio/3-44.mp3", "audio/4-1.mp3", "audio/4-2.mp3", "audio/4-3.mp3", "audio/4-4.mp3", "audio/4-5.mp3", "audio/4-6.mp3", "audio/4-7.mp3", "audio/4-8.mp3", "audio/4-9.mp3", "audio/4-10.mp3", "audio/4-11.mp3", "audio/4-12.mp3", "audio/4-13.mp3", "audio/4-14.mp3", "audio/4-15.mp3", "audio/4-16.mp3", "audio/4-17.mp3", "audio/4-18.mp3", "audio/4-19.mp3", "audio/4-20.mp3", "audio/4-21.mp3", "audio/4-22.mp3", "audio/4-23.mp3", "audio/4-24.mp3", "audio/4-25.mp3", "audio/4-26.mp3", "audio/4-27.mp3", "audio/4-28.mp3", "audio/4-29.mp3", "audio/4-30.mp3", "audio/4-31.mp3", "audio/4-32.mp3", "audio/4-33.mp3", "audio/4-34.mp3", "audio/4-35.mp3", "audio/4-36.mp3", "audio/5-1.mp3", "audio/5-2.mp3", "audio/5-3.mp3", "audio/5-4.mp3", "audio/5-5.mp3", "audio/5-6.mp3", "audio/5-7.mp3", "audio/5-8.mp3", "audio/5-9.mp3", "audio/5-10.mp3", "audio/5-11.mp3", "audio/5-12.mp3", "audio/5-13.mp3", "audio/5-14.mp3", "audio/5-15.mp3", "audio/5-16.mp3", "audio/5-17.mp3", "audio/5-18.mp3", "audio/5-19.mp3", "audio/6-1.mp3", "audio/6-2.mp3", "audio/6-3.mp3", "audio/6-4.mp3", "audio/6-5.mp3", "audio/6-6.mp3", "audio/6-7.mp3", "audio/6-8.mp3", "audio/6-9.mp3", "audio/6-10.mp3", "audio/6-11.mp3", "audio/6-12.mp3", "audio/6-13.mp3", "audio/6-14.mp3", "audio/6-15.mp3", "audio/6-16.mp3", "audio/6-17.mp3", "audio/6-18.mp3", "audio/6-19.mp3", "audio/6-20.mp3", "audio/6-21.mp3", "audio/6-22.mp3", "audio/6-23.mp3", "audio/6-24.mp3", "audio/6-25.mp3", "audio/7-1.mp3", "audio/7-2.mp3", "audio/7-3.mp3", "audio/7-4.mp3", "audio/7-5.mp3", "audio/7-6.mp3", "audio/7-7.mp3", "audio/7-8.mp3", "audio/7-9.mp3", "audio/7-10.mp3", "audio/7-11.mp3", "audio/7-12.mp3", "audio/7-13.mp3", "audio/7-14.mp3", "audio/7-15.mp3", "audio/7-16.mp3", "audio/7-17.mp3", "audio/7-18.mp3", "audio/7-19.mp3", "audio/7-20.mp3", "audio/7-21.mp3", "audio/7-22.mp3", "audio/7-23.mp3", "audio/7-24.mp3", "audio/7-25.mp3", "audio/7-26.mp3", "audio/7-27.mp3", "audio/7-28.mp3", "audio/7-29.mp3", "audio/7-30.mp3", "audio/8-1.mp3", "audio/8-2.mp3", "audio/8-3.mp3", "audio/8-4.mp3", "audio/8-5.mp3", "audio/8-6.mp3", "audio/8-7.mp3", "audio/8-8.mp3", "audio/8-9.mp3", "audio/8-10.mp3", "audio/8-11.mp3", "audio/8-12.mp3", "audio/8-13.mp3", "audio/8-14.mp3", "audio/8-15.mp3", "audio/8-16.mp3", "audio/8-17.mp3", "audio/8-18.mp3", "audio/8-19.mp3", "audio/8-20.mp3", "audio/8-21.mp3", "audio/8-22.mp3", "audio/8-23.mp3", "audio/8-24.mp3", "audio/8-25.mp3", "audio/8-26.mp3", "audio/8-27.mp3", "audio/8-28.mp3"].map(path => new URL(path, root).href);
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
