"""Build the public website and the self-contained HarmonyOS practice page."""
import base64
from hashlib import sha256
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SITE = ROOT / "docs"
NATIVE = ROOT / "harmonyos/entry/src/main/resources/rawfile/index.html"


def read(name):
    return (ROOT / name).read_text(encoding="utf-8")


def data_uri(media_type, data):
    return f"data:{media_type};base64," + base64.b64encode(data).decode("ascii")


def main():
    bank = json.loads(read("bank.json"))
    recordings = json.loads(read("audio-manifest.json"))["clips"]
    if set(recordings) != {q["id"] for q in bank}:
        raise ValueError("The recording manifest must contain exactly one entry per question.")
    template = read("template.html")
    for marker in ("__BANK__", "__PRACTICE_SCRIPT__", "__MASCOT__", "__AUDIO__"):
        if template.count(marker) != 1:
            raise ValueError(f"Expected exactly one {marker}")
    template = template.replace("__BANK__", json.dumps(bank, ensure_ascii=False))
    template = template.replace("__PRACTICE_SCRIPT__", read("practice.js"))
    urls, embedded = {}, {}
    for question in bank:
        key = question["id"]
        relative = f"audio/{key}.mp3"
        clip = (SITE / relative).read_bytes()
        expected = recordings[key]
        if (question["prompt"].replace("_", question["answers"][0]) != expected["phrase"]
                or sha256(clip).hexdigest() != expected["sha256"]):
            raise ValueError(f"Recording mismatch for {key}")
        urls[key] = relative
        embedded[key] = data_uri("audio/mpeg", clip)

    def render(mascot, tracks):
        return template.replace("__MASCOT__", mascot).replace(
            "__AUDIO__", json.dumps(tracks, separators=(",", ":")))

    native = render(data_uri("image/webp", (SITE / "mascot.webp").read_bytes()), embedded)
    NATIVE.parent.mkdir(parents=True, exist_ok=True)
    NATIVE.write_text(native, encoding="utf-8")
    html = render("mascot.webp", urls)
    title_start = html.index("<title>")
    title_end = html.index("</title>", title_start) + len("</title>")
    head = ('<title>医学拼写</title>\n'
            '  <link rel="icon" type="image/png" href="doctor_icon.png">\n'
            '  <link rel="apple-touch-icon" href="icon-192.png">\n'
            '  <link rel="manifest" href="manifest.webmanifest">\n'
            '  <script src="install.js" defer></script>')
    html = html[:title_start] + head + html[title_end:]
    credit = '<footer class="maker-credit">由DSM制作</footer>'
    if html.count(credit) != 1:
        raise ValueError("Expected the page footer once")
    html = html.replace(credit, read("web/install.html") + "\n    " + credit)
    (SITE / "index.html").write_text(html, encoding="utf-8")
    core = ["index.html", "manifest.webmanifest", "install.js", "mascot.webp",
            "doctor_icon.png", "icon-192.png"]
    worker = read("web/sw-template.js")
    stamp = sha256(worker.encode())
    for path in [*core, *urls.values()]:
        stamp.update(path.encode())
        stamp.update((SITE / path).read_bytes())
    worker = worker.replace("__CORE__", json.dumps(core))
    worker = worker.replace("__RECORDINGS__", json.dumps(list(urls.values())))
    worker = worker.replace("__VERSION__", stamp.hexdigest()[:16])
    (SITE / "sw.js").write_text(worker, encoding="utf-8")


if __name__ == "__main__":
    main()
