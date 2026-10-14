import { initConsent } from "./consent.js";

// Show the real home hero before the larger application bundle restores the session.
// Other hash routes keep their loading state until their own page is ready.
if (!location.hash || location.hash === "#home") {
  const main = document.getElementById("main");
  const shell = document.getElementById("home-shell");
  if (main && shell) {
    main.replaceChildren(shell.content.cloneNode(true));
    main.dataset.bootHome = "1";
  }
}

// Render the independent cookie notice before the much larger application bundle loads.
initConsent();
