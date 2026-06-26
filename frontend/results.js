(function () {
  "use strict";

  var API_BASE = "https://vrifai-backend.onrender.com";
  var CONF_ANIM_MS = 1000;

  function clampScore(n) {
    if (!Number.isFinite(n)) return 0;
    return Math.min(100, Math.max(0, Math.round(n)));
  }

  function readScanId() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get("id");
    if (id === null || id === "") return null;
    id = id.trim();
    return id || null;
  }

  function readLegacyScore() {
    var params = new URLSearchParams(window.location.search);
    var raw = params.get("score");
    if (raw === null || raw === "") return null;
    return clampScore(parseInt(raw, 10));
  }

  function numOrNull(v) {
    if (v === null || v === undefined || v === "") return null;
    var n = typeof v === "number" ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : null;
  }

  function pickString(obj, keys) {
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (obj && Object.prototype.hasOwnProperty.call(obj, k)) {
        var v = obj[k];
        if (typeof v === "string" && v.trim()) return v.trim();
      }
    }
    return "";
  }

  function normalizeScanPayload(body) {
    if (!body || typeof body !== "object") return null;
    var data = body;
    if (body.data && typeof body.data === "object") data = body.data;
    else if (body.scan && typeof body.scan === "object") data = body.scan;
    if (!data || typeof data !== "object") return null;

    var conf =
      numOrNull(data.confidence) ||
      numOrNull(data.confidenceScore) ||
      numOrNull(data.confidence_score) ||
      numOrNull(data.score) ||
      numOrNull(data.authenticityScore) ||
      numOrNull(data.authenticity_score);

    if (conf !== null && conf > 0 && conf <= 1) {
      conf = Math.round(conf * 100);
    }

    var verdict =
      pickString(data, ["verdict", "verdictLabel", "verdict_label", "label"]) ||
      (typeof data.verdict === "string" ? data.verdict : "");

    var pixel =
      pickString(data, [
        "pixelAnalysis",
        "pixel_analysis",
        "pixelExplanation",
        "pixel_explanation",
        "pixelAnalysisExplanation",
        "pixel_analysis_explanation",
      ]) || "";

    var overall =
      pickString(data, [
        "overallExplanation",
        "overall_explanation",
        "explanation",
        "summary",
        "overallSummary",
        "overall_summary",
      ]) || "";

    var meta =
      data.metadata !== undefined && data.metadata !== null
        ? data.metadata
        : data.meta !== undefined
          ? data.meta
          : data.exif !== undefined
            ? data.exif
            : null;

    var imageUrl =
      pickString(data, ["imageUrl", "image_url", "url", "secure_url", "previewUrl", "preview_url"]) || "";

    return {
      confidence: conf !== null ? clampScore(conf) : null,
      verdict: verdict,
      metadata: meta,
      pixelExplanation: pixel,
      overallExplanation: overall,
      imageUrl: imageUrl,
    };
  }

  function formatExifLines(exif) {
    if (!exif || typeof exif !== "object") return [];
    var fields = [
      ["camera", ["camera", "make", "model", "Camera", "Make", "Model"]],
      ["date taken", ["dateTaken", "date_taken", "DateTimeOriginal", "CreateDate", "created"]],
      ["GPS", ["gps", "GPS", "GPSLatitude", "GPSLongitude", "location"]],
      ["software", ["software", "Software", "ProcessingSoftware"]],
    ];
    var lines = [];
    fields.forEach(function (pair) {
      var label = pair[0];
      var keys = pair[1];
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (exif[k] !== undefined && exif[k] !== null && String(exif[k]).trim()) {
          lines.push(label + ": " + String(exif[k]));
          return;
        }
      }
    });
    return lines;
  }

  function formatMetadata(meta) {
    if (meta === null || meta === undefined) return "No metadata was returned for this scan.";
    if (typeof meta === "string") return meta.trim() || "No metadata was returned for this scan.";
    if (typeof meta === "object" && !Array.isArray(meta)) {
      var exif = meta.exif || meta.EXIF;
      var exifLines = formatExifLines(exif);
      if (exifLines.length) return exifLines.join("\n");

      var keys = Object.keys(meta);
      if (!keys.length) return "No metadata was returned for this scan.";
      var lines = [];
      keys.forEach(function (k) {
        var v = meta[k];
        if (v === null || v === undefined) return;
        if (k === "exif" || k === "EXIF") return;
        if (typeof v === "object") {
          try {
            lines.push(k + ": " + JSON.stringify(v, null, 0));
          } catch (e) {
            lines.push(k + ": [object]");
          }
        } else {
          lines.push(k + ": " + String(v));
        }
      });
      return lines.length ? lines.join("\n") : "No metadata was returned for this scan.";
    }
    if (Array.isArray(meta)) {
      try {
        return JSON.stringify(meta, null, 2);
      } catch (e) {
        return String(meta);
      }
    }
    return String(meta);
  }

  function normalizeVerdictKey(verdictStr) {
    if (!verdictStr || typeof verdictStr !== "string") return null;
    var s = verdictStr.trim().replace(/\s+/g, " ");
    var upper = s.toUpperCase();
    var hyphenAgnostic = upper.replace(/[\u2010-\u2015]/g, "-");
    if (hyphenAgnostic === "LIKELY REAL") return "real";
    if (hyphenAgnostic === "UNCERTAIN") return "uncertain";
    if (hyphenAgnostic === "LIKELY AI-GENERATED" || hyphenAgnostic === "LIKELY AI GENERATED") {
      return "ai";
    }
    return null;
  }

  function verdictStyleFromString(verdictStr, scoreForFallback) {
    if (verdictStr && typeof verdictStr === "string" && verdictStr.trim()) {
      var raw = verdictStr.trim();
      var canonical = normalizeVerdictKey(raw);
      if (canonical === "real") {
        return { label: "LIKELY REAL", className: "verdict-badge--real", key: "real" };
      }
      if (canonical === "uncertain") {
        return { label: "UNCERTAIN", className: "verdict-badge--uncertain", key: "uncertain" };
      }
      if (canonical === "ai") {
        return { label: "LIKELY AI-GENERATED", className: "verdict-badge--ai", key: "ai" };
      }
      var u = raw.toUpperCase();
      if (
        /\b(NOT\s+REAL|NO\s+REAL)\b/i.test(raw) ||
        /\b(FAKE|DEEPFAKE|SYNTHETIC|FORGERY|MANIPULATED|AI[\s-]?GENERATED|GENERATED|DEEP\s*FAKE)\b/i.test(u)
      ) {
        return { label: raw, className: "verdict-badge--ai", key: "ai" };
      }
      if (/\b(REAL|AUTHENTIC|GENUINE|ORIGINAL|TRUSTED)\b/i.test(u)) {
        return { label: raw, className: "verdict-badge--real", key: "real" };
      }
      if (/\b(UNCERTAIN|UNKNOWN|INCONCLUSIVE|AMBIGUOUS|MIXED)\b/.test(u)) {
        return { label: raw, className: "verdict-badge--uncertain", key: "uncertain" };
      }
      return { label: raw, className: "verdict-badge--uncertain", key: "uncertain" };
    }
    if (typeof scoreForFallback === "number") {
      return verdictForScore(scoreForFallback);
    }
    return { label: "UNCERTAIN", className: "verdict-badge--uncertain", key: "uncertain" };
  }

  function verdictForScore(score) {
    if (score >= 70) {
      return { key: "real", label: "LIKELY REAL", className: "verdict-badge--real" };
    }
    if (score >= 40) {
      return { key: "uncertain", label: "UNCERTAIN", className: "verdict-badge--uncertain" };
    }
    return { key: "ai", label: "LIKELY AI-GENERATED", className: "verdict-badge--ai" };
  }

  function setVerdictBadge(badgeEl, verdict) {
    if (!badgeEl) return;
    badgeEl.textContent = verdict.label;
    badgeEl.classList.remove("verdict-badge--real", "verdict-badge--uncertain", "verdict-badge--ai");
    badgeEl.classList.add(verdict.className);
  }

  function loadResultImage(imgEl, imageUrl) {
    if (!imgEl) return;
    if (imageUrl && typeof imageUrl === "string") {
      imgEl.src = imageUrl;
      return;
    }
    var data = null;
    try {
      data = sessionStorage.getItem("verifaiPreviewData");
    } catch (e) {}
    if (data) {
      imgEl.src = data;
      return;
    }
    imgEl.removeAttribute("src");
  }

  function setConfidenceAnimated(targetScore) {
    var score = clampScore(targetScore);
    var pctEl = document.getElementById("confidence-percent");
    var fillEl = document.getElementById("confidence-bar-fill");
    var bar = document.querySelector(".confidence-bar");
    if (!pctEl || !fillEl) return;

    var start = performance.now();
    var from = 0;
    function frame(now) {
      var t = Math.min(1, (now - start) / CONF_ANIM_MS);
      var eased = 1 - Math.pow(1 - t, 3);
      var val = Math.round(from + (score - from) * eased);
      pctEl.textContent = val + "%";
      fillEl.style.width = val + "%";
      if (bar) bar.setAttribute("aria-valuenow", String(val));
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function setConfidenceImmediate(score) {
    var s = clampScore(score);
    var pctEl = document.getElementById("confidence-percent");
    var fillEl = document.getElementById("confidence-bar-fill");
    var bar = document.querySelector(".confidence-bar");
    if (pctEl) pctEl.textContent = s + "%";
    if (fillEl) fillEl.style.width = s + "%";
    if (bar) bar.setAttribute("aria-valuenow", String(s));
  }

  function initAccordion(root) {
    var items = root.querySelectorAll(".accordion-item");
    items.forEach(function (item) {
      var btn = item.querySelector(".accordion-trigger");
      var panel = item.querySelector(".accordion-panel");
      if (!btn || !panel) return;

      btn.addEventListener("click", function () {
        var open = item.classList.toggle("is-open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        panel.hidden = !open;
      });
    });
  }

  function fallbackCopyToClipboard(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e) {}
    document.body.removeChild(ta);
    return ok;
  }

  function initShareResultButton() {
    var btn = document.getElementById("btn-share-result");
    var toast = document.getElementById("results-toast");
    if (!btn || !toast) return;

    var hideTimer = null;
    function showToast(message) {
      toast.textContent = message;
      toast.hidden = false;
      toast.classList.add("is-visible");
      if (hideTimer) window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(function () {
        toast.classList.remove("is-visible");
        window.setTimeout(function () {
          toast.hidden = true;
        }, 220);
      }, 1400);
    }

    btn.addEventListener("click", function () {
      var url = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(url)
          .then(function () {
            showToast("Link copied!");
          })
          .catch(function () {
            showToast(fallbackCopyToClipboard(url) ? "Link copied!" : "Could not copy link");
          });
        return;
      }
      showToast(fallbackCopyToClipboard(url) ? "Link copied!" : "Could not copy link");
    });
  }

  function setText(id, text, fallback) {
    var el = document.getElementById(id);
    if (!el) return;
    var s = text;
    if (s === null || s === undefined || (typeof s === "string" && !s.trim())) s = fallback;
    el.textContent = typeof s === "string" ? s : String(s);
  }

  function showFetchError(message) {
    setText("accordion-metadata-text", "Could not load this scan: " + message, "");
    setText("accordion-pixel-text", "", "—");
    setText("accordion-overall-text", "", "—");
    var badge = document.getElementById("verdict-badge");
    setVerdictBadge(badge, { label: "LOAD ERROR", className: "verdict-badge--ai", key: "ai" });
    setConfidenceImmediate(0);
  }

  function applyPayload(normalized) {
    var score =
      normalized.confidence !== null && normalized.confidence !== undefined
        ? normalized.confidence
        : 0;
    var verdict = verdictStyleFromString(normalized.verdict, score);

    setVerdictBadge(document.getElementById("verdict-badge"), verdict);
    setConfidenceAnimated(score);

    setText("accordion-metadata-text", formatMetadata(normalized.metadata), "No metadata was returned for this scan.");
    setText(
      "accordion-pixel-text",
      normalized.pixelExplanation,
      "No pixel-level explanation was returned for this scan."
    );
    setText(
      "accordion-overall-text",
      normalized.overallExplanation,
      "No overall explanation was returned for this scan."
    );

    loadResultImage(document.getElementById("result-image"), normalized.imageUrl);
  }

  function runLegacyScoreDemo(score) {
    var verdict = verdictForScore(score);
    setVerdictBadge(document.getElementById("verdict-badge"), verdict);
    setConfidenceAnimated(score);
    loadResultImage(document.getElementById("result-image"), "");
    setText(
      "accordion-metadata-text",
      "Open this page with ?id=<scanId> after uploading to load metadata from the API.",
      ""
    );
    setText(
      "accordion-pixel-text",
      "Open this page with ?id=<scanId> after uploading to load pixel analysis from the API.",
      ""
    );
    setText(
      "accordion-overall-text",
      "Open this page with ?id=<scanId> after uploading to load the overall explanation from the API.",
      ""
    );
  }

  var acc = document.getElementById("results-accordion");
  if (acc) initAccordion(acc);
  initShareResultButton();

  var scanId = readScanId();

  if (!scanId) {
    var legacy = readLegacyScore();
    if (legacy !== null) {
      runLegacyScoreDemo(legacy);
    } else {
      showFetchError(
        'Missing scan ID. Open this page as results.html?id=<scanId> (optional: add "?score=72" for a demo).'
      );
    }
    return;
  }

  fetch(API_BASE + "/api/scan/" + encodeURIComponent(scanId), {
    method: "GET",
    headers: { Accept: "application/json" },
  })
    .then(function (res) {
      return res.json().then(
        function (body) {
          return { ok: res.ok, status: res.status, body: body };
        },
        function () {
          return { ok: res.ok, status: res.status, body: null };
        }
      );
    })
    .then(function (result) {
      if (!result.ok) {
        var msg =
          result.body && typeof result.body.message === "string"
            ? result.body.message
            : "Request failed (" + result.status + ").";
        throw new Error(msg);
      }
      var normalized = normalizeScanPayload(result.body);
      if (!normalized || normalized.confidence === null) {
        throw new Error("Scan response did not include a confidence score.");
      }
      applyPayload(normalized);
    })
    .catch(function (err) {
      showFetchError(err && err.message ? err.message : "Network error.");
    });
})();
