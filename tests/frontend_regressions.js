const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
require('./help_regressions.js');
require('./runner_results_regressions.js');
require('./explorer_regressions.js');
require('./firmware_status_regressions.js');
require('./designer_regressions.js');
require('./designer_ui_regressions.js');
const source = fs.readFileSync('static/app.js', 'utf8');
const workspaceSource = fs.readFileSync('static/workspace.js', 'utf8');

// Navigation must not probe the device, including after an empty or failed WiFi scan.
{
  let url='http://brautomat.local',serial=false,scanning=false;
  const checks=[];
  const ctx=vm.createContext({
    $:id=>id==='deviceUrl' ? {value:url} : id==='wifiSpinner' ? {classList:{contains:()=>!scanning}} : {options:[]},
    document:{querySelectorAll:()=>[]},placeFirmwareSelection(){},refreshMaintenance(){},checkExpertConnectionOnEntry:()=>{}, writeStartupTrace(){},
    deviceIsOnline:()=>false,serialDeviceAvailable:()=>serial,flashConnectionReturn:null,
    checkDevice:options=>{checks.push(options);return Promise.resolve();},console
  });
  vm.runInContext(source.slice(source.indexOf('function activateTab('),source.indexOf('function attachEvents(')),ctx);
  vm.runInContext('activateTab("firmware")',ctx);
  assert.equal(checks.length,0);
  url='';vm.runInContext('activateTab("firmware")',ctx);assert.equal(checks.length,0);
  serial=true;vm.runInContext('activateTab("firmware")',ctx);assert.equal(checks.length,0);
  scanning=true;vm.runInContext('activateTab("firmware")',ctx);assert.equal(checks.length,0);
  console.log('Navigation: no device checks for configured URL, serial port or empty WiFi list');
}

// Firmware 1.66.x remains on the legacy layout, including later patch releases.
{
  const ctx = vm.createContext({lastDeviceStatus:{}, maintenanceVersion:{selection:'device'},
    managementServiceActive:()=>false, maintenanceSelectionKey:()=> 'device'});
  vm.runInContext(source.slice(source.indexOf('function parseDeviceFirmwareVersion('), source.indexOf('function requireWifiServiceFirmware(')), ctx);
  vm.runInContext(source.slice(source.indexOf('function packageGeneration('), source.indexOf('async function loadPackages(')), ctx);
  vm.runInContext(source.slice(source.indexOf('function maintenanceUnsupported('), source.indexOf('function renderMaintenanceButton(')), ctx);
  for (const [version, generation, unsupported] of [
    ['1.65.5','build',true], ['1.66','build',true], ['1.66.99','build',true],
    ['1.67.0','Updates',false], ['1.68.0','Updates',false], ['2.0.0','Updates',false]
  ]) {
    ctx.lastDeviceStatus.firmware = version;
    ctx.maintenanceVersion.firmware = version;
    assert.equal(vm.runInContext('packageGeneration()',ctx),generation,version);
    assert.equal(vm.runInContext('maintenanceUnsupported()',ctx),unsupported,version);
  }
  console.log('Firmware boundary: legacy through 1.66.x; ServiceApp from 1.67');
}

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
  assert.deepEqual(elements.mainNavigation.children.map(n=>n.textContent), ['Assistenten', 'Gerät', 'Firmware', 'Daten', 'Service']);
  assert.equal(elements.sectionNavigation.children.length,0);
  elements.mainNavigation.children.find(n=>n.textContent==='Firmware').listeners.click();
  assert.equal(ctx.document.body.dataset.workspaceView,'install');
  assert.equal(elements.sectionNavigation.children.length,0);
  elements.mainNavigation.children.find(n=>n.textContent==='Service').listeners.click();
  assert.equal(ctx.document.body.dataset.workspaceView,'logging');
  assert.deepEqual(elements.sectionNavigation.children.map(n=>n.textContent),['Serial Monitor','Telegraf','Wartung','Migration']);
  runnerHidden=false;
  vm.runInContext('renderWorkspaceNavigation()',ctx);
  assert.deepEqual(elements.sectionNavigation.children.map(n=>n.textContent),['Serial Monitor','Telegraf','Wartung','Migration','Test Runner']);
  elements.sectionNavigation.children[2].listeners.click();
  assert.equal(ctx.document.body.dataset.workspaceView,'maintenance');
  elements.mainNavigation.children.find(n=>n.textContent==='Gerät').listeners.click();
  assert.equal(ctx.document.body.dataset.workspaceView,'connection');
  elements.mainNavigation.children.find(n=>n.textContent==='Assistenten').listeners.click();
  assert.equal(ctx.document.body.dataset.workspaceView,'start');
  assert.equal(elements.sectionNavigation.children.length,0);
  ctx.designerCanLeave=()=>{throw new Error('Tab changes must not prompt for the retained plan');};
  vm.runInContext('workspaceView="designer";selectWorkspaceView("management")',ctx);
  assert.equal(ctx.document.body.dataset.workspaceView,'management');
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
  assert.equal(badge.textContent,'Online');
  assert.ok(!classes.has('process-unknown'));
  vm.runInContext('updateActiveProcessState({active_process:{state:"active",mode:"mash",step:"Rast",name:"Sud",remaining_sec:120}})',ctx);
  assert.equal(badge.textContent,'Online · Maischen: Rast');
  assert.equal(badge.title,'1.67.2 · Sud · ~2 min');
  assert.ok(classes.has('process-active'));
  vm.runInContext('updateActiveProcessState({active_process:{state:"active",runtime_power:false,persisted:true,mode:"mash",step:"Ruehrwerk:ON"}})',ctx);
  assert.equal(badge.textContent,'Online');assert.ok(!classes.has('process-active'));assert.ok(!classes.has('process-unknown'));
  assert.equal(badge.title,'1.67.2');

  vm.runInContext('updateDeviceConnectionState("serial")',ctx);
  assert.equal(badge.textContent,'Seriell verbunden');
  assert.ok(!classes.has('process-active'));
  vm.runInContext('updateActiveProcessState(null); updateDeviceConnectionState("offline")',ctx);
  assert.equal(badge.textContent,'Kein Gerät');
  button.value = 'COM3';
  vm.runInContext('updateDeviceConnectionState("offline")',ctx);
  assert.equal(badge.textContent,'COM3 · Keine Firmwareantwort');
  vm.runInContext('currentLang="en"; updateDeviceConnectionState("offline")',ctx);
  assert.equal(badge.textContent,'COM3 · No firmware response');
  button.value = '';

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
  assert.equal(vm.runInContext('deviceProfileName(2,3,{name:" Singledevice "})',ctx),'Singledevice');
  assert.equal(vm.runInContext('deviceProfileName(1,3,{name:""})',ctx),'worker1');
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
  const ctx=vm.createContext({serialPortScore:port=>port.name === 'USB' ? 250 : 0});
  vm.runInContext(source.slice(source.indexOf('function choosePreferredSerialPort('),source.indexOf('async function applySelectedSerialPort(')),ctx);
  assert.equal(vm.runInContext('choosePreferredSerialPort([{port:"COM5",name:"USB"}],"COM4")',ctx),'COM5');
  assert.equal(vm.runInContext('choosePreferredSerialPort([{port:"COM5"},{port:"COM4"}],"COM4")',ctx),'COM4');
  assert.equal(vm.runInContext('choosePreferredSerialPort([{port:"COM5",name:"USB"},{port:"COM6",name:"USB"}],"COM4")',ctx),'');
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
    $: languageNode, currentLang:'de', packageGeneration:()=> 'Updates', selectedPackageRef:()=>languageNode('packageVersion').value, selectedPackageRoot:()=> 'Updates', appConfig:{package_ref:'v1.65.5'},
    document:{createElement:()=>({})}, URLSearchParams,
    setInlineStatus(){},
    api:async url=>{requested=url; return {languages:[{filename:'deutsch.json',language:'deutsch',path:'data/language/deutsch.json'}]};}
  });
  vm.runInContext(source.slice(source.indexOf('function selectedPackageUsesIdf6('),
    source.indexOf('function packageGeneration(')),ctx);
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
  assert.match(requested,/package_idf6=0/);
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
  assert.equal(get('packageVersion').value,'https://example/Updates/ESP32-IDF5dev');
  assert.match(get('packageDir').value,/Updates.*IDF5dev/);
  assert.equal(vm.runInContext('packageSelectionReady',ctx),true);
  get('packageSource').value='development_170';
  vm.runInContext('migrationPackageSelection = true',ctx);
  let target='';
  ctx.setInlineStatus=(id,value)=>{target=id;status=value;};
  ctx.api=async()=>({packages:[{key:'development_170',available:false,
    path:'https://example/development/Updates/ESP32-IDF5dev',error:'GitHub API limit: retry at 21:25:06'}]});
  await vm.runInContext('loadPackages()',ctx);
  assert.match(get('packageDir').value,/development\/Updates/);
  assert.equal(vm.runInContext('packageSelectionReady',ctx),false);
  assert.equal(target,'migrationInlineStatus');
  assert.match(status,/retry at 21:25:06/);
  console.log('Package UI: missing release clears stale URL; special version becomes selectable');
})().catch(error=>{console.error(error);process.exitCode=1;});

(async () => {
  const ns={};
  const get=id=>ns[id] ||= {value:'',children:[],appendChild(v){this.children.push(v);}};
  get('packageSource').value='development_idf6';
  get('packageDir').value='https://example/development/Updates/ESP32-IDF6dev';
  const status={};
  let rejectOld;
  const oldRequest=new Promise((_resolve,reject)=>{rejectOld=reject;});
  let calls=0;
  const ctx=vm.createContext({$:get,currentLang:'de',packageGeneration:()=> 'Updates',selectedPackageRef:()=>'',selectedPackageRoot:()=> 'Updates',
    document:{createElement:()=>({})},URLSearchParams,
    setInlineStatus:(id,value)=>{status[id]=value;},
    api:url=>{
      assert.match(url,/package_idf6=1/);
      return ++calls===1 ? oldRequest : Promise.resolve({languages:[
        {filename:'english.json',language:'english',path:'Updates/languages/english.json'}
      ]});
    }
  });
  vm.runInContext(source.slice(source.indexOf('function selectedPackageUsesIdf6('),
    source.indexOf('function packageGeneration(')),ctx);
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

(async () => {
  for (const backupType of ['api', 'flash']) {
    const elements = {migrationSession:{value:''},portSelect:{value:backupType === 'api' ? '' : 'COM3'},
      baudSelect:{value:'921600'},migrationProgress:{value:0}};
    const requests = [], messages = [], errors = [];
    const ctx = vm.createContext({$:id=>elements[id], currentLang:'de',
      effectiveDeviceBaseUrl:()=> 'http://selected',
      api:async(url,options)=>{requests.push({url,options}); return url.endsWith('/pick')
        ? {directory:'backup-folder',backup_type:backupType} : {job_id:'job'};},
      confirm:message=>{messages.push(message); return true;},
      setButtonsDisabled:()=>{},setSpinner:()=>{},watchJobToTarget:()=>{},text:k=>k,
      appendStatus:(...args)=>errors.push(args)});
    vm.runInContext(source.slice(source.indexOf('async function recoverMigration('),
      source.indexOf('function sanitizeSerialLine(')),ctx);
    await vm.runInContext('recoverMigration("restore")',ctx);
    assert.equal(errors.length,0);
    assert.equal(requests[1].options.body.base_url,'http://selected');
    assert.equal(requests[1].options.body.backup_dir,'backup-folder');
    assert.match(messages[0],backupType === 'api' ? /Firmware bleibt erhalten/ : /Flash-Inhalt/);
  }
  console.log('Migration restore: API without COM port, explicit API/full-flash confirmation');
})().catch(error=>{console.error(error);process.exitCode=1;});

require('./device_check_regressions.js');
require('./startup_wifi_regressions.js');
require('./port_selection_regressions.js');

{
  const elements = {};
  const get = id => elements[id] ||= {dataset:{}, value:'', classList:{toggle(){}}, setAttribute(name, value){ this[name] = value; }};
  const ctx = vm.createContext({document:{getElementById:get}, currentLang:'de', workspaceReady:true,
    workspaceView:'connection', appConfig:{profiles_enabled:false},
    activeConnectionProfile:()=>null, activeProfilePortOverride:()=>null, verifiedSerialUrl:()=>'', profileChangePending:false,
    text:key=>key, lastDeviceStatus:{state:'online', serial_confirmed:false, serial_port:'COM3'}});
  vm.runInContext(workspaceSource.slice(workspaceSource.indexOf('function renderWorkspaceConnections('),
    workspaceSource.indexOf('async function saveWorkspaceProfilePort(')), ctx);
  ctx.workspaceText = de => de;
  vm.runInContext('renderWorkspaceConnections()', ctx);
  assert.equal(get('usbConnectionStatus').dataset.state, 'off');
  assert.equal(get('networkConnectionStatus').dataset.state, 'on');
  assert.equal(get('headerProfileSelect').hidden, true);
  ctx.appConfig = {profiles_enabled:true, device_profiles:[]};
  get('portSelect').dataset = {missingProfilePort:'COM3', detectedUsbPorts:'COM4'};
  for (const view of ['connection', 'install', 'settings']) {
    ctx.workspaceView = view;
    vm.runInContext('renderWorkspaceConnections()', ctx);
    assert.equal(get('workspaceConnections').hidden, false);
    assert.equal(get('headerProfileSelect').hidden, false);
    assert.equal(get('usbConnectionStatus')['aria-label'], 'Profilport COM3 nicht verfügbar. USB-Adapter erkannt: COM4.');
  }
  ctx.activeConnectionProfile = () => ({id:'primary',port:'COM3',url:'http://brautomat.local'});
  ctx.activeProfilePortOverride = () => ({id:'primary',port:'COM4'});
  get('portSelect').value='COM4';
  ctx.workspaceView = 'connection';
  ctx.lastDeviceStatus = {serial_port:'COM4',serial_mismatch:true};
  vm.runInContext('renderWorkspaceConnections()',ctx);
  assert.equal(get('profilePortStatus').textContent,'flashUsbMismatch');
  assert.equal(get('saveProfilePort').hidden,true);
  ctx.lastDeviceStatus = {serial_port:'COM4',serial_confirmed:true};
  ctx.verifiedSerialUrl = () => 'http://brautomat.local';
  vm.runInContext('renderWorkspaceConnections()',ctx);
  assert.equal(get('saveProfilePort').hidden,false);
  assert.equal(get('saveProfilePort').textContent,'COM4 im Profil speichern');
  vm.runInContext(workspaceSource.slice(workspaceSource.indexOf('async function saveWorkspaceProfilePort('),
    workspaceSource.indexOf('function selectWorkspaceView(')),ctx);
  const changes = [];
  ctx.submitDeviceProfile = async payload => { changes.push(JSON.parse(JSON.stringify(payload))); };
  ctx.lastDeviceStatus.serial_mismatch = true;
  vm.runInContext('saveWorkspaceProfilePort()',ctx);
  assert.deepEqual(changes,[]);
  ctx.lastDeviceStatus.serial_mismatch = false;
  vm.runInContext('saveWorkspaceProfilePort()',ctx);
  assert.deepEqual(changes,[{action:'update',id:'primary',url:'http://brautomat.local',port:'COM4'}]);
  ctx.workspaceView = 'start';
  ctx.lastDeviceStatus.state = 'online';
  vm.runInContext('renderWorkspaceConnections()', ctx);
  assert.equal(get('headerProfileSelect').hidden, true);
  assert.equal(get('usbConnectionStatus').dataset.state, 'on');
  assert.equal(get('networkConnectionStatus').dataset.state, 'on');
  ctx.startState = {kind:'setup'};
  vm.runInContext('renderWorkspaceConnections()', ctx);
  assert.equal(get('usbConnectionStatus')['aria-label'], 'USB noch nicht geprüft');
  ctx.workspaceView = 'management';
  vm.runInContext('renderWorkspaceConnections()', ctx);
  assert.equal(get('workspaceConnections').hidden, true);
}

(async () => {
  const wizard = fs.readFileSync('static/start-assistant.js', 'utf8');
  const phases = [
    {status:'running', progress:0, phase:'package'}, {status:'running', progress:1, phase:'device'},
    {status:'running', progress:1, phase:'erase'}, {status:'done', progress:100, phase:'write'}
  ];
  const observed = [];
  const state = {};
  const ctx = vm.createContext({startState:state, startJobPhases:{package:'package', device:'device', erase:'erase', write:'write'},
    api:async()=>phases.shift(), renderStart(){observed.push([state.message, state.progress]);},
    sleep:async()=>{}, verifyStartJob:async()=>{}});
  vm.runInContext(wizard.slice(wizard.indexOf('async function watchStartJob('), wizard.indexOf('function startVersion(')), ctx);
  await vm.runInContext('watchStartJob("job")', ctx);
  assert.deepEqual(observed, [['package', null], ['device', null], ['erase', null], ['write', 100]]);
})().catch(error=>{console.error(error); process.exitCode=1;});

{
  const html = fs.readFileSync('static/index.html', 'utf8');
  const wizard = fs.readFileSync('static/start-assistant.js', 'utf8');
  const start = html.slice(html.indexOf('id="startChoices"'), html.indexOf('id="startAssistant"'));
  assert.doesNotMatch(start, /<h2>/);
  for (const task of ['Setup', 'Update', 'Migration', 'Backup']) {
    const kind = task.toLowerCase();
    const row = start.match(new RegExp('<button[^>]+data-assistant="' + kind + '"[^>]*>[\\s\\S]*?</button>'))?.[0];
    assert.ok(row, kind);
    assert.match(row, new RegExp('aria-labelledby="' + kind + 'StartLabel"'));
    assert.match(row, new RegExp('aria-describedby="start' + task + 'Help"'));
    assert.match(row, new RegExp('<span id="' + kind + 'StartLabel"'));
    assert.match(row, new RegExp('<span id="start' + task + 'Help"'));
  }
  const nodes = {};
  const get = id => nodes[id] ||= {type:'password', attrs:{}, events:{},
    setAttribute(name,value){ this.attrs[name]=value; },
    addEventListener(name,handler){ this.events[name]=handler; }};
  const ctx = vm.createContext({$:get, currentLang:'de', appConfig:{}});
  vm.runInContext(source.slice(source.indexOf('function updateWifiPasswordVisibility('),
    source.indexOf('function applyLanguage(')), ctx);
  vm.runInContext(workspaceSource.match(/^function workspaceText.*$/m)[0], ctx);
  vm.runInContext(wizard, ctx);
  vm.runInContext('initializeStart()', ctx);
  const guide = get('startBrautomatGuide');
  assert.equal(guide.href, 'https://innuendopi.gitbook.io/brautomat32/brautomat32');
  vm.runInContext('currentLang = "en"; translateStart()', ctx);
  assert.equal(guide.href, 'https://innuendopi.gitbook.io/brautomat32');
  vm.runInContext('currentLang = "de"; translateStart()', ctx);
  assert.equal(guide.href, 'https://innuendopi.gitbook.io/brautomat32/brautomat32');
  const reveal = get('startPasswordReveal');
  reveal.events.click();
  assert.equal(get('startPassword').type, 'text');
  assert.equal(reveal.attrs['aria-pressed'], 'true');
  assert.equal(reveal.attrs['aria-label'], 'Passwort verbergen');
  reveal.events.click();
  assert.equal(get('startPassword').type, 'password');
  assert.equal(reveal.attrs['aria-pressed'], 'false');
  assert.equal(reveal.attrs['aria-label'], 'Passwort anzeigen');
}

(async () => {
  const wizard = fs.readFileSync('static/start-assistant.js', 'utf8');
  const state = { device:{port:'COM3', base_url:'http://brautomat.local'} };
  const requests = [];
  const jobs = [];
  let finished = false;
  const ctx = vm.createContext({startState:state, renderStart(){},
    showStartStep(message, next){ Object.assign(state, {message, next}); },
    startRequest:async action=>{
      requests.push(action);
      if (action === 'backup') return {job_id:'backup'};
      return action === 'verify' ? state.device : {action:'reset', version:'1.71.0'};
    },
    waitForConfigBackup:async id=>{assert.equal(id,'backup'); return 'backup.json';},
    showStartWifi:async()=>{state.step='wifi';},
    finishStart(){ finished = true; },
    runStartJob:async confirmed=>jobs.push(confirmed)
  });
  vm.runInContext(wizard.slice(wizard.indexOf('function showExistingSetup('),
    wizard.indexOf('async function showStartWifi(')), ctx);
  vm.runInContext('showExistingSetup()', ctx);
  assert.equal(state.step, 'setup-choice');
  assert.deepEqual(requests, []);
  await state.next.run();
  assert.equal(finished, true);
  assert.deepEqual(requests, ['verify']);
  await vm.runInContext('prepareStartReset()', ctx);
  assert.equal(state.step, 'reset-confirm');
  assert.match(state.message[0], /vollständig gelöscht/);
  assert.match(state.message[0], /1\.71\.0/);
  assert.deepEqual(jobs, []);
  vm.runInContext('showExistingSetup()', ctx);
  assert.equal(state.plan.action, 'setup_existing');
  await vm.runInContext('prepareStartReset()', ctx);
  assert.match(state.next.label[0],/Ohne Sicherung/);
  await vm.runInContext('backupStartReset()', ctx);
  assert.equal(requests.at(-1),'backup');
  assert.equal(state.backupFile,'backup.json');
  assert.doesNotMatch(state.next.label[0],/Ohne Sicherung/);
  assert.deepEqual(jobs, []);
  await state.next.run();
  assert.deepEqual(jobs, [true]);
  state.device.base_url = '';
  await vm.runInContext('backupStartReset()', ctx);
  assert.equal(state.step,'wifi');
  assert.equal(state.backupWifiPending,true);
  state.backupFile = '';
  const reconnected = {...state.device, firmware:'1.66.6', base_url:'http://192.168.1.23'};
  ctx.startVersion = firmware => firmware;
  ctx.startRequest = async action => action === 'verify' ? reconnected : {action:'reset',version:'1.71.0'};
  vm.runInContext(wizard.slice(wizard.indexOf('async function verifyStartJob('),
    wizard.indexOf('function finishStart(')), ctx);
  await vm.runInContext('verifyStartJob()',ctx);
  assert.equal(state.device,reconnected);
  assert.equal(state.backupWifiPending,false);
  assert.equal(state.step,'reset-confirm');
})().catch(error=>{console.error(error); process.exitCode=1;});

(async () => {
  const elements = {};
  const get = id => elements[id] ||= {classList: {hidden:false,
    add(){this.hidden=true;}, remove(){this.hidden=false;}, toggle(_,hidden){this.hidden=hidden;}}};
  let online = false;
  const ctx = vm.createContext({$:get, currentLang:'de', deviceIsOnline:()=>online,
    text:key=>key, escapeHtml:String, effectiveDeviceBaseUrl:()=> 'http://device',
    setInlineStatus:(id,message)=>{get(id).textContent=message;},
    api:async()=>({decision:'migration_required',available:false})});
  vm.runInContext(source.slice(source.indexOf('function renderFirmwareUpdate('),
    source.indexOf('async function startFirmwareWebUpdate(')),ctx);
  await vm.runInContext('checkFirmwareUpdate(true)',ctx);
  assert.equal(get('firmwareUpdateHint').textContent,'firmwareUpdateOffline');
  assert.equal(get('firmwareUpdateConnection').classList.hidden,false);
  online = true;
  await vm.runInContext('checkFirmwareUpdate(true)',ctx);
  assert.equal(get('firmwareUpdateMigration').classList.hidden,false);
  assert.equal(get('startFirmwareWebUpdate').classList.hidden,true);
  vm.runInContext('renderFirmwareUpdate({decision:"usb_required"},true)',ctx);
  assert.equal(get('firmwareUpdateMigration').textContent,'firmwareUpdateUsb');
  assert.equal(get('startFirmwareWebUpdate').classList.hidden,true);
  vm.runInContext('renderFirmwareUpdate({decision:"no_newer"},true)',ctx);
  assert.equal(get('firmwareUpdateMigration').classList.hidden,true);
})().catch(error=>{console.error(error); process.exitCode=1;});

(async () => {
  const wizard = fs.readFileSync('static/start-assistant.js', 'utf8');
  const html = fs.readFileSync('static/index.html', 'utf8');
  assert.match(html, /<select id="startNetworks">/);
  const requests = [];
  const elements = {
    startNetworks:{value:'', replaceChildren(...options){ this.options = options; }},
    startManualOption:{value:''}, startSsid:{value:''}
  };
  const ctx = vm.createContext({
    $:id=>elements[id], startState:{}, renderStart(){}, sleep:async()=>{},
    Option:class { constructor(label, value) { this.label = label; this.value = value; } },
    startRequest:async(action, options)=>{
      assert.equal(action, 'scan');
      requests.push(options.refresh);
      return requests.length < 3
        ? {status:'running', networks:[]}
        : {status:'ready', preferred_ssid:'Werkstatt', networks:[
          {ssid:'Brauhaus', rssi:-70}, {ssid:'Werkstatt', rssi:-66},
          {ssid:'Gast', rssi:-80}, {ssid:'Brauhaus', rssi:-45}, {ssid:''}
        ]};
    }
  });
  vm.runInContext(wizard.slice(wizard.indexOf('async function scanStartWifi('),
    wizard.indexOf('async function saveStartWifi(')), ctx);
  await vm.runInContext('scanStartWifi()', ctx);
  assert.deepEqual(requests, [true, false, false]);
  assert.equal(elements.startNetworks.value, 'Werkstatt');
  assert.deepEqual(elements.startNetworks.options.map(option=>option.value), ['Brauhaus', 'Werkstatt', 'Gast', '']);
  assert.equal(elements.startNetworks.options[0].label, 'Brauhaus (-45 dBm)');
  elements.startNetworks.value = 'Gast';
  await vm.runInContext('scanStartWifi()', ctx);
  assert.equal(elements.startNetworks.value, 'Gast');
  elements.startNetworks.value = '';
  elements.startSsid.value = 'Verstecktes Netz';
  await vm.runInContext('scanStartWifi()', ctx);
  assert.equal(elements.startNetworks.value, '');
  assert.equal(elements.startSsid.value, 'Verstecktes Netz');
})().catch(error=>{console.error(error); process.exitCode=1;});

(async () => {
  const source = fs.readFileSync("static/start-assistant.js", "utf8");
  const state = {step:"running", kind:"update"};
  const ctx = vm.createContext({startState:state, renderStart(){}, verifyStartJob(){}, probeStartDevice(){},
    api:async()=>{throw Object.assign(new Error("job not found"), {status:404});}});
  for (const [start,end] of [["async function startTask(", "function showStartStep("],
                             ["async function watchStartJob(", "function startVersion("]]) {
    vm.runInContext(source.slice(source.indexOf(start), source.indexOf(end)), ctx);
  }
  await vm.runInContext('startTask(() => watchStartJob("lost"))', ctx);
  assert.equal(state.jobId,null);
  assert.equal(state.error,"guided_job_lost");
  assert.equal(state.next.run,ctx.verifyStartJob);
})().catch(error=>{console.error(error);process.exitCode=1;});
