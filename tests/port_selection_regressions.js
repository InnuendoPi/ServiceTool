const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('static/app.js', 'utf8');
const nodes = {
  portSelect: {value: 'COM5', dataset: {}, options: [{value:'COM4'}, {value:'COM5'}]},
  serialPortSelect: {value: 'COM5', options: [{value:'COM4'}, {value:'COM5'}]},
  deviceUrl: {value: 'http://saved-device'},
};
const config = {profiles_enabled:true, serial_port:'COM4', device_url:'http://saved-device', active_device_id:'saved',
  device_profiles:[{id:'saved', port:'COM4', url:'http://saved-device'}, {id:'other', port:'COM7'}]};
let writes = [];
const ctx = vm.createContext({appConfig:config, currentLang:'de', $:id=>nodes[id],
  lastDeviceStatus:{state:'online',base_url:'http://saved-device'}, pendingOnlineUpgradeCheck:null,
  updateDeviceConnectionState(){}, window:{clearTimeout(){}}, checkDeviceInFlight:null,
  api:async(path,options)=>{writes.push(options.body);return options.body;}});
const extract = (start,end) => source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
vm.runInContext(extract('let temporarySerialConnection =', 'async function api('),ctx);
vm.runInContext(extract('async function saveConfig(', 'function applyLanguage('),ctx);
vm.runInContext(extract('function serialPortScore(', 'async function loadPorts('),ctx);
(async()=>{
  assert.equal(vm.runInContext('choosePreferredSerialPort([{port:"COM5",name:"CP210x"}],"COM4")',ctx),'COM5');
  assert.equal(vm.runInContext('choosePreferredSerialPort([{port:"COM5",name:"CP210x"},{port:"COM4"}],"COM4")',ctx),'COM4');
  assert.equal(vm.runInContext('choosePreferredSerialPort([{port:"COM5",name:"USB"},{port:"COM6",name:"USB"}],"")',ctx),'');
  assert.equal(vm.runInContext('choosePreferredSerialPort([],"COM4")',ctx),'');
  ctx.writeStartupTrace = () => {};
  ctx.refreshMaintenance = () => {};
  ctx.text = key => ({profilePortUnavailable: "nicht verfügbar"})[key];
  ctx.Option = class { constructor(text, value){ this.textContent=text; this.value=value; } };
  ctx.document = {createElement:()=>({})};
  const addedPorts = [];
  nodes.portSelect.appendChild = option => addedPorts.push(option);
  nodes.serialPortSelect.appendChild = () => {};
  ctx.api = async () => ({ports:[{port:'COM5',name:'CP210x'}]});
  vm.runInContext(extract('async function loadPorts(', 'function appendStatus('),ctx);
  await vm.runInContext('loadPorts()',ctx);
  assert.equal(nodes.portSelect.value,'');
  assert.equal(nodes.deviceUrl.value,'http://saved-device');
  assert.equal(config.serial_port,'COM4');
  assert.equal(addedPorts[0].textContent,'COM4 · nicht verfügbar');
  assert.equal(addedPorts[0].value,'');
  assert.equal(addedPorts[0].disabled,true);
  assert.equal(nodes.portSelect.dataset.detectedUsbPorts,'COM5');
  assert.equal(writes.length,0);
  const checks = [];
  ctx.checkDevice = async () => { checks.push(nodes.portSelect.value); };
  let finishCheck;
  ctx.checkDeviceInFlight = new Promise(resolve => { finishCheck = resolve; });
  const selecting = vm.runInContext('selectDeviceSerialPort("COM5")',ctx);
  assert.equal(nodes.portSelect.value,"COM5");
  assert.equal(nodes.serialPortSelect.value,"COM5");
  assert.deepEqual(checks,[]);
  finishCheck();
  await selecting;
  ctx.checkDeviceInFlight = null;
  assert.deepEqual(checks,["COM5"]);
  assert.equal(writes.length,0);
  await vm.runInContext("loadPorts()",ctx);
  assert.equal(nodes.portSelect.value,"COM5");
  assert.equal(config.device_profiles[0].port,"COM4");
  assert.throws(()=>vm.runInContext('connectionRequestOptions("/api/migration",{body:{port:"COM5",base_url:"http://saved-device"}})',ctx),/selben Brautomat/);
  ctx.lastDeviceStatus = {state:"online",serial_confirmed:true,serial_port:"COM5",base_url:"http://saved-device"};
  assert.equal(vm.runInContext('connectionRequestOptions("/api/migration",{body:{port:"COM5",base_url:"http://saved-device"}}).body.base_url',ctx),"http://saved-device");
  ctx.api = async () => ({ports:[{port:"COM4",name:"CP210x"}]});
  await vm.runInContext("loadPorts()",ctx);
  assert.equal(nodes.portSelect.value,"");
  assert.equal(nodes.portSelect.dataset.missingProfilePort,"COM5");
  ctx.appConfig={...config, active_device_id:"other"};
  ctx.api = async () => ({ports:[{port:"COM7",name:"CP210x"}]});
  await vm.runInContext("loadPorts()",ctx);
  assert.equal(nodes.portSelect.value,"COM7");
  ctx.api = async () => ({ports:[{port:"COM5",name:"CP210x"}]});
  ctx.appConfig={profiles_enabled:true, serial_port:'COM3', device_url:'http://brautomat.local', device_profiles:[]};
  await vm.runInContext('loadPorts()',ctx);
  assert.equal(vm.runInContext('activeConnectionProfile().id',ctx),'primary');
  assert.equal(vm.runInContext('activeConnectionProfile().port',ctx),'COM3');
  assert.equal(nodes.portSelect.value,'');
  ctx.api = async () => ({ports:[{port:'COM3',name:'CP210x'}]});
  await vm.runInContext('loadPorts()',ctx);
  assert.equal(nodes.portSelect.value,'COM3');
  assert.equal(nodes.portSelect.dataset.missingProfilePort,'');
  assert.equal(nodes.portSelect.dataset.detectedUsbPorts,'');
  ctx.appConfig={profiles_enabled:false,serial_port:'',device_url:'http://brautomat.local',device_profiles:[]};
  ctx.api = async (_path,options) => { writes.push(options.body); return options.body; };
  await vm.runInContext('applySelectedSerialPort("COM5")',ctx);
  assert.equal(ctx.appConfig.serial_port,'COM5');
  assert.throws(()=>vm.runInContext('connectionRequestOptions("/api/backup",{body:{base_url:"http://brautomat.local"}})',ctx),/Netzwerkadresse|network address/);
  assert.equal(vm.runInContext('connectionRequestOptions("/api/flash",{body:{base_url:"",port:"COM5"}}).body.base_url',ctx),'');
  ctx.lastDeviceStatus = {state:'online', serial_confirmed:true, serial_port:'COM5', base_url:'http://192.168.1.24'};
  assert.equal(vm.runInContext('connectionRequestOptions("/api/backup",{body:{base_url:"http://brautomat.local"}}).body.base_url',ctx),'http://192.168.1.24');
  console.log('Portwahl: aktives Profil bleibt gebunden und Direktverbindung nutzt die bestätigte USB-Adresse.');
})().catch(error=>{console.error(error);process.exitCode=1;});
