const assert=require('node:assert/strict');
const D=require('../static/designer-core.js');
const plan=D.create();plan.name='Plan';
const a=D.step('Rast',63,30),b=D.step('Pumpe:ON',0,0,false),c=D.step('Kochen',100,60);
plan.steps=[a,b,c];
let moved=D.move(plan,b.id,'steps',a.id);
assert.deepEqual(moved.steps.map(s=>s.id),[b.id,a.id,c.id]);
assert.deepEqual(plan.steps.map(s=>s.id),[a.id,b.id,c.id]);
moved=D.move(moved,b.id,'dock');assert.equal(moved.dock[0].id,b.id);assert.equal(moved.steps.length,2);
moved=D.move(moved,b.id,'steps');assert.equal(moved.steps.at(-1).id,b.id);assert.equal(moved.dock.length,0);
assert.deepEqual(D.move(plan,a.id,'steps',a.id),plan);
const snapshot={captured_at:Date.now()/1000,complete:true,actors:[{NAME:'Pumpe'}],kettles:[{enabled:1,name:'Maische'}],profiles:{'Heizen.json':{}},remote:{workers:[{id:'stable',host:'worker1',actors:[{slot:2,name:'Ventil'}],kettles:[]}]}};
assert.equal(D.resources(snapshot).find(r=>r.remote).command,'worker1/Ventil');
plan.snapshot=snapshot;plan.generation='1.66';plan.steps.push(D.step('worker1/Ventil:ON'));
const before=JSON.stringify(plan);const notes=D.review(plan);
assert.ok(notes.some(n=>n.code==='generation'));assert.ok(notes.some(n=>n.code==='manual'));
assert.equal(JSON.stringify(plan),before,'advisory review must never change the plan');
const other=D.clone(plan);other.steps[0].Dauer=45;
assert.deepEqual(D.compare(plan,other)[0].changed,['Dauer']);
console.log('Designer: reorder, dock, stable resources, advisory-only review and comparison verified');

const commands={actors:[{NAME:'Ruehrwerk',PWMSW:1}],kettles:[{name:'Braukessel',enabled:1},{name:'Sudtopf',enabled:1},{name:'Wassertopf',enabled:1},{name:'Fermenter',enabled:1}],profiles:{'Aufheizen.json':{}},multidevice:{mode:1}};
for(const name of ['IDS:37','MAISCHE:ON','Braukessel:OFF','MLT:20','NACHGUSS:100'])assert.equal(D.commandAction(D.step(name),commands).kind,'kettle');
for(const name of ['IDSTHRESOUT:37','MAISCHETHRESOUT:20','BraukesselTHRESOUT:100','SUDTHRESOUT:75','HLTTHRESOUT:80','SudtopfTHRESOUT:70','WassertopfTHRESOUT:60'])assert.equal(D.commandAction(D.step(name),commands).operation,'threshold');
for(const name of ['IDSPROFIL:Aufheizen','MLTPROFIL:Aufheizen','NACHGUSSPROFIL:Aufheizen','BraukesselPROFIL:Aufheizen!'])assert.equal(D.commandAction(D.step(name),commands).argument,'Aufheizen');
assert.equal(D.commandAction(D.step('COOLER:ON'),commands).operation,'cooler');
assert.equal(D.commandAction(D.step('HEATER:OFF'),commands).operation,'heater');
assert.equal(D.actorAction(D.step('master/Ruehrwerk:37'),commands).pwm,true);
commands.remote={workers:[{id:'w',host:'worker1',actors:[{name:'Ventil',slot:0}],kettles:[{name:'Wassertopf',slot:2,selected:true}]}]};
assert.equal(D.actorAction(D.step('worker1/Ventil:ON'),commands).pwm,false);
assert.equal(D.commandAction(D.step('HLT:70'),commands).resource.remote,true);
assert.equal(D.commandAction(D.step('worker1/HLTPROFIL:Aufheizen'),commands).resource.remote,true);
assert.equal(D.kettleCommand(D.commandAction(D.step('HLT:70'),commands).resource,'profile'),'worker1/HLTPROFIL');
assert.equal(D.resources(commands).find(r=>r.kind==='kettle'&&r.slot===2&&!r.remote).assigned,false);

const mashOnly={kettles:[{name:'Maische',enabled:1},{name:'Sud',enabled:0},{name:'Hlt',enabled:1},{name:'Fermenter',enabled:1}],remote:{workers:[{id:'w',host:'worker',kettles:[{slot:3,name:'Fermenter'},{slot:1,name:'Disabled',enabled:0}]}]}};
assert.deepEqual(D.resources(mashOnly).filter(r=>r.kind==='kettle').map(r=>r.name),['Maische','Hlt']);
mashOnly.kettles[1].enabled='0';
assert.deepEqual(D.resources(mashOnly).filter(r=>r.kind==='kettle').map(r=>r.slot),[0,2]);

// Special commands consume only their own side unless both next steps are commands.
const comparisonPlan=names=>({...D.create(),steps:names.map(name=>D.step(name))});
const pairs=(a,b)=>D.compare(a,b).map(row=>[row.left?.Rast??null,row.right?.Rast??null]);
const leftPlan=comparisonPlan(['Rast 1','Rast 2']);
const rightPlan=comparisonPlan(['Ruehrwerk:ON','IDSPROFIL:Heizen','Rast 1','MAISCHETHRESOUT:80','Rast 2','worker/Pumpe:OFF']);
const untouched=JSON.stringify([leftPlan,rightPlan]);
const expected=[[null,'Ruehrwerk:ON'],[null,'IDSPROFIL:Heizen'],['Rast 1','Rast 1'],[null,'MAISCHETHRESOUT:80'],['Rast 2','Rast 2'],[null,'worker/Pumpe:OFF']];
assert.deepEqual(pairs(leftPlan,rightPlan),expected);
assert.deepEqual(pairs(rightPlan,leftPlan),expected.map(([a,b])=>[b,a]));
assert.ok(D.compare(leftPlan,rightPlan).every(row=>row.changed.length===0));
assert.equal(JSON.stringify([leftPlan,rightPlan]),untouched);
const both=D.compare(comparisonPlan(['Pumpe:ON','Rast']),comparisonPlan(['Pumpe:OFF','HLT:100','Rast']));
assert.deepEqual(both[0].changed,['Rast']);assert.equal(both[1].left,undefined);assert.equal(both[2].left.Rast,'Rast');
assert.deepEqual(pairs(comparisonPlan([]),leftPlan),[[null,'Rast 1'],[null,'Rast 2']]);
assert.deepEqual(pairs(comparisonPlan([]),comparisonPlan([])),[]);
assert.deepEqual(pairs(comparisonPlan(['Hinweis: Jodprobe']),comparisonPlan(['Rast'])),[['Hinweis: Jodprobe','Rast']]);
const configured=comparisonPlan(['BraukesselPROFIL:Heizen','Rast']);configured.snapshot=commands;
assert.equal(D.compare(configured,comparisonPlan(['Rast']))[0].right,undefined);
console.log('Designer comparison: one-sided commands, command runs, both sides, aliases, empty plans and tails verified');

const timed=D.create();timed.misc={Kochdauer:60,Nachiso:10};
timed.steps=[D.step('Pumpe:ON',0,5),D.step('Rast',63,40),D.step('Kochen',98,60),D.step('Nachisomerisierung',0,10,false)];
timed.dock=[D.step('Parked',50,100)];
assert.deepEqual(D.timing(timed),{steps:4,dock:1,manual:1,mash:40,boil:60,after:10,hold:110});
timed.steps[2].Rast='Hopfen';timed.steps[2].original={elapsed:0};assert.equal(D.timing(timed).mash,40);
timed.steps[2].original={};assert.equal(D.timing(timed).mash,null);
timed.steps[1].Dauer='invalid';assert.equal(D.timing(timed).hold,null);
assert.equal(D.timing(D.create()).mash,null);

const remotePlan={...D.create(),snapshot:commands,steps:[]};
const remoteCheck=(name,temp=0,duration=0)=>{remotePlan.steps=[D.step(name,temp,duration)];return D.review(remotePlan).map(n=>n.code);};
assert.ok(remoteCheck('HLT:ON').includes('remote_command'));
assert.ok(remoteCheck('HLT:101',70).includes('remote_command'));
assert.ok(remoteCheck('HLT:ON',111).includes('remote_command'));
assert.ok(remoteCheck('HLT:ON',70,5).includes('remote_command'));
assert.ok(!remoteCheck('HLT:ON',70).includes('remote_command'));
assert.ok(!remoteCheck('HLT:OFF').includes('remote_command'));
assert.ok(remoteCheck('worker1/HLTPROFIL:Aufheizen').includes('remote_profile_unknown'));
assert.ok(!remoteCheck('worker1/HLTPROFIL:Aufheizen').includes('profile_unknown'));
assert.ok(remoteCheck('worker1/HLTPROFIL:1234567890123456').includes('remote_profile_argument'));

for(const firmware of ['1.66.0','Brautomat32 V 1.66.9 Develop','1.62.0'])assert.equal(D.generationFor({firmware}),'1.66');
for(const firmware of ['1.70.1','Brautomat32 V 1.70.2 Develop','1.67.3','2.0.0',''])assert.equal(D.generationFor({firmware}),'1.67+');
assert.equal(D.generationFor(null),'1.67+');

const balancePlan=D.create();balancePlan.misc.Kochdauer=75;
balancePlan.steps=[D.step('Kochen Teilmaische',100,15),D.step('Rast',72,20),D.step('Kochen',100,20),D.step('Hopfen',98,0),D.step('Hopfen',98,10),D.step('Kochen',98,65),D.step('Nachisomerisierung',0,10),D.step('Whirlpool',80,20)];
balancePlan.dock=[D.step('Kochen',100,30)];
const balanceBefore=JSON.stringify(balancePlan);
assert.equal(D.boilBalance(balancePlan).actual,95);
assert.ok(D.review(balancePlan).some(n=>n.code==='boil_duration_difference'));
assert.equal(JSON.stringify(balancePlan),balanceBefore);
balancePlan.misc.Kochdauer=95;
assert.ok(!D.review(balancePlan).some(n=>n.code==='boil_duration_difference'));
balancePlan.misc.Kochdauer=0;
assert.equal(D.boilBalance(balancePlan),null);
assert.ok(!D.review(balancePlan).some(n=>n.code==='boil_duration_difference'));

const multi=D.create();multi.steps=['A','B','C','D'].map(n=>D.step(n));
const multiIds=[multi.steps[2].id,multi.steps[0].id];
assert.deepEqual(D.moveMany(multi,multiIds,'steps',multi.steps[3].id).steps.map(s=>s.Rast),['B','A','C','D']);
assert.deepEqual(D.moveMany(multi,multiIds,'dock').dock.map(s=>s.Rast),['A','C']);
assert.deepEqual(D.moveMany(multi,multiIds,'steps',multi.steps[0].id),multi);
assert.deepEqual(multi.steps.map(s=>s.Rast),['A','B','C','D']);

assert.equal(D.kettleCommand({slot:0},'threshold'),'MAISCHETHRESOUT');
for(const [slot,name] of [[1,'SUDTHRESOUT'],[2,'HLTTHRESOUT']])assert.equal(D.kettleCommand({slot},'threshold'),name);
