(() => {
  function clean(value) {
    return String(value ?? "")
      .replace(/[\u200e\u200f\u200b\u2060]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function asArray(value) {
    return Array.isArray(value) ? value : (value == null ? [] : [value]);
  }

  function personName(value) {
    if (typeof value === "string") return clean(value);
    if (value && typeof value === "object") {
      return clean(
        value.name ||
        [value.givenName, value.familyName].filter(Boolean).join(" ")
      );
    }
    return "";
  }

  function meta(...selectors) {
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      const value = clean(
        el?.content ||
        el?.getAttribute?.("content") ||
        el?.textContent ||
        ""
      );
      if (value) return value;
    }
    return "";
  }

  function firstText(...selectors) {
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      const value = clean(el?.textContent || "");
      if (value) return value;
    }
    return "";
  }

  function parseJsonLd() {
    const objects = [];

    function walk(value) {
      if (!value) return;
      if (Array.isArray(value)) return value.forEach(walk);
      if (typeof value !== "object") return;
      objects.push(value);
      if (value["@graph"]) walk(value["@graph"]);
    }

    for (const node of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        walk(JSON.parse(node.textContent));
      } catch (_) {}
    }

    function score(obj) {
      const types = asArray(obj?.["@type"]).map(v => String(v).toLowerCase());
      if (types.includes("book")) return 100;
      if (types.includes("product")) return 80;
      if (types.includes("creativework")) return 50;
      return 0;
    }

    const candidates = objects
      .filter(obj => score(obj) > 0)
      .sort((a, b) => score(b) - score(a));

    const best = candidates[0] || {};
    const authors = asArray(best.author).map(personName).filter(Boolean);

    let isbn = clean(best.isbn || best.gtin13 || best.gtin || "");
    if (!isbn) {
      for (const obj of candidates) {
        isbn = clean(obj.isbn || obj.gtin13 || obj.gtin || "");
        if (isbn) break;
      }
    }

    const categories = [];
    for (const obj of candidates.slice(0, 3)) {
      categories.push(...asArray(obj.genre), ...asArray(obj.category));
    }

    return {
      title: clean(best.name || best.headline || ""),
      author: [...new Set(authors)].join(", "),
      publisher: personName(best.publisher),
      isbn,
      releaseDate: clean(best.datePublished || best.releaseDate || ""),
      language: clean(
        typeof best.inLanguage === "object"
          ? (best.inLanguage.name || best.inLanguage.alternateName || "")
          : best.inLanguage
      ),
      categories: categories.map(clean).filter(Boolean)
    };
  }

  function normalizeIsbn(value) {
    const raw = String(value || "");
    const direct = raw.replace(/[^\dXx]/g, "");
    if (direct.length === 13 || direct.length === 10) {
      return direct.toUpperCase();
    }

    const matches =
      raw.match(/(?:97[89][\s-]?)?(?:\d[\s-]?){9,12}[\dXx]/g) || [];

    for (const match of matches) {
      const digits = match.replace(/[^\dXx]/g, "");
      if (digits.length === 13 || digits.length === 10) {
        return digits.toUpperCase();
      }
    }

    return "";
  }

  function pageLines() {
    return String(document.body?.innerText || "")
      .split(/\r?\n/)
      .map(clean)
      .filter(Boolean);
  }

  function normalizeLabel(value) {
    return clean(value)
      .replace(/^(?:svg\s*)+/i, "")
      .trim();
  }

  function lineValue(lines, labels) {
    const wanted = new Set(labels.map(label => label.toLowerCase()));

    for (let i = 0; i < lines.length; i++) {
      const line = normalizeLabel(lines[i]);
      const lower = line.toLowerCase();

      for (const label of wanted) {
        const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        const inline = line.match(
          new RegExp("^" + escaped + "\\s*[:|\\-]\\s*(.+)$", "i")
        );
        if (inline) {
          const value = clean(inline[1]);
          if (value) return value;
        }

        if (lower === label && lines[i + 1]) {
          return normalizeLabel(lines[i + 1]);
        }
      }
    }

    return "";
  }

  function genericAuthor() {
    const amazonAuthors = [
      ...document.querySelectorAll(
        '#bylineInfo .author a, #bylineInfo a.contributorNameID, #bylineInfo .contributorNameID'
      )
    ]
      .map(el => clean(el.textContent))
      .filter(value =>
        value &&
        !/^visit\b/i.test(value) &&
        !/amazon/i.test(value)
      );

    if (amazonAuthors.length) {
      return [...new Set(amazonAuthors)].join(", ");
    }

    const explicit = firstText(
      '[itemprop="author"] a',
      '[itemprop="author"]',
      '[data-testid*="author"] a',
      '[data-testid*="author"]',
      '[class*="author-name"]',
      '[class*="AuthorName"]',
      '[class*="author"] a'
    );

    if (explicit) {
      return explicit.replace(/^by\s+/i, "").trim();
    }

    return "";
  }

  function inferGenre(categories, rawText) {
    const joined = [...categories, rawText.slice(0, 6000)]
      .join(" ")
      .toLowerCase();

    const fictionSignals = [
      "fiction",
      "novel",
      "romance",
      "mystery",
      "thriller",
      "fantasy",
      "science fiction",
      "literary fiction",
      "historical fiction"
    ];

    const nonfictionSignals = [
      "nonfiction",
      "non-fiction",
      "biography",
      "memoir",
      "history",
      "business",
      "self-help",
      "religion",
      "spirituality",
      "science",
      "technology",
      "philosophy",
      "cooking",
      "reference"
    ];

    if (fictionSignals.some(signal => joined.includes(signal))) return "Fiction";
    if (nonfictionSignals.some(signal => joined.includes(signal))) return "Nonfiction";
    return "None";
  }

  function inferAgeLevel(categories, rawText) {
    const joined = [...categories, rawText.slice(0, 6000)]
      .join(" ")
      .toLowerCase();

    if (
      joined.includes("young adult") ||
      joined.includes("teen fiction") ||
      joined.includes("teen & young adult")
    ) {
      return "Young Adult";
    }

    if (
      joined.includes("juvenile") ||
      joined.includes("children") ||
      joined.includes("kids") ||
      joined.includes("picture book")
    ) {
      return "Children's";
    }

    return "Adult";
  }

  function extractBarnesNobleBook() {
    const lines = pageLines();
    const raw = String(document.body?.innerText || "");
    const url = new URL(location.href);

    const title =
      firstText("main h1", "h1") ||
      meta('meta[property="og:title"]', 'meta[name="twitter:title"]');

    // Deliberately disabled for v0.1.0.
    // B&N pages can expose duplicate/recommendation markup that produced
    // incorrect values in testing. The popup also clears these fields as
    // a second guard before data is sent to SJPL.
    const author = "";
    const publisher = "";

    let isbn = normalizeIsbn(url.searchParams.get("ean"));
    if (!isbn) {
      isbn = normalizeIsbn(
        lineValue(lines, ["ISBN-13", "ISBN 13", "ISBN"])
      );
    }

    const releaseDate = lineValue(lines, [
      "Publication Date",
      "Publish Date",
      "Published Date",
      "Release Date"
    ]);

    return {
      title: clean(title),
      author,
      publisher,
      isbn,
      releaseDate: clean(releaseDate),
      language: "English",
      genre: inferGenre([], raw),
      ageLevel: inferAgeLevel([], raw),
      pageUrl: location.href,
      pageHost: location.hostname
    };
  }

  function extractGenericBook() {
    const ld = parseJsonLd();
    const lines = pageLines();
    const raw = String(document.body?.innerText || "");
    const host = location.hostname.replace(/^www\./, "").toLowerCase();

    let title =
      ld.title ||
      firstText(
        "#productTitle",
        '[data-testid="product-title"]',
        '[data-testid*="product-title"]',
        '[class*="product-title"] h1',
        '[class*="ProductTitle"]',
        "main h1",
        "h1"
      ) ||
      meta('meta[property="og:title"]', 'meta[name="twitter:title"]');

    title = clean(title)
      .replace(/\s*[:|\-]\s*Amazon\.com.*$/i, "")
      .replace(/\s*[-|]\s*Walmart\.com.*$/i, "")
      .replace(/\s*[-|]\s*Bookshop\.org.*$/i, "")
      .replace(/\s*[-|]\s*ThriftBooks.*$/i, "")
      .replace(/\s*[-|]\s*Book Outlet.*$/i, "");

    let author = ld.author || genericAuthor();
    if (!author) {
      author = lineValue(lines, ["Author", "Authors", "By"]);
    }

    let publisher =
      ld.publisher ||
      lineValue(lines, ["Publisher"]);

    let releaseDate =
      ld.releaseDate ||
      lineValue(lines, [
        "Publication Date",
        "Publication date",
        "Publish Date",
        "Published Date",
        "Release Date",
        "Release date"
      ]);

    // Amazon often renders:
    // Publisher Name (September 19, 2025)
    if (publisher) {
      const dateInPublisher =
        publisher.match(/\(([^()]*\b(?:19|20)\d{2})\)\s*$/);

      if (!releaseDate && dateInPublisher) {
        releaseDate = clean(dateInPublisher[1]);
      }

      publisher = clean(
        publisher.replace(/\s*\([^()]*\b(?:19|20)\d{2}\)\s*$/, "")
      );
    }

    let isbn =
      normalizeIsbn(ld.isbn) ||
      normalizeIsbn(
        meta(
          'meta[property="books:isbn"]',
          'meta[name="isbn"]',
          '[itemprop="isbn"]'
        )
      ) ||
      normalizeIsbn(
        lineValue(lines, [
          "ISBN-13",
          "ISBN13",
          "ISBN 13",
          "ISBN",
          "EAN/UPC",
          "EAN",
          "Paperback ISBN"
        ])
      );

    if (!isbn) {
      const match = raw.match(
        /\b(?:ISBN(?:-?13)?|EAN\/UPC|EAN)\s*[:|]?\s*((?:97[89][\s-]?)?(?:\d[\s-]?){9,12}[\dXx])\b/i
      );
      if (match) isbn = normalizeIsbn(match[1]);
    }

    const url = new URL(location.href);

    if (!isbn && (host === "bookshop.org" || host.endsWith(".bookshop.org"))) {
      isbn = normalizeIsbn(url.searchParams.get("ean"));
    }

    if (!isbn && (host === "thriftbooks.com" || host.endsWith(".thriftbooks.com"))) {
      isbn = normalizeIsbn(url.searchParams.get("isbn"));
    }

    if (!isbn && (host === "bookoutlet.com" || host.endsWith(".bookoutlet.com"))) {
      const match = location.pathname.match(/\/products\/(\d{13})/i);
      if (match) isbn = normalizeIsbn(match[1]);
    }

    let language =
      ld.language ||
      lineValue(lines, ["Language"]);

    if (!language || language.length > 50) {
      language = "English";
    }

    const extraCategories = [
      lineValue(lines, ["Category", "Categories", "BISAC Categories"])
    ].filter(Boolean);

    const categories = [...ld.categories, ...extraCategories];

    return {
      title: clean(title),
      author: clean(author),
      publisher: clean(publisher),
      isbn: clean(isbn),
      releaseDate: clean(releaseDate),
      language: clean(language) || "English",
      genre: inferGenre(categories, raw),
      ageLevel: inferAgeLevel(categories, raw),
      pageUrl: location.href,
      pageHost: location.hostname
    };
  }

  function extractBook() {
    const host = location.hostname.replace(/^www\./, "").toLowerCase();

    if (
      host === "barnesandnoble.com" ||
      host.endsWith(".barnesandnoble.com")
    ) {
      return extractBarnesNobleBook();
    }

    return extractGenericBook();
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== "SJPL_READ_BOOK") return;

    try {
      sendResponse({ ok: true, book: extractBook() });
    } catch (err) {
      sendResponse({
        ok: false,
        error: String(err?.message || err)
      });
    }

    return true;
  });
})();
