(function () {
  "use strict";

  var config = window.SU_CONFIG || {};
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- Toast ----
  var toastEl;
  function toast(message) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.classList.remove("show"); }, 2800);
  }

  // ---- Buy buttons ----
  // Runs before lemon.js (both deferred, this one first), so Lemon.js
  // finds the buttons with their real checkout link already set.
  var checkoutReady = /^https:\/\/[^/]+\.lemonsqueezy\.com\/(buy|checkout)\//.test(config.checkoutUrl || "") &&
    config.checkoutUrl.indexOf("REPLACE-ME") === -1;

  document.querySelectorAll("[data-buy]").forEach(function (btn) {
    if (checkoutReady) {
      var url = config.checkoutUrl;
      if (config.overlay) {
        url += (url.indexOf("?") === -1 ? "?" : "&") + "embed=1&media=0";
        btn.classList.add("lemonsqueezy-button");
      }
      btn.setAttribute("href", url);
      btn.setAttribute("rel", "noopener");
    } else {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        toast("Checkout opens soon. Add your Lemon Squeezy link in assets/js/config.js.");
      });
    }
  });

  // Buyers must tick the consent box (immediate access, no cancellation)
  // before checkout opens. Capture phase runs before Lemon.js's own handler.
  var consent = document.getElementById("consent");
  if (consent) {
    var syncConsent = function () {
      document.querySelectorAll("[data-buy]").forEach(function (btn) {
        btn.setAttribute("aria-disabled", String(!consent.checked));
      });
    };
    consent.addEventListener("change", syncConsent);
    syncConsent();

    document.addEventListener("click", function (e) {
      var btn = e.target.closest && e.target.closest("[data-buy]");
      if (!btn || consent.checked) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();
      consent.closest(".consent").classList.add("nudge");
      setTimeout(function () { consent.closest(".consent").classList.remove("nudge"); }, 600);
      consent.focus();
      toast("Please tick the box above the button to continue.");
    }, true);
  }

  window.addEventListener("load", function () {
    if (checkoutReady && config.overlay && typeof window.createLemonSqueezy === "function") {
      window.createLemonSqueezy();
    }
  });

  // ---- Header: border on scroll, mobile menu ----
  var header = document.querySelector(".site-header");
  function onScroll() {
    if (header) header.classList.toggle("scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var menuBtn = document.querySelector(".menu-btn");
  var mobileNav = document.querySelector(".mobile-nav");
  if (menuBtn && mobileNav) {
    var setMenu = function (open) {
      mobileNav.classList.toggle("open", open);
      menuBtn.setAttribute("aria-expanded", String(open));
    };
    menuBtn.addEventListener("click", function () {
      setMenu(!mobileNav.classList.contains("open"));
    });
    mobileNav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { setMenu(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMenu(false);
    });
  }

  // ---- Copy buttons ----
  document.querySelectorAll(".copy").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var code = btn.parentElement.querySelector("code");
      if (!code) return;
      var text = code.textContent.trim();
      var done = function () {
        btn.textContent = "Copied";
        btn.classList.add("done");
        setTimeout(function () { btn.textContent = "Copy"; btn.classList.remove("done"); }, 1600);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, function () { toast("Couldn't copy. Select the text instead."); });
      } else {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); done(); } catch (err) { toast("Couldn't copy. Select the text instead."); }
        document.body.removeChild(ta);
      }
    });
  });

  // ---- Reveal on scroll ----
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  // ---- Showcase video: sound toggle on the hero, "watch with sound" on the demo ----
  document.querySelectorAll("[data-sound]").forEach(function (btn) {
    var video = document.getElementById(btn.getAttribute("data-sound"));
    if (!video) return;
    btn.addEventListener("click", function () {
      video.muted = !video.muted;
      if (!video.muted) {
        video.currentTime = 0;
        video.play();
      }
      btn.setAttribute("aria-pressed", String(!video.muted));
    });
  });

  document.querySelectorAll("[data-play]").forEach(function (btn) {
    var video = document.getElementById(btn.getAttribute("data-play"));
    if (!video) return;
    var hero = document.getElementById("hero-video");
    btn.addEventListener("click", function () {
      if (hero && !hero.muted) {
        hero.muted = true;
        var heroBtn = document.querySelector('[data-sound="hero-video"]');
        if (heroBtn) heroBtn.setAttribute("aria-pressed", "false");
      }
      video.muted = false;
      video.play();
    });
    video.addEventListener("play", function () { btn.hidden = true; });
    video.addEventListener("pause", function () { btn.hidden = false; });
  });

  // ---- Proof reels: play while on screen (muted), one with sound at a time ----
  var proofVideos = document.querySelectorAll(".proof-video");
  function muteOthers(keep) {
    document.querySelectorAll("video").forEach(function (v) {
      if (v !== keep && !v.muted) {
        v.muted = true;
        if (v.id === "demo-video") v.pause();
      }
    });
    document.querySelectorAll("[data-sound], [data-proof-sound]").forEach(function (b) {
      var id = b.getAttribute("data-sound") || b.getAttribute("data-proof-sound");
      if (!keep || id !== keep.id) b.setAttribute("aria-pressed", "false");
    });
  }
  if ("IntersectionObserver" in window && !reduceMotion) {
    var pio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { var p = e.target.play(); if (p && p.catch) p.catch(function () {}); }
        else e.target.pause();
      });
    }, { threshold: 0.35 });
    proofVideos.forEach(function (v) { pio.observe(v); });
  }
  proofVideos.forEach(function (v) {
    v.addEventListener("click", function () { if (v.paused) v.play(); else v.pause(); });
  });
  // whichever video gets its sound turned on, every other one goes quiet
  document.querySelectorAll("video").forEach(function (v) {
    v.addEventListener("volumechange", function () { if (!v.muted) muteOthers(v); });
  });
  document.querySelectorAll("[data-proof-sound]").forEach(function (btn) {
    var video = document.getElementById(btn.getAttribute("data-proof-sound"));
    if (!video) return;
    btn.addEventListener("click", function () {
      if (video.muted) {
        video.muted = false;
        video.currentTime = 0;
        video.play();
      } else {
        video.muted = true;
      }
      btn.setAttribute("aria-pressed", String(!video.muted));
    });
  });

  // Respect reduced motion: no autoplaying video
  var heroVideo = document.getElementById("hero-video");
  if (heroVideo && reduceMotion) {
    heroVideo.removeAttribute("autoplay");
    heroVideo.pause();
  }

  // ---- Year ----
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
