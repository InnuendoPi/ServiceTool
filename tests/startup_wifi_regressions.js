const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('static/app.js', 'utf8');

(async () => {
  let checks = 0, scans = 0, selection = 'COM3';
  const ctx = vm.createContext({
    maintenanceSelectionKey: () => selection,
    firmwareInstallationActive: () => false,
    $: () => ({classList: {contains: () => true}}),
    checkDevice: async () => {checks++;},
    scanWifi: async (refresh, hostFallback) => {
      scans++; assert.equal(refresh, true); assert.equal(hostFallback, false);
    },
    lastDeviceStatus: {state: 'online', firmware: '1.70.4'}
  });
  vm.runInContext(source.slice(source.indexOf('async function checkStartupDevice('),
    source.indexOf('async function init(')), ctx);
  await vm.runInContext('checkStartupDevice()', ctx);
  assert.equal(checks, 1); assert.equal(scans, 1);
  ctx.lastDeviceStatus = {state: 'serial', firmware: '1.66.4'};
  await vm.runInContext('checkStartupDevice()', ctx);
  assert.equal(scans, 2);
  for (const status of [{state: 'offline'}, {state: 'serial', firmware: ''},
    {state: 'serial', firmware: 'ServiceApp', mode: 'service'}]) {
    ctx.lastDeviceStatus = status;
    await vm.runInContext('checkStartupDevice()', ctx);
    assert.equal(scans, 2);
  }
  ctx.lastDeviceStatus = {state: 'online'};
  ctx.checkDevice = async () => {selection = 'COM4';};
  await vm.runInContext('checkStartupDevice()', ctx);
  assert.equal(scans, 2);
  ctx.checkDevice = async () => {};
  ctx.scanWifi = async () => {scans++; throw new Error('scan failed');};
  await assert.rejects(vm.runInContext('checkStartupDevice()', ctx), /scan failed/);
  assert.equal(scans, 3);
  console.log('Startup WiFi: one scan after detection; no scan on failure, ServiceApp or device switch; no retry');
})().catch(error => {console.error(error); process.exitCode = 1;});
