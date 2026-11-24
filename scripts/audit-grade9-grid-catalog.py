"""Read-only audit of the school-supplied public Grid catalog.
Never certify a Grid based on a title/link or PDF magic alone. No credentials,
cookies, student records, cloud deploy, or attempts to circumvent access controls.
"""
import argparse
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler
from concurrent.futures import ThreadPoolExecutor

CATALOG = "https://www.khadgakali.edu.np/2025/02/specification-grid.html"
ROWS = set(range(24, 34))
HOSTS = {"www.khadgakali.edu.np", "khadgakali.edu.np", "moecdc.gov.np",
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

def selftest():
    data='<table><tr><td>26</td><td>९</td><td>Science</td><td><a href="https://moecdc.gov.np/test.pdf">Download</a><button onclick="location.href=\'https://giwmscdnone.gov.np/test.pdf\'">View</button><a href="javascript:alert(1)">X</a><a href="https://unknown.invalid/x">X</a></td></tr><tr><td>34</td><td>१०</td><td>Not grade nine</td></tr></table>'
    result=parse(data,CATALOG)
    assert list(result)==[26] and len(result[26]["links"])==2
    assert all(x.startswith("https://") for x in result[26]["links"])
    print("PASS parser grade scope, literal links, and public source allowlist")

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
    out=Path(args.output);out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(report,ensure_ascii=False,indent=2))
    print("No Grid approval is granted by this audit.")
