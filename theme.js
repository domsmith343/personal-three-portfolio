// Theme toggle, shared by every page. The inline script in <head> already set
// data-theme before first paint; this flips it on click and remembers the pick.
(function () {
  var root = document.documentElement;
  var toggle = document.getElementById("themeToggle");
  var mq = window.matchMedia("(prefers-color-scheme: dark)");

  function saved() {
    try { return localStorage.getItem("theme"); } catch (e) { return null; }
  }
  function setTheme(mode, persist) {
    root.setAttribute("data-theme", mode);
    if (toggle) toggle.setAttribute("aria-label", mode === "dark" ? "Switch to light mode" : "Switch to dark mode");
    if (persist) { try { localStorage.setItem("theme", mode); } catch (e) {} }
    document.dispatchEvent(new CustomEvent("themechange", { detail: mode }));
  }

  if (toggle) {
    toggle.addEventListener("click", function () {
      setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark", true);
    });
  }
  // Follow the device setting until the visitor picks a theme themselves.
  mq.addEventListener("change", function (e) {
    if (!saved()) setTheme(e.matches ? "dark" : "light", false);
  });
  setTheme(root.getAttribute("data-theme") || (mq.matches ? "dark" : "light"), false);
})();
