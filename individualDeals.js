/* ======================================================
   DEALS PAGE — OPTIMIZED CODEBASE
   Finsweet Nest v2 + GSAP + Views
   Performance-focused rewrite
====================================================== */

/* ------------------------------------------------------
   DEBOUNCE UTILITY — prevents rapid-fire re-runs
------------------------------------------------------ */
let _nestTimer = null;
function debouncedNestReady(delay = 200) {
  clearTimeout(_nestTimer);
  _nestTimer = setTimeout(runAfterNestReady, delay);
}

/* ------------------------------------------------------
   SCROLLTRIGGER REFRESH — batched, max once per 200ms
------------------------------------------------------ */
let _refreshTimer = null;
function batchedRefresh() {
  clearTimeout(_refreshTimer);
  _refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 200);
}

/* ------------------------------------------------------
   SEARCH
------------------------------------------------------ */
const dummySearchField = document.querySelector("[dummy-search]");
const hiddenSearchField = document.querySelector("[hidden-search]");
let typingTimeout;

if (dummySearchField && hiddenSearchField) {
  dummySearchField.addEventListener("input", (e) => {
    hiddenSearchField.value = e.target.value;
    hiddenSearchField.dispatchEvent(new Event("input", { bubbles: true }));

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      debouncedNestReady(300);
    }, 700);
  });
}

/* ------------------------------------------------------
   LOAD MORE — bind once, use event delegation
------------------------------------------------------ */
let _loadMoreBound = false;
function loadMoreFunction() {
  if (_loadMoreBound) return;
  _loadMoreBound = true;

  // Use event delegation on a stable parent
  document.addEventListener("click", (e) => {
    if (e.target.closest("[load-more]")) {
      debouncedNestReady(300);
    }
  });
}

/* ------------------------------------------------------
   CHECKBOXES — event delegation (bind once)
------------------------------------------------------ */
let _checkboxBound = false;
function bindCheckboxes() {
  if (_checkboxBound) return;
  _checkboxBound = true;

  document.addEventListener("click", (e) => {
    if (e.target.closest(".checkbox-wrap")) {
      setTimeout(() => {
        debouncedNestReady(300);
        setTimeout(() => {
          batchedRefresh();
          enableListView();
        }, 300);
      }, 400);
    }
  });
}
bindCheckboxes();

/* ------------------------------------------------------
   DOM STABILITY GATE (wait until Nest is DONE)
------------------------------------------------------ */
function waitForNestToSettle({
  container = ".deals_lists",
  item = ".deals_lists_item",
  required = "[investors-source], .deals_card_list",
  stableFrames = 3,
  maxFrames = 60,
  onReady,
}) {
  const root = document.querySelector(container) || document.body;
  let lastCount = 0;
  let stableCount = 0;
  let frames = 0;

  function check() {
    frames++;
    const items = root.querySelectorAll(item);
    const count = items.length;

    const hasContent =
      count > 0 && Array.from(items).every((el) => el.querySelector(required));

    if (count === lastCount && hasContent) {
      stableCount++;
    } else {
      stableCount = 0;
      lastCount = count;
    }

    if (stableCount >= stableFrames || frames >= maxFrames) {
      onReady();
      return;
    }
    requestAnimationFrame(check);
  }
  requestAnimationFrame(check);
}

/* ------------------------------------------------------
   CONTENT PROCESSING — only process NEW cards
------------------------------------------------------ */
function processCards() {
  const map = [
    ["investors-source", "investors-target"],
    ["sectors-source", "sectors-target"],
    ["type-source", "type-target"],
    ["deal-size-source", "deal-size-target"],
  ];

  // 1. Card items — skip already processed
  const unprocessedCards = document.querySelectorAll(
    '.deals_card_item:not([data-processed="true"])'
  );
  if (!unprocessedCards.length) return; // PERF: early exit

  // Batch reads first, then writes — avoids layout thrashing
  const cardOps = [];
  unprocessedCards.forEach((card) => {
    map.forEach(([src, tgt]) => {
      const source = card.querySelector(`[${src}]`);
      if (!source) return;
      card.querySelectorAll(`[${tgt}]`).forEach((target) => {
        if (!target.querySelector(`[${src}]`)) {
          cardOps.push({ target, clone: source.cloneNode(true) });
        }
      });
    });
    card.dataset.processed = "true";
  });
  // Batch DOM writes
  cardOps.forEach(({ target, clone }) => target.appendChild(clone));

  // 2. Front wraps — skip already processed
  const unprocessedFronts = document.querySelectorAll(
    '.deals_lists_item:has(.deals_front_wrap:not([data-processed="true"]))'
  );

  const frontOps = [];
  unprocessedFronts.forEach((listItem) => {
    const frontWrap = listItem.querySelector(".deals_front_wrap");
    const firstCard = listItem.querySelector(".deals_card_item");
    if (!frontWrap || !firstCard) return;

    map.forEach(([src, tgt]) => {
      const source = firstCard.querySelector(`[${src}]`);
      if (!source) return;
      frontWrap.querySelectorAll(`[${tgt}]`).forEach((target) => {
        if (!target.querySelector(`[${src}]`)) {
          frontOps.push({ target, clone: source.cloneNode(true) });
        }
      });
    });
    frontWrap.dataset.processed = "true";
  });
  // Batch DOM writes
  frontOps.forEach(({ target, clone }) => target.appendChild(clone));
}

/* ------------------------------------------------------
   MULTI-DEAL LOGIC — only process new items
------------------------------------------------------ */
function multiDealOp() {
  document
    .querySelectorAll('.deals_lists_item:not([data-multi-processed="true"])')
    .forEach((card) => {
      const list = card.querySelector(".deals_card_list");
      if (!list || list.children.length <= 1) return;

      const baseOption = document.querySelector(".dd_option.is-other");
      if (!baseOption) return;

      const total = list.children.length;

      card
        .querySelectorAll(".deals_card.no-img, .deals_card._w-img")
        .forEach((el) => el.remove());

      card.querySelectorAll(".deals_card.multi-deal").forEach((el, index) => {
        el.querySelector(
          ".dd_option.current .text-size-tiny"
        ).textContent = `Deal ${index + 1}/${total}`;

        const wrap = el.querySelector(".dd_other_content");
        wrap.innerHTML = "";

        for (let i = 0; i < total; i++) {
          if (i === index) continue;

          const opt = baseOption.cloneNode(true);
          opt.dataset.deal = i;
          opt.querySelector(".text-size-tiny").textContent = `Deal ${
            i + 1
          }/${total}`;

          opt.addEventListener("click", (e) => {
            e.stopPropagation();
            switchDeal(card, i);
          });

          wrap.appendChild(opt);
        }
      });

      card.dataset.multiProcessed = "true";
    });
}

function switchDeal(card, index) {
  card.querySelectorAll(".deals_card_item").forEach((el, i) => {
    const isActive = i === index;
    el.style.opacity = isActive ? "1" : "0";
    el.style.pointerEvents = isActive ? "auto" : "none";
    el.style.position = isActive ? "relative" : "absolute";
    el.style.zIndex = isActive ? "5" : "1";
  });
}

/* ------------------------------------------------------
   MOBILE DEFAULT (FIRST ITEM)
------------------------------------------------------ */
let mmMobile;
function firstItemChecked() {
  if (mmMobile) mmMobile.revert();
  mmMobile = gsap.matchMedia();

  mmMobile.add("(max-width: 991px)", () => {
    const first = document.querySelector(
      ".deals_lists.is-list .deals_lists_item .dd_input"
    );
    if (first) first.checked = true;
  });
}

/* ------------------------------------------------------
   HOVER + PINNED CARDS (DESKTOP)
   PERF: 1 ScrollTrigger instead of N
   → position:absolute + transform:translateY via CSS variable
   → Only 1 CSS variable update per scroll frame (GPU composited)
   → No pin-spacer wrappers, no per-element ScrollTriggers
   → CSS selector auto-applies to new cards from load-more
------------------------------------------------------ */
let mmDesktop;
let _hoverBound = false;
let _currentActive = null;
let _singlePinST = null;
let _pinStyleInjected = false;

// Inject static CSS once — cards use absolute + transform driven by CSS vars
function injectPinStyle() {
  if (_pinStyleInjected) return;
  _pinStyleInjected = true;

  const style = document.createElement("style");
  style.id = "deal-card-pin";
  style.textContent = `
        .deals_wrap_contain.cards-pinned {
            position: relative;
        }
        .deals_wrap_contain.cards-pinned .block_deal_card {
            position: absolute !important;
            top: var(--card-top, 0px);
            transform: translateY(var(--pin-y, 0px));
            will-change: transform;
        }
    `;
  document.head.appendChild(style);
}

function pinCards() {
  const wrap = document.querySelector(".deals_wrap_contain");
  if (!wrap) return;

  injectPinStyle();

  // Only ONE ScrollTrigger — reuse if already exists
  if (_singlePinST) {
    _singlePinST.refresh();
    return;
  }

  // Cache card position relative to wrap (prevents jump)
  const firstCard = wrap.querySelector(".block_deal_card");
  if (!firstCard) return;

  const wrapRect = wrap.getBoundingClientRect();
  const cardRect = firstCard.getBoundingClientRect();
  const cardTopInWrap = cardRect.top - wrapRect.top;
  let wrapOffsetTop = wrapRect.top + (window.scrollY || window.pageYOffset);

  // Set the card's natural offset
  wrap.style.setProperty("--card-top", cardTopInWrap + "px");

  // Activate absolute positioning NOW — no toggling on scroll
  wrap.classList.add("cards-pinned");

  // Set initial offset immediately so there's no flash
  const initScrollY = window.scrollY || window.pageYOffset;
  const initOffset = Math.max(0, initScrollY - wrapOffsetTop);
  wrap.style.setProperty("--pin-y", initOffset + "px");

  _singlePinST = ScrollTrigger.create({
    trigger: wrap,
    start: "top top",
    end: () => "bottom " + window.innerHeight * 0.9 + "px",
    // markers: true,
    onUpdate: (self) => {
      // Clamp: 0 when above section, max when below
      const scrollY = self.scroll();
      // const scrollY = window.scrollY || window.pageYOffset;
      const offset = scrollY - wrapOffsetTop;
      const maxOffset = wrap.scrollHeight - window.innerHeight;
      const clamped = Math.max(0, Math.min(offset, maxOffset));
      wrap.style.setProperty("--pin-y", clamped + "px");
    },
    onRefresh: () => {
      // Recalculate cached values on resize / load-more
      const r = wrap.getBoundingClientRect();
      wrapOffsetTop = r.top + (window.scrollY || window.pageYOffset);
      const fc = wrap.querySelector(".block_deal_card");
      if (fc) {
        const cr = fc.getBoundingClientRect();
        wrap.style.setProperty("--card-top", cr.top - r.top + "px");
      }
    },
    invalidateOnRefresh: true,
  });
}

function destroyPins() {
  if (_singlePinST) {
    _singlePinST.kill();
    _singlePinST = null;
  }
  const wrap = document.querySelector(".deals_wrap_contain");
  if (wrap) {
    wrap.classList.remove("cards-pinned");
    wrap.style.removeProperty("--pin-y");
    wrap.style.removeProperty("--card-top");
  }
}

function enableListView() {
  if (mmDesktop) mmDesktop.revert();

  mmDesktop = gsap.matchMedia();
  mmDesktop.add("(min-width: 992px)", () => {
    listHover();
    pinCards();
    return destroyPins;
  });
}

function listHover() {
  const listContainer = document.querySelector(".deals_lists.is-list");
  if (!listContainer) return;

  if (!_currentActive || !_currentActive.isConnected) {
    _currentActive = listContainer.querySelector(".deals_lists_item");
    if (_currentActive) _currentActive.classList.add("item-active");
  }

  if (_hoverBound) return;
  _hoverBound = true;

  document.addEventListener(
    "mouseenter",
    (e) => {
      const listEl = document.querySelector(".deals_lists.is-list");
      if (!listEl) return;

      const brandWrap = e.target.closest(".brand-name-wrap");
      if (!brandWrap) return;

      const listItem = brandWrap.closest(".deals_lists_item");
      if (!listItem || !listEl.contains(listItem)) return;

      if (_currentActive && _currentActive !== listItem) {
        _currentActive.classList.remove("item-active");
      }
      listItem.classList.add("item-active");
      _currentActive = listItem;
    },
    true
  );
}

/* ------------------------------------------------------
   VIEW CONTROLLERS
------------------------------------------------------ */
const dealViews = document.querySelectorAll("[view]");
const listViewBtn = document.querySelector('[view="list-view"]');
const gridViewBtn = document.querySelector('[view="grid-view"]');
const multiDealViewBtn = document.querySelector('[view="multi-deal"]');
const switchMultiDeal = document.querySelector("[switch-multi-deal]");
const dealLists = document.querySelector(".deals_lists");

gridViewBtn?.addEventListener("click", () => {
  dealViews.forEach((v) => v.classList.remove("w-active"));
  gridViewBtn.classList.add("w-active");
  document.querySelector("[deal-desc]")?.click();
  dealLists?.classList.remove("is-list");

  if (switchMultiDeal?.classList.contains("active")) {
    switchMultiDeal.click();
    switchMultiDeal.classList.remove("active");
  }

  document
    .querySelectorAll(".deals_front_wrap")
    .forEach((d) => (d.style.display = ""));

  destroyPins();
  debouncedNestReady(200);
});

listViewBtn?.addEventListener("click", () => {
  dealViews.forEach((v) => v.classList.remove("w-active"));
  listViewBtn.classList.add("w-active");
  document.querySelector("[name-asc]")?.click();
  dealLists?.classList.add("is-list");

  document
    .querySelectorAll(".deals_front_wrap")
    .forEach((d) => (d.style.display = "flex"));

  if (switchMultiDeal?.classList.contains("active")) {
    switchMultiDeal.click();
    switchMultiDeal.classList.remove("active");
  }

  setTimeout(() => {
    enableListView();
    debouncedNestReady(100);
  }, 300);
});

multiDealViewBtn?.addEventListener("click", () => {
  dealViews.forEach((v) => v.classList.remove("w-active"));
  multiDealViewBtn.classList.add("w-active");
  dealLists?.classList.remove("is-list");

  if (switchMultiDeal && !switchMultiDeal.classList.contains("active")) {
    switchMultiDeal.click();
    switchMultiDeal.classList.add("active");
  }

  destroyPins();
  debouncedNestReady(300);
});

/* ------------------------------------------------------
   CLICK OUTSIDE TO CLOSE DROPDOWNS
------------------------------------------------------ */
document.addEventListener("click", (e) => {
  const wraps = document.querySelectorAll(
    ".filter-trigger_wrap, .filter-dd_group"
  );
  wraps.forEach((wrap) => {
    const cb = wrap.querySelector('.dd_input[type="checkbox"]');
    if (cb && cb.checked && !wrap.contains(e.target)) {
      cb.checked = false;
      cb.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
});

/* ------------------------------------------------------
   INITIALIZATION PIPELINE
------------------------------------------------------ */
function initializeDeals() {
  loadMoreFunction();
  processCards();
  multiDealOp();
  firstItemChecked();

  if (document.querySelector(".deals_lists.is-list .deals_lists_item")) {
    enableListView();
  }

  batchedRefresh();
}

function runAfterNestReady() {
  waitForNestToSettle({ onReady: initializeDeals });
}

/* ------------------------------------------------------
   FINSWEET HOOKS
------------------------------------------------------ */
window.fsAttributes = window.fsAttributes || [];
window.fsAttributes.push(["cmsnest", debouncedNestReady]);
document.addEventListener("fslist-render", () => debouncedNestReady(300));

/* ------------------------------------------------------
   SAFETY FALLBACK
------------------------------------------------------ */
setTimeout(() => {
  debouncedNestReady(100);
}, 800);

function setDefaultViewOnce() {
  if (document.body.dataset.defaultViewSet) return;
  document.body.dataset.defaultViewSet = "true";
}

// Observe when deals section comes into view
const dealsSection = document.querySelector(".deals_wrap_contain");

if (dealsSection) {
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          debouncedNestReady(100);
          obs.disconnect();
        }
      });
    },
    { root: null, threshold: 0.01 }
  );
  observer.observe(dealsSection);
}
