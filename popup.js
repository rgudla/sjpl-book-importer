const SJPL_URL = "https://www.sjpl.org/purchase/";
const SETTINGS_KEY = "sjplImporterSettings";
const PENDING_KEY = "sjplPendingImport";

let activeTab = null;
let sourceKey = "";

const SOURCES = [
  { key: "amazon.com", domains: ["amazon.com"], label: "Amazon" },
  { key: "walmart.com", domains: ["walmart.com"], label: "Walmart" },
  { key: "barnesandnoble.com", domains: ["barnesandnoble.com"], label: "Barnes & Noble" },
  { key: "bookshop.org", domains: ["bookshop.org"], label: "Bookshop.org" },
  { key: "thriftbooks.com", domains: ["thriftbooks.com"], label: "ThriftBooks" },
  { key: "bookoutlet.com", domains: ["bookoutlet.com"], label: "Book Outlet" }
];

let settings = {
  defaultLibrary: "Cambrian",
  sourceLabels: Object.fromEntries(SOURCES.map(s => [s.key, s.label]))
};

const $ = id => document.getElementById(id);

function sourceFromHost(host) {
  const h = String(host || "").replace(/^www\./i, "").toLowerCase();
  return SOURCES.find(source =>
    source.domains.some(domain => h === domain || h.endsWith("." + domain))
  ) || null;
}

function setStatus(text, ok = true) {
  $("status").textContent = text;
  $("status").className = ok ? "ok" : "err";
}

function cleanSourceUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);

    // Keep only query parameters that can identify a book/edition.
    const keep = new Set(["ean", "isbn"]);
    for (const key of [...url.searchParams.keys()]) {
      if (!keep.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }

    url.hash = "";
    return url.toString();
  } catch (_) {
    return String(rawUrl || "");
  }
}

async function load() {
  [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!activeTab?.url || !/^https?:/i.test(activeTab.url)) {
    $("site").textContent = "Open a supported book product page.";
    $("import").disabled = true;
    return;
  }

  const url = new URL(activeTab.url);
  const source = sourceFromHost(url.hostname);

  if (!source) {
    $("site").textContent = `Unsupported source: ${url.hostname}`;
    $("import").disabled = true;
    setStatus(
      "Supported: Amazon, Walmart, Barnes & Noble, Bookshop.org, ThriftBooks, and Book Outlet.",
      false
    );
    return;
  }

  sourceKey = source.key;
  $("site").textContent = `Source: ${source.label}`;

  const saved = await chrome.storage.sync.get(SETTINGS_KEY);
  if (saved[SETTINGS_KEY]) {
    settings = {
      ...settings,
      ...saved[SETTINGS_KEY],
      sourceLabels: {
        ...settings.sourceLabels,
        ...(saved[SETTINGS_KEY].sourceLabels || {})
      }
    };
  }

  $("library").value = settings.defaultLibrary || "Cambrian";
  $("sourceLabel").value = settings.sourceLabels?.[sourceKey] || source.label;
}

async function saveSettings(show = true) {
  settings.defaultLibrary = $("library").value.trim() || "Cambrian";
  settings.sourceLabels = settings.sourceLabels || {};
  if (sourceKey) {
    settings.sourceLabels[sourceKey] = $("sourceLabel").value.trim();
  }
  await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
  if (show) setStatus("Settings saved.");
}

async function readBook(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: "SJPL_READ_BOOK" });
    if (response?.ok) return response;

    return {
      ok: false,
      error: response?.error || "The product-page reader could not parse this page."
    };
  } catch (_) {
    return {
      ok: false,
      error:
        "The product-page reader is not attached to this tab. " +
        "Refresh the product page once after installing/updating the extension, then try again."
    };
  }
}

$("save").addEventListener("click", () => saveSettings(true));

$("import").addEventListener("click", async () => {
  if (!activeTab?.id) {
    setStatus("No active product page found.", false);
    return;
  }

  $("import").disabled = true;
  setStatus("Reading this book page…");

  try {
    await saveSettings(false);

    const read = await readBook(activeTab.id);
    if (!read?.ok) {
      setStatus(read?.error || "Could not read this product page.", false);
      $("import").disabled = false;
      return;
    }

    const book = read.book || {};
    if (!book.title) {
      setStatus("Could not identify a book title on this page.", false);
      $("import").disabled = false;
      return;
    }

    const author = sourceKey === "barnesandnoble.com" ? "" : (book.author || "");
    const publisher = sourceKey === "barnesandnoble.com" ? "" : (book.publisher || "");

    const pending = {
      createdAt: Date.now(),
      sourceUrl: book.pageUrl || activeTab.url,
      data: {
        title: book.title,
        // Barnes & Noble is deliberately conservative for these two fields.
        author,
        publisher,
        isbn: book.isbn || "",
        releaseDate: book.releaseDate || "",
        checkedCatalog: "Yes",
        language: book.language || "English",
        format: "Book",
        genre: book.genre || "None",
        ageLevel: book.ageLevel || "Adult",
        learnedAbout: $("sourceLabel").value.trim() || sourceKey,
        library: $("library").value.trim() || "Cambrian",
        comments: `Source: ${cleanSourceUrl(book.pageUrl || activeTab.url)}`
      }
    };

    await chrome.storage.local.set({ [PENDING_KEY]: pending });
    await chrome.tabs.create({ url: SJPL_URL, active: true });

    const transferred = {
      author,
      publisher,
      isbn: book.isbn || "",
      releaseDate: book.releaseDate || ""
    };
    const missing = Object.entries(transferred)
      .filter(([, value]) => !value)
      .map(([key]) => key);
    setStatus(
      `Opened SJPL for:\n${book.title}` +
      (missing.length ? `\nReview missing: ${missing.join(", ")}` : "")
    );
  } catch (err) {
    setStatus("Import failed.\n" + String(err?.message || err), false);
    $("import").disabled = false;
  }
});

load();
