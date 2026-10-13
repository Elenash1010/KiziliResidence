const menuToggle = document.querySelector(".menu-toggle");
const primaryNavigation = document.querySelector("#primary-navigation");
const mobileMenu = window.matchMedia("(max-width: 1100px)");
const compactSchedule = window.matchMedia("(max-width: 560px)");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const scheduleDisclosure = document.querySelector(".visit-schedule-disclosure");
const revealElements = document.querySelectorAll(".reveal");
const navigationLinks = document.querySelectorAll(".site-nav__link");
const observedSections = document.querySelectorAll("main > section[id]");

const screenHeadings = document.querySelectorAll("main .screen h1[id], main .screen h2[id]");

function centerHeroTitle() {
  const art = document.querySelector(".hero__art");
  const title = document.querySelector(".hero__title-art");
  const buttons = [...document.querySelectorAll(".hero__actions .button")];
  if (!art || !title || !buttons.length) return;
  const bounds = buttons.map(button => button.getBoundingClientRect());
  const left = Math.min(...bounds.map(rect => rect.left));
  const right = Math.max(...bounds.map(rect => rect.right));
  title.style.setProperty("--hero-title-center", `${(left + right) / 2 - art.getBoundingClientRect().left}px`);
}

centerHeroTitle();
document.fonts?.ready.then(centerHeroTitle);
window.addEventListener("resize", centerHeroTitle);
if ("ResizeObserver" in window) {
  const heroActions = document.querySelector(".hero__actions");
  if (heroActions) new ResizeObserver(centerHeroTitle).observe(heroActions);
}

function fitScreenHeadings() {
  screenHeadings.forEach((heading) => {
    heading.style.fontSize = "72px";
    const availableWidth = heading.clientWidth;
    const textWidth = heading.scrollWidth;

    if (availableWidth > 0 && textWidth > availableWidth) {
      heading.style.fontSize = `${Math.floor((72 * availableWidth / textWidth) * 10) / 10}px`;
    }
  });
}

fitScreenHeadings();
document.fonts?.ready.then(fitScreenHeadings);
window.addEventListener("resize", fitScreenHeadings);

if ("ResizeObserver" in window) {
  const headingWidths = new WeakMap();
  const headingWidthObserver = new ResizeObserver((entries) => {
    let changed = false;
    entries.forEach((entry) => {
      const width = entry.contentRect.width;
      if (headingWidths.get(entry.target) !== width) {
        headingWidths.set(entry.target, width);
        changed = true;
      }
    });
    if (changed) fitScreenHeadings();
  });
  screenHeadings.forEach((heading) => headingWidthObserver.observe(heading.parentElement));
}

function closeMenu() {
  menuToggle?.setAttribute("aria-expanded", "false");
  menuToggle?.setAttribute("aria-label", "Открыть меню");
  primaryNavigation?.classList.remove("is-open");
}

if (compactSchedule.matches) {
  scheduleDisclosure?.removeAttribute("open");
}

menuToggle?.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";

  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Открыть меню" : "Закрыть меню");
  primaryNavigation?.classList.toggle("is-open", !isOpen);
});

primaryNavigation?.addEventListener("click", (event) => {
  if (event.target instanceof Element && event.target.closest("a") && mobileMenu.matches) {
    closeMenu();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMenu();
  }
});

window.addEventListener("resize", () => {
  if (!mobileMenu.matches) {
    closeMenu();
  }

  scheduleDisclosure?.toggleAttribute("open", !compactSchedule.matches);
});

if ("IntersectionObserver" in window && !reduceMotion.matches) {
  document.documentElement.classList.add("has-reveal-animations");

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  revealElements.forEach((element) => revealObserver.observe(element));

  const navigationObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          navigationLinks.forEach((link) => {
            const isCurrent = link.getAttribute("href") === `#${entry.target.id}`;

            link.classList.toggle("is-active", isCurrent);
            if (isCurrent) {
              link.setAttribute("aria-current", "location");
            } else {
              link.removeAttribute("aria-current");
            }
          });
        }
      });
    },
    { rootMargin: "-28% 0px -52% 0px" }
  );

  observedSections.forEach((section) => navigationObserver.observe(section));
} else {
  revealElements.forEach((element) => element.classList.add("is-visible"));
}
