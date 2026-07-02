#!/usr/bin/env python3
"""Regenerate the extractor test fixtures, stdlib-only.

Every fixture is built by hand (zipfile/zlib/struct) rather than by the
libraries the tests exercise, so a test round-trips through an independent
implementation. Run from this directory: `python3 make-fixtures.py`.
"""

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


if __name__ == "__main__":
    make_pdf()
    make_docx()
    make_xlsx()
    make_png()
    make_zip()
    for name in ("two-page.pdf", "sample.docx", "two-sheet.xlsx", "tiny.png", "sample.zip"):
        print(f"{name}: {(HERE / name).stat().st_size} bytes")
