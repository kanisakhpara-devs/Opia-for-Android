'use strict';
/* Home-screen widgets. They can't look inside the app's storage, so whenever photos, pictures, PDFs or songs change,
   this hands Android a few small pictures and a summary: photo-of-the-day candidates (favourites first), the latest
   favourites, the last three PDFs, and the last thing you worked on. Only pictures it doesn't have yet are sent. */

const Widgets = {
  timer: 0, busy: false, again: false,
  get on() { return Native.on && typeof OpiaAndroid.widgetData === 'function'; },
  soon() { if (!this.on) return; clearTimeout(this.timer); this.timer = setTimeout(() => this.sync(), 1500); },

  async sync() {
    if (this.busy) { this.again = true; return; }
    this.busy = true;
    try { await this.write(); } catch (e) { console.warn('widgets', e); } finally { this.busy = false; }
    if (this.again) { this.again = false; this.soon(); }
  },

  async write() {
    let have; try { have = new Set(JSON.parse(OpiaAndroid.widgetFiles())); } catch (e) { have = new Set(); }
    const put = async (name, make) => {
      if (!have.has(name)) { const blob = await make(); if (!blob) return null; const id = await Native.send(blob, name, blob.type || 'image/jpeg'); if (!OpiaAndroid.widgetSave(id, name)) return null; have.add(name); }
      return name;
    };
    const tag = s => String(s).replace(/[^A-Za-z0-9]/g, '');

    // photos: up to ten candidates for photo of the day, favourites first, then the best rated, then the newest
    const ps = Lens.photos.slice(), favs = ps.filter(p => p.fav).sort((a, b) => b.added - a.added);
    const rest = ps.filter(p => !p.fav).sort((a, b) => (b.rating || 0) - (a.rating || 0) || b.added - a.added);
    const photos = [];
    for (const p of [...favs, ...rest].slice(0, 10)) {
      const file = await put(`p-${tag(p.id)}-${p.v || 1}.jpg`, async () => canvasBlob(await Lens.developed(p, 720), 'image/jpeg', .86).catch(() => null));
      if (file) photos.push({ id: p.id, name: p.name.replace(/\.[^.]+$/, ''), fav: !!p.fav, file });
    }

    // the three latest PDFs, with the little page-one picture Folio keeps
    const docs = [];
    for (const d of Folio.docs.slice().sort((a, b) => b.updated - a.updated).slice(0, 3)) {
      const file = d.thumb ? await put(`d-${tag(d.id)}-${d.updated}.jpg`, async () => d.thumb) : null;
      docs.push({ id: d.id, name: d.name, pages: d.pages, file });
    }

    // the last picture, PDF or song you worked on
    const latest = [...Imagine.pics.map(x => ['picture', x]), ...Folio.docs.map(x => ['doc', x]), ...Groove.songs.map(x => ['song', x])].sort((a, b) => b[1].updated - a[1].updated)[0];
    let last = null;
    if (latest) {
      const [kind, x] = latest;
      const file = x.thumb ? await put(`l-${tag(x.id)}-${x.updated}.jpg`, async () => x.thumb) : null;
      const sub = kind === 'song' ? `${NOTE_NAMES[x.song.key]} ${(SCALE_NAMES[x.song.scale] || '').split(' (')[0]} · ${x.song.bpm} BPM` : kind === 'doc' ? plural(x.pages, '1 page', '{n} pages') : `${x.w} × ${x.h}`;
      last = { kind, id: x.id, name: x.name, sub, file };
    }

    OpiaAndroid.widgetData(JSON.stringify({ photos, favs: photos.filter(p => p.fav).slice(0, 4), docs, last, at: Date.now() }));
  },
};

/* anything saved or removed in these stores can change what a widget shows */
for (const k of ['put', 'del']) {
  const orig = DB[k].bind(DB);
  DB[k] = (store, x) => { const r = orig(store, x); if (['photos', 'pictures', 'docs', 'songs'].includes(store)) r.then(() => Widgets.soon(), () => {}); return r; };
}
