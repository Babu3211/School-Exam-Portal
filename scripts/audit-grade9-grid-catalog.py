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
    ("Office Operation and Accounting","https://moecdc.gov.np/content/276/specialization-table-2081-work-conduct-and-accounting/","11101"),
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
            grid_page_limits={"11168":5,"11169":3,"11170":1,"11167":2,"11166":3}
            last=min(pages,grid_page_limits[resource])
            text=subprocess.run(["pdftotext","-f","1","-l",str(last),"-layout",str(pdf),"-"],check=True,capture_output=True,text=True,timeout=30).stdout
            # Keep page layout for offline inspection, never treat extraction as
            # a confirmed transcription. Log only compact numeric table rows.
            output_dir.mkdir(parents=True,exist_ok=True)
            (output_dir/(resource+"-first-pages.txt")).write_text(text,encoding="utf-8")
            # Retain numeric table cells, including Preeti legacy digit glyphs.
            # Limit to the grid/checklist pages, not model question passages.
            legacy_digits=str.maketrans("!@#$%^&*()","1234567890")
            grid_rows=[]
            for i,page in enumerate(text.split("\f"),1):
                if i>grid_page_limits[resource]: break
                for line in page.splitlines():
                    # Preserve original cell positions and normalize only cells
                    # consisting entirely of numeric glyphs, never ordinary words.
                    cells=re.split(r" {2,}",line.strip())
                    numeric_cells=[]
                    for cell in cells:
                        token=cell.strip()
                        if re.fullmatch(r"[!@#$%^&*()]+",token):
                            numeric_cells.append(token.translate(legacy_digits))
                        elif re.fullmatch(r"\d+",token):
                            numeric_cells.append(token)
                    if len(numeric_cells)>=2:
                        grid_rows.append({"page":i,"row":line.rstrip(),"numericCells":numeric_cells})
            # Original extraction is retained separately for comparison.
            fallback_rows=[]
            for i,page in enumerate(text.split("\f"),1):
                for line in page.splitlines():
                    if len(re.findall(r"\d+",line))>=4 and len(line.strip())<=240:
                        fallback_rows.append({"page":i,"row":line.rstrip()})
            # Language grids use inline expressions and half marks rather than
            # isolated numeric cells. Retain a bounded set of mark-related rows,
            # with page references. This is evidence for review, not approval.
            language_rows=[]
            if resource in ("11168","11169"):
                for i,page in enumerate(text.split("\f"),1):
                    for line in page.splitlines():
                        row=line.strip()
                        if not row or len(row)>300: continue
                        if resource=="11169":
                            has_number=bool(re.search(r"\d",row))
                            relevant=bool(re.search(r"(?i)\b(reading|writing|grammar|marks?|question[s]?|total|weight|passage[s]?|comprehension|text[s]?|item[s]?)\b|\d\s*[x×=]\s*\d",row))
                            if has_number and relevant:
                                language_rows.append({"page":i,"row":row})
                        else:
                            # Preeti digit-only cells and explicit total rows.
                            if re.search(r"(?:^|\s)(?:hDdf|s'n|&%|[!@#$%^&*()]+×[!@#$%^&*()]+)(?:\s|$)",row):
                                language_rows.append({"page":i,"row":row})
                # Rasterize only the language Grid pages into short-lived
                # Actions artifacts, never live hosting or the source tree.
                subprocess.run(["pdftoppm","-f","1","-l",str(last),"-r","150","-png",str(pdf),str(output_dir/(resource+"-grid"))],check=True,capture_output=True,timeout=60)
            entry.update(finalUrl=final,contentType=ctype,byteCount=len(data),sha256=hashlib.sha256(data).hexdigest(),pages=pages,gridPagesExtracted=last,numericRows=grid_rows[:90],fallbackNumericRows=fallback_rows[:12],languageGridRows=language_rows[:50],visualReviewRequired=True,textLength=len(text),status="full_pdf_read_needs_grid_review")
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

def stage_grid_page_images(preview_dir):
    """Render only previously fingerprinted public Grid pages.
    A source failure is explicit and never changes Grid approval.
    """
    from html import escape
    register=json.loads((Path(__file__).resolve().parent.parent/"data/cdc-question-paper-sources-2083.json").read_text(encoding="utf-8"))
    limits={"11168":5,"11169":3,"11170":1,"11167":2,"11166":3,"optional-computer":1,"optional-math":1,"optional-economics":1}
    optional_paths={"optional-computer":"2082-04-29%20Specification%20grid%20and%20Model%20Questions-Computer%20Science%20Grade%209_khtkxrc.pdf","optional-math":"Specification%20Grid%20and%20Model%20Question-G9-Opt.%20Math-web_nrbp00y.pdf","optional-economics":"RS11136_"}
    preview=Path(preview_dir)
    index=preview/"grade9-cdc-grid-library.html"
    if not index.is_file(): raise ValueError("Generate the static Grid Library first")
    folder=preview/"grid-source-pages"; folder.mkdir(exist_ok=True)
    entries=[]
    for source in register["sources"]:
        e=source.get("retrievalEvidence") or source.get("optionalRetrievalEvidence",{})
        resource=e.get("resource")
        if resource not in limits or not re.fullmatch(r"[a-f0-9]{64}",e.get("sha256","")): continue
        result={"resource":resource,"subject":source["subject"],"url":source["url"],"status":"unavailable","images":[],"currentCdcExactApproved":False}
        try:
            path=urlsplit(source["url"]).path
            identity_ok=(path.rsplit("/",1)[-1].startswith(optional_paths[resource]) if resource in optional_paths else bool(re.search(r"/RS"+resource+r"_",path)))
            if urlsplit(source["url"]).hostname!="giwmscdnone.gov.np" or not identity_ok:
                raise ValueError("Unexpected source identity")
            _,_,data=get(source["url"],min(32*1024*1024,e["byteCount"]))
            if len(data)!=e["byteCount"] or hashlib.sha256(data).hexdigest()!=e["sha256"] or not data.startswith(b"%PDF-"):
                raise ValueError("Source differs from recorded PDF fingerprint")
            with tempfile.TemporaryDirectory() as tmp:
                pdf=Path(tmp)/"source.pdf";pdf.write_bytes(data)
                info=subprocess.run(["pdfinfo",str(pdf)],check=True,capture_output=True,text=True,timeout=20).stdout
                pages=int(re.search(r"(?m)^Pages:\s+(\d+)",info).group(1))
                if pages!=e["pages"] or limits[resource]>pages: raise ValueError("PDF page count changed")
                subprocess.run(["pdftoppm","-f","1","-l",str(limits[resource]),"-r","130","-png",str(pdf),str(Path(tmp)/"grid")],check=True,capture_output=True,timeout=60)
                images=sorted(Path(tmp).glob("grid-*.png"))
                if len(images)!=limits[resource]: raise ValueError("Incomplete source page rendering")
                for i,img in enumerate(images,1):
                    content=img.read_bytes()
                    if not content.startswith(b"\x89PNG\r\n\x1a\n") or len(content)>4*1024*1024: raise ValueError("Invalid rendered page")
                    name=resource+"-page-"+str(i)+".png"
                    (folder/name).write_bytes(content)
                    result["images"].append("grid-source-pages/"+name)
            result.update(status="fingerprint_matched_pages_rendered",sha256=e["sha256"])
        except (OSError,ValueError,AttributeError,KeyError,subprocess.SubprocessError) as err:
            for image in result["images"]: (preview/image).unlink(missing_ok=True)
            result["images"]=[]
            result["reason"]=str(err)[:200]
        entries.append(result)
        print("Grid source "+resource+": "+result["status"])
    if len(entries)!=8 or {x["resource"] for x in entries}!=set(limits): raise ValueError("Unexpected fingerprinted source inventory")
    parts=['<section id="original-grid-pages"><h2>Original CDC Grid page images</h2><p>Source page copies for comparison only. Matching a document fingerprint does not certify the current examination Grid. Optional subjects show the first page; full PDF links are retained.</p>']
    for result in entries:
        parts.append('<h3>'+escape(result["subject"])+'</h3>')
        if result["images"]:
            for i,image in enumerate(result["images"],1):
                parts.append('<p><a href="'+escape(image)+'">Open source page '+str(i)+'</a></p>')
        else:
            parts.append('<p>Original page copy unavailable. Use the official source link below.</p>')
        parts.append('<p><a href="'+escape(result["url"],quote=True)+'" rel="noopener noreferrer">Official PDF</a></p>')
    parts.append('</section>')
    html=index.read_text(encoding="utf-8")
    if html.count("</body>")!=1 or 'id="original-grid-pages"' in html: raise ValueError("Unexpected Grid Library HTML")
    index.write_text(html.replace("</body>","".join(parts)+"</body>"),encoding="utf-8")
    (folder/"manifest.json").write_text(json.dumps({"currentCdcExactApproved":False,"documents":entries},ensure_ascii=False,indent=2),encoding="utf-8")

def audit_optional_grid_pdf(source, output_dir):
    """Read registered optional-subject documents for source identification.
    Do not certify subject scope, edition, or numerical cells from a filename.
    """
    subject=source["subject"]; url=source["url"]
    entry={"subject":subject,"url":url,"status":"unavailable","currentCdcExactApproved":False}
    try:
        if urlsplit(url).hostname!="giwmscdnone.gov.np" or not urlsplit(url).path.lower().endswith(".pdf"):
            raise ValueError("Expected registered official government PDF")
        final,ctype,data=get(url,32*1024*1024)
        if not data.startswith(b"%PDF-") or b"%%EOF" not in data[-4096:]:
            raise ValueError("Incomplete PDF")
        with tempfile.TemporaryDirectory() as tmp:
            pdf=Path(tmp)/"source.pdf";pdf.write_bytes(data)
            info=subprocess.run(["pdfinfo",str(pdf)],check=True,capture_output=True,text=True,timeout=20).stdout
            pages=int(re.search(r"(?m)^Pages:\s+(\d+)",info).group(1))
            if not 1<=pages<=150: raise ValueError("Unexpected page count")
            digest=hashlib.sha256(data).hexdigest()
            out=output_dir/digest[:16];out.mkdir(parents=True,exist_ok=True)
            text=subprocess.run(["pdftotext","-f","1","-l",str(min(3,pages)),"-layout",str(pdf),"-"],check=True,capture_output=True,text=True,timeout=30).stdout
            (out/"first-pages.txt").write_text(text,encoding="utf-8")
            subprocess.run(["pdftoppm","-f","1","-l","1","-r","150","-png",str(pdf),str(out/"grid")],check=True,capture_output=True,timeout=60)
            entry.update(finalUrl=final,contentType=ctype,sha256=digest,byteCount=len(data),pages=pages,firstPageRendered=True,status="full_pdf_retrieved_visual_review_required")
            # Preserve compact numerical evidence, not model questions.
            first=text.split("\f",1)[0]
            entry["numericRows"]=[line.strip()[:240] for line in first.splitlines() if len(re.findall(r"\d+",line))>=3][:45]
    except (OSError,ValueError,AttributeError,subprocess.SubprocessError) as err:
        entry["reason"]=str(err)[:200]
    return entry

if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--output")
    ap.add_argument("--preview-grid-dir")
    args=ap.parse_args(); selftest()
    if args.preview_grid_dir:
        stage_grid_page_images(args.preview_grid_dir)
        raise SystemExit(0)
    if not args.output: ap.error("--output is required for the catalog audit")
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
    register=json.loads((Path(__file__).resolve().parent.parent/"data/cdc-question-paper-sources-2083.json").read_text(encoding="utf-8"))
    optional=[source for source in register["sources"] if 9 in source.get("grades",[]) and source.get("subject") in {"ऐच्छिक कम्प्युटर विज्ञान","ऐच्छिक गणित","ऐच्छिक अर्थशास्त्र"} and source.get("kind")=="specification_grid_and_model_questions" and urlsplit(source.get("url","")).hostname=="giwmscdnone.gov.np" and urlsplit(source.get("url","")).path.lower().endswith(".pdf")]
    if len(optional)!=3: raise ValueError("Unexpected optional-subject official PDF inventory")
    with ThreadPoolExecutor(max_workers=3) as pool:
        report["optionalDocumentReview"]=list(pool.map(lambda source:audit_optional_grid_pdf(source,out.parent/"optional-extracted"),optional))
    report["optionalDocumentsRead"]=sum(r["status"]=="full_pdf_retrieved_visual_review_required" for r in report["optionalDocumentReview"])
    out.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(report,ensure_ascii=False,indent=2))
    print("No Grid approval is granted by this audit.")
