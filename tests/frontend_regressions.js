const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
require('./help_regressions.js');
require('./runner_results_regressions.js');
const source = fs.readFileSync('static/app.js', 'utf8');
const workspaceSource = fs.readFileSync('static/workspace.js', 'utf8');

// Exercise the new navigation without starting the app or contacting a device.
{
  const elements = {};
  function element() {
    return {children:[], attributes:{}, listeners:{}, dataset:{}, textContent:'',
      replaceChildren(){this.children=[];}, appendChild(child){this.children.push(child);},
      setAttribute(key,value){this.attributes[key]=value;},
      addEventListener(key,handler){this.listeners[key]=handler;}};
  }
  let runnerHidden = true;
  elements.tabTestRunner = {classList:{contains:()=>runnerHidden}};
  const ctx = vm.createContext({currentLang:'de', document:{body:{dataset:{}},
    getElementById:id=>elements[id] ||= element(), createElement:element}});
  vm.runInContext(workspaceSource, ctx);
  ctx.activateTab = tab => vm.runInContext(`workspaceTabActivated(${JSON.stringify(tab)})`, ctx);
  vm.runInContext('workspaceReady=true; renderWorkspaceNavigation()', ctx);
  assert.deepEqual(elements.mainNavigation.children.map(n=>n.textContent), ['Gerät','Firmware','Daten','Service']);
  assert.equal(elements.sectionNavigation.children.length,0);
  elements.mainNavigation.children[1].listeners.click();
  assert.equal(ctx.document.body.dataset.workspaceView,'install');
  assert.equal(elements.sectionNavigation.children.length,0);
  elements.mainNavigation.children[3].listeners.click();
  assert.equal(ctx.document.body.dataset.workspaceView,'logging');
  assert.deepEqual(elements.sectionNavigation.children.map(n=>n.textContent),['Serial Monitor','Telegraf','Wartung','Migration']);
  runnerHidden=false;
  vm.runInContext('renderWorkspaceNavigation()',ctx);
  assert.deepEqual(elements.sectionNavigation.children.map(n=>n.textContent),['Serial Monitor','Telegraf','Wartung','Migration','Test Runner']);
  elements.sectionNavigation.children[2].listeners.click();
  assert.equal(ctx.document.body.dataset.workspaceView,'maintenance');
  elements.mainNavigation.children[0].listeners.click();
  assert.equal(ctx.document.body.dataset.workspaceView,'connection');
  console.log('Workspace navigation: combined pages, service order and conditional Test Runner verified');
}

{
  const classes = new Set();
  const badge = {dataset:{versionTooltip:'1.67.2'}, classList:{
    add:name=>classes.add(name), remove:(...names)=>names.forEach(name=>classes.delete(name))}};
  const button = {};
  const ctx=vm.createContext({$:id=>id==='deviceConnectionState'?badge:button,currentLang:'de',
    text:key=>({checkDeviceOnline:'Online',checkDeviceNone:'Kein Gerät',checkDeviceChecking:'Prüfen',
      activeProcessMash:'Maischen',activeProcessFermenter:'Fermentieren'}[key] || key)});
  vm.runInContext(source.slice(source.indexOf('let displayedActiveProcess ='),source.indexOf('async function pollActiveProcess(')),ctx);
  vm.runInContext('updateDeviceConnectionState("online")',ctx);
  assert.equal(badge.textContent,'Online · Prozessstatus unbekannt');
  assert.ok(classes.has('process-unknown'));
  vm.runInContext('updateActiveProcessState({active_process:{state:"idle"}})',ctx);
  assert.equal(badge.textContent,'Online · Kein Prozess aktiv');
  assert.ok(!classes.has('process-unknown'));
  vm.runInContext('updateActiveProcessState({active_process:{state:"active",mode:"mash",step:"Rast",name:"Sud",remaining_sec:120}})',ctx);
  assert.equal(badge.textContent,'Online · Maischen: Rast');
  assert.equal(badge.title,'1.67.2 · Sud · ~2 min');
  assert.ok(classes.has('process-active'));
  vm.runInContext('updateDeviceConnectionState("serial")',ctx);
  assert.equal(badge.textContent,'Seriell verbunden');
  assert.ok(!classes.has('process-active'));
  vm.runInContext('updateActiveProcessState(null); updateDeviceConnectionState("offline")',ctx);
  assert.equal(badge.textContent,'Kein Gerät');
  vm.runInContext('currentLang="en"; updateDeviceConnectionState("online")',ctx);
  assert.equal(badge.textContent,'Online · Process status unknown');
  assert.equal(badge.dataset.state,'online');
  console.log('Combined status: online unknown/idle/active, serial, offline and translation verified');
}

(async () => {
  let reloads = 0;
  const ctx = vm.createContext({
    appConfig: {device_url:'http://existing.local',serial_port:'COM4'}, currentLang:'de',
    checkDeviceInFlight:null, appStartupPendingTasks:0, maintenanceBusy:false, maintenanceStatusPending:false,
    document:{getElementById:()=>({classList:{contains:()=>true}})},
    window:{location:{reload:()=>{reloads++;}}},
    api:async (url, options)=>{assert.equal(url,'/api/device-profiles');assert.equal(options.body.id,'worker-id');}
  });
  vm.runInContext(workspaceSource,ctx);
  assert.equal(vm.runInContext('deviceProfileName(0,1)',ctx),'Brautomat');
  assert.equal(vm.runInContext('deviceProfileName(0,4)',ctx),'Master');
  assert.equal(vm.runInContext('deviceProfileName(3,4)',ctx),'worker3');
  assert.equal(vm.runInContext('workspaceProfiles()[0].url',ctx),'http://existing.local');
  ctx.checkDeviceInFlight=Promise.resolve();
  await assert.rejects(vm.runInContext('submitDeviceProfile({action:"select",id:"worker-id"})',ctx),/abwarten/);
  assert.equal(reloads,0);
  ctx.checkDeviceInFlight=null;
  ctx.api=async()=>{throw new Error('busy');};
  await assert.rejects(vm.runInContext('submitDeviceProfile({action:"select",id:"worker-id"})',ctx),/busy/);
  assert.equal(reloads,0);
  ctx.api=async()=>({});
  await vm.runInContext('submitDeviceProfile({action:"select",id:"worker-id"})',ctx);
  assert.equal(reloads,1);
  console.log('Device profiles: naming, legacy defaults, busy guard and reload verified');
})().catch(error=>{console.error(error);process.exitCode=1;});

{
  const ctx=vm.createContext({appConfig:{device_profiles:[{},{}]},serialPortScore:()=>99});
  vm.runInContext(source.slice(source.indexOf('function choosePreferredSerialPort('),source.indexOf('async function applySelectedSerialPort(')),ctx);
  assert.equal(vm.runInContext('choosePreferredSerialPort([{port:"COM5"}],"COM4")',ctx),'');
  assert.equal(vm.runInContext('choosePreferredSerialPort([{port:"COM5"},{port:"COM4"}],"COM4")',ctx),'COM4');
  ctx.appConfig.device_profiles=[];
  assert.equal(vm.runInContext('choosePreferredSerialPort([{port:"COM5"}],"COM4")',ctx),'COM5');
}
const nodes = {};
const node = id => nodes[id] ||= {value:'', dataset:{state:'serial'}, children:[],
  classList:{remove(){}, toggle(){}}, appendChild(value){this.children.push(value);}};
let status = '';
let requests = 0;
const context = vm.createContext({
  $:node, currentLang:'de', document:{createElement:()=>({})}, console,
  setInlineStatus:(_id,text)=>{status=text;},
  managementServiceActive:()=>false, setButtonsDisabled(){}, setSpinner(){},
  writeStartupTrace(){}, appendStatus(){}, text:x=>x,
  shouldUseHostWifiFallback:()=>false,
  wifiTransportProvisioning:()=>({serial_port:'MOCK',serial_baud:115200}),
  effectiveDeviceBaseUrl:()=>'', requireSerialPortForAction:()=>true,
  sleep:async()=>{}, appStartupTaskDone(){},
  api:async()=>{requests++;return {transport:'serial',status:requests===1?'running':'ready',networks:[{ssid:requests===1?'cached':'new',rssi:-50}]};},
});
vm.runInContext(source.slice(source.indexOf('function applyWifiNetworksResult('),
  source.indexOf('async function choosePackageDirectory(')), context);
vm.runInContext(source.slice(source.indexOf('async function scanWifi('),
  source.indexOf('async function saveWifi(')), context);
assert.throws(()=>vm.runInContext('applyWifiNetworksResult({status:"error", networks:[]})', context), /fehlgeschlagen/);
vm.runInContext('applyWifiNetworksResult({status:"stale",networks:[{ssid:"cached",rssi:-50}]})', context);
assert.match(status, /alte Ergebnisse/);
vm.runInContext('applyWifiNetworksResult({networks:[{ssid:" spaced ",rssi:-50}]})', context);
assert.equal(node('wifiNetworks').children.at(-1).value, ' spaced ');
vm.runInContext('scanWifi(true, false)', context).then(()=>{
  assert.equal(requests,2);
  assert.equal(node('wifiNetworks').children.at(-1).value,'new');
  console.log('Frontend WLAN regression checks passed');
}).catch(error=>{console.error(error);process.exitCode=1;});

// Persistent boot blockers must be visible even without a top-level reason.
const maintenanceContext = vm.createContext({
  $: node, currentLang: 'de', I18N: {de: {}}, text: x => x,
  maintenanceRefreshTimer: null, maintenanceExitBlocked: false,
  maintenanceAppDirty: false, maintenanceNeedsDetection: false,
  clearTimeout(){}, setTimeout(){return 1;}, refreshMaintenance(){},
  setInlineStatus: (_id, value) => { status = value; }
});
vm.runInContext(source.slice(source.indexOf('function showMaintenanceState('),
  source.indexOf('async function repairMaintenanceFirmware(')), maintenanceContext);
vm.runInContext('showMaintenanceState({active:true,service:{app_dirty:true,can_boot_main:false}})', maintenanceContext);
assert.match(status, /kann noch nicht starten/);
assert.doesNotMatch(status, /app_dirty/);
assert.match(status, /Hauptfirmware reparieren/);
assert.equal(maintenanceContext.maintenanceExitBlocked, true);
vm.runInContext('showMaintenanceState({active:true,service:{app_dirty:false,fs_dirty:true,can_boot_main:false},reason:"filesystem_update_incomplete"})', maintenanceContext);
assert.equal(maintenanceContext.maintenanceAppDirty, false);
assert.equal(maintenanceContext.maintenanceExitBlocked, true);
vm.runInContext('showMaintenanceState({active:true,service:{app_dirty:false,fs_dirty:false,can_boot_main:true}})', maintenanceContext);
assert.equal(maintenanceContext.maintenanceExitBlocked, false);
assert.doesNotMatch(status, /app_dirty=1/);
console.log('Maintenance boot-blocker regression checks passed');

(async () => {
  for (const [success, blocked, expectedStarts] of [[true,false,1],[false,false,0],[true,true,0]]) {
    let starts = 0;
    const ctx = vm.createContext({
      $: node, currentLang: 'de', managementServiceActive: () => true,
      maintenanceAppDirty: true, maintenanceBusy: false, maintenanceStatusPending: false,
      maintenanceActive: true, maintenanceExitBlocked: blocked,
      window: {confirm: () => true}, renderMaintenanceButton(){},
      startFlash: async () => success, refreshMaintenance: async () => {},
      toggleMaintenance: async () => { starts++; }
    });
    vm.runInContext(source.slice(source.indexOf('async function repairMaintenanceFirmware('),
      source.indexOf('async function resetMaintenanceBrewState(')), ctx);
    await vm.runInContext('repairMaintenanceFirmware()', ctx);
    assert.equal(starts, expectedStarts);
    assert.equal(ctx.maintenanceBusy, false);
  }
  console.log('Repair workflow: boots only after successful repair and cleared blockers');
})().catch(error => {console.error(error); process.exitCode = 1;});

(async () => {
  const languageNodes = {};
  const languageNode = id => languageNodes[id] ||= {value:'',children:[],appendChild(o){this.children.push(o);}};
  languageNode('packageSource').value = 'special';
  languageNode('packageVersion').value = '';
  let requested = '';
  const ctx = vm.createContext({
    $: languageNode, currentLang:'de', packageGeneration:()=> 'Updates', appConfig:{package_ref:'v1.65.5'},
    document:{createElement:()=>({})}, encodeURIComponent,
    setInlineStatus(){},
    api:async url=>{requested=url; return {languages:[{filename:'deutsch.json',language:'deutsch',path:'data/language/deutsch.json'}]};}
  });
  vm.runInContext(source.slice(source.indexOf('async function loadRepoLanguages('),
    source.indexOf('function formatTestRunnerCounts(')),ctx);
  for (const emptyRef of ['', '  ']) {
    languageNode('packageVersion').value = emptyRef;
    await vm.runInContext('loadRepoLanguages()',ctx);
    assert.equal(requested, '');
    assert.equal(languageNode('webfilesLanguage').disabled, true);
    assert.equal(languageNode('installLanguageBtn').disabled, true);
    assert.match(languageNode('webfilesLanguage').children.at(-1).textContent, /zuerst eine Firmwareversion/);
  }
  languageNode('packageVersion').value = 'v1.66.0';
  await vm.runInContext('loadRepoLanguages()',ctx);
  assert.match(requested,/ref=v1.66.0/);
  assert.equal(languageNode('webfilesLanguage').value,'deutsch.json');
  assert.equal(languageNode('installLanguageBtn').disabled,false);
  ctx.api=async()=>{throw new Error('offline');};
  await vm.runInContext('loadRepoLanguages()',ctx);
  assert.equal(languageNode('installLanguageBtn').disabled,true);
  assert.match(languageNode('webfilesLanguage').children.at(-1).textContent,/konnte nicht geladen/);
  console.log('Language selector: current package ref and readable load error verified');
})().catch(error=>{console.error(error);process.exitCode=1;});

(async () => {
  const ns = {};
  const get = id => ns[id] ||= {value:'',dataset:{},children:[],classList:{toggle(){}},appendChild(v){this.children.push(v);}};
  get('packageSource').value='release'; get('packageDir').value='stale-development-url';
  let status='';
  const ctx=vm.createContext({$:get,currentLang:'de',appConfig:{},lastDeviceStatus:{firmware:'1.67.2'},
    parseDeviceFirmwareVersion:()=>[1,67,2],compareVersionTuple:()=>1,
    document:{createElement:()=>({dataset:{}})},syncFirmwareActions(){},
    setInlineStatus:(_id,value)=>{status=value;},
    api:async()=>({packages:[{key:'release',available:false,path:''}],special_versions:[
      {ref:'commit',label:'V 1.67.2',base_url:'https://example/Updates/ESP32-IDF5dev'}]})});
  vm.runInContext(source.slice(source.indexOf('let packageLoadEpoch ='),source.indexOf('async function loadRepoLanguages(')),ctx);
  await vm.runInContext('loadPackages()',ctx);
  assert.equal(get('packageDir').value,'');
  assert.equal(vm.runInContext('packageSelectionReady',ctx),false);
  assert.match(status,/kein vollständiges Paket/);
  get('packageSource').value='special';
  await vm.runInContext('loadPackages()',ctx);
  assert.equal(get('packageVersion').value,'commit');
  assert.match(get('packageDir').value,/Updates.*IDF5dev/);
  assert.equal(vm.runInContext('packageSelectionReady',ctx),true);
  console.log('Package UI: missing release clears stale URL; special version becomes selectable');
})().catch(error=>{console.error(error);process.exitCode=1;});

(async () => {
  const ns={};
  const get=id=>ns[id] ||= {value:'',children:[],appendChild(v){this.children.push(v);}};
  get('packageSource').value='development';
  const status={};
  let rejectOld;
  const oldRequest=new Promise((_resolve,reject)=>{rejectOld=reject;});
  let calls=0;
  const ctx=vm.createContext({$:get,currentLang:'de',packageGeneration:()=> 'Updates',
    document:{createElement:()=>({})},encodeURIComponent,
    setInlineStatus:(id,value)=>{status[id]=value;},
    api:()=>++calls===1 ? oldRequest : Promise.resolve({languages:[{filename:'english.json',language:'english',path:'Updates/data/language/english.json'}]})});
  vm.runInContext(source.slice(source.indexOf('async function loadRepoLanguages('),source.indexOf('function formatTestRunnerCounts(')),ctx);
  const first=vm.runInContext('loadRepoLanguages()',ctx);
  await vm.runInContext('loadRepoLanguages()',ctx);
  rejectOld(new Error('late failure')); await first;
  assert.equal(get('webfilesLanguage').value,'english.json');
  assert.equal(get('installLanguageBtn').disabled,false);
  assert.equal(status.languageListStatus,'');
  ctx.api=async()=>{throw new Error('offline');};
  await vm.runInContext('loadRepoLanguages()',ctx);
  assert.match(status.languageListStatus,/nicht erreichbar/);
  ctx.api=async()=>({languages:[{filename:'deutsch.json',language:'deutsch'}]});
  await vm.runInContext('loadRepoLanguages()',ctx);
  assert.equal(status.languageListStatus,'');
  assert.equal(get('installLanguageBtn').disabled,false);
  assert.equal(status.webfilesInlineStatus,undefined);
  console.log('Language list: stale failure ignored, retry clears error, operation status preserved');
})().catch(error=>{console.error(error);process.exitCode=1;});
