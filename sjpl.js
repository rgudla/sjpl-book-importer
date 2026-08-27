(() => {
  const PENDING_KEY = "sjplPendingImport";
  const MAX_AGE_MS = 10 * 60 * 1000;

  const normalize = s =>
    String(s || "")
      .toLowerCase()
      .replace(/\*/g, "")
      .replace(/[’']/g, "'")
      .replace(/\s+/g, " ")
      .trim();

  const visible = el => {
    if (!el) return false;
    const style = getComputedStyle(el);
    return style.display !== "none" &&
           style.visibility !== "hidden" &&
           el.type !== "hidden";
  };

  const fire = el => {
    el.dispatchEvent(new Event("input", {bubbles:true}));
    el.dispatchEvent(new Event("change", {bubbles:true}));
    el.dispatchEvent(new Event("blur", {bubbles:true}));
  };

  function findAnchor(labelText) {
    const wanted = normalize(labelText);
    const labels = [...document.querySelectorAll("label, legend")];

    return labels.find(el => normalize(el.textContent) === wanted) ||
           labels.find(el => {
             const txt = normalize(el.textContent);
             return txt.startsWith(wanted) || wanted.startsWith(txt);
           }) ||
           null;
  }

  function containerFor(anchor) {
    return anchor?.closest(
      "fieldset, .gfield, .form-item, .field, .form-group, .wp-block-group, li"
    ) || anchor?.parentElement || null;
  }

  function textControl(labelText) {
    const anchor = findAnchor(labelText);
    if (!anchor) return null;

    if (anchor.tagName === "LABEL" && anchor.htmlFor) {
      const direct = document.getElementById(anchor.htmlFor);
      if (direct && visible(direct)) return direct;
    }

    const container = containerFor(anchor);
    if (!container) return null;

    return [...container.querySelectorAll("input,textarea,select")]
      .find(el =>
        visible(el) &&
        !["radio","checkbox","submit","button","reset"].includes(el.type)
      ) || null;
  }

  function bestOption(select, wanted) {
    const w = normalize(wanted);
    let best = null, score = -1;

    for (const option of [...select.options]) {
      const t = normalize(option.textContent);
      let s = -1;
      if (t === w) s = 100;
      else if (t.startsWith(w) || w.startsWith(t)) s = 80;
      else if (t.includes(w) || w.includes(t)) s = 60;

      if (s > score) {
        score = s;
        best = option;
      }
    }
    return score >= 60 ? best : null;
  }

  function setText(labelText, value) {
    if (value == null || String(value).trim() === "") {
      return {field:labelText,status:"skipped"};
    }

    if (normalize(labelText) === "name") {
      return {field:labelText,status:"protected"};
    }

    const el = textControl(labelText);
    if (!el) return {field:labelText,status:"not_found"};

    if (el.tagName === "SELECT") {
      const option = bestOption(el,value);
      if (!option) return {field:labelText,status:"option_not_found"};
      el.value = option.value;
      fire(el);
      return {field:labelText,status:"filled"};
    }

    el.focus();
    el.value = value;
    fire(el);
    return {field:labelText,status:"filled"};
  }

  function setChoice(groupLabel, desired) {
    if (!desired) return {field:groupLabel,status:"skipped"};

    const container = containerFor(findAnchor(groupLabel));
    if (!container) return {field:groupLabel,status:"not_found"};

    const wanted = normalize(desired);
    const inputs = [...container.querySelectorAll('input[type="radio"],input[type="checkbox"]')]
      .filter(visible);

    for (const input of inputs) {
      let txt = "";
      if (input.id) {
        const label = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
        if (label) txt = label.textContent;
      }
      if (!txt) txt = input.closest("label")?.textContent || input.value || "";

      const n = normalize(txt);
      if (n === wanted || n.includes(wanted) || wanted.includes(n)) {
        input.click();
        fire(input);
        return {field:groupLabel,status:"filled"};
      }
    }

    return {field:groupLabel,status:"choice_not_found"};
  }

  function fill(data) {
    return [
      setText("Title",data.title),
      setText("Author/Performer",data.author),
      setText("Publisher",data.publisher),
      setText("ISBN",data.isbn),
      setText("Edition/Release Date",data.releaseDate),
      setChoice("Have you checked for this item in our library catalog?",data.checkedCatalog),
      setText("Language of Material",data.language),
      setText("Format of Material",data.format),
      setChoice("Genre",data.genre),
      setChoice("Age Level of Material",data.ageLevel),
      setText("How did you learn about this item?",data.learnedAbout),
      setText("Which library do you use the most?",data.library),
      setText("Comments",data.comments)
    ];
  }

  function showBanner(results) {
    document.getElementById("sjpl-importer-banner")?.remove();

    const issues = results.filter(
      r => !["filled","skipped","protected"].includes(r.status)
    );

    const el = document.createElement("div");
    el.id = "sjpl-importer-banner";
    el.style.cssText = [
      "position:fixed","right:16px","bottom:16px","z-index:2147483647",
      "max-width:360px","padding:12px 14px","border:1px solid #888",
      "border-radius:9px","background:#fff","color:#111",
      "box-shadow:0 3px 18px rgba(0,0,0,.18)",
      "font:13px/1.4 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
    ].join(";");

    el.innerHTML = issues.length
      ? `<strong>SJPL import mostly complete.</strong><br>Review manually: ${issues.map(i=>i.field).join(", ")}.<br><br><strong>Review the full form before Submit.</strong>`
      : "<strong>SJPL form filled.</strong><br>Review the fields, then click Submit yourself.";

    document.body.appendChild(el);
  }

  async function tryImport() {
    const stored = await chrome.storage.local.get(PENDING_KEY);
    const pending = stored[PENDING_KEY];
    if (!pending?.data) return false;

    if (!pending.createdAt || Date.now()-pending.createdAt > MAX_AGE_MS) {
      await chrome.storage.local.remove(PENDING_KEY);
      return false;
    }

    if (!findAnchor("Title")) return false;

    const results = fill(pending.data);
    await chrome.storage.local.remove(PENDING_KEY);
    showBanner(results);

    textControl("Title")?.scrollIntoView({behavior:"smooth",block:"center"});
    return true;
  }

  let attempts=0;
  const timer=setInterval(async()=>{
    attempts++;
    const done=await tryImport();
    if (done || attempts>=40) clearInterval(timer);
  },500);

  tryImport();
})();
