package io.github.kanisakhpara.opia;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.BitmapShader;
import android.graphics.Canvas;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Shader;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Opia's home-screen widgets. The quotes come with the app; everything else (photos, PDFs, the last thing you made)
 * is what the app itself wrote to files/widgets/data.json the last time it ran, because a widget cannot reach inside the
 * app's storage. A tap opens the app at the right place through an opia:// link that MainActivity hands to the page.
 */
public final class Widgets {
    private Widgets() {}

    static final String NEXT_QUOTE = "io.github.kanisakhpara.opia.NEXT_QUOTE";
    static final Class<?>[] ALL = { QuoteCard.class, QuoteStrip.class, Photo.class, Favourites.class, Quick.class, RecentPdfs.class, Resume.class };

    static File dir(Context c) { File d = new File(c.getFilesDir(), "widgets"); d.mkdirs(); return d; }

    static JSONObject data(Context c) {
        try { return new JSONObject(read(new FileInputStream(new File(dir(c), "data.json")))); } catch (IOException | JSONException e) { return new JSONObject(); }
    }

    static String read(InputStream in) throws IOException {
        try (InputStream i = in; ByteArrayOutputStream o = new ByteArrayOutputStream()) {
            byte[] b = new byte[8192];
            for (int n; (n = i.read(b)) > 0; ) o.write(b, 0, n);
            return o.toString(StandardCharsets.UTF_8.name());
        }
    }

    /** redraw every Opia widget on the home screen, after the app has written new data */
    static void refreshAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        for (Class<?> k : ALL) {
            int[] ids = m.getAppWidgetIds(new ComponentName(c, k));
            if (ids.length == 0) continue;
            c.sendBroadcast(new Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE).setClass(c, k).putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids));
        }
    }

    /** a tap that opens the app at opia://<link>, for example lens/photo/123 */
    static PendingIntent open(Context c, String link) {
        Intent i = new Intent(c, MainActivity.class).setAction(Intent.ACTION_VIEW).setData(Uri.parse("opia://" + link))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(c, link.hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static long today() { return LocalDate.now().toEpochDay(); }

    /** the widget's size on screen in pixels, from what the launcher reports (portrait: min width, max height) */
    static int[] sizePx(Context c, Bundle o, int defW, int defH) {
        float d = c.getResources().getDisplayMetrics().density;
        boolean land = c.getResources().getConfiguration().orientation == Configuration.ORIENTATION_LANDSCAPE;
        int w = o == null ? 0 : o.getInt(land ? AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH : AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH);
        int h = o == null ? 0 : o.getInt(land ? AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT : AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT);
        return new int[] { Math.round((w > 0 ? w : defW) * d), Math.round((h > 0 ? h : defH) * d) };
    }

    /** one of the app's widget pictures, cut to the shape it is shown in and given rounded corners */
    static Bitmap picture(Context c, String name, int w, int h, float radiusDp) {
        if (name == null || name.isEmpty() || w <= 0 || h <= 0) return null;
        File f = new File(dir(c), name);
        if (!f.isFile()) return null;
        float r = radiusDp * c.getResources().getDisplayMetrics().density;
        int cap = 900;   // the home screen limits how much picture a widget may send it
        if (w > cap || h > cap) { float k = (float) cap / Math.max(w, h); w = Math.round(w * k); h = Math.round(h * k); r *= k; }
        BitmapFactory.Options o = new BitmapFactory.Options();
        o.inJustDecodeBounds = true;
        BitmapFactory.decodeFile(f.getPath(), o);
        int s = 1;
        while (o.outWidth / (s * 2) >= w && o.outHeight / (s * 2) >= h) s *= 2;
        o = new BitmapFactory.Options();
        o.inSampleSize = s;
        Bitmap src = BitmapFactory.decodeFile(f.getPath(), o);
        if (src == null) return null;
        Bitmap out = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        float k = Math.max((float) w / src.getWidth(), (float) h / src.getHeight());
        Matrix m = new Matrix();
        m.setScale(k, k);
        m.postTranslate((w - src.getWidth() * k) / 2f, (h - src.getHeight() * k) / 2f);
        BitmapShader sh = new BitmapShader(src, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP);
        sh.setLocalMatrix(m);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
        p.setShader(sh);
        new Canvas(out).drawRoundRect(new RectF(0, 0, w, h), r, r, p);
        src.recycle();
        return out;
    }

    /** every widget: draw it for each id, and again when it is resized */
    public abstract static class Base extends AppWidgetProvider {
        abstract RemoteViews build(Context c, int id, Bundle options);

        @Override
        public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
            for (int id : ids) {
                try { m.updateAppWidget(id, build(c, id, m.getAppWidgetOptions(id))); } catch (RuntimeException e) { /* a bad file must not take the home screen down */ }
            }
        }

        @Override
        public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, Bundle options) {
            try { m.updateAppWidget(id, build(c, id, options)); } catch (RuntimeException e) { /* as above */ }
        }
    }

    /* ---- quotes: one a day, the same on every widget, and a tap moves this widget on to another */
    static List<JSONObject> quotes;

    static synchronized List<JSONObject> quotes(Context c) {
        if (quotes == null) {
            quotes = new ArrayList<>();
            try {
                JSONArray a = new JSONArray(read(c.getResources().openRawResource(R.raw.quotes)));
                for (int i = 0; i < a.length(); i++) quotes.add(a.getJSONObject(i));
            } catch (IOException | JSONException e) { /* the list is part of the app; this does not happen */ }
        }
        return quotes;
    }

    public abstract static class Quote extends Base {
        abstract int layout();
        abstract boolean shortOnly();

        static SharedPreferences prefs(Context c) { return c.getSharedPreferences("quotes", Context.MODE_PRIVATE); }

        JSONObject pick(Context c, int id) {
            List<JSONObject> all = quotes(c), list = new ArrayList<>();
            for (JSONObject q : all) if (!shortOnly() || q.optString("q").length() <= 56) list.add(q);
            if (list.isEmpty()) return new JSONObject();
            long n = today() * 7 + prefs(c).getInt("skip" + id, 0);   // a stride of 7 so neighbouring days aren't neighbours in the list
            return list.get((int) (Math.floorMod(n, (long) list.size())));
        }

        @Override
        RemoteViews build(Context c, int id, Bundle o) {
            JSONObject q = pick(c, id);
            RemoteViews v = new RemoteViews(c.getPackageName(), layout());
            String by = q.optString("by"), src = q.optString("src");
            v.setTextViewText(R.id.quote, q.optString("q"));
            v.setContentDescription(R.id.quote, q.optString("q") + " " + by + ". " + c.getString(R.string.another_quote));
            if (layout() == R.layout.widget_quote_card) { v.setTextViewText(R.id.by, by); v.setTextViewText(R.id.src, src); }
            else v.setTextViewText(R.id.by, "— " + by);
            Intent next = new Intent(c, getClass()).setAction(NEXT_QUOTE).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id);
            PendingIntent tap = PendingIntent.getBroadcast(c, id, next, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            v.setOnClickPendingIntent(layout() == R.layout.widget_quote_card ? R.id.quote : R.id.text, tap);
            v.setOnClickPendingIntent(R.id.logo, open(c, "lens"));
            return v;
        }

        @Override
        public void onReceive(Context c, Intent i) {
            if (NEXT_QUOTE.equals(i.getAction())) {
                int id = i.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
                if (id == AppWidgetManager.INVALID_APPWIDGET_ID) return;
                prefs(c).edit().putInt("skip" + id, prefs(c).getInt("skip" + id, 0) + 1).apply();
                AppWidgetManager m = AppWidgetManager.getInstance(c);
                m.updateAppWidget(id, build(c, id, m.getAppWidgetOptions(id)));
                return;
            }
            super.onReceive(c, i);
        }

        @Override
        public void onDeleted(Context c, int[] ids) {
            SharedPreferences.Editor e = prefs(c).edit();
            for (int id : ids) e.remove("skip" + id);
            e.apply();
        }
    }

    public static class QuoteCard extends Quote {
        @Override int layout() { return R.layout.widget_quote_card; }
        @Override boolean shortOnly() { return false; }
    }

    public static class QuoteStrip extends Quote {
        @Override int layout() { return R.layout.widget_quote_strip; }
        @Override boolean shortOnly() { return true; }
    }

    /* ---- photo of the day: favourites first, a different one each day */
    public static class Photo extends Base {
        @Override
        RemoteViews build(Context c, int id, Bundle o) {
            RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_photo);
            JSONArray photos = data(c).optJSONArray("photos");
            List<JSONObject> favs = new ArrayList<>(), all = new ArrayList<>();
            for (int i = 0; photos != null && i < photos.length(); i++) { JSONObject p = photos.optJSONObject(i); if (p == null) continue; all.add(p); if (p.optBoolean("fav")) favs.add(p); }
            List<JSONObject> from = favs.isEmpty() ? all : favs;
            Bitmap b = null;
            JSONObject p = null;
            if (!from.isEmpty()) {
                p = from.get((int) Math.floorMod(today(), (long) from.size()));
                int[] s = sizePx(c, o, 170, 170);
                b = picture(c, p.optString("file"), s[0], s[1], 24);
            }
            boolean has = b != null;
            v.setViewVisibility(R.id.empty, has ? View.GONE : View.VISIBLE);
            for (int k : new int[] { R.id.photo, R.id.scrim, R.id.caption }) v.setViewVisibility(k, has ? View.VISIBLE : View.GONE);
            if (has) {
                v.setImageViewBitmap(R.id.photo, b);
                v.setTextViewText(R.id.name, p.optString("name"));
                v.setContentDescription(R.id.root, c.getString(R.string.w_photo) + ": " + p.optString("name"));
                v.setOnClickPendingIntent(R.id.root, open(c, "lens/photo/" + p.optString("id")));
            } else v.setOnClickPendingIntent(R.id.root, open(c, "lens/add"));
            v.setOnClickPendingIntent(R.id.logo, open(c, "lens"));
            return v;
        }
    }

    /* ---- the four latest favourites */
    public static class Favourites extends Base {
        static final int[] CELLS = { R.id.fav0, R.id.fav1, R.id.fav2, R.id.fav3 };

        @Override
        RemoteViews build(Context c, int id, Bundle o) {
            RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_favs);
            JSONArray favs = data(c).optJSONArray("favs");
            int n = favs == null ? 0 : Math.min(4, favs.length());
            int[] s = sizePx(c, o, 280, 70);
            float d = c.getResources().getDisplayMetrics().density;
            int cw = Math.max(1, Math.round((s[0] - 36 * d) / 4)), ch = Math.max(1, Math.round(s[1] - 18 * d));
            int shown = 0;
            for (int i = 0; i < 4; i++) {
                JSONObject p = i < n ? favs.optJSONObject(i) : null;
                Bitmap b = p == null ? null : picture(c, p.optString("file"), cw, ch, 16);
                v.setViewVisibility(CELLS[i], b != null ? View.VISIBLE : View.INVISIBLE);
                if (b == null) continue;
                shown++;
                v.setImageViewBitmap(CELLS[i], b);
                v.setContentDescription(CELLS[i], p.optString("name"));
                v.setOnClickPendingIntent(CELLS[i], open(c, "lens/photo/" + p.optString("id")));
            }
            v.setViewVisibility(R.id.row, shown > 0 ? View.VISIBLE : View.GONE);
            v.setViewVisibility(R.id.empty, shown > 0 ? View.GONE : View.VISIBLE);
            v.setOnClickPendingIntent(R.id.empty, open(c, "lens"));
            return v;
        }
    }

    /* ---- quick create */
    public static class Quick extends Base {
        @Override
        RemoteViews build(Context c, int id, Bundle o) {
            RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_quick);
            v.setOnClickPendingIntent(R.id.q0, open(c, "lens/add"));
            v.setOnClickPendingIntent(R.id.q1, open(c, "imagine/new"));
            v.setOnClickPendingIntent(R.id.q2, open(c, "folio/open"));
            v.setOnClickPendingIntent(R.id.q3, open(c, "groove/start"));
            return v;
        }
    }

    /* ---- the last three PDFs */
    public static class RecentPdfs extends Base {
        static final int[] ROWS = { R.id.row0, R.id.row1, R.id.row2 }, THUMBS = { R.id.thumb0, R.id.thumb1, R.id.thumb2 },
            NAMES = { R.id.name0, R.id.name1, R.id.name2 }, METAS = { R.id.meta0, R.id.meta1, R.id.meta2 };

        @Override
        RemoteViews build(Context c, int id, Bundle o) {
            RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_pdfs);
            JSONArray docs = data(c).optJSONArray("docs");
            int n = docs == null ? 0 : Math.min(3, docs.length());
            float d = c.getResources().getDisplayMetrics().density;
            for (int i = 0; i < 3; i++) {
                JSONObject doc = i < n ? docs.optJSONObject(i) : null;
                v.setViewVisibility(ROWS[i], doc != null ? View.VISIBLE : View.GONE);
                if (doc == null) continue;
                int pages = doc.optInt("pages");
                v.setTextViewText(NAMES[i], doc.optString("name"));
                v.setTextViewText(METAS[i], pages == 1 ? c.getString(R.string.one_page) : c.getString(R.string.pages, pages));
                Bitmap b = picture(c, doc.optString("file"), Math.round(30 * d), Math.round(40 * d), 4);
                if (b != null) v.setImageViewBitmap(THUMBS[i], b); else v.setImageViewResource(THUMBS[i], R.drawable.ws_folio);
                v.setOnClickPendingIntent(ROWS[i], open(c, "folio/doc/" + doc.optString("id")));
            }
            v.setViewVisibility(R.id.empty, n > 0 ? View.GONE : View.VISIBLE);
            v.setOnClickPendingIntent(R.id.head, open(c, "folio"));
            v.setOnClickPendingIntent(R.id.empty, open(c, "folio/open"));
            return v;
        }
    }

    /* ---- the last thing you worked on */
    public static class Resume extends Base {
        @Override
        RemoteViews build(Context c, int id, Bundle o) {
            RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_resume);
            JSONObject last = data(c).optJSONObject("last");
            if (last == null) {
                for (int k : new int[] { R.id.preview, R.id.big, R.id.scrim, R.id.caption }) v.setViewVisibility(k, View.GONE);
                v.setViewVisibility(R.id.empty, View.VISIBLE);
                v.setOnClickPendingIntent(R.id.root, open(c, "imagine"));
                return v;
            }
            String kind = last.optString("kind"), lid = last.optString("id");
            int icon = "doc".equals(kind) ? R.drawable.ws_folio : "song".equals(kind) ? R.drawable.ws_groove : R.drawable.ws_imagine;
            int[] s = sizePx(c, o, 170, 170);
            Bitmap b = picture(c, last.optString("file"), s[0], s[1], 24);
            v.setViewVisibility(R.id.empty, View.GONE);
            v.setViewVisibility(R.id.preview, b != null ? View.VISIBLE : View.GONE);
            v.setViewVisibility(R.id.big, b != null ? View.GONE : View.VISIBLE);
            if (b != null) v.setImageViewBitmap(R.id.preview, b); else v.setImageViewResource(R.id.big, icon);
            v.setImageViewResource(R.id.kind, icon);
            v.setTextViewText(R.id.name, last.optString("name"));
            String sub = last.optString("sub");
            v.setViewVisibility(R.id.sub, sub.isEmpty() ? View.GONE : View.VISIBLE);
            v.setTextViewText(R.id.sub, sub);
            String what = c.getString("doc".equals(kind) ? R.string.kind_doc : "song".equals(kind) ? R.string.kind_song : R.string.kind_picture);
            v.setContentDescription(R.id.root, c.getString(R.string.w_resume) + ": " + what + ", " + last.optString("name"));
            String link = "doc".equals(kind) ? "folio/doc/" : "song".equals(kind) ? "groove/song/" : "imagine/pic/";
            v.setOnClickPendingIntent(R.id.root, open(c, link + lid));
            return v;
        }
    }
}
