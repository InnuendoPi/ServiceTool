const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync('static/app.js', 'utf8');
const markup = fs.readFileSync('static/index.html', 'utf8');
for (const id of ['eraseFlashSelect', 'littlefsSelect']) {
  assert.doesNotMatch(markup.match(new RegExp('<input id="'+id+'"[^>]*>'))[0], /\bchecked\b/);
}
(async () => {
  const nodes = {};
  const get = id => nodes[id] ||= {
    value:'', checked:false, disabled:false, children:[], dataset:{}, classList:{toggle(name, force){ this[name] = force; }, contains(name){ return this[name] === true; }}, focus(){this.focused=true;},
    appendChild(item){this.children.push(item);},
    set innerHTML(value){this.children=[];},
    get selectedOptions(){return this.children.filter(item=>item.value===this.value);}
  };
  const oldUrl='https://example/ref/build/ESP32-IDF5dev';
  const newUrl='https://example/ref/Updates/ESP32-IDF5dev';
  const ctx=vm.createContext({$:get,currentLang:'de',appConfig:{package_ref:'ref',package_dir:oldUrl},
    lastDeviceStatus:{firmware:'1.70.4', resolved_ip:'192.168.1.23'},parseDeviceFirmwareVersion:()=>[1,70,4],compareVersionTuple:()=>1,
    document:{createElement:()=>({dataset:{}})},syncFirmwareActions(){},setInlineStatus(){},
    api:async()=>({packages:[],special_versions:[
      {ref:'ref',base_url:oldUrl,label:'1.66'}, {ref:'ref',base_url:newUrl,label:'1.70'}]})});
  get('packageSource').value='special';
  vm.runInContext(source.slice(source.indexOf('let packageLoadEpoch ='),source.indexOf('async function loadRepoLanguages(')),ctx);
  await vm.runInContext('loadPackages()',ctx);
  assert.equal(get('packageDir').value,oldUrl);
  assert.equal(get('packageVersion').value,oldUrl);
  assert.equal(vm.runInContext('selectedPackageRef()',ctx),'ref');
  assert.equal(vm.runInContext('packageSelectionReady',ctx),true);
  get('packageVersion').value=newUrl;
  assert.equal(vm.runInContext('selectedPackageRef()',ctx),'ref');
  assert.equal(get('packageVersion').selectedOptions[0].dataset.baseUrl,newUrl);

  let address = '';
  Object.assign(ctx, {selectedConnectionPort:'MOCK', verifiedSerialUrl:()=>address, managementServiceActive:()=>false,
    text:key=>key, setInlineStatus:(id, message)=>{get(id).textContent=message;}});
  vm.runInContext(source.slice(source.indexOf('let flashBackupBusy ='),source.indexOf('function setProgressState(')),ctx);
  for(const erase of [false,true])for(const littlefs of [false,true]){
    get('eraseFlashSelect').checked=erase;get('littlefsSelect').checked=littlefs;
    vm.runInContext('updateFlashBackupWarning()',ctx);
    assert.equal(get('littlefsSelect').checked,littlefs);
    assert.equal(get('littlefsSelect').disabled,false);
    assert.equal(get('flashBackupWarning').textContent === 'flashEraseWithoutFs',erase&&!littlefs);
    assert.equal(get('flashBackupPanel').classList['hidden-panel'],!erase&&!littlefs);
  }

  let submitted;
  let confirm = false;
  let confirmationCount = 0;
  Object.assign(ctx,{requireSerialPortForAction:()=>true,setSpinner(){},setProgressState(){},
    managementServiceActive:()=>false,managementDeviceUrl:()=> 'http://device',setStatus(){},appendStatus(){},
    loadBackups:async()=>{}, window:{confirm(){confirmationCount++;return confirm;}},
    watchJobToTarget:async()=>({status:'done',result:{backup_file:'C:\\backups\\backup.json'}}),
    api:async(url,request)=>{submitted={url,...request};return {job_id:'test'};}});
  get('packageDir').value=oldUrl;get('packageVersion').value=oldUrl;
  get('portSelect').value='MOCK';get('baudSelect').value='115200';
  ctx.lastDeviceStatus.serial_port = 'MOCK';
  ctx.lastDeviceStatus.serial_confirmed = true;
  vm.runInContext(source.slice(source.indexOf('async function startFlash('),source.indexOf('async function ',source.indexOf('async function startFlash(')+1)),ctx);
  ctx.lastDeviceStatus.serial_confirmed = false;
  vm.runInContext('updateFlashBackupWarning()',ctx);
  assert.equal(get('flashBtn').classList.contains('hidden-panel'),true);
  await vm.runInContext('startFlash()',ctx);
  assert.equal(submitted,undefined);
  assert.equal(confirmationCount,0);
  ctx.lastDeviceStatus.serial_confirmed = true;
  ctx.lastDeviceStatus.serial_mismatch = true;
  vm.runInContext('updateFlashBackupWarning()',ctx);
  assert.equal(get('flashUsbStatus').textContent,'flashUsbMismatch');
  await vm.runInContext('startFlash()',ctx);
  assert.equal(submitted,undefined);
  assert.equal(confirmationCount,0);
  ctx.lastDeviceStatus.serial_mismatch = false;
  vm.runInContext('updateFlashBackupWarning()',ctx);
  assert.equal(get('flashBackupBtn').classList.contains('hidden-panel'),true);
  assert.equal(get('flashBackupConnection').classList.contains('hidden-panel'),false);
  assert.equal(get('flashBtn').textContent,'flashSkipBackup');
  await vm.runInContext('startFlash()',ctx);
  assert.equal(submitted,undefined);
  assert.equal(confirmationCount,1);
  ctx.workspaceView = 'install';
  ctx.selectWorkspaceView = view => {ctx.workspaceView=view;};
  vm.runInContext('showFlashConnection(true)',ctx);
  assert.equal(ctx.workspaceView,'connection');
  assert.equal(get('wifiNetworks').focused,true);
  assert.equal(get('flashBackToPackage').classList.contains('hidden-panel'),false);
  get('deviceUrl').value = 'http://brautomat.local';
  Object.assign(ctx,{currentSerialProvisioning:()=>({serial_port:'MOCK',serial_baud:115200}),
    requireSerialPortForAction:()=>true,setButtonsDisabled(){},effectiveDeviceBaseUrl:()=>'',
    updateDeviceConnectionState(state){get('deviceConnectionState').dataset.state=state;},
    scheduleDeviceCheckUntilOnline:async()=>{
      address = 'http://192.168.1.23';
      get('deviceConnectionState').dataset.state = 'online';
      return address;
    }});
  const flashApi = ctx.api;
  ctx.api = async (url, request)=>{
    assert.equal(url,'/api/wifi/save');
    assert.equal(request.body.serial_port,'MOCK');
    return {saved:true,rebootScheduled:true};
  };
  vm.runInContext(source.slice(source.indexOf('async function saveWifi('),source.indexOf('async function startFlash(')),ctx);
  await vm.runInContext('saveWifi()',ctx);
  ctx.api = flashApi;
  assert.equal(ctx.workspaceView,'install');
  assert.equal(get('packageDir').value,oldUrl);
  assert.equal(get('packageVersion').value,oldUrl);
  assert.equal(get('eraseFlashSelect').checked,true);
  assert.equal(get('littlefsSelect').checked,true);
  assert.equal(get('flashBackupBtn').focused,true);
  assert.equal(get('flashBackupBtn').classList.contains('hidden-panel'),false);
  await vm.runInContext('backupBeforeFlash()',ctx);
  assert.equal(submitted.url,'/api/backup');
  assert.equal(submitted.body.base_url,address);
  assert.equal(submitted.body.include_api,true);
  assert.match(get('flashBackupStatus').textContent,/backup.json/);
  assert.equal(get('flashBtn').textContent,'flashEraseAndInstall');
  address = 'http://192.168.1.24';
  await vm.runInContext('startFlash()',ctx);
  assert.equal(confirmationCount,2);
  assert.equal(submitted.url,'/api/backup');
  address = 'http://192.168.1.23';
  await vm.runInContext('startFlash()',ctx);
  assert.equal(submitted.url,'/api/flash');
  assert.equal(confirmationCount,2);
  assert.equal(submitted.body.source_firmware,'1.70.4');
  assert.equal(submitted.body.package_ref,'ref');
  assert.equal(submitted.body.package_dir,oldUrl);
  console.log('USB UI: distinct special layouts, source firmware and independent flash options verified');
})().catch(error=>{console.error(error);process.exitCode=1;});
