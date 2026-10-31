const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync('static/app.js', 'utf8');
(async () => {
  const nodes = {};
  const get = id => nodes[id] ||= {
    value:'', checked:false, disabled:false, children:[], dataset:{}, classList:{toggle(){}},
    appendChild(item){this.children.push(item);},
    set innerHTML(value){this.children=[];},
    get selectedOptions(){return this.children.filter(item=>item.value===this.value);}
  };
  const oldUrl='https://example/ref/build/ESP32-IDF5dev';
  const newUrl='https://example/ref/Updates/ESP32-IDF5dev';
  const ctx=vm.createContext({$:get,currentLang:'de',appConfig:{package_ref:'ref',package_dir:oldUrl},
    lastDeviceStatus:{firmware:'1.70.4'},parseDeviceFirmwareVersion:()=>[1,70,4],compareVersionTuple:()=>1,
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

  ctx.text=()=> 'Backup';
  vm.runInContext(source.slice(source.indexOf('function syncFlashOptionDependencies('),source.indexOf('function setProgressState(')),ctx);
  for(const erase of [false,true])for(const littlefs of [false,true]){
    get('eraseFlashSelect').checked=erase;get('littlefsSelect').checked=littlefs;
    vm.runInContext('updateFlashBackupWarning()',ctx);
    assert.equal(get('littlefsSelect').checked,littlefs);
    assert.equal(get('littlefsSelect').disabled,false);
    assert.equal(get('flashBackupWarning').textContent.includes('nicht neu geschrieben'),erase&&!littlefs);
  }

  let submitted;
  Object.assign(ctx,{requireSerialPortForAction:()=>true,setSpinner(){},setProgressState(){},
    managementServiceActive:()=>false,managementDeviceUrl:()=> 'http://device',setStatus(){},appendStatus(){},
    watchJobToTarget:async()=>({status:'done'}),api:async(url,request)=>{submitted={url,...request};return {job_id:'test'};}});
  get('packageDir').value=oldUrl;get('packageVersion').value=oldUrl;
  get('portSelect').value='MOCK';get('baudSelect').value='115200';
  vm.runInContext(source.slice(source.indexOf('async function startFlash('),source.indexOf('async function ',source.indexOf('async function startFlash(')+1)),ctx);
  await vm.runInContext('startFlash()',ctx);
  assert.equal(submitted.url,'/api/flash');
  assert.equal(submitted.body.source_firmware,'1.70.4');
  assert.equal(submitted.body.package_ref,'ref');
  assert.equal(submitted.body.package_dir,oldUrl);
  console.log('USB UI: distinct special layouts, source firmware and independent flash options verified');
})().catch(error=>{console.error(error);process.exitCode=1;});
