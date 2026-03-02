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
function setStackState(sw) {
  const slides = Array.from(sw.slides);
  const activeIndex = sw.activeIndex;
  const activeSlide = slides[activeIndex];
  if (!activeSlide) return;

  // Safari layout flush
  void sw.el.offsetHeight;

  // ── SLIDE READS (offset-based — all slides share the same wrapper,
  //    so relative offsetLeft values are correct regardless of transforms) ──
  const activeOL = activeSlide.offsetLeft;
  const activeOW = activeSlide.offsetWidth;
  const activeOCenter = activeOL + activeOW / 2;

  const slideData = slides.map((slide, i) => ({
    slide,
    ol: slide.offsetLeft,
    ow: slide.offsetWidth,
    depth: Math.abs(i - activeIndex),
  }));

  // ── HEADING READS (getBoundingClientRect — headings & active slide are
  //    in the same Lenis container, so Lenis shift cancels out in the
  //    relative calculation; only their visual distance matters) ──
  const headingLeft = document.querySelector("[deal-heading-left]");
  const headingRight = document.querySelector("[deal-heading-right]");

  if (headingLeft && headingRight) {
    gsap.set([headingLeft, headingRight], { x: 0 });
    headingLeft.getBoundingClientRect(); // flush after reset
  }

  const activeRect = activeSlide.getBoundingClientRect();
  const leftRect = headingLeft?.getBoundingClientRect();
  const rightRect = headingRight?.getBoundingClientRect();

  // ── ALL WRITES ──
  sw.allowTouchMove = false;
  gsap.set("[deals-cards-text]", { opacity: 0 });

  slideData.forEach(({ slide, ol, ow, depth }) => {
    const slideCenter = ol + ow / 2;
    const dx = activeOCenter - slideCenter;
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
}

/* -----------------------------
   SAFE REVEAL TRIGGER
----------------------------- */

function createRevealTrigger(sw) {
  const swiperTrigger = document.querySelector("[swiper-trigger]") || sw.el;

  function safeReveal() {
    if (revealInitialized) return;
    revealInitialized = true;
    setupReveal(sw);
  }

  ScrollTrigger.create({
    trigger: swiperTrigger,
    start: "top 90%",
    end: "top 20%",
    once: true,
    //markers: true,

    onEnter: safeReveal,
    onEnterBack: safeReveal,

    onRefresh(self) {
      // Handles page refresh below the section
      if (self.isActive || self.progress > 0) {
        safeReveal();
      }
    },
  });
}

/* -----------------------------
   REVEAL ANIMATION
----------------------------- */

function setupReveal(sw) {
  if (revealed) return;
  revealed = true;

  const slides = Array.from(sw.slides);
  const triggerEl =
    sw.el.closest("section") || sw.el.closest(".section") || sw.el;

  const headings = document.querySelectorAll("[deals-heading]");
  gsap.set(headings, { willChange: "transform", force3D: true });

  disableInteraction(sw, slides);

  const tl = gsap.timeline({
    defaults: { duration: 0.9, ease: "power3.out" },

    scrollTrigger: {
      trigger: triggerEl,
      start: "top 10%",
      // markers: true,
      fastScrollEnd: true,
      preventOverlaps: true,
      invalidateOnRefresh: true,
    },
  });

  tl.to(slides, {
    x: 0,
    y: 0,
    scale: 1,
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
  })
    .to(
      headings,
      {
        x: 0,
        overwrite: "auto",
        force3D: true,
      },
      "<"
    )
    .to("[deals-cards-text]", { opacity: 1 });
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
