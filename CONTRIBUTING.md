# Contributing to Little QR Studio

Search [existing issues](https://github.com/thixpin/qr/issues) before opening a bug report or feature request. Use the [security policy](SECURITY.md) to report a vulnerability privately.

## Make a change

1. Fork the repository and create a branch for your change.
2. Run `npm ci` and `npm run dev` with Node.js 24.
3. Keep the change focused. Use English for code comments, and keep QR generation and logo handling in the browser.
4. Run `npm run build`. For QR changes, scan a matching export with a phone or decoder and check the affected PNG or SVG output. For UI changes, check both desktop and mobile layouts.
5. Open a pull request with a summary, what you tested, and screenshots for visible changes.

Submissions are made under the project's [GPL-3.0-only license](LICENSE). Please follow the [code of conduct](CODE_OF_CONDUCT.md).
