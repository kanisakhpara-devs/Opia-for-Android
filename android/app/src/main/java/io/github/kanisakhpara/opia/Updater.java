package io.github.kanisakhpara.opia;

import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.file.Files;

/**
 * Asks GitHub for the newest Opia for Android and downloads it. This is the only code in the app that goes online, and it
 * only talks to this app's own releases on GitHub. When the release has a patch from the installed version, only that
 * is downloaded and the new APK is rebuilt from the installed one (see Patch.java). Nothing about you or your files is sent. Results go back to the page as JSON.
 */
final class Updater {
    private Updater() {}

    static final String REPO = "kanisakhpara-devs/Opia-for-Android";
    static final String APK = "opia-update.apk";
    private static final String RELEASES = "https://github.com/" + REPO + "/releases/download/";

    interface Progress { void at(long done, long total); }

    static File apk(Context c) { File d = new File(c.getCacheDir(), "out"); d.mkdirs(); return new File(d, APK); }

    static HttpURLConnection open(String url) throws IOException {
        HttpURLConnection h = (HttpURLConnection) new URL(url).openConnection();
        h.setConnectTimeout(15000);
        h.setReadTimeout(30000);
        h.setInstanceFollowRedirects(true);
        h.setRequestProperty("User-Agent", "Opia-for-Android-updater");
        h.setRequestProperty("Accept", "application/vnd.github+json");
        return h;
    }

    static int[] parts(String v) {
        String[] p = v.replaceFirst("^[vV]", "").split("\\.");
        int[] out = new int[3];
        for (int i = 0; i < Math.min(3, p.length); i++) try { out[i] = Integer.parseInt(p[i].replaceAll("[^0-9]", "")); } catch (NumberFormatException e) { out[i] = 0; }
        return out;
    }

    static boolean newer(String latest, String current) {
        int[] a = parts(latest), b = parts(current);
        for (int i = 0; i < 3; i++) if (a[i] != b[i]) return a[i] > b[i];
        return false;
    }

    static long code(Context c) {
        try { return c.getPackageManager().getPackageInfo(c.getPackageName(), 0).getLongVersionCode(); } catch (PackageManager.NameNotFoundException e) { return -1; }
    }

    static String current(Context c) {
        try { return c.getPackageManager().getPackageInfo(c.getPackageName(), 0).versionName; } catch (PackageManager.NameNotFoundException e) { return ""; }
    }

    static String error(String message) {
        try { return new JSONObject().put("ok", false).put("error", message).toString(); } catch (JSONException e) { return "{\"ok\":false}"; }
    }

    /** {ok, available, current, latest, url, size, patch, patchSize, notes[]}: `patch` is set when the release has one from this version */
    static String check(Context c) {
        HttpURLConnection h = null;
        try {
            h = open("https://api.github.com/repos/" + REPO + "/releases/latest");
            int code = h.getResponseCode();
            if (code == 404) return error("none");
            if (code == 403 || code == 429) return error("limited");
            if (code != 200) return error("http " + code);
            JSONObject rel = new JSONObject(Widgets.read(h.getInputStream()));
            String latest = rel.optString("tag_name"), cur = current(c), url = "", patch = "", patchName = "Opia-from-" + code(c) + ".patch";
            long size = 0, patchSize = 0;
            JSONArray assets = rel.optJSONArray("assets");
            for (int i = 0; assets != null && i < assets.length(); i++) {
                JSONObject a = assets.getJSONObject(i);
                if ("Opia.apk".equalsIgnoreCase(a.optString("name"))) { url = a.optString("browser_download_url"); size = a.optLong("size"); }
                if (patchName.equalsIgnoreCase(a.optString("name"))) { patch = a.optString("browser_download_url"); patchSize = a.optLong("size"); }
            }
            JSONArray notes = new JSONArray();
            for (String line : rel.optString("body").split("\n")) { String t = line.replaceAll("^[\\s*#-]+", "").trim(); if (!t.isEmpty() && notes.length() < 10) notes.put(t); }
            return new JSONObject().put("ok", true).put("available", !url.isEmpty() && newer(latest, cur)).put("current", cur).put("latest", latest.replaceFirst("^v", ""))
                .put("url", url).put("size", size).put("patch", patch).put("patchSize", patchSize).put("notes", notes).toString();
        } catch (IOException e) {
            return error("offline");
        } catch (JSONException e) {
            return error("GitHub's answer could not be read.");
        } finally {
            if (h != null) h.disconnect();
        }
    }

    /** downloads `url` into `to`, reporting progress; null when it worked, otherwise why not */
    static String fetch(String url, File to, Progress progress) throws IOException {
        HttpURLConnection h = open(url);
        try {
            h.setRequestProperty("Accept", "application/octet-stream");
            if (h.getResponseCode() != 200) return "http " + h.getResponseCode();
            long total = h.getContentLengthLong(), done = 0, shown = 0;
            try (InputStream in = h.getInputStream(); OutputStream o = new FileOutputStream(to)) {
                byte[] buf = new byte[1 << 16];
                for (int n; (n = in.read(buf)) > 0; ) {
                    o.write(buf, 0, n);
                    done += n;
                    if (done - shown > 256 * 1024) { shown = done; progress.at(done, total); }
                }
            }
            progress.at(done, total);
            return total > 0 && done != total ? "The download was incomplete." : null;
        } finally {
            h.disconnect();
        }
    }

    /** downloads the patch and rebuilds the new APK from the installed one into `to`; false if the patch can't be used */
    static boolean patch(Context c, String url, File to, Progress progress) {
        File p = new File(to.getPath() + ".patch");
        try {
            if (fetch(url, p, progress) != null) return false;
            byte[] installed = Files.readAllBytes(new File(c.getApplicationInfo().sourceDir).toPath());
            byte[] apk = Patch.apply(installed, new ByteArrayInputStream(Files.readAllBytes(p.toPath())));
            try (OutputStream o = new FileOutputStream(to)) { o.write(apk); }
            return true;
        } catch (IOException | RuntimeException e) {
            to.delete();
            return false;
        } finally {
            p.delete();
        }
    }

    /** gets the update (from the patch when there is one, otherwise the whole APK at `full`) and checks it is a newer Opia
        before anything is installed: {ok, version, patched} or {ok:false, error} */
    static String download(Context c, String url, String full, Progress progress) {
        File out = apk(c), part = new File(out.getPath() + ".part");
        try {
            boolean patched = url != null && url.startsWith(RELEASES) && url.endsWith(".patch") && patch(c, url, part, progress);
            if (!patched) {
                if (url != null && url.endsWith(".patch")) url = full;      // the patch didn't work out: get the whole APK
                if (url == null || !url.startsWith(RELEASES)) return error("That download isn't from Opia's releases.");
                String why = fetch(url, part, progress);
                if (why != null) { part.delete(); return error(why); }
            }
            PackageManager pm = c.getPackageManager();
            PackageInfo got = pm.getPackageArchiveInfo(part.getPath(), 0), mine = pm.getPackageInfo(c.getPackageName(), 0);
            if (got == null || !c.getPackageName().equals(got.packageName)) { part.delete(); return error("The download isn't Opia, so it was not installed."); }
            if (got.getLongVersionCode() <= mine.getLongVersionCode()) { part.delete(); return error("The download isn't newer than this version."); }
            out.delete();
            if (!part.renameTo(out)) return error("The download could not be kept.");
            return new JSONObject().put("ok", true).put("version", got.versionName).put("patched", patched).toString();
        } catch (IOException | PackageManager.NameNotFoundException | JSONException e) {
            part.delete();
            return error("offline");
        }
    }
}
