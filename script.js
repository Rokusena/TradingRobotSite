(() => {
  // Enable JS-only behaviors (used by CSS to prevent blank pages)
  document.documentElement.classList.add("js");

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

  // Application modal (Buy -> Questions -> (qualified) Booking)
  const BOOKING_URL = ""; // TODO: put your Calendly link here (e.g., https://calendly.com/yourname/intro)
  const LEAD_TO_EMAIL = "Hello@furtiluna.com"; // used for mailto fallback
  const modal = document.querySelector("[data-apply-modal]");
  const openBtns = Array.from(document.querySelectorAll("[data-apply-open]"));
  const closeBtns = Array.from(document.querySelectorAll("[data-apply-close]"));
  const planText = document.querySelector("[data-apply-planText]");
  const form = document.querySelector("[data-apply-form]");
  const msg = document.querySelector("[data-apply-msg]");
  const stepQuestions = document.querySelector('[data-apply-step="questions"]');
  const stepBooking = document.querySelector('[data-apply-step="booking"]');
  const stepLead = document.querySelector('[data-apply-step="lead"]');
  const backBtn = document.querySelector("[data-apply-back]");
  const bookLink = document.querySelector("[data-book-link]");
  const bookEmpty = document.querySelector("[data-book-empty]");

  const setMsg = (text) => {
    if (msg) msg.textContent = text;
  };

  const showStep = (name) => {
    if (!stepQuestions || !stepBooking || !stepLead) return;
    stepQuestions.hidden = name !== "questions";
    stepBooking.hidden = name !== "booking";
    stepLead.hidden = name !== "lead";
  };

  const openModal = (plan) => {
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    showStep("questions");
    setMsg("");
    if (planText) planText.textContent = `Selected: ${plan || "—"}`;
    const closeBtn = modal.querySelector("[data-apply-close]");
    if (closeBtn && typeof closeBtn.focus === "function") closeBtn.focus();
  };

  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  if (modal) {
    // Close on escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
    });
  }

  openBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const plan = btn.getAttribute("data-plan") || "";
      openModal(plan);
    });
  });

  closeBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      closeModal();
    });
  });

  backBtn?.addEventListener("click", () => {
    showStep("questions");
    setMsg("");
  });

  // Lead form (for applicants not eligible for booking yet)
  const leadForm = document.querySelector("[data-lead-form]");
  const leadMsg = document.querySelector("[data-lead-msg]");
  const setLeadMsg = (text) => {
    if (leadMsg) leadMsg.textContent = text;
  };

  const currentSelectionText = () => {
    return planText?.textContent?.replace(/^Selected:\s*/, "")?.trim() || "";
  };

  const mailtoLead = ({ name, email, phone, meta }) => {
    const subject = encodeURIComponent("Furtiluna application follow-up");
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\n\n---\n${meta}\n`
    );
    window.location.href = `mailto:${encodeURIComponent(LEAD_TO_EMAIL)}?subject=${subject}&body=${body}`;
  };

  leadForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    setLeadMsg("");

    const name = leadForm.querySelector("#leadName")?.value?.trim() ?? "";
    const email = leadForm.querySelector("#leadEmail")?.value?.trim() ?? "";
    const phone = leadForm.querySelector("#leadPhone")?.value?.trim() ?? "";

    if (!name || !email || !phone) {
      setLeadMsg("Please fill in name, email, and phone.");
      return;
    }

    // Internal-only meta (not shown to user)
    const bg = form?.querySelector("#bg")?.value || "";
    const exp = form?.querySelector("#exp")?.value || "";
    const income = form?.querySelector("#income")?.value || "";
    const goals = form?.querySelector("#goals")?.value?.trim() || "";
    const why = form?.querySelector("#why")?.value?.trim() || "";
    const plan = currentSelectionText();

    const meta =
      `Selected plan: ${plan || ""}\n` +
      `Background: ${bg}\n` +
      `Experience: ${exp}\n` +
      `Income bracket: ${income}\n\n` +
      `Goals:\n${goals}\n\nWhy:\n${why}\n`;

    setLeadMsg("Submitting…");

    // Try Vercel API if available; otherwise fall back to mailto
    try {
      const resp = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone, message: `Lead capture\n\n${meta}\n`, company: "", turnstileToken: "" }),
      });

      const data = await resp.json().catch(() => null);
      if (resp.ok && data?.ok) {
        setLeadMsg("Thanks! We’ll reach out soon.");
        leadForm.reset();
        return;
      }
    } catch {
      // ignore and fall back
    }

    setLeadMsg("Thanks! Please confirm in your email app.");
    mailtoLead({ name, email, phone, meta });
  });

  // Update motivation label
  const motivation = document.querySelector("#motivation");
  const motivationLabel = document.querySelector("[data-range-value]");
  if (motivation && motivationLabel) {
    const update = () => {
      motivationLabel.textContent = `${motivation.value} / 10`;
    };
    motivation.addEventListener("input", update);
    update();
  }

  // Booking link
  const setupBookingLink = () => {
    if (!bookLink || !bookEmpty) return;
    if (BOOKING_URL) {
      bookLink.hidden = false;
      bookLink.setAttribute("href", BOOKING_URL);
      bookEmpty.hidden = true;
    } else {
      bookLink.hidden = true;
      bookEmpty.hidden = false;
    }
  };
  setupBookingLink();

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    setMsg("");

    const income = form.querySelector("#income")?.value || "";
    const experience = form.querySelector("#exp")?.value || "";
    const goals = form.querySelector("#goals")?.value?.trim() || "";
    const why = form.querySelector("#why")?.value?.trim() || "";
    const timeline = form.querySelector("#timeline")?.value || "";
    const background = form.querySelector("#bg")?.value || "";
    const readiness = form.querySelector("#ready")?.value || "";

    if (!background || !experience || !goals || !why || !timeline || !income || !readiness) {
      setMsg("Please complete all required fields.");
      return;
    }

    // Qualification rules:
    // - income must be above $6k (6-8k, 8-10k, 10k+)
    // - must have prior trading/investing experience (not 'No prior experience')
    const incomeOk = income === "6-8k" || income === "8-10k" || income === "10k+";
    const experienceOk = experience !== "none";

    if (!incomeOk || !experienceOk) {
      showStep("lead");
      setLeadMsg("");
      return;
    }

    showStep("booking");
    setupBookingLink();
  });

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

  // Header unblur on scroll (subtle)
  let scrollTicking = false;
  const updateScrolled = () => {
    const scrolled = window.scrollY > 8;
    document.body.classList.toggle("is-scrolled", scrolled);
    scrollTicking = false;
  };
  window.addEventListener(
    "scroll",
    () => {
      if (scrollTicking) return;
      scrollTicking = true;
      window.requestAnimationFrame(updateScrolled);
    },
    { passive: true }
  );
  updateScrolled();

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

