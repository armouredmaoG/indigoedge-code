let max767 = gsap.matchMedia();

max767.add("(max-width: 767px)", () => {
  const searchWrap = document.querySelector(".search-input_wrap");
  const searchInput = searchWrap?.querySelector(".text-input");
  const searchIcon = searchWrap?.querySelector(".search-svg-wrap");

  if (searchWrap && searchInput && searchIcon) {
    // Open on icon click
    searchIcon.addEventListener("click", (e) => {
      e.stopPropagation();
      searchWrap.classList.add("is-open");
      searchInput.focus();
    });

    // Prevent inside clicks from closing
    searchWrap.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    // Close on outside click
    document.addEventListener("click", () => {
      searchWrap.classList.remove("is-open");
      searchInput.blur();
    });
  }
});
