package io.github.kanisakhpara.opia;

import java.io.DataInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.zip.GZIPInputStream;

/**
 * Rebuilds the new APK from the one installed and a small update patch, so an update downloads only what changed.
 * The patch is made by android/tools/make_patch.py (the format is described there). It names the exact APK it starts
 * from and the exact APK it makes, by SHA-256, so it can't produce anything else: any mismatch is an IOException and
 * the updater downloads the whole APK instead.
 */
final class Patch {
    private Patch() {}

    private static final byte[] MAGIC = "OPIAPAT1".getBytes(StandardCharsets.US_ASCII);

    static byte[] sha256(byte[] b) {
        try { return MessageDigest.getInstance("SHA-256").digest(b); } catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }

    static byte[] apply(byte[] old, InputStream patch) throws IOException {
        DataInputStream in = new DataInputStream(patch);
        byte[] magic = new byte[8], oldSha = new byte[32], newSha = new byte[32];
        in.readFully(magic);
        if (!Arrays.equals(magic, MAGIC)) throw new IOException("not an Opia patch");
        long oldLen = in.readLong(), newLen = in.readLong();
        in.readFully(oldSha);
        in.readFully(newSha);
        if (old.length != oldLen || !Arrays.equals(sha256(old), oldSha)) throw new IOException("the patch is for a different version");
        if (newLen < 0 || newLen > 512L * 1024 * 1024) throw new IOException("bad patch");
        byte[] out = new byte[(int) newLen];
        DataInputStream z = new DataInputStream(new GZIPInputStream(in, 1 << 16));
        int op = 0;
        long ip = 0;
        for (int steps = z.readInt(); steps > 0; steps--) {
            long add = z.readLong(), copy = z.readLong(), seek = z.readLong();
            if (add < 0 || copy < 0 || op + add + copy > out.length) throw new IOException("bad patch");
            z.readFully(out, op, (int) add);            // the difference from the old bytes...
            for (int i = 0; i < add; i++) {
                long at = ip + i;
                if (at >= 0 && at < old.length) out[op + i] += old[(int) at];   // ...plus the old bytes
            }
            op += add;
            ip += add;
            z.readFully(out, op, (int) copy);           // bytes that are simply new
            op += copy;
            ip += seek;
        }
        if (op != out.length || !Arrays.equals(sha256(out), newSha)) throw new IOException("the rebuilt update doesn't match");
        return out;
    }
}
