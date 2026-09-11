// Minimal dependency-free ZIP writer (STORE method, no compression) + CRC32.
// Sufficient for bundling already-compressed files like PDFs for download.

function crc32(buf: Uint8Array): number {
  let c = ~0 >>> 0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i] as number
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return (~c) >>> 0
}

function u16(v: number): Uint8Array {
  const b = new Uint8Array(2)
  new DataView(b.buffer).setUint16(0, v & 0xffff, true)
  return b
}
function u32(v: number): Uint8Array {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setUint32(0, v >>> 0, true)
  return b
}
function concat(parts: Uint8Array[]): Uint8Array {
  let len = 0
  for (const p of parts) len += p.length
  const out = new Uint8Array(len)
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

export type ZipEntry = { name: string; data: Uint8Array }

/** Build a ZIP (stored/uncompressed) Blob from the given entries. Empty list = valid empty zip. */
export function createZip(files: ZipEntry[]): Blob {
  const enc = new TextEncoder()
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  for (const f of files) {
    const name = enc.encode(f.name)
    const crc = crc32(f.data)
    const size = f.data.length
    const local = concat([
      u32(0x04034b50), // local file header signature
      u16(20), // version needed
      u16(0), // flags
      u16(0), // method: store
      u16(0), // mod time
      u16(0), // mod date
      u32(crc),
      u32(size), // compressed
      u32(size), // uncompressed
      u16(name.length),
      u16(0), // extra len
      name,
    ])
    parts.push(local, f.data)

    central.push(
      concat([
        u32(0x02014b50), // central dir signature
        u16(20), // version made by
        u16(20), // version needed
        u16(0), // flags
        u16(0), // method
        u16(0), // mod time
        u16(0), // mod date
        u32(crc),
        u32(size),
        u32(size),
        u16(name.length),
        u16(0), // extra
        u16(0), // comment
        u16(0), // disk start
        u16(0), // internal attrs
        u32(0), // external attrs
        u32(offset), // local header offset
        name,
      ])
    )
    offset += local.length + f.data.length
  }

  const cdStart = offset
  let cdSize = 0
  for (const c of central) cdSize += c.length
  const end = concat([
    u32(0x06054b50), // end of central dir signature
    u16(0), // disk
    u16(0), // cd start disk
    u16(files.length), // entries on disk
    u16(files.length), // total entries
    u32(cdSize),
    u32(cdStart),
    u16(0), // comment len
  ])

  return new Blob([...parts, ...central, end], { type: 'application/zip' })
}
