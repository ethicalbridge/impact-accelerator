"""Builds the downloadable policy PDFs (assets/policies/handova-<slug>-v<VERSION>.pdf) from the HTML fragments the site
shows at #policies/<slug>, so the website and the PDFs always say the same thing.

    python3 scripts/policy-pdfs.py            # all six policies
    python3 scripts/policy-pdfs.py code-of-conduct

Needs Python Playwright (Chromium) and pypdf. When the policies change: edit assets/policies/<slug>.html, update
VERSION, APPROVED and CHANGES below and POLICY_VERSION in src/pages/legal.js, then run this script and rebuild the site.
"""
import base64, html, pathlib, re, sys
from playwright.sync_api import sync_playwright
from pypdf import PdfReader, PdfWriter

ROOT = pathlib.Path(__file__).resolve().parent.parent
POL = ROOT / "assets" / "policies"
VERSION, APPROVED, FIRST = "1.1", "9 November 2026", "20 October 2026"
NEXT_REVIEW = "October 2027, or sooner when Handova has a team, after a serious incident or when the law changes"
WHO_STD = "Professionals and students, organisations and their staff, and the Handova team"
CHANGE_ALL = "Students included wherever the policy refers to professionals."

POLICIES = {
    "safeguarding": dict(title="Safeguarding Policy and Procedure", cover="Safeguarding Policy<br>and Procedure", kind="Policy and procedure", short="Safeguarding policy",
        sub="Children, adults at risk, and protection from sexual exploitation, abuse and harassment",
        lead="How Handova keeps the people organisations serve, and everyone using the platform, safe from harm.",
        applies="Professionals and students, organisations and their focal points, the Handova team and anyone acting for Handova", changes=CHANGE_ALL),
    "code-of-conduct": dict(title="Code of Conduct", cover="Code of Conduct", kind="Code", short="Code of conduct", sub="",
        lead="The standards everyone on Handova agrees to: respect for local leadership, honesty, care and safety.", applies=WHO_STD,
        changes="Students included throughout; new extra standards for students (take on only work you can deliver, academic credit, coursework); new section 8, ready to work remotely, for everyone."),
    "anti-harassment": dict(title="Anti-Harassment, Intimidation and Bullying Policy and Procedure", cover="Anti-Harassment,<br>Intimidation and Bullying<br>Policy and Procedure",
        kind="Policy and procedure", short="Anti-harassment policy", sub="",
        lead="How we prevent and respond to harassment, bullying, intimidation and discrimination on Handova.", applies=WHO_STD, changes=CHANGE_ALL),
    "data-protection": dict(title="Data Protection Policy", cover="Data Protection Policy", kind="Policy", short="Data protection policy",
        sub="With record of processing, ID-check impact assessment and breach procedure",
        lead="How Handova collects, uses, protects and deletes personal information.",
        applies="The Handova team, volunteers and contractors; it explains how we treat the data of everyone who uses Handova: professionals, students and organisations", changes=CHANGE_ALL),
    "fraud": dict(title="Fraud, Bribery and Corruption Policy and Procedure", cover="Fraud, Bribery and Corruption<br>Policy and Procedure", kind="Policy and procedure",
        short="Fraud, bribery and corruption policy", sub="", lead="How we prevent, spot and respond to fraud, bribery, corruption and misuse of Handova.", applies=WHO_STD, changes=CHANGE_ALL),
    "whistleblowing": dict(title="Whistleblowing Policy and Procedure", cover="Whistleblowing<br>Policy and Procedure", kind="Policy and procedure", short="Whistleblowing policy", sub="",
        lead="How anyone can raise a concern about wrongdoing safely, and how we protect them.",
        applies="Anyone: the Handova team, volunteers, professionals, students, organisations and members of the public", changes=CHANGE_ALL),
}

def font(name):
    return base64.b64encode((ROOT / "fonts" / f"{name}.woff2").read_bytes()).decode()
FONTS = f"""@font-face{{font-family:Newsreader;src:url(data:font/woff2;base64,{font('newsreader')}) format('woff2');font-weight:200 800}}
@font-face{{font-family:'Instrument Sans';src:url(data:font/woff2;base64,{font('instrument-sans')}) format('woff2');font-weight:400 700}}"""
MARK = lambda s=22, light=False: (f'<svg width="{s}" height="{s}" viewBox="0 0 100 100"><path d="M18 72 Q18 28 50 28" fill="none" stroke="{"#fffdf8" if light else "#123e3a"}" stroke-width="11" stroke-linecap="round"/>'
                                  f'<path d="M82 28 Q82 72 50 72" fill="none" stroke="{"#7fa99b" if light else "#0f6f63"}" stroke-width="11" stroke-linecap="round"/><circle cx="50" cy="50" r="11" fill="{"#e0a07f" if light else "#b85c38"}"/></svg>')

BASE = FONTS + """
*{box-sizing:border-box}html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font-family:'Instrument Sans',Arial,sans-serif;color:#10302c;font-size:9.6pt;line-height:1.58}
"""
COVER_CSS = BASE + """
@page{size:A4;margin:0}html,body{width:210mm;height:297mm;overflow:hidden}
.c{position:relative;width:210mm;height:297mm;background:radial-gradient(150mm 140mm at 80% 30%,#1c5a52 0%,transparent 70%),linear-gradient(160deg,#123e3a 0%,#0d302d 100%);color:#fffdf8;padding:20mm 20mm 18mm;overflow:hidden}
.ring{position:absolute;border:1px solid rgba(169,201,191,.22);border-radius:50%}
.top{display:flex;justify-content:space-between;align-items:center}
.brand{display:flex;align-items:center;gap:9pt;font-family:Newsreader,serif;font-size:19pt}
.pill{border:1px solid rgba(169,201,191,.55);border-radius:20pt;padding:4pt 10pt;font-size:7.6pt;color:#c9ddd6}.pill b{color:#fffdf8;font-weight:600}
.eb{margin-top:72mm;font-size:7.6pt;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:#a9c9bf}
h1{font-family:Newsreader,serif;font-weight:400;font-size:31pt;line-height:1.12;margin:10pt 0 8pt;letter-spacing:-.01em}
.sub{font-family:Newsreader,serif;font-size:12.5pt;color:#c9ddd6;max-width:140mm;margin:0 0 4pt}
.rule{width:22mm;height:2px;background:#e0a07f;margin:16pt 0 14pt}
.lead{font-size:10pt;line-height:1.55;color:#c9ddd6;max-width:140mm}
.bot{position:absolute;left:20mm;right:20mm;bottom:18mm;display:flex;justify-content:space-between;align-items:flex-end;font-size:7.6pt;color:#c9ddd6}
.bot b{color:#fffdf8;font-weight:600}.tag{font-family:Newsreader,serif;font-size:12pt;text-align:right;line-height:1.3;color:#fffdf8}.tag i{font-style:normal;color:#e0a07f}
"""
BODY_CSS = BASE + """
@page{size:A4;margin:22mm 18mm 20mm}
.k{font-size:7.4pt;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#0f6f63;margin:0 0 4pt}
h1.dc{font-family:Newsreader,serif;font-weight:400;font-size:24pt;margin:0 0 12pt;color:#123e3a}
table.ctl{width:100%;border-collapse:collapse;margin-bottom:18pt;font-size:8.8pt}
table.ctl th{width:42mm;text-align:left;font-size:7pt;letter-spacing:.14em;text-transform:uppercase;color:#55625f;background:#f6f3ec;padding:7pt 9pt;border-bottom:1px solid #ddd6c7;vertical-align:top;font-weight:700}
table.ctl td{padding:7pt 9pt;border-bottom:1px solid #ddd6c7;vertical-align:top}
.toc{columns:2;column-gap:12mm;font-size:8.8pt;margin-top:4pt}.toc div{display:flex;gap:8pt;padding:4pt 0;border-bottom:1px solid #ddd6c7;break-inside:avoid}.toc span{width:30pt;flex:none;color:#0f6f63;font-weight:700}
h2{font-size:15pt;line-height:1.25;font-weight:600;color:#123e3a;margin:20pt 0 8pt;break-after:avoid;letter-spacing:-.005em}
.sec{font-size:7.2pt;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#0f6f63;margin:22pt 0 -4pt;break-after:avoid}
.part{margin:26pt 0 0;padding:9pt 12pt;background:#123e3a;color:#fffdf8;border-radius:8pt;font-family:Newsreader,serif;font-size:14pt;break-after:avoid}
h3{font-size:10.6pt;font-weight:600;color:#0f6f63;margin:14pt 0 5pt;break-after:avoid}
p{margin:0 0 7pt}ul,ol{margin:0 0 8pt;padding-left:16pt}li{margin-bottom:3.5pt}li::marker{color:#0f6f63}
ul ul{margin:4pt 0 2pt}
a{color:#0f6f63}strong{font-weight:600}
table{width:100%;border-collapse:collapse;margin:6pt 0 12pt;font-size:8.2pt;line-height:1.45;break-inside:auto}
thead{display:table-header-group}tr{break-inside:avoid}
th{background:#dcebe6;color:#123e3a;text-align:left;font-size:6.9pt;letter-spacing:.12em;text-transform:uppercase;padding:6pt 7pt;font-weight:700}
td{padding:6pt 7pt;border-bottom:1px solid #ddd6c7;vertical-align:top}
blockquote{margin:8pt 0;padding:10pt 14pt;background:#f6f3ec;border-left:3px solid #0f6f63;border-radius:0 8pt 8pt 0}
.box{border-radius:12pt;padding:12pt 15pt 6pt;margin:0 0 12pt;break-inside:avoid}
.box .bh{font-size:7.4pt;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#0f6f63;margin:0 0 6pt}
.box.prop{background:#f6f3ec;border-left:3px solid #0f6f63}.box.glance{background:#eaf3ef}.box.who{border:1px solid #ddd6c7;break-inside:auto}
.end{margin-top:26pt;padding-top:10pt;border-top:1px solid #ddd6c7;display:flex;align-items:center;gap:8pt;font-size:7.6pt;color:#55625f}
"""

def header(short):
    return (f'<div style="width:100%;padding:0 18mm;display:flex;justify-content:space-between;align-items:center;font-family:Arial,sans-serif;-webkit-print-color-adjust:exact">'
            f'<span style="display:flex;align-items:center;gap:5px;font-family:Georgia,serif;font-size:10px;color:#123e3a">{MARK(12)} Handova</span>'
            f'<span style="font-size:6.5px;letter-spacing:2px;text-transform:uppercase;color:#55625f">{html.escape(short)}</span></div>')
def footer(title):
    return (f'<div style="width:100%;margin:0 18mm;padding-top:5px;border-top:1px solid #ddd6c7;display:flex;justify-content:space-between;font-family:Arial,sans-serif;font-size:7px;color:#55625f">'
            f'<span>Handova &nbsp;|&nbsp; {html.escape(title)} &nbsp;|&nbsp; Version {VERSION}</span><span class="pageNumber"></span></div>')

INTRO = {"Proportionate to our size": "prop", "At a glance": "glance", "Who this applies to": "who"}

def body(slug, m):
    src = (POL / f"{slug}.html").read_text()
    src = re.sub(r'<div class="table-scroll">|</div>', "", src)
    parts = re.split(r"<h2>(.*?)</h2>", src)  # [pre, h, body, h, body, ...]
    out, toc = [], []
    for i in range(1, len(parts), 2):
        h, b = parts[i], parts[i + 1]
        if h in INTRO:
            out.append(f'<div class="box {INTRO[h]}"><p class="bh">{h}</p>{b}</div>'); continue
        if re.match(r"^(Part [AB]:|Procedure$)", h):
            out.append(f'<div class="part">{h}</div>{b}'); continue
        n = re.match(r"^(\d+)\.\s+(.*)$", h)
        a = re.match(r"^(Annex [A-Z]):\s+(.*)$", h)
        if n:
            num, t = f"{int(n.group(1)):02d}", n.group(2); out.append(f'<p class="sec">Section {num}</p><h2>{t}</h2>{b}')
        elif a:
            num, t = a.group(1), a.group(2); out.append(f'<p class="sec">{num}</p><h2>{t}</h2>{b}')
        else:
            num, t = "", h; out.append(f"<h2>{h}</h2>{b}")
        toc.append((num, t))
    ctl = [("Document", f"Handova {m['title']}"), ("Type", m["kind"]), ("Owner", "Julieta Castiñeira de Dios"),
           ("Approved by", "Julieta Castiñeira de Dios, founder, for Ethical Bridge LLC"), ("Version", f"{VERSION} (version 1.0 approved on {FIRST})"),
           ("Date of approval", APPROVED), ("Changes in this version", m["changes"]), ("Next review", NEXT_REVIEW), ("Applies to", m["applies"]),
           ("Operator", "Handova is an initiative of Ethical Bridge LLC, registered in Wyoming, USA"), ("Contact", "safeguarding@handova.org · hello@handova.org"),
           ("Language", "English. Read it online at handova.org/#policies")]
    dc = ('<p class="k">Document control</p><h1 class="dc">About this document</h1><table class="ctl">' + "".join(f"<tr><th>{k}</th><td>{v}</td></tr>" for k, v in ctl) + "</table>"
          '<p class="k">Contents</p><div class="toc">' + "".join(f"<div><span>{n}</span>{t}</div>" for n, t in toc) + "</div>")
    end = f'<div class="end">{MARK(14)} Handova · Skills handed over. Capability that stays. · An initiative of Ethical Bridge</div>'
    return f'<!doctype html><html><head><meta charset="utf-8"><style>{BODY_CSS}</style></head><body><div style="break-after:page">{dc}</div>{"".join(out)}{end}</body></html>'

def cover(m):
    eb = "Trust &amp; safety · " + m["kind"]
    sub = f'<p class="sub">{m["sub"]}</p>' if m["sub"] else ""
    rings = "".join(f'<div class="ring" style="width:{d}mm;height:{d}mm;right:{-d/2+30}mm;top:{140-d/2}mm"></div>' for d in (90, 150, 210))
    return (f'<!doctype html><html><head><meta charset="utf-8"><style>{COVER_CSS}</style></head><body><div class="c">{rings}'
            f'<div class="top"><span class="brand">{MARK(30, True)} Handova</span><span class="pill">An initiative of <b>Ethical Bridge</b></span></div>'
            f'<p class="eb">{eb}</p><h1>{m["cover"]}</h1>{sub}<div class="rule"></div><p class="lead">{m["lead"]}</p>'
            f'<div class="bot"><span><b>Version {VERSION}</b> &nbsp;|&nbsp; Approved {APPROVED}<br>Handova, an initiative of Ethical Bridge LLC</span>'
            f'<span class="tag">Skills handed over.<br><i>Capability that stays.</i></span></div></div></body></html>')

def main(slugs):
    tmp = ROOT / ".policy-build"; tmp.mkdir(exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page()
        for slug in slugs:
            m = POLICIES[slug]
            (tmp / "cover.html").write_text(cover(m)); pg.goto((tmp / "cover.html").as_uri()); pg.wait_for_timeout(200)
            pg.pdf(path=str(tmp / "cover.pdf"), print_background=True, prefer_css_page_size=True)
            (tmp / "body.html").write_text(body(slug, m)); pg.goto((tmp / "body.html").as_uri()); pg.wait_for_timeout(200)
            pg.pdf(path=str(tmp / "body.pdf"), print_background=True, prefer_css_page_size=True, display_header_footer=True,
                   header_template=header(m["short"]), footer_template=footer(m["title"]))
            w = PdfWriter()
            for f in ("cover.pdf", "body.pdf"):
                for page in PdfReader(str(tmp / f)).pages: w.add_page(page)
            w.add_metadata({"/Title": f"Handova {m['title']}", "/Author": "Handova (an initiative of Ethical Bridge)", "/Subject": f"Version {VERSION}, approved {APPROVED}"})
            out = POL / f"handova-{slug}-v{VERSION}.pdf"; w.write(str(out))
            print(out.name, len(PdfReader(str(out)).pages), "pages")
        b.close()
    for f in tmp.iterdir(): f.unlink()
    tmp.rmdir()

if __name__ == "__main__":
    main(sys.argv[1:] or list(POLICIES))
