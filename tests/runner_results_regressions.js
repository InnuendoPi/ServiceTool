const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('static/app.js', 'utf8');
const nodes = {};
const get = id => nodes[id] ||= {textContent:'',title:'',classList:{
  toggle(name, value){this[name]=value;}
},removeAttribute(name){delete this[name];}};
const ctx=vm.createContext({$:get,currentLang:'de',
  deriveTestRunnerCountsFromLines:()=>({pass:3,fail:2,warn:1}),
  extractTestRunnerCurrentStep:()=> 'Last step',
  formatTestRunnerReportLabel:value=>({text:value,title:value})});
vm.runInContext(source.slice(source.indexOf('function renderTestRunnerLiveCounts('),source.indexOf('function renderTestRunnerLog(')),ctx);
ctx.snapshot={running:false,status:'done',suite_label:'Complete',counts:{pass:74,fail:0,warn:0},
  report_url:'/api/test-runner/reports/complete/20260918/report.html',out_dir:'C:/reports/complete/20260918'};
vm.runInContext('renderTestRunnerSummary(snapshot)',ctx);
assert.equal(get('testRunnerLiveCounts').classList['hidden-panel'],false);
assert.equal(get('testRunnerPassBadge').textContent,'PASS 74');
assert.equal(get('testRunnerFailBadge').textContent,'FAIL 0');
assert.equal(get('testRunnerSummarySuite').textContent,'Complete');
assert.equal(get('testRunnerSummaryStatus').textContent,'done');
assert.equal(get('testRunnerReportLink').href,ctx.snapshot.report_url);
assert.match(get('testRunnerReportLocation').textContent,/C:\/reports\/complete\/20260918/);
ctx.snapshot={running:false,status:'idle',counts:{}};
vm.runInContext('renderTestRunnerSummary(snapshot)',ctx);
assert.equal(get('testRunnerLiveCounts').classList['hidden-panel'],true);
assert.equal(get('testRunnerReportLink').classList['hidden-panel'],true);
assert.equal(get('testRunnerReportLink').href,undefined);
console.log('Test Runner: completed counts, report link and directory remain visible');
