# Contributing

Bug fixes and metadata-parser improvements are welcome.

## Pull request guidelines

1. Keep the extension compatible with Manifest V3.
2. Do not add automatic SJPL form submission.
3. Keep host permissions limited to sites required for supported import workflows.
4. Do not add analytics, telemetry, or external data transmission without updating `PRIVACY.md`.
5. Prefer structured metadata before brittle DOM selectors.
6. Test changes using the unpacked extension in Chrome or Edge.

## Reporting parser bugs

Include:

- bookseller;
- public product URL;
- missing or incorrect field;
- browser and version.

Do not include passwords, library-card numbers, payment information, or other sensitive account data.
