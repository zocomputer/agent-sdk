import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { deflateRawSync } from "node:zlib";
import { openZip } from "./zip";

const fixture = (name: string) => new URL(`fixtures/${name}`, import.meta.url).pathname;

// Hand-assemble a one-entry zip so the reader is exercised against an
// independent construction (the fixtures already cover Python's zipfile).
function buildZip(options: {
  name: string;
  data: Buffer;
  method: number;
  flags?: number;
  localExtra?: Buffer;
}): Buffer {
  const { name, data, method } = options;
  const flags = options.flags ?? 0;
  const localExtra = options.localExtra ?? Buffer.alloc(0);
  const nameBytes = Buffer.from(name, "utf8");
  const compressed = method === 8 ? deflateRawSync(data) : data;

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4); // version needed
  local.writeUInt16LE(flags, 6);
  local.writeUInt16LE(method, 8);
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBytes.length, 26);
  local.writeUInt16LE(localExtra.length, 28);
  const localRecord = Buffer.concat([local, nameBytes, localExtra, compressed]);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(flags, 8);
  central.writeUInt16LE(method, 10);
  central.writeUInt32LE(compressed.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(nameBytes.length, 28);
  central.writeUInt32LE(0, 42); // local header offset
  const centralRecord = Buffer.concat([central, nameBytes]);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 8); // entries on disk
  eocd.writeUInt16LE(1, 10); // entries total
  eocd.writeUInt32LE(centralRecord.length, 12);
  eocd.writeUInt32LE(localRecord.length, 16); // central directory offset

  return Buffer.concat([localRecord, centralRecord, eocd]);
}

describe("openZip", () => {
  test("reads deflated entries from a zipfile-built archive", () => {
    const zip = openZip(readFileSync(fixture("sample.docx")));
    expect(zip.names).toContain("word/document.xml");
    expect(zip.has("word/document.xml")).toBe(true);
    expect(zip.read("word/document.xml").toString("utf8")).toContain(
      "Rib reads Word documents now.",
    );
  });

  test("reads stored (uncompressed) entries", () => {
    const zip = openZip(readFileSync(fixture("sample.odt")));
    // The ODF mimetype entry is written STORED per spec.
    expect(zip.read("mimetype").toString("utf8")).toBe(
      "application/vnd.oasis.opendocument.text",
    );
  });

  test("round-trips a hand-assembled deflated entry", () => {
    const data = Buffer.from("hand-built zip content\n".repeat(10));
    const zip = openZip(buildZip({ name: "a/b.txt", data, method: 8 }));
    expect(zip.names).toEqual(["a/b.txt"]);
    expect(zip.read("a/b.txt").equals(data)).toBe(true);
  });

  test("round-trips a hand-assembled stored entry", () => {
    const data = Buffer.from("stored bytes");
    const zip = openZip(buildZip({ name: "s.txt", data, method: 0 }));
    expect(zip.read("s.txt").equals(data)).toBe(true);
  });

  test("data offset comes from the local header, not the central copy", () => {
    // A local extra field shifts the data start; readers that trust the
    // central directory's lengths return garbage here.
    const data = Buffer.from("offset survives extra fields");
    const zip = openZip(
      buildZip({ name: "x.txt", data, method: 0, localExtra: Buffer.alloc(12, 0xaa) }),
    );
    expect(zip.read("x.txt").equals(data)).toBe(true);
  });

  test("refuses encrypted entries by name", () => {
    const zip = openZip(
      buildZip({ name: "secret.txt", data: Buffer.from("x"), method: 0, flags: 0x1 }),
    );
    expect(() => zip.read("secret.txt")).toThrow(/encrypted/);
  });

  test("refuses unsupported compression methods by number", () => {
    const zip = openZip(
      buildZip({ name: "lzma.txt", data: Buffer.from("x"), method: 14 }),
    );
    expect(() => zip.read("lzma.txt")).toThrow(/unsupported compression method 14/);
  });

  test("missing entries throw by name", () => {
    const zip = openZip(readFileSync(fixture("sample.zip")));
    expect(zip.has("nope.txt")).toBe(false);
    expect(() => zip.read("nope.txt")).toThrow(/no entry named nope.txt/);
  });

  test("directory entries are excluded from names", () => {
    const zip = openZip(readFileSync(fixture("one-chapter.epub")));
    expect(zip.names.every((name) => !name.endsWith("/"))).toBe(true);
  });

  test("a duplicated central-directory entry lists once, last record wins", () => {
    // Appended archives can list one path twice; document counts must not
    // inflate and reads must see the newest bytes.
    const first = buildZip({ name: "dup.txt", data: Buffer.from("old"), method: 0 });
    const second = buildZip({ name: "dup.txt", data: Buffer.from("new"), method: 0 });
    // Splice the two archives' records into one central directory by hand.
    const local1 = first.subarray(0, 30 + 7 + 3); // header + name + "old"
    const local2 = second.subarray(0, 30 + 7 + 3);
    const central1 = Buffer.from(first.subarray(30 + 7 + 3, 30 + 7 + 3 + 46 + 7));
    const central2 = Buffer.from(second.subarray(30 + 7 + 3, 30 + 7 + 3 + 46 + 7));
    central2.writeUInt32LE(local1.length, 42); // second record → second local header
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(2, 8);
    eocd.writeUInt16LE(2, 10);
    eocd.writeUInt32LE(central1.length + central2.length, 12);
    eocd.writeUInt32LE(local1.length + local2.length, 16);
    const zip = openZip(Buffer.concat([local1, local2, central1, central2, eocd]));
    expect(zip.names).toEqual(["dup.txt"]);
    expect(zip.read("dup.txt").toString("utf8")).toBe("new");
  });

  test("an EOCD-looking signature inside the archive comment is not the record", () => {
    const base = buildZip({ name: "c.txt", data: Buffer.from("real content"), method: 0 });
    // Append a comment that embeds the EOCD signature followed by garbage
    // offsets; only the true record's comment length spans to EOF.
    const comment = Buffer.concat([
      Buffer.from("see PK\x05\x06", "latin1"),
      Buffer.alloc(18, 0x42),
    ]);
    const withComment = Buffer.concat([base, comment]);
    withComment.writeUInt16LE(comment.length, base.length - 2); // EOCD comment length
    const zip = openZip(withComment);
    expect(zip.read("c.txt").toString("utf8")).toBe("real content");
  });

  test("non-zip bytes fail with a readable error", () => {
    expect(() => openZip(Buffer.from("plain text, definitely not a zip file at all"))).toThrow(
      /not a readable zip archive/,
    );
    expect(() => openZip(Buffer.from("tiny"))).toThrow(/not a readable zip archive/);
  });

  test("a truncated archive fails closed", () => {
    const whole = readFileSync(fixture("sample.docx"));
    // Chop the middle out but keep the tail (EOCD + central directory intact,
    // local data gone) — reads must throw, not return garbage.
    const truncated = Buffer.concat([whole.subarray(0, 10), whole.subarray(whole.length - 400)]);
    expect(() => {
      const zip = openZip(truncated);
      for (const name of zip.names) zip.read(name);
    }).toThrow();
  });
});
