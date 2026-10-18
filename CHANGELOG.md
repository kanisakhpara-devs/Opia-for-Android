# Changelog

Every change to Opia for Android is listed here, newest first, with what was tested and what was not. Work done in a cloud session says so: it was tested in headless Chromium at phone size, not on a phone.

## 0.4: Updates from GitHub (cloud session, 2026-10-18)

**Added** an update wizard (`www/js/updates.js`, `Updater.java`).

**How it asks:**
- A few seconds after the first start it asks: "To look for a new version, Opia needs to go online and ask GitHub… Nothing about you, your phone or your files is sent."
- There is a box to check automatically once a day.
- **Settings → Updates** has **Check for updates**, the daily switch, and **Don't go online**.

**What it does:**
- When there's a new release it shows what's new (the changes since the last release) and offers **Update now**.
- It downloads Opia.apk with a progress bar, then checks that it is this app (same package name) and newer than the installed copy.
- It hands the file to Android's installer, where you tap **Install**.
- The first time, it walks you through Android's **Allow from this source** setting, then carries on when you come back.
- A downloaded update survives Android restarting the app.

**Changed:**
- **Two new permissions:** internet and "request install packages". **The app is no longer "no internet permission at all".**
  - Only `Updater.java` goes online. It only talks to `api.github.com` for this repository's latest release, and only downloads from this repository's release files.
  - The page itself still can't reach the network: every request it makes is answered from inside the APK or refused.
- **The website and README** say so honestly now: "offline, unless you say so". There is a new FAQ answer and a new Updates section.
- **Release notes** are now the list of changes since the previous release, which the wizard shows.

**Tested** (headless Chromium with a fake Android bridge): the first-start question, Allow, checking, the offer with notes, the download progress, the "one more step" screen, resuming after allowing installs, the installer call, and turning updates off in Settings. There were no script errors. The new Java compiles against the Android 14 framework classes.

**Not tested:** downloading and installing on a real phone. The first real test is updating to the next build from this one.

## 0.3: Home-screen widgets (cloud session, 2026-10-18)

**Added** seven home-screen widgets, in the quiet dark card design (A) you picked:
- **Quote of the day:** a tall 3 × 4 card and a 3 × 1 strip.
- **Photo of the day:** 2 × 2.
- **Favourites:** 4 × 1.
- **Quick create:** 4 × 1, with Add photos, New picture, Open PDF and Start me off.
- **Recent PDFs:** 3 × 2.
- **Pick up where you left off:** 2 × 2.

All of them use Nunito, Opia's ink background and the workspace icons, and they are named in English and Spanish.

**Quotes:**
- 44 quotes in `android/app/src/main/res/raw/quotes.json`, each with its source: Churchill, Seneca, Marcus Aurelius, Epictetus, Feynman, Orwell, both Roosevelts, Kennedy, King, Douglass, Baldwin, Morrison, Beckett, Vonnegut, Le Guin, Pratchett, Douglas Adams, Turing and others.
- Left out: well-known misattributions, such as "Success is not final…" for Churchill. Also two quotes whose source I couldn't pin down.
- One quote a day, the same on every quote widget. Tapping the quote moves that widget on to another one; tapping the logo opens Opia.
- The 3 × 1 strip only uses the 11 short quotes.

**How it works:**
- A widget can't read the app's storage. So whenever photos, pictures, PDFs or songs change, the app (`www/js/widgets.js`) hands Android a summary and small pictures.
- Those are: up to ten photo-of-the-day candidates (favourites first), the latest four favourites, the last three PDFs and the last thing you worked on.
- Only pictures Android doesn't already have are sent, and pictures nothing uses any more are deleted.
- `Widgets.java` draws the widgets from that, cropping and rounding the pictures to each widget's size.
- A tap opens the app through an `opia://` link. It goes to that photo, picture, PDF or song, or opens the Groove song already playing. For Add photos and Open PDF it opens a one-tap "Choose" sheet, because Android only lets a page open the file picker after a tap on the page itself.

**Tested:**
- **In headless Chromium, with a fake Android bridge:** the summary lists favourites first, the right PDFs and the last song (with key and tempo), and nothing is re-sent when nothing changed. Every widget link opens the right place, including a cold start from a widget.
- **Regressions:** the earlier tests all still pass, with no accessibility violations.
- **The Java** compiles against the Android 14 framework classes.

**Not tested:** how the widgets look and behave on a real home screen. The layouts are checked when GitHub builds the APK, but launchers differ, so screenshots from your phone are the real test.

## Website: the download explains itself (cloud session, 2026-10-18)

**Fixed** the website's Download buttons giving no sign that anything had happened. On a phone, Chrome only shows a small bar when a download finishes, and nothing said that the downloaded file *is* the installer.

Tapping Download now opens a guide straight away. It says Opia.apk is downloading and that the file is the installer, then shows what the phone asks next. Each step has a drawing of Android's own screen:
1. Tap **Open** in the download bar, or find the file in Files → Downloads.
2. Allow the browser to install apps: **Settings**, then **Allow from this source** (first time only).
3. Tap **Install**. If Play Protect warns, tap **More details**, then **Install anyway**.
4. Open Opia from the home screen.

There is a "Download it again" link. On a computer the guide shows the QR code to scan instead of downloading a file that can't be used there, with "download anyway" as a link. On an iPhone it says the app is for Android. It is in English and Spanish and closes with Esc, ✕ or a tap outside.

**Tested** (headless Chromium):
- **Android phone (simulated):** the download starts and the guide opens.
- **Computer and iPhone (simulated):** no download, and the right message.
- **Accessibility:** axe-core finds no violations with the guide open.
- **The rest of the site:** still no violations, no sideways scrolling and no script errors.

**Not tested:** a real phone. The drawings follow recent Android and Chrome, and the wording on other phones (Samsung, for example) differs slightly.

## 0.2: Its own repository and website (cloud session, 2026-10-18)

**Moved** the Android app out of the Opia repository (now **Opia for Windows**) into this repository, **Opia for Android**:
- `www/` is the app, `android/` the Android project, and `docs/` the website.
- The pieces it shares with Opia for Windows now have their own copies here, so this repository builds by itself without Python: the music engine and instrument samples, the Nunito and Caveat fonts, and the workspace icons. `README.md` says where they come from.
- The Gradle build copies `www/` into the APK itself.
- Builds are published as numbered releases (v0.2.N), and the newest is always at `releases/latest/download/Opia.apk`.
- Version codes start at 101, so these builds install over the ones made in the old repository. The signing key is the same, so it is an update, not a new app.

**Added:**
- **A website** (`docs/`, GitHub Pages), in the same light-table style as the Opia for Windows site, with phones on the desk instead of prints. It has the four workspaces, an install guide with a QR code to scan from a computer, a "no internet permission" stamp, an honest FAQ and a download ticket. It comes in English and Spanish, light (the default) and dark, and keeps still for visitors who ask for less motion.
- **A README**, with screenshots of every workspace in light and dark.

**Fixed:**
- **The back button.** On a phone, closing one sheet and opening another straight away (as Imagine's *From Lens* does) knocked the browser history used for the back button out of step, and the app could navigate away or close a screen by mistake. The back button now asks the app directly: `Nav.back()` closes the top sheet or screen and says whether anything was open, and the Android side leaves the app only when nothing was.
- **Two things the Android code asked the page for.** It looked them up in a way that didn't work, so the back button would always have quit the app, and leaving the app wouldn't have stopped the music.

**Tested** (headless Chromium):
- **The app at 390 × 844 with touch:** every workspace from start to export, the back button through `Nav.back()`, and voice recording with a fake microphone. axe-core found no violations on 18 screens in dark and light.
- **The website:** desktop and phone in light/English and dark/Spanish, with no accessibility violations, no sideways scrolling on phones and no script errors. Reduced motion shows the desk at once. The QR code was decoded with OpenCV and leads to the APK.
- **The Android code** compiles against the Android 14 framework classes.

**Not tested:** the first build in this repository runs on GitHub after the push. The app has not yet run on a real phone.

## 0.1: Opia for Android, first version (cloud session, 2026-10-18)

*Written when the app lived in `mobile/` of the Opia (now Opia for Windows) repository; paths below are from then. `mobile/www` is now `www/`, and `mobile/android` is now `android/`.*

**Added** `mobile/`, a phone version of Opia built for touch, with four workspaces. You chose "phone-first" over squeezing in the desktop app or making a remote control for the PC. Everything runs on the phone, and the app has no internet permission.
- **Lens:**
  - Photos come in through the phone's photo picker. You can rate them, mark favourites and filter the grid.
  - Swipe between photos; double-tap or pinch to zoom.
  - A develop editor with 14 adjustments, 10 filters, and crop with fixed ratios, rotate, flip and straighten. Hold the photo to compare with the original.
  - Undo and redo. Edits are kept as numbers, so the original never changes.
  - *Save copy* renders the photo at full size into `Pictures/Opia`.
- **Imagine:**
  - Pictures made of photo, text, sticker and drawing layers.
  - Drag to move; pinch to resize and turn, snapping to straight.
  - Five fonts, colours, a label behind text, opacity, layer order and hiding, an eraser that only rubs out its own drawing, and undo.
  - Pictures save as you go and export as PNG or JPEG.
  - Photos can come straight from Lens, with their edits.
- **Folio:**
  - PDFs shown with pdf.js and changed with pdf-lib.
  - Fill in the form, sign with your finger (signatures are kept), add text, highlights and drawing, and move or resize marks.
  - Turn, reorder, copy and delete pages; revert to the original.
  - Save to `Download/Opia` or share.
- **Groove:** uses the desktop's `web/js/music-engine.js` and instrument samples unchanged.
  - Pick a style and four parts are written to fit together.
  - Change them on a grid of steps, with "new idea", instrument, kit, key, scale, tempo, riff length and a mixer.
  - Record your voice over the song, then save it as WAV to `Music/Opia`.
- **App-wide:**
  - English and Spanish, light and dark (following the phone by default).
  - The back button closes the top sheet or screen first.
  - Every control has a spoken name.

**How it fits together:**
- `mobile/www` is plain HTML, CSS and JavaScript.
- `mobile/assemble.py` adds the files shared with the desktop app (music engine, samples, fonts, icons) into `mobile/build/www`.
- `mobile/android` is a small Java app, using no libraries beyond Android itself. It serves those files from inside the APK to a WebView, and adds the photo and file pickers, saving through MediaStore, sharing, the microphone and the back button.
- `.github/workflows/android.yml` builds the APK on GitHub and puts it on the rolling **android** release, so the newest build is always at `releases/download/android/Opia.apk`.
- New third-party code: pdf.js 3.11.174 (Apache-2.0, run with `isEvalSupported: false`) and pdf-lib 1.17.1 (MIT), in `mobile/www/vendor` with their licences.

**Signing:**
- Builds are signed with `mobile/android/opia-public.jks`, a key that is public on purpose, so each build installs over the last without you setting anything up.
- Anyone could sign an app with that key, so only install Opia from this repository's Releases.
- `mobile/README.md` explains how to switch to a private key through repository secrets. Switching needs one uninstall, which deletes the app's data.

**Tested** (headless Chromium at phone size, 390 × 844 with touch, serving `mobile/build/www`):
- **Lens:** importing 8 photos, rating, favourites, Adjust, Filters, square crop, rotate, and *Save copy* (1600 × 1600 JPEG, cropped, turned and filtered).
- **Imagine:** from a photo, adding text with a font and a label, a sticker, a drawing, layers, undo/redo, PNG export (2400 × 1600).
- **Folio:** filling a form (text with accents, checkbox, dropdown), text, highlight and a drawn signature, moving and rotating pages, saving. pypdf confirms the page order, the rotation, the text and the form values in the saved file.
- **Groove:** a Lo-fi song playing, the drum and melody grids, WAV export (14.8 s, stereo), and a 3-second voice recording with Chromium's fake microphone.
- **Everywhere:** Spanish, the back button closing sheets and screens in order, and no script errors.
- **Accessibility:** axe-core found **no violations** on 18 screens in dark and light.

Fixed during testing:
- The crop shading covered the whole screen.
- A tap that opened a sheet also closed it straight away (it would have broken the Text and Sign tools on real phones).
- Low contrast on light-theme buttons.
- Header landmarks, a nameless photo viewer and the star buttons.

The Android Java code compiles against the Android 14 framework classes.

**Not tested:**
- **Not run on a phone.** This cloud computer cannot download the Android SDK, so the app is built on GitHub instead. The first build there (Android workflow, run 1) **succeeded** and published a 6.2 MB `Opia.apk` to the *android* release. I downloaded that APK and checked that it contains the app, the music engine and the PDF libraries; I could not install or run it.
- Not tried on a real phone, a real microphone or TalkBack.
- HEIC and RAW photos mostly will not open on phones.
