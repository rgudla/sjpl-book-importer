# SJPL Book Importer

A Chrome / Microsoft Edge extension that imports book metadata from supported bookseller product pages into the San José Public Library (SJPL) **Suggest Items We Don't Have** form.

The extension opens the SJPL form in a new tab, fills the available fields, and leaves the final **Submit** action to you.

> Unofficial project. Not affiliated with, endorsed by, or maintained by San José Public Library or any supported bookseller.

## Supported booksellers

- Amazon
- Walmart
- Barnes & Noble
- Bookshop.org
- ThriftBooks
- Book Outlet

## How it works

1. Open a supported book product page.
2. Click the **SJPL Book Importer** extension.
3. Optionally change:
   - **Learned about**
   - **Library used most**
4. Click **Import this book → SJPL**.
5. The extension extracts the available book metadata.
6. SJPL opens in a new tab and the request form is filled.
7. Review every field and click **Submit** manually.

## Fields

The importer attempts to populate:

- Title
- Author / Performer
- Publisher
- ISBN
- Edition / Release Date
- Catalog checked
- Language
- Format
- Genre
- Age level
- How you learned about the item
- Library used most
- Source product URL in Comments

Metadata availability varies by bookseller and edition. Always review the imported values before submitting.

The **Comments** field includes a cleaned link back to the source product page. Common tracking parameters are removed while edition-identifying parameters such as `ean` or `isbn` are retained when present.

## Barnes & Noble limitation

For Barnes & Noble, **Author / Performer** and **Publisher** are intentionally left blank in v0.1.0.

During testing, those fields could be contaminated by recommendation or unrelated page content. The extension therefore prefers a blank field over potentially incorrect metadata.

Other available B&N fields, such as title, ISBN, release date, source URL, and general form defaults, are still imported when available.

## Metadata extraction

For most supported booksellers, the importer prefers structured metadata such as JSON-LD / Schema.org and then falls back to visible product-page fields.

It also recognizes store-specific conventions such as:

- Bookshop.org `EAN/UPC`, `Publisher`, and `Publish Date`
- ThriftBooks `ISBN13`, `Publisher`, and `Release Date`
- Book Outlet ISBN values embedded in product URLs
- Barnes & Noble edition ISBNs exposed through the `ean` URL parameter

Retailer markup changes periodically, so future site updates may require parser changes.

## Install locally

### Chrome

1. Clone or download this repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select this repository folder.
6. Open a supported book product page.
7. Click the extension icon.

### Microsoft Edge

Use the same process from `edge://extensions`.

> After installing or updating an unpacked extension, refresh any retailer tabs that were already open before testing.

## Settings

The popup lets you configure and remember:

- your preferred SJPL library;
- the text used for **How did you learn about this item?** for each bookseller.

Preferences are stored using browser extension storage.

## Permissions

The extension requests host access only for the supported booksellers and SJPL:

- Amazon
- Walmart
- Barnes & Noble
- Bookshop.org
- ThriftBooks
- Book Outlet
- SJPL

These permissions are used to read book metadata from a product page and fill the SJPL form.

The extension does **not** automatically submit requests.

See [PRIVACY.md](PRIVACY.md) for data-handling details.

## Safety and form behavior

The extension intentionally:

- leaves final submission to the user;
- avoids SJPL's validation / anti-spam field labeled `Name`;
- uses a short-lived local pending import while transferring book data between tabs;
- cleans the source URL before adding it to Comments.

Review the completed form before submission.

## Troubleshooting

### Product-page reader is not attached

This usually means the retailer tab was already open before the extension was installed or reloaded.

Refresh the retailer product page once, reopen the extension, and try again.

### Missing or incorrect metadata

Product pages differ by store and edition. Verify the imported fields before submission.

For a reproducible bug, open a GitHub issue with:

- bookseller;
- public product URL;
- missing or incorrect field;
- browser and version.

Do not include library-card numbers, passwords, payment information, or other sensitive data.

## Development

This is a Manifest V3 extension with no build step.

```text
manifest.json   Extension configuration and site permissions
popup.html      Extension popup
popup.css       Popup styling
popup.js        Import workflow and settings
source.js       Bookseller metadata extraction
sjpl.js         SJPL form autofill
```

After changing code, reload the unpacked extension from the browser extensions page and refresh any already-open retailer tabs.

## Contributing

Bug fixes and parser improvements are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT License. See [LICENSE](LICENSE).
