
const startActions = {
  setup: ["Brautomat einrichten", "Set up Brautomat"],
  update: ["Firmware aktualisieren", "Update firmware"],
  migration: ["Firmware migrieren", "Migrate firmware"],
  backup: ["Backup erstellen", "Create backup"]
};

const startErrors = {
  guided_multiple: ["Zwei oder mehr Brautomaten erkannt. Vorgang abgebrochen. Lass nur den gewünschten Brautomat angeschlossen und starte den Assistenten erneut.", "Two or more Brautomats detected. Setup stopped. Leave only the intended Brautomat connected and restart the assistant."],
  guided_usb_ambiguous: ["Kein Brautomat am USB-Anschluss eindeutig erkannt. Lass nur den gewünschten Brautomat per USB verbunden und prüfe erneut.", "No Brautomat could be identified over USB. Leave only the intended Brautomat connected and try again."],
  guided_usb_required: ["Schließe einen Brautomat per USB an und prüfe erneut.", "Connect one Brautomat via USB and try again."],
  guided_not_found: ["Kein Brautomat erreichbar. Schließe ihn per USB an oder stelle die WLAN-Verbindung her.", "No Brautomat found. Connect it via USB or make it reachable over Wi-Fi."],
  guided_device_changed: ["Der ursprüngliche Brautomat ist nicht eindeutig erkennbar. Prüfe die Verbindung.", "The original Brautomat cannot be identified. Check the connection."],
  guided_unknown_firmware: ["Der Firmwarestand konnte nicht sicher erkannt werden. Prüfe den Brautomat und seine USB-Verbindung.", "The firmware could not be identified safely. Check the Brautomat and its USB connection."],
  guided_network_required: ["Der Brautomat ist im Netzwerk noch nicht erreichbar.", "The Brautomat is not reachable over the network yet."],
  guided_migration_unsupported: ["Für den erkannten Stand ist kein unterstützter Layoutwechsel vorgesehen.", "There is no supported layout migration for the detected firmware."],
  guided_package_changed: ["Das Firmwarepaket hat sich geändert. Prüfe die verfügbare Version erneut.", "The firmware package has changed. Check the available version again."],
  guided_serial_monitor: ["Beende den Serial Monitor und prüfe erneut.", "Stop the serial monitor and try again."],
  guided_development_unavailable: ["Für aktivierte Testversionen ist kein passendes Development-Paket veröffentlicht.", "No matching Development package has been published for the enabled test versions."],
  guided_no_package: ["Für diesen Vorgang ist kein passendes Firmwarepaket veröffentlicht.", "No matching firmware package has been published for this operation."],
  guided_erase_confirmation: ["Bestätige das Löschen des Flash-Speichers.", "Confirm that you want to erase flash."],
  guided_job_lost: ["Der Auftrag ist nicht mehr verfügbar. Prüfe das Gerät oder schließe den Assistenten.", "The job is no longer available. Check the device or close the assistant."],
  guided_busy: ["Eine Geräteaktion läuft. Warte, bis sie abgeschlossen ist.", "A device operation is running. Wait for it to finish."]
};

let startState = null;
const startLabel = pair => workspaceText(...pair);
const startJobPhases = {
  package: ["Firmwarepaket wird vorbereitet und geprüft …", "Preparing and checking the firmware package …"],
  device: ["USB-Gerät und Partitionen werden geprüft …", "Checking the USB device and partition table …"],
  erase: ["Flash-Speicher wird gelöscht …", "Erasing flash …"],
  write: ["Firmware wird geschrieben …", "Writing firmware …"]
};

function translateStart() {
  for (const [key, label] of Object.entries(startActions)) {
    $(key + "StartLabel").textContent = startLabel(label);
  }
  $("startSetupHelp").textContent = workspaceText("Per USB verbinden und die vorhandene Einrichtung nutzen oder von vorne beginnen.",
    "Connect via USB to keep the existing setup or start from scratch.");
  $("startUpdateHelp").textContent = workspaceText("Ein passendes Update per USB oder WLAN installieren.",
    "Install a matching update over USB or Wi-Fi.");
  $("startMigrationHelp").textContent = workspaceText("Auf eine Firmware mit neuem Speicherlayout wechseln. USB und WLAN werden benötigt.",
    "Switch to firmware with a new storage layout. USB and Wi-Fi are required.");
  $("startBackupHelp").textContent = workspaceText("Die Gerätekonfiguration über WLAN sichern.", "Back up device settings over Wi-Fi.");
  $("startLinksTitle").textContent = workspaceText("Anleitungen und Firmware", "Guides and firmware");
  $("startServiceToolGuide").textContent = workspaceText("ServiceTool-Anleitung", "ServiceTool guide");
  const brautomatGuide = $("startBrautomatGuide");
  brautomatGuide.textContent = workspaceText("Brautomat32-Anleitung", "Brautomat32 guide");
  brautomatGuide.href = workspaceText("https://innuendopi.gitbook.io/brautomat32/brautomat32",
    "https://innuendopi.gitbook.io/brautomat32");
  $("startFirmwarePackages").textContent = workspaceText("Firmwarepakete", "Firmware packages");
  $("startOpenPreferenceLabel").textContent = workspaceText("Beim Öffnen Assistenten anzeigen", "Show assistants on launch");
  if (startState) renderStart();
}

function renderStart() {
  const s = startState;
  $("startLayout").classList.toggle("is-active", Boolean(s));
  $("startLinks").hidden = Boolean(s);
  $("startAssistant").hidden = !s;
  for (const button of $("startChoices").querySelectorAll("[data-assistant]")) {
    button.disabled = Boolean(s?.busy || s?.jobId);
    if (button.dataset.assistant === s?.kind) button.setAttribute("aria-current", "true");
    else button.removeAttribute("aria-current");
  }
  if (typeof renderWorkspaceConnections === "function") renderWorkspaceConnections();
  if (!s) return;
  $("startAssistantTitle").textContent = startLabel(startActions[s.kind]);
  $("startDevice").textContent = [s.device?.port, s.device?.base_url, s.device?.firmware].filter(Boolean).join(" · ");
  const confirmingReset = s.step === "reset-confirm";
  const status = $("startStatus");
  status.textContent = s.message ? startLabel(s.message) : "";
  status.classList.toggle("start-warning", confirmingReset);
  $("startError").textContent = s.error ? (startErrors[s.error] ? startLabel(startErrors[s.error]) : s.error) : "";
  $("startWifi").hidden = s.step !== "wifi";
  $("startSsidLabel").textContent = workspaceText("WLAN-Netzwerk", "Wi-Fi network");
  $("startManualOption").textContent = workspaceText("Netzwerknamen eingeben", "Enter network name");
  $("startManualLabel").textContent = workspaceText("Netzwerkname (SSID)", "Network name (SSID)");
  $("startManualNetwork").hidden = !!$("startNetworks").value;
  $("startPasswordLabel").textContent = workspaceText("WLAN-Passwort", "Wi-Fi password");
  $("startScan").textContent = workspaceText("Netzwerke suchen", "Find networks");
  $("startScan").disabled = s.busy;
  $("startNetworks").disabled = s.busy;
  $("startSsid").disabled = s.busy;
  $("startPassword").disabled = s.busy;
  $("startPasswordReveal").disabled = s.busy;
  updateWifiPasswordVisibility("startPassword", "startPasswordReveal");
  $("startBack").textContent = workspaceText("Assistent schließen", "Close assistant");
  $("startBack").disabled = s.busy || !!s.jobId;
  const next = $("startNext");
  next.hidden = !s.next;
  next.disabled = s.busy;
  next.classList.toggle("danger", confirmingReset);
  next.classList.toggle("primary", !confirmingReset);
  if (s.next) next.textContent = startLabel(s.next.label);
  const resetBackup = $("startResetBackup");
  resetBackup.hidden = !confirmingReset;
  resetBackup.disabled = s.busy || Boolean(s.backupFile);
  resetBackup.textContent = s.device?.base_url ? text("flashBackupBtn") : workspaceText("WLAN für Sicherung einrichten", "Set up Wi-Fi for backup");
  const backupStatus = $("startResetBackupStatus");
  backupStatus.hidden = resetBackup.hidden;
  backupStatus.textContent = s.backupFile ? text("configBackupSaved") + " " + s.backupFile :
    s.backingUp ? text("configBackupRunning") : s.device?.base_url ? text("configBackupScope") : "";
  const choice = $("startSetupChoice");
  choice.hidden = s.step !== "setup-choice";
  choice.disabled = s.busy;
  choice.textContent = workspaceText("Komplett neu einrichten", "Set up from scratch");
  const resetBack = $("startResetBack");
  resetBack.hidden = !confirmingReset;
  resetBack.disabled = s.busy;
  resetBack.textContent = workspaceText("Zurück", "Back");
  $("startProgress").hidden = !s.busy || Boolean(s.verifyPending);
  if (s.progress == null) $("startProgress").removeAttribute("value");
  else $("startProgress").value = s.progress;
  const open = $("startOpenDevice");
  open.hidden = !s.openUrl;
  if (s.openUrl) open.href = s.openUrl;
  else open.removeAttribute("href");
  open.textContent = workspaceText("Webinterface öffnen", "Open web interface");
}

async function startRequest(action, extra = {}) {
  return api("/api/start-assistant", {
    method: "POST",
    body: { kind: startState.kind, action, device: startState.device, ...extra }
  });
}

async function startTask(action) {
  const s = startState;
  if (!s || s.busy) return;
  s.busy = true;
  s.error = "";
  s.progress = null;
  renderStart();
  try {
    await action();
  } catch (error) {
    s.error = error.message || String(error);
    if (s.error === "guided_multiple") {
      s.next = s.recovery ? { label: ["Migration fortsetzen", "Resume migration"], run: resumeStartMigration } : null;
      s.step = "";
    } else if (s.step === "running") {
      s.next = s.recovery
        ? { label: ["Migration fortsetzen", "Resume migration"], run: resumeStartMigration }
        : s.jobId ? { label: ["Fortschritt prüfen", "Check progress"], run: () => watchStartJob(s.jobId) }
        : s.verifyPending ? { label: ["Gerätestand prüfen", "Check device state"], run: verifyStartJob }
        : { label: ["Gerät prüfen", "Check device"], run: probeStartDevice };
    }
  } finally {
    s.busy = false;
    renderStart();
  }
}

function showStartStep(message, next = null) {
  Object.assign(startState, { message, next, step: "", openUrl: "" });
  renderStart();
}

function openStartAssistant(kind) {
  if (startState?.busy || startState?.jobId) return;
  startState = { kind };
  $("startSsid").value = "";
  $("startPassword").value = "";
  $("startPassword").type = "password";
  $("startNetworks").replaceChildren($("startManualOption"));
  showStartStep(kind === "backup"
    ? ["Verbinde den Brautomat mit dem WLAN. Falls nötig, kannst du das WLAN per USB einrichten.", "Connect Brautomat to Wi-Fi. You can set up Wi-Fi over USB if needed."]
    : kind === "update"
    ? ["Verbinde den Brautomat per USB oder WLAN.", "Connect the Brautomat via USB or Wi-Fi."]
    : ["Schließe genau einen Brautomat per USB an.", "Connect exactly one Brautomat via USB."],
    { label: ["Gerät prüfen", "Check device"], run: probeStartDevice });
  $("startNext").focus();
}

async function probeStartDevice() {
  const s = startState;
  s.message = s.kind === "backup" ? ["Brautomat wird gesucht …", "Finding Brautomat …"] :
    ["Gerät und passende Firmware werden geprüft …", "Checking device and matching firmware …"];
  renderStart();
  const { device, plan } = await startRequest("probe");
  if (s.device && (s.device.port && (s.device.port !== device.port || s.device.device_id !== device.device_id)
      || !s.device.port && s.device.base_url && s.device.base_url !== device.base_url)) {
    throw new Error("guided_device_changed");
  }
  Object.assign(s, { device, plan });
  const v = [plan.version, plan.channel].filter(Boolean).join(" · ");
  switch (plan.action) {
    case "backup_connection":
      await showStartWifi();
      break;
    case "backup":
      showStartBackup();
      break;
    case "setup_existing":
      showExistingSetup();
      break;
    case "current":
      finishStart(["Für diesen Brautomat ist kein neueres Update verfügbar.", "No newer update is available for this Brautomat."], device);
      break;
    case "update_network_connection":
      showStartStep(["Verbinde den Brautomat auch mit dem WLAN, damit der eingestellte Updatekanal gelesen werden kann.",
        "Also connect Brautomat to Wi-Fi so the configured update channel can be read."],
        { label: ["WLAN einrichten", "Set up Wi-Fi"], run: showStartWifi });
      break;
    case "usb_connection":
      showStartStep(["Ziel: " + v + ". Schließe denselben Brautomat per USB an und lasse ihn im WLAN verbunden.",
        "Target: " + v + ". Connect the same Brautomat via USB and keep it on Wi-Fi."],
        { label: ["Verbindung prüfen", "Check connection"], run: probeStartDevice });
      break;
    case "migration_connection":
      if (device.port) {
        await showStartWifi();
      } else {
        showStartStep(["Für die Migration den gleichen Brautomat per USB anschließen. Die WLAN-Verbindung für das Backup bestehen lassen.",
          "Connect the same Brautomat via USB for migration. Keep its Wi-Fi connection for the backup."],
          { label: ["Verbindung prüfen", "Check connection"], run: probeStartDevice });
      }
      break;
    case "migration":
      showStartStep(
        ["Die Zielversion " + v + " benötigt ein neues Speicherlayout. ServiceTool sichert die Einstellungen, installiert per USB und spielt die Sicherung zurück.",
          "Target version " + v + " requires a new storage layout. ServiceTool backs up the settings, installs over USB and restores the backup."],
        { label: ["Migration starten", "Start migration"], run: runStartJob });
      break;
    case "install":
      showStartStep(["Leerer Flash erkannt. Zielversion " + v + " wird per USB installiert.",
        "Blank flash detected. Target version " + v + " will be installed over USB."],
        { label: ["Firmware installieren", "Install firmware"], run: runStartJob });
      break;
    case "web":
    case "usb": {
      const transport = plan.action === "web" ? "WLAN" : "USB";
      const en = plan.action === "web" ? "Wi-Fi" : "USB";
      showStartStep(["Zielversion " + v + " wird über " + transport + " installiert. Beende einen laufenden Brauvorgang vor dem Start.",
        "Target version " + v + " will be installed over " + en + ". Finish any brewing process before starting."],
        { label: ["Update starten", "Start update"], run: runStartJob });
      break;
    }
  }
}

function showStartBackup() {
  showStartStep(["Die Gerätekonfiguration wird auf diesem Computer gespeichert.", "Device settings will be saved on this computer."],
    { label: ["Konfigurationsbackup erstellen", "Create configuration backup"], run: runStartBackup });
}

async function runStartBackup() {
  const s = startState;
  s.step = "running";
  s.message = ["Konfigurationsbackup wird erstellt …", "Creating configuration backup …"];
  renderStart();
  const {job_id} = await startRequest("backup");
  await watchStartJob(job_id);
}

function showExistingSetup() {
  startState.plan = { action: "setup_existing" };
  startState.backupWifiPending = false;
  showStartStep(["Auf diesem Brautomat ist bereits Firmware installiert.", "Firmware is already installed on this Brautomat."],
    { label: ["Vorhandene Einrichtung weiterverwenden", "Keep existing setup"], run: keepStartSetup });
  startState.step = "setup-choice";
  renderStart();
}

async function keepStartSetup() {
  const device = await startRequest("verify");
  startState.device = device;
  if (device.base_url) {
    finishStart(["Der Brautomat ist betriebsbereit.", "Brautomat is ready."], device);
  } else {
    await showStartWifi();
  }
}

async function prepareStartReset() {
  const plan = await startRequest("prepare_reset");
  startState.plan = plan;
  showStartStep(
    ["Der Flash-Speicher wird vollständig gelöscht. Einstellungen, WLAN-Daten und gespeicherte Dateien gehen verloren. " +
      "Anschließend wird Firmware " + plan.version + " installiert. Beende vorher einen laufenden Brauvorgang.",
      "Flash will be erased completely. Settings, Wi-Fi credentials and saved files will be lost. " +
      "Firmware " + plan.version + " will then be installed. Finish any brewing process first."],
    { label: startState.backupFile ? ["Flash löschen und neu einrichten", "Erase flash and set up again"] :
      ["Ohne Sicherung löschen und neu einrichten", "Erase and set up again without backup"], run: confirmStartReset });
  startState.step = "reset-confirm";
  renderStart();
}

async function backupStartReset() {
  const s = startState;
  if (!s.device.base_url) {
    s.backupWifiPending = true;
    await showStartWifi();
    return;
  }
  s.backingUp = true;
  renderStart();
  try {
    const {job_id} = await startRequest("backup");
    s.backupFile = await waitForConfigBackup(job_id);
    s.next.label = ["Flash löschen und neu einrichten", "Erase flash and set up again"];
  } finally {
    s.backingUp = false;
  }
}

async function confirmStartReset() {
  await runStartJob(true);
}

async function showStartWifi() {
  showStartStep(["Wähle das WLAN aus oder gib den Netzwerknamen ein.", "Select a Wi-Fi network or enter its name."],
    { label: ["WLAN speichern", "Save Wi-Fi"], run: saveStartWifi });
  startState.step = "wifi";
  renderStart();
  try {
    await scanStartWifi();
  } catch (error) {
    if (error.message === "guided_multiple" || error.message === "guided_device_changed") throw error;
    startState.message = ["Gib den WLAN-Namen manuell ein oder suche erneut.", "Enter the Wi-Fi name manually or scan again."];
  }
}

async function scanStartWifi() {
  startState.message = ["WLAN-Netzwerke werden gesucht …", "Scanning for Wi-Fi networks …"];
  renderStart();
  let result = await startRequest("scan", { refresh: true });
  for (let attempt = 0; result.status === "running" && attempt < 24; attempt++) {
    await sleep(900);
    result = await startRequest("scan", { refresh: false });
  }
  if (result.status === "running") {
    startState.message = ["Die WLAN-Suche hat zu lange gedauert. Suche erneut oder gib den Netzwerknamen ein.",
      "The Wi-Fi scan timed out. Scan again or enter the network name."];
    return;
  }
  if (result.status === "error") {
    startState.message = ["Die WLAN-Suche ist fehlgeschlagen. Suche erneut oder gib den Netzwerknamen ein.",
      "The Wi-Fi scan failed. Scan again or enter the network name."];
    return;
  }
  const networks = new Map();
  for (const { ssid, rssi } of result.networks || []) {
    if (!ssid) continue;
    const signal = networks.get(ssid);
    if (!networks.has(ssid) || (Number.isFinite(rssi) && (!Number.isFinite(signal) || rssi > signal))) {
      networks.set(ssid, rssi);
    }
  }
  startState.message = networks.size
    ? ["Wähle das WLAN aus oder gib den Netzwerknamen ein.", "Select a Wi-Fi network or enter its name."]
    : ["Keine WLAN-Netzwerke gefunden. Suche erneut oder gib den Netzwerknamen ein.",
      "No Wi-Fi networks found. Scan again or enter the network name."];
  const select = $("startNetworks");
  const previous = select.value;
  const input = $("startSsid");
  select.replaceChildren(...Array.from(networks, ([ssid, rssi]) =>
    new Option(Number.isFinite(rssi) ? `${ssid} (${rssi} dBm)` : ssid, ssid)), $("startManualOption"));
  if (previous && !networks.has(previous)) input.value = previous;
  select.value = networks.has(previous) ? previous : input.value ? "" :
    (networks.has(result.preferred_ssid) ? result.preferred_ssid : networks.keys().next().value || "");
}

async function saveStartWifi() {
  const ssid = $("startNetworks").value || $("startSsid").value;
  if (!ssid.trim()) throw new Error(workspaceText("Gib den WLAN-Namen ein.", "Enter the Wi-Fi name."));
  startState.message = ["WLAN wird gespeichert. Der Brautomat startet neu …", "Saving Wi-Fi. Brautomat is restarting …"];
  renderStart();
  await startRequest("wifi", { ssid, password: $("startPassword").value });
  $("startPassword").value = "";
  $("startPassword").type = "password";
  if (!startState.backupWifiPending) startState.wifiConfigured = true;
  if (startState.kind === "setup" || startState.kind === "backup" || startState.plan?.action === "update_network_connection") {
    await verifyStartJob();
  } else {
    await probeStartDevice();
  }
}

async function runStartJob(confirmErase = false) {
  const s = startState;
  s.step = "running";
  s.message = ["Gerät und Zielpaket werden geprüft …", "Checking the device and target package …"];
  renderStart();
  const { job_id } = await startRequest("start", { plan: s.plan, confirm_erase: confirmErase });
  await watchStartJob(job_id);
}

async function resumeStartMigration() {
  const { job_id } = await startRequest("resume", { session_id: startState.recovery });
  await watchStartJob(job_id);
}

async function watchStartJob(id) {
  const s = startState;
  s.jobId = id;
  let failures = 0;
  let job;
  for (;;) {
    try {
      job = await api("/api/jobs/" + encodeURIComponent(id));
    } catch (error) {
      if (error.status === 404) {
        s.jobId = null;
        s.verifyPending = s.kind !== "backup";
        throw new Error("guided_job_lost");
      }
      if (++failures >= 5) throw error;
      s.error = error.message || String(error);
      renderStart();
      await sleep(2000);
      continue;
    }
    failures = 0;
    s.error = "";
    const phase = startJobPhases[job.phase];
    s.progress = job.progress > 0 && (!phase || job.phase === "write") ? job.progress : null;
    if (phase) s.message = phase;
    else if (job.current_file?.startsWith("migrationStep")) {
      const phase = text(job.current_file);
      if (phase && phase !== job.current_file) s.message = [phase, phase];
    }
    renderStart();
    if (job.status === "done" || job.status === "failed") break;
    await sleep(1000);
  }
  s.jobId = null;
  if (job.status === "failed") {
    s.recovery = job.result?.migration_id || s.recovery;
    s.verifyPending = s.kind !== "backup" && !s.recovery;
    throw new Error(job.error);
  }
  s.recovery = null;
  if (s.kind === "backup") {
    const path = job.result?.backup_file;
    if (!path) throw new Error(workspaceText("Die Sicherungsdatei konnte nicht bestätigt werden.", "The backup file could not be verified."));
    showStartStep(["Sicherung gespeichert: " + path, "Backup saved: " + path]);
    loadBackups().catch(console.error);
    return;
  }
  await verifyStartJob();
}

function startVersion(firmware) {
  return String(firmware || "").match(/\d+\.\d+(?:\.\d+)?/)?.[0] || "";
}

async function verifyStartJob() {
  const s = startState;
  s.step = "running";
  s.verifyPending = true;
  s.message = ["Warte auf den Brautomat nach dem Neustart …", "Waiting for Brautomat to reconnect …"];
  s.progress = null;
  renderStart();
  const expected = s.backupWifiPending ? null : startVersion(s.plan?.version);
  const channel = expected && s.plan?.channel;
  const timeout = Date.now() + (s.plan?.action === "web" ? 240000 : 45000);
  do {
    let device;
    try {
      device = await startRequest("verify");
    } catch (error) {
      if (!["guided_not_found", "guided_usb_required", "guided_network_required"].includes(error.message)) throw error;
      await sleep(2000);
      continue;
    }
    const variantMatches = !channel || (channel === "Development" ? /\bdevelop(?:ment)?\b/i : /\brelease\b/i).test(device.firmware);
    if (device.firmware && variantMatches && (!expected || startVersion(device.firmware) === expected)) {
      if (s.plan?.action === "update_network_connection" && device.base_url) {
        s.device = device;
        s.verifyPending = false;
        await probeStartDevice();
        return;
      }
      if (s.backupWifiPending) {
        if (!device.base_url) {
          await sleep(2000);
          continue;
        }
        s.device = device;
        await prepareStartReset();
        s.backupWifiPending = false;
        s.verifyPending = false;
        return;
      }
      if (s.kind === "backup") {
        if (device.base_url) {
          s.device = device;
          s.verifyPending = false;
          showStartBackup();
          return;
        }
        await sleep(2000);
        continue;
      }
      s.device = device;
      if (s.kind === "setup" && (!device.base_url || (s.plan?.action === "reset" && !s.wifiConfigured))) {
        await showStartWifi();
        return;
      }
      if (device.base_url || s.plan?.action === "usb") {
        finishStart(s.kind === "setup"
          ? ["Der Brautomat ist betriebsbereit.", "Brautomat is ready."]
          : ["Firmware " + [startVersion(device.firmware), channel].filter(Boolean).join(" · ") + " ist bestätigt.",
            "Firmware " + [startVersion(device.firmware), channel].filter(Boolean).join(" · ") + " verified."], device);
        return;
      }
    }
    await sleep(2000);
  } while (Date.now() < timeout);
  throw new Error("guided_network_required");
}

function finishStart(message, device) {
  startState.verifyPending = false;
  showStartStep(message);
  const url = device.base_url || "";
  if (/^https?:\/\//.test(url)) startState.openUrl = url;
}

function initializeStart() {
  $("startChoices").addEventListener("click", event => {
    const kind = event.target.closest("[data-assistant]")?.dataset.assistant;
    if (kind) openStartAssistant(kind);
  });
  $("startServiceToolGuide").addEventListener("click", () => openGuideBook());
  $("startFirmwarePackages").addEventListener("click", () => {
    selectWorkspaceView("install");
    if (workspaceView === "install") $("firmwarePackageTitle").focus();
  });
  $("startBack").addEventListener("click", () => {
    const previous = $("startChoices").querySelector("[aria-current]");
    startState = null;
    $("startPassword").value = "";
    $("startPassword").type = "password";
    renderStart();
    previous?.focus();
  });
  $("startNext").addEventListener("click", () => {
    if (startState?.next) startTask(startState.next.run);
  });
  $("startResetBackup").addEventListener("click", () => startTask(backupStartReset));
  $("startSetupChoice").addEventListener("click", () => startTask(prepareStartReset));
  $("startResetBack").addEventListener("click", () => {
    showExistingSetup();
    $("startSetupChoice").focus();
  });
  $("startScan").addEventListener("click", () => startTask(scanStartWifi));
  $("startPasswordReveal").addEventListener("click", () => {
    const input = $("startPassword");
    input.type = input.type === "password" ? "text" : "password";
    updateWifiPasswordVisibility("startPassword", "startPasswordReveal");
  });
  $("startNetworks").addEventListener("change", () => {
    renderStart();
    if (!$("startNetworks").value) $("startSsid").focus();
  });
  $("startOpenPreference").checked = appConfig.show_start !== false;
  $("startOpenPreference").addEventListener("change", async event => {
    const checkbox = event.target;
    checkbox.disabled = true;
    try {
      await saveConfig({ show_start: checkbox.checked });
      $("startPreferenceStatus").textContent = "";
    } catch (error) {
      checkbox.checked = appConfig.show_start !== false;
      $("startPreferenceStatus").textContent = error.message;
    } finally {
      checkbox.disabled = false;
    }
  });
  translateStart();
}

