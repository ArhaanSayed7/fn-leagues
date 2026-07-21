document.addEventListener("DOMContentLoaded", () => {
  initializePageTransition();
  initializeCursorGlow();
  initializeMagneticButtons();
  initializeInteractiveCards();
  initializeLazyImages();
  initializeSectionDepth();
});

function initializePageTransition() {
  const transition = document.getElementById("pageTransition");

  requestAnimationFrame(() => {
    document.body.classList.add("page-ready");

    setTimeout(() => {
      transition?.classList.add("transition-complete");
    }, 320);
  });

  document.querySelectorAll("a[href]").forEach((link) => {
    const href = link.getAttribute("href");

    if (
      !href ||
      href.startsWith("#") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      link.target === "_blank" ||
      link.hasAttribute("download")
    ) {
      return;
    }

    link.addEventListener("click", (event) => {
      let url;

      try {
        url = new URL(link.href, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;

      event.preventDefault();
      transition?.classList.remove("transition-complete");
      document.body.classList.add("page-leaving");

      setTimeout(() => {
        window.location.href = link.href;
      }, 360);
    });
  });
}

function initializeCursorGlow() {
  const glow = document.getElementById("cursorGlow");

  if (!glow || window.matchMedia("(pointer: coarse)").matches) {
    glow?.remove();
    return;
  }

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let currentX = targetX;
  let currentY = targetY;

  window.addEventListener("pointermove", (event) => {
    targetX = event.clientX;
    targetY = event.clientY;
    glow.classList.add("cursor-visible");
  }, { passive: true });

  document.addEventListener("mouseleave", () => {
    glow.classList.remove("cursor-visible");
  });

  function animate() {
    currentX += (targetX - currentX) * 0.14;
    currentY += (targetY - currentY) * 0.14;

    glow.style.transform =
      `translate3d(${currentX - 180}px, ${currentY - 180}px, 0)`;

    requestAnimationFrame(animate);
  }

  animate();
}

function initializeMagneticButtons() {
  if (window.matchMedia("(pointer: coarse)").matches) return;

  document
    .querySelectorAll(".button, .nav-admin, .carousel-controls button")
    .forEach((button) => {
      button.addEventListener("pointermove", (event) => {
        const rect = button.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;

        button.style.setProperty("--magnetic-x", `${x * 0.12}px`);
        button.style.setProperty("--magnetic-y", `${y * 0.12}px`);
      });

      button.addEventListener("pointerleave", () => {
        button.style.setProperty("--magnetic-x", "0px");
        button.style.setProperty("--magnetic-y", "0px");
      });
    });
}

function initializeInteractiveCards() {
  if (window.matchMedia("(pointer: coarse)").matches) return;

  const selector = [
    ".featured-slide",
    ".league-card",
    ".content-card",
    ".community-feature-card",
    ".homepage-live-card",
    ".community-mini-card",
    ".fdh-next-race-card",
    ".league-gallery-item"
  ].join(",");

  document.querySelectorAll(selector).forEach((card) => {
    card.classList.add("motion-card");

    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;

      const rotateY = (x - 0.5) * 7;
      const rotateX = (0.5 - y) * 6;

      card.style.setProperty("--card-rotate-x", `${rotateX}deg`);
      card.style.setProperty("--card-rotate-y", `${rotateY}deg`);
      card.style.setProperty("--card-light-x", `${x * 100}%`);
      card.style.setProperty("--card-light-y", `${y * 100}%`);
    });

    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--card-rotate-x", "0deg");
      card.style.setProperty("--card-rotate-y", "0deg");
      card.style.setProperty("--card-light-x", "50%");
      card.style.setProperty("--card-light-y", "50%");
    });
  });
}

function initializeLazyImages() {
  document.querySelectorAll("img:not([loading])").forEach((image) => {
    if (
      image.closest(".site-header") ||
      image.closest(".page-transition-logo") ||
      image.classList.contains("priority-image")
    ) {
      image.loading = "eager";
      image.fetchPriority = "high";
      return;
    }

    image.loading = "lazy";
    image.decoding = "async";
  });
}

function initializeSectionDepth() {
  const sections = [
    ...document.querySelectorAll(".scroll-scene")
  ];

  if (!sections.length) return;

  let ticking = false;

  function update() {
    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const center =
        rect.top +
        rect.height / 2 -
        window.innerHeight / 2;

      const normalized = Math.max(
        -1,
        Math.min(1, center / window.innerHeight)
      );

      section.style.setProperty(
        "--section-shift",
        `${normalized * -10}px`
      );
    });

    ticking = false;
  }

  window.addEventListener("scroll", () => {
    if (ticking) return;

    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });

  update();
}
