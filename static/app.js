const I18N = {
    de: {
    title: "Brautomat32 ServiceTool",
    appLoadingText: "ServiceTool wird geladen ...",
    subtitle: "",
    langLabel: "Sprache",
    debugOutputLabel: "Debug-Ausgabe",
    guideTitle: "Anleitung",
    tabBackup: "Backup & Restore",
    tabLogging: "Serial Monitor",
    tabFirmware: "Firmware",
    tabManagement: "Verwaltung",
    tabTestRunner: "Test Runner",
    tabMigration: "Migration",
    checkDeviceOnline: "Online",
    checkDeviceSerial: "Seriell",
    checkDeviceNoWifi: "Kein WLAN",
    checkDeviceNone: "Kein Gerät",
    checkDeviceChecking: "Prüfe ...",
    checkServiceToolUpdate: "ServiceTool Update prüfen",
    serviceToolUpdateTitle: "ServiceTool Update",
    serviceToolUpdateCurrent: "Installierte Version",
    serviceToolUpdateAvailable: "Neue Version",
    serviceToolUpdateReleased: "Veröffentlicht",
    serviceToolUpdateNotes: "Hinweise",
    serviceToolUpdateNoUpdate: "Keine neue ServiceTool-Version verfügbar.",
    serviceToolUpdateReady: "Eine neue ServiceTool-Version ist verfügbar.",
    serviceToolUpdateDownloading: "Update wird heruntergeladen ...",
    serviceToolUpdateDownloaded: "Update geprüft. Das ServiceTool wird beendet, aktualisiert und anschließend neu gestartet.",
    serviceToolUpdateManualDownloaded: "Update heruntergeladen und geprüft. Der Zielordner wurde geöffnet; bitte das Paket manuell installieren.",
    serviceToolUpdateDownloadBtn: "Update installieren",
    serviceToolUpdateManualDownloadBtn: "Download",
    serviceToolUpdateCloseBtn: "Schließen",
    firmwareUpdateTitle: "Firmware Update",
    firmwareUpdateCurrent: "Installierte Firmware",
    firmwareUpdateAvailable: "Neue Firmware",
    firmwareUpdateReleased: "Veröffentlicht",
    firmwareUpdateType: "Quelle",
    firmwareUpdateNotes: "Hinweise",
    firmwareUpdateNoUpdate: "Keine neue Firmware-Version verfügbar.",
    firmwareUpdateReady: "Eine neue Firmware-Version ist verfügbar.",
    firmwareUpdateBlockedActive: "Firmware WebUpdate ist bei aktivem Maischen oder Fermentieren gesperrt.",
    firmwareUpdateStarting: "Backup wird erstellt, danach startet das Firmware WebUpdate ...",
    firmwareUpdateStarted: "Firmware WebUpdate gestartet. Das Gerät startet neu und aktualisiert Firmware und Webdateien.",
    firmwareUpdateStartBtn: "Update starten",
    firmwareUpdateCloseBtn: "Schließen",
    activeProcessMash: "Maische",
    activeProcessFermenter: "Fermenter",
    activeProcessWaiting: "wartet",
    includeApiLabel: "Backup mit BrewFather-Zugangsdaten",
    backupTitle: "Backup Konfiguration",
    backupRestoreStatusTitle: "Status",
    wifiTitle: "WLAN Zugangsdaten",
    wifiScanLabel: "Verfügbare Netzwerke",
    wifiSsidLabel: "SSID",
    wifiPasswordLabel: "Passwort",
    restoreTitle: "Restore",
    restoreFileLabel: "Backup-Datei",
    flashTitle: "Firmware Flash",
    firmwareBackupTitle: "Firmware Backup",
    firmwareBackupHint: "Sichert die aktuell laufende App-Partition des Geräts über den seriellen Port.",
    webfilesTitle: "Webdateien Update",
    webfilesHint: "Aktualisiert die in WebUpdate verwendeten LittleFS-Webdateien direkt über /edit aus dem öffentlichen Brautomat32-Repo.",
    webfilesLanguageLabel: "Brautomat Websprache",
    firmwareStatusTitle: "Status",
    managementStatusTitle: "Status",
    managementDeviceFilesTitle: "Dateien auf dem Device",
    managementLocalFilesTitle: "Dateien im lokalen Inventar",
    inventoryRootLabel: "Inventarverzeichnis",
    chooseInventoryRoot: "Verzeichnis öffnen",
    inventoryConflictTitle: "Datei existiert bereits",
    inventoryConflictMessage: "Die Datei \"%name%\" existiert bereits.",
    inventoryConflictOverwrite: "Überschreiben",
    inventoryConflictVersion: "Version erstellen",
    inventoryConflictCancel: "Abbrechen",
    inventoryDetailTitle: "Datei-Details",
    inventoryDetailLoading: "Details werden geladen ...",
    inventoryUserInfoTitle: "Notizen",
    inventoryUserInfoEmpty: "Keine Notiz vorhanden.",
    inventoryUserInfoPlaceholder: "",
    inventoryUserInfoSave: "Speichern",
    inventoryUserInfoSaved: "Notiz gespeichert.",
    managementMashplansTab: "Maischepläne",
    managementFermenterplansTab: "Fermenter Pläne",
    managementProfilesTab: "Profile",
    managementConfigTab: "Konfiguration",
    packageSourceLabel: "Paketquelle",
    packageVersionLabel: "Spezialversion",
    activeFirmwareLabel: "Aktive Firmware",
    activeFirmwareUnknown: "Unbekannt",
    portLabel: "COM Port",
    baudLabel: "Baudrate",
    eraseFlashLabel: "Flash löschen",
    littlefsLabel: "Flash LittleFS",
    flashBackupWarning: "Vor Erase oder Flash LittleFS ein Backup erstellen",
    firmwareProgressTitle: "Fortschritt",
    packageLabel: "Paketquelle URL / Verzeichnis",
    migrationTitle: "Migration",
    migrationHint: "Für Layoutwechsel auf eine große App-Partition. Vor der Migration wird standardmäßig ein Backup erzeugt.",
    migrationBackupLabel: "Backup vor Migration",
    serialTitle: "Serial Monitor",
    serialPortLabel: "COM Port",
    serialBaudLabel: "Baudrate",
    checkDevice: "Gerät prüfen",
    openDeviceUrl: "Device im neuen Tab öffnen",
    backupBtn: "Backup",
    backupBtnTooltip: "Backup erstellen",
    backupRenameBtn: "Backup umbenennen",
    backupInfoBtn: "Backup-Details anzeigen",
    backupDeleteBtn: "Backup löschen",
    restoreFilePickBtn: "Backup-Datei auswählen",
    wifiResetBtn: "WLAN Reset",
    wifiResetTooltip: "WLAN Zugangsdaten zurücksetzen",
    wifiScanBtn: '<i class="icon-refresh button-icon"></i>',
    wifiScanTooltip: "WLANs scannen",
    wifiSaveBtn: '<i class="icon-download button-icon"></i>',
    wifiSaveTooltip: "WLAN speichern und Gerät neu starten",
    restoreBtn: "Restore ausführen",
    refreshPorts: "Ports neu laden",
    choosePackageDir: "Verzeichnis öffnen",
    telegrafBinaryPickBtn: "Programmdatei wählen",
    telegrafTemplatesPickBtn: "Templates-Verzeichnis wählen",
    telegrafBinaryFound: "Verwendet",
    telegrafBinarySourcePath: "im Suchpfad (PATH) gefunden",
    telegrafBinarySourceConfigured: "konfiguriert",
    telegrafBinarySourceBundled: "mitgeliefert",
    telegrafBinarySourceCached: "heruntergeladen",
    telegrafBinaryPending: "Nicht gefunden – Telegraf wird beim Start automatisch heruntergeladen.",
    telegrafBinaryMissing: "Angegebene Programmdatei nicht gefunden.",
    backupFirmwareBtn: "Firmware sichern",
    managementRefreshBtn: "Liste aktualisieren",
    managementDeleteDeviceBtn: "Datei auf dem Device löschen",
    managementDeleteLocalBtn: "Datei im lokalen Inventar löschen",
    managementInfoDeviceBtn: "Datei-Details auf dem Device anzeigen",
    managementInfoLocalBtn: "Datei-Details im lokalen Inventar anzeigen",
    managementCopyToLocalBtn: "Datei vom Device ins lokale Inventar kopieren",
    managementCopyToDeviceBtn: "Datei aus dem lokalen Inventar auf das Device kopieren",
    managementRenameDeviceBtn: "Datei auf dem Device umbenennen",
    managementRenameLocalBtn: "Datei im lokalen Inventar umbenennen",
    managementLocalUpBtn: "Eine Ebene nach oben",
    managementLocalNewFolderBtn: "Ordner erstellen",
    managementLocalNewFileBtn: "Datei erstellen",
    updateWebfilesBtn: "Webdateien aktualisieren",
    checkFirmwareUpdateBtn: "Firmware WebUpdate",
    installLanguageBtn: "Sprache wechseln",
    flashBtn: "Firmware flashen",
    migrateBtn: "Migration in Entwicklung",
    serialStartBtn: '<i class="icon-play button-icon"></i>',
    serialStartTooltip: "Log starten",
    serialStopBtn: '<i class="icon-stop button-icon"></i>',
    serialStopTooltip: "Log stoppen",
    serialClearBtn: '<i class="icon-trash-o button-icon"></i>',
    serialClearTooltip: "Log leeren",
    serialAutoscrollBtn: "Autoscroll",
    serialAutoscrollTooltip: "Autoscroll ein-/ausschalten",
    serialRebootBtn: "Reboot",
    serialCopyBtn: "In Zwischenablage kopieren",
    statusClearBtn: "Log leeren",
    statusCopyBtn: "In Zwischenablage kopieren",
    guideConnectionTitle: "Verbindung",
    guideConnectionText: "Prüfe oben rechts den Status. Online bedeutet HTTP-Verbindung zum Brautomat, Seriell bedeutet nur COM-Port, Kein Gerät gefunden bedeutet weder HTTP noch seriellen Zugriff.",
    guideFirmwareTitle: "Firmware",
    guideFirmwareText: "Für normale Updates nutze Latest Release oder Latest Development. Open directory ist für lokale Testpakete und Spezialfälle gedacht.",
    guideWifiTitle: "WLAN",
    guideWifiText: "Der SSID-Scan startet beim Öffnen des Firmware-Tabs automatisch. Speichern schreibt die WLAN-Zugangsdaten und prüft danach den Gerätestatus neu.",
    guideBackupTitle: "Backup & Restore",
    guideBackupText: "Konfigurations-Backups werden lokal gespeichert und tabellarisch angezeigt. Restore arbeitet mit der gewählten Backup-Datei oder einer externen JSON-Datei.",
    guideManagementTitle: "Verwaltung",
    guideManagementText: "Rezepte, Fermenterpläne und Profile können zwischen Device und lokalem Inventar kopiert, umbenannt und gelöscht werden. Device-Zugriffe laufen nur bei Online-Status.",
    guideSerialTitle: "Serial Monitor",
    guideSerialText: "Der Serial Monitor zeigt Live-Log und übernimmt den COM-Port für Flash und Firmware-Backup kontrolliert an esptool. Danach startet er automatisch wieder.",
    testRunnerTitle: "Test Runner",
    testRunnerHint: "Startet den vorhandenen Repo-Test-Runner aus tools/test-runner mit auswählbarer Suite.",
    testRunnerSuiteLabel: "Testsuite",
    testRunnerSuiteInfoTitle: "Suite Info",
    testRunnerDeviceKeyLabel: "Device Key",
    testRunnerStartBtn: "Start",
    testRunnerStopBtn: "Stop",
    testRunnerResultTitle: "Ergebnis",
    testRunnerSummarySuiteLabel: "Suite",
    testRunnerSummaryStatusLabel: "Status",
    testRunnerSummaryCountsLabel: "Step",
    testRunnerSummaryReportLabel: "Report",
    testRunnerStatusTitle: "Status",
    testRunnerUnavailable: "Lokale Runner-Dateien nicht verfügbar. Es werden nur die letzten öffentlichen Testergebnisse angezeigt.",
    testRunnerLoading: "Lade Test Runner. Bitte warten ...",
    testRunnerRunning: "Testlauf läuft. Bitte warten ...",
    testRunnerStopping: "Testlauf wird gestoppt ...",
    testRunnerRestoring: "Ursprünglicher Gerätezustand wird wiederhergestellt ...",
    testRunnerStopped: "Testlauf gestoppt.",
    testRunnerStartTooltip: "Testsuite starten",
    testRunnerStopTooltip: "Testsuite stoppen",
    testRunnerPublicResultsTitle: "Letzte öffentliche Testergebnisse",
    guideUpdateTitle: "Updates",
    guideUpdateText: "Das ServiceTool prüft beim Start und per Update-Button auf neue Versionen. Updates werden als ZIP geladen, per SHA256 geprüft und danach manuell ersetzt.",
  },
  en: {
    title: "Brautomat32 ServiceTool",
    appLoadingText: "Loading ServiceTool ...",
    subtitle: "",
    langLabel: "Language",
    debugOutputLabel: "Debug Output",
    guideTitle: "Guide",
    tabBackup: "Backup & Restore",
    tabLogging: "Serial Monitor",
    tabFirmware: "Firmware",
    tabManagement: "Management",
    tabTestRunner: "Test Runner",
    tabMigration: "Migration",
    checkDeviceOnline: "Online",
    checkDeviceSerial: "Serial",
    checkDeviceNoWifi: "No WiFi",
    checkDeviceNone: "No device",
    checkDeviceChecking: "Checking ...",
    checkServiceToolUpdate: "Check ServiceTool update",
    serviceToolUpdateTitle: "ServiceTool Update",
    serviceToolUpdateCurrent: "Installed version",
    serviceToolUpdateAvailable: "New version",
    serviceToolUpdateReleased: "Released",
    serviceToolUpdateNotes: "Notes",
    serviceToolUpdateNoUpdate: "No new ServiceTool version available.",
    serviceToolUpdateReady: "A new ServiceTool version is available.",
    serviceToolUpdateDownloading: "Downloading update ...",
    serviceToolUpdateDownloaded: "Update verified. ServiceTool will close, install the update, and restart.",
    serviceToolUpdateManualDownloaded: "Update downloaded and verified. The target folder has been opened; please install the package manually.",
    serviceToolUpdateDownloadBtn: "Install update",
    serviceToolUpdateManualDownloadBtn: "Download",
    serviceToolUpdateCloseBtn: "Close",
    firmwareUpdateTitle: "Firmware Update",
    firmwareUpdateCurrent: "Installed firmware",
    firmwareUpdateAvailable: "New firmware",
    firmwareUpdateReleased: "Released",
    firmwareUpdateType: "Source",
    firmwareUpdateNotes: "Notes",
    firmwareUpdateNoUpdate: "No new firmware version available.",
    firmwareUpdateReady: "A new firmware version is available.",
    firmwareUpdateBlockedActive: "Firmware WebUpdate is blocked while mash or fermenter process is active.",
    firmwareUpdateStarting: "Creating backup, then starting firmware WebUpdate ...",
    firmwareUpdateStarted: "Firmware WebUpdate started. The device reboots and updates firmware and web files.",
    firmwareUpdateStartBtn: "Start update",
    firmwareUpdateCloseBtn: "Close",
    activeProcessMash: "Mash",
    activeProcessFermenter: "Fermenter",
    activeProcessWaiting: "waiting",
    includeApiLabel: "Backup with BrewFather credentials",
    backupTitle: "Backup configuration",
    backupRestoreStatusTitle: "Status",
    wifiTitle: "WiFi Credentials",
    wifiScanLabel: "Available networks",
    wifiSsidLabel: "SSID",
    wifiPasswordLabel: "Password",
    restoreTitle: "Restore",
    restoreFileLabel: "Backup file",
    flashTitle: "Firmware Flash",
    firmwareBackupTitle: "Firmware Backup",
    firmwareBackupHint: "Backup active app partition over the serial port.",
    webfilesTitle: "Web Files Update",
    webfilesHint: "Updates the LittleFS web files used by WebUpdate directly from Brautomat32 github repository.",
    webfilesLanguageLabel: "Brautomat Web Language",
    firmwareStatusTitle: "Status",
    managementStatusTitle: "Status",
    managementDeviceFilesTitle: "Files on device",
    managementLocalFilesTitle: "Files in local inventory",
    inventoryRootLabel: "Inventory root",
    chooseInventoryRoot: "Open directory",
    inventoryConflictTitle: "File already exists",
    inventoryConflictMessage: "The file \"%name%\" already exists.",
    inventoryConflictOverwrite: "Overwrite",
    inventoryConflictVersion: "Create version",
    inventoryConflictCancel: "Cancel",
    inventoryDetailTitle: "File details",
    inventoryDetailLoading: "Loading details ...",
    inventoryUserInfoTitle: "Notes",
    inventoryUserInfoEmpty: "No note available.",
    inventoryUserInfoPlaceholder: "",
    inventoryUserInfoSave: "Save",
    inventoryUserInfoSaved: "Note saved.",
    managementMashplansTab: "Mash plans",
    managementFermenterplansTab: "Fermenter plans",
    managementProfilesTab: "Profiles",
    managementConfigTab: "Configuration",
    packageSourceLabel: "Package source",
    packageVersionLabel: "Special Version",
    activeFirmwareLabel: "Active firmware",
    activeFirmwareUnknown: "Unknown",
    portLabel: "COM Port",
    baudLabel: "Baud rate",
    eraseFlashLabel: "Flash erase",
    littlefsLabel: "Flash LittleFS",
    flashBackupWarning: "Create a backup before erase or flash LittleFS",
    firmwareProgressTitle: "Progress",
    packageLabel: "Package URL / directory",
    migrationTitle: "Migration",
    migrationHint: "For layout changes to a large app partition. A backup is created by default before migration.",
    migrationBackupLabel: "Backup before migration",
    serialTitle: "Serial Monitor",
    serialPortLabel: "COM Port",
    serialBaudLabel: "Baud rate",
    checkDevice: "Check device",
    openDeviceUrl: "Open device in new tab",
    backupBtn: "Backup",
    backupBtnTooltip: "Create backup",
    backupRenameBtn: "Rename backup",
    backupInfoBtn: "Show backup details",
    backupDeleteBtn: "Delete backup",
    restoreFilePickBtn: "Choose backup file",
    wifiResetBtn: "Reset WiFi",
    wifiResetTooltip: "Reset WiFi credentials",
    wifiScanBtn: '<i class="icon-refresh button-icon"></i>',
    wifiScanTooltip: "Scan WiFi networks",
    wifiSaveBtn: '<i class="icon-download button-icon"></i>',
    wifiSaveTooltip: "Save WiFi and reboot device",
    restoreBtn: "Run restore",
    refreshPorts: "Reload ports",
    choosePackageDir: "Open directory",
    telegrafBinaryPickBtn: "Choose executable",
    telegrafTemplatesPickBtn: "Choose templates directory",
    telegrafBinaryFound: "Using",
    telegrafBinarySourcePath: "found in PATH",
    telegrafBinarySourceConfigured: "configured",
    telegrafBinarySourceBundled: "bundled",
    telegrafBinarySourceCached: "downloaded",
    telegrafBinaryPending: "Not found – Telegraf will be downloaded automatically on start.",
    telegrafBinaryMissing: "Configured executable not found.",
    backupFirmwareBtn: "Backup firmware",
    managementRefreshBtn: "Refresh list",
    managementDeleteDeviceBtn: "Delete file on device",
    managementDeleteLocalBtn: "Delete file in local inventory",
    managementInfoDeviceBtn: "Show file details on device",
    managementInfoLocalBtn: "Show file details in local inventory",
    managementCopyToLocalBtn: "Copy file from device to local inventory",
    managementCopyToDeviceBtn: "Copy file from local inventory to device",
    managementRenameDeviceBtn: "Rename file on device",
    managementRenameLocalBtn: "Rename file in local inventory",
    managementLocalUpBtn: "Go one level up",
    managementLocalNewFolderBtn: "Create folder",
    managementLocalNewFileBtn: "Create file",
    updateWebfilesBtn: "Update web files",
    checkFirmwareUpdateBtn: "Firmware WebUpdate",
    installLanguageBtn: "Change language",
    flashBtn: "Flash firmware",
    migrateBtn: "Migration in development",
    serialStartBtn: '<i class="icon-play button-icon"></i>',
    serialStartTooltip: "Start log",
    serialStopBtn: '<i class="icon-stop button-icon"></i>',
    serialStopTooltip: "Stop log",
    serialClearBtn: '<i class="icon-trash-o button-icon"></i>',
    serialClearTooltip: "Clear log",
    serialAutoscrollBtn: "Autoscroll",
    serialAutoscrollTooltip: "Toggle autoscroll",
    serialRebootBtn: "Reboot",
    serialCopyBtn: "Copy to clipboard",
    statusClearBtn: "Clear log",
    statusCopyBtn: "Copy to clip",
    guideConnectionTitle: "Connection",
    guideConnectionText: "Check the status at the top right. Online means HTTP access to the Brautomat, Serial means only COM access, No device found means neither HTTP nor serial access is available.",
    guideFirmwareTitle: "Firmware",
    guideFirmwareText: "Use Latest Release or Latest Development for normal updates. Open directory is intended for local test packages and special cases.",
    guideWifiTitle: "WiFi",
    guideWifiText: "SSID scan starts automatically when the Firmware tab opens. Save writes WiFi credentials and then checks device status again.",
    guideBackupTitle: "Backup & Restore",
    guideBackupText: "Configuration backups are stored locally and shown in a table. Restore works with the selected backup file or with an external JSON file.",
    guideManagementTitle: "Management",
    guideManagementText: "Mash plans, fermenter plans and profiles can be copied, renamed and deleted between device and local inventory. Device actions only run when status is Online.",
    guideSerialTitle: "Serial Monitor",
    guideSerialText: "The serial monitor shows live log output and hands the COM port over to esptool for flash and firmware backup. Afterwards it starts automatically again.",
    testRunnerTitle: "Test Runner",
    testRunnerHint: "Starts the existing repo test runner from tools/test-runner with a selectable suite.",
    testRunnerSuiteLabel: "Test suite",
    testRunnerSuiteInfoTitle: "Suite info",
    testRunnerDeviceKeyLabel: "Device key",
    testRunnerStartBtn: "Start",
    testRunnerStopBtn: "Stop",
    testRunnerResultTitle: "Result",
    testRunnerSummarySuiteLabel: "Suite",
    testRunnerSummaryStatusLabel: "Status",
    testRunnerSummaryCountsLabel: "Step",
    testRunnerSummaryReportLabel: "Report",
    testRunnerStatusTitle: "Status",
    testRunnerUnavailable: "Local runner files are not available. Only the latest public test results are shown.",
    testRunnerLoading: "Loading Test Runner. Please wait ...",
    testRunnerRunning: "Test run in progress. Please wait ...",
    testRunnerStopping: "Stopping test run ...",
    testRunnerRestoring: "Restoring original device state ...",
    testRunnerStopped: "Test run stopped.",
    testRunnerStartTooltip: "Start selected suite",
    testRunnerStopTooltip: "Stop active suite",
    testRunnerPublicResultsTitle: "Latest public test results",
    guideUpdateTitle: "Updates",
    guideUpdateText: "The ServiceTool checks for new versions at startup and via the update button. Updates are downloaded as ZIP, verified by SHA256, and then replaced manually.",
  }
};

I18N.de.migrationHint = "Migration von 1.62 auf 1.70 mit verändertem Partitions-Schema. Ablauf: Backup, Erase Flash, neue Partitionen + Firmware + LittleFS flashen. WLAN wird übernommen, danach Gerät neu einrichten oder Restore.";
I18N.de.migrationRequirementSource = "Quelle: Brautomat32 1.62.x";
I18N.de.migrationRequirementTarget = "Ziel: Brautomat32 1.70.x";
I18N.de.migrationRequirementTransport = "Erforderlich: Online + serieller COM-Port";
I18N.de.migrateBtn = "Migration starten";

I18N.en.migrationHint = "Migration from 1.62 to 1.70 with changed partition scheme. Flow: backup, erase flash, flash new partitions + firmware + LittleFS. WiFi is transferred, then reconfigure or restore the device.";
I18N.en.migrationRequirementSource = "Source: Brautomat32 1.62.x";
I18N.en.migrationRequirementTarget = "Target: Brautomat32 1.70.x";
I18N.en.migrationRequirementTransport = "Required: online + serial COM port";
I18N.en.migrateBtn = "Start migration";

let currentLang = "en";
let appConfig = {
  service_tool_version: "1.7.1",
  language: "en",
  debug_output: false,
  device_url: "http://brautomat.local",
  package_source: "release",
  package_ref: "",
  package_dir: "",
  open_package_dir: "",
  inventory_root: "",
  baud_rate: 921600,
  serial_baud_rate: 115200,
  serial_port: ""
};
let lastDeviceStatus = {
  state: "offline",
  firmware: "",
  transport: "",
  version_source: ""
};
let firmwareUpdateState = null;
let lastFirmwareUpdatePromptKey = "";
let pendingFirmwareTabWifiRefresh = false;
let checkDeviceInFlight = null;
let pendingOnlineUpgradeCheck = null;
let activeProcessPollInFlight = false;
let startupTraceEpochMs = 0;
let startupTraceActive = false;
const STARTUP_TRACE_WINDOW_MS = 30000;
const MANAGEMENT_KINDS = {
  mashplans: { prefix: "mashplans" },
  fermenterplans: { prefix: "fermenterplans" },
  profiles: { prefix: "profiles" },
  config: { prefix: "config" }
};
const MANAGEMENT_SORT_COLUMNS = ["name", "mtime", "size"];
const MANAGEMENT_SORT_DEFAULT = { key: "name", direction: "asc" };
const managementSortState = {};
const managementListCache = {};
const managementEmptyState = {};
const managementSelectionState = {};
const managementLocalDirState = {};
const managementVersionExpanded = {};
const managementLoadingState = {};
const BACKUP_SORT_COLUMNS = ["name", "version", "mtime", "size"];
const BACKUP_SORT_DEFAULT = { key: "name", direction: "asc" };
let backupSortState = { ...BACKUP_SORT_DEFAULT };
let backupListCache = [];
let testRunnerCatalog = null;
let testRunnerPollTimer = null;
let inventoryConflictResolver = null;
let inventoryDetailState = null;
let appStartupPendingTasks = 0;
let serialAutoscroll = true;
let serviceToolUpdateState = null;

function $(id) { return document.getElementById(id); }
function text(key) { return I18N[currentLang][key] || key; }
function hideTestRunnerViaQuery() {
  return new URLSearchParams(window.location.search).get("hide_test") === "1";
}
function serviceToolTitle() {
  return `Brautomat32 ServiceTool V ${appConfig.service_tool_version || "1.7.1"}`;
}

function queueDeferredLoad(taskName, fn, delayMs = 0) {
  window.setTimeout(async () => {
    try {
      await fn();
      writeStartupTrace(`${taskName} done`, { force: true });
    } catch (err) {
      console.error(err);
      writeStartupTrace(`${taskName} failed: ${String(err)}`, { force: true });
    }
  }, delayMs);
}

function runtimeDirectoryFallback() {
  return window.location.pathname ? window.location.pathname.replace(/\/[^/]*$/, "").replace(/\//g, "\\") : "";
}

function openPackageDirValue() {
  return (appConfig.open_package_dir || "").trim() || runtimeDirectoryFallback();
}
function scrollOutputToEnd(id) {
  const node = $(id);
  if (node) node.scrollTop = node.scrollHeight;
}

function scrollSerialLogToEnd() {
  if (serialAutoscroll) {
    scrollOutputToEnd("serialLog");
  }
}

function updateSerialAutoscrollButton() {
  const button = $("serialAutoscrollBtn");
  if (!button) return;
  button.classList.toggle("primary", serialAutoscroll);
  button.classList.toggle("ghost", !serialAutoscroll);
  button.setAttribute("aria-pressed", serialAutoscroll ? "true" : "false");
  button.title = buttonTooltip("serialAutoscrollTooltip");
}

function setStatus(id, value) {
  $(id).textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  scrollOutputToEnd(id);
}
function appendTimestampedStatus(id, message) {
  const node = $(id);
  if (!node) return;
  const now = new Date();
  const pad = (value, width = 2) => String(value).padStart(width, "0");
  const line = `[${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}] ${message}`;
  node.textContent = node.textContent ? `${node.textContent}\n${line}` : line;
  scrollOutputToEnd(id);
}
function startupTraceTimestamp() {
  const now = new Date();
  const pad = (value, width = 2) => String(value).padStart(width, "0");
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;
}
function startupTraceDeltaMs() {
  if (!startupTraceEpochMs) return 0;
  return Math.max(0, Math.round(performance.now() - startupTraceEpochMs));
}
function writeStartupTrace(message, { reset = false, force = false } = {}) {
  if (reset) {
    startupTraceEpochMs = performance.now();
    startupTraceActive = true;
    setStatus("firmwareStatus", "");
  }
  if (!startupTraceActive && !force) return;
  if (!force && startupTraceEpochMs && (performance.now() - startupTraceEpochMs) > STARTUP_TRACE_WINDOW_MS) {
    startupTraceActive = false;
    return;
  }
  const line = `[${startupTraceTimestamp()}][+${startupTraceDeltaMs()} ms] ${message}`;
  const node = $("firmwareStatus");
  if (node) {
    node.textContent = node.textContent ? `${node.textContent}\n${line}` : line;
    scrollOutputToEnd("firmwareStatus");
  }
  console.info(`[startup] ${line}`);
}
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function currentSerialProvisioning() {
  return {
    serial_port: $("portSelect").value || $("serialPortSelect").value || "",
    serial_baud: 115200
  };
}

function wifiTransportProvisioning() {
  const state = $("deviceConnectionState")?.dataset?.state || "";
  if (state === "online") {
    return { serial_port: "", serial_baud: Number($("serialBaudSelect").value || 115200) };
  }
  return currentSerialProvisioning();
}

function setButtonsDisabled(ids, disabled) {
  ids.forEach(id => {
    const node = $(id);
    if (node) node.disabled = disabled;
  });
}

function debugEnabled() {
  const forced = new URLSearchParams(window.location.search).get("debug");
  if (forced === "1" || forced === "true") return true;
  return !!appConfig.debug_output;
}

function applyDebugPanels() {
  const enabled = debugEnabled();
  const checkbox = $("debugOutput");
  if (checkbox) checkbox.checked = enabled;
  document.querySelectorAll(".debug-panel").forEach(node => {
    node.classList.toggle("hidden-panel", !enabled);
  });
}

function setInlineStatus(id, message) {
  const node = $(id);
  if (node) node.textContent = message;
}

function setSpinner(id, active) {
  const node = $(id);
  if (node) node.classList.toggle("hidden-spinner", !active);
}

function appStartupTaskStart(message = "") {
  appStartupPendingTasks += 1;
  if (message && $("appLoadingText")) $("appLoadingText").textContent = message;
  $("appLoadingOverlay")?.classList.remove("hidden-panel");
}

function appStartupTaskDone() {
  appStartupPendingTasks = Math.max(0, appStartupPendingTasks - 1);
  if (appStartupPendingTasks === 0) {
    $("appLoadingOverlay")?.classList.add("hidden-panel");
  }
}

function sleep(ms) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || JSON.stringify(json));
  return json;
}

async function saveConfig(partial = {}) {
  appConfig = await api("/api/config", { method: "POST", body: { ...appConfig, ...partial } });
  currentLang = appConfig.language || "en";
  return appConfig;
}

function applyLanguage() {
  document.documentElement.lang = currentLang;
  document.title = serviceToolTitle();
  if ($("appLoadingText")) $("appLoadingText").textContent = text("appLoadingText");
  [
      "subtitle", "langLabel", "debugOutputLabel", "tabBackup", "tabLogging", "tabFirmware", "tabManagement", "tabTestRunner", "tabMigration",
      "includeApiLabel", "backupTitle", "backupRestoreStatusTitle",
      "wifiTitle", "wifiScanLabel", "wifiSsidLabel", "wifiPasswordLabel",
    "restoreTitle", "restoreFileLabel", "flashTitle", "firmwareBackupTitle", "firmwareBackupHint", "webfilesTitle", "webfilesHint", "webfilesLanguageLabel", "firmwareStatusTitle", "managementStatusTitle", "managementDeviceFilesTitle", "managementDeviceFilesTitle2", "managementDeviceFilesTitle3", "managementDeviceFilesTitle4", "managementLocalFilesTitle", "managementLocalFilesTitle2", "managementLocalFilesTitle3", "managementLocalFilesTitle4", "inventoryRootLabel", "managementMashplansTab", "managementFermenterplansTab", "managementProfilesTab", "managementConfigTab", "packageSourceLabel", "packageVersionLabel", "activeFirmwareLabel", "portLabel", "baudLabel", "eraseFlashLabel",
      "littlefsLabel", "flashBackupWarning", "firmwareProgressTitle", "packageLabel", "migrationTitle", "migrationHint",
      "migrationBackupLabel", "serialTitle",
      "serialPortLabel", "serialBaudLabel", "guideTitle", "testRunnerTitle", "testRunnerHint", "testRunnerSuiteLabel", "testRunnerSuiteInfoTitle",
      "testRunnerDeviceKeyLabel", "testRunnerResultTitle", "testRunnerSummarySuiteLabel", "testRunnerSummaryStatusLabel",
      "testRunnerSummaryCountsLabel", "testRunnerSummaryReportLabel", "testRunnerStatusTitle"
    ].forEach(key => {
      const node = $(key);
      if (node) node.textContent = text(
        key
          .replace(/Title[2-4]$/, "Title")
          .replace(/FilesTitle[2-4]$/, "FilesTitle")
          .replace(/Tab$/, "Tab")
      );
    });
  const managementTabLabels = {
    managementTabMashplans: "managementMashplansTab",
    managementTabFermenterplans: "managementFermenterplansTab",
    managementTabProfiles: "managementProfilesTab",
    managementTabConfig: "managementConfigTab"
  };
  Object.entries(managementTabLabels).forEach(([id, key]) => {
    const node = $(id);
    if (node) node.textContent = text(key);
  });
  $("title").textContent = serviceToolTitle();
  $("checkDevice").innerHTML = '<i class="icon-feed button-icon" aria-hidden="true"></i>';
  $("openDeviceUrl").innerHTML = '<i class="icon-exit button-icon" aria-hidden="true"></i>';
  $("checkServiceToolUpdate").innerHTML = '<i class="icon-download button-icon" aria-hidden="true"></i>';
  $("openGuide").textContent = "?";
  $("backupBtn").innerHTML = '<i class="icon-download button-icon" aria-hidden="true"></i>';
  $("backupRenameBtn").innerHTML = '<i class="icon-pencil button-icon" aria-hidden="true"></i>';
  $("backupInfoBtn").innerHTML = '<i class="icon-eye button-icon" aria-hidden="true"></i>';
  $("backupDeleteBtn").innerHTML = '<i class="icon-trash-o button-icon" aria-hidden="true"></i>';
  $("restoreFilePickBtn").innerHTML = '<span class="button-icon" aria-hidden="true">📂</span>';
  $("wifiResetBtn").textContent = text("wifiResetBtn");
  $("wifiScanBtn").innerHTML = text("wifiScanBtn");
  $("wifiSaveBtn").innerHTML = text("wifiSaveBtn");
  $("restoreBtn").innerHTML = '<i class="icon-box-add button-icon" aria-hidden="true"></i>';
  $("refreshPorts").innerHTML = '<i class="icon-refresh button-icon" aria-hidden="true"></i>';
  $("choosePackageDir").innerHTML = '<span class="button-icon" aria-hidden="true">📂</span>';
  if ($("chooseInventoryRoot")) $("chooseInventoryRoot").innerHTML = '<span class="button-icon" aria-hidden="true">📂</span>';
  $("telegrafBinaryPickBtn").innerHTML = '<span class="button-icon" aria-hidden="true">📄</span>';
  $("telegrafBinaryPickBtn").setAttribute("aria-label", text("telegrafBinaryPickBtn"));
  $("telegrafTemplatesPickBtn").innerHTML = '<span class="button-icon" aria-hidden="true">📂</span>';
  $("telegrafTemplatesPickBtn").setAttribute("aria-label", text("telegrafTemplatesPickBtn"));
  $("backupFirmwareBtn").innerHTML = '<i class="icon-download button-icon" aria-hidden="true"></i>';
  Object.keys(MANAGEMENT_KINDS).forEach(kind => {
    $(`${kind}RefreshDevice`).innerHTML = '<i class="icon-refresh button-icon" aria-hidden="true"></i>';
    $(`${kind}RefreshLocal`).innerHTML = '<i class="icon-refresh button-icon" aria-hidden="true"></i>';
    $(`${kind}DeleteDevice`).innerHTML = '<i class="icon-trash-o button-icon" aria-hidden="true"></i>';
    $(`${kind}DeleteLocal`).innerHTML = '<i class="icon-trash-o button-icon" aria-hidden="true"></i>';
    $(`${kind}InfoDevice`).innerHTML = '<i class="icon-eye button-icon" aria-hidden="true"></i>';
    $(`${kind}InfoLocal`).innerHTML = '<i class="icon-eye button-icon" aria-hidden="true"></i>';
    $(`${kind}CopyToLocal`).innerHTML = '<i class="icon-step-forward button-icon" aria-hidden="true"></i>';
    $(`${kind}CopyToDevice`).innerHTML = '<i class="icon-step-backward button-icon" aria-hidden="true"></i>';
    $(`${kind}RenameDevice`).innerHTML = '<i class="icon-pencil button-icon" aria-hidden="true"></i>';
    $(`${kind}RenameLocal`).innerHTML = '<i class="icon-pencil button-icon" aria-hidden="true"></i>';
    if ($(`${kind}LocalUp`)) $(`${kind}LocalUp`).textContent = "..";
    if ($(`${kind}LocalNewFolder`)) {
      $(`${kind}LocalNewFolder`).innerHTML = '<i class="icon-folder-plus button-icon" aria-hidden="true"></i>';
      $(`${kind}LocalNewFolder`).title = text("managementLocalNewFolderBtn");
      $(`${kind}LocalNewFolder`).setAttribute("aria-label", text("managementLocalNewFolderBtn"));
    }
    if ($(`${kind}LocalNewFile`)) {
      $(`${kind}LocalNewFile`).innerHTML = '<i class="icon-file-empty button-icon" aria-hidden="true"></i>';
      $(`${kind}LocalNewFile`).title = text("managementLocalNewFileBtn");
      $(`${kind}LocalNewFile`).setAttribute("aria-label", text("managementLocalNewFileBtn"));
    }
    updateManagementLocalPath(kind);
  });
  $("updateWebfilesBtn").textContent = text("updateWebfilesBtn");
  if ($("checkFirmwareUpdateBtn")) $("checkFirmwareUpdateBtn").textContent = text("checkFirmwareUpdateBtn");
  $("installLanguageBtn").textContent = text("installLanguageBtn");
  $("flashBtn").textContent = text("flashBtn");
  $("migrateBtn").textContent = text("migrateBtn");
  $("migrationHint").textContent = text("migrationHint");
  if ($("migrationRequirementSource")) $("migrationRequirementSource").textContent = text("migrationRequirementSource");
  if ($("migrationRequirementTarget")) $("migrationRequirementTarget").textContent = text("migrationRequirementTarget");
  if ($("migrationRequirementTransport")) $("migrationRequirementTransport").textContent = text("migrationRequirementTransport");
  $("migrationHint").textContent = currentLang === "de"
    ? "Migration von 1.62 auf 1.70 mit verändertem Partitions-Schema. Vor der Migration wird immer ein Konfigurations-Backup erstellt."
    : "Migration from 1.62 to 1.70 with single-app layout. A configuration backup is always created before migration.";
  $("serialStartBtn").innerHTML = text("serialStartBtn");
  $("migrationHint").textContent = text("migrationHint");
  if ($("migrationRequirementSource")) $("migrationRequirementSource").textContent = text("migrationRequirementSource");
  if ($("migrationRequirementTarget")) $("migrationRequirementTarget").textContent = text("migrationRequirementTarget");
  if ($("migrationRequirementTransport")) $("migrationRequirementTransport").textContent = text("migrationRequirementTransport");
  $("serialStopBtn").innerHTML = text("serialStopBtn");
  $("serialClearBtn").innerHTML = text("serialClearBtn");
  $("serialAutoscrollBtn").innerHTML = '<i class="icon-arrow-down2 button-icon" aria-hidden="true"></i>';
  $("serialRebootBtn").innerHTML = '<i class="icon-refresh button-icon" aria-hidden="true"></i>';
  $("serialCopyBtn").innerHTML = '<i class="icon-pencil button-icon" aria-hidden="true"></i>';
  updateSerialAutoscrollButton();
  updateFlashBackupWarning();
  updateActiveProcessState(lastDeviceStatus);
  refreshSortableHeaders();
  [
    "firmwareStatusClearBtn",
    "managementStatusClearBtn",
    "backupRestoreStatusClearBtn",
    "testRunnerStatusClearBtn",
    "migrationStatusClearBtn"
  ].forEach(id => {
    const node = $(id);
    if (node) node.innerHTML = '<i class="icon-trash-o button-icon" aria-hidden="true"></i>';
  });
  [
    "firmwareStatusCopyBtn",
    "managementStatusCopyBtn",
    "backupRestoreStatusCopyBtn",
    "testRunnerStatusCopyBtn",
    "migrationStatusCopyBtn"
  ].forEach(id => {
    const node = $(id);
    if (node) node.innerHTML = '<i class="icon-pencil button-icon" aria-hidden="true"></i>';
  });
  if ($("testRunnerStartBtn")) $("testRunnerStartBtn").textContent = text("testRunnerStartBtn");
  if ($("testRunnerStopBtn")) $("testRunnerStopBtn").textContent = text("testRunnerStopBtn");
  if ($("serviceToolUpdateTitle")) $("serviceToolUpdateTitle").textContent = text("serviceToolUpdateTitle");
  if ($("downloadServiceToolUpdate")) $("downloadServiceToolUpdate").textContent = text("serviceToolUpdateDownloadBtn");
  if ($("cancelServiceToolUpdate")) $("cancelServiceToolUpdate").textContent = text("serviceToolUpdateCloseBtn");
  if ($("firmwareUpdateTitle")) $("firmwareUpdateTitle").textContent = text("firmwareUpdateTitle");
  if ($("startFirmwareWebUpdate")) $("startFirmwareWebUpdate").textContent = text("firmwareUpdateStartBtn");
  if ($("cancelFirmwareUpdate")) $("cancelFirmwareUpdate").textContent = text("firmwareUpdateCloseBtn");
  applyButtonTooltips();
  updateDeviceConnectionState($("deviceConnectionState").dataset.state || "offline");
  renderGuide();
  renderTestRunnerSuiteInfo($("testRunnerSuite")?.value || "");
  refreshTelegrafBinaryPath();
}

function buttonTooltip(key) {
  const value = text(key) || "";
  return String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

function applyButtonTooltips() {
  const mappings = {
    checkDevice: "checkDevice",
    openDeviceUrl: "openDeviceUrl",
    checkServiceToolUpdate: "checkServiceToolUpdate",
    openGuide: "guideTitle",
    backupBtn: "backupBtnTooltip",
    backupRenameBtn: "backupRenameBtn",
    backupInfoBtn: "backupInfoBtn",
    backupDeleteBtn: "backupDeleteBtn",
    restoreFilePickBtn: "restoreFilePickBtn",
    wifiResetBtn: "wifiResetTooltip",
    wifiScanBtn: "wifiScanTooltip",
    wifiSaveBtn: "wifiSaveTooltip",
    restoreBtn: "restoreBtn",
    choosePackageDir: "choosePackageDir",
    chooseInventoryRoot: "chooseInventoryRoot",
    telegrafBinaryPickBtn: "telegrafBinaryPickBtn",
    telegrafTemplatesPickBtn: "telegrafTemplatesPickBtn",
    refreshPorts: "refreshPorts",
    backupFirmwareBtn: "backupFirmwareBtn",
    checkFirmwareUpdateBtn: "checkFirmwareUpdateBtn",
    mashplansRefreshDevice: "managementRefreshBtn",
    mashplansRefreshLocal: "managementRefreshBtn",
    mashplansDeleteDevice: "managementDeleteDeviceBtn",
    mashplansDeleteLocal: "managementDeleteLocalBtn",
    mashplansInfoDevice: "managementInfoDeviceBtn",
    mashplansInfoLocal: "managementInfoLocalBtn",
    mashplansCopyToLocal: "managementCopyToLocalBtn",
    mashplansCopyToDevice: "managementCopyToDeviceBtn",
    mashplansRenameDevice: "managementRenameDeviceBtn",
    mashplansRenameLocal: "managementRenameLocalBtn",
    mashplansLocalUp: "managementLocalUpBtn",
    mashplansLocalNewFolder: "managementLocalNewFolderBtn",
    mashplansLocalNewFile: "managementLocalNewFileBtn",
    fermenterplansRefreshDevice: "managementRefreshBtn",
    fermenterplansRefreshLocal: "managementRefreshBtn",
    fermenterplansDeleteDevice: "managementDeleteDeviceBtn",
    fermenterplansDeleteLocal: "managementDeleteLocalBtn",
    fermenterplansInfoDevice: "managementInfoDeviceBtn",
    fermenterplansInfoLocal: "managementInfoLocalBtn",
    fermenterplansCopyToLocal: "managementCopyToLocalBtn",
    fermenterplansCopyToDevice: "managementCopyToDeviceBtn",
    fermenterplansRenameDevice: "managementRenameDeviceBtn",
    fermenterplansRenameLocal: "managementRenameLocalBtn",
    fermenterplansLocalUp: "managementLocalUpBtn",
    fermenterplansLocalNewFolder: "managementLocalNewFolderBtn",
    fermenterplansLocalNewFile: "managementLocalNewFileBtn",
    profilesRefreshDevice: "managementRefreshBtn",
    profilesRefreshLocal: "managementRefreshBtn",
    profilesDeleteDevice: "managementDeleteDeviceBtn",
    profilesDeleteLocal: "managementDeleteLocalBtn",
    profilesInfoDevice: "managementInfoDeviceBtn",
    profilesInfoLocal: "managementInfoLocalBtn",
    profilesCopyToLocal: "managementCopyToLocalBtn",
    profilesCopyToDevice: "managementCopyToDeviceBtn",
    profilesRenameDevice: "managementRenameDeviceBtn",
    profilesRenameLocal: "managementRenameLocalBtn",
    profilesLocalUp: "managementLocalUpBtn",
    profilesLocalNewFolder: "managementLocalNewFolderBtn",
    profilesLocalNewFile: "managementLocalNewFileBtn",
    configRefreshDevice: "managementRefreshBtn",
    configRefreshLocal: "managementRefreshBtn",
    configDeleteDevice: "managementDeleteDeviceBtn",
    configDeleteLocal: "managementDeleteLocalBtn",
    configInfoDevice: "managementInfoDeviceBtn",
    configInfoLocal: "managementInfoLocalBtn",
    configCopyToLocal: "managementCopyToLocalBtn",
    configCopyToDevice: "managementCopyToDeviceBtn",
    configRenameDevice: "managementRenameDeviceBtn",
    configRenameLocal: "managementRenameLocalBtn",
    configLocalUp: "managementLocalUpBtn",
    configLocalNewFolder: "managementLocalNewFolderBtn",
    configLocalNewFile: "managementLocalNewFileBtn",
    serialStartBtn: "serialStartTooltip",
    serialStopBtn: "serialStopTooltip",
    serialClearBtn: "serialClearTooltip",
    serialAutoscrollBtn: "serialAutoscrollTooltip",
    serialRebootBtn: "serialRebootBtn",
    serialCopyBtn: "serialCopyBtn",
    firmwareStatusClearBtn: "statusClearBtn",
    managementStatusClearBtn: "statusClearBtn",
    backupRestoreStatusClearBtn: "statusClearBtn",
    testRunnerStatusClearBtn: "statusClearBtn",
    migrationStatusClearBtn: "statusClearBtn",
    firmwareStatusCopyBtn: "statusCopyBtn",
    managementStatusCopyBtn: "statusCopyBtn",
    backupRestoreStatusCopyBtn: "statusCopyBtn",
    testRunnerStatusCopyBtn: "statusCopyBtn",
    migrationStatusCopyBtn: "statusCopyBtn",
    testRunnerStartBtn: "testRunnerStartTooltip",
    testRunnerStopBtn: "testRunnerStopTooltip"
  };
  Object.entries(mappings).forEach(([id, key]) => {
    const node = $(id);
    if (node) node.title = buttonTooltip(key);
  });
}

function renderGuide() {
  const content = $("guideContent");
  if (!content) return;
  const sections = [
    ["guideConnectionTitle", "guideConnectionText"],
    ["guideFirmwareTitle", "guideFirmwareText"],
    ["guideWifiTitle", "guideWifiText"],
    ["guideBackupTitle", "guideBackupText"],
    ["guideManagementTitle", "guideManagementText"],
    ["guideSerialTitle", "guideSerialText"],
    ["guideUpdateTitle", "guideUpdateText"]
  ];
  content.innerHTML = sections.map(([titleKey, textKey]) => `
    <section class="guide-section">
      <h3>${text(titleKey)}</h3>
      <p>${text(textKey)}</p>
    </section>
  `).join("");
}

function closeServiceToolUpdateModal() {
  $("serviceToolUpdateModal")?.classList.add("hidden-panel");
  setInlineStatus("serviceToolUpdateStatus", "");
}

function renderServiceToolUpdate(data, explicit = false) {
  serviceToolUpdateState = data || null;
  const modal = $("serviceToolUpdateModal");
  const content = $("serviceToolUpdateContent");
  const downloadBtn = $("downloadServiceToolUpdate");
  if (!modal || !content || !downloadBtn) return;
  const available = data?.available === true;
  const installSupported = data?.install_supported === true;
  downloadBtn.classList.toggle("hidden-panel", !available);
  downloadBtn.disabled = !available;
  downloadBtn.textContent = installSupported ? text("serviceToolUpdateDownloadBtn") : text("serviceToolUpdateManualDownloadBtn");
  const rows = [
    [text("serviceToolUpdateCurrent"), data?.current_version || appConfig.service_tool_version || "-"],
    [text("serviceToolUpdateAvailable"), data?.version || "-"],
    [text("serviceToolUpdateReleased"), data?.released_at || "-"]
  ];
  const message = available ? text("serviceToolUpdateReady") : text("serviceToolUpdateNoUpdate");
  const notes = String(data?.notes || "").trim();
  content.innerHTML = `
    <p class="${available ? "service-update-ready" : "muted"}">${escapeHtml(message)}</p>
    <table class="detail-table">
      <tbody>
        ${rows.map(([key, value]) => `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}
      </tbody>
    </table>
    ${notes ? `<section class="detail-section"><h3>${escapeHtml(text("serviceToolUpdateNotes"))}</h3><p>${escapeHtml(notes)}</p></section>` : ""}
  `;
  if (available || explicit) {
    modal.classList.remove("hidden-panel");
  }
}

async function checkServiceToolUpdate(explicit = false) {
  try {
    const data = await api("/api/servicetool/update/check");
    renderServiceToolUpdate(data, explicit);
  } catch (err) {
    if (explicit) {
      serviceToolUpdateState = null;
      const modal = $("serviceToolUpdateModal");
      const content = $("serviceToolUpdateContent");
      if (content) content.innerHTML = `<p class="status-line">Error: ${escapeHtml(String(err))}</p>`;
      $("downloadServiceToolUpdate")?.classList.add("hidden-panel");
      modal?.classList.remove("hidden-panel");
    }
  }
}

async function downloadServiceToolUpdate() {
  const button = $("downloadServiceToolUpdate");
  if (serviceToolUpdateState?.install_supported && !window.confirm(currentLang === "de"
    ? "Das ServiceTool wird beendet, aktualisiert und neu gestartet. Jetzt fortfahren?"
    : "ServiceTool will close, install the update, and restart. Continue?")) {
    return;
  }
  button.disabled = true;
  setInlineStatus("serviceToolUpdateStatus", text("serviceToolUpdateDownloading"));
  try {
    const data = await api("/api/servicetool/update/download", { method: "POST", body: {} });
    serviceToolUpdateState = data;
    setInlineStatus("serviceToolUpdateStatus", data.install_started
      ? text("serviceToolUpdateDownloaded")
      : text("serviceToolUpdateManualDownloaded"));
  } catch (err) {
    setInlineStatus("serviceToolUpdateStatus", `Error: ${String(err)}`);
    button.disabled = false;
  }
}

function closeFirmwareUpdateModal() {
  $("firmwareUpdateModal")?.classList.add("hidden-panel");
  setInlineStatus("firmwareUpdateStatus", "");
}

function renderFirmwareUpdate(data, explicit = false) {
  firmwareUpdateState = data || null;
  const modal = $("firmwareUpdateModal");
  const content = $("firmwareUpdateContent");
  const startBtn = $("startFirmwareWebUpdate");
  if (!modal || !content || !startBtn) return;
  const available = data?.available === true;
  const activeProcess = data?.device?.active_process?.state === "active";
  startBtn.classList.toggle("hidden-panel", !available);
  startBtn.disabled = !available || activeProcess;
  const rows = [
    [text("firmwareUpdateCurrent"), data?.current_version || "-"],
    [text("firmwareUpdateAvailable"), data?.version || "-"],
    [text("firmwareUpdateType"), data?.type || data?.ref || "-"],
    [text("firmwareUpdateReleased"), data?.release_date || "-"]
  ];
  const message = activeProcess
    ? text("firmwareUpdateBlockedActive")
    : (available ? text("firmwareUpdateReady") : text("firmwareUpdateNoUpdate"));
  const notes = String(data?.notes || "").trim();
  content.innerHTML = `
    <p class="${available && !activeProcess ? "service-update-ready" : "muted"}">${escapeHtml(message)}</p>
    <table class="detail-table">
      <tbody>
        ${rows.map(([key, value]) => `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}
      </tbody>
    </table>
    ${notes ? `<section class="detail-section"><h3>${escapeHtml(text("firmwareUpdateNotes"))}</h3><p>${escapeHtml(notes)}</p></section>` : ""}
  `;
  if ((available && !activeProcess) || explicit) {
    modal.classList.remove("hidden-panel");
  }
}

async function checkFirmwareUpdate(explicit = false) {
  if (!deviceIsOnline()) {
    if (explicit) {
      appendStatus("firmwareStatus", text("firmwareUpdateTitle"), currentLang === "de" ? "Firmware Update benötigt Status Online." : "Firmware update requires Online status.");
    }
    return null;
  }
  try {
    const data = await api("/api/firmware/update/check", {
      method: "POST",
      body: { base_url: effectiveDeviceBaseUrl() }
    });
    const promptKey = `${data?.current_version || "-"}>${data?.version || "-"}:${data?.ref || "-"}`;
    const shouldShow = explicit || (data?.available === true && promptKey !== lastFirmwareUpdatePromptKey);
    if (shouldShow) {
      lastFirmwareUpdatePromptKey = promptKey;
      renderFirmwareUpdate(data, explicit);
    } else {
      firmwareUpdateState = data;
    }
    return data;
  } catch (err) {
    if (explicit) {
      firmwareUpdateState = null;
      const modal = $("firmwareUpdateModal");
      const content = $("firmwareUpdateContent");
      if (content) content.innerHTML = `<p class="status-line">Error: ${escapeHtml(String(err))}</p>`;
      $("startFirmwareWebUpdate")?.classList.add("hidden-panel");
      modal?.classList.remove("hidden-panel");
    }
    return null;
  }
}

async function startFirmwareWebUpdate() {
  const button = $("startFirmwareWebUpdate");
  button.disabled = true;
  setInlineStatus("firmwareUpdateStatus", text("firmwareUpdateStarting"));
  try {
    const data = await api("/api/firmware/update/start", {
      method: "POST",
      body: { base_url: effectiveDeviceBaseUrl(), include_api: true }
    });
    setInlineStatus("firmwareUpdateStatus", text("firmwareUpdateStarted"));
    closeFirmwareUpdateModal();
    setStatus("firmwareStatus", "");
    appendStatus("firmwareStatus", text("firmwareUpdateTitle"), { job_started: data.job_id, status: "running" });
    watchJobToTarget(data.job_id, "firmwareStatus", text("firmwareUpdateTitle"), "flashInlineStatus")
      .then(() => {
        loadBackups().catch(console.error);
        scheduleDeviceCheckUntilOnline(4000, 24, 5000);
      })
      .catch(console.error);
  } catch (err) {
    setInlineStatus("firmwareUpdateStatus", `Error: ${String(err)}`);
    button.disabled = false;
  }
}

async function loadOverview() {
  const info = await api("/api/info");
  if (info.config && typeof info.config === "object") {
    appConfig = { ...appConfig, ...info.config };
  }
  currentLang = appConfig.language || "en";
  $("language").value = currentLang;
  $("debugOutput").checked = !!appConfig.debug_output;
  $("deviceUrl").value = appConfig.device_url || "http://brautomat.local";
  $("packageSource").value = appConfig.package_source || "release";
  $("packageVersion").value = appConfig.package_ref || "";
  $("packageDir").value = $("packageSource").value === "open"
    ? openPackageDirValue()
    : (appConfig.package_dir || "");
  $("baudSelect").value = String(appConfig.baud_rate || 921600);
  $("serialBaudSelect").value = String(appConfig.serial_baud_rate || 115200);
  updateInventoryRootPath();
  syncFirmwareActions();
  renderSerial(info.serial || { lines: [] });
  applyTelegrafConfig(appConfig.telegraf || {});
  renderTelegraf(info.telegraf || { lines: [] });
}

async function loadPackages() {
  const data = await api("/api/packages", { method: "POST", body: {} });
  const source = $("packageSource").value;
  const packages = Object.fromEntries((data.packages || []).map(item => [item.key, item]));
  const versionSelect = $("packageVersion");
  const versionGroup = $("packageVersionGroup");
  const specialVersions = data.special_versions || [];
  versionSelect.innerHTML = "";
  specialVersions.forEach(item => {
    const option = document.createElement("option");
    option.value = item.ref;
    option.textContent = item.label;
    option.dataset.baseUrl = item.base_url || "";
    versionSelect.appendChild(option);
  });

  if (source === "special") {
    versionGroup.classList.remove("hidden-panel");
    const selectedRef = appConfig.package_ref && specialVersions.some(item => item.ref === appConfig.package_ref)
      ? appConfig.package_ref
      : (specialVersions[0]?.ref || "");
    versionSelect.value = selectedRef;
    appConfig.package_ref = selectedRef;
    const selectedVersion = specialVersions.find(item => item.ref === selectedRef);
    $("packageDir").value = selectedVersion ? selectedVersion.base_url : "";
    appConfig.package_dir = $("packageDir").value;
    syncFirmwareActions();
    return;
  }

  versionGroup.classList.add("hidden-panel");
  if (source === "release" || source === "development") {
    const selected = packages[source];
    $("packageDir").value = selected ? selected.path : "";
    appConfig.package_dir = $("packageDir").value;
  }
  syncFirmwareActions();
}

async function loadRepoLanguages() {
  const source = $("packageSource").value;
  const select = $("webfilesLanguage");
  const installBtn = $("installLanguageBtn");
  select.innerHTML = "";

  if (source === "open") {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Not available for Open directory";
    select.appendChild(option);
    select.disabled = true;
    installBtn.disabled = true;
    return;
  }

  const data = await api(`/api/languages/repo?source=${encodeURIComponent(source)}&ref=${encodeURIComponent(appConfig.package_ref || "")}`);
  const languages = Array.isArray(data.languages) ? data.languages : [];
  if (!languages.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No language files found";
    select.appendChild(option);
    select.disabled = true;
    installBtn.disabled = true;
    return;
  }

  const normalizedLanguages = languages
    .filter(item => item && typeof item === "object")
    .map(item => ({
      ...item,
      filename: String(item.filename || "").trim(),
      language: String(item.language || "").trim(),
      path: String(item.path || "").trim()
    }))
    .filter(item => item.filename && item.language);
  const languageKey = item => {
    const filename = String(item?.filename || "").trim().toLowerCase();
    const path = String(item?.path || "").trim().toLowerCase();
    const language = String(item?.language || "").trim().toLowerCase();
    if ([filename, path, language].some(value => value.includes("deutsch"))) return "deutsch";
    if ([filename, path, language].some(value => value.includes("english"))) return "english";
    return filename || path || language;
  };
  const byLanguageKey = new Map();
  normalizedLanguages.forEach(item => {
    const key = languageKey(item);
    if (key && !byLanguageKey.has(key)) {
      byLanguageKey.set(key, item);
    }
  });
  const primaryLanguageKey = currentLang === "de" ? "deutsch" : "english";
  const secondaryLanguageKey = currentLang === "de" ? "english" : "deutsch";
  const prioritized = [];
  const seen = new Set();

  [primaryLanguageKey, secondaryLanguageKey].forEach(key => {
    const item = byLanguageKey.get(key);
    if (item && !seen.has(languageKey(item))) {
      prioritized.push(item);
      seen.add(languageKey(item));
    }
  });

  const remaining = normalizedLanguages
    .filter(item => !seen.has(languageKey(item)))
    .sort((a, b) => a.language.localeCompare(b.language, currentLang === "de" ? "de" : "en", { sensitivity: "base" }));

  const ordered = [...prioritized, ...remaining];

  ordered.forEach((item, index) => {
    if (index === prioritized.length && remaining.length && prioritized.length) {
      const separator = document.createElement("option");
      separator.value = "";
      separator.textContent = "──────────";
      separator.textContent = "----------";
      separator.disabled = true;
      select.appendChild(separator);
    }
    const option = document.createElement("option");
    option.value = item.filename;
    option.textContent = item.language;
    select.appendChild(option);
  });
  if (prioritized.length) {
    select.value = prioritized[0].filename;
  } else if (ordered.length) {
    select.value = ordered[0].filename;
  }
  select.disabled = false;
  installBtn.disabled = false;
}

function formatTestRunnerCounts(counts = {}) {
  const entries = [
    ["total", counts.total],
    ["pass", counts.pass],
    ["warn", counts.warn],
    ["fail", counts.fail],
    ["skip", counts.skip]
  ].filter(([, value]) => typeof value === "number");
  if (!entries.length) return "-";
  return entries.map(([key, value]) => `${key.toUpperCase()}=${value}`).join(", ");
}

function formatTestRunnerReportLabel(value) {
  const raw = String(value || "").trim();
  if (!raw) return { text: "-", title: "" };
  try {
    const url = new URL(raw);
    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1] || raw;
    return { text: last, title: raw };
  } catch {
    const normalized = raw.replace(/\\/g, "/");
    const parts = normalized.split("/").filter(Boolean);
    const last = parts[parts.length - 1] || raw;
    return { text: last, title: raw };
  }
}

function extractTestRunnerCurrentStep(snapshot = {}) {
  const lines = Array.isArray(snapshot.lines) ? snapshot.lines : [];
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = String(lines[index] || "").trim();
    const match = line.match(/\[[^\]]+\]\s+\[[^\]]+\]\s+start\s+\d+\/\d+\s+id=.*?\s+mode=.*?\s+title=(.+)$/);
    if (match) return match[1].trim();
  }
  if (snapshot.running) {
    const suiteLabel = String(snapshot.suite_label || "").trim();
    return suiteLabel ? `${suiteLabel}...` : "-";
  }
  return "-";
}

function renderTestRunnerSuiteInfo(suiteId) {
  const body = $("testRunnerSuiteInfoBody");
  if (!body) return;
  const suites = Array.isArray(testRunnerCatalog?.suites) ? testRunnerCatalog.suites : [];
  const suite = suites.find(item => item.id === suiteId) || null;
  if (!suite) {
    body.textContent = currentLang === "de"
      ? "Diese Suite ist nicht beschrieben."
      : "No description is available for this suite.";
    return;
  }
  const title = String(suite.info_title || suite.label || suite.id || "").trim();
  const description = String(suite.info_description || "").trim();
  const groups = Array.isArray(suite.groups) && suite.groups.length ? ` (${suite.groups.join(", ")})` : "";
  body.textContent = description ? `${title}${groups}: ${description}` : `${title}${groups}`;
}

function deriveTestRunnerCountsFromLines(lines = []) {
  const derived = { pass: 0, fail: 0, warn: 0 };
  if (!Array.isArray(lines) || !lines.length) return derived;
  lines.forEach((rawLine) => {
    const line = String(rawLine || "").trim();
    const match = line.match(/\bdone\s+\d+\/\d+\s+status=(PASS|FAIL|WARN)\b/i);
    if (!match) return;
    const key = match[1].toLowerCase();
    if (Object.prototype.hasOwnProperty.call(derived, key)) {
      derived[key] += 1;
    }
  });
  return derived;
}

function renderTestRunnerLiveCounts(snapshot = {}) {
  const shell = $("testRunnerLiveCounts");
  const passBadge = $("testRunnerPassBadge");
  const failBadge = $("testRunnerFailBadge");
  const warnBadge = $("testRunnerWarnBadge");
  if (!shell || !passBadge || !failBadge || !warnBadge) return;
  const running = !!snapshot.running;
  shell.classList.toggle("hidden-panel", !running);
  if (!running) return;
  const counts = snapshot.counts && typeof snapshot.counts === "object" ? snapshot.counts : {};
  const derived = deriveTestRunnerCountsFromLines(snapshot.lines || []);
  const pass = Number.isFinite(counts.pass) && counts.pass > 0 ? counts.pass : derived.pass;
  const fail = Number.isFinite(counts.fail) && counts.fail > 0 ? counts.fail : derived.fail;
  const warn = Number.isFinite(counts.warn) && counts.warn > 0 ? counts.warn : derived.warn;
  passBadge.textContent = `PASS ${pass}`;
  failBadge.textContent = `FAIL ${fail}`;
  warnBadge.textContent = `WARN ${warn}`;
}

function renderTestRunnerSummary(snapshot = {}) {
  if ($("testRunnerSummarySuite")) $("testRunnerSummarySuite").textContent = snapshot.suite_label || "-";
  if ($("testRunnerSummaryStatus")) $("testRunnerSummaryStatus").textContent = snapshot.status || "-";
  if ($("testRunnerSummaryCounts")) $("testRunnerSummaryCounts").textContent = extractTestRunnerCurrentStep(snapshot);
  if ($("testRunnerSummaryReport")) {
    const report = formatTestRunnerReportLabel(snapshot.report_path || snapshot.url || "");
    $("testRunnerSummaryReport").textContent = report.text;
    $("testRunnerSummaryReport").title = report.title;
  }
  renderTestRunnerLiveCounts(snapshot);
}

function renderTestRunnerLog(lines = [], fallback = "", resultSummary = "") {
  const node = $("testRunnerLog");
  if (!node) return;
  const contentParts = [];
  if (Array.isArray(lines) && lines.length) {
    contentParts.push(lines.join("\n"));
  } else if (fallback) {
    contentParts.push(fallback);
  }
  const summary = String(resultSummary || "").trim();
  if (summary) {
    contentParts.push(summary);
  }
  const content = contentParts.filter(Boolean).join("\n\n");
  node.textContent = content;
  scrollOutputToEnd("testRunnerLog");
}

function setTestRunnerControlsEnabled(enabled) {
  ["testRunnerSuite", "testRunnerDeviceKey", "testRunnerStartBtn", "testRunnerStopBtn"].forEach(id => {
    const node = $(id);
    if (node) node.disabled = !enabled;
  });
}

async function loadPublicTestResults() {
  try {
    const data = await api("/api/test-runner/public-results");
    renderTestRunnerSummary({ status: "public", report_path: data.url || "", suite_label: "-", lines: [] });
    renderTestRunnerLog([], data.content || "");
    setInlineStatus("testRunnerInlineStatus", text("testRunnerUnavailable"));
    setStatus("testRunnerStatus", JSON.stringify({ mode: "public-results", url: data.url || "" }, null, 2));
  } catch (err) {
    setInlineStatus("testRunnerInlineStatus", `Error: ${String(err)}`);
    setStatus("testRunnerStatus", JSON.stringify({ error: String(err) }, null, 2));
  }
}

async function loadTestRunnerCatalog() {
  if (hideTestRunnerViaQuery()) return;
  const data = await api("/api/test-runner/catalog");
  testRunnerCatalog = data;
  if (!data.enabled) {
    $("tabTestRunner")?.classList.add("hidden-panel");
    $("testRunnerPanel")?.classList.add("hidden-panel");
    return;
  }

  $("tabTestRunner")?.classList.remove("hidden-panel");
  $("testRunnerPanel")?.classList.remove("hidden-panel");
  setInlineStatus("testRunnerInlineStatus", text("testRunnerLoading"));
  const select = $("testRunnerSuite");
  if (select) {
    select.innerHTML = "";
    (data.suites || []).forEach(item => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = `${item.label} (${item.item_count})`;
      select.appendChild(option);
    });
    const preferredSuiteId = ["complete-suite", "runner-plain-core", "diagnostic", "browser-smoke-suite"]
      .find(id => (data.suites || []).some(item => item.id === id));
    if (preferredSuiteId) {
      select.value = preferredSuiteId;
    }
    renderTestRunnerSuiteInfo(select.value);
  }
  setStatus("testRunnerStatus", JSON.stringify(data, null, 2));
  appendTimestampedStatus("testRunnerStatus", `catalog loaded: enabled=${!!data.enabled} suites=${Array.isArray(data.suites) ? data.suites.length : 0}`);
  setTestRunnerControlsEnabled(true);
  setInlineStatus("testRunnerInlineStatus", "");
  await loadTestRunnerStatus();
}

async function loadTestRunnerStatus() {
  if (!testRunnerCatalog?.enabled) return;
  const data = await api("/api/test-runner/status");
  setStatus("testRunnerStatus", JSON.stringify(data, null, 2));
  appendTimestampedStatus("testRunnerStatus", `status poll: status=${data.status || "-"} running=${!!data.running} suite=${data.suite_id || "-"}`);
  renderTestRunnerSummary(data);
  renderTestRunnerLog(data.lines || [], "", data.running ? "" : (data.result_summary || ""));
  const running = !!data.running;
  setSpinner("testRunnerSpinner", running);
  if (running) {
    if (data.status === "stopping") {
      setInlineStatus("testRunnerInlineStatus", text("testRunnerStopping"));
    } else if (data.status === "restoring") {
      setInlineStatus("testRunnerInlineStatus", text("testRunnerRestoring"));
    } else {
      setInlineStatus("testRunnerInlineStatus", text("testRunnerRunning"));
    }
  } else if (data.status === "done") {
    setInlineStatus("testRunnerInlineStatus", data.summary || "Done.");
  } else if (data.status === "failed") {
    setInlineStatus("testRunnerInlineStatus", data.error || data.summary || "Failed.");
  } else if (data.status === "stopped") {
    setInlineStatus("testRunnerInlineStatus", text("testRunnerStopped"));
  } else if (!data.lines?.length) {
    setInlineStatus("testRunnerInlineStatus", "");
  }
  if (running) {
    clearTimeout(testRunnerPollTimer);
    testRunnerPollTimer = setTimeout(() => loadTestRunnerStatus().catch(console.error), 1000);
  }
}

async function startTestRunner() {
  if (!testRunnerCatalog?.enabled) {
    await loadPublicTestResults();
    return;
  }
  if (!requireTestRunnerReady()) {
    return;
  }
  const suiteId = $("testRunnerSuite").value;
  if (!suiteId) {
    setInlineStatus("testRunnerInlineStatus", currentLang === "de" ? "Keine Testsuite ausgewählt." : "No test suite selected.");
    return;
  }
  appendTimestampedStatus("testRunnerStatus", `start requested: suite=${suiteId} deviceKey=${$("testRunnerDeviceKey").value.trim() || "brautomat-testdevice"}`);
  setInlineStatus("testRunnerInlineStatus", text("testRunnerRunning"));
  setSpinner("testRunnerSpinner", true);
  try {
    const snapshot = await api("/api/test-runner/start", {
      method: "POST",
      body: {
        suite_id: suiteId,
        base_url: $("deviceUrl").value.trim() || "http://brautomat.local",
        device_key: $("testRunnerDeviceKey").value.trim() || "brautomat-testdevice"
      }
    });
    setStatus("testRunnerStatus", JSON.stringify(snapshot, null, 2));
    appendTimestampedStatus("testRunnerStatus", `start accepted: status=${snapshot.status || "-"} running=${!!snapshot.running}`);
    renderTestRunnerSummary(snapshot);
    renderTestRunnerLog(snapshot.lines || [], "", snapshot.running ? "" : (snapshot.result_summary || ""));
    await loadTestRunnerStatus();
  } catch (err) {
    appendTimestampedStatus("testRunnerStatus", `start failed: ${String(err)}`);
    setSpinner("testRunnerSpinner", false);
    setInlineStatus("testRunnerInlineStatus", `Error: ${String(err)}`);
  }
}

async function stopTestRunner() {
  if (!testRunnerCatalog?.enabled) return;
  try {
    appendTimestampedStatus("testRunnerStatus", "stop requested");
    clearTimeout(testRunnerPollTimer);
    testRunnerPollTimer = null;
    setInlineStatus("testRunnerInlineStatus", text("testRunnerStopping"));
    const snapshot = await api("/api/test-runner/stop", { method: "POST", body: {} });
    setStatus("testRunnerStatus", JSON.stringify(snapshot, null, 2));
    appendTimestampedStatus("testRunnerStatus", `stop accepted: status=${snapshot.status || "-"} running=${!!snapshot.running}`);
    renderTestRunnerSummary(snapshot);
    renderTestRunnerLog(snapshot.lines || [], "", snapshot.running ? "" : (snapshot.result_summary || ""));
    await loadTestRunnerStatus();
  } catch (err) {
    appendTimestampedStatus("testRunnerStatus", `stop failed: ${String(err)}`);
    setInlineStatus("testRunnerInlineStatus", `Error: ${String(err)}`);
  }
}

function currentManagementKind() {
  return document.querySelector(".subtab.active")?.dataset?.managementTab || "mashplans";
}

function backupColumnLabel(sortKey) {
  const labels = {
    name: currentLang === "de" ? "Datei" : "File",
    version: "Version",
    mtime: currentLang === "de" ? "Datum" : "Date",
    size: currentLang === "de" ? "Größe" : "Size"
  };
  return labels[sortKey] || sortKey;
}

function managementColumnLabel(sortKey) {
  const labels = {
    name: currentLang === "de" ? "Datei" : "File",
    mtime: currentLang === "de" ? "Datum" : "Date",
    size: currentLang === "de" ? "Größe" : "Size"
  };
  return labels[sortKey] || sortKey;
}

function managementListId(kind, side) {
  return `${kind}${side === "device" ? "DeviceList" : "LocalList"}`;
}

function managementSortFor(listId) {
  if (!managementSortState[listId]) {
    managementSortState[listId] = { ...MANAGEMENT_SORT_DEFAULT };
  }
  return managementSortState[listId];
}

function managementSortIndicator(sortKey, state) {
  if (state.key !== sortKey) return "";
  return state.direction === "asc" ? "▲" : "▼";
}

function updateBackupSortHeader() {
  const table = $("backupList")?.closest("table");
  if (!table) return;
  table.querySelectorAll("thead th").forEach((th, index) => {
    const sortKey = BACKUP_SORT_COLUMNS[index];
    const button = th.querySelector(".table-sort");
    if (!button || !sortKey) return;
    const active = backupSortState.key === sortKey;
    button.classList.toggle("active", active);
    button.dataset.direction = active ? backupSortState.direction : "";
    button.setAttribute("aria-sort", active ? (backupSortState.direction === "asc" ? "ascending" : "descending") : "none");
    const label = button.querySelector(".table-sort-label");
    const icon = button.querySelector(".sort-indicator");
    if (label) label.textContent = backupColumnLabel(sortKey);
    if (icon) icon.textContent = managementSortIndicator(sortKey, backupSortState);
  });
}

function updateManagementSortHeader(table) {
  const listId = table.tBodies[0]?.id;
  if (!listId) return;
  const state = managementSortFor(listId);
  table.querySelectorAll("thead th").forEach((th, index) => {
    const sortKey = MANAGEMENT_SORT_COLUMNS[index];
    const button = th.querySelector(".table-sort");
    if (!button || !sortKey) return;
    const active = state.key === sortKey;
    button.classList.toggle("active", active);
    button.dataset.direction = active ? state.direction : "";
    button.setAttribute("aria-sort", active ? (state.direction === "asc" ? "ascending" : "descending") : "none");
    const label = button.querySelector(".table-sort-label");
    const icon = button.querySelector(".sort-indicator");
    if (label) label.textContent = managementColumnLabel(sortKey);
    if (icon) icon.textContent = managementSortIndicator(sortKey, state);
  });
}

function refreshManagementSortHeaders() {
  document.querySelectorAll(".management-subpanel .file-table").forEach(updateManagementSortHeader);
}

function refreshSortableHeaders() {
  refreshManagementSortHeaders();
  updateBackupSortHeader();
}

function initializeManagementSortHeaders() {
  document.querySelectorAll(".management-subpanel .file-table").forEach(table => {
    const listId = table.tBodies[0]?.id;
    if (!listId) return;
    managementSortFor(listId);
    table.querySelectorAll("thead th").forEach((th, index) => {
      const sortKey = MANAGEMENT_SORT_COLUMNS[index];
      if (!sortKey || th.querySelector(".table-sort")) return;
      th.textContent = "";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "table-sort";
      button.dataset.listId = listId;
      button.dataset.sortKey = sortKey;
      button.innerHTML = '<span class="table-sort-label"></span><span class="sort-indicator" aria-hidden="true"></span>';
      button.addEventListener("click", () => {
        const current = managementSortFor(listId);
        const direction = current.key === sortKey && current.direction === "asc" ? "desc" : "asc";
        managementSortState[listId] = { key: sortKey, direction };
        renderInventoryList(listId, managementListCache[listId] || [], managementEmptyState[listId] ?? null);
      });
      th.appendChild(button);
    });
    updateManagementSortHeader(table);
  });
}

function initializeBackupSortHeader() {
  const table = $("backupList")?.closest("table");
  if (!table) return;
  table.querySelectorAll("thead th").forEach((th, index) => {
    const sortKey = BACKUP_SORT_COLUMNS[index];
    if (!sortKey || th.querySelector(".table-sort")) return;
    th.textContent = "";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "table-sort";
    button.dataset.sortKey = sortKey;
    button.innerHTML = '<span class="table-sort-label"></span><span class="sort-indicator" aria-hidden="true"></span>';
    button.addEventListener("click", () => {
      backupSortState = {
        key: sortKey,
        direction: backupSortState.key === sortKey && backupSortState.direction === "asc" ? "desc" : "asc"
      };
      renderBackupList(backupListCache);
    });
    th.appendChild(button);
  });
  updateBackupSortHeader();
}

function managementSortValue(file, sortKey) {
  if (sortKey === "size") return Number(file?.size) || 0;
  if (sortKey === "mtime") return String(file?.mtime || "");
  return String(file?.name || "");
}

function sortInventoryFiles(listId, files) {
  const state = managementSortFor(listId);
  const direction = state.direction === "desc" ? -1 : 1;
  const locale = currentLang === "de" ? "de" : "en";
  return [...files].sort((leftFile, rightFile) => {
    const leftDir = leftFile?.type === "dir" ? 0 : 1;
    const rightDir = rightFile?.type === "dir" ? 0 : 1;
    if (leftDir !== rightDir) return leftDir - rightDir;
    const left = managementSortValue(leftFile, state.key);
    const right = managementSortValue(rightFile, state.key);
    let result = 0;
    if (state.key === "size") {
      result = left - right;
    } else {
      result = String(left).localeCompare(String(right), locale, { numeric: true, sensitivity: "base" });
    }
    if (result === 0) {
      result = String(leftFile?.name || "").localeCompare(String(rightFile?.name || ""), locale, { numeric: true, sensitivity: "base" });
    }
    return result * direction;
  });
}

function backupSortValue(file, sortKey) {
  if (sortKey === "size") return Number(file?.size) || 0;
  if (sortKey === "mtime") return String(file?.mtime || "");
  if (sortKey === "version") return String(file?.version || "");
  return String(file?.name || "");
}

function sortBackupFiles(files) {
  const direction = backupSortState.direction === "desc" ? -1 : 1;
  const locale = currentLang === "de" ? "de" : "en";
  return [...files].sort((leftFile, rightFile) => {
    const left = backupSortValue(leftFile, backupSortState.key);
    const right = backupSortValue(rightFile, backupSortState.key);
    let result = 0;
    if (backupSortState.key === "size") {
      result = left - right;
    } else {
      result = String(left).localeCompare(String(right), locale, { numeric: true, sensitivity: "base" });
    }
    if (result === 0) {
      result = String(leftFile?.name || "").localeCompare(String(rightFile?.name || ""), locale, { numeric: true, sensitivity: "base" });
    }
    return result * direction;
  });
}

function managementSelectionKey(kind, side) {
  return `${kind}:${side}`;
}

function managementCurrentDir(kind) {
  return managementLocalDirState[kind] || "";
}

function updateInventoryRootPath() {
  const node = $("inventoryRootPath");
  if (node) node.textContent = appConfig.inventory_root || "";
}

function normalizeLocalInventoryPath(path = "") {
  return String(path || "")
    .replace(/\\/g, "/")
    .split("/")
    .map(part => part.trim())
    .filter(part => part && part !== "." && part !== "..")
    .join("/");
}

function parentLocalInventoryPath(path = "") {
  const normalized = normalizeLocalInventoryPath(path);
  if (!normalized) return "";
  const parts = normalized.split("/");
  parts.pop();
  return parts.join("/");
}

function inventoryDefaultExtension(kind) {
  return kind === "config" ? ".txt" : ".json";
}

function versionInfoForName(name = "") {
  const match = String(name || "").match(/^(.+)_([0-9]+)(\.[^.]+)$/);
  if (!match) return null;
  return {
    baseName: `${match[1]}${match[3]}`,
    index: Number(match[2])
  };
}

function localInventoryHasFile(kind, filename) {
  const normalized = String(filename || "").trim();
  return (managementListCache[managementListId(kind, "local")] || [])
    .some(file => file?.type === "file" && file?.name === normalized);
}

function askLocalCopyConflict(filename) {
  return new Promise(resolve => {
    let modal = $("inventoryConflictModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "inventoryConflictModal";
      modal.className = "modal-shell hidden-panel";
      modal.innerHTML = `
        <div class="modal-card inventory-conflict-card" role="dialog" aria-modal="true" aria-labelledby="inventoryConflictTitle">
          <div class="modal-head">
            <h2 id="inventoryConflictTitle"></h2>
          </div>
          <p id="inventoryConflictMessage"></p>
          <div class="actions end">
            <button id="inventoryConflictOverwrite" class="ghost" type="button"></button>
            <button id="inventoryConflictVersion" class="primary" type="button"></button>
            <button id="inventoryConflictCancel" class="danger" type="button"></button>
          </div>
        </div>`;
      document.body.appendChild(modal);
    }
    $("inventoryConflictTitle").textContent = text("inventoryConflictTitle");
    $("inventoryConflictMessage").textContent = text("inventoryConflictMessage").replace("%name%", filename);
    $("inventoryConflictOverwrite").textContent = text("inventoryConflictOverwrite");
    $("inventoryConflictVersion").textContent = text("inventoryConflictVersion");
    $("inventoryConflictCancel").textContent = text("inventoryConflictCancel");
    const finish = value => {
      modal.classList.add("hidden-panel");
      modal.dataset.result = value;
      inventoryConflictResolver = null;
      resolve(value);
    };
    inventoryConflictResolver = finish;
    $("inventoryConflictOverwrite").onclick = () => finish("overwrite");
    $("inventoryConflictVersion").onclick = () => finish("version");
    $("inventoryConflictCancel").onclick = () => finish("abort");
    modal.classList.remove("hidden-panel");
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function detailLabel(label) {
  const dictionaries = {
    de: {
      Actors: "Aktoren",
      Backup: "Backup",
      Baseline: "Baseline",
      Boil: "Kochdauer",
      Config: "Konfiguration",
      Date: "Datum",
      Delta: "Delta",
      Duration: "Dauer",
      Fermenter: "Fermenter",
      "Fermenter plan": "Fermenterplan",
      "Fermenter plans": "Fermenterpläne",
      "Fermenter steps": "Fermenter-Schritte",
      Field: "Feld",
      File: "Datei",
      Format: "Format",
      Info: "Info",
      Kettle: "Kessel",
      Kettles: "Kessel",
      Language: "Sprache",
      "Mash plans": "Maischepläne",
      "Mash steps": "Maischeschritte",
      Max: "Max",
      Name: "Name",
      Nachiso: "Nachisomerisierung",
      PID: "PID",
      Pin: "Pin",
      Profiles: "Profile",
      Recipe: "Rezept",
      Sensors: "Sensoren",
      Size: "Größe",
      Steps: "Schritte",
      System: "System",
      Temp: "Temperatur",
      Type: "Typ",
      Value: "Wert",
      Version: "Version"
    },
    en: {}
  };
  return dictionaries[currentLang]?.[label] || label;
}

function renderDetailTable(rows) {
  if (!Array.isArray(rows) || !rows.length) {
    return `<p class="muted">${currentLang === "de" ? "Keine Daten" : "No data"}</p>`;
  }
  const columns = [...new Set(rows.flatMap(row => Object.keys(row || {})))];
  return `
    <div class="detail-table-shell">
      <table class="file-table detail-table">
        <thead><tr>${columns.map(column => `<th>${escapeHtml(detailLabel(column))}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows.map(row => `<tr>${columns.map(column => `<td>${escapeHtml(row?.[column] ?? "-")}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </div>`;
}

function renderInventoryUserInfo(data) {
  const editable = data.user_info_editable === true;
  const note = String(data.user_info || "");
  if (!editable) {
    return "";
  }
  return `
    <section class="detail-section inventory-user-info-section">
      <h3>${text("inventoryUserInfoTitle")}</h3>
      <textarea id="inventoryUserInfoText" class="inventory-user-info-text" placeholder="${escapeHtml(text("inventoryUserInfoPlaceholder"))}">${escapeHtml(note)}</textarea>
      <div class="actions end inventory-user-info-actions">
        <span id="inventoryUserInfoStatus" class="status-line"></span>
        <button id="saveInventoryUserInfo" class="primary" type="button">${text("inventoryUserInfoSave")}</button>
      </div>
    </section>`;
}

function renderInventoryDetail(data) {
  const content = $("inventoryDetailContent");
  if (!content) return;
  const headerRows = [
    { Field: detailLabel("File"), Value: data.filename || "-" },
    { Field: detailLabel("Date"), Value: data.mtime || "-" },
    { Field: detailLabel("Size"), Value: `${Math.max(1, Math.round((Number(data.size) || 0) / 1024))} KB` }
  ];
  if (data.baseline) headerRows.push({ Field: detailLabel("Baseline"), Value: data.baseline });
  const sections = Array.isArray(data.sections) ? data.sections : [];
  content.innerHTML = `
    <section class="detail-section">
      <h3>${escapeHtml(data.filename || "-")}</h3>
      ${renderDetailTable(headerRows)}
    </section>
    ${sections.map(section => `
      <section class="detail-section">
        <h3>${escapeHtml(detailLabel(section.title || "-"))}</h3>
        ${renderDetailTable(section.rows || [])}
      </section>
    `).join("")}
    ${Array.isArray(data.diff) ? `
      <section class="detail-section">
        <h3>${currentLang === "de" ? "Unterschiede zur Baseline" : "Differences to baseline"}</h3>
        ${renderDetailTable(data.diff)}
      </section>
    ` : ""}
    ${renderInventoryUserInfo(data)}`;
  $("saveInventoryUserInfo")?.addEventListener("click", saveInventoryUserInfo);
}

async function saveInventoryUserInfo() {
  if (!inventoryDetailState || !["local", "backup"].includes(inventoryDetailState.side)) return;
  const textarea = $("inventoryUserInfoText");
  const status = $("inventoryUserInfoStatus");
  const button = $("saveInventoryUserInfo");
  const note = textarea?.value || "";
  button.disabled = true;
  if (status) status.textContent = "";
  try {
    const endpoint = inventoryDetailState.side === "backup"
      ? "/api/backups/user-info"
      : "/api/inventory/local/user-info";
    const body = inventoryDetailState.side === "backup"
      ? { filename: inventoryDetailState.filename, user_info: note }
      : { kind: inventoryDetailState.kind, filename: inventoryDetailState.filename, user_info: note };
    const data = await api(endpoint, {
      method: "POST",
      body
    });
    if (status) status.textContent = text("inventoryUserInfoSaved");
    inventoryDetailState.user_info = data.user_info || "";
  } catch (err) {
    if (status) status.textContent = `Error: ${String(err)}`;
  } finally {
    button.disabled = false;
  }
}

async function openInventoryDetail(kind, side, filename) {
  const modal = $("inventoryDetailModal");
  const loading = $("inventoryDetailLoading");
  const content = $("inventoryDetailContent");
  inventoryDetailState = { kind, side, filename };
  $("inventoryDetailTitle").textContent = text("inventoryDetailTitle");
  if ($("inventoryDetailLoadingText")) $("inventoryDetailLoadingText").textContent = text("inventoryDetailLoading");
  if (content) content.innerHTML = "";
  loading?.classList.remove("hidden-panel");
  modal?.classList.remove("hidden-panel");
  try {
    const endpoint = side === "device" ? "/api/inventory/device/detail" : "/api/inventory/local/detail";
    const extra = side === "device" ? `&base_url=${encodeURIComponent($("deviceUrl").value)}` : "";
    const data = await api(`${endpoint}?kind=${encodeURIComponent(kind)}&filename=${encodeURIComponent(filename)}${extra}`);
    inventoryDetailState = { kind, side, filename, user_info: data.user_info || "" };
    loading?.classList.add("hidden-panel");
    renderInventoryDetail(data);
  } catch (err) {
    loading?.classList.add("hidden-panel");
    modal?.classList.add("hidden-panel");
    setInlineStatus(`${kind}InlineStatus`, `Error: ${String(err)}`);
    appendStatus("managementStatus", managementTitle(kind), String(err));
  }
}

function ensureInventoryFilename(kind, name, type = "file", originalName = "") {
  const trimmed = String(name || "").trim();
  if (!trimmed) return "";
  if (type === "dir") return trimmed;
  if (/\.[^.]+$/.test(trimmed)) return trimmed;
  if (originalName && /\.[^.]+$/.test(originalName)) return `${trimmed}${originalName.slice(originalName.lastIndexOf("."))}`;
  return `${trimmed}${inventoryDefaultExtension(kind)}`;
}

function managementSelected(kind, side) {
  return managementSelectionState[managementSelectionKey(kind, side)]?.path || "";
}

function managementSelectedItem(kind, side) {
  return managementSelectionState[managementSelectionKey(kind, side)] || null;
}

function setManagementSelected(kind, side, path = "", type = "", name = "") {
  const tbody = $(managementListId(kind, side));
  if (!tbody) return;
  const normalizedPath = String(path || "");
  const selection = normalizedPath ? { path: normalizedPath, type: type || "file", name: name || normalizedPath.split("/").pop() || normalizedPath } : null;
  managementSelectionState[managementSelectionKey(kind, side)] = selection;
  tbody.dataset.selected = normalizedPath;
  tbody.querySelectorAll("tr").forEach(row => {
    row.classList.toggle("selected", row.dataset.path === normalizedPath);
  });
}

function updateManagementLocalPath(kind) {
  const node = $(`${kind}LocalPath`);
  if (!node) return;
  const current = managementCurrentDir(kind);
  node.textContent = current ? `/${current}` : "/";
}

function navigateLocalInventory(kind, relPath = "") {
  if (managementLoadingState[kind]) return Promise.resolve();
  managementLoadingState[kind] = true;
  setSpinner(`${kind}Spinner`, true);
  setInlineStatus(`${kind}InlineStatus`, currentLang === "de" ? "Lade lokales Verzeichnis. Bitte warten ..." : "Loading local directory. Please wait ...");
  managementLocalDirState[kind] = normalizeLocalInventoryPath(relPath);
  updateManagementLocalPath(kind);
  return loadInventory(kind, { includeDevice: false }).finally(() => {
    managementLoadingState[kind] = false;
  });
}

function managementTitle(kind) {
  const mapping = {
    mashplans: "managementMashplansTab",
    fermenterplans: "managementFermenterplansTab",
    profiles: "managementProfilesTab",
    config: "managementConfigTab"
  };
  return text(mapping[kind] || kind);
}

function deviceIsOnline() {
  return ($("deviceConnectionState")?.dataset?.state || "") === "online";
}

function effectiveDeviceBaseUrl() {
  const resolved = String(lastDeviceStatus?.base_url || "").trim();
  if (resolved) return resolved;
  return ($("deviceUrl").value || "").trim() || "http://brautomat.local";
}

function selectedBackup() {
  return $("backupList")?.dataset?.selected || "";
}

function setSelectedBackup(filename = "") {
  const tbody = $("backupList");
  if (!tbody) return;
  tbody.dataset.selected = filename || "";
  tbody.querySelectorAll("tr").forEach(row => {
    row.classList.toggle("selected", row.dataset.filename === filename);
  });
  const input = $("restoreFilename");
  if (input && filename) input.value = filename;
}

function renderBackupList(files) {
  const tbody = $("backupList");
  if (!tbody) return;
  backupListCache = Array.isArray(files) ? [...files] : [];
  updateBackupSortHeader();
  const prevSelected = tbody.dataset.selected || "";
  const sortedFiles = sortBackupFiles(backupListCache);
  tbody.innerHTML = "";
  if (!sortedFiles.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td class="empty-cell" colspan="4">${currentLang === "de" ? "Keine Backups gefunden" : "No backups found"}</td>`;
    tbody.appendChild(tr);
    tbody.dataset.selected = "";
    if ($("restoreFilename")) $("restoreFilename").value = "";
    return;
  }
  sortedFiles.forEach(file => {
    const tr = document.createElement("tr");
    tr.dataset.filename = file.name;
    tr.innerHTML = `<td>${file.name}</td><td>${file.version || "-"}</td><td class="date-col">${file.mtime || "-"}</td><td class="size-col">${Math.max(1, Math.round((Number(file.size) || 0) / 1024))} KB</td>`;
    tr.addEventListener("click", () => setSelectedBackup(file.name));
    tr.addEventListener("dblclick", () => openBackupDetail(file.name));
    tbody.appendChild(tr);
  });
  const first = sortedFiles[0]?.name || "";
  setSelectedBackup(sortedFiles.some(file => file.name === prevSelected) ? prevSelected : first);
}

async function loadBackups() {
  const data = await api("/api/backups");
  renderBackupList(data.files || []);
}

async function openBackupDetail(filename = "") {
  const selected = filename || selectedBackup();
  if (!selected) {
    setInlineStatus("backupInlineStatus", currentLang === "de" ? "Kein Backup ausgewählt." : "No backup selected.");
    return;
  }
  const modal = $("inventoryDetailModal");
  const loading = $("inventoryDetailLoading");
  const content = $("inventoryDetailContent");
  inventoryDetailState = { kind: "backup", side: "backup", filename: selected };
  $("inventoryDetailTitle").textContent = text("inventoryDetailTitle");
  if ($("inventoryDetailLoadingText")) $("inventoryDetailLoadingText").textContent = text("inventoryDetailLoading");
  if (content) content.innerHTML = "";
  loading?.classList.remove("hidden-panel");
  modal?.classList.remove("hidden-panel");
  try {
    const data = await api(`/api/backups/detail?filename=${encodeURIComponent(selected)}`);
    inventoryDetailState = { kind: "backup", side: "backup", filename: selected, user_info: data.user_info || "" };
    loading?.classList.add("hidden-panel");
    renderInventoryDetail(data);
  } catch (err) {
    loading?.classList.add("hidden-panel");
    modal?.classList.add("hidden-panel");
    setInlineStatus("backupInlineStatus", `Error: ${String(err)}`);
    appendStatus("backupRestoreStatus", text("backupTitle"), String(err));
  }
}

function requireOnlineForDeviceAction(inlineStatusId = null, debugStatusId = null, title = "Status") {
  if (deviceIsOnline()) return true;
  const message = currentLang === "de" ? "Device nicht erreichbar." : "Device not available.";
  if (inlineStatusId && $(inlineStatusId)) {
    setInlineStatus(inlineStatusId, message);
  }
  if (debugStatusId && $(debugStatusId)) {
    appendStatus(debugStatusId, title, message);
  }
  return false;
}

function requireTestRunnerReady() {
  if (!deviceIsOnline()) {
    const message = currentLang === "de"
      ? "Test Runner benötigt ein online erreichbares Gerät."
      : "Test Runner requires a device that is reachable online.";
    setInlineStatus("testRunnerInlineStatus", message);
    appendStatus("testRunnerStatus", text("testRunnerTitle"), message);
    return false;
  }
  const serialPort = String($("portSelect").value || $("serialPortSelect").value || "").trim();
  if (!serialPort) {
    const message = currentLang === "de"
      ? "Test Runner benötigt zusätzlich einen seriellen COM-Port."
      : "Test Runner also requires a serial COM port.";
    setInlineStatus("testRunnerInlineStatus", message);
    appendStatus("testRunnerStatus", text("testRunnerTitle"), message);
    return false;
  }
  if (!lastDeviceStatus?.testflow_enabled) {
    const message = currentLang === "de"
      ? "Test Runner benötigt eine Firmware mit BRAUTOMAT_TESTFLOW."
      : "Test Runner requires firmware built with BRAUTOMAT_TESTFLOW.";
    setInlineStatus("testRunnerInlineStatus", message);
    appendStatus("testRunnerStatus", text("testRunnerTitle"), message);
    return false;
  }
  return true;
}

function requireSerialPortForAction(port, inlineStatusId = null, debugStatusId = null, title = "Status", options = {}) {
  const { allowRunningMonitor = false, requirePort = true } = options;
  const trimmedPort = String(port || "").trim();
  let message = "";
  if (requirePort && !trimmedPort) {
    message = currentLang === "de" ? "Kein COM-Port ausgewählt." : "No COM port selected.";
  } else if (!allowRunningMonitor && serialLogConflictsWithPort(trimmedPort)) {
    message = currentLang === "de"
      ? "Serielles Log ist auf diesem COM-Port aktiv. Stoppe Log vor dem Zugriff."
      : "Serial log is active on this COM port. Stop Log before accessing the device.";
  }
  if (!message) return true;
  if (inlineStatusId && $(inlineStatusId)) setInlineStatus(inlineStatusId, message);
  if (debugStatusId && $(debugStatusId)) appendStatus(debugStatusId, title, message);
  return false;
}

function renderInventoryList(listId, files, emptyMessage = null, options = {}) {
  const tbody = $(listId);
  const table = tbody?.closest("table");
  if (!tbody || !table) return;
  const kind = listId.replace(/(DeviceList|LocalList)$/, "");
  const side = listId.endsWith("DeviceList") ? "device" : "local";
  const currentDir = normalizeLocalInventoryPath(options.currentDir || "");
  managementListCache[listId] = Array.isArray(files) ? [...files] : [];
  managementEmptyState[listId] = emptyMessage;
  updateManagementSortHeader(table);
  const prevSelected = tbody.dataset.selected || "";
  const sortedFiles = sortInventoryFiles(listId, managementListCache[listId]);
  tbody.innerHTML = "";
  if (side === "local") {
    managementLocalDirState[kind] = currentDir;
    updateManagementLocalPath(kind);
  }
  if (side === "local" && currentDir) {
    const parentPath = parentLocalInventoryPath(currentDir);
    const tr = document.createElement("tr");
    tr.dataset.path = parentPath;
    tr.dataset.type = "parent";
    tr.innerHTML = `<td class="name-col name-parent">../</td><td class="date-col">-</td><td class="size-col">-</td>`;
    tr.addEventListener("click", () => setManagementSelected(kind, side, parentPath, "parent", ".."));
    tr.addEventListener("dblclick", () => navigateLocalInventory(kind, parentPath));
    tbody.appendChild(tr);
  }
  if (!sortedFiles.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td class="empty-cell" colspan="3">${emptyMessage || (currentLang === "de" ? "Keine Dateien gefunden" : "No files found")}</td>`;
    tbody.appendChild(tr);
    setManagementSelected(kind, side, "");
    return;
  }
  const renderRow = (file, rowOptions = {}) => {
    const tr = document.createElement("tr");
    const rowPath = file.rel_path || file.name;
    tr.dataset.path = rowPath;
    tr.dataset.type = file.type || "file";
    tr.classList.toggle("entry-dir", file.type === "dir");
    tr.classList.toggle("version-row", !!rowOptions.version);
    const hasVersions = Array.isArray(rowOptions.versions) && rowOptions.versions.length > 0;
    const expandedKey = `${kind}:${rowPath}`;
    const expanded = !!managementVersionExpanded[expandedKey];
    let nameHtml = file.type === "dir" ? `${file.name}/` : file.name;
    if (hasVersions) {
      nameHtml = `<button class="version-toggle" type="button" aria-label="Versions">${expanded ? "-" : "+"}</button><span>${file.name}</span>`;
    } else if (rowOptions.version) {
      const info = versionInfoForName(file.name);
      const versionLabel = info ? `Version ${info.index}` : file.name;
      nameHtml = `<span class="version-indent"></span><span class="version-label">${versionLabel}</span><span class="version-file">${file.name}</span>`;
    }
    tr.innerHTML = `<td class="name-col">${nameHtml}</td><td class="date-col">${file.mtime || "-"}</td><td class="size-col">${file.type === "dir" ? "-" : `${Math.max(1, Math.round((Number(file.size) || 0) / 1024))} KB`}</td>`;
    tr.addEventListener("click", () => setManagementSelected(kind, side, rowPath, file.type || "file", file.name));
    if (side === "local" && file.type === "dir") {
      tr.addEventListener("dblclick", () => navigateLocalInventory(kind, rowPath));
    } else if (side === "local" && file.type === "file") {
      tr.addEventListener("dblclick", () => openInventoryDetail(kind, "local", rowPath));
    } else if (side === "device" && (file.type || "file") === "file") {
      tr.addEventListener("dblclick", () => openInventoryDetail(kind, "device", rowPath));
    }
    if (hasVersions) {
      const toggle = tr.querySelector(".version-toggle");
      toggle?.addEventListener("click", event => {
        event.stopPropagation();
        managementVersionExpanded[expandedKey] = !managementVersionExpanded[expandedKey];
        renderInventoryList(listId, managementListCache[listId] || [], managementEmptyState[listId] ?? null, { side, currentDir: managementCurrentDir(kind) });
      });
    }
    tbody.appendChild(tr);
    return tr;
  };
  if (side === "local") {
    const byName = new Map(sortedFiles.map(file => [file.name, file]));
    const groupedVersionNames = new Set();
    sortedFiles.forEach(file => {
      if (file.type === "dir") return;
      const info = versionInfoForName(file.name);
      if (info && byName.has(info.baseName)) groupedVersionNames.add(file.name);
    });
    sortedFiles.forEach(file => {
      if (groupedVersionNames.has(file.name)) return;
      if (file.type === "dir") {
        renderRow(file);
        return;
      }
      const versions = sortedFiles
        .filter(candidate => {
          if (candidate.type === "dir") return false;
          const info = versionInfoForName(candidate.name);
          return info && info.baseName === file.name;
        })
        .sort((a, b) => (versionInfoForName(a.name)?.index || 0) - (versionInfoForName(b.name)?.index || 0));
      renderRow(file, { versions });
      const expandedKey = `${kind}:${file.rel_path || file.name}`;
      if (managementVersionExpanded[expandedKey]) {
        versions.forEach(version => renderRow(version, { version: true }));
      }
    });
  } else {
    sortedFiles.forEach(file => renderRow(file));
  }
  const nextSelection = sortedFiles.find(file => (file.rel_path || file.name) === prevSelected) || sortedFiles[0] || null;
  setManagementSelected(kind, side, nextSelection ? (nextSelection.rel_path || nextSelection.name) : "", nextSelection?.type || "", nextSelection?.name || "");
}

async function loadInventory(kind, options = {}) {
  const includeDevice = options.includeDevice !== false;
  setSpinner(`${kind}Spinner`, true);
  setInlineStatus(`${kind}InlineStatus`, currentLang === "de" ? "Lade Inventar. Bitte warten ..." : "Loading inventory. Please wait ...");
  try {
    const deviceOnline = ($("deviceConnectionState")?.dataset?.state || "") === "online";
    const localDir = managementCurrentDir(kind);
    const loadDevice = includeDevice && deviceOnline;
    const data = await api(`/api/inventory/list?kind=${encodeURIComponent(kind)}&base_url=${encodeURIComponent($("deviceUrl").value)}&device=${loadDevice ? "1" : "0"}&local_dir=${encodeURIComponent(localDir)}`);
    if (data.inventory_root) {
      appConfig.inventory_root = data.inventory_root;
      updateInventoryRootPath();
    }
    if (includeDevice) {
      renderInventoryList(
        managementListId(kind, "device"),
        data.device || [],
        deviceOnline
          ? null
          : (currentLang === "de" ? "Device nicht erreichbar" : "Device not available"),
        { side: "device" }
      );
    }
    renderInventoryList(managementListId(kind, "local"), data.local || [], null, { side: "local", currentDir: data.local_current_dir || localDir });
    if (!includeDevice) {
      setInlineStatus(`${kind}InlineStatus`, "");
    } else if (!deviceOnline) {
      setInlineStatus(`${kind}InlineStatus`, currentLang === "de" ? "Device nicht erreichbar." : "Device not available.");
    } else if (data.device_error) {
      setInlineStatus(`${kind}InlineStatus`, currentLang === "de" ? "Device nicht erreichbar." : "Device not available.");
    } else {
      setInlineStatus(`${kind}InlineStatus`, "");
    }
    appendStatus("managementStatus", managementTitle(kind), data);
  } catch (err) {
    setInlineStatus(`${kind}InlineStatus`, `Error: ${String(err)}`);
    appendStatus("managementStatus", managementTitle(kind), String(err));
    } finally {
    setSpinner(`${kind}Spinner`, false);
  }
}

async function chooseInventoryRoot() {
  try {
    const data = await api("/api/inventory/root/pick", { method: "POST", body: {} });
    if (!data.selected) return;
    await saveConfig({ inventory_root: data.selected });
    updateInventoryRootPath();
    await loadInventory(currentManagementKind());
  } catch (err) {
    setInlineStatus(`${currentManagementKind()}InlineStatus`, `Error: ${String(err)}`);
    appendStatus("managementStatus", text("tabManagement"), String(err));
  }
}

async function inventoryAction(kind, action, side = "") {
  const resolvedSide = side || (action === "local-to-device" || action === "local-delete" || action === "local-rename" ? "local" : "device");
  const filename = managementSelected(kind, resolvedSide);
  if (!filename) {
    setInlineStatus(`${kind}InlineStatus`, currentLang === "de" ? "Keine Datei ausgewählt." : "No file selected.");
    return;
  }
  const requiresOnline = ["device-to-local", "local-to-device", "device-delete", "device-rename"].includes(action);
  if (requiresOnline && !deviceIsOnline()) {
    const message = currentLang === "de" ? "Device nicht erreichbar." : "Device not available.";
    setInlineStatus(`${kind}InlineStatus`, message);
    appendStatus("managementStatus", managementTitle(kind), message);
    return;
  }
  const endpointMap = {
    "device-to-local": "/api/inventory/device-to-local",
    "local-to-device": "/api/inventory/local-to-device",
    "device-delete": "/api/inventory/device/delete",
    "local-delete": "/api/inventory/local/delete",
    "device-rename": "/api/inventory/device/rename",
    "local-rename": "/api/inventory/local/rename"
  };
  const statusMap = {
    "device-to-local": currentLang === "de" ? "Kopiere Datei ins lokale Inventar. Bitte warten ..." : "Copying file to local inventory. Please wait ...",
    "local-to-device": currentLang === "de" ? "Kopiere Datei auf das Device. Bitte warten ..." : "Copying file to device. Please wait ...",
    "device-delete": currentLang === "de" ? "Lösche Datei auf dem Device. Bitte warten ..." : "Deleting file on device. Please wait ...",
    "local-delete": currentLang === "de" ? "Lösche lokale Datei. Bitte warten ..." : "Deleting local file. Please wait ..."
  };
  setSpinner(`${kind}Spinner`, true);
  setInlineStatus(`${kind}InlineStatus`, statusMap[action]);
  try {
    const body = { kind, filename, base_url: $("deviceUrl").value };
    if (action === "device-rename" || action === "local-rename") {
      const suggestion = filename;
      const entered = window.prompt(currentLang === "de" ? "Neuer Dateiname" : "New filename", suggestion);
      if (!entered || entered.trim() === filename) {
        setSpinner(`${kind}Spinner`, false);
        setInlineStatus(`${kind}InlineStatus`, "");
        return;
      }
      body.new_name = entered.trim().toLowerCase().endsWith(".json") ? entered.trim() : `${entered.trim()}.json`;
    }
    const data = await api(endpointMap[action], { method: "POST", body });
    appendStatus("managementStatus", managementTitle(kind), data);
    await loadInventory(kind);
  } catch (err) {
    setInlineStatus(`${kind}InlineStatus`, `Error: ${String(err)}`);
    appendStatus("managementStatus", managementTitle(kind), String(err));
    setSpinner(`${kind}Spinner`, false);
  }
}

async function inventoryActionExplorer(kind, action, side = "") {
  const resolvedSide = side || (action.startsWith("local-") ? "local" : "device");
  const selected = managementSelectedItem(kind, resolvedSide);
  const filename = selected?.path || "";
  if (!filename && !["local-create-dir", "local-create-file"].includes(action)) {
    setInlineStatus(`${kind}InlineStatus`, currentLang === "de" ? "Keine Datei ausgewählt." : "No file selected.");
    return;
  }
  const requiresOnline = ["device-to-local", "local-to-device", "device-delete", "device-rename"].includes(action);
  if (requiresOnline && !deviceIsOnline()) {
    const message = currentLang === "de" ? "Device nicht erreichbar." : "Device not available.";
    setInlineStatus(`${kind}InlineStatus`, message);
    appendStatus("managementStatus", managementTitle(kind), message);
    return;
  }
  const endpointMap = {
    "device-to-local": "/api/inventory/device-to-local",
    "local-to-device": "/api/inventory/local-to-device",
    "device-delete": "/api/inventory/device/delete",
    "local-delete": "/api/inventory/local/delete",
    "device-rename": "/api/inventory/device/rename",
    "local-rename": "/api/inventory/local/rename",
    "local-create-dir": "/api/inventory/local/create-dir",
    "local-create-file": "/api/inventory/local/create-file"
  };
  const statusMap = {
    "device-to-local": currentLang === "de" ? "Kopiere Datei ins lokale Inventar. Bitte warten ..." : "Copying file to local inventory. Please wait ...",
    "local-to-device": currentLang === "de" ? "Kopiere Datei auf das Device. Bitte warten ..." : "Copying file to device. Please wait ...",
    "device-delete": currentLang === "de" ? "Lösche Datei auf dem Device. Bitte warten ..." : "Deleting file on device. Please wait ...",
    "local-delete": currentLang === "de" ? "Lösche lokalen Eintrag. Bitte warten ..." : "Deleting local entry. Please wait ...",
    "local-create-dir": currentLang === "de" ? "Erstelle Ordner. Bitte warten ..." : "Creating folder. Please wait ...",
    "local-create-file": currentLang === "de" ? "Erstelle Datei. Bitte warten ..." : "Creating file. Please wait ..."
  };
  setSpinner(`${kind}Spinner`, true);
  setInlineStatus(`${kind}InlineStatus`, statusMap[action] || "");
  try {
    if (action === "local-to-device" && selected?.type !== "file") {
      throw new Error(currentLang === "de" ? "Nur Dateien können auf das Device kopiert werden." : "Only files can be copied to the device.");
    }
    if ((action === "local-delete" || action === "local-rename") && selected?.type === "parent") {
      throw new Error(currentLang === "de" ? "Dieser Eintrag kann nicht bearbeitet werden." : "This entry cannot be modified.");
    }
    const body = { kind, filename, base_url: $("deviceUrl").value, local_dir: managementCurrentDir(kind) };
    if (action === "device-to-local" && localInventoryHasFile(kind, selected?.name || filename)) {
      const conflict = await askLocalCopyConflict(selected?.name || filename);
      if (conflict === "abort") {
        setSpinner(`${kind}Spinner`, false);
        setInlineStatus(`${kind}InlineStatus`, "");
        return;
      }
      body.conflict = conflict;
    }
    if (action === "device-rename" || action === "local-rename") {
      const suggestion = selected?.name || filename.split("/").pop() || filename;
      const entered = window.prompt(currentLang === "de" ? "Neuer Dateiname" : "New filename", suggestion);
      const normalized = ensureInventoryFilename(kind, entered, selected?.type || "file", selected?.name || "");
      if (!normalized || normalized === suggestion) {
        setSpinner(`${kind}Spinner`, false);
        setInlineStatus(`${kind}InlineStatus`, "");
        return;
      }
      body.new_name = normalized;
    }
    if (action === "local-create-dir" || action === "local-create-file") {
      const promptLabel = action === "local-create-dir"
        ? (currentLang === "de" ? "Neuer Ordner" : "New folder")
        : (currentLang === "de" ? "Neue Datei" : "New file");
      const entered = window.prompt(promptLabel, "");
      const normalized = ensureInventoryFilename(kind, entered, action === "local-create-dir" ? "dir" : "file");
      if (!normalized) {
        setSpinner(`${kind}Spinner`, false);
        setInlineStatus(`${kind}InlineStatus`, "");
        return;
      }
      body.name = normalized;
    }
    const data = await api(endpointMap[action], { method: "POST", body });
    appendStatus("managementStatus", managementTitle(kind), data);
    await loadInventory(kind);
  } catch (err) {
    setInlineStatus(`${kind}InlineStatus`, `Error: ${String(err)}`);
    appendStatus("managementStatus", managementTitle(kind), String(err));
    setSpinner(`${kind}Spinner`, false);
  }
}

async function inventoryInfoAction(kind, side) {
  const selected = managementSelectedItem(kind, side);
  if (!selected?.path || selected.type !== "file") {
    setInlineStatus(`${kind}InlineStatus`, currentLang === "de" ? "Keine Datei ausgewählt." : "No file selected.");
    return;
  }
  if (side === "device" && !deviceIsOnline()) {
    const message = currentLang === "de" ? "Device nicht erreichbar." : "Device not available.";
    setInlineStatus(`${kind}InlineStatus`, message);
    appendStatus("managementStatus", managementTitle(kind), message);
    return;
  }
  await openInventoryDetail(kind, side, selected.path);
}

function activateManagementTab(kind) {
  document.querySelectorAll("[data-management-tab]").forEach(btn => btn.classList.toggle("active", btn.dataset.managementTab === kind));
  document.querySelectorAll(".management-subpanel").forEach(panel => panel.classList.toggle("active", panel.dataset.managementPanel === kind));
  loadInventory(kind).catch(console.error);
}

function activateTelegrafTab(kind) {
  document.querySelectorAll("[data-telegraf-tab]").forEach(btn => btn.classList.toggle("active", btn.dataset.telegrafTab === kind));
  document.querySelectorAll("[data-telegraf-panel]").forEach(panel => panel.classList.toggle("active", panel.dataset.telegrafPanel === kind));
}

function telegrafFormConfig() {
  const value = id => $(id).value.trim();
  return {
    binary: value("telegrafBinary"),
    device_url: $("deviceUrl").value.trim() || "http://brautomat.local",
    interval: value("telegrafInterval") || "30s",
    log_level: $("telegrafLogLevel").value || "info",
    templates_dir: value("telegrafTemplatesDir"),
    save_passwords: $("telegrafSavePasswords").checked,
    csv: { enabled: $("telegrafCsvEnabled").checked, path: value("telegrafCsvPath") || "brautomat.csv" },
    influxdb: { enabled: $("telegrafInfluxEnabled").checked, url: value("telegrafInfluxUrl"), token: $("telegrafInfluxToken").value, org: value("telegrafInfluxOrg"), bucket: value("telegrafInfluxBucket") },
    postgres: { enabled: $("telegrafPostgresEnabled").checked, host: value("telegrafPostgresHost"), port: value("telegrafPostgresPort"), database: value("telegrafPostgresDatabase"), user: value("telegrafPostgresUser"), password: $("telegrafPostgresPassword").value },
    mysql: { enabled: $("telegrafMySqlEnabled").checked, host: value("telegrafMySqlHost"), port: value("telegrafMySqlPort"), database: value("telegrafMySqlDatabase"), user: value("telegrafMySqlUser"), password: $("telegrafMySqlPassword").value },
    mqtt: { enabled: $("telegrafMqttEnabled").checked, server: value("telegrafMqttServer"), topic: value("telegrafMqttTopic"), client_id: value("telegrafMqttClientId"), username: value("telegrafMqttUsername"), password: $("telegrafMqttPassword").value, qos: Number($("telegrafMqttQos").value || 0) }
  };
}

function applyTelegrafConfig(raw) {
  const defaults = { binary: "", device_url: "http://brautomat.local", interval: "30s", log_level: "info", templates_dir: "", save_passwords: false, csv: {}, influxdb: {}, postgres: {}, mysql: {}, mqtt: {} };
  const config = { ...defaults, ...(raw || {}) };
  const setValue = (id, value) => { $(id).value = value == null ? "" : String(value); };
  const setChecked = (id, value) => { $(id).checked = !!value; };
  setValue("telegrafBinary", config.binary);
  setValue("telegrafInterval", config.interval);
  setValue("telegrafLogLevel", config.log_level || "info");
  setValue("telegrafTemplatesDir", config.templates_dir);
  setChecked("telegrafSavePasswords", config.save_passwords);
  setChecked("telegrafCsvEnabled", config.csv.enabled); setValue("telegrafCsvPath", config.csv.path || "brautomat.csv");
  setChecked("telegrafInfluxEnabled", config.influxdb.enabled); setValue("telegrafInfluxUrl", config.influxdb.url || "http://localhost:8086"); setValue("telegrafInfluxToken", config.influxdb.token); setValue("telegrafInfluxOrg", config.influxdb.org); setValue("telegrafInfluxBucket", config.influxdb.bucket || "brautomat");
  setChecked("telegrafPostgresEnabled", config.postgres.enabled); ["Host", "Port", "Database", "User", "Password"].forEach(name => setValue(`telegrafPostgres${name}`, config.postgres[name.toLowerCase()]));
  setChecked("telegrafMySqlEnabled", config.mysql.enabled); ["Host", "Port", "Database", "User", "Password"].forEach(name => setValue(`telegrafMySql${name}`, config.mysql[name.toLowerCase()]));
  setChecked("telegrafMqttEnabled", config.mqtt.enabled); setValue("telegrafMqttServer", config.mqtt.server || "tcp://localhost:1883"); setValue("telegrafMqttTopic", config.mqtt.topic || "brautomat/telemetry"); setValue("telegrafMqttClientId", config.mqtt.client_id || "brautomat-telegraf"); setValue("telegrafMqttUsername", config.mqtt.username); setValue("telegrafMqttPassword", config.mqtt.password); setValue("telegrafMqttQos", config.mqtt.qos || 0);
  updateTelegrafTabIndicators();
  refreshTelegrafBinaryPath();
}

// Maps each Telegraf destination sub-tab to its "enabled" checkbox so the tab
// can be marked (green dot) whenever that destination is active.
const telegrafEnabledCheckboxByTab = {
  csv: "telegrafCsvEnabled",
  influxdb: "telegrafInfluxEnabled",
  postgres: "telegrafPostgresEnabled",
  mysql: "telegrafMySqlEnabled",
  mqtt: "telegrafMqttEnabled",
};

function updateTelegrafTabIndicators() {
  let anyEnabled = false;
  Object.entries(telegrafEnabledCheckboxByTab).forEach(([tab, checkboxId]) => {
    const btn = document.querySelector(`[data-telegraf-tab="${tab}"]`);
    const checkbox = $(checkboxId);
    if (checkbox?.checked) anyEnabled = true;
    if (btn && checkbox) btn.classList.toggle("enabled", checkbox.checked);
  });
  // Warnhinweis im "Ziele konfigurieren"-Handle, wenn kein Ziel aktiviert ist.
  $("telegrafTargetsWarning")?.classList.toggle("hidden-panel", anyEnabled);
}

// UI-Meldungen (Test/Start/Stop/Speichern/Download) landen jetzt im
// Ausgabefenster statt in einer eigenen Statuszeile. Die Server-Ausgabe wird bei
// jedem Poll komplett ersetzt, deshalb halten wir die clientseitigen Meldungen
// getrennt und setzen das <pre> aus beiden Teilen zusammen.
let telegrafServerLines = [];
const telegrafClientLog = [];
let telegrafLastError = "";

function composeTelegrafLog() {
  const node = $("telegrafLog");
  if (!node) return;
  const parts = [];
  if (telegrafServerLines.length) parts.push(telegrafServerLines.join("\n"));
  if (telegrafClientLog.length) parts.push(telegrafClientLog.join("\n"));
  node.textContent = parts.join("\n");
  scrollOutputToEnd("telegrafLog");
}

let telegrafLastLogged = "";
function telegrafLogMessage(message) {
  const text = String(message ?? "").trim();
  if (!text || text === telegrafLastLogged) return;
  telegrafLastLogged = text;
  const ts = new Date().toLocaleTimeString(currentLang === "de" ? "de-DE" : "en-US");
  telegrafClientLog.push(`[${ts}] ${text}`);
  while (telegrafClientLog.length > 200) telegrafClientLog.shift();
  composeTelegrafLog();
}

function renderTelegraf(state) {
  const running = !!state?.running;
  $("telegrafStartBtn").disabled = running;
  $("telegrafStopBtn").disabled = !running;
  const runState = $("telegrafRunState");
  if (runState) {
    runState.classList.toggle("online", running);
    runState.classList.toggle("offline", !running);
    runState.dataset.state = running ? "online" : "offline";
    runState.textContent = running
      ? (currentLang === "de" ? "Telegraf läuft" : "Telegraf running")
      : (currentLang === "de" ? "Telegraf gestoppt" : "Telegraf stopped");
  }
  telegrafServerLines = state?.lines || [];
  composeTelegrafLog();
  // Fehler nur einmal ins Ausgabefenster schreiben, nicht bei jedem Sekundenpoll.
  const error = state?.error ? String(state.error) : "";
  if (error && error !== telegrafLastError) telegrafLogMessage(error);
  telegrafLastError = error;
}

async function pollTelegraf() { renderTelegraf(await api("/api/telegraf/status")); }
async function testTelegrafDevice() {
  const result = await api("/api/telegraf/test-device", { method: "POST", body: { device_url: $("deviceUrl").value } });
  telegrafLogMessage(currentLang === "de" ? `Telemetrie erreichbar: ${result.url}` : `Telemetry reachable: ${result.url}`);
}
async function saveTelegrafConfig() {
  const config = telegrafFormConfig();
  await saveConfig({ telegraf: config });
  telegrafLogMessage(currentLang === "de" ? "Telegraf-Konfiguration gespeichert." : "Telegraf configuration saved.");
}
// Zeigt unter dem Programmdatei-Feld den tatsächlich genutzten Telegraf-Pfad an
// (konfiguriert / PATH / mitgeliefert / heruntergeladen). Rein lesend - löst
// keinen Download aus.
// Blendet den Warnhinweis im "Telegraf konfigurieren"-Handle ein, solange die
// Telegraf-Programmdatei fehlt (und nicht automatisch geladen werden kann).
function setTelegrafConfigWarning(missing) {
  $("telegrafConfigWarning")?.classList.toggle("hidden-panel", !missing);
}
async function refreshTelegrafBinaryPath() {
  const node = $("telegrafBinaryResolved");
  if (!node) return;
  try {
    const info = await api("/api/telegraf/resolve-binary", { method: "POST", body: { binary: $("telegrafBinary").value.trim() } });
    if (info?.available && info.path) {
      const sourceKey = {
        path: "telegrafBinarySourcePath",
        configured: "telegrafBinarySourceConfigured",
        bundled: "telegrafBinarySourceBundled",
        cached: "telegrafBinarySourceCached"
      }[info.source] || "telegrafBinarySourceConfigured";
      node.textContent = `${text("telegrafBinaryFound")}: ${info.path} (${text(sourceKey)})`;
      node.classList.remove("missing");
      setTelegrafConfigWarning(false);
    } else if (info?.source === "download") {
      node.textContent = text("telegrafBinaryPending");
      node.classList.remove("missing");
      // Noch nicht vorhanden (wird bei Bedarf geladen) - der Nutzer soll es sehen,
      // solange das Panel eingeklappt ist.
      setTelegrafConfigWarning(true);
    } else {
      node.textContent = text("telegrafBinaryMissing");
      node.classList.add("missing");
      setTelegrafConfigWarning(true);
    }
  } catch {
    node.textContent = "";
    node.classList.remove("missing");
    setTelegrafConfigWarning(false);
  }
}
async function pickTelegrafBinary() {
  const result = await api("/api/telegraf/binary/pick", { method: "POST", body: {} });
  if (result?.selected) {
    $("telegrafBinary").value = result.selected;
    telegrafLogMessage(currentLang === "de" ? "Telegraf-Programmdatei übernommen." : "Telegraf executable set.");
    refreshTelegrafBinaryPath();
  }
}
async function pickTelegrafTemplatesDir() {
  const result = await api("/api/telegraf/templates/pick", { method: "POST", body: {} });
  if (result?.selected) {
    $("telegrafTemplatesDir").value = result.selected;
    telegrafLogMessage(currentLang === "de" ? "Templates-Verzeichnis übernommen." : "Templates directory set.");
  }
}
async function exportTelegrafTemplates() {
  const result = await api("/api/telegraf/export-templates", { method: "POST", body: {} });
  if (result?.selected) {
    const count = (result.written || []).length;
    telegrafLogMessage(currentLang === "de" ? `${count} Template-Dateien nach ${result.selected} exportiert.` : `Exported ${count} template files to ${result.selected}.`);
  } else {
    telegrafLogMessage(currentLang === "de" ? "Export abgebrochen." : "Export cancelled.");
  }
}
async function downloadTelegraf() {
  const btn = $("telegrafDownloadBtn");
  btn.disabled = true;
  setSpinner("telegrafDownloadSpinner", true);
  try {
    const { job_id } = await api("/api/telegraf/download", { method: "POST", body: {} });
    await new Promise((resolve, reject) => {
      const tick = async () => {
        try {
          const job = await api(`/api/jobs/${job_id}`);
          const last = ((job.logs || [])[job.logs.length - 1] || "").replace(/^\[[^\]]*\]\s*/, "");
          const pct = job.progress ? ` ${job.progress}%` : "";
          const file = job.current_file ? ` (${job.current_file})` : "";
          setInlineStatus("telegrafDownloadStatus", `${last}${pct}${file}`);
          if (job.status === "done") { resolve(job); return; }
          if (job.status === "failed") { reject(new Error(job.error || "Download failed")); return; }
          setTimeout(tick, 500);
        } catch (err) { reject(err); }
      };
      tick();
    });
    setInlineStatus("telegrafDownloadStatus", currentLang === "de" ? "Telegraf ist bereit." : "Telegraf is ready.");
    refreshTelegrafBinaryPath();
  } finally {
    setSpinner("telegrafDownloadSpinner", false);
    btn.disabled = false;
  }
}
async function startTelegraf() {
  renderTelegraf(await api("/api/telegraf/start", { method: "POST", body: { config: telegrafFormConfig() } }));
  telegrafLogMessage(currentLang === "de" ? "Telegraf wurde gestartet." : "Telegraf started.");
  // Telegrafs Startausgabe erscheint erst kurz nach dem Start - schnelle
  // Nachfassung, damit sie nicht erst beim nächsten Sekunden-Poll auftaucht.
  setTimeout(() => pollTelegraf().catch(console.error), 300);
}
async function stopTelegraf() {
  renderTelegraf(await api("/api/telegraf/stop", { method: "POST", body: {} }));
  setTimeout(() => pollTelegraf().catch(console.error), 300);
}
async function clearTelegrafLog() {
  telegrafClientLog.length = 0;
  telegrafLastError = "";
  telegrafLastLogged = "";
  renderTelegraf(await api("/api/telegraf/clear", { method: "POST", body: {} }));
}

function applyWifiNetworksResult(data) {
  const select = $("wifiNetworks");
  select.innerHTML = "";
  const preferredSsid = String(data.preferred_ssid || "").trim();
  const networks = (Array.isArray(data.networks) ? data.networks : [])
    .map(net => ({ ...net, ssid: String(net?.ssid || "").trim() }))
    .filter(net => net.ssid);
  if (!networks.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = currentLang === "de" ? "Keine WLAN-Netzwerke gefunden" : "No WiFi networks found";
    select.appendChild(option);
    setInlineStatus(
      "wifiInlineStatus",
      currentLang === "de" ? "Keine WLAN-Netzwerke gefunden." : "No WiFi networks found."
    );
    return;
  }
  networks.forEach(net => {
    const ssid = net.ssid;
    const option = document.createElement("option");
    option.value = ssid;
    option.textContent = `${ssid} (${net.rssi} dBm)`;
    select.appendChild(option);
  });
  if (preferredSsid) {
    const preferredIndex = networks.findIndex(net => net.ssid === preferredSsid);
    if (preferredIndex >= 0) {
      select.selectedIndex = preferredIndex;
    }
  }
  $("wifiSsid").value = select.value;
  if (data.transport === "host") {
    setInlineStatus("wifiInlineStatus", currentLang === "de"
      ? `${networks.length} Netzwerk(e) lokal gefunden.`
      : `${networks.length} network(s) found on the local computer.`);
  } else {
    setInlineStatus("wifiInlineStatus", "");
  }
}

async function choosePackageDirectory() {
  try {
    setProgressState("firmwareProgressPanel", "firmwareProgressBar", "firmwareProgressText", 0, false);
    const data = await api("/api/package/pick", { method: "POST", body: {} });
      if (data.selected) {
        $("packageSource").value = "open";
        $("packageDir").value = data.selected;
        await saveConfig({ package_source: "open", open_package_dir: data.selected });
        syncFirmwareActions();
        setStatus("firmwareStatus", data.details || { selected: data.selected });
        await loadRepoLanguages();
      }
  } catch (err) {
    setProgressState("firmwareProgressPanel", "firmwareProgressBar", "firmwareProgressText", 0, false);
    setStatus("firmwareStatus", String(err));
  }
}

function serialPortScore(port, preferredPort = "") {
  const portName = String(port?.port || "").trim();
  const upperPort = portName.toUpperCase();
  const label = `${port?.name || ""} ${port?.deviceId || ""}`.toLowerCase();
  let score = 0;
  if (preferredPort && upperPort === String(preferredPort).trim().toUpperCase()) {
    score += 1000;
  }
  if (/(usb|uart|cp210|ch340|wch|ftdi|silicon labs|arduino|esp32|vid_)/i.test(label)) {
    score += 250;
  }
  if (/(communications port|standard serial|acpi\\\\|pnp0501)/i.test(label)) {
    score -= 200;
  }
  const comMatch = upperPort.match(/^COM(\d+)$/i);
  if (comMatch) {
    const comNumber = Number(comMatch[1]) || 0;
    score += Math.min(comNumber, 64);
    if (comNumber === 1) {
      score -= 100;
    }
  }
  return score;
}

function choosePreferredSerialPort(ports = [], preferredPort = "") {
  if (!Array.isArray(ports) || !ports.length) return "";
  const preferred = String(preferredPort || "").trim();
  if (preferred) {
    const exact = ports.find(port => String(port?.port || "").trim().toUpperCase() === preferred.toUpperCase());
    if (exact) {
      const better = ports
        .filter(port => String(port?.port || "").trim().toUpperCase() !== preferred.toUpperCase())
        .sort((a, b) => serialPortScore(b, preferred) - serialPortScore(a, preferred));
      if (!better.length || serialPortScore(exact, preferred) >= serialPortScore(better[0], preferred)) {
        return exact.port;
      }
    }
  }
  return [...ports].sort((a, b) => serialPortScore(b, preferred) - serialPortScore(a, preferred))[0].port;
}

async function applySelectedSerialPort(port, persist = true) {
  const normalized = String(port || "").trim();
  ["portSelect", "serialPortSelect"].forEach(id => {
    const select = $(id);
    if (!select) return;
    if (normalized && Array.from(select.options).some(option => option.value === normalized)) {
      select.value = normalized;
    }
  });
  appConfig.serial_port = normalized;
  if (persist) {
    await saveConfig({ serial_port: normalized });
  }
}

async function loadPorts() {
  writeStartupTrace("loadPorts start");
  const data = await api("/api/ports");
  const ports = Array.isArray(data.ports) ? data.ports : [];
  const available = new Set(ports.map(port => String(port.port || "").trim()).filter(Boolean));
  const currentFirmwarePort = String(($("portSelect")?.value || "").trim());
  const currentSerialMonitorPort = String(($("serialPortSelect")?.value || "").trim());
  const preferredPort = currentFirmwarePort || currentSerialMonitorPort || String(appConfig.serial_port || "").trim();

  ["portSelect", "serialPortSelect"].forEach(id => {
    const select = $(id);
    select.innerHTML = "";
    ports.forEach(port => {
      const option = document.createElement("option");
      option.value = port.port;
      option.textContent = `${port.port} - ${port.name}`;
      select.appendChild(option);
    });
  });
  if (!ports.length) {
    writeStartupTrace("loadPorts done: no ports found");
    return data;
  }
  const selectedPort = choosePreferredSerialPort(ports, preferredPort);
  if (selectedPort && available.has(selectedPort)) {
    await applySelectedSerialPort(selectedPort, false);
  }
  writeStartupTrace(`loadPorts done: ${ports.length} port(s), selected=${selectedPort || "-"}`);
  return data;
}

function appendStatus(id, title, value) {
  const target = $(id);
  const cleaned = sanitizeStatusValue(value);
  const block = `${title}\n${typeof cleaned === "string" ? cleaned : JSON.stringify(cleaned, null, 2)}`;
  target.textContent = target.textContent ? `${target.textContent}\n\n${block}` : block;
  scrollOutputToEnd(id);
}

function sanitizeStatusValue(value) {
  if (typeof value === "string") {
    return sanitizeSerialLine(value);
  }
  if (Array.isArray(value)) {
    return value.map(item => sanitizeStatusValue(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, sanitizeStatusValue(val)]));
  }
  return value;
}

function syncFirmwareActions() {
  const source = $("packageSource").value;
  const packageDir = $("packageDir");
  const versionGroup = $("packageVersionGroup");
  $("updateWebfilesBtn").disabled = source === "open";
  if (source === "open") {
    packageDir.readOnly = false;
    packageDir.placeholder = "C:\\Brautomat32\\build\\ESP32-IDF5";
    versionGroup.classList.add("hidden-panel");
    $("eraseFlashSelect").checked = false;
    $("littlefsSelect").checked = false;
    const openDir = openPackageDirValue();
    if (!packageDir.value || packageDir.value.startsWith("http://") || packageDir.value.startsWith("https://")) {
      packageDir.value = openDir;
    }
  } else {
    packageDir.readOnly = true;
    packageDir.placeholder = "https://raw.githubusercontent.com/InnuendoPi/Brautomat32/main/build/ESP32-IDF5";
    versionGroup.classList.toggle("hidden-panel", source !== "special");
  }
  syncFlashOptionDependencies();
  updateFlashBackupWarning();
}

function syncFlashOptionDependencies() {
  const erase = $("eraseFlashSelect");
  const littlefs = $("littlefsSelect");
  if (!erase || !littlefs) return;
  if (erase.checked) {
    littlefs.checked = true;
    littlefs.disabled = true;
  } else {
    littlefs.disabled = false;
  }
}

function updateFlashBackupWarning() {
  syncFlashOptionDependencies();
  const warning = $("flashBackupWarning");
  if (!warning) return;
  const active = !!($("eraseFlashSelect")?.checked || $("littlefsSelect")?.checked);
  warning.textContent = text("flashBackupWarning");
  warning.classList.toggle("hidden-panel", !active);
}

function setProgressState(panelId, barId, textId, value = 0, visible = false, fileName = "", fileId = null, titleId = null) {
  const panel = $(panelId);
  const bar = $(barId);
  const textNode = $(textId);
  const fileNode = $(fileId || "firmwareProgressFile");
  const titleNode = $(titleId || "firmwareProgressTitle");
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  panel.classList.toggle("hidden", !visible);
  bar.style.width = `${clamped}%`;
  textNode.textContent = `${Math.round(clamped)}%`;
  if (titleNode) {
    titleNode.textContent = text("firmwareProgressTitle");
  }
  if (fileNode) {
    fileNode.textContent = fileName || "";
  }
}

function updateDeviceConnectionState(state) {
  const node = $("deviceConnectionState");
  const button = $("checkDevice");
  const normalized = ["online", "serial", "offline", "checking"].includes(state) ? state : "offline";
  node.dataset.state = normalized;
  node.className = `connection-state ${normalized || ""}`.trim();
  if (button) {
    button.className = normalized || "";
  }
  if (normalized === "online") {
    node.textContent = text("checkDeviceOnline");
    return;
  }
  if (normalized === "serial") {
    node.textContent = text("checkDeviceSerial");
    return;
  }
  if (normalized === "offline") {
    node.textContent = text("checkDeviceNone");
    return;
  }
  if (normalized === "checking") {
    node.textContent = text("checkDeviceChecking");
    return;
  }
  node.textContent = text("checkDeviceNone");
}

function updateActiveProcessState(data = null) {
  const node = $("activeProcessState");
  if (!node) return;
  const process = data?.active_process || {};
  const active = process.state === "active";
  node.classList.toggle("hidden-panel", !active);
  node.dataset.state = active ? "active" : "idle";
  if (!active) {
    node.textContent = "";
    node.title = "";
    return;
  }
  const mode = process.mode === "fermenter" ? "fermenter" : "mash";
  const label = mode === "fermenter" ? text("activeProcessFermenter") : text("activeProcessMash");
  const step = String(process.step || "").trim();
  const stateLabel = process.pause || process.play ? `${label} ${text("activeProcessWaiting")}` : label;
  node.textContent = step ? `${stateLabel}: ${step}` : stateLabel;
  const remaining = formatProcessRemainingTooltip(process.remaining_sec);
  node.title = [String(process.name || "").trim(), remaining].filter(Boolean).join(" · ");
}

function formatProcessRemainingTooltip(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) return "";
  const minutes = Math.ceil(seconds / 60);
  return minutes > 0 ? `~${minutes} min` : "";
}

async function pollActiveProcess() {
  if (activeProcessPollInFlight) return;
  if (!deviceIsOnline()) {
    updateActiveProcessState(null);
    return;
  }
  activeProcessPollInFlight = true;
  try {
    const process = await api("/api/device/process", {
      method: "POST",
      body: { base_url: effectiveDeviceBaseUrl() }
    });
    lastDeviceStatus = { ...lastDeviceStatus, active_process: process };
    updateActiveProcessState(lastDeviceStatus);
  } catch (_err) {
    updateActiveProcessState(null);
  } finally {
    activeProcessPollInFlight = false;
  }
}

function updateDeviceVersionMeta(data = null) {
  const node = $("deviceConnectionState");
  const field = $("activeFirmware");
  const version = String(data?.firmware || "").trim();
  const source = String(data?.version_source || data?.transport || "").trim();
  const tooltip = version ? (source ? `${version} (${source})` : version) : "";
  if (node) node.title = tooltip;
  if (field) field.textContent = version || text("activeFirmwareUnknown");
}

function parseDeviceFirmwareVersion(version) {
  const match = String(version || "").match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3] || 0)];
}

function compareVersionTuple(a, b) {
  for (let i = 0; i < 3; i += 1) {
    const left = Number(a?.[i] || 0);
    const right = Number(b?.[i] || 0);
    if (left !== right) return left - right;
  }
  return 0;
}

function requireWifiServiceFirmware(inlineStatusId = "wifiInlineStatus", targetId = "firmwareStatus") {
  const parsed = parseDeviceFirmwareVersion(lastDeviceStatus?.firmware || "");
  if (!parsed) {
    const message = currentLang === "de"
      ? "WLAN-Aktion über diesen Gerätepfad nicht verfügbar. Gerät prüfen oder anderen Verbindungsweg verwenden."
      : "WiFi action is not available over the current device path. Check the device or use a different connection path.";
    if (inlineStatusId) setInlineStatus(inlineStatusId, message);
    if (targetId) appendStatus(targetId, text("wifiTitle"), message);
    return false;
  }
  if (compareVersionTuple(parsed, [1, 62, 0]) >= 0) return true;
  const message = currentLang === "de"
    ? "WLAN-Aktion über diese Geräteversion nicht verfügbar. Bitte anderen Verbindungsweg verwenden oder Firmware aktualisieren."
    : "WiFi action is not available for this device version. Use a different connection path or update firmware.";
  if (inlineStatusId) setInlineStatus(inlineStatusId, message);
  if (targetId) appendStatus(targetId, text("wifiTitle"), message);
  return false;
}

function serialDeviceAvailable() {
  return Boolean(($("portSelect") && $("portSelect").value) || ($("serialPortSelect") && $("serialPortSelect").value));
}

function shouldUseHostWifiFallback() {
  const state = $("deviceConnectionState")?.dataset?.state || "";
  const firmware = String(lastDeviceStatus?.firmware || "").trim();
  const parsed = parseDeviceFirmwareVersion(firmware);
  if (state === "online") {
    return !firmware;
  }
  if (state === "serial") {
    return !(parsed && compareVersionTuple(parsed, [1, 62, 0]) >= 0);
  }
  return true;
}

async function checkDevice(options = {}) {
  if (checkDeviceInFlight) {
    writeStartupTrace("checkDevice join existing request");
    return checkDeviceInFlight;
  }
  const useGlobalSpinner = options.globalSpinner !== false;
  let globalSpinnerHandedOff = false;
  let globalSpinnerDone = false;
  const finishGlobalSpinner = () => {
    if (!useGlobalSpinner || globalSpinnerDone) return;
    globalSpinnerDone = true;
    appStartupTaskDone();
  };
  if (useGlobalSpinner) {
    appStartupTaskStart(currentLang === "de" ? "Gerät wird geprüft ..." : "Checking device ...");
  }
  checkDeviceInFlight = (async () => {
  const refreshPorts = options.refreshPorts !== false;
  const serialTimeout = Number(options.serialTimeout || 12);
  const preferSerial = options.preferSerial === true;
  const silent = options.silent === true;
  const keepVisibleState = options.keepVisibleState === true;
  writeStartupTrace(`checkDevice start: url=${$("deviceUrl").value.trim() || "-"} port=${$("portSelect").value || $("serialPortSelect").value || "-"}`);
  if (!silent && !keepVisibleState) {
    updateDeviceConnectionState("checking");
  }
  setButtonsDisabled(["checkDevice"], true);
  try {
    if (refreshPorts) {
      await loadPorts();
    }
    const data = await api("/api/device/status", {
      method: "POST",
      body: {
        base_url: $("deviceUrl").value,
        serial_port: $("portSelect").value || $("serialPortSelect").value || "",
        serial_baud: 115200,
        serial_timeout: serialTimeout,
        prefer_serial: preferSerial
      }
    });
    lastDeviceStatus = { ...lastDeviceStatus, ...data };
    updateDeviceConnectionState(data?.state || (serialDeviceAvailable() ? "serial" : "offline"));
    updateDeviceVersionMeta(data);
    updateActiveProcessState(data);
    if (data?.state === "online") {
      checkFirmwareUpdate(false).catch(console.error);
    }
    writeStartupTrace(`checkDevice done: state=${data?.state || "-"} transport=${data?.transport || "-"} firmware=${String(data?.firmware || "").trim() || "-"}`);
    if (data?.state === "serial" && !pendingOnlineUpgradeCheck) {
      writeStartupTrace("checkDevice schedules online upgrade check");
      pendingOnlineUpgradeCheck = window.setTimeout(async () => {
        pendingOnlineUpgradeCheck = null;
        for (let attempt = 1; attempt <= 3; attempt += 1) {
          try {
            const onlineData = await api("/api/device/status", {
              method: "POST",
              body: {
                base_url: $("deviceUrl").value,
                serial_port: "",
                serial_baud: 115200,
                serial_timeout: 5,
                prefer_serial: false
              }
            });
            if (onlineData?.state === "online") {
              lastDeviceStatus = { ...lastDeviceStatus, ...onlineData };
              updateDeviceConnectionState("online");
              updateDeviceVersionMeta(onlineData);
              updateActiveProcessState(onlineData);
              checkFirmwareUpdate(false).catch(console.error);
              writeStartupTrace("online upgrade check done: state=online");
              break;
            }
            if (attempt >= 3) {
              writeStartupTrace(`online upgrade check ignored: state=${onlineData?.state || "-"}`);
              break;
            }
          } catch (_err) {
            if (attempt >= 3) {
              writeStartupTrace("online upgrade check not reachable");
              break;
            }
          }
          await sleep(2500);
        }
      }, 2500);
    }
    if (pendingFirmwareTabWifiRefresh) {
      pendingFirmwareTabWifiRefresh = false;
      const firmwareTabActive = document.querySelector('.tab.active')?.dataset?.tab === "firmware";
      const spinner = $("wifiSpinner");
      const isScanning = spinner && !spinner.classList.contains("hidden-spinner");
      const firmwareKnown = !!String(data?.firmware || "").trim();
      if (firmwareTabActive && !isScanning && ["serial", "online"].includes(String(data?.state || "").trim()) && firmwareKnown) {
        writeStartupTrace("checkDevice schedules wifi scan");
        globalSpinnerHandedOff = true;
        window.setTimeout(() => {
          scanWifi(true, false, { globalSpinner: useGlobalSpinner }).catch(console.error);
        }, 250);
      } else if (firmwareTabActive && ["serial", "online"].includes(String(data?.state || "").trim()) && !firmwareKnown) {
        writeStartupTrace("checkDevice skips auto wifi scan: firmware unknown");
        finishGlobalSpinner();
      } else if (firmwareTabActive && !["serial", "online"].includes(String(data?.state || "").trim())) {
        writeStartupTrace(`checkDevice skips auto wifi scan: state=${data?.state || "-"}`);
        finishGlobalSpinner();
      }
    } else {
      finishGlobalSpinner();
    }
  } catch (_err) {
    lastDeviceStatus = {
      state: serialDeviceAvailable() ? "serial" : "offline",
      firmware: "",
      transport: "",
      version_source: ""
    };
    updateDeviceConnectionState(serialDeviceAvailable() ? "serial" : "offline");
    updateDeviceVersionMeta(null);
    updateActiveProcessState(null);
    writeStartupTrace(`checkDevice failed: fallback-state=${serialDeviceAvailable() ? "serial" : "offline"}`);
  } finally {
    setButtonsDisabled(["checkDevice"], false);
  }
  })();
  try {
    return await checkDeviceInFlight;
  } finally {
    checkDeviceInFlight = null;
    if (!globalSpinnerHandedOff) {
      finishGlobalSpinner();
    }
  }
}

function openDeviceUrl() {
  const raw = effectiveDeviceBaseUrl();
  const target = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `http://${raw}`;
  window.open(target, "_blank", "noopener,noreferrer");
}

function scheduleDeviceCheck(delay = 1200) {
  window.setTimeout(() => {
    checkDevice().catch(console.error);
  }, delay);
}

function scheduleDeviceCheckUntilOnline(delay = 2500, attempts = 6, interval = 2500) {
  window.setTimeout(async () => {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        await checkDevice({
          preferSerial: false,
          serialTimeout: 2,
          globalSpinner: false,
          silent: true,
          keepVisibleState: true
        });
      } catch (err) {
        console.error(err);
      }
      if (($("deviceConnectionState")?.dataset?.state || "") === "online") {
        return;
      }
      if (attempt < attempts - 1) {
        await sleep(interval);
      }
    }
  }, delay);
}

function scheduleWifiRescan(delay = 2600) {
  window.setTimeout(() => {
    scanWifi(true).catch(console.error);
  }, delay);
}

async function refreshAfterFirmwareUpdate() {
  try {
    await checkDevice();
  } catch (err) {
    console.error(err);
  }
  try {
    await loadRepoLanguages();
  } catch (err) {
    console.error(err);
  }
  try {
    await Promise.all(Object.keys(MANAGEMENT_KINDS).map(kind => loadInventory(kind)));
  } catch (err) {
    console.error(err);
  }
  try {
    const canProbe = deviceIsOnline() || serialDeviceAvailable();
    if (canProbe) {
      await scanWifi(true, false);
    }
  } catch (err) {
    console.error(err);
  }
}

function scheduleRefreshAfterFirmwareUpdate(delay = 2200) {
  window.setTimeout(() => {
    refreshAfterFirmwareUpdate().catch(console.error);
  }, delay);
}

async function createBackup() {
  try {
    if (!requireOnlineForDeviceAction("backupInlineStatus", "backupRestoreStatus", text("backupTitle"))) {
      return;
    }
    setSpinner("backupSpinner", true);
    setInlineStatus("backupInlineStatus", currentLang === "de" ? "Erstelle Backup. Bitte warten ..." : "Creating backup. Please wait ...");
    const data = await api("/api/backup", { method: "POST", body: { base_url: $("deviceUrl").value, include_api: $("includeApi").checked } });
    setStatus("backupRestoreStatus", "");
    appendStatus("backupRestoreStatus", text("backupTitle"), { job_started: data.job_id, status: "running" });
    watchJobToTarget(data.job_id, "backupRestoreStatus", text("backupTitle"), "backupInlineStatus", ["backupBtn"]).then(() => loadBackups().catch(console.error));
  } catch (err) {
    appendStatus("backupRestoreStatus", text("backupTitle"), String(err));
    setInlineStatus("backupInlineStatus", `Error: ${String(err)}`);
    setSpinner("backupSpinner", false);
  }
}

async function runRestore() {
  if (!requireOnlineForDeviceAction("backupInlineStatus", "backupRestoreStatus", text("restoreTitle"))) {
    return;
  }
  try {
    setSpinner("backupSpinner", true);
    setInlineStatus("backupInlineStatus", currentLang === "de" ? "Führe Restore aus. Bitte warten ..." : "Running restore. Please wait ...");
    const selected = selectedBackup();
    const file = $("restoreFile").files[0];
    let data;
    if (selected) {
      data = await api("/api/backups/restore", {
        method: "POST",
        body: { base_url: $("deviceUrl").value, filename: selected }
      });
    } else if (file) {
      const content = await file.arrayBuffer();
      data = await api("/api/restore", {
        method: "POST",
        body: {
          base_url: $("deviceUrl").value,
          filename: file.name,
          content_b64: arrayBufferToBase64(content)
        }
      });
    } else {
      setInlineStatus("backupInlineStatus", currentLang === "de" ? "Keine Backup-Datei ausgewählt." : "No backup file selected.");
      return;
    }
    setStatus("backupRestoreStatus", "");
    appendStatus("backupRestoreStatus", text("restoreTitle"), { job_started: data.job_id, status: "running" });
    watchJobToTarget(data.job_id, "backupRestoreStatus", text("restoreTitle"), "backupInlineStatus", ["restoreBtn"]);
  } catch (err) {
    appendStatus("backupRestoreStatus", text("restoreTitle"), String(err));
    setInlineStatus("backupInlineStatus", `Error: ${String(err)}`);
  } finally {
  }
}

function chooseRestoreFile() {
  $("restoreFile").click();
}

async function renameBackup() {
  const selected = selectedBackup();
  if (!selected) {
    setInlineStatus("backupInlineStatus", currentLang === "de" ? "Kein Backup ausgewählt." : "No backup selected.");
    return;
  }
  const next = window.prompt(currentLang === "de" ? "Neuer Dateiname" : "New filename", selected);
  if (!next || next.trim() === "" || next.trim() === selected) return;
  try {
    await api("/api/backups/rename", { method: "POST", body: { filename: selected, new_name: next.trim() } });
    await loadBackups();
    setInlineStatus("backupInlineStatus", currentLang === "de" ? "Backup umbenannt." : "Backup renamed.");
  } catch (err) {
    appendStatus("backupRestoreStatus", text("backupTitle"), String(err));
    setInlineStatus("backupInlineStatus", `Error: ${String(err)}`);
  }
}

async function deleteBackup() {
  const selected = selectedBackup();
  if (!selected) {
    setInlineStatus("backupInlineStatus", currentLang === "de" ? "Kein Backup ausgewählt." : "No backup selected.");
    return;
  }
  const confirmed = window.confirm(currentLang === "de" ? `Backup löschen: ${selected}?` : `Delete backup: ${selected}?`);
  if (!confirmed) return;
  try {
    await api("/api/backups/delete", { method: "POST", body: { filename: selected } });
    await loadBackups();
    setInlineStatus("backupInlineStatus", currentLang === "de" ? "Backup gelöscht." : "Backup deleted.");
  } catch (err) {
    appendStatus("backupRestoreStatus", text("backupTitle"), String(err));
    setInlineStatus("backupInlineStatus", `Error: ${String(err)}`);
  }
}

async function resetWifi() {
  setButtonsDisabled(["wifiResetBtn", "wifiScanBtn", "wifiSaveBtn"], true);
  try {
    const provisioning = currentSerialProvisioning();
    if (provisioning.serial_port && !requireSerialPortForAction(provisioning.serial_port, "wifiInlineStatus", "firmwareStatus", text("wifiTitle"))) {
      return;
    }
    setSpinner("wifiSpinner", true);
    setInlineStatus("wifiInlineStatus", "Resetting WiFi credentials...");
    appendStatus("firmwareStatus", text("wifiTitle"), "Resetting WiFi credentials...");
    const data = await api("/api/wifi/reset", { method: "POST", body: { base_url: effectiveDeviceBaseUrl(), ...provisioning } });
    appendStatus("firmwareStatus", text("wifiTitle"), data);
    const verification = data && typeof data === "object" ? data.verification : null;
    if (verification && verification.result === "failed") {
      setInlineStatus("wifiInlineStatus", "WiFi reset successful. Device returned to config portal.");
    } else if (verification && verification.result === "success") {
      setInlineStatus("wifiInlineStatus", "WiFi reset successful.");
    } else if (verification && verification.result === "unknown") {
      setInlineStatus("wifiInlineStatus", "WiFi reset completed. Final state could not be verified.");
    } else {
      setInlineStatus("wifiInlineStatus", "WiFi credentials reset.");
    }
  } catch (err) {
    appendStatus("firmwareStatus", text("wifiTitle"), String(err));
    setInlineStatus("wifiInlineStatus", `Error: ${String(err)}`);
  } finally {
    setSpinner("wifiSpinner", false);
    setButtonsDisabled(["wifiResetBtn", "wifiScanBtn", "wifiSaveBtn"], false);
  }
}

async function scanWifi(forceRefresh = true, allowHostFallback = true, options = {}) {
  const useGlobalSpinner = options.globalSpinner === true;
  if (useGlobalSpinner) {
    if ($("appLoadingText")) $("appLoadingText").textContent = currentLang === "de" ? "WLAN wird geprüft ..." : "Checking WiFi ...";
    $("appLoadingOverlay")?.classList.remove("hidden-panel");
  }
  writeStartupTrace(`scanWifi start: refresh=${forceRefresh} hostFallback=${allowHostFallback}`);
  setButtonsDisabled(["wifiResetBtn", "wifiScanBtn", "wifiSaveBtn"], true);
  try {
    setSpinner("wifiSpinner", true);
    const select = $("wifiNetworks");
    select.innerHTML = "";
    const pending = document.createElement("option");
    pending.value = "";
    pending.textContent = "Scanning WiFi networks. Please wait ...";
    select.appendChild(pending);
    setInlineStatus("wifiInlineStatus", "Scanning WiFi networks. Please wait ...");
    appendStatus("firmwareStatus", text("wifiTitle"), "Scanning WiFi networks. Please wait ...");
    if (allowHostFallback && shouldUseHostWifiFallback()) {
      const data = await api("/api/wifi/host-scan", { method: "POST", body: {} });
      applyWifiNetworksResult(data);
      writeStartupTrace(`scanWifi done: transport=host status=${data.status || "-"} networks=${Array.isArray(data.networks) ? data.networks.length : 0}`);
      setInlineStatus(
        "wifiInlineStatus",
        currentLang === "de"
          ? "Netzwerke vom lokalen Rechner gelesen."
          : "Networks read from the local computer."
      );
      appendStatus("firmwareStatus", text("wifiTitle"), data);
      return;
    }
    let transport = wifiTransportProvisioning();
    let data;
    const initialState = $("deviceConnectionState")?.dataset?.state || "";
    const requestScan = () => api("/api/wifi/scan", {
      method: "POST",
      body: { base_url: effectiveDeviceBaseUrl(), refresh: forceRefresh, ...transport }
    });
    try {
      if (transport.serial_port && !requireSerialPortForAction(transport.serial_port, "wifiInlineStatus", "firmwareStatus", text("wifiTitle"))) {
        return;
      }
      data = await requestScan();
      writeStartupTrace(`scanWifi first response: transport=${data.transport || "-"} status=${data.status || "-"} networks=${Array.isArray(data.networks) ? data.networks.length : 0}`);
    } catch (err) {
      const message = String(err || "");
      if (!transport.serial_port || !/No serial response/i.test(message)) {
        throw err;
      }
      await sleep(1200);
      data = await requestScan().catch(async retryErr => {
        const retryMessage = String(retryErr || "");
        if (!/No serial response/i.test(retryMessage)) {
          throw retryErr;
        }
        await sleep(1200);
        return requestScan();
      }).catch(async retryErr => {
        const retryMessage = String(retryErr || "");
        if (!/No serial response/i.test(retryMessage)) {
          throw retryErr;
        }
        try {
          await checkDevice();
        } catch (_ignored) {}
        const refreshedState = $("deviceConnectionState")?.dataset?.state || "";
        if (initialState !== "online" && refreshedState !== "online") {
          throw new Error(currentLang === "de"
            ? "Keine serielle Antwort. COM-Port und Firmware prüfen."
            : "No serial response. Check COM port and firmware.");
        }
        transport = { serial_port: "", serial_baud: Number($("serialBaudSelect").value || 115200) };
        return api("/api/wifi/scan", {
          method: "POST",
          body: { base_url: effectiveDeviceBaseUrl(), refresh: forceRefresh, ...transport }
        });
      });
    }

    if (data.status === "running" && !(Array.isArray(data.networks) && data.networks.length)) {
      writeStartupTrace("scanWifi polling for completion");
      setInlineStatus("wifiInlineStatus", data.transport === "http"
        ? "Connected. Scanning WiFi networks. Please wait ..."
        : "Scanning WiFi networks. Please wait ...");
      const maxPollAttempts = 24;
      for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
        await sleep(900);
        data = await api("/api/wifi/scan", {
          method: "POST",
          body: {
            base_url: effectiveDeviceBaseUrl(),
            refresh: false,
            serial_port: data.transport === "serial" ? transport.serial_port : "",
            serial_baud: data.transport === "serial" ? transport.serial_baud : Number($("serialBaudSelect").value || 115200)
          }
        });
        if (data.status !== "running") break;
      }
      if (data.status === "running") {
        writeStartupTrace("scanWifi polling timed out");
        throw new Error(currentLang === "de"
          ? "WLAN-Scan hat nicht rechtzeitig abgeschlossen. Bitte erneut versuchen."
          : "WiFi scan did not finish in time. Please try again.");
      }
    }

    if (data.transport === "http") {
      try {
        const credentials = await api("/api/wifi/credentials", {
          method: "POST",
          body: { base_url: effectiveDeviceBaseUrl(), serial_port: "", serial_baud: Number($("serialBaudSelect").value || 115200) }
        });
        const preferredSsid = String(credentials?.ssid || credentials?.SSID || credentials?.current_ssid || "").trim();
        if (preferredSsid) {
          data.preferred_ssid = preferredSsid;
        }
      } catch (err) {
        console.error(err);
      }
    }
    applyWifiNetworksResult(data);
    writeStartupTrace(`scanWifi done: transport=${data.transport || "-"} status=${data.status || "-"} networks=${Array.isArray(data.networks) ? data.networks.length : 0}`);
    appendStatus("firmwareStatus", text("wifiTitle"), data);
  } catch (err) {
    writeStartupTrace(`scanWifi failed: ${String(err)}`);
    appendStatus("firmwareStatus", text("wifiTitle"), String(err));
    setInlineStatus("wifiInlineStatus", `Error: ${String(err)}`);
  } finally {
    setSpinner("wifiSpinner", false);
    setButtonsDisabled(["wifiResetBtn", "wifiScanBtn", "wifiSaveBtn"], false);
    if (useGlobalSpinner) appStartupTaskDone();
  }
}

async function saveWifi() {
  setButtonsDisabled(["wifiResetBtn", "wifiScanBtn", "wifiSaveBtn"], true);
  try {
    const transport = wifiTransportProvisioning();
    if (transport.serial_port && !requireSerialPortForAction(transport.serial_port, "wifiInlineStatus", "firmwareStatus", text("wifiTitle"))) {
      return;
    }
    setSpinner("wifiSpinner", true);
    setInlineStatus("wifiInlineStatus", "Credentials saved, rebooting. Please wait ...");
    appendStatus("firmwareStatus", text("wifiTitle"), {
      status: "Credentials saved, rebooting. Please wait ...",
      ssid: $("wifiSsid").value
    });
      const data = await api("/api/wifi/save", {
        method: "POST",
        body: {
          base_url: effectiveDeviceBaseUrl(),
          ssid: $("wifiSsid").value,
          password: $("wifiPassword").value,
          ...transport
        }
      });
    appendStatus("firmwareStatus", text("wifiTitle"), data);
    const verification = data && typeof data === "object" ? data.verification : null;
    if (verification && verification.result === "success") {
      setInlineStatus("wifiInlineStatus", "WLAN configuration successful");
      lastDeviceStatus = { ...lastDeviceStatus, state: "online", transport: "http" };
      updateDeviceConnectionState("online");
    } else if (verification && verification.result === "failed") {
      setInlineStatus("wifiInlineStatus", "Credentials saved, but WiFi connection failed. Device returned to config portal.");
    } else if (verification && verification.result === "unknown") {
      setInlineStatus("wifiInlineStatus", "Credentials saved. Reboot scheduled, but final state could not be verified.");
      } else {
        setInlineStatus("wifiInlineStatus", "Credentials saved. Device reboot scheduled.");
      }
      scheduleDeviceCheckUntilOnline(2500, 6, 2500);
    } catch (err) {
      appendStatus("firmwareStatus", text("wifiTitle"), String(err));
      setInlineStatus("wifiInlineStatus", `Error: ${String(err)}`);
  } finally {
    setSpinner("wifiSpinner", false);
    setButtonsDisabled(["wifiResetBtn", "wifiScanBtn", "wifiSaveBtn"], false);
  }
}

async function startFlash() {
  try {
    if (!requireSerialPortForAction($("portSelect").value, "flashInlineStatus", "firmwareStatus", text("flashTitle"), { allowRunningMonitor: true })) {
      return;
    }
    setSpinner("flashSpinner", true);
    setInlineStatus("flashInlineStatus", "Preparing firmware flash...");
    setProgressState("firmwareProgressPanel", "firmwareProgressBar", "firmwareProgressText", 0, true);
    const data = await api("/api/flash", {
      method: "POST",
      body: {
        port: $("portSelect").value,
        baud: Number($("baudSelect").value),
        package_source: $("packageSource").value,
        package_ref: $("packageVersion").value || "",
        package_dir: $("packageDir").value,
        erase_flash: $("eraseFlashSelect").checked,
        include_littlefs: $("littlefsSelect").checked
      }
    });
    setStatus("firmwareStatus", "");
    appendStatus("firmwareStatus", text("flashTitle"), { job_started: data.job_id, status: "running" });
    watchJobToTarget(data.job_id, "firmwareStatus", text("flashTitle"), "flashInlineStatus");
  } catch (err) {
    setProgressState("firmwareProgressPanel", "firmwareProgressBar", "firmwareProgressText", 0, false);
    appendStatus("firmwareStatus", text("flashTitle"), String(err));
    setInlineStatus("flashInlineStatus", `Error: ${String(err)}`);
    setSpinner("flashSpinner", false);
  }
}

async function backupCurrentFirmware() {
  try {
    if (!requireOnlineForDeviceAction("firmwareBackupInlineStatus", "backupRestoreStatus", text("firmwareBackupTitle"))) {
      return;
    }
    if (!requireSerialPortForAction($("portSelect").value, "firmwareBackupInlineStatus", "backupRestoreStatus", text("firmwareBackupTitle"), { allowRunningMonitor: true })) {
      return;
    }
    setSpinner("firmwareBackupSpinner", true);
    setInlineStatus("firmwareBackupInlineStatus", currentLang === "de" ? "Sichere Firmware. Bitte warten ..." : "Backing up firmware. Please wait ...");
    const data = await api("/api/firmware/backup", {
      method: "POST",
      body: {
        base_url: $("deviceUrl").value,
        port: $("portSelect").value,
        baud: Number($("baudSelect").value)
      }
      });
      setStatus("backupRestoreStatus", "");
      appendStatus("backupRestoreStatus", text("firmwareBackupTitle"), { job_started: data.job_id, status: "running" });
    watchJobToTarget(data.job_id, "backupRestoreStatus", text("firmwareBackupTitle"), "firmwareBackupInlineStatus", ["backupFirmwareBtn"]);
  } catch (err) {
    appendStatus("backupRestoreStatus", text("firmwareBackupTitle"), String(err));
    setInlineStatus("firmwareBackupInlineStatus", `Error: ${String(err)}`);
    setSpinner("firmwareBackupSpinner", false);
  }
}

async function updateWebfiles() {
  setButtonsDisabled(["updateWebfilesBtn"], true);
  try {
    if (!requireOnlineForDeviceAction("webfilesInlineStatus", "firmwareStatus", text("webfilesTitle"))) {
      setButtonsDisabled(["updateWebfilesBtn"], false);
      return;
    }
    const source = $("packageSource").value;
    if (source === "open") {
      setSpinner("webfilesSpinner", false);
      setProgressState("webfilesProgressPanel", "webfilesProgressBar", "webfilesProgressText", 0, false, "", "webfilesProgressFile", "webfilesProgressTitle");
      appendStatus("firmwareStatus", text("webfilesTitle"), "Web files update supports only Latest Release and Latest Development.");
      setInlineStatus("webfilesInlineStatus", "Open directory is not supported for web files update.");
      setButtonsDisabled(["updateWebfilesBtn"], false);
      return;
    }
      setSpinner("webfilesSpinner", true);
    setInlineStatus("webfilesInlineStatus", "Updating web files. Please wait ...");
    setProgressState("webfilesProgressPanel", "webfilesProgressBar", "webfilesProgressText", 0, true, "", "webfilesProgressFile", "webfilesProgressTitle");
    const data = await api("/api/webfiles/update", {
      method: "POST",
      body: {
        base_url: $("deviceUrl").value,
        package_source: source,
        package_ref: $("packageVersion").value || ""
      }
    });
    setStatus("firmwareStatus", "");
    appendStatus("firmwareStatus", text("webfilesTitle"), { job_started: data.job_id, status: "running", source });
    watchJobToTarget(
      data.job_id,
      "firmwareStatus",
      text("webfilesTitle"),
      "webfilesInlineStatus",
      ["updateWebfilesBtn"],
      {
        panelId: "webfilesProgressPanel",
        barId: "webfilesProgressBar",
        textId: "webfilesProgressText",
        fileId: "webfilesProgressFile",
        titleId: "webfilesProgressTitle"
      }
    );
  } catch (err) {
    setProgressState("webfilesProgressPanel", "webfilesProgressBar", "webfilesProgressText", 0, false, "", "webfilesProgressFile", "webfilesProgressTitle");
    appendStatus("firmwareStatus", text("webfilesTitle"), String(err));
    setInlineStatus("webfilesInlineStatus", `Error: ${String(err)}`);
    setSpinner("webfilesSpinner", false);
    setButtonsDisabled(["updateWebfilesBtn"], false);
  }
}

window.updateWebfiles = updateWebfiles;

async function installLanguage() {
  setButtonsDisabled(["updateWebfilesBtn", "installLanguageBtn"], true);
  try {
    if (!requireOnlineForDeviceAction("webfilesInlineStatus", "firmwareStatus", text("webfilesTitle"))) {
      setButtonsDisabled(["updateWebfilesBtn", "installLanguageBtn"], false);
      return;
    }
    const source = $("packageSource").value;
    if (source === "open") {
      setInlineStatus("webfilesInlineStatus", "Open directory is not supported for language install.");
      setButtonsDisabled(["updateWebfilesBtn", "installLanguageBtn"], false);
      return;
    }
    const filename = $("webfilesLanguage").value;
    if (!filename) {
      setInlineStatus("webfilesInlineStatus", "No language file selected.");
      setButtonsDisabled(["updateWebfilesBtn", "installLanguageBtn"], false);
      return;
    }
    setSpinner("webfilesSpinner", true);
    setInlineStatus("webfilesInlineStatus", "Installing language. Please wait ...");
    setProgressState("webfilesProgressPanel", "webfilesProgressBar", "webfilesProgressText", 0, true, "", "webfilesProgressFile", "webfilesProgressTitle");
    const data = await api("/api/language/install", {
      method: "POST",
      body: {
        base_url: $("deviceUrl").value,
        package_source: source,
        package_ref: $("packageVersion").value || "",
        filename
      }
    });
    setStatus("firmwareStatus", "");
    appendStatus("firmwareStatus", text("webfilesTitle"), { job_started: data.job_id, status: "running", filename });
    watchJobToTarget(
      data.job_id,
      "firmwareStatus",
      text("installLanguageBtn"),
      "webfilesInlineStatus",
      ["updateWebfilesBtn", "installLanguageBtn"],
      {
        panelId: "webfilesProgressPanel",
        barId: "webfilesProgressBar",
        textId: "webfilesProgressText",
        fileId: "webfilesProgressFile",
        titleId: "webfilesProgressTitle"
      }
    );
  } catch (err) {
    setProgressState("webfilesProgressPanel", "webfilesProgressBar", "webfilesProgressText", 0, false, "", "webfilesProgressFile", "webfilesProgressTitle");
    appendStatus("firmwareStatus", text("webfilesTitle"), String(err));
    setInlineStatus("webfilesInlineStatus", `Error: ${String(err)}`);
    setSpinner("webfilesSpinner", false);
    setButtonsDisabled(["updateWebfilesBtn", "installLanguageBtn"], false);
  }
}

async function startMigration() {
  try {
    if (!requireOnlineForDeviceAction("migrationInlineStatus", "migrationStatus", text("migrationTitle"))) {
      return;
    }
    if (!requireSerialPortForAction($("portSelect").value, "migrationInlineStatus", "migrationStatus", text("migrationTitle"), { allowRunningMonitor: true })) {
      return;
    }
    setButtonsDisabled(["migrateBtn"], true);
    setSpinner("migrationSpinner", true);
    setInlineStatus(
      "migrationInlineStatus",
      currentLang === "de"
        ? "Migration gestartet. Bitte warten ..."
        : "Migration started. Please wait ..."
    );
    const data = await api("/api/migration", {
      method: "POST",
      body: {
        base_url: $("deviceUrl").value,
        include_api: true,
        port: $("portSelect").value,
        baud: Number($("baudSelect").value),
        package_source: $("packageSource").value,
        package_dir: $("packageDir").value,
        package_ref: $("packageVersion").value || "",
        include_littlefs: true,
        create_backup: true
      }
    });
    setStatus("migrationStatus", "");
    appendStatus("migrationStatus", text("migrationTitle"), { job_started: data.job_id, status: "running" });
    watchJobToTarget(data.job_id, "migrationStatus", text("migrationTitle"), "migrationInlineStatus", ["migrateBtn"]);
  } catch (err) {
    appendStatus("migrationStatus", text("migrationTitle"), String(err));
    setInlineStatus("migrationInlineStatus", `Error: ${String(err)}`);
    setSpinner("migrationSpinner", false);
    setButtonsDisabled(["migrateBtn"], false);
  }
}

function sanitizeSerialLine(line) {
  return String(line || "")
    .replace(/\u0000/g, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]+$/g, "")
    .replace(/\uFFFD+$/g, "")
    .replace(/\x1b\[[0-9;]*m/g, "");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderInnuLogLine(line) {
  const clean = sanitizeSerialLine(line);
  const timedMatch = clean.match(/^\[([^\]]+)\]\s+\[(E|I|V|W)\]\[([A-Z0-9]{3})\](.*)$/);
  if (timedMatch) {
    const levelMap = {
      E: "innulog-error",
      I: "innulog-info",
      V: "innulog-verbose",
      W: "innulog-warn"
    };
    const timestamp = timedMatch[1];
    const level = timedMatch[2];
    const tag = timedMatch[3];
    const rest = timedMatch[4] || "";
    return `<span class="innulog-line ${levelMap[level] || ""}"><span class="innulog-time">[${escapeHtml(timestamp)}]</span> [${level}]<span class="innulog-tag">[${escapeHtml(tag)}]</span>${escapeHtml(rest)}</span>`;
  }
  const match = clean.match(/^\[(E|I|V|W)\]\[([A-Z0-9]{3})\](.*)$/);
  if (!match) {
    return `<span class="innulog-line">${escapeHtml(clean)}</span>`;
  }
  const levelMap = {
    E: "innulog-error",
    I: "innulog-info",
    V: "innulog-verbose",
    W: "innulog-warn"
  };
  const level = match[1];
  const tag = match[2];
  const rest = match[3] || "";
  return `<span class="innulog-line ${levelMap[level] || ""}">[${level}]<span class="innulog-tag">[${escapeHtml(tag)}]</span>${escapeHtml(rest)}</span>`;
}

function renderSerial(serial) {
  updateSerialButtonState(serial);
  const lines = serial.lines || [];
  $("serialLog").innerHTML = lines.map(renderInnuLogLine).join("");
  scrollSerialLogToEnd();
}
async function pollSerial() { renderSerial(await api("/api/serial")); }
async function startSerial() {
  if (!requireSerialPortForAction($("serialPortSelect").value, null, "serialLog", text("serialTitle"), { allowRunningMonitor: true })) {
    return;
  }
  const snapshot = await api("/api/serial/start", { method: "POST", body: { port: $("serialPortSelect").value, baud: Number($("serialBaudSelect").value) } });
  renderSerial(snapshot);
}
async function stopSerial() {
  const snapshot = await api("/api/serial/stop", { method: "POST", body: {} });
  renderSerial(snapshot);
}
async function clearSerialLog() {
  const snapshot = await api("/api/serial/clear", { method: "POST", body: {} });
  renderSerial(snapshot);
}

function toggleSerialAutoscroll() {
  serialAutoscroll = !serialAutoscroll;
  updateSerialAutoscrollButton();
  if (serialAutoscroll) {
    scrollOutputToEnd("serialLog");
  }
}

function appendLocalSerialLine(message) {
  const log = $("serialLog");
  log.insertAdjacentHTML("beforeend", `<span class="innulog-line">${escapeHtml(message)}</span>`);
  scrollSerialLogToEnd();
}
async function rebootSerialDevice() {
  const serialPort = $("serialPortSelect").value || "";
  if (!deviceIsOnline() && !serialPort) {
    appendLocalSerialLine(`[${new Date().toISOString().replace("T", " ").replace("Z", "")}] Error: Device is not online and no serial port is selected`);
    return;
  }
  appendLocalSerialLine(`[${new Date().toISOString().replace("T", " ").replace("Z", "")}] Reboot device`);
  const result = await api("/api/device/reboot", {
    method: "POST",
    body: {
      base_url: $("deviceUrl").value,
      serial_port: serialPort,
      serial_baud: Number($("serialBaudSelect").value || 115200)
    }
  });
  if (result.transport === "http") {
    appendLocalSerialLine(`[${new Date().toISOString().replace("T", " ").replace("Z", "")}] Reboot via API`);
  } else if (result.transport === "serial") {
    appendLocalSerialLine(`[${new Date().toISOString().replace("T", " ").replace("Z", "")}] API reboot unavailable, fallback to serial`);
  }
}
async function copySerialLog() {
  const content = Array.from($("serialLog").querySelectorAll(".innulog-line"))
    .map(node => node.textContent || "")
    .join("\n");
  if (!content.trim()) return;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(content);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = content;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      textarea.style.pointerEvents = "none";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    appendLocalSerialLine(currentLang === "de" ? "Log in Zwischenablage kopiert" : "Log copied to clipboard");
  } catch (err) {
    appendLocalSerialLine(`${currentLang === "de" ? "Copy fehlgeschlagen" : "Copy failed"}: ${String(err)}`);
  }
}

async function copyPlainTextToClipboard(content) {
  if (!String(content || "").trim()) return;
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(content);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = content;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function clearOutputLog(id) {
  const node = $(id);
  if (node) node.textContent = "";
}

async function copyOutputLog(id) {
  const node = $(id);
  const content = String(node?.textContent || "");
  if (!content.trim()) return;
  try {
    await copyPlainTextToClipboard(content);
  } catch (err) {
    console.error(err);
  }
}

function updateSerialButtonState(serial) {
  const startBtn = $("serialStartBtn");
  if (!startBtn) return;
  const running = !!serial?.running;
  startBtn.classList.remove("success", "primary");
  startBtn.classList.add(running ? "success" : "primary");
}

function serialLogConflictsWithPort(port) {
  const startBtn = $("serialStartBtn");
  const running = !!(startBtn && startBtn.classList.contains("success"));
  return running && !!port && $("serialPortSelect").value === port;
}

async function watchJobToTarget(jobId, targetId, titleOverride = null, inlineStatusId = null, buttonsToEnable = [], progressConfig = null) {
  return await new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const job = await api(`/api/jobs/${jobId}`);
      const payload = {
        title: titleOverride || job.title,
        status: job.status,
        created_at: job.created_at,
        started_at: job.started_at,
        finished_at: job.finished_at,
        error: job.error,
        result: job.result,
        logs: job.logs
      };
      if (targetId === "firmwareStatus" && !progressConfig) {
        setProgressState(
          "firmwareProgressPanel",
          "firmwareProgressBar",
          "firmwareProgressText",
          job.progress || 0,
          true,
          job.current_file || ""
        );
      }
      if (progressConfig) {
        setProgressState(
          progressConfig.panelId,
          progressConfig.barId,
          progressConfig.textId,
          job.progress || 0,
          true,
          job.current_file || "",
          progressConfig.fileId,
          progressConfig.titleId
        );
      }
        if (inlineStatusId) {
          const runningTitle = titleOverride || job.title;
          if (job.status === "running" || job.status === "queued") {
            if (inlineStatusId === "webfilesInlineStatus") {
              const detail = runningTitle === text("installLanguageBtn")
                ? (job.current_file ? `Installing ${job.current_file} ...` : "Installing language. Please wait ...")
                : (job.current_file ? `Uploading ${job.current_file} ...` : "Updating web files. Please wait ...");
              setInlineStatus(inlineStatusId, detail);
            } else {
              if (inlineStatusId === "flashInlineStatus") {
                setInlineStatus(inlineStatusId, "Firmware Flash in progress. Please wait ...");
              } else if (inlineStatusId === "migrationInlineStatus") {
                setInlineStatus(inlineStatusId, currentLang === "de" ? "Migration läuft. Bitte warten ..." : "Migration in progress. Please wait ...");
              } else {
                const detail = job.current_file ? ` ${job.current_file}` : "";
                setInlineStatus(inlineStatusId, `${runningTitle}...${detail}`);
              }
            }
              } else if (job.status === "done") {
                if (inlineStatusId === "webfilesInlineStatus") {
                  setInlineStatus(inlineStatusId, runningTitle === text("installLanguageBtn") ? "Language installed and activated." : "Web files update completed.");
                } else if (inlineStatusId === "backupInlineStatus") {
                  setInlineStatus(
                    inlineStatusId,
                    runningTitle === text("restoreTitle")
                      ? (currentLang === "de" ? "Restore abgeschlossen." : "Restore completed.")
                      : (currentLang === "de" ? "Backup abgeschlossen." : "Backup completed.")
                  );
                } else if (inlineStatusId === "restoreInlineStatus") {
                  setInlineStatus(inlineStatusId, currentLang === "de" ? "Restore completed." : "Restore completed.");
                } else if (inlineStatusId === "firmwareBackupInlineStatus") {
                  setInlineStatus(inlineStatusId, currentLang === "de" ? "Firmware backup completed." : "Firmware backup completed.");
                } else if (inlineStatusId === "migrationInlineStatus") {
                  setInlineStatus(inlineStatusId, currentLang === "de" ? "Migration completed." : "Migration completed.");
                } else {
                  setInlineStatus(inlineStatusId, `${runningTitle} completed.`);
                }
                if (inlineStatusId === "flashInlineStatus") setSpinner("flashSpinner", false);
                if (inlineStatusId === "webfilesInlineStatus") setSpinner("webfilesSpinner", false);
                if (inlineStatusId === "backupInlineStatus") setSpinner("backupSpinner", false);
                if (inlineStatusId === "restoreInlineStatus") setSpinner("restoreSpinner", false);
                if (inlineStatusId === "firmwareBackupInlineStatus") setSpinner("firmwareBackupSpinner", false);
                if (inlineStatusId === "migrationInlineStatus") setSpinner("migrationSpinner", false);
                if (buttonsToEnable.length) setButtonsDisabled(buttonsToEnable, false);
                if (inlineStatusId === "flashInlineStatus") {
                  scheduleRefreshAfterFirmwareUpdate(2200);
                }
                if (inlineStatusId === "migrationInlineStatus") {
                  scheduleRefreshAfterFirmwareUpdate(3200);
                }
              } else if (job.status === "failed") {
              if (inlineStatusId === "webfilesInlineStatus") {
                setInlineStatus(inlineStatusId, `${runningTitle === text("installLanguageBtn") ? "Language install failed" : "Web files update failed"}: ${job.error || "unknown error"}`);
              } else {
                setInlineStatus(inlineStatusId, `${runningTitle} failed: ${job.error || "unknown error"}`);
              }
              if (inlineStatusId === "flashInlineStatus") setSpinner("flashSpinner", false);
              if (inlineStatusId === "webfilesInlineStatus") setSpinner("webfilesSpinner", false);
              if (inlineStatusId === "backupInlineStatus") setSpinner("backupSpinner", false);
              if (inlineStatusId === "restoreInlineStatus") setSpinner("restoreSpinner", false);
              if (inlineStatusId === "firmwareBackupInlineStatus") setSpinner("firmwareBackupSpinner", false);
              if (inlineStatusId === "migrationInlineStatus") setSpinner("migrationSpinner", false);
              if (buttonsToEnable.length) setButtonsDisabled(buttonsToEnable, false);
            }
        }
      setStatus(targetId, "");
      appendStatus(targetId, titleOverride || job.title, payload);
      if (job.status === "running" || job.status === "queued") {
        setTimeout(tick, 1200);
      } else if (targetId === "firmwareStatus" && !progressConfig) {
        setProgressState(
          "firmwareProgressPanel",
          "firmwareProgressBar",
          "firmwareProgressText",
          job.progress || 100,
          true,
          job.current_file || ""
        );
      } else if (progressConfig) {
        setProgressState(
          progressConfig.panelId,
          progressConfig.barId,
          progressConfig.textId,
          job.progress || 100,
          true,
          job.current_file || "",
          progressConfig.fileId,
          progressConfig.titleId
        );
      }
      if (job.status !== "running" && job.status !== "queued") {
        resolve(job);
      }
      } catch (err) {
        setStatus(targetId, String(err));
        if (buttonsToEnable.length) setButtonsDisabled(buttonsToEnable, false);
        reject(err);
      }
    };
    tick();
  });
}

function activateTab(name) {
  if (name === "testrunner" && hideTestRunnerViaQuery()) {
    return;
  }
  document.querySelectorAll(".tab").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === name));
  document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.toggle("active", panel.dataset.panel === name));
  if (name === "telegraf") {
    // Sofort aktualisieren, damit der Reiter beim Öffnen den aktuellen
    // Laufzustand und die Ausgabe zeigt, statt bis zum nächsten Poll zu warten.
    pollTelegraf().catch(console.error);
  }
  if (name === "firmware") {
    writeStartupTrace("activateTab firmware");
    const spinner = $("wifiSpinner");
    const select = $("wifiNetworks");
    const isScanning = spinner && !spinner.classList.contains("hidden-spinner");
    const hasNetworks = !!(select && select.options && select.options.length && select.options[0].value);
    const canProbe = deviceIsOnline() || serialDeviceAvailable();
    if (!isScanning && !hasNetworks && canProbe) {
      writeStartupTrace("activateTab firmware requests device check");
      pendingFirmwareTabWifiRefresh = true;
      checkDevice({
        refreshPorts: false,
        serialTimeout: 5,
        preferSerial: false
      }).catch(console.error);
    }
  }
  if (name === "management") {
    loadInventory(currentManagementKind()).catch(console.error);
  }
  if (name === "backup") {
    loadBackups().catch(console.error);
  }
  if (name === "telegraf") {
    pollTelegraf().catch(console.error);
  }
  if (name === "testrunner") {
    if (!testRunnerCatalog) {
      loadTestRunnerCatalog().catch(console.error);
    } else if (testRunnerCatalog.enabled) {
      loadTestRunnerStatus().catch(console.error);
    } else {
      loadPublicTestResults().catch(console.error);
    }
  }
}

function attachEvents() {
  $("language").value = currentLang;
  $("language").addEventListener("change", async () => {
    currentLang = $("language").value;
    await saveConfig({ language: currentLang });
    applyLanguage();
  });
  $("debugOutput").addEventListener("change", async () => {
    await saveConfig({ debug_output: $("debugOutput").checked });
    applyDebugPanels();
  });
  $("deviceUrl").addEventListener("change", async () => {
    await saveConfig({ device_url: $("deviceUrl").value.trim() || "http://brautomat.local" });
    updateDeviceConnectionState("");
  });
  $("checkDevice").addEventListener("click", checkDevice);
  $("openDeviceUrl").addEventListener("click", openDeviceUrl);
  $("checkServiceToolUpdate").addEventListener("click", () => checkServiceToolUpdate(true));
  $("openGuide").addEventListener("click", () => $("guideModal").classList.remove("hidden-panel"));
  $("closeGuide").addEventListener("click", () => $("guideModal").classList.add("hidden-panel"));
  $("closeServiceToolUpdate")?.addEventListener("click", closeServiceToolUpdateModal);
  $("cancelServiceToolUpdate")?.addEventListener("click", closeServiceToolUpdateModal);
  $("downloadServiceToolUpdate")?.addEventListener("click", downloadServiceToolUpdate);
  $("closeFirmwareUpdate")?.addEventListener("click", closeFirmwareUpdateModal);
  $("cancelFirmwareUpdate")?.addEventListener("click", closeFirmwareUpdateModal);
  $("startFirmwareWebUpdate")?.addEventListener("click", startFirmwareWebUpdate);
  $("closeInventoryDetail")?.addEventListener("click", () => {
    inventoryDetailState = null;
    $("inventoryDetailModal")?.classList.add("hidden-panel");
  });
  $("guideModal").addEventListener("click", event => {
    if (event.target === $("guideModal")) $("guideModal").classList.add("hidden-panel");
  });
  $("serviceToolUpdateModal")?.addEventListener("click", event => {
    if (event.target === $("serviceToolUpdateModal")) closeServiceToolUpdateModal();
  });
  $("firmwareUpdateModal")?.addEventListener("click", event => {
    if (event.target === $("firmwareUpdateModal")) closeFirmwareUpdateModal();
  });
  $("inventoryDetailModal")?.addEventListener("click", event => {
    if (event.target === $("inventoryDetailModal")) {
      inventoryDetailState = null;
      $("inventoryDetailModal").classList.add("hidden-panel");
    }
  });
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (inventoryConflictResolver && !$("inventoryConflictModal")?.classList.contains("hidden-panel")) {
      inventoryConflictResolver("abort");
      return;
    }
    ["inventoryDetailModal", "inventoryConflictModal", "guideModal", "serviceToolUpdateModal", "firmwareUpdateModal"].forEach(id => {
      const modal = $(id);
      if (modal && !modal.classList.contains("hidden-panel")) {
        if (id === "inventoryDetailModal") inventoryDetailState = null;
        modal.classList.add("hidden-panel");
      }
    });
  });
  $("backupBtn").addEventListener("click", createBackup);
  $("backupRenameBtn").addEventListener("click", renameBackup);
  $("backupInfoBtn").addEventListener("click", () => openBackupDetail());
  $("backupDeleteBtn").addEventListener("click", deleteBackup);
  $("restoreFilePickBtn").addEventListener("click", chooseRestoreFile);
  $("restoreFile").addEventListener("change", () => {
    if ($("restoreFile").files.length) {
      setSelectedBackup("");
      $("restoreFilename").value = $("restoreFile").files[0].name;
      setInlineStatus("backupInlineStatus", $("restoreFile").files[0].name);
    }
  });
  $("restoreBtn").addEventListener("click", runRestore);
  $("wifiResetBtn").addEventListener("click", resetWifi);
  $("wifiScanBtn").addEventListener("click", () => scanWifi(true, true));
  $("wifiSaveBtn").addEventListener("click", saveWifi);
  $("wifiNetworks").addEventListener("change", () => {
    $("wifiSsid").value = $("wifiNetworks").value;
  });
  $("refreshPorts").addEventListener("click", loadPorts);
  $("choosePackageDir").addEventListener("click", choosePackageDirectory);
  $("chooseInventoryRoot")?.addEventListener("click", chooseInventoryRoot);
  $("packageSource").addEventListener("change", async () => {
    const source = $("packageSource").value;
    await saveConfig({ package_source: source, package_ref: source === "special" ? appConfig.package_ref : "" });
    if (source === "open") {
      syncFirmwareActions();
      setProgressState("firmwareProgressPanel", "firmwareProgressBar", "firmwareProgressText", 0, false);
      await loadRepoLanguages();
      return;
    }
    await loadPackages();
    await loadRepoLanguages();
    await saveConfig({ package_dir: $("packageDir").value });
    setProgressState("firmwareProgressPanel", "firmwareProgressBar", "firmwareProgressText", 0, false);
  });
  $("packageVersion").addEventListener("change", async () => {
    const selectedRef = $("packageVersion").value || "";
    const selectedOption = $("packageVersion").selectedOptions[0];
    const baseUrl = selectedOption?.dataset?.baseUrl || "";
    appConfig.package_ref = selectedRef;
    $("packageDir").value = baseUrl;
    await saveConfig({ package_ref: selectedRef, package_dir: baseUrl });
    await loadRepoLanguages();
  });
  $("packageDir").addEventListener("change", async () => {
    const value = $("packageDir").value.trim();
    if ($("packageSource").value === "open") {
      await saveConfig({ open_package_dir: value });
    } else {
      await saveConfig({ package_dir: value });
    }
  });
  $("baudSelect").addEventListener("change", async () => {
    await saveConfig({ baud_rate: Number($("baudSelect").value) });
  });
  $("eraseFlashSelect").addEventListener("change", updateFlashBackupWarning);
  $("littlefsSelect").addEventListener("change", updateFlashBackupWarning);
  $("serialBaudSelect").addEventListener("change", async () => {
    await saveConfig({ serial_baud_rate: Number($("serialBaudSelect").value) });
  });
  $("portSelect").addEventListener("change", async () => {
    await applySelectedSerialPort($("portSelect").value);
  });
  $("serialPortSelect").addEventListener("change", async () => {
    await applySelectedSerialPort($("serialPortSelect").value);
  });
  $("backupFirmwareBtn").addEventListener("click", backupCurrentFirmware);
  $("updateWebfilesBtn").addEventListener("click", updateWebfiles);
  $("checkFirmwareUpdateBtn")?.addEventListener("click", () => checkFirmwareUpdate(true));
  $("installLanguageBtn").addEventListener("click", installLanguage);
  $("flashBtn").addEventListener("click", startFlash);
  $("migrateBtn").addEventListener("click", startMigration);
  $("serialStartBtn").addEventListener("click", startSerial);
  $("serialStopBtn").addEventListener("click", stopSerial);
  $("serialClearBtn").addEventListener("click", clearSerialLog);
  $("serialAutoscrollBtn").addEventListener("click", toggleSerialAutoscroll);
  $("serialRebootBtn").addEventListener("click", rebootSerialDevice);
  $("serialCopyBtn").addEventListener("click", copySerialLog);
  $("telegrafTestBtn").addEventListener("click", () => testTelegrafDevice().catch(err => telegrafLogMessage(String(err))));
  $("telegrafSaveBtn").addEventListener("click", () => saveTelegrafConfig().catch(err => telegrafLogMessage(String(err))));
  $("telegrafTemplatesPickBtn").addEventListener("click", () => pickTelegrafTemplatesDir().catch(err => telegrafLogMessage(String(err))));
  $("telegrafExportTemplatesBtn").addEventListener("click", () => exportTelegrafTemplates().catch(err => telegrafLogMessage(String(err))));
  $("telegrafDownloadBtn").addEventListener("click", () => downloadTelegraf().catch(err => setInlineStatus("telegrafDownloadStatus", String(err))));
  $("telegrafBinaryPickBtn").addEventListener("click", () => pickTelegrafBinary().catch(err => telegrafLogMessage(String(err))));
  $("telegrafBinary").addEventListener("change", () => refreshTelegrafBinaryPath());
  $("telegrafStartBtn").addEventListener("click", () => startTelegraf().catch(err => telegrafLogMessage(String(err))));
  $("telegrafStopBtn").addEventListener("click", () => stopTelegraf().catch(err => telegrafLogMessage(String(err))));
  $("telegrafClearBtn").addEventListener("click", () => clearTelegrafLog().catch(console.error));
  $("telegrafCopyBtn").addEventListener("click", () => copyOutputLog("telegrafLog").catch(console.error));
  [
    ["firmwareStatusClearBtn", () => clearOutputLog("firmwareStatus")],
    ["managementStatusClearBtn", () => clearOutputLog("managementStatus")],
    ["backupRestoreStatusClearBtn", () => clearOutputLog("backupRestoreStatus")],
    ["testRunnerStatusClearBtn", () => clearOutputLog("testRunnerStatus")],
    ["migrationStatusClearBtn", () => clearOutputLog("migrationStatus")],
    ["firmwareStatusCopyBtn", () => copyOutputLog("firmwareStatus")],
    ["managementStatusCopyBtn", () => copyOutputLog("managementStatus")],
    ["backupRestoreStatusCopyBtn", () => copyOutputLog("backupRestoreStatus")],
    ["testRunnerStatusCopyBtn", () => copyOutputLog("testRunnerStatus")],
    ["migrationStatusCopyBtn", () => copyOutputLog("migrationStatus")]
  ].forEach(([id, handler]) => {
    const node = $(id);
    if (node) node.addEventListener("click", handler);
  });
  $("testRunnerSuite")?.addEventListener("change", () => {
    renderTestRunnerSuiteInfo($("testRunnerSuite")?.value || "");
  });
  $("testRunnerStartBtn").addEventListener("click", startTestRunner);
  $("testRunnerStopBtn").addEventListener("click", stopTestRunner);
  document.querySelectorAll(".tab").forEach(btn => btn.addEventListener("click", () => activateTab(btn.dataset.tab)));
  document.querySelectorAll("[data-management-tab]").forEach(btn => btn.addEventListener("click", () => activateManagementTab(btn.dataset.managementTab)));
  document.querySelectorAll("[data-telegraf-tab]").forEach(btn => btn.addEventListener("click", () => activateTelegrafTab(btn.dataset.telegrafTab)));
  Object.values(telegrafEnabledCheckboxByTab).forEach(id => {
    const checkbox = $(id);
    if (checkbox) checkbox.addEventListener("change", updateTelegrafTabIndicators);
  });
  Object.keys(MANAGEMENT_KINDS).forEach(kind => {
    $(`${kind}RefreshDevice`).addEventListener("click", () => loadInventory(kind));
    $(`${kind}RefreshLocal`).addEventListener("click", () => loadInventory(kind));
    $(`${kind}CopyToLocal`).addEventListener("click", () => inventoryActionExplorer(kind, "device-to-local", "device"));
    $(`${kind}CopyToDevice`).addEventListener("click", () => inventoryActionExplorer(kind, "local-to-device", "local"));
    $(`${kind}InfoDevice`).addEventListener("click", () => inventoryInfoAction(kind, "device"));
    $(`${kind}InfoLocal`).addEventListener("click", () => inventoryInfoAction(kind, "local"));
    $(`${kind}DeleteDevice`).addEventListener("click", () => inventoryActionExplorer(kind, "device-delete", "device"));
    $(`${kind}DeleteLocal`).addEventListener("click", () => inventoryActionExplorer(kind, "local-delete", "local"));
    $(`${kind}RenameDevice`).addEventListener("click", () => inventoryActionExplorer(kind, "device-rename", "device"));
    $(`${kind}RenameLocal`).addEventListener("click", () => inventoryActionExplorer(kind, "local-rename", "local"));
    $(`${kind}LocalUp`)?.addEventListener("click", () => navigateLocalInventory(kind, parentLocalInventoryPath(managementCurrentDir(kind))));
    $(`${kind}LocalNewFolder`)?.addEventListener("click", () => inventoryActionExplorer(kind, "local-create-dir", "local"));
    $(`${kind}LocalNewFile`)?.addEventListener("click", () => inventoryActionExplorer(kind, "local-create-file", "local"));
  });
}

async function init() {
  writeStartupTrace("init start", { reset: true, force: true });
  try {
    if (hideTestRunnerViaQuery()) {
      $("tabTestRunner")?.classList.add("hidden-panel");
      $("testRunnerPanel")?.classList.add("hidden-panel");
    }
    initializeManagementSortHeaders();
    initializeBackupSortHeader();
    await loadOverview();
    writeStartupTrace("loadOverview done");
    applyLanguage();
    writeStartupTrace("applyLanguage done");
    applyDebugPanels();
    writeStartupTrace("applyDebugPanels done");
    attachEvents();
    writeStartupTrace("attachEvents done");
    await loadPorts();
    writeStartupTrace("initial loadPorts done");
    activateTab("firmware");
    setProgressState("firmwareProgressPanel", "firmwareProgressBar", "firmwareProgressText", 0, false);
    setProgressState("webfilesProgressPanel", "webfilesProgressBar", "webfilesProgressText", 0, false, "", "webfilesProgressFile", "webfilesProgressTitle");
    setInlineStatus("flashInlineStatus", "");
    setInlineStatus("wifiInlineStatus", "");
    setInlineStatus("webfilesInlineStatus", "");
    setInlineStatus("backupInlineStatus", "");
    setInlineStatus("restoreInlineStatus", "");
    setInlineStatus("firmwareBackupInlineStatus", "");
    setInlineStatus("migrationInlineStatus", "");
    setInlineStatus("testRunnerInlineStatus", "");
    Object.keys(MANAGEMENT_KINDS).forEach(kind => setInlineStatus(`${kind}InlineStatus`, ""));
    setSpinner("flashSpinner", false);
    setSpinner("wifiSpinner", false);
    setSpinner("webfilesSpinner", false);
    setSpinner("backupSpinner", false);
    setSpinner("restoreSpinner", false);
    setSpinner("firmwareBackupSpinner", false);
    setSpinner("migrationSpinner", false);
    setSpinner("testRunnerSpinner", false);
    setSpinner("telegrafDownloadSpinner", false);
    Object.keys(MANAGEMENT_KINDS).forEach(kind => setSpinner(`${kind}Spinner`, false));
    updateFlashBackupWarning();
    queueDeferredLoad("loadPackages", () => loadPackages(), 0);
    queueDeferredLoad("loadRepoLanguages", () => loadRepoLanguages(), 100);
    queueDeferredLoad("loadBackups", () => loadBackups(), 200);
    if (!hideTestRunnerViaQuery()) {
      queueDeferredLoad("loadTestRunnerCatalog", () => loadTestRunnerCatalog(), 400);
    }
    queueDeferredLoad("checkServiceToolUpdate", () => checkServiceToolUpdate(false), 900);
    setInterval(() => pollSerial().catch(console.error), 1000);
    setInterval(() => pollTelegraf().catch(console.error), 1000);
    setInterval(() => pollActiveProcess().catch(console.error), 30000);
    writeStartupTrace("init done");
  } finally {
    if (appStartupPendingTasks === 0) {
      $("appLoadingOverlay")?.classList.add("hidden-panel");
    }
  }
}

init().catch(err => {
  console.error(err);
  updateDeviceConnectionState("offline");
  if (appStartupPendingTasks === 0) {
    $("appLoadingOverlay")?.classList.add("hidden-panel");
  }
});
