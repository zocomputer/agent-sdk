#!/usr/bin/env python3
"""Regenerate the extractor test fixtures, stdlib-only.

Every fixture is built by hand (zipfile/zlib/struct/json) rather than by the
libraries the tests exercise, so a test round-trips through an independent
implementation. Run from this directory: `python3 make-fixtures.py`.
"""

import json
import struct
import zipfile
import zlib
from pathlib import Path

HERE = Path(__file__).parent


# --- two-page.pdf: uncompressed text layer, page 2 intentionally empty ------
# Page 1 carries two text lines; page 2 has a content stream with no text
# operators, so extractors see a present-but-empty text layer (the scanned-
# page shape, minus the scan).
def make_pdf() -> None:
    objects: list[bytes] = []

    def obj(body: str) -> int:
        objects.append(body.encode("ascii"))
        return len(objects)

    font = obj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    stream1 = (
        "BT /F1 12 Tf 72 720 Td (Hello from page one.) Tj "
        "0 -18 Td (Second line of page one.) Tj ET"
    )
    c1 = obj(f"<< /Length {len(stream1)} >>\nstream\n{stream1}\nendstream")
    stream2 = "q Q"
    c2 = obj(f"<< /Length {len(stream2)} >>\nstream\n{stream2}\nendstream")
    pages_num = len(objects) + 3  # two page objects follow, then the tree
    p1 = obj(
        f"<< /Type /Page /Parent {pages_num} 0 R /MediaBox [0 0 612 792] "
        f"/Resources << /Font << /F1 {font} 0 R >> >> /Contents {c1} 0 R >>"
    )
    p2 = obj(
        f"<< /Type /Page /Parent {pages_num} 0 R /MediaBox [0 0 612 792] "
        f"/Resources << >> /Contents {c2} 0 R >>"
    )
    pages = obj(f"<< /Type /Pages /Kids [{p1} 0 R {p2} 0 R] /Count 2 >>")
    catalog = obj(f"<< /Type /Catalog /Pages {pages} 0 R >>")

    out = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for i, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + body + b"\nendobj\n"
    xref_at = len(out)
    out += f"xref\n0 {len(objects) + 1}\n".encode()
    out += b"0000000000 65535 f \n"
    for off in offsets[1:]:
        out += f"{off:010d} 00000 n \n".encode()
    out += (
        f"trailer\n<< /Size {len(objects) + 1} /Root {catalog} 0 R >>\n"
        f"startxref\n{xref_at}\n%%EOF\n"
    ).encode()
    (HERE / "two-page.pdf").write_bytes(out)


# --- sample.docx: minimal OOXML wordprocessing package -----------------------
DOCX_CONTENT_TYPES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>"""

DOCX_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""

DOCX_DOCUMENT = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
<w:p><w:r><w:t>Rib reads Word documents now.</w:t></w:r></w:p>
<w:p><w:r><w:t>A second paragraph, for good measure.</w:t></w:r></w:p>
</w:body>
</w:document>"""


def make_docx() -> None:
    with zipfile.ZipFile(HERE / "sample.docx", "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", DOCX_CONTENT_TYPES)
        z.writestr("_rels/.rels", DOCX_RELS)
        z.writestr("word/document.xml", DOCX_DOCUMENT)


# --- two-sheet.xlsx: inline strings, no sharedStrings part -------------------
XLSX_CONTENT_TYPES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>"""

XLSX_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>"""

XLSX_WORKBOOK = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
<sheet name="Fruit" sheetId="1" r:id="rId1"/>
<sheet name="Totals" sheetId="2" r:id="rId2"/>
</sheets>
</workbook>"""

XLSX_WORKBOOK_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
</Relationships>"""


def sheet_xml(rows: list[list[object]]) -> str:
    def cell(ref: str, value: object) -> str:
        if isinstance(value, (int, float)):
            return f'<c r="{ref}"><v>{value}</v></c>'
        return f'<c r="{ref}" t="inlineStr"><is><t>{value}</t></is></c>'

    body = "".join(
        f'<row r="{r}">'
        + "".join(cell(f"{chr(ord('A') + c)}{r}", v) for c, v in enumerate(row))
        + "</row>"
        for r, row in enumerate(rows, start=1)
    )
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        f"<sheetData>{body}</sheetData></worksheet>"
    )


def make_xlsx() -> None:
    sheet1 = sheet_xml(
        [["fruit", "count"], ["apple", 3], ["banana", 5], ["cherry", 12]]
    )
    sheet2 = sheet_xml([["total", 20]])
    with zipfile.ZipFile(HERE / "two-sheet.xlsx", "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", XLSX_CONTENT_TYPES)
        z.writestr("_rels/.rels", XLSX_RELS)
        z.writestr("xl/workbook.xml", XLSX_WORKBOOK)
        z.writestr("xl/_rels/workbook.xml.rels", XLSX_WORKBOOK_RELS)
        z.writestr("xl/worksheets/sheet1.xml", sheet1)
        z.writestr("xl/worksheets/sheet2.xml", sheet2)


# --- tiny.png: 2x3 RGB, one IDAT ---------------------------------------------
def make_png() -> None:
    def chunk(kind: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + kind
            + data
            + struct.pack(">I", zlib.crc32(kind + data))
        )

    width, height = 2, 3
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    raw = b"".join(b"\x00" + b"\xff\x00\x00\x00\xff\x00" for _ in range(height))
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(raw))
        + chunk(b"IEND", b"")
    )
    (HERE / "tiny.png").write_bytes(png)


# --- sample.zip: a plain archive that is neither docx nor xlsx ---------------
def make_zip() -> None:
    with zipfile.ZipFile(HERE / "sample.zip", "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("hello.txt", "zip contents\n")


# --- two-slide.pptx: minimal OOXML presentation, notes on slide 2 only -------
PPTX_CONTENT_TYPES = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
<Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
<Override PartName="/ppt/slides/slide2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
<Override PartName="/ppt/notesSlides/notesSlide2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>
</Types>"""

PPTX_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>"""

def pptx_presentation(rids: list[str]) -> str:
    """presentation.xml whose sldIdLst orders slides by the given r:ids."""
    sld_ids = "".join(
        f'<p:sldId id="{256 + i}" r:id="{rid}"/>' for i, rid in enumerate(rids)
    )
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        f"<p:sldIdLst>{sld_ids}</p:sldIdLst>"
        "</p:presentation>"
    )


PPTX_PRESENTATION_RELS = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide2.xml"/>
</Relationships>"""


def pptx_slide(paragraphs: list[list[str]], breaks: bool = False) -> str:
    """A slide whose text body carries `paragraphs`, each a list of runs."""
    ps = []
    for runs in paragraphs:
        body = "<a:br/>".join(f"<a:r><a:t>{run}</a:t></a:r>" for run in runs) if breaks \
            else "".join(f"<a:r><a:t>{run}</a:t></a:r>" for run in runs)
        ps.append(f"<a:p>{body}</a:p>")
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
        'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">'
        f'<p:cSld><p:spTree><p:sp><p:txBody>{"".join(ps)}</p:txBody></p:sp></p:spTree></p:cSld>'
        "</p:sld>"
    )


def make_pptx() -> None:
    slide1 = pptx_slide([["Quarterly Review"], ["Revenue ", "up 12%"]])
    # Slide 2 exercises <a:br/> between runs of one paragraph.
    slide2 = pptx_slide([["Next steps", "Hire more raccoons"]], breaks=True)
    notes2 = pptx_slide([["Remember to mention the hiring plan."]])

    def write(name: str, presentation: str) -> None:
        with zipfile.ZipFile(HERE / name, "w", zipfile.ZIP_DEFLATED) as z:
            z.writestr("[Content_Types].xml", PPTX_CONTENT_TYPES)
            z.writestr("_rels/.rels", PPTX_RELS)
            z.writestr("ppt/presentation.xml", presentation)
            z.writestr("ppt/_rels/presentation.xml.rels", PPTX_PRESENTATION_RELS)
            z.writestr("ppt/slides/slide1.xml", slide1)
            z.writestr("ppt/slides/slide2.xml", slide2)
            z.writestr("ppt/notesSlides/notesSlide2.xml", notes2)

    write("two-slide.pptx", pptx_presentation(["rId1", "rId2"]))
    # The same slide parts with the presentation order REVERSED — slide2.xml
    # first. Pins that extraction follows sldIdLst, not filename numbers.
    write("reordered.pptx", pptx_presentation(["rId2", "rId1"]))


# --- sample.odt / two-page.odp: minimal OpenDocument packages -----------------
ODF_NS = (
    'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" '
    'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" '
    'xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"'
)

ODT_CONTENT = f"""<?xml version="1.0" encoding="UTF-8"?>
<office:document-content {ODF_NS}>
<office:body><office:text>
<text:h text:outline-level="1">Trip Notes</text:h>
<text:p>First<text:tab/>tabbed</text:p>
<text:p>Line one<text:line-break/>line two</text:p>
<text:p>Wide<text:s text:c="3"/>gap</text:p>
</office:text></office:body>
</office:document-content>"""

ODP_CONTENT = f"""<?xml version="1.0" encoding="UTF-8"?>
<office:document-content {ODF_NS}>
<office:body><office:presentation>
<draw:page draw:name="Intro"><draw:frame><draw:text-box>
<text:p>Welcome to the demo</text:p>
</draw:text-box></draw:frame></draw:page>
<draw:page draw:name="Close"><draw:frame><draw:text-box>
<text:p>Questions?</text:p>
</draw:text-box></draw:frame></draw:page>
</office:presentation></office:body>
</office:document-content>"""


def make_odf(name: str, mimetype: str, content: str) -> None:
    with zipfile.ZipFile(HERE / name, "w", zipfile.ZIP_DEFLATED) as z:
        # Per the ODF spec the mimetype entry comes first, STORED — which also
        # exercises the zip reader's stored-method path.
        z.writestr(
            zipfile.ZipInfo("mimetype"), mimetype, compress_type=zipfile.ZIP_STORED
        )
        z.writestr("content.xml", content)


# --- one-chapter.epub: two-section EPUB whose spine order differs from
# --- alphabetical entry order (b-intro before a-end) --------------------------
EPUB_CONTAINER = """<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>"""

EPUB_OPF = """<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Fixture Book</dc:title><dc:identifier id="uid">fixture</dc:identifier></metadata>
<manifest>
<item id="intro" href="b-intro.xhtml" media-type="application/xhtml+xml"/>
<item id="end" href="a-end.xhtml" media-type="application/xhtml+xml"/>
<item id="style" href="style.css" media-type="text/css"/>
</manifest>
<spine><itemref idref="intro"/><itemref idref="end"/></spine>
</package>"""

EPUB_INTRO = """<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Intro</title>
<style>p { color: red; }</style></head>
<body><h1>Intro</h1><p>Once upon a time.</p></body></html>"""

EPUB_END = """<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><head><title>End</title></head>
<body><p>The end.</p></body></html>"""


def make_epub() -> None:
    with zipfile.ZipFile(HERE / "one-chapter.epub", "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr(
            zipfile.ZipInfo("mimetype"),
            "application/epub+zip",
            compress_type=zipfile.ZIP_STORED,
        )
        z.writestr("META-INF/container.xml", EPUB_CONTAINER)
        z.writestr("OEBPS/content.opf", EPUB_OPF)
        z.writestr("OEBPS/b-intro.xhtml", EPUB_INTRO)
        z.writestr("OEBPS/a-end.xhtml", EPUB_END)
        z.writestr("OEBPS/style.css", "p { color: red; }")


# --- three-cell.ipynb: markdown + code with outputs + code with an error -----
def make_ipynb() -> None:
    nb = {
        "nbformat": 4,
        "nbformat_minor": 5,
        "metadata": {"language_info": {"name": "python"}},
        "cells": [
            {
                "cell_type": "markdown",
                "metadata": {},
                "source": ["# Analysis\n", "Some prose."],
            },
            {
                "cell_type": "code",
                "execution_count": 1,
                "metadata": {},
                "source": ["print('hi')\n", "1 + 1"],
                "outputs": [
                    {"output_type": "stream", "name": "stdout", "text": ["hi\n"]},
                    {
                        "output_type": "execute_result",
                        "execution_count": 1,
                        "metadata": {},
                        "data": {"text/plain": ["2"]},
                    },
                    {
                        "output_type": "display_data",
                        "metadata": {},
                        "data": {
                            "image/png": "iVBORw0KGgoAAAANSUhEUg==",
                            "text/plain": ["<Figure size 640x480>"],
                        },
                    },
                ],
            },
            {
                "cell_type": "code",
                "execution_count": 2,
                "metadata": {},
                "source": "boom()",
                "outputs": [
                    {
                        "output_type": "error",
                        "ename": "NameError",
                        "evalue": "name 'boom' is not defined",
                        "traceback": [
                            "\u001b[0;31mNameError\u001b[0m: name 'boom' is not defined"
                        ],
                    }
                ],
            },
        ],
    }
    (HERE / "three-cell.ipynb").write_text(json.dumps(nb, indent=1))


# --- sample.rtf: control words, skipped tables, hex + unicode escapes --------
RTF = (
    r"{\rtf1\ansi\deff0{\fonttbl{\f0 Helvetica;}}{\colortbl;\red0\green0\blue0;}"
    "\n"
    r"{\*\generator Fixture 1.0;}"
    r"\f0\fs24 Hello \b bold\b0  world.\par"
    "\n"
    r"Second\tab tabbed caf\'e9 and \u8212? dash.\par"
    "\n"
    r"Curly \'93quotes\'94 close.\par"
    "\n}"
)


def make_rtf() -> None:
    (HERE / "sample.rtf").write_text(RTF)


if __name__ == "__main__":
    make_pdf()
    make_docx()
    make_xlsx()
    make_png()
    make_zip()
    make_pptx()
    make_odf("sample.odt", "application/vnd.oasis.opendocument.text", ODT_CONTENT)
    make_odf("two-page.odp", "application/vnd.oasis.opendocument.presentation", ODP_CONTENT)
    make_epub()
    make_ipynb()
    make_rtf()
    for name in (
        "two-page.pdf",
        "sample.docx",
        "two-sheet.xlsx",
        "tiny.png",
        "sample.zip",
        "two-slide.pptx",
        "reordered.pptx",
        "sample.odt",
        "two-page.odp",
        "one-chapter.epub",
        "three-cell.ipynb",
        "sample.rtf",
    ):
        print(f"{name}: {(HERE / name).stat().st_size} bytes")
