/* -----------------------------
   DOM STABILITY GATE
------------------------------ */
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

/* -----------------------------
     CARD DATA PROCESSING
  ------------------------------ */
function processCards() {
  const cards = document.querySelectorAll(".deals_lists_item");
  if (!cards.length) return;

  cards.forEach((card) => {
    if (card.dataset.processed === "true") return;

    const map = [
      ["investors-source", "investors-target"],
      ["sectors-source", "sectors-target"],
      ["type-source", "type-target"],
      ["deal-size-source", "deal-size-target"],
    ];

    map.forEach(([sourceAttr, targetAttr]) => {
      const source = card.querySelector(`[${sourceAttr}]`);
      if (!source) return;

      card.querySelectorAll(`[${targetAttr}]`).forEach((target) => {
        if (!target.querySelector(`[${sourceAttr}]`)) {
          target.appendChild(source.cloneNode(true));
        }
      });
    });

    card.dataset.processed = "true";
  });
}

/* -----------------------------
     MULTI-DEAL LOGIC
  ------------------------------ */
function multiDealOp() {
  document.querySelectorAll(".deals_lists_item").forEach((card) => {
    const list = card.querySelector(".deals_card_list");
    const childrenLength = list.children.length;
    if (!list || childrenLength <= 1) return;

    const baseOption = document.querySelector(".dd_option.is-other");
    if (!baseOption) return;

    const totalDeals = list.children.length;

    card
      .querySelectorAll(".deals_card.no-img, .deals_card._w-img")
      .forEach((el) => el.remove());

    card.querySelectorAll(".deals_card.multi-deal").forEach((cardEl, index) => {
      const currentLabel = `Deal ${index + 1}`;
      const currentText = cardEl.querySelector(
        ".dd_option.current .text-size-tiny"
      );
      if (currentText) currentText.textContent = currentLabel;

      const optionWrap = cardEl.querySelector(".dd_other_content");
      if (!optionWrap) return;
      optionWrap.innerHTML = "";

      for (let i = 0; i < totalDeals; i++) {
        if (i === index) continue;

        const option = baseOption.cloneNode(true);
        option.dataset.deal = i + 1;
        option.querySelector(".text-size-tiny").textContent = `Deal ${
          i + 1
        }/ ${childrenLength}`;

        option.addEventListener("click", (e) => {
          e.stopPropagation();
          switchDeal(card, i);
        });

        optionWrap.appendChild(option);
      }
    });
  });
}

function switchDeal(card, index) {
  card.querySelectorAll(".deals_card_item").forEach((el, i) => {
    el.style.opacity = i === index ? "1" : "0";
    el.style.pointerEvents = i === index ? "auto" : "none";
    el.style.position = i === index ? "relative" : "absolute";
    el.style.zIndex = i === index ? "5" : "1";
  });
}

/* -----------------------------
     MOBILE DEFAULT STATE
  ------------------------------ */
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

/* -----------------------------
     HOVER + PIN (DESKTOP)
  ------------------------------ */
let pinTriggers = [];
let mmDesktop;

function runHoverAndPin() {
  destroyPins();

  if (mmDesktop) mmDesktop.revert();
  mmDesktop = gsap.matchMedia();

  mmDesktop.add("(min-width: 992px)", () => {
    listHover();
    pinCards();
    return destroyPins;
  });
}

function listHover() {
  const items = document.querySelectorAll(
    ".deals_lists.is-list .deals_lists_item"
  );
  if (!items.length) return;

  items[0].classList.add("item-active");

  items.forEach((item) => {
    item
      .querySelector(".brand-name-wrap")
      ?.addEventListener("mouseenter", () => {
        items.forEach((el) => el.classList.remove("item-active"));
        item.classList.add("item-active");
      });
  });
}

function pinCards() {
  const wrap = document.querySelector(".deals_wrap_contain");
  const cards = document.querySelectorAll(
    ".deals_lists.is-list .block_deal_card"
  );
  if (!wrap || !cards.length) return;

  cards.forEach((card) => {
    pinTriggers.push(
      ScrollTrigger.create({
        trigger: wrap,
        start: "top top",
        end: "bottom bottom",
        pin: card,
        pinSpacing: false,
        invalidateOnRefresh: true,
      })
    );
  });

  ScrollTrigger.refresh();
}

function destroyPins() {
  pinTriggers.forEach((st) => st.kill(true));
  pinTriggers = [];
}

/* -----------------------------
     INITIALIZATION
  ------------------------------ */
function initializeDeals() {
  processCards();
  multiDealOp();
  firstItemChecked();

  requestAnimationFrame(() => ScrollTrigger.refresh());

  if (document.querySelector(".deals_lists.is-list .deals_lists_item")) {
    setTimeout(runHoverAndPin, 300);
  }
}

function runAfterNestReady() {
  waitForNestToSettle({
    onReady: initializeDeals,
  });
}

/* -----------------------------
     FINSWEET HOOKS (ONLY ONCE)
  ------------------------------ */
window.fsAttributes = window.fsAttributes || [];
window.fsAttributes.push([
  "cmsnest",
  () => {
    runAfterNestReady();
  },
]);

document.addEventListener("fslist-render", runAfterNestReady);

/* -----------------------------
     SAFETY FALLBACK
  ------------------------------ */
setTimeout(runAfterNestReady, 800);
