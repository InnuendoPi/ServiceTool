const fs=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict');
const source=fs.readFileSync('static/app.js','utf8');
const nodes={}; const node=id=>nodes[id] ||= {value:'',dataset:{state:'serial'},appendChild(){},classList:{remove(){}}};
let requests=[], result, error='';
const ctx=vm.createContext({$:node,lastDeviceStatus:{firmware:''},currentLang:'de',
 currentSerialProvisioning:()=>({serial_port:'COM3',serial_baud:115200}),
 parseDeviceFirmwareVersion:s=>s ? s.split('.').map(Number) : null,
 compareVersionTuple:(a,b)=>a[0]-b[0] || a[1]-b[1] || a[2]-b[2],
 managementServiceActive:()=>false,document:{createElement:()=>({})},
 writeStartupTrace(){},setButtonsDisabled(){},setSpinner(){},setInlineStatus:(id,s)=>{error=s;},appendStatus(){},text:s=>s,
 wifiTransportProvisioning:()=>({serial_port:'COM3',serial_baud:115200}),effectiveDeviceBaseUrl:()=>'',
 requireSerialPortForAction:()=>true,applyWifiNetworksResult:r=>{result=r;},
 api:async(path,options)=>{requests.push({path,body:options.body});return {transport:'serial',status:'ready',networks:[{ssid:'Test'}]};}
});
vm.runInContext(source.slice(source.indexOf('function shouldUseHostWifiFallback('),source.indexOf('async function checkDevice(')),ctx);
vm.runInContext(source.slice(source.indexOf('async function scanWifi('),source.indexOf('async function saveWifi(')),ctx);
(async()=>{
 assert.equal(vm.runInContext('shouldUseHostWifiFallback()',ctx),false);
 await vm.runInContext('scanWifi(true,true)',ctx);
 await vm.runInContext('scanWifi(true,true)',ctx);
 assert.equal(requests.length,2);
 assert(requests.every(r=>r.path==='/api/wifi/scan' && r.body.serial_port==='COM3'));
 assert.equal(result.transport,'serial');
 ctx.lastDeviceStatus.firmware='1.61.0';assert.equal(vm.runInContext('shouldUseHostWifiFallback()',ctx),true);
 ctx.lastDeviceStatus.firmware='1.70.2';assert.equal(vm.runInContext('shouldUseHostWifiFallback()',ctx),false);
 ctx.lastDeviceStatus.firmware='';node('deviceConnectionState').dataset.state='offline';
 assert.equal(vm.runInContext('shouldUseHostWifiFallback()',ctx),false);
 ctx.api=async()=>{throw new Error('Port busy');};
 await vm.runInContext('scanWifi(true,true)',ctx);assert.match(error,/Port busy/);
 ctx.currentSerialProvisioning=()=>({serial_port:''});assert.equal(vm.runInContext('shouldUseHostWifiFallback()',ctx),true);
 console.log('WiFi regression passed: unknown firmware retries COM3, old firmware fallback retained, serial errors visible. All requests mocked.');
})().catch(e=>{console.error(e);process.exitCode=1});
