try {
  if (localStorage.getItem("voxnote-theme") === "dark") {
    document.documentElement.classList.add("dark-theme");
  }
} catch (e) {}
