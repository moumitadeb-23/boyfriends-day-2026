# 💗 Happy Boyfriend's Day — Mr Goswami × Bhutum

A handcrafted, cinematic, romantic static website made as a personal gift.

## Folder structure

```text
boyfriends-day-website/
├── index.html
├── style.css
├── script.js
├── config.js
├── README.md
└── assets/
    ├── images/
    │   ├── memory-01.jpg
    │   ├── memory-02.jpg
    │   ├── memory-03.png
    │   ├── memory-04.png
    │   ├── memory-05.png
    │   ├── memory-06.png
    │   ├── memory-07.png
    │   ├── memory-08.png
    │   └── README.md
    └── music/
        ├── placeholder.wav
        └── README.md
```

## 1. Personalize the website

Almost all personal content is in **`config.js`**.

Change:

- `couple.him`
- `couple.me`
- `couple.startDate`
- `memories`
- `gallery`
- `reasons`
- `loveLetter`
- `quiz`
- `envelopes`
- `coupons`
- `loves`
- `nicknames`

The page automatically reads these values.

### Turn editor mode off before gifting

In `config.js`:

```js
SHOW_EDITOR: false
```

This hides the gear/editor controls from the public gift view.

## 2. Replace the photos

Put your own files in:

```text
assets/images/
```

Then update the `image` values in `config.js`.

Example:

```js
{ image: "assets/images/our-first-date.jpg", caption: "Our first date ❤️" }
```

Use relative paths only.

### Important

Browser-uploaded photo replacements in the settings drawer are saved to **IndexedDB on that device only**. They do not modify the actual public files.

For a permanent public photo, replace the file in `assets/images/` and update `config.js`.

## 3. Add music

Permanent songs should be placed in:

```text
assets/music/
```

Then add them to `playlist` in `config.js`:

```js
playlist: [
  {
    title: "Song Name",
    artist: "Artist",
    src: "assets/music/song.mp3",
    cover: "assets/images/memory-01.jpg"
  }
]
```

The included `placeholder.wav` is intentionally silent and only exists so the player has a valid local audio file.

### Browser Add Song

When editor mode is enabled, the settings drawer supports:

- local MP3/M4A/WAV upload
- local browser storage using IndexedDB
- YouTube link parsing
- Spotify link parsing
- removing browser-added local songs

Browser-added audio persists on **that browser/device only**.

For a public gift, permanently add your chosen local files to `assets/music/` and `config.js`.

### Copyright note

Do not upload copyrighted music to a public repository unless you have permission/licensing to distribute it. Embedding music through the official YouTube/Spotify player is generally preferable to hosting the audio file yourself, but you should still follow each platform's terms and the rights holder's requirements.

## 4. Optional password gate

To enable the secret lock:

```js
secretLock: {
  enabled: true,
  password: "14012025"
}
```

The example password is the relationship date in `DDMMYYYY` format.

For a real secret, choose your own password.

## 5. Test locally

Because this is a pure static website, you can open:

```text
index.html
```

directly in a browser.

For the most reliable IndexedDB/media behavior, use a small local server.

### Python

From the project folder:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

### VS Code

Install/use Live Server, right-click `index.html`, and choose **Open with Live Server**.

No npm install is required.

## 6. Deploy to Vercel

### Option A — Drag and drop

1. Sign in to Vercel.
2. Create a new project.
3. Upload the project folder.
4. No build command is needed.
5. No output directory is needed.
6. Deploy.

### Option B — GitHub import

1. Create a GitHub repository.
2. Upload the entire project folder.
3. Push/commit the files.
4. In Vercel, choose **Add New → Project**.
5. Import the GitHub repository.
6. Framework preset: **Other** / static.
7. Leave build command empty.
8. Deploy.

## 7. Deploy to GitHub Pages

1. Create a GitHub repository.
2. Upload all files while preserving the exact folder structure.
3. Push the project.
4. Open the repository.
5. Go to **Settings → Pages**.
6. Under deployment source, select **Deploy from a branch**.
7. Select your main branch and `/root`.
8. Save.
9. GitHub will provide the Pages URL.

All internal paths are relative, so the project works inside a GitHub Pages sub-folder.

## 8. Accessibility and performance

Included:

- semantic headings and buttons
- image alt text
- keyboard-accessible envelope/lightbox controls
- mobile-first responsive layout
- `prefers-reduced-motion` support
- CSS transforms/opacity for smooth animation
- no framework or build step
- no required external JavaScript libraries
- graceful behavior if IndexedDB is unavailable

Google Fonts are optional enhancement only. If the CDN is unavailable, the CSS falls back to system fonts.

## 9. Editor features

The gear drawer can:

- change names/date
- edit the love letter
- change theme
- change accent color
- change font style
- toggle particles/effects/animations
- export settings as JSON
- import settings JSON
- reset browser settings
- replace photos locally
- add local audio
- add YouTube/Spotify links

Local editor changes use `localStorage` and/or `IndexedDB`.

## 10. Final gifting checklist

Before sharing:

- [ ] Replace all placeholder/selected photos if desired.
- [ ] Add your permanent music legally.
- [ ] Update captions.
- [ ] Check the relationship date.
- [ ] Test the quiz.
- [ ] Test the surprise button.
- [ ] Test mobile view.
- [ ] Set `SHOW_EDITOR: false`.
- [ ] Test the deployed URL on a phone.
- [ ] Keep a backup ZIP.

Made with a ridiculous amount of love. ❤️

## Music
The music player is a compact right-side dock on desktop and a bottom dock on mobile. Use the **⚙ Music Settings** control to upload local MP3/M4A/WAV files or add YouTube/Spotify links. The dock can be hidden and reopened with **♫**.


### Bundled soundtrack
The project includes `assets/music/jee-bhar-ke-tum.mp3` and `config.js` is already configured to play it from the GitHub Pages site. Browser-uploaded songs remain device-local.
