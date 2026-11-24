"""Fetch two bounded, public-domain original literary excerpts.
No CDC textbook pages or editorial exercises are redistributed.
Run only for the noncommercial school reference-bank build; no Firestore writes.
"""
from html.parser import HTMLParser
from urllib.request import Request, urlopen
from urllib.parse import urlsplit, parse_qs
import json, re, hashlib
from pathlib import Path

SOURCE = "https://www.fadedpage.com/link.php?file=20190248.html"
WINDOWS = [
    ("He had begun life decently enough", "very nice jewellery."),
    ("But when circumstances forced George", "They spent a happy month there."),
]

class Plain(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.skip = 0
    def handle_starttag(self, tag, attrs):
        if tag in ("script","style"): self.skip += 1
        if tag in ("p","div","br","h1","h2","h3"): self.parts.append(" ")
    def handle_endtag(self, tag):
        if tag in ("script","style"): self.skip = max(0,self.skip-1)
        if tag in ("p","div","h1","h2","h3"): self.parts.append(" ")
    def handle_data(self, data):
        if not self.skip: self.parts.append(data)

def extract(html):
    p = Plain()
    p.feed(html)
    text = re.sub(r"\s+", " ", "".join(p.parts)).strip()
    if "Somerset Maugham" not in text or "public domain" not in text.lower() or "20190248" not in text:
        raise ValueError("Unexpected source or missing rights notice")
    excerpts = []
    for start, end in WINDOWS:
        if text.count(start) != 1:
            raise ValueError("Missing or ambiguous start")
        first = text.index(start)
        last = text.index(end, first) + len(end)
        passage = text[first:last]
        words = len(passage.split())
        if not 150 <= words <= 250 or not re.search(r"\bGeorge\b", passage) or not re.search(r"\bTom\b", passage):
            raise ValueError("Unexpected source content or length: "+str(words))
        excerpts.append({"passage": passage, "wordCount": words, "sha256": hashlib.sha256(passage.encode()).hexdigest()})
    if excerpts[0]["passage"] == excerpts[1]["passage"]:
        raise ValueError("Duplicate excerpt")
    return excerpts

if __name__ == "__main__":
    request = Request(SOURCE, headers={"User-Agent": "SMSS school reference preparation/1.0"})
    with urlopen(request, timeout=30) as response:
        final = urlsplit(response.geturl())
        same_book = final.path == "/books/20190248/html.php" or (final.path == "/link.php" and parse_qs(final.query).get("file") == ["20190248.html"])
        if final.scheme != "https" or final.hostname not in {"www.fadedpage.com", "fadedpage.com"} or not same_book:
            raise ValueError("Unexpected source location: "+final.hostname+final.path)
        print("Source location:", final.hostname+final.path)
        raw = response.read(2_000_001)
    if len(raw) > 2_000_000:
        raise ValueError("Source exceeds size cap")
    excerpts = extract(raw.decode("utf-8-sig"))
    body = "// Generated from the public-domain original; see scripts/prepare-grade9-seen-prose.py.\nexport const PUBLIC_DOMAIN_SEEN_PROSE = "+json.dumps(excerpts, ensure_ascii=False, indent=2)+";\n"
    Path("cdc-grade9-english-seen-prose-data.mjs").write_text(body, encoding="utf-8")
    print("Prepared two source excerpts:", [e["wordCount"] for e in excerpts])
