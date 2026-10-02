const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('static/app.js', 'utf8');
const nodes = {
  portSelect: {value: 'COM5', options: [{value:'COM4'}, {value:'COM5'}]},
  serialPortSelect: {value: 'COM5', options: [{value:'COM4'}, {value:'COM5'}]},
  deviceUrl: {value: 'http://saved-device'},
};
const config = {serial_port:'COM4', device_url:'http://saved-device', active_device_id:'saved',
  device_profiles:[{id:'saved', port:'COM4', url:'http://saved-device'}, {id:'other', port:'COM7'}]};
let writes = [];
const ctx = vm.createContext({appConfig:config, currentLang:'de', $:id=>nodes[id],
  lastDeviceStatus:{state:'online',base_url:'http://saved-device'}, pendingOnlineUpgradeCheck:null,
  updateDeviceConnectionState(){}, window:{clearTimeout(){}},
  api:async(path,options)=>{writes.push(options.body);return options.body;}});
const extract = (start,end) => source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
vm.runInContext(extract('let temporarySerialConnection =', 'async function api('),ctx);
vm.runInContext(extract('async function saveConfig(', 'function applyLanguage('),ctx);
vm.runInContext(extract('function serialPortScore(', 'async function loadPorts('),ctx);
(async()=>{
  assert.equal(vm.runInContext('choosePreferredSerialPort([{port:"COM5",name:"CP210x"}],"COM4")',ctx),'COM5');
  assert.equal(vm.runInContext('choosePreferredSerialPort([{port:"COM5"},{port:"COM4"}],"COM4")',ctx),'COM4');
  assert.equal(vm.runInContext('choosePreferredSerialPort([],"COM4")',ctx),'');
  await vm.runInContext('applySelectedSerialPort("COM5")',ctx);
  assert.equal(nodes.deviceUrl.value,'');
  assert.equal(config.serial_port,'COM4');
  assert.equal(writes.length,0);
  assert.equal(vm.runInContext('connectionRequestOptions("/api/device/status",{body:{base_url:"http://saved-device",serial_port:"COM5"}}).body.base_url',ctx),'');
  assert.throws(()=>vm.runInContext('connectionRequestOptions("/api/backup",{body:{base_url:"http://saved-device"}})',ctx),/Netzwerkadresse/);
  assert.equal(vm.runInContext('connectionRequestOptions("/api/wifi/scan",{body:{base_url:"http://saved-device",serial_port:"COM5"}}).body.base_url',ctx),'');
  nodes.deviceUrl.value='http://detected-device';
  await vm.runInContext('applySelectedSerialPort("COM5",false)',ctx);
  assert.equal(nodes.deviceUrl.value,'http://detected-device');
  await vm.runInContext('saveConfig({debug_output:true, serial_port:"COM5",device_url:"http://detected-device"})',ctx);
  assert.equal(writes[0].serial_port,'COM4');
  assert.equal(writes[0].device_url,'http://saved-device');
  assert.equal(writes[0].device_profiles[0].port,'COM4');
  await vm.runInContext('applySelectedSerialPort("COM4")',ctx);
  assert.equal(nodes.deviceUrl.value,'http://saved-device');
  assert.equal(vm.runInContext('temporarySerialConnection',ctx),null);
  assert.equal(writes.length,1);
  ctx.appConfig={serial_port:'',device_url:'http://default',device_profiles:[]};
  await vm.runInContext('applySelectedSerialPort("COM5")',ctx);
  assert.equal(ctx.appConfig.serial_port,'COM5');
  console.log('Port selection: fallback, profile preservation, temporary URL isolation and return to profile passed (mocked, no device access).');
})().catch(error=>{console.error(error);process.exitCode=1;});
