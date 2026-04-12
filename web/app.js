// ============================================================
// App -- Tab switching, copy/download, initialization
// Depends on: SynthEngine, SynthUI, ConfigGenerator
// ============================================================

(function () {
  "use strict";

  function $(sel) { return document.querySelector(sel); }

  // --- Tab switching -------------------------------------------------------

  function switchTab(tabName) {
    // Update tab buttons
    var tabs = document.querySelectorAll(".tab");
    for (var i = 0; i < tabs.length; i++) {
      var active = tabs[i].getAttribute("data-tab") === tabName;
      tabs[i].classList.toggle("active", active);
      tabs[i].setAttribute("aria-selected", active ? "true" : "false");
    }

    // Update panels
    var panels = document.querySelectorAll(".tab-panel");
    for (var j = 0; j < panels.length; j++) {
      panels[j].classList.toggle("active", panels[j].id === "tab-" + tabName);
    }

    // Init config panel on first view
    if (tabName === "config") {
      ConfigGenerator.render();
    }
  }

  // --- Toast ---------------------------------------------------------------

  function showToast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(function () { t.classList.remove("show"); }, 2000);
  }

  // --- Copy & Download -----------------------------------------------------

  function copyToClipboard() {
    var code = ConfigGenerator.getRawCode();
    var btn = $("#btn-copy");

    function onSuccess() {
      btn.classList.add("copied");
      btn.textContent = "\u2713 Copied!";
      showToast("Code copied to clipboard!");
      setTimeout(function () {
        btn.classList.remove("copied");
        btn.textContent = "Copy to Clipboard";
      }, 2000);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(onSuccess).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }

    function fallbackCopy() {
      var ta = document.createElement("textarea");
      ta.value = code;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        onSuccess();
      } catch (e) {
        showToast("Copy failed \u2014 select the code manually");
      }
      document.body.removeChild(ta);
    }
  }

  function downloadCode() {
    var code = ConfigGenerator.getRawCode();
    var blob = new Blob([code], { type: "text/plain" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "code.py";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Downloading code.py\u2026");
  }

  // --- Init ----------------------------------------------------------------

  function init() {
    // Tab buttons
    var tabs = document.querySelectorAll(".tab");
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener("click", function () {
        switchTab(this.getAttribute("data-tab"));
      });
    }

    // Copy/download
    var copyBtn = $("#btn-copy");
    if (copyBtn) copyBtn.addEventListener("click", copyToClipboard);
    var dlBtn = $("#btn-download");
    if (dlBtn) dlBtn.addEventListener("click", downloadCode);

    // Init synth UI (play tab is active by default)
    SynthUI.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
