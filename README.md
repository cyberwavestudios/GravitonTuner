# Cyber Tuning Fork — independent hosting package

`release/` is a clean, standalone static copy of GravitonTuner. It contains the HTML, CSS, JavaScript, audio, images, icons, manifest, and bridge modules needed at runtime. It deliberately omits the Replit workspace files, Git history, caches, attached development prompts, secrets, and database backups. The original Replit app and its downloaded archive remain untouched.

## Local preview

From the `release/` directory, run `python3 -m http.server 8765 --bind 127.0.0.1` and open `http://127.0.0.1:8765/`. The app needs no build step, package installation, database, or environment variables. Browser audio needs a user gesture (click/tap) to start.

## Put it on your own server

Copy the **contents** of `release/` to a dedicated web root and configure your web server (for example, Nginx or Caddy) to serve that directory at `/`. Use HTTPS: the app's audio worklet and installable/offline features rely on browser secure-context behavior. Do not expose Python's preview server as the public production server.

The existing custom domain is `cybernetic-tuner.cyberwavestudios.com`. Keep its current DNS pointing at Replit until the new HTTPS deployment is independently tested. Changing that DNS record will require access from the website designer or DNS account owner. The app uses root-relative service-worker paths, so host it at the root of its own hostname rather than a subdirectory.

## Verification checklist

- Landing screen shows the tuning fork, zodiac wheel, scale bar, mode selector, and octave controls.
- Changing musical mode updates the note readout; raising/lowering the octave changes the displayed frequency.
- Resonant Bridge opens; its inputs update the ratio/tonic display; Play A/B and Bridge controls trigger audio without browser errors.
- Images, WAV audio, JavaScript modules, manifest, and service worker load successfully over HTTPS.
- Test on desktop and mobile, including sound after a tap, before any DNS switch or Replit cancellation.

Local verification on October 4, 2026: the independent copy loaded on `127.0.0.1:8765`; changing Aeolian to Ionian and raising the octave changed the readout from 65 Hz to 131 Hz; Resonant Bridge opened; Input A accepted `432`, updated the ratio display, and Play A produced no browser-console error. This verifies a local preview, **not** a deployment on the personal server or audible output on every device.
