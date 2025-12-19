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

  // Contact page: simple math check + mailto submit (front-end only)
  const contactForm = document.querySelector("[data-contact-form]");
  if (contactForm) {
    const qEl = contactForm.querySelector("[data-captcha-q]");
    const refreshBtn = contactForm.querySelector("[data-captcha-refresh]");
    const msgEl = contactForm.querySelector("[data-form-msg]");

    let a = 0,
      b = 0;

    const newCaptcha = () => {
      a = Math.floor(Math.random() * 8) + 2; // 2..9
      b = Math.floor(Math.random() * 8) + 2; // 2..9
      if (qEl) qEl.textContent = `${a} + ${b} = ?`;
      const ans = contactForm.querySelector("#captchaAnswer");
      if (ans) ans.value = "";
      if (msgEl) msgEl.textContent = "";
    };

    refreshBtn?.addEventListener("click", newCaptcha);
    newCaptcha();

    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const email = contactForm.querySelector("#email")?.value?.trim() ?? "";
      const phone = contactForm.querySelector("#phone")?.value?.trim() ?? "";
      const message = contactForm.querySelector("#message")?.value?.trim() ?? "";
      const notRobot = contactForm.querySelector("#notRobot")?.checked ?? false;
      const captchaAnswer = contactForm.querySelector("#captchaAnswer")?.value?.trim() ?? "";
      const honey = contactForm.querySelector('input[name="company"]')?.value?.trim() ?? "";

      if (honey) return; // bot

      const expected = a + b;
      const got = Number(captchaAnswer);

      if (!email || !phone || !message) {
        if (msgEl) msgEl.textContent = "Please fill in email, phone, and message.";
        return;
      }
      if (!notRobot) {
        if (msgEl) msgEl.textContent = "Please confirm you’re not a robot.";
        return;
      }
      if (!Number.isFinite(got) || got !== expected) {
        if (msgEl) msgEl.textContent = "Captcha answer is incorrect. Try again.";
        newCaptcha();
        return;
      }

      const toEmail = contactForm.getAttribute("data-contact-to") || "furtiluna@example.com";
      const subject = encodeURIComponent("Furtiluna contact request");
      const body = encodeURIComponent(
        `Email: ${email}\nPhone: ${phone}\n\nMessage:\n${message}\n`
      );

      window.location.href = `mailto:${toEmail}?subject=${subject}&body=${body}`;
      if (msgEl) msgEl.textContent = "Opening your email app…";
      contactForm.reset();
      newCaptcha();
    });
  }
})();