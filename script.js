const year = document.querySelector("[data-year]");
const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const nav = document.querySelector("[data-nav]");
if (year) year.textContent = new Date().getFullYear();
const setMenuOpen = (open) => {
  header?.classList.toggle("is-menu-open", open);
  menuToggle?.setAttribute("aria-expanded", String(open));
};
menuToggle?.addEventListener("click", () => setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true"));
nav?.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMenuOpen(false);
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMenuOpen(false);
});
const clamp = (n) => Math.min(1, Math.max(0, n));
const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
const chapters = [...document.querySelectorAll("[data-chapter]")].map((section) => ({
  section,
  stage: section.querySelector(".chapter-stage"),
  scraps: [...section.querySelectorAll("[data-motion]")],
}));
const chapterLinks = [...document.querySelectorAll("[data-chapter-link]")];
const openingSection = document.querySelector("#opening");
const chapterMenu = document.querySelector(".chapter-nav");
const homeFooter = document.querySelector(".home-footer");
// Reuse the actual artwork for displaced slices; no colored bars or flashing overlay.
document.querySelectorAll(".refine-angel, .operate-forest, .build-statue").forEach((scrap, scrapIndex) => {
  const source = scrap.querySelector("svg");
  if (!source) return;
  for (let i = 0; i < 4; i++) {
    const slice = source.cloneNode(true);
    slice.classList.add("glitch-slice", "glitch-slice-" + i);
    slice.setAttribute("aria-hidden", "true");
    const ns = "http://www.w3.org/2000/svg";
    const defs = document.createElementNS(ns, "defs");
    const filterId = "rgb-fracture-" + scrapIndex + "-" + i;
    // Split the source pixels into actual RGB channels, offset, then recombine.
    defs.innerHTML = `<filter id="${filterId}" x="-15%" y="-10%" width="130%" height="120%" color-interpolation-filters="sRGB">
      <feColorMatrix in="SourceGraphic" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r"/>
      <feOffset in="r" dx="9" dy="0" result="red"/>
      <feColorMatrix in="SourceGraphic" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green"/>
      <feColorMatrix in="SourceGraphic" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b"/>
      <feOffset in="b" dx="-7" dy="2" result="blue"/>
      <feBlend in="red" in2="green" mode="screen" result="rg"/>
      <feBlend in="rg" in2="blue" mode="screen"/>
    </filter>`;
    slice.prepend(defs);
    slice.querySelector("image").setAttribute("filter", "url(#" + filterId + ")");
    scrap.append(slice);
  }
});
document.querySelectorAll(".chapter-title").forEach((title) => {
  const text = title.textContent;
  ["red", "green", "blue"].forEach((channel) => {
    const echo = document.createElement("span");
    echo.className = "rgb-title rgb-title-" + channel;
    echo.setAttribute("aria-hidden", "true");
    echo.textContent = text;
    title.append(echo);
  });
});
// Full-width scanline faults cross the entire scene, never the opening artwork.
const fractureStates = new WeakMap();
chapters.forEach(({section, stage}) => {
  if (section.id === "opening") return;
  const ns = "http://www.w3.org/2000/svg";
  const field = document.createElementNS(ns, "svg");
  field.classList.add("background-fracture");
  field.setAttribute("viewBox", "0 0 1000 700");
  field.setAttribute("preserveAspectRatio", "none");
  field.setAttribute("aria-hidden", "true");
  const colors = ["#ff254c", "#29dd88", "#397cff", "#888888"];
  for (let band = 0; band < 4; band++) {
    const y = 0;
    const group = document.createElementNS(ns, "g");
    colors.slice(0, 3).forEach((color, channel) => {
      const line = document.createElementNS(ns, "rect");
      line.setAttribute("x", "0");
      line.setAttribute("y", String(y + channel * 2));
      line.setAttribute("width", "1000");
      line.setAttribute("height", channel === 1 ? "1.5" : ".8");
      line.setAttribute("fill", color);
      line.setAttribute("opacity", ".65");
      group.append(line);
    });
    // Uneven signal blocks ride on the continuous horizontal fault.
    for (let i = 0; i < 42; i++) {
      const pixel = document.createElementNS(ns, "rect");
      pixel.setAttribute("x", String(Math.random() * 1000));
      pixel.setAttribute("y", String(y - 3 + Math.random() * 10));
      pixel.setAttribute("width", String(2 + Math.random() ** 2 * 65));
      pixel.setAttribute("height", String(1 + Math.random() * 4));
      pixel.setAttribute("fill", colors[Math.floor(Math.random() * colors.length)]);
      group.append(pixel);
    }
    field.append(group);
  }
  stage.append(field);
  fractureStates.set(stage, {groups:[...field.children], nextTime:0, lastY:window.scrollY, distance:0, enabled:false, shift:0, strength:0});
});
let ticking = false;
let scrollIdleTimer;
let scrollActive = false;
function updateExperience() {
  ticking = false;
  header?.classList.toggle("is-scrolled", window.scrollY > 8);

  const vh = window.innerHeight;
  if (chapterMenu && homeFooter) {
    const base = window.innerWidth <= 760 ? 12 : 26;
    const footerTop = homeFooter.getBoundingClientRect().top;
    chapterMenu.style.bottom = Math.max(base, vh - footerTop + base) + "px";
    const contactEntry = document.querySelector(".works-contact");
    chapterMenu.classList.toggle("at-contact", Boolean(contactEntry && contactEntry.getBoundingClientRect().top < vh * .85));
  }
  let current = "opening";
  if (openingSection) {
    document.body.classList.toggle("past-intro", openingSection.getBoundingClientRect().bottom < vh * .75);
  }
  chapters.forEach(({section, stage, scraps}) => {
    const rect = section.getBoundingClientRect();
    if (rect.top <= vh * .5) current = section.id;
    if (rect.bottom < 0 || rect.top > vh) return;
    const flowingLayout = window.innerWidth <= 760 || vh <= 600;
    // Mobile chapters are not sticky: progress must span their entire passage through the viewport.
    const p = flowingLayout
      ? clamp((vh - rect.top) / (vh + section.offsetHeight))
      : clamp(-rect.top / Math.max(1, section.offsetHeight - stage.offsetHeight));
    const opening = section.id === "opening";
    const reduced = motionPreference.matches;
    const state = fractureStates.get(stage);
    const now = performance.now();
    const canGlitch = !opening && !reduced && scrollActive;
    // Irregular scroll intervals with a minimum dwell time prevent rapid flashing.
    if (canGlitch && state && now >= state.nextTime && Math.abs(window.scrollY - state.lastY) >= state.distance) {
      state.enabled = Math.random() > .28;
      state.shift = (6 + Math.random() * 15) * (Math.random() > .5 ? 1 : -1);
      state.strength = .55 + Math.random() * .45;
      state.nextTime = now + 420 + Math.random() * 650;
      state.lastY = window.scrollY;
      state.distance = 55 + Math.random() * 190;
      const count = Math.random() < .65 ? 1 : 2 + Math.floor(Math.random() * 3);
      const anchor = 60 + Math.random() * 540;
      state.groups.forEach((group, index) => {
        group.style.display = index < count ? "" : "none";
        const y = index && Math.random() < .55 ? anchor + 8 + Math.random() * 24 : 45 + Math.random() * 610;
        // Only partial-width faults: center-to-right or left-to-middle.
        const extent = Math.random();
        let x = 0;
        let width;
        if (extent < .5) {
          x = 350 + Math.random() * 230;
          width = 1000 - x;
        } else {
          width = 380 + Math.random() * 350;
        }
        group.setAttribute("transform", `translate(${x} ${index ? y : anchor}) scale(${width / 1000} ${.45 + Math.random() * 1.8})`);
        group.setAttribute("opacity", String(.45 + Math.random() * .55));
      });
    }
    const active = canGlitch && state?.enabled;
    const displacement = active ? state.shift : 0;
    stage.style.setProperty("--slice-shift", displacement.toFixed(2) + "px");
    stage.style.setProperty("--glitch-visible", active ? String(state.strength) : "0");
    scraps.forEach((scrap) => {
      if (reduced) {
        scrap.style.removeProperty("transform");
        scrap.style.removeProperty("opacity");
        return;
      }
      const approach = clamp((vh - rect.top) / vh);
      const enter = opening ? 1 : clamp((approach - .28 + p * .6 - Number(scrap.dataset.enter || 0)) / .55);
      const ease = 1 - (1 - enter) ** 3;
      const travel = opening ? p : flowingLayout ? (p - .5) * .8 : p * .28;
      const x = Number(scrap.dataset.x || 0) * travel;
      const y = Number(scrap.dataset.y || 0) * travel + (1 - ease) * 18;
      const turn = Number(scrap.dataset.turn || 0) * (travel + (1 - ease) * .15);
      scrap.style.transform = "translate3d(" + x + "vw," + y + "vh,0) rotate(" + turn + "deg)";
      // Hide the duplicate cutouts at rest; reveal as the original composition separates.
      scrap.style.opacity = String(opening ? clamp((p - .48) * 4) : ease);
    });
  });
  const works = document.querySelector("#projects");
  if (works && works.getBoundingClientRect().top <= vh * .5) current = "projects";
  chapterLinks.forEach((link) => {
    if (link.dataset.chapterLink === current) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}
function requestUpdate() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(updateExperience);
}
window.addEventListener("scroll", () => {
  scrollActive = true;
  clearTimeout(scrollIdleTimer);
  requestUpdate();
  scrollIdleTimer = setTimeout(() => {
    scrollActive = false;
    requestUpdate();
  }, 240);
}, {passive:true});
window.addEventListener("resize", requestUpdate, {passive:true});
motionPreference.addEventListener("change", requestUpdate);
updateExperience();
