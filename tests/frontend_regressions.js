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
