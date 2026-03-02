// -----------------------------
// GSAP HERO ANIMATION - ACTUALLY FIXED
// Based on your working old code
// -----------------------------

gsap.registerPlugin(Flip, ScrollTrigger, ScrollToPlugin);

// -----------------------------
// DOM ELEMENTS
// -----------------------------
const flipCtntWrap = document.querySelector("[hero-ctnt-wrap]");
const flipCtnt = document.querySelector("[hero-ctnt]");
const flipSrc = document.querySelector("[hero-ctnt-src]");
const flipDst = document.querySelector("[hero-ctnt-dst]");
const flipTrigger = document.querySelector("[hero-trigger]");
const scrollDst = document.querySelector("[scroll-dest]");

// -----------------------------
// FLIP STATE
// -----------------------------
const state = Flip.getState(flipCtntWrap);
flipDst.appendChild(flipCtntWrap);

// -----------------------------
// MATCH MEDIA (RESPONSIVE SCALE)
// -----------------------------
const mm = gsap.matchMedia();

mm.add(
  {
    desktop: "(min-width: 992px)",
    tablet: "(min-width: 768px) and (max-width: 991px)",
    mobile: "(max-width: 767px)",
  },
  (context) => {
    const { desktop, tablet, mobile } = context.conditions;

    // Scale values
    let scaleValue = 0.6; // desktop default
    if (tablet) scaleValue = 0.8;
    if (mobile) scaleValue = 1;

    // -----------------------------
    // CENTER Y CALCULATION
    // -----------------------------
    const wrapRect = flipCtntWrap.getBoundingClientRect();
    const ctntRect = flipCtnt.getBoundingClientRect();

    const centerY =
      wrapRect.height / 2 - (ctntRect.top - wrapRect.top) - ctntRect.height / 2;

    // -----------------------------
    // HERO TIMELINE (SCRUBBED)
    // -----------------------------
    const heroTl = gsap.timeline({
      scrollTrigger: {
        trigger: flipTrigger,
        start: "top bottom",
        end: "bottom bottom",
        scrub: true,
      },
    });

    heroTl.add(
      Flip.from(state, {
        duration: 0.5,
        ease: "none",
        absolute: true,
      }),
      "<"
    );

    // COMMENTED OUT - Conflicting with new opacity control
    heroTl.to(
      flipCtnt,
      {
        y: centerY,
        scale: scaleValue,
        ease: "none",
      },
      "<"
    );

    // Cleanup
    return () => heroTl.kill();
  }
);

// -----------------------------
// SCROLL TRANSITION STATE
// -----------------------------
let isScrolling = false;

function killInFlight() {
  gsap.killTweensOf(window);
  gsap.killTweensOf(".deals_swiper_section");
}

function runTransition(tl) {
  isScrolling = true;
  tl.eventCallback("onComplete", () => (isScrolling = false));
  tl.eventCallback("onInterrupt", () => (isScrolling = false));
  return tl;
}

// -----------------------------
// 3) FADE OUT HERO CONTENT WHEN SCROLL-DEST ENTERS VIEW
// -----------------------------
gsap.to(flipCtnt, {
  opacity: 0,
  scrollTrigger: {
    trigger: scrollDst,
    start: "top 80%",
    end: "top 40%",
    scrub: true,
    //markers: true,
  },
});

// -----------------------------
// 4) INSTANTLY CHANGE SCROLL-DEST BACKGROUND TO WHITE AT END
// -----------------------------
ScrollTrigger.create({
  trigger: scrollDst,
  start: "top 40%",
  onEnter: () => {
    gsap.set(scrollDst, { backgroundColor: "#ffffff" });
  },
  onLeaveBack: () => {
    gsap.set(scrollDst, { backgroundColor: "transparent" });
  },
});
