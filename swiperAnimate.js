const swiperEl = document.querySelector(".featured_deals_swiper");

let revealed = false;
let revealInitialized = false;

const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

/* -----------------------------
   SWIPER INIT
----------------------------- */

const swiper = new Swiper(swiperEl, {
  slidesPerView: 5,
  spaceBetween: 24,
  centeredSlides: true,
  speed: 700,
  // height: 438,
  mousewheel: {
    enabled: false,
    forceToAxis: true,
    sensitivity: 0.8,
  },

  a11y: {
    enabled: true,
    slideRole: "listitem",
  },
  breakpoints: {
    1920: {
      centeredSlides: true,
      initialSlide: 2,
      // slidesPerView: 4.2,
      slidesPerView: 4.5,
    },
    1440: {
      centeredSlides: true,
      initialSlide: 2,
      // slidesPerView: 4.2,
      slidesPerView: 3.7,
    },
    1240: {
      centeredSlides: true,
      initialSlide: 2,
      slidesPerView: 3.7,
    },

    992: {
      centeredSlides: true,
      initialSlide: 2,
      slidesPerView: 2.8,
    },

    768: {
      spaceBetween: 16,
      initialSlide: 0,
      centeredSlides: false,
      slidesPerView: 1.4,
    },

    320: {
      spaceBetween: 16,
      initialSlide: 0,
      centeredSlides: false,
      slidesPerView: 1.1,
    },
  },

  on: {
    init() {
      const mm = gsap.matchMedia();

      mm.add("(min-width: 992px)", () => {
        const bp = this.currentBreakpoint;
        const initialSlide =
          (bp && this.params.breakpoints?.[bp]?.initialSlide) ??
          this.originalParams.initialSlide ??
          0;

        this.slideTo(initialSlide, 0, false);

        // Initial stacked state
        setStackState(this);

        // Force ScrollTrigger to recalc after Swiper layout
        ScrollTrigger.refresh();

        createRevealTrigger(this);
      });
    },
  },
});

/* -----------------------------
   STACK STATE
----------------------------- */

function setStackState(sw) {
  const slides = Array.from(sw.slides);
  const activeIndex = sw.activeIndex;
  const activeSlide = slides[activeIndex];
  if (!activeSlide) return;

  // ── ALL READS FIRST ──────────────────────────────
  sw.el.getBoundingClientRect(); // Safari flush
  const activeRect = activeSlide.getBoundingClientRect();
  const activeCenter = activeRect.left + activeRect.width / 2;
  const headingLeft = document.querySelector("[deal-heading-left]");
  const headingRight = document.querySelector("[deal-heading-right]");

  const slideData = slides.map((slide, i) => ({
    slide,
    rect: slide.getBoundingClientRect(),
    depth: Math.abs(i - activeIndex),
  }));

  // Reset headings to x:0 and re-read (need a flush here)
  gsap.set([headingLeft, headingRight], { x: 0 });
  // Force a synchronous layout flush after reset
  headingLeft?.getBoundingClientRect();

  const leftRect = headingLeft?.getBoundingClientRect();
  const rightRect = headingRight?.getBoundingClientRect();

  // ── ALL WRITES AFTER ─────────────────────────────
  sw.allowTouchMove = false;
  gsap.set("[deals-cards-text]", { opacity: 0 });

  slideData.forEach(({ slide, rect, depth }) => {
    const slideCenter = rect.left + rect.width / 2;
    const dx = activeCenter - slideCenter;
    gsap.set(slide, {
      x: dx,
      y: isSafari ? depth * 6 : 0,
      scale: 1,
      zIndex: 100 - depth,
      willChange: "transform",
      pointerEvents: "none",
      force3D: true,
    });
  });

  if (!headingLeft || !headingRight || !leftRect || !rightRect) return;

  const dxLeft = activeRect.left - (leftRect.right + 64);
  const dxRight = activeRect.right - (rightRect.left - 64);

  gsap.set(headingLeft, { x: dxLeft });
  gsap.set(headingRight, { x: dxRight });
  console.log("Stack state set with dxLeft:", dxLeft, "dxRight:", dxRight);
}
// function setStackState(sw) {
//   const slides = Array.from(sw.slides);
//   const activeIndex = sw.activeIndex;
//   const activeSlide = slides[activeIndex];
//   if (!activeSlide) return;

//   // ── ALL READS FIRST ──────────────────────────────
//   sw.el.getBoundingClientRect(); // Safari flush
//   const activeRect = activeSlide.getBoundingClientRect();
//   const activeCenter = activeRect.left + activeRect.width / 2;
//   const headingLeft = document.querySelector("[deal-heading-left]");
//   const headingRight = document.querySelector("[deal-heading-right]");

//   const slideData = slides.map((slide, i) => ({
//     slide,
//     rect: slide.getBoundingClientRect(),
//     depth: Math.abs(i - activeIndex),
//   }));

//   // Reset headings to x:0 and re-read (need a flush here)
//   gsap.set([headingLeft, headingRight], { x: 0 });
//   // Force a synchronous layout flush after reset
//   headingLeft?.getBoundingClientRect();

//   const leftRect = headingLeft?.getBoundingClientRect();
//   const rightRect = headingRight?.getBoundingClientRect();

//   // ── ALL WRITES AFTER ─────────────────────────────
//   sw.allowTouchMove = false;
//   gsap.set("[deals-cards-text]", { opacity: 0 });

//   slideData.forEach(({ slide, rect, depth }) => {
//     const slideCenter = rect.left + rect.width / 2;
//     const dx = activeCenter - slideCenter;
//     gsap.set(slide, {
//       x: dx,
//       y: isSafari ? depth * 6 : 0,
//       scale: 1,
//       zIndex: 100 - depth,
//       willChange: "transform",
//       pointerEvents: "none",
//       force3D: true,
//     });
//   });

//   if (!headingLeft || !headingRight || !leftRect || !rightRect) return;

//   const dxLeft = activeRect.left - (leftRect.right + 64);
//   const dxRight = activeRect.right - (rightRect.left - 64);

//   gsap.set(headingLeft, { x: dxLeft });
//   gsap.set(headingRight, { x: dxRight });
//   console.log("Stack state set with dxLeft:", dxLeft, "dxRight:", dxRight);
// }

/* -----------------------------
   ANIMATE TO STACK (smooth — for scroll-back)
   Uses CURRENT activeIndex so it stacks
   to whichever card the user swiped to.
----------------------------- */

function animateToStack(sw, duration) {
  const slides = Array.from(sw.slides);
  const activeIndex = sw.activeIndex;
  const activeSlide = slides[activeIndex];
  if (!activeSlide) return;

  disableInteraction(sw, slides);

  sw.el.getBoundingClientRect(); // Safari flush
  const activeRect = activeSlide.getBoundingClientRect();
  const activeCenter = activeRect.left + activeRect.width / 2;

  const headingLeft = document.querySelector("[deal-heading-left]");
  const headingRight = document.querySelector("[deal-heading-right]");

  slides.forEach((slide, i) => {
    const rect = slide.getBoundingClientRect();
    const slideCenter = rect.left + rect.width / 2;
    const dx = activeCenter - slideCenter;
    const depth = Math.abs(i - activeIndex);

    gsap.to(slide, {
      x: dx,
      y: isSafari ? depth * 6 : 0,
      scale: 1,
      zIndex: 100 - depth,
      duration: duration,
      ease: "power3.inOut",
      overwrite: true,
    });
  });

  gsap.to("[deals-cards-text]", {
    opacity: 0,
    duration: duration * 0.6,
    overwrite: true,
  });

  if (!headingLeft || !headingRight) return;

  // Reset to measure natural positions
  gsap.set([headingLeft, headingRight], { x: 0 });
  headingLeft.getBoundingClientRect();

  const leftRect = headingLeft.getBoundingClientRect();
  const rightRect = headingRight.getBoundingClientRect();

  const dxLeft = activeRect.left - (leftRect.right + 64);
  const dxRight = activeRect.right - (rightRect.left - 64);

  gsap.to(headingLeft, {
    x: dxLeft,
    duration: duration,
    ease: "power3.inOut",
    overwrite: true,
  });
  gsap.to(headingRight, {
    x: dxRight,
    duration: duration,
    ease: "power3.inOut",
    overwrite: true,
  });
}

/* -----------------------------
   REVEAL / STACK TRIGGER
----------------------------- */

function createRevealTrigger(sw) {
  const triggerEl =
    sw.el.closest("section") || sw.el.closest(".section") || sw.el;
  const slides = Array.from(sw.slides);
  const headings = document.querySelectorAll("[deals-heading]");

  gsap.set(headings, { willChange: "transform", force3D: true });

  let isRevealed = false;

  ScrollTrigger.create({
    trigger: triggerEl,
    start: "top top",
    once: true,
    // markers: true,

    onEnter: () => {
      if (isRevealed) return;
      isRevealed = true;
      revealCards(sw, slides, headings);
    },

    onRefresh(self) {
      if (!isRevealed && (self.isActive || self.progress > 0)) {
        isRevealed = true;
        revealCards(sw, slides, headings);
      }
    },
  });
}

/* -----------------------------
   REVEAL ANIMATION
----------------------------- */

function revealCards(sw, slides, headings) {
  // Kill any in-flight stack tweens
  slides.forEach((s) => gsap.killTweensOf(s));
  gsap.killTweensOf("[deals-cards-text]");
  headings.forEach((h) => gsap.killTweensOf(h));

  gsap.to(slides, {
    x: 0,
    y: 0,
    scale: 1,
    duration: 0.9,
    ease: "power3.out",
    stagger: { each: 0.06, from: sw.activeIndex },

    onComplete: () => {
      sw.allowTouchMove = true;
      sw.mousewheel.enable();

      slides.forEach((s) => {
        s.style.pointerEvents = "";
        s.style.zIndex = "2";
      });

      sw.update();
      ScrollTrigger.refresh();
    },
  });

  gsap.to(headings, {
    x: 0,
    duration: 0.9,
    ease: "power3.out",
    overwrite: true,
    force3D: true,
  });

  gsap.to("[deals-cards-text]", {
    opacity: 1,
    duration: 0.9,
    ease: "power3.out",
    delay: 0.3,
  });
}

/* -----------------------------
   INTERACTION LOCK
----------------------------- */

function disableInteraction(sw, slides) {
  sw.allowTouchMove = false;
  sw.mousewheel.disable();

  slides.forEach((slide) => {
    slide.style.pointerEvents = "none";
  });
}

/* -----------------------------
   FINAL SAFETY REFRESH
----------------------------- */

// Handles images / fonts loading after JS
window.addEventListener("load", () => {
  ScrollTrigger.refresh();
});
