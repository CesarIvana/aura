(function () {
  const EASE = "cubic-bezier(.19,1,.22,1)";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Non-destructive reveals: only inline styles are touched, never the DOM tree.
  const KINDS = {
    mask: {
      from: "clip-path: inset(0 0 108% 0); transform: translateY(0.18em) rotate(0.6deg);",
      to: "clip-path: inset(0 0 -12% 0); transform: translateY(0) rotate(0deg);",
      trans: (d) => `clip-path 1.15s ${EASE} ${d}s, transform 1.15s ${EASE} ${d}s`
    },
    lines: {
      from: "clip-path: inset(0 0 100% 0); opacity: 0; transform: translateY(22px);",
      to: "clip-path: inset(0 0 -6% 0); opacity: 1; transform: translateY(0);",
      trans: (d) => `clip-path 1.1s ${EASE} ${d}s, opacity .85s ease ${d}s, transform 1.1s ${EASE} ${d}s`
    },
    letters: {
      from: "opacity: 0; letter-spacing: 0.5em; filter: blur(5px);",
      to: "opacity: 1; filter: blur(0px);",
      trans: (d) => `opacity .8s ease ${d}s, letter-spacing 1.1s ${EASE} ${d}s, filter .9s ease ${d}s`
    },
    fade: {
      from: "opacity: 0; transform: translateY(30px);",
      to: "opacity: 1; transform: translateY(0);",
      trans: (d) => `opacity 1s ${EASE} ${d}s, transform 1s ${EASE} ${d}s`
    },
    blur: {
      from: "opacity: 0; filter: blur(12px); transform: translateY(20px) scale(0.985);",
      to: "opacity: 1; filter: blur(0px); transform: translateY(0) scale(1);",
      trans: (d) => `opacity .95s ease ${d}s, filter 1.15s ${EASE} ${d}s, transform 1.15s ${EASE} ${d}s`
    }
  };

  function applyCss(el, css) {
    css.split(";").forEach((rule) => {
      const i = rule.indexOf(":");
      if (i < 0) return;
      el.style.setProperty(rule.slice(0, i).trim(), rule.slice(i + 1).trim());
    });
  }

  const G = (window.__auraState = window.__auraState || { prepped: new WeakSet(), inited: new WeakSet(), played: [] });
  const PREPPED = G.prepped;

  function prep(el, kind, delay) {
    const k = KINDS[kind];
    if (!k || PREPPED.has(el) || el.__auraPlayed) return false;
    PREPPED.add(el);
    el.__auraKind = kind;
    el.__auraDelay = delay || 0;
    el.__auraOrigTrans = el.style.transition;
    if (kind === "letters") el.__auraLS = getComputedStyle(el).letterSpacing;
    applyCss(el, k.from);
    el.style.willChange = "transform, opacity, clip-path, filter";
    el.style.transition = k.trans(el.__auraDelay);
    return true;
  }

  function play(el) {
    const k = KINDS[el.__auraKind];
    if (!k) return;
    el.__auraPlayed = true;
    if (G.played.indexOf(el) < 0) G.played.push(el);
    if (!G.heal) {
      const stop = Date.now() + 7000;
      G.heal = setInterval(() => {
        G.played.forEach((n) => { if (n.__auraDone) return; const kk = KINDS[n.__auraKind]; if (kk) applyCss(n, kk.to); });
        if (Date.now() > stop) { clearInterval(G.heal); G.heal = null; }
      }, 250);
    }
    applyCss(el, k.to);
    if (el.__auraKind === "letters" && el.__auraLS) el.style.letterSpacing = el.__auraLS;
    setTimeout(() => {
      el.__auraDone = true;
      el.style.willChange = "";
      ["opacity", "transform", "filter", "clip-path"].forEach((p) => el.style.removeProperty(p));
      el.style.transition = el.__auraOrigTrans || "";
    }, 1700 + (el.__auraDelay || 0) * 1000);
  }

  function isEyebrow(el) {
    const cs = getComputedStyle(el);
    return cs.textTransform === "uppercase" && parseFloat(cs.letterSpacing) >= 1.6;
  }

  const INITED = G.inited;

  function init(opts) {
    const o = opts || {};
    const scope = o.scope || document;
    const flag = scope === document ? document.documentElement : scope;
    if (INITED.has(flag)) return null;
    INITED.add(flag);
    const heroEl = o.hero ? scope.querySelector(o.hero) : null;
    const targets = [];
    const seen = new WeakSet();

    const take = (el, kind, delay) => {
      if (!el || seen.has(el) || !el.textContent.trim()) return;
      seen.add(el);
      if (prep(el, kind, delay)) targets.push(el);
    };

    // hero — same vocabulary, played right after load
    const immediate = [];
    if (heroEl) {
      let i = 0;
      heroEl.querySelectorAll("p, h1, h2").forEach((el) => {
        const kind = el.tagName === "P" ? (isEyebrow(el) ? "letters" : "lines") : "mask";
        if (!seen.has(el) && el.textContent.trim() && prep(el, kind, 0.12 + i * 0.14)) {
          seen.add(el);
          immediate.push(el);
          i++;
        }
      });
      immediate.forEach((el) => targets.push(el));
      if (reduce) immediate.forEach(play);
      else requestAnimationFrame(() => setTimeout(() => immediate.forEach(play), 120));
    }

    const inHero = (el) => heroEl && heroEl.contains(el);
    scope.querySelectorAll("h1, h2").forEach((el) => { if (!inHero(el)) take(el, "mask", 0); });
    scope.querySelectorAll("h3").forEach((el) => { if (!inHero(el)) take(el, "mask", 0.06); });
    scope.querySelectorAll("p, blockquote, li").forEach((el) => {
      if (inHero(el)) return;
      take(el, isEyebrow(el) ? "letters" : "lines", 0.08);
    });
    (o.cardSelectors || []).forEach((sel) => {
      scope.querySelectorAll(sel).forEach((el, i) => take(el, "blur", (i % 3) * 0.09));
    });

    if (reduce) { targets.forEach(play); return null; }

    // Rect-based reveal: works no matter which element actually scrolls.
    let pending = targets.slice();
    const sweep = () => {
      if (!pending.length) return;
      const h = window.innerHeight || 800;
      const still = [];
      pending.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < h * 0.94 && r.bottom > 0) play(el);
        else still.push(el);
      });
      pending = still;
      if (!pending.length) teardown();
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; sweep(); }); };
    let raf = 0;
    const teardown = () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener
      && window.removeEventListener("resize", onScroll);
      clearInterval(tick);
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    const tick = setInterval(sweep, 400);
    sweep();
    // safety net: never leave copy invisible
    setTimeout(() => { pending.forEach(play); pending = []; teardown(); }, 5000);
    return { disconnect: teardown };
  }

  function cursorGlow(color) {
    if (!window.matchMedia("(pointer: fine)").matches || reduce) return null;
    const g = document.createElement("div");
    g.style.cssText =
      "position:fixed;top:0;left:0;width:520px;height:520px;border-radius:50%;pointer-events:none;z-index:1;" +
      "background:radial-gradient(circle at 50% 50%, " + (color || "rgba(161,72,105,0.10)") + " 0%, rgba(161,72,105,0) 70%);" +
      "transition:transform .55s cubic-bezier(.22,1,.36,1);will-change:transform;";
    document.body.appendChild(g);
    const move = (e) => { g.style.transform = "translate3d(" + (e.clientX - 260) + "px," + (e.clientY - 260) + "px,0)"; };
    window.addEventListener("mousemove", move, { passive: true });
    return { el: g, destroy() { window.removeEventListener("mousemove", move); g.remove(); } };
  }

  window.AuraMotion = { init, cursorGlow };
})();
