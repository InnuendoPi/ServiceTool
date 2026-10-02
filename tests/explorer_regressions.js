const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
class Element {
 constructor(){this.children=[];this.attributes={};this.dataset={};this.value='';this.textContent='';this.className='';this.classList={toggle:()=>{},contains:()=>false};this.events={};}
 append(...nodes){this.children.push(...nodes);} appendChild(n){this.children.push(n);return n;}
 replaceChildren(...nodes){this.children=[...nodes];} setAttribute(k,v){this.attributes[k]=v;}
 addEventListener(k,f){this.events[k]=f;} focus(){} showModal(){} close(){} remove(){} click(){return this.events.click?.({preventDefault(){}});}
 querySelectorAll(selector){return this.children.flatMap(n=>[...(selector==='button' && n.tag==='button' || selector==='[data-ex-action]' && n.dataset.exAction ? [n]:[]),...n.querySelectorAll(selector)]);}
 querySelector(selector){return this.children.find(n=>selector==='i' ? n.tag==='i' : n.className===selector.slice(1)) || null;}
}
{
 let state='offline',process;
 const status=vm.createContext({lastDeviceStatus:{active_process:{state:'idle'}},deviceIsOnline:()=>state==='online',
   updateDeviceConnectionState:value=>{state=value;},updateActiveProcessState:value=>{process=value.active_process;}});
 vm.runInContext(fs.readFileSync('static/app.js','utf8').match(/function recordExplorerDeviceResponse[\s\S]*?\n}/)[0],status);
 vm.runInContext('recordExplorerDeviceResponse()',status);
 assert.equal(state,'online');assert.equal(process.state,'unknown');assert.equal(status.lastDeviceStatus.transport,'http');
 status.lastDeviceStatus.active_process={state:'active',mode:'mash'};
 vm.runInContext('recordExplorerDeviceResponse()',status);
 assert.equal(status.lastDeviceStatus.active_process.state,'active');
}
(async()=>{
 const nodes={},get=id=>nodes[id] ||= new Element(),calls=[],copies=[];let onlineReports=0;
 let url='http://one',respond=async path=>path.startsWith('/api/explorer/list') ? {files:[{name:'a.txt',path:'/a.txt',type:'file',size:3,mtime:''}]} : {text:'<b>raw</b>',editable:true,sha256:'hash'};
 const ctx=vm.createContext({currentLang:'de',appConfig:{active_device_id:'one',inventory_root:'inventory'},
   document:{body:new Element(),addEventListener(){},getElementById:get,createElement:tag=>{const n=new Element();n.tag=tag;return n;},querySelectorAll:selector=>Object.values(nodes).flatMap(n=>n.querySelectorAll(selector))},
   recordExplorerDeviceResponse:()=>{onlineReports++;},window:{addEventListener(){}},workspaceProfiles:()=>[{id:'one'}],deviceProfileName:()=> 'Brautomat',
   managementDeviceUrl:()=>url,managementServiceActive:()=>false,URLSearchParams,confirm:()=>true,prompt:()=>null,
   api:async(path,options)=>{calls.push({path,options});return respond(path,options);},copyPlainTextToClipboard:async text=>copies.push(text)});
 vm.runInContext(fs.readFileSync('static/app.js','utf8').match(/function versionInfoForName[\s\S]*?\n}/)[0],ctx);
 vm.runInContext(fs.readFileSync('static/explorer.js','utf8'),ctx);
 vm.runInContext('initExplorer()',ctx);
 await vm.runInContext('loadExplorer()',ctx);
 const actions=id=>get(id).querySelectorAll('[data-ex-action]');
 assert.equal(actions('explorerCommands').at(-1).dataset.exAction,'refresh');
 assert.equal(actions('explorerCommands').at(-2).dataset.exAction,'delete');
 assert.deepEqual(actions('explorerViewCommands').map(b=>b.dataset.exAction),['preview']);
 assert.equal(actions('explorerViewCommands')[0].querySelector('i').className,'icon-preview-pane button-icon');
 assert.equal(onlineReports,1);
 assert.equal(get('explorerFiles').children.length,1);
 await vm.runInContext('exNavigate("device","/Profile/nested")',ctx);
 let parent=get('explorerFiles').children[0].children[0].children[0];
 assert.equal(parent.textContent,'..');
 await parent.click();assert.equal(vm.runInContext('ex.path',ctx),'/Profile');
 parent=get('explorerFiles').children[0].children[0].children[0];
 assert.equal(parent.textContent,'..');
 await parent.click();assert.equal(vm.runInContext('ex.path',ctx),'/');
 assert.equal(get('explorerFiles').children.length,1);
 assert.notEqual(get('explorerFiles').children[0].children[0].children[0].textContent,'..');

 await vm.runInContext('exSelect(ex.files[0])',ctx);
 assert.equal(get('explorerContent').value,'<b>raw</b>');
 assert.equal(get('explorerContent').readOnly,true);
 await vm.runInContext('exSelect({path:"/Rezepte",type:"dir"})',ctx);
 assert.equal(get('explorerContent').value,'');assert.equal(get('explorerContent').placeholder,'');
 await vm.runInContext('exSelect(ex.files[0])',ctx);
 await vm.runInContext('exCopy()',ctx);assert.equal(copies[0],'<b>raw</b>');
 vm.runInContext('ex.editing=true;ex.dirty=true;',ctx);ctx.confirm=()=>false;
 const beforeLocal=onlineReports;
 await vm.runInContext('exNavigate("local","/Rezepte")',ctx);
 assert.equal(onlineReports,beforeLocal);
 assert.equal(vm.runInContext('ex.side',ctx),'device');
 ctx.confirm=()=>true;
 await vm.runInContext('exNavigate("local","/Rezepte")',ctx);
 const transfer=actions('explorerCommands').find(b=>b.dataset.exAction==='transfer');
 assert.equal(transfer.querySelector('.explorer-command-label').textContent,'Auf Brautomat übertragen');

 assert.equal(get('explorerFiles').children[0].children[0].children[0].textContent,'..');
 assert.match(calls.at(-1).path,/side=local/);assert.match(calls.at(-1).path,/path=%2FRezepte/);
 await vm.runInContext('exSelect(ex.files[0]);',ctx);
 get('explorerContent').value='edited';vm.runInContext('ex.editing=true;ex.dirty=true;',ctx);
 await vm.runInContext('exSave()',ctx);
 const save=calls.find(c=>c.options?.body.action==='save');assert.equal(save.options.body.text,'edited');assert.equal(save.options.body.sha256,'hash');
 vm.runInContext('ex.side="local";ex.path="/";ex.files=[{name:"config_10.txt",path:"/config_10.txt",type:"file",size:1},{name:"config.txt",path:"/config.txt",type:"file",size:1},{name:"config_2.txt",path:"/config_2.txt",type:"file",size:1},{name:"orphan_1.txt",path:"/orphan_1.txt",type:"file",size:1}];exFiles()',ctx);
 assert.equal(get('explorerFiles').children.length,2);
 const toggle=get('explorerFiles').children[0].children[0].children[0];
 assert.equal(toggle.attributes['aria-expanded'],'false');await toggle.click();
 assert.equal(get('explorerFiles').children.length,5);
 const versionButton=get('explorerFiles').children[3].children[0].children[0];
 assert.equal(versionButton.children[1].textContent,'Version 1 — config_2.txt');
 assert.equal(get('explorerFiles').children[1].children[0].children[0].children[1].textContent,'Version 3 · Neueste — config.txt');
 await versionButton.click();assert.equal(vm.runInContext('ex.selected.path',ctx),'/config_2.txt');
 await get('explorerFiles').children[0].children[0].children[0].click();
 assert.equal(get('explorerFiles').children.length,2);assert.equal(vm.runInContext('ex.selected',ctx),null);
 vm.runInContext('ex.side="device";exFiles()',ctx);assert.equal(get('explorerFiles').children.length,4);
 vm.runInContext('ex.side="local"',ctx);
 const target=file=>{ctx.targetFile=file;return JSON.parse(vm.runInContext('JSON.stringify(exDeviceTarget(targetFile))',ctx));};
 assert.deepEqual(target({name:'config_1.txt',path:'/config/TestDevice/config_1.txt'}),{name:'config.txt',folder:'/'});
 assert.deepEqual(target({name:'log_cfg_2.json',path:'/config/TestDevice/log_cfg_2.json'}),{name:'log_cfg.json',folder:'/'});
 for(const folder of ['Fermenter','language','Profile','Rezepte'])assert.equal(target({name:'a.json',path:`/${folder}/TestDevice/a.json`}).folder,`/${folder}`);
 for(const path of ['/worker1/Rezepte/Plan.json','/Rezepte/worker1/Plan.json'])assert.deepEqual(target({name:'Plan.json',path}),{name:'Plan.json',folder:'/Rezepte'});
 assert.equal(target({name:'Plan.json',path:'/worker1/Plan.json',kind:'mashplan'}).folder,'/Rezepte');
 assert.equal(target({name:'unclassified.json',path:'/Other/unclassified.json'}).folder,'/');
 assert.equal(target({name:'readme.txt',path:'/Rezepte/readme.txt'}).folder,'/');
 assert.equal(target({name:'error.mp3',path:'/language/error.mp3'}).folder,'/');
 const cancelled=vm.runInContext('exChooseDeviceTarget({name:"config_1.txt",path:"/config/TestDevice/config_1.txt"})',ctx);
 const configForm=ctx.document.body.children.at(-1).children[0];
 assert.equal(configForm.children[1].children[1].value,'/');assert.equal(configForm.children[2].children[1].value,'config.txt');
 await configForm.children[3].children[1].click();assert.equal(await cancelled,null);
 const inventory=ctx.appConfig.inventory_root;
 respond=async path=>path.endsWith('/folder/pick') ? {token:'folder-token',path:'C:/other'} : path.startsWith('/api/explorer/list') ? {files:[{name:'a.txt',path:'/a.txt',type:'file',size:3}]} : {text:'test',editable:true};
 await vm.runInContext('exOpenFolder()',ctx);
 assert.equal(ctx.appConfig.inventory_root,inventory);
 assert.match(calls.at(-1).path,/local_folder=folder-token/);
 await vm.runInContext('exSelect(ex.files[0])',ctx);
 ctx.prompt=()=>'/Rezepte/a.txt';
 ctx.confirm=()=>{throw new Error('Unexpected overwrite confirmation');};
 const transferring=vm.runInContext('exMutation("transfer")',ctx);
 const form=ctx.document.body.children.at(-1).children[0];
 const destination=form.children[1].children[1];
 assert.deepEqual(destination.children.map(option=>option.value),['/','/Fermenter','/language','/Profile','/Rezepte']);
 assert.equal(destination.value,'/');destination.value='/Rezepte';
 form.events.submit({preventDefault(){}});await transferring;ctx.confirm=()=>true;
 const transferCall=calls.find(c=>c.options?.body.action==='transfer');
 assert.equal(transferCall.options.body.local_folder,'folder-token');
 assert.equal(transferCall.options.body.target,'/Rezepte/a.txt');
 respond=async()=>({});await vm.runInContext('exOpenFolder()',ctx);
 assert.equal(vm.runInContext('ex.localFolder',ctx),'folder-token');
 assert(!actions('explorerCommands').some(b=>b.dataset.exAction==='openFolder'));
 let quick=get('explorerSidebar').children.flatMap(n=>n.children).find(n=>n.className==='explorer-quick-row');
 assert.equal(quick.children[0].title,'C:/other');
 assert.equal(quick.children[0].children[1].textContent,'other');
 quick.events.contextmenu({preventDefault(){}});assert.equal(quick.children[2].hidden,false);
 vm.runInContext('exCloseQuickMenu(true)',ctx);assert.equal(quick.children[2].hidden,true);
 await quick.children[1].click();assert.equal(quick.children[2].hidden,false);
 respond=async path=>path.endsWith('/remove') ? {folders:[]} : {files:[]};
 await quick.children[2].children[0].click();assert.equal(ctx.appConfig.explorer_folders.length,0);
 respond=async()=>({files:[{name:'a.txt',path:'/a.txt',type:'file',size:3}]});
 await vm.runInContext('loadExplorer()',ctx);

 let resolve;const pending=new Promise(r=>resolve=r);respond=()=>pending;
 const beforeStale=onlineReports;
 const old=vm.runInContext('exSelect(ex.files[0])',ctx);assert.equal(get('explorerContent').placeholder,'Vorschau wird geladen …');url='http://two';ctx.appConfig.active_device_id='two';vm.runInContext('syncExplorerContext()',ctx);
 resolve({text:'wrong device',editable:true});await old;assert.equal(onlineReports,beforeStale);
 assert.equal(get('explorerContent').value,'');assert.equal(vm.runInContext('ex.selected',ctx),null);
 respond=async()=>{throw new Error('offline');};await vm.runInContext('loadExplorer()',ctx);
 assert.match(get('explorerStatus').textContent,/offline/);
 ctx.managementDeviceAvailable=()=>false;
 vm.runInContext('ex.side="device"',ctx);
 const beforeAutomatic=calls.length;
 await vm.runInContext('loadExplorer({automatic:true})',ctx);
 assert.equal(calls.length,beforeAutomatic);
 assert.match(get('explorerStatus').textContent,/Keine bestätigte Netzwerkverbindung/);
 respond=async()=>{throw new Error('<urlopen error [Errno 11001] getaddrinfo failed>');};
 await vm.runInContext('loadExplorer()',ctx); // explicit refresh still tries even with a stale offline badge
 assert.equal(calls.length,beforeAutomatic+1);
 assert.match(get('explorerStatus').textContent,/http:\/\/two/);
 assert.match(get('explorerStatus').textContent,/IP-Adresse/);
 assert.ok(!get('explorerStatus').textContent.includes('getaddrinfo'));
 respond=async()=>({files:[]});
 vm.runInContext('ex.side="local"',ctx);
 await vm.runInContext('loadExplorer({automatic:true})',ctx);
 assert.equal(calls.length,beforeAutomatic+2);
 ctx.managementDeviceAvailable=()=>true;vm.runInContext('ex.side="device"',ctx);
 await vm.runInContext('loadExplorer({automatic:true})',ctx);
 assert.equal(calls.length,beforeAutomatic+3);
 let openedDrafts=0,openedView;
 ctx.initializeDesigner=()=>{};
 ctx.pdDrafts=async(compare,options)=>{assert.equal(compare,false);assert.equal(options.container,get('explorerDrafts'));assert.equal(options.isCurrent(),true);openedDrafts++;options.onOpen();};
 ctx.selectWorkspaceView=view=>{openedView=view;};
 vm.runInContext('exSidebar()',ctx);
 const sidebar=get('explorerSidebar').children;
 const local=sidebar.find(n=>n.dataset.group==='local');
 assert.equal(local.children[0].textContent,'Inventar');
 assert.equal(local.children[2].textContent,'Maischepläne');assert.equal(local.children[3].textContent,'Entwürfe');
 assert.equal(sidebar.flatMap(n=>n.children).filter(n=>n.textContent==='Entwürfe').length,1);
 assert.ok(sidebar.every(n=>n.tag==='details'&&n.open));
 local.open=false;local.events.toggle();vm.runInContext('exSidebar()',ctx);
 assert.equal(get('explorerSidebar').children[1].open,false);
 ctx.currentLang='en';vm.runInContext('exSidebar()',ctx);assert.equal(get('explorerSidebar').children[1].open,false);
 assert.equal(get('explorerSidebar').children[1].children[0].textContent,'Inventory');ctx.currentLang='de';
 const beforeDrafts=calls.length;
 await vm.runInContext('exNavigate("local","/","drafts")',ctx);
 assert.equal(calls.length,beforeDrafts);assert.equal(openedDrafts,1);assert.equal(openedView,'designer');
 assert.equal(get('explorerDrafts').hidden,false);assert.equal(get('explorerFileTable').hidden,true);
 assert.equal(actions('explorerCommands').find(b=>b.dataset.exAction==='upload').disabled,true);
 await vm.runInContext('exNavigate("local","/")',ctx);
 assert.equal(get('explorerDrafts').hidden,true);assert.equal(get('explorerFileTable').hidden,false);
 await vm.runInContext('exNavigate("device","/")',ctx);
 vm.runInContext('ex.side="device";ex.view="all";ex.files=[{path:"/a.json",name:"a.json",type:"file"}];ex.showPreview=false',ctx);
 await vm.runInContext('exSelect(ex.files[0])',ctx);
 assert.equal(get('explorerPreviewPane').hidden,false);
 assert.equal(get('explorerFiles').children[0].children.length,5);
 for(const path of ['/Fermenter','/language','/Profile','/Rezepte']){
   ctx.protectedPath=path;
   vm.runInContext('ex.selected={path:protectedPath,type:"dir"};exButtons()',ctx);
   assert.equal(actions('explorerCommands').find(b=>b.dataset.exAction==='delete').disabled,true);
   const count=calls.length;await vm.runInContext('exMutation("delete")',ctx);assert.equal(calls.length,count);
 }
 let deletedByKey=0;ctx.exMutation=async action=>{if(action==='delete')deletedByKey++;};
 vm.runInContext('ex.selected={path:"/a.json",type:"file"};ex.busy=false;ex.loading=false;ex.editing=false',ctx);
 get('explorerFileTable').events.keydown({key:'Delete',target:{tagName:'TR'},preventDefault(){}});
 assert.equal(deletedByKey,1);
 get('explorerFileTable').events.keydown({key:'Delete',target:{tagName:'INPUT'},preventDefault(){}});
 assert.equal(deletedByKey,1);
 const html=fs.readFileSync('static/index.html','utf8');assert(!html.includes('data-management-tab='));assert(html.includes('/explorer.js'));assert(!html.includes('explorerSelectedPath'));assert(!html.includes('explorerPreviewHint'));assert(!html.includes('explorerSearch'));assert(!html.includes('explorerEmpty'));assert(!html.includes('explorerNavigation'));
 console.log('Explorer: navigation, local/device switch, safe preview/copy, unsaved edits, save and stale responses passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
