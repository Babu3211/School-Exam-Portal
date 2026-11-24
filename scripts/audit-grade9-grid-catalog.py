"""Read-only audit of the school-supplied public Grid catalog.
Never certify a Grid based on a title/link or PDF magic alone. No credentials,
cookies, student records, cloud deploy, or attempts to circumvent access controls.
"""
import argparse
import hashlib
import subprocess
import tempfile
from html.parser import HTMLParser
import json
from html import unescape
from pathlib import Path
import re
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler
from concurrent.futures import ThreadPoolExecutor

CATALOG = "https://www.khadgakali.edu.np/2025/02/specification-grid.html"
ROWS = set(range(24, 34))
HOSTS = {"sikshakhub.com", "www.sikshakhub.com", "www.khadgakali.edu.np", "khadgakali.edu.np", "moecdc.gov.np",
         "www.moecdc.gov.np", "lib.moecdc.gov.np", "elibrary.moecdc.gov.np",
         "giwmscdnone.gov.np", "giwmscdntwo.gov.np", "giwmscdntthree.gov.np",
         "giwmscdntfour.gov.np", "drive.google.com", "docs.google.com",
         "drive.usercontent.google.com", "cdn.moecdc.gov.np"}
def checked(url):
    p = urlsplit(url)
    if p.scheme != "https" or p.hostname not in HOSTS or p.username or p.password or p.port not in (None,443):
        raise ValueError("Outside the public source allowlist")
    return url

class SafeRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return super().redirect_request(req, fp, code, msg, headers, checked(newurl))

def get(url, cap, prefix=False):
    opener = build_opener(SafeRedirect())
    req = Request(checked(url), headers={"User-Agent":"SMSS public education source audit/1.0","Accept":"*/*"})
    if prefix:
        req.add_header("Range","bytes=0-4095")
    with opener.open(req, timeout=12) as res:
        final = checked(res.geturl())
        data = res.read(cap if prefix else cap+1)
        if not prefix and len(data)>cap:
            raise ValueError("Source response exceeds audit cap")
        return final, res.headers.get("Content-Type",""), data

class TableParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.rows=[]; self.row=None; self.cell=None
    def handle_starttag(self,tag,attrs):
        if tag=="tr":
            self.row={"cells":[],"candidates":[]}; self.cell=None
        if self.row is None:
            return
        if tag in ("td","th"):
            self.cell=[]; self.row["cells"].append(self.cell)
        for name,value in attrs:
            if not value:
                continue
            if name in ("href","data-href","data-url","data-link","data-download","src"):
                self.row["candidates"].append(value)
            elif name=="onclick":
                # Read only literal public URLs; never execute website JavaScript.
                self.row["candidates"].extend(re.findall(r"https://[^\s'\"<>]+",value))
    def handle_data(self,data):
        if self.cell is not None: self.cell.append(data)
    def handle_endtag(self,tag):
        if tag in ("td","th"): self.cell=None
        if tag=="tr" and self.row is not None:
            self.rows.append(self.row); self.row=None; self.cell=None

def parse(html,base):
    p=TableParser();p.feed(html)
    rows={}
    for row in p.rows:
        cells=[" ".join("".join(c).split()) for c in row["cells"]]
        if len(cells)<3 or not cells[0].isdigit(): continue
        n=int(cells[0])
        if n not in ROWS or not ("९" in cells[1] or "9" in cells[1]): continue
        if n in rows: raise ValueError("Ambiguous duplicate catalog row "+str(n))
        urls=[]
        for link in row["candidates"]:
            if not link.startswith(("https://","/")) or link.startswith("//"): continue
            u=urljoin(base,link)
            if u==base or u in urls: continue
            try: checked(u)
            except ValueError: continue
            urls.append(u)
        rows[n]={"row":n,"grade":cells[1],"title":cells[2],"links":urls[:6],
                 "status":"catalog_links_only_not_verified"}
    return rows

def probe(url):
    try:
        final,ctype,data=get(url,4096,prefix=True)
        status="pdf_header_detected_needs_visual_grid_review" if data.startswith(b"%PDF-") else "not_pdf_response"
        return {"url":url,"finalUrl":final,"contentType":ctype,"status":status}
    except (OSError,ValueError) as err:
        return {"url":url,"status":"unavailable_or_redirect_not_allowed","reason":str(err)[:200]}

# These publication and library links were located in the public CDC catalogue.
# A listing date does not establish the edition of its attached PDF.
OFFICIAL_RECORDS = [
    ("Nepali","https://moecdc.gov.np/content/282/specification-grid--9---10--compulsory-nepali/","11168"),
    ("English","https://moecdc.gov.np/content/280/specification-grid--grade-9--10--compulsory-english/","11169"),
    ("Mathematics","https://moecdc.gov.np/content/281/","11170"),
    ("Science and Technology","https://moecdc.gov.np/content/278/specialization-schedule-class-class-9-science-and/","11167"),
    ("Social Studies","https://www.moecdc.gov.np/content/277/specialization-schedule-social-study--class-9-/","11166"),
]
class AttachmentParser(HTMLParser):
    def __init__(self,base):
        super().__init__(convert_charrefs=True)
        self.base=base; self.links=[]
    def handle_starttag(self,tag,attrs):
        for name,value in attrs:
            if name not in ("href","src","data","data-url","data-src","data-file","data-pdf") or not value:
                continue
            url=urljoin(self.base,value)
            if not urlsplit(url).path.lower().endswith(".pdf"):
                continue
            try: checked(url)
            except ValueError: continue
            if url not in self.links: self.links.append(url)

def official_record(record):
    subject,page,resource=record
    urls=[page,"https://lib.moecdc.gov.np/elibrary/?r="+resource]
    result={"subject":subject,"records":[],"officialGridApproved":False}
    for url in urls:
        entry={"url":url,"status":"record_unavailable"}
        try:
            final,ctype,data=get(url,4*1024*1024)
            entry.update(finalUrl=final,contentType=ctype)
            if data.startswith(b"%PDF-"):
                entry["status"]="pdf_header_detected_needs_visual_grid_review"
            else:
                p=AttachmentParser(final)
                p.feed(data.decode("utf-8",errors="replace"))
                entry["status"]="public_attachment_candidates" if p.links else "record_without_visible_pdf"
                entry["probes"]=[probe(link) for link in p.links[:6]]
        except (OSError,ValueError) as err:
            entry["reason"]=str(err)[:200]
        result["records"].append(entry)
    return result

# Distinct public directory discovered 24 Nov. It claims checked direct
# government PDF URLs. Read literal data only; never execute scripts.
DIRECTORY = "https://sikshakhub.com/specification-grid-directory/"
def directory_pdf_candidates(html):
    decoded = unescape(html).replace(r"\/", "/").replace(r"\u0026", "&")
    candidates = []
    for u in re.findall(r'https://[^\s"\'<>\\]+?\.pdf(?:\?[^\s"\'<>\\]*)?', decoded, re.I):
        try: checked(u)
        except ValueError: continue
        # Only public government document hosts, no third-party files.
        host = urlsplit(u).hostname
        if not (host.endswith(".gov.np") or host == "moecdc.gov.np"): continue
        if u not in candidates: candidates.append(u)
    return candidates
def audit_directory():
    result = {"url":DIRECTORY,"officialGridApproved":False}
    try:
        final,_,data=get(DIRECTORY,4*1024*1024)
        html=data.decode("utf-8",errors="replace")
        urls=directory_pdf_candidates(html)
        result.update(finalUrl=final,literalGovernmentPdfCount=len(urls),candidates=urls[:250])
        # Candidate list is discovery evidence only. Filename is not proof
        # of scope, year, authenticity or applicable grid.
        result["status"]="literal_pdf_links_need_document_review" if urls else "no_literal_government_pdf_links"
        # Only the exact five observed Grade 9 compulsory resource IDs.
        target=[url for url in urls if re.search(r"/RS111(?:66|67|68|69|70)_",url)]
        with ThreadPoolExecutor(max_workers=5) as pool:
            result["grade9CompulsoryProbes"]=list(pool.map(probe,target))
    except (OSError,ValueError) as err:
        result.update(status="directory_unavailable",reason=str(err)[:200])
    return result

def read_compulsory_pdf(url, output_dir):
    match=re.search(r"/RS(111(?:66|67|68|69|70))_",url)
    if not match: raise ValueError("Unexpected resource ID")
    resource=match.group(1)
    entry={"resource":resource,"url":url,"officialGridApproved":False}
    try:
        final,ctype,data=get(url,32*1024*1024)
        if not data.startswith(b"%PDF-") or b"%%EOF" not in data[-4096:]:
            raise ValueError("Incomplete or non-PDF document")
        with tempfile.TemporaryDirectory() as tmp:
            pdf=Path(tmp)/"source.pdf";pdf.write_bytes(data)
            info=subprocess.run(["pdfinfo",str(pdf)],check=True,capture_output=True,text=True,timeout=20).stdout
            pages=int(re.search(r"(?m)^Pages:\s+(\d+)",info).group(1))
            if not 1<=pages<=150: raise ValueError("Unexpected PDF page count")
            text=subprocess.run(["pdftotext","-f","1","-l",str(min(pages,4)),"-layout",str(pdf),"-"],check=True,capture_output=True,text=True,timeout=30).stdout
            # Keep page layout for offline inspection, never treat extraction as
            # a confirmed transcription. Log only compact numeric table rows.
            output_dir.mkdir(parents=True,exist_ok=True)
            (output_dir/(resource+"-first-pages.txt")).write_text(text,encoding="utf-8")
            grid_rows=[]
            for i,page in enumerate(text.split("\f"),1):
                for line in page.splitlines():
                    if len(re.findall(r"\d+",line))>=4 and len(line.strip())<=240:
                        grid_rows.append({"page":i,"row":line.rstrip()})
            entry.update(finalUrl=final,contentType=ctype,byteCount=len(data),sha256=hashlib.sha256(data).hexdigest(),pages=pages,numericRows=grid_rows[:45],textLength=len(text),status="full_pdf_read_needs_grid_review")
    except (OSError,ValueError,AttributeError,subprocess.SubprocessError) as err:
        entry.update(status="full_pdf_read_failed",reason=str(err)[:200])
    return entry

def selftest():
    data='<table><tr><td>26</td><td>९</td><td>Science</td><td><a href="https://moecdc.gov.np/test.pdf">Download</a><button onclick="location.href=\'https://giwmscdnone.gov.np/test.pdf\'">View</button><a href="javascript:alert(1)">X</a><a href="https://unknown.invalid/x">X</a></td></tr><tr><td>34</td><td>१०</td><td>Not grade nine</td></tr></table>'
    result=parse(data,CATALOG)
    assert list(result)==[26] and len(result[26]["links"])==2
    assert all(x.startswith("https://") for x in result[26]["links"])
    parser=AttachmentParser("https://moecdc.gov.np/content/278/")
    parser.feed('<iframe src="https://giwmscdnone.gov.np/media/a.pdf"></iframe><a href="/storage/b.pdf">File</a><a href="https://unknown.invalid/c.pdf">Untrusted</a>')
    assert parser.links==["https://giwmscdnone.gov.np/media/a.pdf","https://moecdc.gov.np/storage/b.pdf"]
    assert directory_pdf_candidates(r'["https:\/\/giwmscdnone.gov.np\/media\/grid.pdf","https://unknown.invalid/x.pdf","https://moecdc.gov.np/storage/g.pdf"]')==["https://giwmscdnone.gov.np/media/grid.pdf","https://moecdc.gov.np/storage/g.pdf"]
    print("PASS parser grade scope, public source allowlist, official attachment and literal directory URL extraction")

if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--output",required=True)
    args=ap.parse_args(); selftest()
    report={"catalog":CATALOG,"officialGridApproved":False,"rows":[]}
    try:
        final,_,data=get(CATALOG,4*1024*1024)
        rows=parse(data.decode("utf-8",errors="replace"),final)
        urls=sorted({u for row in rows.values() for u in row["links"]})[:40]
        with ThreadPoolExecutor(max_workers=6) as pool:
            checks=dict(zip(urls,pool.map(probe,urls)))
        for n in sorted(ROWS):
            row=rows.get(n,{"row":n,"status":"row_not_found","links":[]})
            row["probes"]=[checks[u] for u in row["links"] if u in checks]
            report["rows"].append(row)
    except (OSError,ValueError) as err:
        report["catalogError"]=str(err)[:300]
    with ThreadPoolExecutor(max_workers=5) as pool:
        report["officialRecords"]=list(pool.map(official_record,OFFICIAL_RECORDS))
    report["alternativeDirectory"]=audit_directory()
    report["pdfHeaderCandidates"]=sum(
        e.get("status")=="pdf_header_detected_needs_visual_grid_review"
        for group in report["officialRecords"]
        for r in group["records"]
        for e in [r,*r.get("probes",[])]
    )+sum(p.get("status")=="pdf_header_detected_needs_visual_grid_review" for row in report["rows"] for p in row.get("probes",[]))
    report["pdfHeaderCandidates"]+=sum(p.get("status")=="pdf_header_detected_needs_visual_grid_review" for p in report["alternativeDirectory"].get("grade9CompulsoryProbes",[]))
    report["result"]="attachment_candidates_require_visual_review" if report["pdfHeaderCandidates"] else ("directory_links_require_document_review" if report["alternativeDirectory"].get("literalGovernmentPdfCount") else "no_pdf_attachment_retrieved")
    out=Path(args.output);out.parent.mkdir(parents=True,exist_ok=True)
    targets=[p["url"] for p in report["alternativeDirectory"].get("grade9CompulsoryProbes",[]) if p["status"]=="pdf_header_detected_needs_visual_grid_review"]
    with ThreadPoolExecutor(max_workers=5) as pool:
        report["fullDocumentReview"]=list(pool.map(lambda url:read_compulsory_pdf(url,out.parent/"extracted"),targets))
    report["fullDocumentsRead"]=sum(r["status"]=="full_pdf_read_needs_grid_review" for r in report["fullDocumentReview"])
    out.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(report,ensure_ascii=False,indent=2))
    print("No Grid approval is granted by this audit.")
