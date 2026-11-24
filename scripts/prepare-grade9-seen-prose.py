"""Prepare only two bounded excerpts of Maugham's 1924 public-domain story.
The Grade 9 textbook identifies this story and includes both passages.
No other textbook/editorial material is saved or published. Read-only to
school data; local temporary PDF/text removed on exit. No rights bypasses.
"""
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.parse import urlsplit
import json, re, hashlib, subprocess, tempfile
from pathlib import Path

SOURCES = [
    "https://s3.veda-app.com/veda-app/assets/122/downloads/2025-11-18/QQR9tk79bmn5fO01-1763456573.pdf",
    "https://giwmscdntwo.gov.np/media/pdf_upload/5.%20Reduced-class%209%20English%20final_5hjggyv.pdf",
    "https://learning.cehrd.gov.np/moodle/pluginfile.php/188/mod_resource/content/2/English%20grade%209.pdf",
    "https://moecdc.gov.np/storage/gallery/1688289325.pdf"
]
WINDOWS = [
    ("He had begun life decently enough", "very nice jewellery."),
    ("But when circumstances forced George", "They spent a happy month there."),
]
ALLOWED = {"s3.veda-app.com", "giwmscdntwo.gov.np", "giwmscdnone.gov.np", "learning.cehrd.gov.np", "moecdc.gov.np", "www.moecdc.gov.np"}
CAP = 35 * 1024 * 1024

def checked_url(url):
    u = urlsplit(url)
    if u.scheme != "https" or u.hostname not in ALLOWED or u.username or u.password:
        raise ValueError("Unapproved PDF source or redirect")
    return url

class SafeRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return super().redirect_request(req, fp, code, msg, headers, checked_url(newurl))

def clean(raw):
    raw = raw.replace("\u00ad", "").replace("\u2013", "-").replace("\u2011", "-")
    # Strip running headers and standalone printed page numbers, not prose.
    raw = re.sub(r"(?im)^[ \t]*(?:English[ \t]*9(?:[ \t]+\d{1,3})?|\d{1,3}[ \t]+English[ \t]*9|\d{1,3})[ \t]*$", " ", raw)
    raw = re.sub(r"(?<=\w)-\s*\n\s*(?=\w)", "-", raw)
    return re.sub(r"\s+", " ", raw).strip()

def extract(raw, source):
    text = clean(raw)
    if not re.search(r"The Ant and the\s+Grasshopper", text, re.I) or not re.search(r"Somerset\s+Maugham", text, re.I):
        raise ValueError("Missing expected textbook story/title/author")
    excerpts = []
    for v, (start, end) in enumerate(WINDOWS):
        if text.count(start) != 1:
            raise ValueError("Missing or ambiguous story window "+str(v+1))
        first = text.index(start)
        last = text.index(end, first) + len(end)
        passage = text[first:last]
        words = len(passage.split())
        if not 150 <= words <= 250 or not re.search(r"\bGeorge\b", passage) or not re.search(r"\bTom\b", passage):
            raise ValueError("Unexpected source content or length for window "+str(v+1)+": "+str(words))
        if re.search(r"\bEnglish\s+9\b|\bReading\s+I\b|\bPronunciation\b",passage):
            raise ValueError("Textbook editorial/header contamination")
        required = [("Europe","borrowed","jewellery"),("Cronshaw","Monte Carlo","cheque")][v]
        if not all(x.lower() in passage.lower() for x in required):
            raise ValueError("Missing key evidence for question items")
        excerpts.append({"passage":passage,"wordCount":words,"sha256":hashlib.sha256(passage.encode()).hexdigest(),"sourceUrl":source,"sourcePage":108+v})
    if excerpts[0]["passage"] == excerpts[1]["passage"]:
        raise ValueError("Duplicate excerpt")
    return excerpts

def retrieve(source):
    opener = build_opener(SafeRedirect())
    request = Request(checked_url(source), headers={"User-Agent":"SMSS school reference preparation/1.0","Accept":"application/pdf"})
    with opener.open(request, timeout=25) as response:
        checked_url(response.geturl())
        raw = response.read(CAP+1)
    if len(raw)>CAP or not raw.startswith(b"%PDF-"):
        raise ValueError("Not an expected bounded PDF")
    with tempfile.TemporaryDirectory() as tmp:
        pdf=Path(tmp)/"book.pdf"
        pdf.write_bytes(raw)
        for mode in ("-raw","-layout"):
            pages=["-f","113","-l","115"] if source==SOURCES[0] else []
            result=subprocess.run(["pdftotext",mode,*pages,str(pdf),"-"],check=True,capture_output=True,timeout=25)
            try:
                return extract(result.stdout.decode("utf-8"),source)
            except ValueError as e:
                print("PDF extraction mode",mode,"rejected:",str(e))
        raise ValueError("Neither extraction mode passed source validation")

if __name__ == "__main__":
    for source in SOURCES:
        try:
            excerpts=retrieve(source)
            break
        except (OSError, ValueError, subprocess.SubprocessError) as e:
            print("Source unavailable or rejected:",urlsplit(source).hostname,str(e))
    else:
        raise SystemExit("No verified passage retrieved. The missing seen group remains blocked.")
    body="// Two bounded excerpts of the 1924 original story, with source metadata.\nexport const PUBLIC_DOMAIN_SEEN_PROSE = "+json.dumps(excerpts,ensure_ascii=False,indent=2)+";\n"
    Path("cdc-grade9-english-seen-prose-data.mjs").write_text(body,encoding="utf-8")
    print("Prepared source-checked excerpt lengths:",[e["wordCount"] for e in excerpts])
