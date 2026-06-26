(function () {
  "use strict";

  var TOKEN_KEY = "verifai_token";
  var API_HISTORY = "https://vrifai-backend.onrender.com/api/history";

  function redirectToLogin() {
    window.location.replace("login.html");
  }

  //function normalizeRows(body) {
  //  if (Array.isArray(body)) return body;
  //  if (body && Array.isArray(body.data)) return body.data;
  //  if (body && Array.isArray(body.scans)) return body.scans;
 // //  return [];
  //}
  function normalizeRows(body) {
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object") {
    if (Array.isArray(body.data)) return body.data;
    if (Array.isArray(body.scans)) return body.scans;
    if (body.history && Array.isArray(body.history)) return body.history;
    // last resort: first array-valued property
    for (var k in body) {
      if (Object.prototype.hasOwnProperty.call(body, k) && Array.isArray(body[k])) return body[k];
    }
  }
  return [];
}

  function verdictFilterKey(verdictRaw) {
    if (!verdictRaw || typeof verdictRaw !== "string") return "uncertain";
    var u = verdictRaw.trim().toUpperCase().replace(/\s+/g, " ");
    var hyphen = u.replace(/[\u2010-\u2015]/g, "-");
    if (hyphen === "LIKELY AI-GENERATED" || hyphen === "LIKELY AI GENERATED") return "ai";
    if (hyphen === "UNCERTAIN") return "uncertain";
    if (hyphen === "LIKELY REAL") return "real";
    if (/\b(NOT\s+REAL|FAKE|DEEPFAKE|AI[\s-]?GENERATED)\b/i.test(verdictRaw)) return "ai";
    if (/\b(UNCERTAIN|UNKNOWN|INCONCLUSIVE)\b/i.test(u)) return "uncertain";
    if (/\b(REAL|AUTHENTIC)\b/i.test(u)) return "real";
    return "uncertain";
  }

  function badgeClassForKey(key) {
    if (key === "real") return "vh-badge vh-badge--real";
    if (key === "ai") return "vh-badge vh-badge--ai";
    return "vh-badge vh-badge--uncertain";
  }

  function displayVerdict(verdictRaw, key) {
    if (verdictRaw && typeof verdictRaw === "string" && verdictRaw.trim()) return verdictRaw.trim();
    if (key === "real") return "LIKELY REAL";
    if (key === "ai") return "LIKELY AI-GENERATED";
    return "UNCERTAIN";
  }

  function formatConfidence(score) {
    if (score === null || score === undefined || score === "") return "—";
    var n = typeof score === "number" ? score : parseFloat(String(score));
    if (!Number.isFinite(n)) return "—";
    if (n >= 0 && n <= 1) n = Math.round(n * 100);
    else n = Math.round(n);
    n = Math.min(100, Math.max(0, n));
    return String(n) + "%";
  }

  function formatScanDate(iso) {
    if (!iso) return { line: "—", sub: "" };
    var d = new Date(iso);
    if (isNaN(d.getTime())) return { line: String(iso), sub: "" };
    return {
      line: d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }),
      sub: d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
    };
  }

  function scanIdFromRow(row) {
    if (!row || typeof row !== "object") return "";
    if (row.id !== undefined && row.id !== null) return String(row.id);
    if (row.scan_id !== undefined && row.scan_id !== null) return String(row.scan_id);
    return "";
  }

  function setStatus(el, text) {
    if (!el) return;
    if (!text) {
      el.textContent = "";
      el.hidden = true;
      return;
    }
    el.textContent = text;
    el.hidden = false;
  }

  function renderRows(tbody, scans, opts) {
    opts = opts || {};
    var emptyEl = document.getElementById("history-empty-state");
    var tableWrap = document.getElementById("history-table-wrap");

    tbody.textContent = "";
    if (!scans.length) {
      if (opts.forceTable) {
        if (emptyEl) emptyEl.hidden = true;
        if (tableWrap) tableWrap.hidden = false;
        return;
      }
      if (emptyEl) emptyEl.hidden = false;
      if (tableWrap) tableWrap.hidden = true;
      return;
    }

    if (emptyEl) emptyEl.hidden = true;
    if (tableWrap) tableWrap.hidden = false;

    scans.forEach(function (scan) {
      var id = scanIdFromRow(scan);
      var vKey = verdictFilterKey(scan.verdict || "");
      var verdictLabel = displayVerdict(scan.verdict, vKey);
      var imgSrc = scan.image_url || scan.imageUrl || "";
      var when = formatScanDate(scan.created_at || scan.createdAt || scan.date);

      var tr = document.createElement("tr");
      tr.setAttribute("data-verdict", vKey);

      var tdThumb = document.createElement("td");
      tdThumb.className = "thumb-cell";
      var wrap = document.createElement("div");
      wrap.className = "thumb-wrap";
      var img = document.createElement("img");
      img.width = 96;
      img.height = 96;
      img.alt = "";
      img.src = imgSrc || "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"/>');
      wrap.appendChild(img);
      tdThumb.appendChild(wrap);

      var tdDate = document.createElement("td");
      tdDate.className = "date-cell";
      tdDate.appendChild(document.createTextNode(when.line));
      if (when.sub) {
        var sub = document.createElement("span");
        sub.className = "subdate";
        sub.textContent = when.sub;
        tdDate.appendChild(sub);
      }

      var tdVer = document.createElement("td");
      var badge = document.createElement("span");
      badge.className = badgeClassForKey(vKey);
      badge.textContent = verdictLabel;
      tdVer.appendChild(badge);

      var tdScore = document.createElement("td");
      tdScore.className = "score-cell";
      tdScore.textContent = formatConfidence(scan.confidence_score != null ? scan.confidence_score : scan.confidence);

      var tdAct = document.createElement("td");
      var a = document.createElement("a");
      a.className = "btn-view";
      a.textContent = "View";
      if (id) {
        a.href = "results.html?id=" + encodeURIComponent(id);
      } else {
        a.href = "#";
        a.setAttribute("aria-disabled", "true");
      }
      tdAct.appendChild(a);

      tr.appendChild(tdThumb);
      tr.appendChild(tdVer);
      tr.appendChild(tdScore);
      tr.appendChild(tdDate);
      tr.appendChild(tdAct);
      tbody.appendChild(tr);
    });
  }

  var token = null;
  try {
    token = localStorage.getItem(TOKEN_KEY);
  } catch (e) {
    redirectToLogin();
    return;
  }

  if (!token || !String(token).trim()) {
    redirectToLogin();
    return;
  }

  var tbody = document.getElementById("history-tbody");
  var caption = document.getElementById("history-caption");
  var statusEl = document.getElementById("history-status");

  if (!tbody) return;

  setStatus(statusEl, "Loading scans…");

  fetch(API_HISTORY, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: "Bearer " + token.trim(),
    },
  })
    .then(function (res) {
      if (res.status === 401) {
        try {
          localStorage.removeItem(TOKEN_KEY);
        } catch (e) {}
        redirectToLogin();
        return null;
      }
      return res.json().then(
        function (body) {
          return { ok: res.ok, body: body };
        },
        function () {
          return { ok: res.ok, body: null };
        }
      );
    })
    .then(function (result) {
      if (!result) return;
      setStatus(statusEl, "");
      if (!result.ok) {
        var msg =
          result.body && typeof result.body.message === "string"
            ? result.body.message
            : "Could not load history (" + (result.status || "error") + ").";
        renderRows(tbody, [], { forceTable: true });
        setStatus(statusEl, msg);
        if (caption) caption.textContent = "Your scans";
        return;
      }
      var rows = normalizeRows(result.body);
      if (caption) caption.textContent = rows.length ? "Your scans (" + rows.length + ")" : "Your scans";
      renderRows(tbody, rows);
    })
    .catch(function () {
      setStatus(statusEl, "Network error. Is the server running on port 3000?");
      renderRows(tbody, [], { forceTable: true });
    });

  var logoutBtn = document.getElementById("nav-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      try {
        localStorage.removeItem(TOKEN_KEY);
      } catch (e) {}
      window.location.href = "login.html";
    });
  }
})();
