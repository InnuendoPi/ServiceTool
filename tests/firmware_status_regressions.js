const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('static/app.js', 'utf8');

async function scenario(result, switchDevice = false) {
  const classes = new Set();
  const badge = {dataset: {state: 'online'}, classList: {
    add: x => classes.add(x), remove: (...xs) => xs.forEach(x => classes.delete(x))
  }};
  let complete;
  let refreshes = 0;
  let selection = 'master';
  const ctx = vm.createContext({
    $: id => id === 'deviceConnectionState' ? badge : {},
    currentLang: 'de', maintenanceSelectionKey: () => selection,
    text: key => ({checkDeviceChecking: 'Gerät wird geprüft', checkDeviceOnline: 'Online'}[key] || key),
    api: () => new Promise(resolve => { complete = resolve; }),
    setProgressState() {}, setInlineStatus() {}, setSpinner() {},
    setStatus() {}, appendStatus() {}, setButtonsDisabled() {},
    scheduleRefreshAfterFirmwareUpdate: () => { refreshes++; },
    setTimeout() {}, console
  });
  vm.runInContext(source.slice(source.indexOf('let displayedActiveProcess ='),
    source.indexOf('async function pollActiveProcess(')), ctx);
  vm.runInContext(source.slice(source.indexOf('async function watchJobToTarget('),
    source.indexOf('\nlet maintenance', source.indexOf('async function watchJobToTarget('))), ctx);
  const watched = vm.runInContext('watchJobToTarget("job", "firmwareStatus", "Firmware", "flashInlineStatus")', ctx);
  assert.equal(badge.textContent, 'Firmware wird installiert …');
  vm.runInContext(source.slice(source.indexOf('async function pollActiveProcess('),
    source.indexOf('function updateDeviceVersionMeta(')), ctx);
  vm.runInContext(source.slice(source.indexOf('async function checkDevice('),
    source.indexOf('function openDeviceUrl(')), ctx);
  ctx.activeProcessPollInFlight = false;
  const jobApi = ctx.api;
  ctx.api = () => { throw new Error('Device access during installation'); };
  await vm.runInContext('checkDevice()', ctx);
  await vm.runInContext('pollActiveProcess()', ctx);
  ctx.api = jobApi;
  vm.runInContext('updateActiveProcessState({active_process:{state:"unknown"}})', ctx);
  assert.equal(badge.textContent, 'Firmware wird installiert …');
  assert.ok(classes.has('installing'));
  assert.ok(!classes.has('process-unknown'));
  vm.runInContext('currentLang="en"; renderDeviceStatusBadge()', ctx);
  assert.equal(badge.textContent, 'Installing firmware …');
  if (switchDevice) selection = 'worker';
  complete({status: result, progress: 100, error: result === 'failed' ? 'Flash failed' : null});
  await watched;
  assert.equal(vm.runInContext('firmwareStatusJobs.size', ctx), 0);
  assert.equal(refreshes, switchDevice ? 0 : 1);
  assert.ok(!classes.has('installing'));
  if (!switchDevice) {
    assert.equal(badge.textContent, 'Gerät wird geprüft');
    vm.runInContext('updateActiveProcessState({active_process:{state:"idle"}}); updateDeviceConnectionState("online")', ctx);
    assert.equal(badge.textContent, 'Online');
  }
}
(async () => {
  await scenario('done');
  await scenario('failed');
  await scenario('done', true);
  console.log('Firmware status: installation, DE/EN, completion, failure and device switch verified');
})().catch(error => { console.error(error); process.exitCode = 1; });
