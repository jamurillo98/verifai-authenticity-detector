(function () {
  "use strict";
  var btn = document.querySelector("[data-nav-toggle]");
  var panel = document.getElementById("primary-nav-panel");
  if (!btn || !panel) return;

  function setOpen(open) {
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    panel.classList.toggle("is-open", open);
  }

  btn.addEventListener("click", function () {
    setOpen(!panel.classList.contains("is-open"));
  });

  panel.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      if (window.matchMedia("(max-width: 768px)").matches) setOpen(false);
    });
  });
})();
