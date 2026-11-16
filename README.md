# Little QR Studio

Little QR Studio is a free, browser-based QR code generator with direct links and no sign-up. [Use the live app](https://qr.thixpin.me/).

- Generate QR codes for URLs, text, contacts (vCard), Wi-Fi networks, email, phone numbers, locations, and calendar events.
- Customize the colors, background transparency, QR and corner styles, and center logo.
- Download a 1024 × 1024 PNG or a scalable SVG. An uploaded logo is embedded as a bitmap in the SVG.

QR content and uploaded logos are processed in your browser. A website QR contains the destination URL directly. The live site uses Cloudflare Web Analytics for site traffic.

## Run locally

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

To build and preview the static site:

```sh
npm run build
npm run preview
```

The build goes to `dist/`. The repository's GitHub Actions workflow publishes builds from `main` to GitHub Pages.

## Contribute

See the [contributing guide](CONTRIBUTING.md), [code of conduct](CODE_OF_CONDUCT.md), and [security policy](SECURITY.md).

## License

Copyright © 2026 Soe Thura (thixpin).

Little QR Studio is licensed under the GNU General Public License, version 3 only (`GPL-3.0-only`). The full license is in [LICENSE](LICENSE). Third-party dependencies and fonts are subject to their own licenses.
