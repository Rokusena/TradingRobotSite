(() => {
  const toggle = document.querySelector("[data-nav-toggle]");
  const links = document.querySelector("[data-nav-links]");

  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const isOpen = links.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    links.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      links.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  }

  const revealEls = Array.from(document.querySelectorAll(".reveal"));
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        }
      },
      { threshold: 0.12 }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }
})();