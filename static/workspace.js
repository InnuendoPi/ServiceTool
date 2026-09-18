// Navigation and saved connections. Existing device/Telegraf handlers remain in app.js.
let workspaceView = "connection";
let workspaceReady = false;
let profileEditorMode = "update";
let profileChangePending = false;
const workspaceGroups = {
  device: [["connection", "Gerät", "Device", "firmware"]],
  firmware: [["install", "Firmware", "Firmware", "firmware"]],
  data: [["management", "Dateien", "Files", "management"], ["backup", "Sichern & Wiederherstellen", "Backup & restore", "backup"]],
  service: [["logging", "Serial Monitor", "Serial monitor", "logging"], ["telegraf", "Telegraf", "Telegraf", "telegraf"], ["maintenance", "Wartung", "Maintenance", "firmware"], ["migration", "Migration", "Migration", "migration"], ["testrunner", "Test Runner", "Test runner", "testrunner"]]
};
function workspaceText(de, en) { return currentLang === "de" ? de : en; }
function workspaceProfiles() {
  return appConfig.device_profiles?.length ? appConfig.device_profiles : [{id:"primary", url:appConfig.device_url, port:appConfig.serial_port}];
}
function deviceProfileName(index, count) { return count === 1 ? "Brautomat" : index === 0 ? "Master" : `worker${index}`; }
function refreshWorkspaceProfiles() {
  if (!workspaceReady) return;
  const profiles = workspaceProfiles();
  const active = appConfig.active_device_id || profiles[0].id;
  const select = document.getElementById("activeDeviceSelect");
  select.replaceChildren();
  profiles.forEach((p, index) => select.add(new Option(deviceProfileName(index, profiles.length), p.id)));
  select.value = active;
  const chosen = profiles.find(p => p.id === active) || profiles[0];
  document.getElementById("activeDeviceAddress").textContent = [profiles.length === 1 ? appConfig.serial_port : chosen.port, chosen.url].filter(Boolean).join(" · ");
  document.getElementById("settingsActiveDevice").textContent = [deviceProfileName(profiles.indexOf(chosen), profiles.length), document.getElementById("activeDeviceAddress").textContent].filter(Boolean).join(" · ");
  document.getElementById("addDeviceProfile").disabled = profiles.length >= 4;
  // A stored multi-device mapping is edited together, never replaced by an auto-picked port.
  for (const id of ["portSelect", "serialPortSelect"]) document.getElementById(id).disabled = profiles.length > 1;
  document.getElementById("deviceUrl").readOnly = profiles.length > 1;
}
function translateWorkspace() {
  if (!workspaceReady) return;
  const labels = {
    activeDeviceLabel:["Aktives Gerät", "Active device"], editDeviceProfile:["Profil bearbeiten", "Edit profile"],
    addDeviceProfile:["Gerät hinzufügen", "Add device"], workspaceConnectionTitle:["Gerät & Verbindung", "Device & connection"],
    workspaceSettingsTitle:["Einstellungen", "Settings"], workspaceMaintenanceTitle:["Wartung", "Maintenance"],
    workspaceDevicesTitle:["Geräte", "Devices"],
    workspaceSettingsButton:["Einstellungen", "Settings"], profilePortLabel:["COM-Port", "Serial port"],
    profileUrlLabel:["Geräte-URL", "Device URL"], profileSave:["Speichern", "Save"], profileCancel:["Abbrechen", "Cancel"],
    profileRemove:["Gerät entfernen", "Remove device"], profileHelp:["COM-Port und URL sind Pflicht. Die URL muss noch nicht erreichbar sein.", "Serial port and URL are required. The URL does not have to be reachable yet."]
  };
  for (const [id, pair] of Object.entries(labels)) document.getElementById(id).textContent = workspaceText(...pair);
  const menuToggle = document.getElementById("workspaceMenuToggle");
  menuToggle.setAttribute("aria-label", workspaceText("Menü", "Menu"));
  menuToggle.title = workspaceText("Menü", "Menu");
  renderWorkspaceNavigation();
}
function initializeWorkspaceMenu(headerActions, settingsButton) {
  const menu = document.createElement("div"); menu.className = "workspace-menu";
  const toggle = document.createElement("button"); toggle.type = "button"; toggle.id = "workspaceMenuToggle";
  toggle.className = "ghost"; toggle.textContent = "⋯";
  toggle.setAttribute("aria-expanded", "false"); toggle.setAttribute("aria-controls", "workspaceMenuPanel");
  const panel = document.createElement("div"); panel.id = "workspaceMenuPanel"; panel.className = "workspace-menu-panel"; panel.hidden = true;
  const items = [settingsButton, document.getElementById("checkServiceToolUpdate"), document.getElementById("openGuide")];
  for (const item of items) { item.classList.remove("icon-button"); panel.appendChild(item); }
  const close = (restoreFocus = false) => {
    panel.hidden = true; toggle.setAttribute("aria-expanded", "false");
    if (restoreFocus) toggle.focus();
  };
  const open = () => { panel.hidden = false; toggle.setAttribute("aria-expanded", "true"); };
  toggle.addEventListener("click", () => { if (panel.hidden) open(); else close(); });
  toggle.addEventListener("keydown", event => {
    if (event.key === "ArrowDown") { event.preventDefault(); open(); items[0].focus(); }
  });
  panel.addEventListener("click", event => { if (event.target.closest("button")) close(); });
  menu.addEventListener("keydown", event => {
    if (event.key === "Escape" && !panel.hidden) { event.preventDefault(); close(true); }
    if (!panel.hidden && ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) && items.includes(document.activeElement)) {
      event.preventDefault();
      const index = items.indexOf(document.activeElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items[next].focus();
    }
  });
  document.addEventListener("click", event => { if (!menu.contains(event.target)) close(); });
  menu.addEventListener("focusout", event => { if (!menu.contains(event.relatedTarget)) close(); });
  menu.append(toggle, panel); headerActions.appendChild(menu);
}
function renderWorkspaceNavigation() {
  const root = document.getElementById("mainNavigation"), sub = document.getElementById("sectionNavigation");
  root.replaceChildren(); sub.replaceChildren();
  const selected = Object.keys(workspaceGroups).find(key => workspaceGroups[key].some(row => row[0] === workspaceView));
  const labels = {device:["Gerät","Device"],firmware:["Firmware","Firmware"],data:["Daten","Data"],service:["Service","Service"]};
  for (const key of Object.keys(workspaceGroups)) {
    const button = document.createElement("button"); button.type = "button";
    button.textContent = workspaceText(...labels[key]);
    if (selected === key) button.setAttribute("aria-current", "page");
    button.addEventListener("click", () => selectWorkspaceView(workspaceGroups[key][0][0])); root.appendChild(button);
  }
  const sections = workspaceGroups[selected] || [];
  for (const row of sections.length > 1 ? sections : []) {
    if (row[0] === "testrunner" && document.getElementById("tabTestRunner").classList.contains("hidden-panel")) continue;
    const button = document.createElement("button"); button.type = "button"; button.textContent = workspaceText(row[1], row[2]);
    if (row[0] === workspaceView) button.setAttribute("aria-current", "page");
    button.addEventListener("click", () => selectWorkspaceView(row[0])); sub.appendChild(button);
  }
  document.body.dataset.workspaceView = workspaceView;
}
function selectWorkspaceView(view) {
  workspaceView = view;
  const row = Object.values(workspaceGroups).flat().find(item => item[0] === view);
  activateTab(row ? row[3] : "settings");
}
function workspaceTabActivated(tab) {
  if (!workspaceReady) return;
  const current = Object.values(workspaceGroups).flat().find(item => item[0] === workspaceView);
  if (!current || current[3] !== tab) workspaceView = tab === "firmware" ? "connection" : tab;
  renderWorkspaceNavigation();
}
async function submitDeviceProfile(payload) {
  if (profileChangePending) return;
  // Wait for current startup detection instead of changing connection fields mid-request.
  if (checkDeviceInFlight || appStartupPendingTasks > 0 || maintenanceBusy || maintenanceStatusPending || !document.getElementById("wifiSpinner").classList.contains("hidden-spinner")) throw new Error(workspaceText("Bitte die laufende Geräteprüfung abwarten.", "Please wait for the current device check."));
  profileChangePending = true;
  try {
    await api("/api/device-profiles", {method:"POST", body:payload});
    // Old requests remain tied to old DOM values until this document is discarded.
    window.location.reload();
  } catch (error) { profileChangePending = false; throw error; }
}
async function openDeviceProfile(mode) {
  profileEditorMode = mode;
  document.getElementById("profileError").textContent = "";
  const profiles = workspaceProfiles();
  const current = profiles.find(p => p.id === appConfig.active_device_id) || profiles[0];
  const dialog = document.getElementById("deviceProfileDialog");
  const portSelect = document.getElementById("profilePort"); portSelect.replaceChildren();
  portSelect.add(new Option(workspaceText("Port auswählen", "Select port"), ""));
  document.getElementById("profileUrl").value = mode === "add" ? "" : current.url;
  document.getElementById("deviceProfileTitle").textContent = mode === "add" ? workspaceText("Gerät hinzufügen", "Add device") : workspaceText("Geräteprofil bearbeiten", "Edit device profile");
  document.getElementById("profileRemove").hidden = mode === "add" || current.id === profiles[0].id;
  dialog.showModal();
  try {
    const data = await api("/api/ports");
    if (!dialog.open) return;
    const ports = new Set((data.ports || []).map(p => p.port));
    if (mode !== "add" && current.port) ports.add(current.port);
    ports.forEach(port => portSelect.add(new Option(port, port)));
    portSelect.value = mode === "add" ? "" : current.port;
  } catch (error) { document.getElementById("profileError").textContent = error.message; }
}
function initializeWorkspace() {
  if (workspaceReady) return;
  const firmware = document.querySelector('[data-panel="firmware"]');
  const cards = [...firmware.children];
  cards[0].classList.add("workspace-install"); cards[1].classList.add("workspace-webfiles"); cards[2].classList.add("workspace-wifi");
  const connection = document.createElement("section"); connection.className = "card workspace-connection";
  const heading = document.createElement("h2"); heading.id = "workspaceConnectionTitle"; connection.appendChild(heading);
  const headerDevice = document.querySelector(".header-device");
  const deviceDetails = document.createElement("span"); deviceDetails.className = "workspace-device-details";
  const deviceAddress = document.getElementById("activeDeviceAddress");
  deviceAddress.before(deviceDetails);
  deviceDetails.append(deviceAddress, document.getElementById("activeFirmware"));
  document.querySelector(".workspace-device").appendChild(document.getElementById("deviceConnectionState"));
  const headerActions = document.querySelector(".hero-actions");
  for (const id of ["checkServiceToolUpdate", "openGuide"]) headerActions.appendChild(document.getElementById(id));
  connection.appendChild(headerDevice);
  const portSelect = document.getElementById("portSelect");
  const portLabel = portSelect.closest("label");
  const portActions = document.createElement("div"); portActions.className = "input-action";
  portActions.appendChild(portSelect);
  portActions.appendChild(document.getElementById("refreshPorts"));
  portLabel.appendChild(portActions);
  connection.appendChild(portLabel);
  firmware.prepend(connection);
  const maintenance = document.createElement("section"); maintenance.className = "card workspace-maintenance";
  const mh = document.createElement("h2"); mh.id = "workspaceMaintenanceTitle"; maintenance.appendChild(mh);
  maintenance.appendChild(document.querySelector(".maintenance-actions")); firmware.appendChild(maintenance);
  const settings = document.createElement("section"); settings.className = "tab-panel span-2"; settings.dataset.panel = "settings";
  const settingsCard = document.createElement("section"); settingsCard.className = "card span-2";
  const sh = document.createElement("h2"); sh.id = "workspaceSettingsTitle"; settingsCard.appendChild(sh);
  settingsCard.appendChild(document.querySelector(".header-side"));
  const devices = document.createElement("section"); devices.className = "workspace-settings-devices";
  const devicesHeading = document.createElement("h3"); devicesHeading.id = "workspaceDevicesTitle";
  const selectedDevice = document.createElement("p"); selectedDevice.id = "settingsActiveDevice"; selectedDevice.className = "muted";
  const deviceActions = document.createElement("div"); deviceActions.className = "actions";
  for (const id of ["editDeviceProfile", "addDeviceProfile"]) deviceActions.appendChild(document.getElementById(id));
  devices.append(devicesHeading, selectedDevice, deviceActions); settingsCard.appendChild(devices);
  settings.appendChild(settingsCard); document.querySelector("main.layout").appendChild(settings);
  const settingsButton = document.createElement("button"); settingsButton.type = "button"; settingsButton.id = "workspaceSettingsButton"; settingsButton.className = "ghost";
  settingsButton.addEventListener("click", () => selectWorkspaceView("settings"));
  initializeWorkspaceMenu(headerActions, settingsButton);
  const feedback = document.getElementById("profileFeedback");
  document.getElementById("activeDeviceSelect").addEventListener("change", async event => {
    try { await submitDeviceProfile({action:"select", id:event.target.value}); }
    catch (error) { feedback.textContent = error.message; refreshWorkspaceProfiles(); }
  });
  document.getElementById("addDeviceProfile").addEventListener("click", () => openDeviceProfile("add"));
  document.getElementById("editDeviceProfile").addEventListener("click", () => openDeviceProfile("update"));
  document.getElementById("profileCancel").addEventListener("click", () => document.getElementById("deviceProfileDialog").close());
  document.getElementById("deviceProfileForm").addEventListener("submit", async event => {
    event.preventDefault();
    try { await submitDeviceProfile({action:profileEditorMode, id:appConfig.active_device_id || "primary", port:document.getElementById("profilePort").value, url:document.getElementById("profileUrl").value}); }
    catch (error) { document.getElementById("profileError").textContent = error.message; }
  });
  document.getElementById("profileRemove").addEventListener("click", async () => {
    if (!window.confirm(workspaceText("Dieses Geräteprofil entfernen? Gerätedaten bleiben unverändert.", "Remove this profile? Device data remains unchanged."))) return;
    try { await submitDeviceProfile({action:"remove", id:appConfig.active_device_id}); }
    catch (error) { document.getElementById("profileError").textContent = error.message; }
  });
  workspaceReady = true; refreshWorkspaceProfiles(); translateWorkspace();
  new MutationObserver(renderWorkspaceNavigation).observe(document.getElementById("tabTestRunner"), {attributes:true, attributeFilter:["class"]});
}
