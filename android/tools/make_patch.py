"""Make an update patch from one Opia APK to the next, so a phone downloads only the difference (usually a few KB).

    python make_patch.py old.apk new.apk out.patch

The format is Opia's own (Patch.java reads it): the bsdiff algorithm, written as one gzip stream that Android can read
without extra libraries.
  "OPIAPAT1", old size (8 bytes), new size (8), SHA-256 of old (32), SHA-256 of new (32), then gzip of:
  number of steps (4), and per step: add (8), copy (8), seek (8), `add` bytes to add to the old file, `copy` new bytes.
The phone checks both hashes, so a patch only ever produces exactly the new APK, from exactly the old one.
"""
import gzip
import hashlib
import io
import struct
import sys

import bsdiff4.core


def make(old, new):
    ctrl, diff, extra = bsdiff4.core.diff(old, new)
    z = io.BytesIO()
    with gzip.GzipFile(fileobj=z, mode='wb', compresslevel=9, mtime=0) as g:
        g.write(struct.pack('>i', len(ctrl)))
        d = e = 0
        for add, copy, seek in ctrl:
            g.write(struct.pack('>qqq', add, copy, seek))
            g.write(diff[d:d + add]); d += add
            g.write(extra[e:e + copy]); e += copy
    head = b'OPIAPAT1' + struct.pack('>qq', len(old), len(new)) + hashlib.sha256(old).digest() + hashlib.sha256(new).digest()
    return head + z.getvalue()


def apply(old, patch):
    """The same steps as Patch.java, used here to check every patch before it is published."""
    assert patch[:8] == b'OPIAPAT1', 'not an Opia patch'
    old_len, new_len = struct.unpack('>qq', patch[8:24])
    assert old_len == len(old) and hashlib.sha256(old).digest() == patch[24:56], 'patch is for a different APK'
    g = io.BytesIO(gzip.decompress(patch[88:]))
    out, op, ip = bytearray(new_len), 0, 0
    for _ in range(struct.unpack('>i', g.read(4))[0]):
        add, copy, seek = struct.unpack('>qqq', g.read(24))
        chunk = g.read(add)
        for i in range(add):
            out[op + i] = (chunk[i] + (old[ip + i] if 0 <= ip + i < len(old) else 0)) & 0xFF
        op += add; ip += add
        out[op:op + copy] = g.read(copy); op += copy; ip += seek
    assert hashlib.sha256(out).digest() == patch[56:88], 'patched file does not match'
    return bytes(out)


if __name__ == '__main__':
    old, new = (open(p, 'rb').read() for p in sys.argv[1:3])
    patch = make(old, new)
    assert apply(old, patch) == new
    if len(patch) > len(new) // 2:
        sys.exit('%s: not worth it (%d bytes), the whole APK will be downloaded instead' % (sys.argv[3], len(patch)))
    open(sys.argv[3], 'wb').write(patch)
    print('%s: %d bytes (full APK %d)' % (sys.argv[3], len(patch), len(new)))
