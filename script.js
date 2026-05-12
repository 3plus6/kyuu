const year = document.querySelector("[data-year]");
const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const nav = document.querySelector("[data-nav]");

if (year) {
  year.textContent = new Date().getFullYear();
}

const setMenuOpen = (isOpen) => {
  if (!header || !menuToggle) return;
  header.classList.toggle("is-menu-open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
};

const updateHeader = () => {
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 8);
};

if (menuToggle) {
  menuToggle.addEventListener("click", () => {
    setMenuOpen(!header?.classList.contains("is-menu-open"));
  });
}

if (nav) {
  nav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      setMenuOpen(false);
    }
  });
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setMenuOpen(false);
  }
});

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });
