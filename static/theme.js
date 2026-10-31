/* The central config is the only persisted source of the appearance choice. */
const ServiceToolTheme = (() => {
  const media = typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  let preference = "light";
  let bound = false;
  const normalize = value => ["light", "dark", "system"].includes(value) ? value : "light";

  function apply(value) {
    preference = normalize(value);
    document.documentElement.dataset.bsTheme = preference === "system"
      ? (media?.matches ? "dark" : "light") : preference;
    const select = document.getElementById("appearance");
    if (select) select.value = preference;
  }

  function translate(language) {
    const labels = language === "de"
      ? { appearanceLabel: "Darstellung", appearanceSystem: "System", appearanceLight: "Hell", appearanceDark: "Dunkel" }
      : { appearanceLabel: "Appearance", appearanceSystem: "System", appearanceLight: "Light", appearanceDark: "Dark" };
    for (const [id, label] of Object.entries(labels)) {
      const node = document.getElementById(id);
      if (node) node.textContent = label;
    }
  }

  function bind(save) {
    const select = document.getElementById("appearance");
    if (!select || bound) return;
    bound = true;
    select.addEventListener("change", async () => {
      const previous = preference;
      apply(select.value);
      select.disabled = true;
      try {
        const config = await save(preference);
        apply(config.appearance);
      } catch (error) {
        apply(previous);
        window.alert(String(error));
      } finally {
        select.disabled = false;
      }
    });
  }

  const systemChanged = () => { if (preference === "system") apply(preference); };
  if (media?.addEventListener) media.addEventListener("change", systemChanged);
  else if (media?.addListener) media.addListener(systemChanged);
  return { apply, translate, bind };
})();
