(() => {
  // Enable JS-only behaviors (used by CSS to prevent blank pages)
  document.documentElement.classList.add("js");

  const toggle = document.querySelector("[data-nav-toggle]");
  const links = document.querySelector("[data-nav-links]");

  const homeTop = document.querySelector("[data-home-top]");
  if (homeTop) {
    homeTop.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      history.replaceState(null, "", "#top");

      // Close mobile nav if open
      if (links?.classList.contains("is-open")) {
        links.classList.remove("is-open");
        toggle?.setAttribute("aria-expanded", "false");
      }
    });
  }

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
  const backBtns = Array.from(document.querySelectorAll("[data-apply-back]"));
  const slotSelect = document.querySelector("[data-slot-select]");
  const slotHint = document.querySelector("[data-slot-hint]");
  const wizPages = form ? Array.from(form.querySelectorAll("[data-apply-page]")) : [];
  const wizBack = modal?.querySelector("[data-wiz-back]") ?? null;
  const wizNext = modal?.querySelector("[data-wiz-next]") ?? null;
  const wizStepLabel = modal?.querySelector("[data-wiz-step]") ?? null;
  let wizIndex = 0;
  let leadFailReason = "";

  const selectedOptionText = (id) => {
    const el = form?.querySelector(`#${id}`) ?? null;
    if (!el || !el.options || typeof el.selectedIndex !== "number") return "";
    return el.options[el.selectedIndex]?.textContent?.trim() || String(el.value || "").trim();
  };

  const setMsg = (text) => {
    if (msg) msg.textContent = text;
  };

  const getCheckedLabels = (name) => {
    if (!form) return [];
    const els = Array.from(form.querySelectorAll(`input[type="checkbox"][name="${name}"]:checked`));
    return els
      .map((el) => {
        const label = el.closest("label");
        return label?.textContent?.replace(/\s+/g, " ")?.trim() || String(el.value || "").trim();
      })
      .filter(Boolean);
  };

  const collectApplicationAnswers = () => {
    if (!form) {
      return {
        plan: currentSelectionText(),
        background: "",
        experience: "",
        approach: "",
        priorEducation: "",
        challenges: [],
        goals: "",
        motivation: "",
        timeline: "",
        income: "",
        replaceIncome: "",
        readiness: "",
        why: "",
      };
    }

    const plan = currentSelectionText();

    const background = form.querySelector("#bg")?.value || "";
    const backgroundText = background ? selectedOptionText("bg") : "";

    const experience = form.querySelector("#exp")?.value || "";
    const experienceText = experience ? selectedOptionText("exp") : "";

    const income = form.querySelector("#income")?.value || "";
    const incomeText = income ? selectedOptionText("income") : "";

    const timeline = form.querySelector("#timeline")?.value || "";
    const timelineText = timeline ? selectedOptionText("timeline") : "";

    const readiness = form.querySelector("#ready")?.value || "";
    const readinessText = readiness ? selectedOptionText("ready") : "";

    const approach = form.querySelector("#approach")?.value?.trim() || "";
    const priorEducation = form.querySelector("#education")?.value?.trim() || "";
    const replaceIncome = form.querySelector("#replace")?.value?.trim() || "";
    const goals = form.querySelector("#goals")?.value?.trim() || "";
    const why = form.querySelector("#why")?.value?.trim() || "";
    const motivation = form.querySelector("#motivation")?.value || "";
    const challenges = getCheckedLabels("challenges");

    return {
      plan,
      background: backgroundText || background,
      experience: experienceText || experience,
      approach,
      priorEducation,
      challenges,
      goals,
      motivation,
      timeline: timelineText || timeline,
      income: incomeText || income,
      replaceIncome,
      readiness: readinessText || readiness,
      why,
    };
  };

  const buildApplicationMeta = ({ status, name, email, phone, failReason }) => {
    const a = collectApplicationAnswers();
    const lines = [];

    lines.push("Furtiluna application submission");
    lines.push("");
    lines.push(`Status: ${status || ""}`);
    if (failReason) lines.push(`Fail reason: ${failReason}`);
    lines.push("");

    lines.push("--- Applicant ---");
    lines.push(`Name: ${name || ""}`);
    lines.push(`Email: ${email || ""}`);
    lines.push(`Phone: ${phone || ""}`);
    lines.push("");

    lines.push("--- Selected plan ---");
    lines.push(a.plan || "");
    lines.push("");

    lines.push("--- Background & Experience ---");
    lines.push(`Background: ${a.background || ""}`);
    lines.push(`Experience: ${a.experience || ""}`);
    lines.push("");

    lines.push("--- Trading History & Knowledge ---");
    lines.push(`Approach used: ${a.approach || ""}`);
    lines.push(`Prior education: ${a.priorEducation || ""}`);
    lines.push("");

    lines.push("--- Challenges ---");
    lines.push(a.challenges.length ? a.challenges.join(" | ") : "(none selected)");
    lines.push("");

    lines.push("--- Goals & Commitment ---");
    lines.push(`Goals (12–24 months): ${a.goals || ""}`);
    lines.push(`Motivation (1–10): ${a.motivation || ""}`);
    lines.push(`Profitability timeline: ${a.timeline || ""}`);
    lines.push("");

    lines.push("--- Financial Context ---");
    lines.push(`Monthly income: ${a.income || ""}`);
    lines.push(`Income to replace: ${a.replaceIncome || ""}`);
    lines.push("");

    lines.push("--- Investment Readiness ---");
    lines.push(`Readiness: ${a.readiness || ""}`);
    lines.push("");

    lines.push("--- Why ---");
    lines.push(a.why || "");

    return lines.join("\n");
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
    if (form) form.reset();
    wizIndex = 0;
    renderWizard();
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

  backBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      showStep("questions");
      setMsg("");
    });
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

  const mailtoLead = ({ name, email, phone, meta, subjectText }) => {
    const subject = encodeURIComponent(subjectText || "Furtiluna application follow-up");
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\n\n---\n${meta}\n`
    );
    window.location.href = `mailto:${encodeURIComponent(LEAD_TO_EMAIL)}?subject=${subject}&body=${body}`;
  };

  // Qualified booking step: collect contact info + send full application
  const bookForm = document.querySelector("[data-book-form]");
  const bookMsg = document.querySelector("[data-book-msg]");
  const setBookMsg = (text) => {
    if (bookMsg) bookMsg.textContent = text;
  };

  const formatSlot = (slot) => {
    try {
      const dtf = new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: slot.timezone || "UTC",
      });
      return `${dtf.format(new Date(slot.startTime))} (${slot.timezone || "UTC"})`;
    } catch {
      return `${new Date(slot.startTime).toISOString()} (${slot.timezone || "UTC"})`;
    }
  };

  const loadAvailableSlots = async () => {
    if (!slotSelect) return;
    slotSelect.innerHTML = '<option value="" selected disabled>Loading available times…</option>';
    if (slotHint) slotHint.textContent = "";

    try {
      const resp = await fetch("/api/availability?limit=50");
      const data = await resp.json().catch(() => null);
      const slots = data?.slots || [];

      if (!resp.ok || !data?.ok) throw new Error("availability failed");

      if (!slots.length) {
        slotSelect.innerHTML = '<option value="" selected disabled>No times available yet</option>';
        if (slotHint) slotHint.textContent = "Admin can add times at the bottom of the page.";
        return;
      }

      const opts = ['<option value="" selected disabled>Select a time</option>'];
      for (const s of slots) {
        opts.push(`<option value="${String(s.id)}">${formatSlot(s)}</option>`);
      }
      slotSelect.innerHTML = opts.join("");
      if (slotHint) slotHint.textContent = "Times update automatically as they are booked.";
    } catch {
      slotSelect.innerHTML = '<option value="" selected disabled>Could not load available times</option>';
      if (slotHint) slotHint.textContent = "Please try again later.";
    }
  };

  bookForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    setBookMsg("");

    const slotId = slotSelect?.value?.trim() ?? "";
    const name = bookForm.querySelector("#bookName")?.value?.trim() ?? "";
    const email = bookForm.querySelector("#bookEmail")?.value?.trim() ?? "";
    const phone = bookForm.querySelector("#bookPhone")?.value?.trim() ?? "";

    if (!slotId) {
      setBookMsg("Please select an available time.");
      return;
    }

    if (!name || !email || !phone) {
      setBookMsg("Please fill in time, name, email, and phone.");
      return;
    }

    const meta = buildApplicationMeta({
      status: "Qualified (booking)",
      name,
      email,
      phone,
      failReason: "",
    });

    const applicationJson = collectApplicationAnswers();

    const submitBtn = bookForm.querySelector('button[type="submit"]');
    submitBtn && (submitBtn.disabled = true);
    setBookMsg("Submitting…");

    try {
      const resp = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId,
          customerName: name,
          customerEmail: email,
          customerPhone: phone,
          applicationText: meta,
          applicationJson,
        }),
      });

      const data = await resp.json().catch(() => null);
      if (resp.ok && data?.ok) {
        setBookMsg("Booked! Check your email for Zoom details.");
        bookForm.reset();
        slotSelect && (slotSelect.selectedIndex = 0);
        submitBtn && (submitBtn.disabled = false);
        return;
      }
    } catch {
      // ignore
    }

    setBookMsg("Booking failed. Please try again later.");
    submitBtn && (submitBtn.disabled = false);
  });

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

    const meta = buildApplicationMeta({
      status: "Not qualified (lead)",
      name,
      email,
      phone,
      failReason: leadFailReason || "Not qualified",
    });

    setLeadMsg("Submitting…");

    // Try Vercel API if available; otherwise fall back to mailto
    try {
      const resp = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone, message: meta, company: "" }),
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
    mailtoLead({ name, email, phone, meta, subjectText: "Furtiluna application follow-up" });
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

  const validateCurrentPage = () => {
    if (!form || wizPages.length === 0) return true;
    const page = wizPages[wizIndex];
    if (!page) return true;

    const requiredEls = Array.from(page.querySelectorAll("select[required], textarea[required], input[required]"));
    for (const el of requiredEls) {
      if (typeof el.reportValidity === "function" && !el.checkValidity()) {
        el.reportValidity();
        return false;
      }
    }
    return true;
  };

  const renderWizard = () => {
    if (wizPages.length === 0) return;
    wizPages.forEach((p, idx) => {
      p.hidden = idx !== wizIndex;
    });

    if (wizStepLabel) {
      wizStepLabel.textContent = `Step ${wizIndex + 1} of ${wizPages.length}`;
    }

    if (wizBack) wizBack.disabled = wizIndex === 0;
    if (wizNext) {
      wizNext.textContent = wizIndex === wizPages.length - 1 ? "Continue" : "Next";
    }
    setMsg("");
  };

  const finishApplication = () => {
    if (!form) return;

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

    const incomeOk = income === "6-8k" || income === "8-10k" || income === "10k+";
    const experienceOk = experience !== "none";

    if (!incomeOk || !experienceOk) {
      const reasons = [];
      if (!experienceOk) reasons.push("Experience requirement not met");
      if (!incomeOk) reasons.push("Income requirement not met");
      leadFailReason = reasons.join("; ");
      showStep("lead");
      setLeadMsg("");
      return;
    }

    showStep("booking");
    loadAvailableSlots();
    setBookMsg("");
  };

  wizBack?.addEventListener("click", () => {
    if (wizIndex <= 0) return;
    wizIndex -= 1;
    renderWizard();
  });

  wizNext?.addEventListener("click", () => {
    if (!validateCurrentPage()) return;
    if (wizIndex >= wizPages.length - 1) {
      finishApplication();
      return;
    }
    wizIndex += 1;
    renderWizard();
  });

  // Prevent default form submit (we use the wizard buttons)
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
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

  // Admin calendar manager (bottom of site)
  const adminRoot = document.querySelector("[data-admin-root]");
  const adminLoginForm = document.querySelector("[data-admin-login]");
  const adminMsg = document.querySelector("[data-admin-msg]");
  const adminLogoutBtn = document.querySelector("[data-admin-logout]");
  const adminPanel = document.querySelector("[data-admin-panel]");
  const adminAddForm = document.querySelector("[data-admin-addslot]");
  const adminAddMsg = document.querySelector("[data-admin-add-msg]");
  const adminSlotsEl = document.querySelector("[data-admin-slots]");

  const setAdminMsg = (text) => {
    if (adminMsg) adminMsg.textContent = text;
  };
  const setAdminAddMsg = (text) => {
    if (adminAddMsg) adminAddMsg.textContent = text;
  };

  const authKey = "admin_basic_auth";
  const getAuthHeader = () => {
    const stored = sessionStorage.getItem(authKey);
    if (!stored) return "";
    return `Basic ${stored}`;
  };

  const setAuthFromCredentials = (user, pass) => {
    const raw = `${user}:${pass}`;
    const b64 = btoa(unescape(encodeURIComponent(raw)));
    sessionStorage.setItem(authKey, b64);
  };

  const clearAuth = () => {
    sessionStorage.removeItem(authKey);
  };

  const adminFetch = async (url, options = {}) => {
    const headers = { ...(options.headers || {}) };
    const auth = getAuthHeader();
    if (auth) headers.Authorization = auth;
    return fetch(url, { ...options, headers });
  };

  const setAdminLoggedIn = (isLoggedIn) => {
    if (adminPanel) adminPanel.hidden = !isLoggedIn;
    if (adminLogoutBtn) adminLogoutBtn.hidden = !isLoggedIn;
  };

  const renderAdminSlots = (slots) => {
    if (!adminSlotsEl) return;
    if (!Array.isArray(slots) || slots.length === 0) {
      adminSlotsEl.innerHTML = '<p class="muted">No upcoming slots.</p>';
      return;
    }

    adminSlotsEl.innerHTML = slots
      .map((s) => {
        const label = formatSlot(s);
        const booked = s.bookedAt ? " (booked)" : "";
        const disabled = s.bookedAt ? "disabled" : "";
        return (
          `<div style="display:flex; gap:10px; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--line)">` +
          `<div>${label}${booked}</div>` +
          `<button class="btn btn--ghost" type="button" data-admin-del="${String(s.id)}" ${disabled}>Delete</button>` +
          `</div>`
        );
      })
      .join("");
  };

  const refreshAdminSlots = async () => {
    if (!adminRoot) return;
    try {
      const resp = await adminFetch("/api/admin/slots?limit=200");
      const data = await resp.json().catch(() => null);
      if (!resp.ok || !data?.ok) throw new Error("admin slots failed");
      renderAdminSlots(data.slots || []);
    } catch {
      renderAdminSlots([]);
    }
  };

  const tryAdminAutoLogin = async () => {
    if (!adminRoot) return;
    const auth = getAuthHeader();
    if (!auth) return;

    try {
      const resp = await adminFetch("/api/admin/slots?limit=1");
      if (!resp.ok) throw new Error("not authorized");
      setAdminLoggedIn(true);
      setAdminMsg("");
      await refreshAdminSlots();
    } catch {
      clearAuth();
      setAdminLoggedIn(false);
    }
  };

  adminLoginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    setAdminMsg("");

    const user = adminLoginForm.querySelector("#adminUser")?.value?.trim() ?? "";
    const pass = adminLoginForm.querySelector("#adminPass")?.value ?? "";
    if (!user || !pass) {
      setAdminMsg("Enter username and password.");
      return;
    }

    setAuthFromCredentials(user, pass);
    try {
      const resp = await adminFetch("/api/admin/slots?limit=1");
      if (!resp.ok) throw new Error("bad login");
      setAdminLoggedIn(true);
      setAdminMsg("Logged in.");
      await refreshAdminSlots();
    } catch {
      clearAuth();
      setAdminLoggedIn(false);
      setAdminMsg("Login failed.");
    }
  });

  adminLogoutBtn?.addEventListener("click", () => {
    clearAuth();
    setAdminLoggedIn(false);
    setAdminMsg("Logged out.");
  });

  adminAddForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    setAdminAddMsg("");

    const whenRaw = adminAddForm.querySelector("#slotWhen")?.value ?? "";
    const durationRaw = adminAddForm.querySelector("#slotDuration")?.value ?? "";
    const startLocal = whenRaw ? new Date(whenRaw) : null;
    const durationMinutes = Number.parseInt(String(durationRaw), 10);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

    if (!startLocal || !Number.isFinite(startLocal.getTime())) {
      setAdminAddMsg("Choose a valid start time.");
      return;
    }
    if (!Number.isFinite(durationMinutes) || durationMinutes < 5 || durationMinutes > 240) {
      setAdminAddMsg("Duration must be between 5 and 240 minutes.");
      return;
    }

    setAdminAddMsg("Adding…");
    try {
      const resp = await adminFetch("/api/admin/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: startLocal.toISOString(),
          timezone,
          durationMinutes,
        }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok || !data?.ok) throw new Error("add failed");
      setAdminAddMsg("Added.");
      adminAddForm.reset();
      await refreshAdminSlots();
    } catch {
      setAdminAddMsg("Could not add slot.");
    }
  });

  adminSlotsEl?.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-admin-del]");
    if (!btn) return;
    const id = btn.getAttribute("data-admin-del") || "";
    if (!id) return;

    try {
      const resp = await adminFetch(`/api/admin/slots?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok || !data?.ok) throw new Error("delete failed");
      await refreshAdminSlots();
      // Keep booking dropdown current
      await loadAvailableSlots();
    } catch {
      // ignore
    }
  });

  tryAdminAutoLogin();

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
          body: JSON.stringify({ email, phone, message, company }),
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

