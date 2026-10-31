const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('static/app.js', 'utf8');

(async () => {
  let probes = 0, scans = 0, overlays = 0, pending = 0;
  const elements = new Map();
  const ctx = vm.createContext({
    $: id => {
      if (!elements.has(id)) elements.set(id, {value: 'COM3', dataset: {state: 'serial'},
        classList: {add() {}, remove() {}, contains: () => true}, appendChild() {}, innerHTML: ''});
      return elements.get(id);
    },
    document: {createElement: () => ({})}, currentLang: 'de', console,
    firmwareInstallationActive: () => false, checkDeviceInFlight: null,
    selectedConnectionPort: 'COM3', temporarySerialConnection: null, lastDeviceStatus: {},
    loadPorts: async () => {}, writeStartupTrace() {}, setButtonsDisabled() {},
    updateDeviceConnectionState() {}, updateDeviceVersionMeta() {}, updateActiveProcessState() {},
    serialDeviceAvailable: () => true,
    appStartupTaskStart() { overlays++; pending++; }, appStartupTaskDone() { pending--; },
    api: async path => { if (path === '/api/device/status') probes++; else scans++;
      throw new Error('No serial response'); },
    managementServiceActive: () => false, shouldUseHostWifiFallback: () => false,
    wifiTransportProvisioning: () => ({serial_port: 'COM3'}),
    requireSerialPortForAction: () => true, effectiveDeviceBaseUrl: () => 'http://device',
    setInlineStatus() {}, appendStatus() {}, text: x => x, setSpinner() {}
  });
  vm.runInContext(source.slice(source.indexOf('async function checkDevice('),
    source.indexOf('function openDeviceUrl(')), ctx);
  vm.runInContext(source.slice(source.indexOf('async function scanWifi('),
    source.indexOf('async function saveWifi(')), ctx);
  await vm.runInContext('checkDevice()', ctx);
  assert.equal(probes, 1); assert.equal(scans, 0); assert.equal(overlays, 1);
  assert.equal(ctx.checkDeviceInFlight, null);
  await vm.runInContext('checkDevice({globalSpinner: true})', ctx);
  assert.equal(pending, 0); assert.equal(overlays, 2);
  await vm.runInContext('scanWifi()', ctx);
  assert.equal(scans, 1); assert.equal(probes, 2); assert.equal(overlays, 2);
  assert.equal(pending, 0);

  // Execute the startup detection at its actual call site; tab changes are tested separately.
  const start = source.indexOf('    if ($("deviceUrl").value.trim() || serialDeviceAvailable())', source.indexOf('async function init('));
  assert.ok(start > 0);
  const startup = source.slice(start, source.indexOf('    setProgressState(', start));
  vm.runInContext(source.slice(source.indexOf('async function checkStartupDevice('), source.indexOf('async function init(')), ctx);
  ctx.maintenanceSelectionKey = () => 'COM3';
  vm.runInContext(startup, ctx);
  await vm.runInContext('checkDeviceInFlight', ctx);
  assert.equal(probes, 3); assert.equal(scans, 1); assert.equal(overlays, 3);
  let timerCallback, cleared = 0, state = '', errors = [];
  ctx.AbortController = AbortController;
  ctx.connectionRequestOptions = (_path, options) => options;
  ctx.window = {setTimeout: (fn, ms) => {assert.equal(ms, 30000); timerCallback = fn; return 1;},
    clearTimeout: () => {cleared++;}};
  ctx.fetch = (_path, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('aborted')));
  });
  ctx.updateDeviceConnectionState = value => {state = value;};
  ctx.appendStatus = (_id, _title, message) => errors.push(message);
  vm.runInContext(source.slice(source.indexOf('async function api('), source.indexOf('async function saveConfig(')), ctx);
  const waiting = vm.runInContext('checkDevice({refreshPorts: false})', ctx);
  assert.equal(state, 'checking'); assert.equal(pending, 1);
  timerCallback();
  await waiting;
  assert.equal(state, 'offline'); assert.equal(pending, 0);
  assert.equal(ctx.checkDeviceInFlight, null); assert.equal(cleared, 1);
  assert.match(errors[0], /Zeitüberschreitung/);
  assert.equal(scans, 1);
  ctx.fetch = async () => ({ok: true, json: async () => ({state: 'online', firmware: '1.70.4'})});
  ctx.packageGeneration = () => 'Updates';
  ctx.packageSelectionGeneration = () => 'Updates';
  ctx.loadedPackageGeneration = 'Updates';
  ctx.checkFirmwareUpdate = async () => {};
  await vm.runInContext('checkDevice({refreshPorts: false})', ctx);
  assert.equal(state, 'online'); assert.equal(pending, 0);
  assert.equal(ctx.lastDeviceStatus.firmware, '1.70.4');
  assert.equal(errors.length, 1); assert.equal(scans, 1);
  console.log('Device checks: startup once, no automatic WiFi scan, scan failure ends without device reprobe, overlay released');
})().catch(error => {console.error(error); process.exitCode = 1;});
