'use strict';
/* Opia for Android website: theme and language switches, phones that drop onto the desk and settle as you scroll,
   handwritten notes that write themselves, and a little drift on the desk as the page moves. */

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private window: the choice lasts this visit */ } } };
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const html = document.documentElement;

/* ---- Spanish; the page is written in English */
const ES = {
  skip: 'Saltar al contenido', 'nav.ws': 'Espacios', 'nav.install': 'Instalar', 'nav.private': 'Privacidad', 'nav.faq': 'Preguntas', 'nav.download': 'Descargar',
  'hero.k': 'Opia para Android', 'hero.title': 'Opia, en tu bolsillo<span class="dot" aria-hidden="true"></span>',
  'hero.sub': 'Lens, Imagine, Folio y Groove, hechos para tu pulgar. Fotos, imágenes, PDF y canciones, todo guardado en tu teléfono. Sin cuenta y sin nube. Solo se conecta para buscar actualizaciones, y solo si tú quieres.',
  'hero.download': 'Descargar el APK', 'hero.github': 'Ver en GitHub', 'hero.note': '↓ cuatro espacios, un teléfono',
  'hero.c1': 'Lens · todo el viaje', 'hero.c2': 'Imagine · portada', 'hero.c3': 'Folio · firmado en el autobús', 'hero.c4': 'Groove · lo-fi, 78 bpm',
  'ix.1': 'fotos', 'ix.2': 'imágenes', 'ix.3': 'PDF', 'ix.4': 'música',
  'lens.k': 'Lens · fotos', 'lens.h': 'Cada foto, puntuada y revelada.', 'lens.p': 'Trae fotos con el selector del propio teléfono. Puntúalas, guarda favoritas y revélalas: luz, color, filtros, recorte y enderezado. Mantén pulsada la foto para ver el original; nunca cambia.',
  'lens.1': '14 ajustes y 10 filtros', 'lens.2': 'Recorte con proporciones fijas, girar, voltear, enderezar', 'lens.3': 'Guarda una copia directamente en tu galería', 'lens.m': '← calidez +34, intensidad +28', 'lens.c': 'colinas doradas, más cálidas',
  'imagine.k': 'Imagine · imágenes', 'imagine.h': 'Capas que mueves con un dedo.', 'imagine.p': 'Empieza con una foto o una página en blanco y añade texto, pegatinas y dibujos. Arrastra para mover y pellizca para cambiar el tamaño y girar. Cada capa sigue siendo editable.',
  'imagine.1': 'Cinco fuentes, colores y una etiqueta tras el texto', 'imagine.2': 'Las fotos de Lens llegan con sus ajustes', 'imagine.3': 'Exporta en PNG o JPEG', 'imagine.m': '← pellizca, gira, listo', 'imagine.c': 'tres capas, aún editables',
  'folio.k': 'Folio · PDF', 'folio.h': 'Rellénalo y fírmalo, en el autobús.', 'folio.p': 'Abre un PDF, rellena su formulario, firma con el dedo, resalta y añade texto. Gira, reordena o elimina páginas, y guárdalo o compártelo desde la app.',
  'folio.1': 'Campos de formulario reales: texto, casillas y listas', 'folio.2': 'Tu firma, guardada para la próxima vez', 'folio.3': 'Vuelve al original cuando quieras', 'folio.m': '← ¡firmado!', 'folio.c': 'formulario del viaje, relleno',
  'groove.k': 'Groove · música', 'groove.h': 'Una canción con un toque. Luego hazla tuya.', 'groove.p': 'Elige un estilo y Opia escribe batería, bajo, acordes y melodía que encajan. Cambia cualquier parte en una cuadrícula de pasos, cambia instrumentos y canta encima.',
  'groove.1': 'El mismo motor de música e instrumentos reales que en Windows', 'groove.2': 'Seis estilos, todas las tonalidades y escalas', 'groove.3': 'Graba tu voz y guarda en WAV', 'groove.m': '← siempre suena afinada', 'groove.c': 'la melodía, nota a nota',
  'box.k': 'También en la app', 'box.h': 'Detalles que la hacen agradable.',
  'b1.t': 'Claro y oscuro.', 'b1.p': 'Sigue a tu teléfono, o eliges tú.', 'b2.t': 'Inglés y español.', 'b2.p': 'Cámbialo cuando quieras en Ajustes.',
  'b3.t': 'Un botón Atrás con sentido.', 'b3.p': 'Cierra primero la hoja o pantalla de arriba.', 'b4.t': 'Nombres para TalkBack.', 'b4.p': 'Cada botón y control tiene un nombre hablado.',
  'b5.t': 'Guarda donde miras.', 'b5.p': 'Imágenes, Música y Descargas, en una carpeta Opia.', 'b6.t': 'Pequeña.', 'b6.p': 'Unos 6 MB, con muestras de instrumentos reales dentro.',
  'i.k': 'Instalar', 'i.h': 'Tres toques, sin tienda.',
  'i1.h': 'Descarga', 'i1.p': 'En tu teléfono, toca Descargar. Es un solo archivo, Opia.apk, de unos 6 MB.',
  'i2.h': 'Ábrelo', 'i2.p': 'Abre el archivo descargado. Android pide una vez permitir que tu navegador instale apps; acéptalo.',
  'i3.h': 'Listo', 'i3.p': 'Opia está en tu pantalla de inicio. Las versiones nuevas se instalan encima y tu trabajo se queda.',
  'i4.p': '¿En un ordenador? Escanéalo con la cámara del teléfono.',
  'i.warn': 'Opia no está en Play Store, así que Play Protect puede decir que no reconoce la app. Lo dice de cualquier app instalada fuera de la tienda. Instala Opia solo desde esta página o desde sus Releases en GitHub. Necesita Android 10 o posterior.',
  'st.ring': 'SE QUEDA EN TU TELÉFONO · SE QUEDA EN TU TELÉFONO · ',
  'p.k': 'Privada desde el diseño', 'p.h': 'Sin conexión, salvo que tú digas lo contrario.',
  'p.p': 'Tus fotos, imágenes, PDF y canciones se quedan en el almacenamiento de la app hasta que guardes o compartas una copia. Opia solo se conecta para una cosa: buscar en GitHub una versión nueva de sí misma, después de preguntarte y de que digas que sí. Puedes desactivarlo en Ajustes. Lo único más que pide es el micrófono, cuando grabas en Groove.',
  'p.m': 'sin cuenta · sin anuncios · sin rastreo',
  'q.h': 'Preguntas, con respuestas sinceras.',
  q1: '¿Está en Play Store?', a1: 'Todavía no. Instalas el APK desde esta página. Play Protect puede avisar de que no reconoce la app; lo dice de cualquier app de fuera de la tienda.',
  q2: '¿En qué teléfonos funciona?', a2: 'Android 10 o posterior. Es nueva: se ha compilado y probado a tamaño de teléfono en un navegador, y los teléfonos reales son la siguiente prueba. Si algo se ve mal, abre una incidencia en GitHub con una captura.',
  q3: '¿Es lo mismo que Opia para Windows?', a3: 'Comparte el aspecto, los nombres y el motor de música de Groove, pero es su propia app, hecha para el tacto. Lens, Imagine y Folio hacen menos que en Windows, y aún no hay Motion (vídeo).',
  q8: '¿Cómo funcionan las actualizaciones?', a8: 'La primera vez que la abres, Opia pregunta si puede buscar versiones nuevas en GitHub. Si dices que sí, lo comprueba una vez al día (o cuando tocas Buscar actualizaciones en Ajustes), te muestra las novedades, descarga la actualización y se la pasa al instalador de Android. Tocas Instalar y tu trabajo se conserva. La primera vez, Android también te pide permitir que Opia instale actualizaciones.',
  q4: '¿Se sincroniza con mi ordenador?', a4: 'No. Nada sale del teléfono a menos que guardes o compartas una copia. Pasa los archivos al ordenador como lo hagas normalmente.',
  q5: '¿Actualizar borrará mi trabajo?', a5: 'No. Las versiones nuevas se instalan encima y lo conservan todo. Desinstalar la app o borrar su almacenamiento sí lo borra, así que guarda copias de lo que quieras conservar.',
  q6: '¿Es gratis?', a6: 'Sí. No hay nada que pagar ni cuenta que crear. El proyecto aún no ha elegido una licencia de código abierto, así que por ahora el código se comparte para verlo y compilarlo, no para reutilizarlo.',
  q7: '¿Qué no puede hacer?', a7: 'Las fotos HEIC y RAW casi nunca se abren, el texto añadido a los PDF solo tiene letras de Europa occidental, y las grabaciones de voz se alinean bien pero no perfectamente. El README enumera todos los límites.',
  'd.h': 'Consigue Opia para Android', 'd.p': 'Gratis, para Android 10 y posteriores.', 'd.btn': 'Descargar Opia.apk',
  'd.note': 'Todas las versiones están en la <a href="https://github.com/kanisakhpara-devs/Opia-for-Android/releases">página de versiones</a>. ¿Prefieres el ordenador? <a href="https://kanisakhpara-devs.github.io/Opia-for-Windows/">Opia para Windows</a> tiene los cinco espacios, Motion incluido.',
  'ft.p': 'Opia para Android. Crea cosas. Que sigan siendo tuyas.', 'ft.changelog': 'Registro de cambios', 'ft.releases': 'Versiones',
  'ft.c1': 'Los PDF se muestran con pdf.js (Apache 2.0) y se modifican con pdf-lib (MIT).',
  'ft.c2': 'Muestras de instrumentos: SoundFont Fluid R3 GM, CC BY 3.0. Tipografías: Nunito y Caveat, SIL Open Font License.',
  'ft.c3': 'Las imágenes de las capturas se generaron para esta página; no son fotos reales.',
  'i1.p': 'En tu teléfono, toca Descargar. Es un solo archivo, Opia.apk, de unos 6 MB, y es el instalador. Esta página te muestra qué tocar después.',
  'g.close': 'Cerrar', 'g.k': 'Instalar Opia', 'g.h': 'Opia.apk se está descargando.', 'g.sub': 'El archivo que acabas de descargar es el instalador. Esto es lo que mostrará tu teléfono, y qué tocar.',
  'g1.h': 'Abre el archivo', 'g1.p': 'Al terminar, aparece una barra en la parte de abajo de la pantalla. Toca <b>Abrir</b>. ¿No la viste? Abre la app <b>Archivos</b>, ve a <b>Descargas</b> y toca <b>Opia.apk</b>.',
  'g2.h': 'Deja que tu navegador instale apps', 'g2.p': 'Solo la primera vez. Android dice que no puede instalar apps de esta fuente: toca <b>Ajustes</b>, activa <b>Permitir de esta fuente</b> y vuelve atrás.',
  'g2.m': 'Por tu seguridad, tu teléfono no puede instalar aplicaciones desconocidas de esta fuente.', 'g2.t': 'Permitir de esta fuente',
  'g3.h': 'Toca Instalar', 'g3.p': 'Si Play Protect avisa de que no reconoce la app, toca <b>Más detalles</b> y luego <b>Instalar de todos modos</b>. Lo dice de todas las apps de fuera de Play Store.',
  'g3.m': '¿Quieres instalar esta aplicación?', 'g4.h': 'Abre Opia', 'g4.p': 'Está en tu pantalla de inicio y en la lista de apps. La próxima vez, la versión nueva se instala encima y conserva tu trabajo.',
  'g.again': '¿No se descargó nada?', 'g.retry': 'Descárgalo otra vez',
  'm.open': 'Abrir', 'm.cancel': 'Cancelar', 'm.settings': 'Ajustes', 'm.install': 'Instalar',
  'gd.h': 'Opia va en tu teléfono.', 'gd.p': 'Apunta la cámara del teléfono a este código para descargarlo allí. Luego sigue los pasos que muestre tu teléfono; esta página te guía si la abres en el teléfono.',
  'gd.anyway': 'Descargar el archivo en este ordenador de todos modos',
  'gi.h': 'Esta es para teléfonos Android.', 'gi.p': 'Opia para Android no se puede instalar en un iPhone ni un iPad. En un ordenador está <a href="https://kanisakhpara-devs.github.io/Opia-for-Windows/">Opia para Windows</a>.',
};
const EN = {};

function setLang(lang) {
  for (const el of $$('[data-i18n]')) {
    const k = el.dataset.i18n; if (!(k in EN)) EN[k] = el.innerHTML;
    el.innerHTML = lang === 'es' && ES[k] ? ES[k] : EN[k];
  }
  for (const el of $$('[data-i18n-label]')) {
    const k = el.dataset.i18nLabel; if (!(('label:' + k) in EN)) EN['label:' + k] = el.getAttribute('aria-label');
    el.setAttribute('aria-label', lang === 'es' && ES[k] ? ES[k] : EN['label:' + k]);
  }
  html.lang = lang;
  $$('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  document.title = lang === 'es' ? 'Opia para Android: en tu bolsillo' : 'Opia for Android: in your pocket';
  store.set('opia-site-lang', lang); themeLabel(); fitRing();
}

/* ---- the stamp: stretch or shrink the phrase so its two copies go exactly once round the ring */
function fitRing() {
  const tp = $('.stamp textPath'); if (!tp) return;
  const t = tp.parentNode, C = 2 * Math.PI * 74, n = tp.textContent.length;
  t.style.fontSize = '15.5px'; t.style.letterSpacing = '0px';
  const L = tp.getComputedTextLength(); if (!L) return;
  if (L > C * .8) t.style.fontSize = (15.5 * C * .8 / L) + 'px';     // too long: smaller letters, keep some spacing
  t.style.letterSpacing = ((C - tp.getComputedTextLength()) / n) + 'px';
}
if (document.fonts) document.fonts.ready.then(fitRing);
$$('.lang button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));

/* ---- theme: paper (light) unless the visitor switched to the night desk before */
function themeLabel() {
  const dark = html.dataset.theme === 'dark', es = html.lang === 'es';
  $('.theme').setAttribute('aria-label', dark ? (es ? 'Cambiar al tema claro' : 'Switch to the light theme') : (es ? 'Cambiar al tema oscuro' : 'Switch to the dark theme'));
  $('meta[name=theme-color]').content = dark ? '#191713' : '#efe8da';
}
html.dataset.theme = store.get('opia-site-theme') === 'dark' ? 'dark' : 'light';
$('.theme').addEventListener('click', () => { html.dataset.theme = html.dataset.theme === 'dark' ? 'light' : 'dark'; store.set('opia-site-theme', html.dataset.theme); themeLabel(); });
setLang(store.get('opia-site-lang') === 'es' ? 'es' : 'en');

/* ---- the phones drop onto the desk once the page has its pictures */
const drop = () => requestAnimationFrame(() => html.classList.add('loaded'));
if (document.readyState === 'complete') drop(); else addEventListener('load', drop);
setTimeout(drop, 1800);    // slow connection: don't wait for every picture

/* ---- things that settle, write themselves or get stamped as they come into view */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -14% 0px' });
$$('.settle, .write, .num, .stamp').forEach(el => io.observe(el));
$$('.tick-in').forEach((el, k) => { el.style.transitionDelay = (k * 90) + 'ms'; io.observe(el); });     // the ticks go in one after another

/* ---- scrolling: the desk drifts a little, the header gets its rule, the nav marks where you are */
const things = $$('.desk .phone, .desk .sticker'), topBar = $('.top'), desk = $('.desk');
const navs = $$('.links a').map(a => [a, $(a.getAttribute('href'))]);
let ticking = false;
function onScroll() {
  ticking = false; const y = scrollY, vh = innerHeight;
  topBar.classList.toggle('scrolled', y > 8);
  if (!still && desk && y < vh * 1.4) things.forEach((p, k) => { p.style.translate = `0 ${(-y * (.05 + (k % 4) * .035)).toFixed(1)}px`; });
  let cur = null; for (const [a, s] of navs) if (s && s.getBoundingClientRect().top < vh * .45) cur = a;
  navs.forEach(([a]) => a.classList.toggle('on', a === cur));
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
onScroll();

/* ---- Download: the file is the installer, so say so straight away and show what the phone will ask next.
   On a computer or an iPhone the file is no use, so show the code to scan (or say it's for Android) instead. */
const guide = $('#guide');
const device = () => /Android/i.test(navigator.userAgent) ? 'android' : /iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1) ? 'iphone' : 'desktop';
$$('a.apk').forEach(a => a.addEventListener('click', e => {
  const d = device(); if (d !== 'android') e.preventDefault();     // on Android the download goes ahead underneath
  guide.dataset.for = d; guide.showModal(); guide.scrollTop = 0;
}));
guide.addEventListener('click', e => { const r = guide.getBoundingClientRect(); if (e.target === guide && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) guide.close(); });    // a tap outside the card closes it
