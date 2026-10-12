const menuToggle = document.querySelector(".menu-toggle");
const primaryNavigation = document.querySelector("#primary-navigation");
const mobileMenu = window.matchMedia("(max-width: 780px)");
const compactSchedule = window.matchMedia("(max-width: 560px)");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const scheduleDisclosure = document.querySelector(".visit-schedule-disclosure");
const revealElements = document.querySelectorAll(".reveal");
const navigationLinks = document.querySelectorAll(".site-nav__link");
const observedSections = document.querySelectorAll("main > section[id]");

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
