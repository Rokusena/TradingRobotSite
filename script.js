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

  // FAQ: keep only one item open at a time
  const faqRoot = document.querySelector("[data-faq]");
  if (faqRoot) {
    const items = Array.from(faqRoot.querySelectorAll("details"));
    items.forEach((item) => {
      item.addEventListener("toggle", () => {
        if (!item.open) return;
        items.forEach((other) => {
          if (other !== item) other.open = false;
        });
      });
    });
  }

  const backToTop = document.querySelector("[data-back-to-top]");
  if (backToTop) {
    backToTop.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      history.replaceState(null, "", "#top");
    });
  }

  // Contact page: submit to Vercel API (/api/contact)
  const contactForm = document.querySelector("[data-contact-form]");
  if (contactForm) {
    const msgEl = contactForm.querySelector("[data-form-msg]");
    const submitBtn = contactForm.querySelector('button[type="submit"]');

    const setMsg = (text) => {
      if (msgEl) msgEl.textContent = text;
    };

    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = contactForm.querySelector("#email")?.value?.trim() ?? "";
      const phone = contactForm.querySelector("#phone")?.value?.trim() ?? "";
      const message = contactForm.querySelector("#message")?.value?.trim() ?? "";
      const company = contactForm.querySelector('input[name="company"]')?.value?.trim() ?? "";
      const turnstileToken =
        contactForm.querySelector('input[name="cf-turnstile-response"]')?.value?.trim() ?? "";

      if (!email || !phone || !message) {
        setMsg("Please fill in email, phone, and message.");
        return;
      }

      submitBtn && (submitBtn.disabled = true);
      setMsg("Sending…");

      try {
        const resp = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, phone, message, company, turnstileToken }),
        });

        const data = await resp.json().catch(() => null);

        if (!resp.ok || !data?.ok) {
          setMsg("Send failed. Please try again later.");
          submitBtn && (submitBtn.disabled = false);
          return;
        }

        setMsg("Message sent. Thank you!");
        contactForm.reset();
        submitBtn && (submitBtn.disabled = false);
      } catch {
        setMsg("Send failed (offline?). Please try again later.");
        submitBtn && (submitBtn.disabled = false);
      }
    });
  }
})();

