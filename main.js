(function () {
  function ready(fn) { if (document.readyState !== "loading") fn(); else document.addEventListener("DOMContentLoaded", fn); }
  ready(function () {
    var root = document.documentElement;
    var menu = document.getElementById("mobile-menu");
    var toggles = document.querySelectorAll("[data-menu-toggle]");
    function setOpen(open) {
      if (!menu) return;
      menu.hidden = !open;
      root.classList.toggle("is-menu-open", open);
      document.body.style.overflow = open ? "hidden" : "";
      toggles.forEach(function (b) { b.setAttribute("aria-expanded", open ? "true" : "false"); });
    }
    toggles.forEach(function (b) { b.addEventListener("click", function () { setOpen(menu.hidden); }); });
    document.querySelectorAll("[data-menu-close]").forEach(function (el) { el.addEventListener("click", function () { setOpen(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
    var mq = window.matchMedia("(max-width: 859px)");
    var onChange = function () { if (!mq.matches) setOpen(false); };
    if (mq.addEventListener) mq.addEventListener("change", onChange); else mq.addListener(onChange);

    if (window.AuraMotion) {
      window.AuraMotion.init({ hero: "#top", cardSelectors: ["#radovi article", "#usluge > div > div > div"] });
      window.AuraMotion.cursorGlow();
    }
  });
})();
