'use strict';
/* Updates: ask first, then check GitHub for a newer Opia for Android, download it, and hand it to Android's installer.
   The asking, the steps and the progress live here; the going online happens in the Android app (Updater.java). */

const Updates = {
  get on() { return Native.on && typeof OpiaAndroid.updateCheck === 'function'; },
  get consent() { return Prefs.get('upd-consent', null); },
  wait: {},     // the answers the Android side sends back, by name

  /* the question, asked before anything goes online */
  ask(first) {
    return new Promise(res => {
      let ok = false; const auto = h('input', { type: 'checkbox', checked: true, style: { width: '22px', height: '22px', accentColor: 'var(--acc)' } });
      const s = UI.sheet({ title: first ? t('New: updates from GitHub') : t('Check for updates?'), onclose: () => { Prefs.set('upd-consent', ok); Prefs.set('upd-auto', ok && auto.checked); res(ok); },
        body: h('div', {}, h('p', { style: { marginTop: 0 } }, t('To look for a new version, Opia needs to go online and ask GitHub, where Opia for Android is published.')),
          h('p', { style: { color: 'var(--dim)' } }, t('Nothing about you, your phone or your files is sent, and Opia doesn\'t go online for anything else.')),
          h('label', { style: { display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 800, minHeight: '44px' } }, auto, t('Check automatically once a day'))),
        acts: [h('button', { class: 'btn', onclick: () => s.close() }, t('Not now')), h('button', { class: 'btn primary', onclick: () => { ok = true; s.close(); } }, t('Allow'))] });
    });
  },
  /* call the Android side and wait for its answer */
  call(fn, answer, ...args) { return new Promise(res => { this.wait[answer] = res; OpiaAndroid[fn](...args); }); },
  checked(r) { const f = this.wait.checked; delete this.wait.checked; f && f(r); },
  downloaded(r) { const f = this.wait.downloaded; delete this.wait.downloaded; f && f(r); },
  progress([done, total]) { this.onprogress && this.onprogress(done, total); },
  kb: n => n < 1048576 ? Math.max(1, Math.round(n / 1024)) + ' KB' : (n / 1048576).toFixed(1) + ' MB',
  why(r) { return { offline: t('Could not reach GitHub. Check your connection and try again.'), limited: t('GitHub is limiting how often it can be asked. Try again in an hour.'), none: t('No version of Opia for Android has been published yet.') }[r.error] || r.error || t('Something went wrong.'); },

  async open() {
    if (!this.on) return UI.toast(t('Updates work in the Android app.'));
    if (!this.consent && !(await this.ask())) return;
    const done = UI.busy(t('Checking GitHub for updates…')); let r;
    try { r = await this.call('updateCheck', 'checked'); } finally { done(); }
    Prefs.set('upd-last', Date.now());
    if (!r.ok) return UI.toast(this.why(r), 'error');
    if (!r.available) return UI.toast(t('Opia is up to date ({v}).', { v: r.current }));
    this.offer(r);
  },

  offer(r) {
    const kb = this.kb, mb = r.patch && r.patchSize ? ` (${t('{s}, just the changes', { s: kb(r.patchSize) })})` : r.size ? ` (${kb(r.size)})` : '';
    const s = UI.sheet({ title: t('An update is ready'), body: h('div', {},
      h('p', { style: { marginTop: 0, fontWeight: 800, color: 'var(--hi)' } }, t('Opia {v} is ready to download', { v: r.latest }) + mb + '.'),
      r.notes && r.notes.length ? [h('div', { class: 'sec' }, t('What\'s new')), h('ul', { style: { margin: '0 0 12px', paddingLeft: '20px' } }, r.notes.map(n => h('li', {}, n)))] : null,
      h('p', { style: { color: 'var(--dim)' } }, t('Your photos, pictures, PDFs and songs are kept.'))),
      acts: [h('button', { class: 'btn', onclick: () => s.close() }, t('Later')), h('button', { class: 'btn primary', onclick: () => { s.close(); this.download(r); } }, t('Update now'))] });
  },

  async download(r) {
    const bar = h('i', { style: { display: 'block', height: '100%', width: '0', background: 'var(--acc)', borderRadius: '6px', transition: 'width .2s' } }), label = h('p', { style: { color: 'var(--dim)', margin: '10px 0 0' } }, '');
    const s = UI.sheet({ title: t('Downloading the update'), body: h('div', {}, h('div', { role: 'progressbar', 'aria-label': t('Downloading the update'), style: { height: '10px', borderRadius: '6px', background: 'var(--line)', overflow: 'hidden' } }, bar), label) });
    const kb = this.kb;
    this.onprogress = (d, tot) => { const p = tot ? d / tot : 0; bar.style.width = (p * 100).toFixed(1) + '%'; label.textContent = `${kb(d)} / ${kb(tot)}`; };
    const res = await this.call('updateDownload', 'downloaded', r.patch || r.url, r.url);
    this.onprogress = null; s.close();
    if (!res.ok) return UI.toast(this.why(res), 'error');
    Prefs.set('upd-ready', res.version);
    this.install();
  },

  /* Android's own installer finishes the job; the first time, it needs Opia to be allowed to install updates */
  install() {
    const first = !OpiaAndroid.canInstall();
    const s = UI.sheet({ title: first ? t('One more step') : t('Ready to install'), body: h('div', {},
      first ? h('ol', { style: { margin: '0 0 6px', paddingLeft: '20px', lineHeight: 1.6 } }, h('li', {}, t('Tap Continue.')), h('li', {}, t('Turn on Allow from this source.')), h('li', {}, t('Come back to Opia, and the update installs.')))
        : h('p', { style: { marginTop: 0 } }, t('Tap Install on the next screen. Opia closes for a moment while it updates.'))),
      acts: [h('button', { class: 'btn', onclick: () => s.close() }, t('Later')), h('button', { class: 'btn primary', onclick: () => { s.close(); this.pending = OpiaAndroid.updateInstall() === 'settings'; } }, first ? t('Continue') : t('Install'))] });
  },
  /* back from Android's settings: if Opia may install now, carry on */
  resumed() { if (this.pending && OpiaAndroid.canInstall()) { this.pending = false; OpiaAndroid.updateInstall(); } },

  /* at start: finish an update that was downloaded before Android restarted the app; ask once; the daily check */
  async boot() {
    if (!this.on) return;
    const ready = Prefs.get('upd-ready', null);
    if (ready) { Prefs.set('upd-ready', null); if (OpiaAndroid.version() !== ready) return this.install(); }
    if (this.consent === null) { await sleep(2500); if (Nav.stack.length) return; if (await this.ask(true)) this.open(); return; }
    if (!this.consent || !Prefs.get('upd-auto', false) || Date.now() - Prefs.get('upd-last', 0) < 864e5) return;
    const r = await this.call('updateCheck', 'checked'); Prefs.set('upd-last', Date.now());
    if (r.ok && r.available && !Nav.stack.length) this.offer(r);
  },

  /* the Updates part of Settings */
  settings(redraw) {
    if (!this.on) return null;
    const on = !!this.consent;
    const sw = h('input', { type: 'checkbox', checked: !!Prefs.get('upd-auto', false), disabled: !on, style: { width: '22px', height: '22px', accentColor: 'var(--acc)' }, onchange: () => Prefs.set('upd-auto', sw.checked) });
    return h('div', {}, h('div', { class: 'sec' }, t('Updates')),
      h('p', { style: { margin: '0 0 10px', color: 'var(--dim)' } }, on ? t('Opia may go online to check GitHub for updates.') : t('Opia doesn\'t go online.')),
      h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap' } }, h('button', { class: 'btn', onclick: () => { redraw(); this.open(); } }, t('Check for updates')),
        on ? h('button', { class: 'btn', onclick: () => { Prefs.set('upd-consent', false); Prefs.set('upd-auto', false); redraw(true); } }, t('Don\'t go online')) : null),
      on ? h('label', { style: { display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 800, minHeight: '44px', marginTop: '8px' } }, sw, t('Check automatically once a day')) : null);
  },
};
