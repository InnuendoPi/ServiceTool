// Navigation and saved connections. Existing device/Telegraf handlers remain in app.js.
let workspaceView = "connection";
let workspaceReady = false;
let profileEditorMode = "update";
let profileEditorId = "";
let profileChangePending = false;
const workspaceGroups = {
  device: [["connection", "Gerät", "Device", "firmware"]],
  firmware: [["install", "Firmware", "Firmware", "firmware"]],
  data: [["designer", "Rezept Planer", "Recipe Planner", "designer"], ["management", "Explorer", "Explorer", "management"], ["backup", "Sichern & Wiederherstellen", "Backup & restore", "backup"]],
  service: [["logging", "Serial Monitor", "Serial monitor", "logging"], ["telegraf", "Telegraf", "Telegraf", "telegraf"], ["maintenance", "Wartung", "Maintenance", "firmware"], ["migration", "Migration", "Migration", "migration"], ["testrunner", "Test Runner", "Test runner", "testrunner"]]
};
function workspaceText(de, en) { return currentLang === "de" ? de : en; }
function workspaceProfiles() {
  return appConfig.device_profiles?.length ? appConfig.device_profiles : [{id:"primary", url:appConfig.device_url, port:appConfig.serial_port}];
}
function deviceProfileName(index, count, profile = {}) { return profile.name?.trim() || (count === 1 ? "Brautomat" : index === 0 ? "Master" : `worker${index}`); }
function refreshWorkspaceProfiles() {
  if (typeof syncExplorerContext === "function") syncExplorerContext();
  if (!workspaceReady) return;
  document.getElementById("settingsInventoryPath").value = appConfig.inventory_root || "";
  const profiles = workspaceProfiles();
  const active = appConfig.active_device_id || profiles[0].id;
  const select = document.getElementById("activeDeviceSelect");
  const temporary = typeof temporarySerialConnection !== "undefined" && temporarySerialConnection;
  select.replaceChildren();
  if (temporary) {
    const unknown = new Option("-", "");
    unknown.disabled = true;
    select.add(unknown);
  }
  profiles.forEach((p, index) => select.add(new Option(deviceProfileName(index, profiles.length, p), p.id)));
  select.value = temporary ? "" : active;
  const chosen = profiles.find(p => p.id === active) || profiles[0];
  const actualPort = document.getElementById("portSelect").value;
  document.getElementById("activeDeviceAddress").textContent = [actualPort,
    document.getElementById("deviceUrl").value
  ].filter(Boolean).join(" · ");
  document.getElementById("settingsActiveDevice").textContent = [temporary ? "-" : deviceProfileName(profiles.indexOf(chosen), profiles.length, chosen), document.getElementById("activeDeviceAddress").textContent].filter(Boolean).join(" · ");
  document.getElementById("addDeviceProfile").disabled = profiles.length >= 20;
  const editorSelect=document.getElementById("settingsProfileSelect");
  const editing=editorSelect.value;
  editorSelect.replaceChildren();
  profiles.forEach((p,index)=>editorSelect.add(new Option(deviceProfileName(index,profiles.length,p)+" · "+p.port+" · "+p.url,p.id)));
  editorSelect.value=profiles.some(p=>p.id===editing)?editing:active;
  document.getElementById("editDeviceProfile").disabled = !editorSelect.value;
  // Saved profiles are optional; USB selection remains available for test devices.
  for (const id of ["portSelect", "serialPortSelect"]) document.getElementById(id).disabled = false;
  document.getElementById("deviceUrl").readOnly = profiles.length > 1 && !temporary;
}
function translateWorkspace() {
  if (typeof translateDesigner === "function") translateDesigner();
  if (!workspaceReady) return;
  const labels = {
    activeDeviceLabel:["Aktives Gerät", "Active device"], editDeviceProfile:["Profil bearbeiten", "Edit profile"],
    addDeviceProfile:["Gerät hinzufügen", "Add device"], workspaceConnectionTitle:["Gerät & Verbindung", "Device & connection"],
    workspaceSettingsTitle:["Einstellungen", "Settings"], workspaceMaintenanceTitle:["Wartung", "Maintenance"],
    workspaceDevicesTitle:["Geräte", "Devices"],
    settingsInventoryLabel:["Lokales Inventar", "Local inventory"],
    workspaceSettingsButton:["Einstellungen", "Settings"], profilePortLabel:["COM-Port", "Serial port"],
    profileNameLabel:["Profilname (optional)", "Profile name (optional)"],
    profileUrlLabel:["Geräte-URL", "Device URL"], profileSave:["Speichern", "Save"], profileCancel:["Abbrechen", "Cancel"],
    profileRemove:["Gerät entfernen", "Remove device"], profileHelp:["COM-Port und URL sind Pflicht. Die URL muss noch nicht erreichbar sein.", "Serial port and URL are required. The URL does not have to be reachable yet."]
  };
  for (const [id, pair] of Object.entries(labels)) document.getElementById(id).textContent = workspaceText(...pair);
  const inventoryPick = document.getElementById("settingsInventoryPick");
  inventoryPick.title = workspaceText("Inventarverzeichnis auswählen", "Choose inventory directory");
  inventoryPick.setAttribute("aria-label", inventoryPick.title);
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
  if (view !== "management" && typeof explorerCanLeave === "function" && !explorerCanLeave()) return;
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
  const inactiveEdit=["update","remove"].includes(payload.action)&&payload.id!==(appConfig.active_device_id||"primary");
  if(inactiveEdit){
    if(profileChangePending)return;
    profileChangePending=true;
    try{appConfig=await api("/api/device-profiles",{method:"POST",body:payload});refreshWorkspaceProfiles();document.getElementById("deviceProfileDialog").close();}
    finally{profileChangePending=false;}
    return;
  }
  if (typeof pd !== "undefined" && !designerCanLeave()) throw new Error(workspaceText("Gerätewechsel abgebrochen.", "Device change cancelled."));
  if (profileChangePending) return;
  if (typeof explorerCanLeave === "function" && !explorerCanLeave()) throw new Error(workspaceText("Gerätewechsel abgebrochen.", "Device change cancelled."));
  // Wait for current startup detection instead of changing connection fields mid-request.
  if (checkDeviceInFlight || appStartupPendingTasks > 0 || maintenanceBusy || maintenanceStatusPending || !document.getElementById("wifiSpinner").classList.contains("hidden-spinner")) throw new Error(workspaceText("Bitte die laufende Geräteprüfung abwarten.", "Please wait for the current device check."));
  profileChangePending = true;
  try {
    await api("/api/device-profiles", {method:"POST", body:payload});
    // Old requests remain tied to old DOM values until this document is discarded.
    if (typeof pd !== "undefined") pd.allowUnload = true;
    window.location.reload();
  } catch (error) { profileChangePending = false; throw error; }
}
async function openDeviceProfile(mode) {
  profileEditorMode = mode;
  document.getElementById("profileError").textContent = "";
  const profiles = workspaceProfiles();
  const current = profiles.find(p => p.id === document.getElementById("settingsProfileSelect").value) || profiles[0];
  profileEditorId=current.id;
  const dialog = document.getElementById("deviceProfileDialog");
  const portSelect = document.getElementById("profilePort"); portSelect.replaceChildren();
  portSelect.add(new Option(workspaceText("Port auswählen", "Select port"), ""));
  document.getElementById("profileName").value = mode === "add" ? "" : (current.name || "");
  document.getElementById("profileName").placeholder = mode === "add" ? workspaceText("z. B. Singledevice", "e.g. Single device") : deviceProfileName(profiles.indexOf(current), profiles.length);
  document.getElementById("profileUrl").value = mode === "add" ? "" : current.url;
  document.getElementById("deviceProfileTitle").textContent = mode === "add" ? workspaceText("Gerät hinzufügen", "Add device") : workspaceText("Geräteprofil bearbeiten", "Edit device profile");
  document.getElementById("profileRemove").hidden = mode === "add" || current.id === profiles[0].id;
  dialog.showModal();
  try {
    const data = await api("/api/ports");
    if (!dialog.open) return;
    const ports = new Set((data.ports || []).map(p => p.port));
    profiles.forEach(profile => { if (profile.port) ports.add(profile.port); });
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
  const profileSelect=document.createElement("select");profileSelect.id="settingsProfileSelect";profileSelect.setAttribute("aria-label",workspaceText("Profil zum Bearbeiten","Profile to edit"));
  devices.append(devicesHeading, selectedDevice, profileSelect, deviceActions); settingsCard.appendChild(devices);
  const inventory = document.createElement("section"); inventory.className="workspace-settings-devices";
  const inventoryLabel=document.createElement("label");inventoryLabel.id="settingsInventoryLabel";inventoryLabel.htmlFor="settingsInventoryPath";
  const inventoryActions=document.createElement("div");inventoryActions.className="input-action settings-inventory-row";
  const inventoryPath=document.createElement("input");inventoryPath.id="settingsInventoryPath";inventoryPath.readOnly=true;
  const inventoryPick=document.createElement("button");inventoryPick.id="settingsInventoryPick";inventoryPick.type="button";inventoryPick.className="ghost";
  const inventoryIcon=document.createElement("i");inventoryIcon.className="icon-folder-open button-icon";inventoryIcon.setAttribute("aria-hidden","true");inventoryPick.appendChild(inventoryIcon);
  const inventoryStatus=document.createElement("p");inventoryStatus.id="settingsInventoryStatus";inventoryStatus.setAttribute("role","status");
  inventoryPick.addEventListener("click",async()=>{
    if(typeof explorerCanLeave === "function" && !explorerCanLeave())return;
    inventoryPick.disabled=true;inventoryStatus.textContent="";
    try {
      const result=await api("/api/inventory/root/pick",{method:"POST",body:{}});
      if(result.selected)await saveConfig({inventory_root:result.selected});
    } catch(error){inventoryStatus.textContent=String(error);}
    finally{inventoryPick.disabled=false;}
  });
  inventoryActions.append(inventoryPath,inventoryPick);inventory.append(inventoryLabel,inventoryActions,inventoryStatus);settingsCard.appendChild(inventory);
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
  document.getElementById("closeDeviceProfile").addEventListener("click", () => document.getElementById("deviceProfileDialog").close());
  document.getElementById("profileCancel").addEventListener("click", () => document.getElementById("deviceProfileDialog").close());
  document.getElementById("deviceProfileForm").addEventListener("submit", async event => {
    event.preventDefault();
    try { await submitDeviceProfile({action:profileEditorMode, id:profileEditorId, name:document.getElementById("profileName").value, port:document.getElementById("profilePort").value, url:document.getElementById("profileUrl").value}); }
    catch (error) { document.getElementById("profileError").textContent = error.message; }
  });
  document.getElementById("profileRemove").addEventListener("click", async () => {
    if (!window.confirm(workspaceText("Dieses Geräteprofil entfernen? Gerätedaten bleiben unverändert.", "Remove this profile? Device data remains unchanged."))) return;
    try { await submitDeviceProfile({action:"remove", id:profileEditorId}); }
    catch (error) { document.getElementById("profileError").textContent = error.message; }
  });
  workspaceReady = true; refreshWorkspaceProfiles(); translateWorkspace();
  new MutationObserver(renderWorkspaceNavigation).observe(document.getElementById("tabTestRunner"), {attributes:true, attributeFilter:["class"]});
}
