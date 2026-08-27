# Privacy

SJPL Book Importer is a local browser extension and does not use a developer-operated backend.

## Data read from supported booksellers

When you explicitly import a book, the extension may read book-related metadata from the current product page, including:

- title;
- author;
- publisher;
- ISBN;
- publication / release date;
- language;
- category information used to estimate genre or age level;
- product-page URL.

## Data stored locally

Browser extension storage is used for:

- your preferred SJPL library;
- your preferred **Learned about** label for each supported bookseller;
- one short-lived pending book import while the SJPL tab opens and fills.

The pending import is removed after the form is filled or expires.

## Source URL in the SJPL form

The extension places a cleaned source product URL in the SJPL form's **Comments** field so the request can be verified against the originating bookseller page. Common tracking parameters are removed. If you submit the form, that URL is sent to SJPL as part of your request.

## Data transmission

The extension does not intentionally transmit collected data to a developer-operated server, analytics provider, advertising network, or other external service.

Book metadata is transferred locally within the browser from the supported bookseller page to the SJPL form.

## Accounts and sensitive information

The extension does not request or store:

- SJPL credentials or library card numbers;
- bookseller account passwords;
- payment information.

Do not include sensitive information in GitHub bug reports.

## Site permissions

Host permissions are limited to:

- Amazon
- Walmart
- Barnes & Noble
- Bookshop.org
- ThriftBooks
- Book Outlet
- SJPL

These permissions are used only for the import workflow described in the README.

## Changes

If a future release adds analytics, an external API, cloud storage, or other data transmission, this document should be updated before release.
