const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('static/app.js', 'utf8');
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
