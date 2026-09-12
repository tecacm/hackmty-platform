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

/**
 * Streaming ZIP writer (STORE): writes each entry straight to a sink (e.g. a File System
 * Access writable stream) so files aren't all held in memory. Call add() per file (serially),
 * then finish(). Only the central-directory metadata (tiny) is retained.
 */
export class ZipStreamer {
  private enc = new TextEncoder()
  private central: Uint8Array[] = []
  private offset = 0
  count = 0

  constructor(private sink: (chunk: Uint8Array) => Promise<void> | void) {}

  async add(name: string, data: Uint8Array): Promise<void> {
    const nameBytes = this.enc.encode(name)
    const crc = crc32(data)
    const size = data.length
    const local = concat([
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(size), u32(size), u16(nameBytes.length), u16(0), nameBytes,
    ])
    await this.sink(local)
    await this.sink(data)
    this.central.push(
      concat([
        u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
        u32(crc), u32(size), u32(size), u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0),
        u32(0), u32(this.offset), nameBytes,
      ])
    )
    this.offset += local.length + size
    this.count++
  }

  async finish(): Promise<void> {
    const cdStart = this.offset
    let cdSize = 0
    for (const c of this.central) cdSize += c.length
    for (const c of this.central) await this.sink(c)
    await this.sink(
      concat([u32(0x06054b50), u16(0), u16(0), u16(this.count), u16(this.count), u32(cdSize), u32(cdStart), u16(0)])
    )
  }
}
