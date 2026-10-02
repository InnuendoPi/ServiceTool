/* Explorer-style plan editor. All device operations require a user action. */
const PD_MAX_STEPS = 30;
function pdCheckStepLimit(value) {
  if(value.steps.length>PD_MAX_STEPS)throw new Error(pdText(
    'Ein Maischeplan darf maximal 30 Schritte enthalten. Die Aktion wurde nicht übernommen.',
    'A mash plan may contain at most 30 steps. The action was not applied.'));
}
const pd = {draft:PlanDesigner.create(),selected:null,selection:[],anchor:null,undo:[],redo:[],busy:false,
  dockTab:'temporary',dockExpanded:false,dirty:false,profile:'',comparison:null,comparisonSource:null,language:'',token:0};
function pdFingerprint(value=pd.draft) {
  const content=PlanDesigner.clone({name:value.name,generation:value.generation,steps:value.steps,misc:value.misc,snapshot:value.snapshot});
  for(const step of content.steps)if(step.editor)delete step.editor.template;
  return JSON.stringify(content);
}
function pdMarkClean(){pd.baseline=pdFingerprint();pd.dirty=false;}
pdMarkClean();
const pdText=(de,en)=>currentLang==='de'?de:en;
const pdNode=id=>document.getElementById('designer'+id);
const pdApi=(action,data={})=>api('/api/designer/'+action,{method:'POST',body:data});
function pdElement(tag,text='',className='') {
  const node=document.createElement(tag);node.textContent=text;node.className=className;return node;
}
function pdButton(icon,de,en,action,stopPropagation=false) {
  const tone=icon==='trash-o'?'danger':['floppy-disk','upload','file-empty','folder-open'].includes(icon)?'primary':['eye','equalizer','copy','file-text2'].includes(icon)?'info':'ghost';
  const b=pdElement('button','',tone+' explorer-icon');b.type='button';
  b.title=pdText(de,en);b.setAttribute('aria-label',b.title);
  const i=pdElement('i','','icon-'+icon);i.setAttribute('aria-hidden','true');b.append(i);
  b.addEventListener('click',event=>{if(stopPropagation)event.stopPropagation?.();return pdRun(action);});return b;
}
function pdStatus(value) {if(typeof workspaceView!=='undefined'&&workspaceView==='management'&&typeof ex!=='undefined'&&ex.view==='drafts'){exStatus(value);return;}const node=pdNode('Dialog')?.open ? pdNode('DialogFeedback') : pdNode('Status');if(node)node.textContent=value;}
async function pdRun(action) {
  if(pd.busy)return;
  pd.busy=true;pdNode('Panel').inert=true;pdNode('Panel').setAttribute('aria-busy','true');
  try {await action();} catch(error){pdStatus(String(error.message||error));}
  finally {pd.busy=false;pdNode('Panel').inert=false;pdNode('Panel').setAttribute('aria-busy','false');}
}
function pdDockKey(items) {
  return JSON.stringify(items.map(item=>{const copy=PlanDesigner.clone(item);delete copy.id;delete copy.dockSaved;return copy;}));
}
function pdLoadDock() {
  if(pd.dockReady)return pd.dockReady;
  pd.dockLoading=true;
  pd.dockReady=pdApi('dock-load').then(result=>{
    pd.draft.dock=Array.isArray(result.dock)?result.dock.map(s=>({...s,dockSaved:true})):[];pd.dockLoading=false;pd.dockError='';if(pdNormalizeSteps(pd.draft.dock,pd.draft.snapshot))pdPersistDock();pdRender();
  }).catch(error=>{pd.dockLoading=false;pd.dockError=String(error.message||error);pd.dockReady=null;pdRender();});
  return pd.dockReady;
}
function pdPersistDock() {
  const dock=PlanDesigner.clone(pd.draft.dock.filter(s=>s.dockSaved));pd.dockPending=(pd.dockPending||0)+1;
  pd.dockWrite=(pd.dockWrite||Promise.resolve()).catch(()=>{}).then(()=>pdApi('dock-save',{dock})).then(()=>{pd.dockError='';},error=>{pd.dockError=String(error.message||error);}).finally(()=>{pd.dockPending--;pdDockTools();});
  return pd.dockWrite;
}
function pdDockTools() {
  const tools=pdNode('DockTools');if(!tools)return;tools.replaceChildren();
  const toggle=pdButton(pd.dockExpanded?'equalizer':'eye',pd.dockExpanded?'Eigenschaften anzeigen':'Dock vergrößern',pd.dockExpanded?'Show properties':'Expand dock',()=>{pd.dockExpanded=!pd.dockExpanded;pdDockTools();});tools.append(toggle);
  pdNode('Right').className='designer-right'+(pd.dockExpanded?' designer-dock-expanded':'');
  pdNode('Properties').hidden=pd.dockExpanded;pdNode('PropertiesHead').hidden=pd.dockExpanded;
  const tabs=pdNode('DockTabs');tabs.replaceChildren();
  for(const [value,de,en] of [['temporary','Ablage','Holding area'],['saved','Gespeichert','Saved']]){
    const tab=pdElement('button',pdText(de,en),'ghost');tab.type='button';tab.setAttribute('role','tab');tab.setAttribute('aria-selected',String(pd.dockTab===value));tab.setAttribute('aria-controls','designerDock');tab.title=value==='temporary'?pdText('Für diese Sitzung ablegen','Keep for this session'):pdText('Dauerhaft speichern','Save permanently');
    tab.addEventListener('click',()=>{pd.dockTab=value;pd.selected=null;pd.selection=[];pd.anchor=null;pdRender();});pdDrop(tab,'dock',null,value);tabs.append(tab);
  }
  if(pd.dockTab==='temporary'){
    const clear=pdButton('trash-o','Ablage leeren','Clear holding area',()=>pdChange(()=>{pd.draft.dock=pd.draft.dock.filter(s=>s.dockSaved);pd.selected=null;pd.selection=[];}));clear.disabled=!pdDockItems().length||pd.dockLoading;tools.append(clear);
  }
  const note=pdNode('DockNotice');note.replaceChildren();
  if(pd.pendingDock?.length){
    note.append(pdElement('span',pdText('Der geladene Plan enthält weitere Dock-Schritte.','The loaded plan contains additional dock steps.')));
    const add=pdElement('button',pdText('Dock aus Entwurf hinzufügen','Add dock from draft'),'primary');add.type='button';add.addEventListener('click',()=>{
      pdChange(()=>{pd.draft.dock.push(...pd.pendingDock.map(s=>({...PlanDesigner.clone(s),id:PlanDesigner.id(),dockSaved:false})));pd.pendingDock=null;});
    });note.append(add);
  }
  if(pd.dockError){note.append(pdElement('span',pdText('Dock konnte nicht gespeichert oder geladen werden: ','Could not save or load dock: ')+pd.dockError));note.append(pdButton('refresh','Erneut versuchen','Retry',()=>pd.dockReady?pdPersistDock():pdLoadDock()));}
}
function pdDockItems(){return pd.draft.dock.filter(s=>!!s.dockSaved===(pd.dockTab==='saved'));}
function pdCopyDock(ids,before=null) {
  if(!ids.length)return;
  pdChange(()=>{const old=new Set(pd.draft.steps.map(s=>s.id));pd.draft=PlanDesigner.moveMany(pd.draft,ids,'steps',before);pd.selection=pd.draft.steps.filter(s=>!old.has(s.id)).map(s=>s.id);pd.selected=pd.selection[0]||null;pd.anchor=pd.selected;});
}
function pdIncomingDock(items) {
  const counts=new Map();for(const item of pd.draft.dock){const key=pdDockKey([item]);counts.set(key,(counts.get(key)||0)+1);}
  return (items||[]).filter(item=>{const key=pdDockKey([item]),count=counts.get(key)||0;if(count){counts.set(key,count-1);return false;}return true;});
}
function pdNormalizeSteps(steps,snapshot) {
  let changed=false;
  for(const step of steps)if(PlanDesigner.normalizeCommand(step))changed=true;
  for(const step of steps)if(PlanDesigner.commandAction(step,snapshot)?.kind==='profile'){
    if(step.Temperatur!==0||step.Dauer!==0)changed=true;
    step.Temperatur=0;step.Dauer=0;
  }
  return changed;
}
function pdChange(action) {
  if(pd.dockLoading||!pd.dockReady&&pd.dockError)return;
  const previous=PlanDesigner.clone(pd.draft),selection={selected:pd.selected,selection:[...pd.selection],anchor:pd.anchor};
  try{action();for(const s of pd.draft.steps)delete s.dockSaved;for(const s of pd.draft.dock)if(typeof s.dockSaved!=='boolean')s.dockSaved=pd.dockTab==='saved';pdCheckStepLimit(pd.draft);pdNormalizeSteps([...pd.draft.steps,...pd.draft.dock],pd.draft.snapshot);}catch(error){pd.propertyError=error;pd.draft=previous;Object.assign(pd,selection);pdRender();pdStatus(String(error.message||error));return;}
  const dockChanged=JSON.stringify(previous.dock)!==JSON.stringify(pd.draft.dock);
  if(pdFingerprint(previous)===pdFingerprint()&&!dockChanged){pdRender();return;}
  if(dockChanged)pdPersistDock();
  pd.undo.push(previous);if(pd.undo.length>100)pd.undo.shift();pd.redo=[];
  pd.dirty=pdFingerprint()!==pd.baseline;pdNode('Status').textContent='';pdRender();
}
function pdHistory(from,to) {
  if(!pd[from].length)return;
  pd[to].push(PlanDesigner.clone(pd.draft));pd.draft=pd[from].pop();pdPersistDock();pd.dirty=pdFingerprint()!==pd.baseline;pdRender();
}
function designerCanLeave() {
  return !pd.busy && (!pd.dirty || confirm(pdText('Ungespeicherten Entwurf verlassen?','Leave the unsaved draft?')));
}
async function pdConfirmReplace() {
  let dialog=pdNode('UnsavedDialog');
  if(!dialog){dialog=pdElement('dialog','','designer-dialog designer-unsaved-dialog');dialog.id='designerUnsavedDialog';document.body.append(dialog);}
  dialog.replaceChildren();dialog.setAttribute('aria-labelledby','designerUnsavedTitle');
  const title=pdElement('h2',pdText('Änderungen speichern?','Save changes?'));title.id='designerUnsavedTitle';
  const message=pdElement('p',pdText('Möchtest du die Änderungen am aktuellen Plan als Entwurf speichern, bevor du einen anderen Plan öffnest?','Save changes to the current plan as a draft before opening another plan?'));
  const label=pdElement('label',pdText('Planname','Plan name')),name=pdElement('input');name.value=pd.draft.name;label.append(name);
  const feedback=pdElement('p');feedback.setAttribute('role','alert');
  const actions=pdElement('div','','designer-unsaved-actions');dialog.append(title,message,label,feedback,actions);
  return new Promise(resolve=>{
    let saving=false,settled=false;
    const finish=value=>{if(settled)return;settled=true;dialog.close();resolve(value);};
    const close=pdCloseButton(()=>{if(!saving)finish(false);});dialog.append(close);
    const save=pdElement('button',pdText('Speichern','Save'),'primary');save.type='button';
    const discard=pdElement('button',pdText('Nicht speichern','Don’t save'),'ghost');discard.type='button';
    const cancel=pdElement('button',pdText('Abbrechen','Cancel'),'ghost');cancel.type='button';actions.append(save,discard,cancel);
    save.addEventListener('click',async()=>{
      if(saving)return;
      if(!name.value.trim()){feedback.textContent=pdText('Bitte einen Plannamen eingeben.','Enter a plan name.');name.focus();return;}
      saving=true;save.disabled=discard.disabled=cancel.disabled=close.disabled=true;
      try{const draft=PlanDesigner.clone(pd.draft);draft.name=name.value.trim();
        pd.draft=await pdApi('save',{draft,new_version:false});pdMarkClean();finish(true);
      }catch(error){feedback.textContent=String(error.message||error);}
      finally{saving=false;save.disabled=discard.disabled=cancel.disabled=close.disabled=false;}
    });
    discard.addEventListener('click',()=>{if(!saving)finish(true);});
    cancel.addEventListener('click',()=>{if(!saving)finish(false);});
    dialog.oncancel=event=>{event.preventDefault();if(!saving)finish(false);};
    dialog.onclose=()=>{if(!settled)finish(false);};
    dialog.showModal();cancel.focus();
  });
}
async function pdAccept(value) {
  try{pdCheckStepLimit(value);}catch(error){pdStatus(error.message);return false;}
  if(!pd.dockReady||pd.dockLoading)await pdLoadDock();if(pd.dockError)return false;
  if(pd.dirty && !await pdConfirmReplace())return false;
  // Recipes carry historical snapshots; the current device configuration owns the quick start.
  value.snapshot=PlanDesigner.clone(pd.draft.snapshot);
  value.generation=PlanDesigner.generationFor(value.snapshot);
  pd.pendingDock=pdIncomingDock(value.dock);
  value.dock=PlanDesigner.clone(pd.draft.dock);
  // A loaded plan can contain IDs already parked in the shared dock.
  const dockIds=new Set(value.dock.map(s=>s.id));for(const step of value.steps)if(dockIds.has(step.id))step.id=PlanDesigner.id();
  pd.draft=value;pd.selected=null;pd.selection=[];pd.anchor=null;pd.undo=[];pd.redo=[];pdMarkClean();const adjusted=pdNormalizeSteps(pd.draft.steps,pd.draft.snapshot);pd.dirty=pdFingerprint()!==pd.baseline;pd.comparison=null;pd.comparisonSource=null;pdNode('Status').textContent=adjusted?pdText('Befehlssyntax bereinigt bzw. Profilwechsel auf 0 °C und 0 min gesetzt.','Command syntax normalized or profile changes set to 0 °C and 0 min.'):'';pdRender();return true;
}
function pdCommitPendingProperties() {
  if(!pd.pendingPropertyInput)return;
  pd.propertyError=null;pdApplyProperties();
  if(pd.propertyError)throw pd.propertyError;
}
async function pdSave(newVersion=false,newVariant=false) {
  pdCommitPendingProperties();
  if(!pd.draft.name.trim()) {pdNode('Name').focus();throw new Error(pdText('Planname fehlt.','Plan name missing.'));}
  pd.draft=await pdApi('save',{draft:pd.draft,new_version:newVersion,new_variant:newVariant});pdMarkClean();pdRender();pdStatus(pdText('Entwurf gespeichert.','Draft saved.'));
}
async function pdSaveChoice() {
  pdCommitPendingProperties();
  if(!pd.draft.name.trim()){pdNode('Name').focus();throw new Error(pdText('Planname fehlt.','Plan name missing.'));}
  const existing=(await pdApi('list')).some(row=>row.id===pd.draft.id);
  if(!existing)return pdSave();
  const body=pdDialog(pdText('Entwurf speichern','Save draft'));
  const dialog=pdNode('Dialog');dialog.classList.add('designer-save-dialog');
  dialog.children[0].append(pdElement('span',pd.draft.name+' · '+pdText('Version ','Version ')+(pd.draft.version||1),'designer-save-context'));
  const choices=[
    [false,false,'floppy-disk','Version aktualisieren','Update version','Änderungen in dieser Version speichern. Der bisherige Stand wird ersetzt.','Save changes to this version, replacing its previous contents.'],
    [true,false,'file-empty','Neue Version speichern','Save new version','Den bisherigen Stand behalten und eine weitere Version anlegen.','Keep the previous version and create another version.'],
    [false,true,'copy','Eigenständige Variante speichern','Save separate variant','Einen separaten Entwurf anlegen. Der ursprüngliche Entwurf bleibt erhalten.','Create a separate draft. The original draft is kept.']
  ];
  for(const [newVersion,newVariant,icon,de,en,detailDe,detailEn] of choices) {
    const button=pdElement('button','','designer-save-option'+(!newVersion&&!newVariant?' designer-save-update':''));button.type='button';
    const symbol=pdElement('i','','icon-'+icon);symbol.setAttribute('aria-hidden','true');
    const text=pdElement('span','','designer-save-option-text');text.append(pdElement('strong',pdText(de,en)),pdElement('span',pdText(detailDe,detailEn)));
    button.append(symbol,text);
    button.addEventListener('click',()=>pdRun(async()=>{await pdSave(newVersion,newVariant);pdNode('Dialog').close();pdStatus(pdText('Entwurf gespeichert.','Draft saved.'));}));body.append(button);
  }
}
async function pdPublish() {
  const body=pdDialog(pdText('Ins Inventar übernehmen','Move to inventory'));
  const label=pdElement('label',pdText('Planname','Plan name')),name=pdElement('input');name.value=pd.draft.name;label.append(name);body.append(label);
  const modeLabel=pdElement('label',pdText('Bei vorhandenem Rezept','For an existing recipe')),mode=pdElement('select');
  for(const [value,de,en] of [['version','Neue Version','New version'],['replace','Aktuellen Stand ersetzen','Replace current version']]){const option=pdElement('option',pdText(de,en));option.value=value;mode.append(option);}mode.value='version';modeLabel.append(mode);body.append(modeLabel);
  let folder=pd.draft.inventory_ref?.folder||pd.inventoryPath||'/Rezepte';
  const destination=pdElement('fieldset'),legend=pdElement('legend',pdText('Zielordner im Inventar','Destination folder in inventory'));destination.append(legend);body.append(destination);
  await pdInventoryBrowser(destination,{foldersOnly:true,initial:folder,onPath:path=>{folder=path;}});
  const button=pdElement('button',pdText('Ins Inventar übernehmen','Move to inventory'),'success');button.type='button';
  button.addEventListener('click',()=>pdRun(async()=>{
    if(!name.value.trim())throw new Error(pdText('Planname fehlt.','Plan name missing.'));
    const draft=PlanDesigner.clone(pd.draft);draft.name=name.value.trim();
    const result=await pdApi('inventory-publish',{draft,folder,replace:mode.value==='replace'});
    pd.draft=result;pd.selected=null;pd.undo=[];pd.redo=[];pdMarkClean();pdNode('Dialog').close();pdRender();pdStatus(pdText('Ins Inventar übernommen.','Moved to inventory.'));
  }));body.append(button);
}
async function pdDeleteChoice(title,remove,allowAll=true) {
  const body=pdDialog(title);
  for(const [all,de,en] of [[false,'Diese Version löschen','Delete this version'],...(allowAll?[[true,'Alle Versionen löschen','Delete all versions']]:[])]){
    const button=pdElement('button',pdText(de,en),'danger');button.type='button';
    button.addEventListener('click',()=>pdRun(async()=>{
      if(!confirm(title+' – '+pdText(de,en)+'?'))return;
      await remove(all);
    }));body.append(button);
  }
}
function pdVersionRow(list,entry,version,latest,open,remove,date) {
  const row=pdElement('tr','',version?'explorer-version-row':''),name=pdElement('td');
  const label=pdElement('button',version?'Version '+version+(latest?' · '+pdText('Neueste','Latest'):''):(entry.name||'').replace(/\.json$/i,''),'ghost explorer-filename');label.type='button';
  label.addEventListener('click',()=>pdRun(open));name.append(label);
  row.append(name,pdElement('td',exDate(entry.created_at)),pdElement('td',date));
  const actions=pdElement('td','','version-actions');exTrash(actions,pdText('Löschen','Delete'),remove);row.append(actions);list.append(row);
}
async function pdDrafts(compare=false,{container=null,onOpen=null,isCurrent=()=>true}={}) {
  const body=container||pdDialog(compare?pdText('Maischeplan vergleichen','Compare mash plan'):pdText('Entwürfe','Drafts')),expanded=new Set();
  if(container){body.replaceChildren();body.append(pdElement('h3',pdText('Entwürfe','Drafts')));}
  if(compare){const heading=pdNode('Dialog').children[0];heading.className='designer-compare-heading';const file=pdButton('file-text2','Mit Datei vergleichen','Compare with file',()=>pdImportFile(true));file.id='designerCompareFile';heading.append(file);}
  const shell=pdElement('div','','file-table-shell designer-drafts'),table=pdElement('table','','file-table'),head=pdElement('thead'),heading=pdElement('tr'),rows=pdElement('tbody');
  let sort='name',descending=false,entries=[];const headers=[];
  for(const [key,de,en] of [['name','Name','Name'],['created_at','Erstellt','Created'],['updated_at','Aktualisiert','Updated']]){
    const cell=pdElement('th'),button=pdElement('button',pdText(de,en),'table-sort'),arrow=pdElement('span','','designer-sort-arrow');arrow.setAttribute('aria-hidden','true');button.type='button';button.append(arrow);cell.append(button);heading.append(cell);headers.push({key,cell,arrow});
    button.addEventListener('click',()=>pdRun(async()=>{descending=sort===key?!descending:false;sort=key;await reload(false);}));
  }heading.append(pdElement('th'));
  head.append(heading);table.append(head,rows);shell.append(table);body.append(shell);
  const reload=async(refresh=true)=>{
    if(refresh)entries=await pdApi('list');if(!isCurrent())return;const groups=new Map();rows.replaceChildren();
    for(const {key,cell,arrow} of headers){const active=key===sort;cell.setAttribute('aria-sort',active?(descending?'descending':'ascending'):'none');arrow.textContent=active?(descending?'▾':'▴'):'↕';arrow.className='designer-sort-arrow'+(active?' active':'');}
    for(const entry of entries){const id=entry.group_id||entry.id;if(!groups.has(id))groups.set(id,[]);groups.get(id).push(entry);}
    const remove=(entry,all)=>pdRun(async()=>{
      if(!confirm(entry.name+' – '+pdText(all?'Alle Versionen löschen?':'Löschen?',all?'Delete all versions?':'Delete?')))return;
      await pdApi('delete',{id:entry.id,all_versions:all});
      if(pd.draft.id===entry.id||(all&&(pd.draft.group_id||pd.draft.id)===(entry.group_id||entry.id))){pd.draft.id=PlanDesigner.id();delete pd.draft.group_id;delete pd.draft.version;pd.dirty=true;pdRender();}
      await reload();
    });
    for(const group of groups.values())group.sort((a,b)=>(b.version||1)-(a.version||1));
    const ordered=[...groups].sort((a,b)=>{const result=String(a[1][0][sort]??'').localeCompare(String(b[1][0][sort]??''),currentLang,{numeric:true});return descending?-result:result;});
    for(const [key,group] of ordered){
      group.sort((a,b)=>(b.version||1)-(a.version||1));const latest=group[0];
      const open=async entry=>{if(!isCurrent())return;const value=await pdApi('load',{id:entry.id});if(!isCurrent())return;if(compare){pd.comparison=value;pd.comparisonSource='draft';}else if(!await pdAccept(value))return;if(!container)pdNode('Dialog').close();pdRender();if(onOpen)onOpen();};
      if(group.length===1){pdVersionRow(rows,latest,null,false,()=>open(latest),()=>remove(latest,false),exDate(latest.updated_at));continue;}
      const row=pdElement('tr','','version-group'),name=pdElement('td');
      exVersionHeading(name,latest.name||pdText('Ohne Namen','Unnamed'),group.length,expanded.has(key),()=>pdRun(async()=>{if(expanded.has(key))expanded.delete(key);else expanded.add(key);await reload();}),false);
      const actions=pdElement('td');exTrash(actions,pdText('Löschen','Delete'),()=>remove(latest,true));
      row.append(name,pdElement('td',exDate(latest.created_at)),pdElement('td',exDate(latest.updated_at)),actions);rows.append(row);
      if(expanded.has(key))for(const entry of group)pdVersionRow(rows,entry,entry.version||1,entry===latest,async()=>{
        if(!isCurrent())return;const value=await pdApi('load',{id:entry.id});if(!isCurrent())return;if(compare){pd.comparison=value;pd.comparisonSource='draft';}else if(!await pdAccept(value))return;if(!container)pdNode('Dialog').close();pdRender();if(onOpen)onOpen();
      },()=>remove(entry,false),exDate(entry.updated_at));
    }
  };await reload();
}
function pdDownload(value,name) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
  const link=pdElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function pdExport() {
  const plan=await pdApi('export',{draft:pd.draft});pdDownload(plan,plan.misc[0].File.split('/').pop());
}
async function pdTransfer() {
  pdCommitPendingProperties();
  if(!pd.draft.name.trim()){pdNode('Name').focus();throw new Error(pdText('Planname fehlt.','Plan name missing.'));}
  const profile=appConfig.active_device_id||'primary',base=managementDeviceUrl();
  const draft=PlanDesigner.clone(pd.draft);
  const body=pdDialog(pdText('Maischeplan auf Gerät übertragen','Transfer mash plan to device'));
  const message=pdElement('p');message.setAttribute('role','status');body.append(message);
  const report=text=>{message.textContent=text;pdNode('Status').textContent=text;};
  report(pdText('Uploadziel wird geprüft und der Maischeplan anschließend übertragen …','Checking upload destination, then transferring the mash plan …'));
  try {
    const plan=await pdApi('export',{draft});
    if(profile!==(appConfig.active_device_id||'primary')||base!==managementDeviceUrl())throw new Error(pdText('Gerät wurde gewechselt.','Device changed.'));
    await api('/api/explorer/action',{method:'POST',body:{action:'upload',side:'device',
      path:plan.misc[0].File,base_url:base,overwrite:true,
      designer_context:{profile,snapshot:draft.snapshot},
      content:btoa(Array.from(new TextEncoder().encode(JSON.stringify(plan)),byte=>String.fromCharCode(byte)).join(''))}});
    report(pdText('Maischeplan erfolgreich übertragen: ','Mash plan transferred successfully: ')+base+' · '+plan.misc[0].File);
  } catch(error) {
    message.setAttribute('role','alert');
    report(pdText('Übertragung fehlgeschlagen: ','Transfer failed: ')+String(error.message||error));
  }
}

function pdOptions() {return {boil_temp:Number(pdNode('BoilTemp').value),mash_out_temp:Number(pdNode('MashOutTemp').value),first_wort_temp:Number(pdNode('FirstWortTemp').value),whirlpool_temp:Number(pdNode('WhirlpoolTemp').value)};}
function pdPickFile(callback) {
  const input=pdElement('input');input.type='file';input.accept='.json,.txt';
  input.addEventListener('change',()=>pdRun(async()=>{if(input.files[0]){if(input.files[0].size>8*1024*1024)throw new Error(pdText('Datei ist größer als 8 MB.','File exceeds 8 MB.'));let raw;try{raw=JSON.parse((await input.files[0].text()).replace(/^\uFEFF/,''));}catch{throw new Error(pdText('Die Datei enthält kein gültiges JSON. Bitte eine JSON-Exportdatei auswählen.','The file does not contain valid JSON. Select a JSON export file.'));}await callback(raw);}}));input.click();
}
async function pdImportFile(compare=false) {
  return pdPickFile(async raw=>{
    let value;
    try{value=await pdApi('import',{recipe:raw,options:pdOptions()});}
    catch(error){throw new Error(pdText('Die Datei konnte nicht als Rezept importiert werden. Bitte eine Rezept-Exportdatei in einem der in der Hilfe beschriebenen Formate auswählen.','The file could not be imported as a recipe. Select a recipe export in one of the formats described in Help.'));}
    if(compare){pd.comparison=value;pd.comparisonSource='file';pdNode('Dialog').close();pdRender();}
    else if(await pdAccept(value)){pdNode('Dialog').close();pdRender();}
  });
}
function pdCloseButton(action) {
  const button=pdElement('button','×','ghost icon-button dialog-close');button.type='button';
  button.title=pdText('Schließen','Close');button.setAttribute('aria-label',button.title);
  button.addEventListener('click',action);return button;
}
function pdDialog(title) {
  const dialog=pdNode('Dialog');dialog.className='designer-dialog';dialog.replaceChildren();dialog.append(pdElement('h2',title));
  const body=pdElement('div','','designer-picker');dialog.append(body);
  dialog.append(pdCloseButton(()=>dialog.close()));
  const feedback=pdElement('p');feedback.id='designerDialogFeedback';feedback.setAttribute('role','alert');dialog.append(feedback);
  dialog.showModal();return body;
}
async function pdSource(kind,compare=false) {
  if(kind==='drafts')return pdDrafts(compare);
  if(kind==='kbh')return pdKbhSource(compare);
  return pdBrewfatherSource(compare);
}
function pdBrewfatherTime(value) {
  if(value==null||value==='')return null;
  let time;
  if(typeof value==='object'){
    const seconds=value._seconds??value.seconds;
    time=seconds==null?NaN:Number(seconds)*1000+Number(value._nanoseconds??value.nanoseconds??0)/1e6;
  }else if(typeof value==='number'||/^\d+(\.\d+)?$/.test(value)){
    time=Number(value);if(time<1e11)time*=1000;
  }else time=Date.parse(value);
  return Number.isFinite(time)&&Number.isFinite(new Date(time).getTime())?time:null;
}
async function pdBrewfatherSource(compare=false) {
  const body=pdDialog('Brewfather'),dialog=pdNode('Dialog');dialog.classList.add('designer-kbh-dialog');
  const title=dialog.children[0],header=pdElement('div','','designer-source-header');dialog.replaceChild(header,title);header.append(title);
  const filters=pdElement('div','','designer-stage-filters'),checks=new Map();
  let kind='recipes',cursor='',entries=[],sort='name',descending=false,loading=false;
  for(const [value,label] of [['batches',pdText('Sude','Batches')],['recipes',pdText('Rezepte','Recipes')]]){
    const wrap=pdElement('label',label,'designer-check'),input=pdElement('input');input.type='checkbox';input.checked=value===kind;
    input.addEventListener('change',()=>{
      if(loading||kind===value){input.checked=kind===value;return;}
      return pdRun(async()=>{kind=value;cursor='';entries=[];sort='name';descending=false;
        for(const [key,check] of checks)check.checked=key===kind;
        render();await load();});
    });checks.set(value,input);wrap.prepend(input);filters.append(wrap);
  }
  const search=pdElement('input');search.type='search';search.placeholder=pdText('Suchen','Search');search.setAttribute('aria-label',search.placeholder);search.addEventListener('input',()=>render());header.append(filters,search);
  const shell=pdElement('div','','file-table-shell designer-inventory explorer'),table=pdElement('table','','file-table'),head=pdElement('thead'),rows=pdElement('tbody');table.append(head,rows);shell.append(table);body.append(shell);
  const more=pdElement('button',pdText('Weitere laden','Load more'),'ghost');more.type='button';more.hidden=true;more.addEventListener('click',()=>pdRun(load));body.append(more);
  const render=()=>{
    head.replaceChildren();rows.replaceChildren();const heading=pdElement('tr');
    const columns=kind==='batches'?[['number',pdText('Sudnummer','Batch no.')],['name',pdText('Sud','Batch')],['recipe',pdText('Rezept','Recipe')]]:[['name',pdText('Rezept','Recipe')],['updated',pdText('Aktualisiert','Updated')],['created',pdText('Erstellt','Created')],['style',pdText('Stil','Style')],['author',pdText('Autor','Author')]];
    for(const [key,label] of columns){const cell=pdElement('th'),button=pdElement('button',label,'table-sort'),arrow=pdElement('span',sort===key?(descending?'▾':'▴'):'↕','designer-sort-arrow'+(sort===key?' active':''));
      cell.setAttribute('aria-sort',sort===key?(descending?'descending':'ascending'):'none');arrow.setAttribute('aria-hidden','true');button.append(arrow);button.type='button';button.addEventListener('click',()=>{descending=sort===key?!descending:false;sort=key;render();});cell.append(button);heading.append(cell);}
    head.append(heading);
    const query=search.value.trim().toLocaleLowerCase();
    const filtered=entries.filter(entry=>`${entry.name} ${entry.recipe} ${entry.number} ${entry.style} ${entry.author}`.toLocaleLowerCase().includes(query));
    filtered.sort((a,b)=>{
      if(a[sort]==null||a[sort]==='')return b[sort]==null||b[sort]===''?0:1;
      if(b[sort]==null||b[sort]==='')return -1;
      const result=sort==='updated'||sort==='created'?a[sort]-b[sort]:String(a[sort]).localeCompare(String(b[sort]),currentLang,{numeric:true});
      return descending?-result:result;
    });
    for(const entry of filtered){const row=pdElement('tr');
      for(const [key] of columns){const cell=pdElement('td');if(key==='name'){
        const open=pdElement('button',entry.name||pdText('Ohne Namen','Unnamed'),'ghost explorer-filename');open.type='button';
        open.addEventListener('click',()=>pdRun(async()=>{const value=await pdApi('bf-import',{id:entry.id,kind,options:pdOptions()});if(compare){pd.comparison=value;pd.comparisonSource='draft';}else if(!await pdAccept(value))return;dialog.close();pdRender();}));cell.append(open);
      }else cell.textContent=(key==='updated'||key==='created')?(entry[key]==null?'—':new Date(entry[key]).toLocaleString(currentLang)):String(entry[key]||'—');row.append(cell);}rows.append(row);
    }
  };
  const load=async()=>{
    loading=true;more.disabled=true;for(const check of checks.values())check.disabled=true;
    try{const result=await pdApi('bf-list',{kind,cursor});
      for(const item of result){const id=item.id||item._id;if(!entries.some(entry=>entry.id===id))entries.push({id,name:item.name||item.recipe?.name||'',recipe:item.recipe?.name||'',number:item.batchNo??'',style:item.style?.name||'',author:item.author||'',updated:pdBrewfatherTime(item._timestamp_ms)??pdBrewfatherTime(item._timestamp)??pdBrewfatherTime(item.updatedAt),created:pdBrewfatherTime(item._created)??pdBrewfatherTime(item.createdAt)});}
      cursor=result.at(-1)?._id||'';more.hidden=result.length<50||!cursor;render();
    }finally{loading=false;more.disabled=false;for(const check of checks.values())check.disabled=false;}
  };
  render();await load();
}
async function pdKbhSource(compare=false) {
  const body=pdDialog('kleinerBrauhelfer2'),dialog=pdNode('Dialog');dialog.classList.add('designer-kbh-dialog');
  const title=dialog.children[0],header=pdElement('div','','designer-source-header');dialog.replaceChild(header,title);header.append(title);
  const filters=pdElement('div','','designer-stage-filters'),checks=[],selected=new Set([0,1,2]);
  const stages=[pdText('Rezept','Recipe'),pdText('Gebraut','Brewed'),pdText('Abgefüllt','Bottled')];
  let entries=[],sort='created_at',descending=true;const sortHeaders=[];
  const checkbox=(label,changed)=>{const wrap=pdElement('label',label,'designer-check'),input=pdElement('input');input.type='checkbox';input.checked=true;input.addEventListener('change',()=>changed(input.checked));wrap.prepend(input);filters.append(wrap);return input;};
  const all=checkbox(pdText('Alle','All'),checked=>{selected.clear();checks.forEach((input,index)=>{input.checked=checked;if(checked)selected.add(index);});all.indeterminate=false;render();});
  stages.forEach((label,index)=>checks.push(checkbox(label,checked=>{if(checked)selected.add(index);else selected.delete(index);all.checked=selected.size===stages.length;all.indeterminate=selected.size>0&&selected.size<stages.length;render();})));
  const watchlist=checkbox(pdText('Merkliste','Watchlist'),()=>render());watchlist.checked=false;
  const search=pdElement('input');search.type='search';search.placeholder=pdText('Sude suchen','Search batches');search.setAttribute('aria-label',search.placeholder);search.addEventListener('input',()=>render());header.append(filters,search);
  const shell=pdElement('div','','file-table-shell designer-inventory explorer'),table=pdElement('table','','file-table'),head=pdElement('thead'),heading=pdElement('tr'),rows=pdElement('tbody');
  for(const [key,label] of [['name',pdText('Sud','Batch')],['brewed_at',pdText('Braudatum','Brew date')],['created_at',pdText('Erstellt','Created')],['saved_at',pdText('Gespeichert','Saved')]]){
    const cell=pdElement('th'),button=pdElement('button',label,'table-sort');const arrow=pdElement('span','','designer-sort-arrow');arrow.setAttribute('aria-hidden','true');button.append(arrow);sortHeaders.push({key,cell,arrow});button.type='button';button.addEventListener('click',()=>{descending=sort===key?!descending:false;sort=key;render();});cell.append(button);heading.append(cell);
  }
  head.append(heading);table.append(head,rows);shell.append(table);body.append(shell);
  const render=()=>{
    rows.replaceChildren();
    for(const {key,cell,arrow} of sortHeaders){const active=sort===key;cell.setAttribute('aria-sort',active?(descending?'descending':'ascending'):'none');arrow.textContent=active?(descending?'▾':'▴'):'↕';arrow.className='designer-sort-arrow'+(active?' active':'');}
    const query=search.value.trim().toLocaleLowerCase();
    const filtered=entries.filter(entry=>(entry.status==null||selected.has(Number(entry.status)))&&(!watchlist.checked||Number(entry.watchlist_id)>0)&&(!query||`${entry.name} ${entry.number??''}`.toLocaleLowerCase().includes(query)));
    filtered.sort((a,b)=>{const value=String(a[sort]??'').localeCompare(String(b[sort]??''),currentLang,{numeric:true});return descending?-value:value;});
    for(const entry of filtered){
      const row=pdElement('tr'),name=pdElement('td'),open=pdElement('button',entry.name||pdText('Ohne Namen','Unnamed'),'ghost explorer-filename');open.type='button';
      open.addEventListener('click',()=>pdRun(async()=>{const value=await pdApi('kbh-import',{id:entry.id,options:pdOptions()});if(compare){pd.comparison=value;pd.comparisonSource='draft';}else if(!await pdAccept(value))return;dialog.close();pdRender();}));name.append(open);
      const formatDate=value=>{const date=value?new Date(value):null;return date&&!Number.isNaN(date.getTime())?date.toLocaleDateString(currentLang):'—';};
      row.append(name,pdElement('td',formatDate(entry.brewed_at)),pdElement('td',formatDate(entry.created_at)),pdElement('td',formatDate(entry.saved_at)));rows.append(row);
    }
  };
  entries=await pdApi('kbh-list');
  if(entries.some(entry=>entry.status==null)){
    for(const input of [all,...checks])input.disabled=true;
    pdStatus(pdText('Statusangaben fehlen. ServiceTool neu starten, um die Stadienfilter zu verwenden.','Stage data missing. Restart ServiceTool to use stage filters.'));
  }
  render();
}
async function pdInventoryBrowser(container,{foldersOnly=false,initial='/',boundary=null,onOpen=()=>{},onPath=()=>{}}={}) {
  const nav=pdElement('nav'),tools=pdElement('div','','actions'),shell=pdElement('div','','file-table-shell designer-inventory explorer'),table=pdElement('table','','file-table'),head=pdElement('thead'),columns=pdElement('tr'),list=pdElement('tbody');
  if(foldersOnly)container.append(nav,tools);container.append(shell);shell.append(table);table.append(head,list);
  let path=initial,rows=[],request=0,sort='name',descending=false;const expanded=new Set(),headers=[];
  for(const [key,de,en] of [['name','Name','Name'],['created_at','Erstellt','Created'],['mtime','Aktualisiert','Updated']]){
    const cell=pdElement('th'),button=pdElement('button',pdText(de,en),'table-sort'),arrow=pdElement('span','','designer-sort-arrow');arrow.setAttribute('aria-hidden','true');button.append(arrow);headers.push({key,cell,arrow});button.type='button';button.addEventListener('click',()=>{descending=sort===key?!descending:false;sort=key;render();});cell.append(button);columns.append(cell);
  }columns.append(pdElement('th'));
  if(foldersOnly){const title=pdElement('th',pdText('Ordner','Folder'));title.colSpan=4;columns.replaceChildren(title);}
  head.append(columns);
  if(foldersOnly)tools.append(pdButton('folder-plus','Neuer Ordner','New folder',async()=>{
    const name=prompt(pdText('Name des neuen Ordners:','New folder name:'));if(!name)return;
    if(/[\\/]/.test(name)||name==='.'||name==='..')throw new Error(pdText('Bitte nur einen Ordnernamen eingeben.','Enter a folder name only.'));
    await api('/api/explorer/action',{method:'POST',body:{side:'local',action:'mkdir',path:path.replace(/\/$/,'')+'/'+name}});await load(path);
  }));
  const remove=(file,all)=>pdRun(async()=>{
    if(!confirm(file.name+' – '+pdText(all?'Alle Versionen löschen?':'Löschen?',all?'Delete all versions?':'Delete?')))return;
    await pdApi('inventory-delete',{path:file.path,all_versions:all});await load(path);
  });
  const folderRow=(name,location,parent=false)=>{
    const row=pdElement('tr'),cell=pdElement('td'),button=pdElement('button','','ghost explorer-filename');button.type='button';
    if(!parent)button.append(pdElement('i','','icon-folder button-icon'));button.append(pdElement('span',name));
    button.title=parent?pdText('Übergeordneter Ordner','Parent folder'):name;button.setAttribute('aria-label',button.title);button.addEventListener('click',()=>pdRun(()=>load(location)));cell.append(button);row.append(cell,pdElement('td'),pdElement('td'),pdElement('td'));list.append(row);
  };
  const render=()=>{
    list.replaceChildren();if(foldersOnly)exBreadcrumb(nav,path,location=>pdRun(()=>load(location)));
    for(const {key,cell,arrow} of headers){const active=key===sort;cell.setAttribute('aria-sort',active?(descending?'descending':'ascending'):'none');arrow.textContent=active?(descending?'▾':'▴'):'↕';arrow.className='designer-sort-arrow'+(active?' active':'');}
    if(path!==(boundary||'/'))folderRow('..',path.slice(0,path.lastIndexOf('/'))||'/',true);
    const files=rows.filter(r=>r.type==='dir'||!foldersOnly);
    const groups=exVersionGroups(files,true).sort((a,b)=>{
      if(a.file.type!==b.file.type)return a.file.type==='dir'?-1:1;
      const result=sort==='versions'?a.versions.length-b.versions.length:String(a.file[sort]||'').localeCompare(String(b.file[sort]||''),currentLang,{numeric:true});return descending?-result:result;
    });
    for(const {file,versions} of groups){
      if(file.type==='dir'){folderRow(file.name,file.path);continue;}
      if(!versions.length){pdVersionRow(list,file,null,false,()=>onOpen(file),()=>remove(file,false),exDate(file.mtime));continue;}
      const row=pdElement('tr','','version-group'),name=pdElement('td');
      exVersionHeading(name,file.name.replace(/\.json$/i,''),versions.length,expanded.has(file.path),()=>{if(expanded.has(file.path))expanded.delete(file.path);else expanded.add(file.path);render();},false);
      const actions=pdElement('td');exTrash(actions,pdText('Löschen','Delete'),()=>remove(file,true));
      row.append(name,pdElement('td',exDate(file.created_at)),pdElement('td',exDate(file.mtime)),actions);list.append(row);
      if(expanded.has(file.path))for(const entry of versions)pdVersionRow(list,entry.file,entry.version,entry===versions[0],()=>onOpen(entry.file),()=>remove(entry.file,false),exDate(entry.file.mtime));
    }
  };
  const load=async location=>{
    if(boundary&&location!==boundary&&!location.startsWith(boundary+'/'))return;
    const token=++request;const result=await api('/api/explorer/list?'+new URLSearchParams({side:'local',path:location,view:'mashplans'}));if(token!==request)return;
    path=location;rows=result.files;onPath(path);render();
  };
  await load(path);
}
async function pdInventoryPlans() {
  const picker=pdDialog(pdText('Inventar','Inventory'));
  const candidate=pd.inventoryPath||pd.draft.inventory_ref?.folder||'/Rezepte',parts=candidate.split('/').filter(Boolean),at=parts.findIndex(part=>part.toLowerCase()==='rezepte');
  const boundary=at<0?'/Rezepte':'/'+parts.slice(0,at+1).join('/'),initial=at<0?boundary:candidate;
  await pdInventoryBrowser(picker,{initial,boundary,onPath:path=>{pd.inventoryPath=path;},onOpen:async row=>{
    const value=await pdApi('inventory-load',{path:row.path});if(!await pdAccept(value))return;pdNode('Dialog').close();pdRender();
  }});
}
function pdDevicePlansAvailable() {
  return typeof managementDeviceAvailable==='function'&&managementDeviceAvailable()&&!!managementDeviceUrl().trim();
}
function pdRefreshDeviceSources() {
  const button=pdNode('DevicePlans');if(button)button.hidden=!pdDevicePlansAvailable();
}
async function pdDevicePlans() {
  const profile=appConfig.active_device_id||'primary',url=managementDeviceUrl();
  const check=()=>{
    if(profile!==(appConfig.active_device_id||'primary')||url!==managementDeviceUrl())throw new Error(pdText('Gerät wurde gewechselt. Bitte die Planauswahl erneut öffnen.','Device changed. Reopen the plan selection.'));
    if(!pdDevicePlansAvailable())throw new Error(pdText('Keine Netzwerkverbindung zum Gerät. Bitte unter „Gerät“ die Verbindung prüfen.','No network connection to the device. Check the connection under Device.'));
  };
  const read=async path=>{
    check();let result;
    try{result=await api(path);}catch(error){throw new Error(pdText('Gerätepläne konnten nicht geladen werden. ','Could not load device plans. ')+exError(error));}
    check();return result;
  };
  const rows=await read('/api/explorer/list?'+new URLSearchParams({side:'device',path:'/Rezepte',view:'all',base_url:url}));
  const picker=pdDialog(pdText('Pläne auf dem Gerät','Device plans'));
  for(const row of rows.files.filter(r=>r.type==='file'&&r.name.endsWith('.json'))) {
    const b=pdElement('button',row.name,'ghost');b.addEventListener('click',()=>pdRun(async()=>{
      const file=await read('/api/explorer/preview?'+new URLSearchParams({side:'device',path:row.path,base_url:url}));
      const value=await pdApi('import',{recipe:JSON.parse(file.text),options:pdOptions()});check();
      if(await pdAccept(value))pdNode('Dialog').close();
    }));picker.append(b);
  }
}
async function pdCapture() {
  const profile=appConfig.active_device_id||'primary';
  const result=await pdApi('snapshot-device',{profile});
  if(profile!==(appConfig.active_device_id||'primary'))return;
  pdChange(()=>{pd.draft.snapshot=result;pd.draft.generation=PlanDesigner.generationFor(result);});pdStatus(pdText('Gerätekonfiguration gespeichert.','Device configuration saved.'));
}
async function pdOfflineConfig() {
  pdPickFile(async raw=>{
    const profile=appConfig.active_device_id||'primary';
    const value=await pdApi('snapshot-save',{profile,config:raw});
    if(profile!==(appConfig.active_device_id||'primary'))return;
    pdChange(()=>{pd.draft.snapshot=value;pd.draft.generation=PlanDesigner.generationFor(value);});
  });
}
function pdInsert(resource,target='steps',before=null) {
  const s=PlanDesigner.step(resource.label||resource.name||pdText('Neue Rast','New rest'),resource.temp||0,resource.duration||0,resource.auto!==false);
  if(!resource.kind)s.editor={type:resource.type||'rest'};
  if(['hop','ingredient'].includes(resource.type))Object.assign(s.editor,{name:s.Rast,amount:null,unit:'g'});
  if(resource.type==='hop'){s.editor.template='boil';s.Temperatur=pdHopTemplates()[0][2];}
  if(resource.kind) {
    if(resource.kind==='kettle'&&resource.assigned===false)return;
    s.resource=resource.key;s.resourceKind=resource.kind;
    if(['actor','profile'].includes(resource.kind)){s.Temperatur=0;s.Dauer=0;}
    if(resource.kind==='kettle')s.editor={type:'kettle'};
    const kettles=PlanDesigner.resources(pd.draft.snapshot).filter(r=>r.kind==='kettle'&&r.slot<3);
    const profileKettles=resource.remote?kettles.filter(k=>k.remote&&k.name.split('/')[0]===resource.host&&k.assigned!==false):kettles.filter(k=>!k.remote);
    if(resource.kind==='profile'&&resource.remote&&!profileKettles.length){pdStatus(pdText('Dem Worker ist kein Kessel zugeordnet.','No kettle is assigned to this worker.'));return;}
    s.command=resource.kind==='profile'?PlanDesigner.kettleCommand(profileKettles.find(r=>r.slot===0&&r.assigned!==false)||profileKettles[0]||{slot:0},'profile'):
      resource.kind==='kettle'?PlanDesigner.kettleCommand(resource,resource.slot===3?'cooler':'output'):resource.command;
    s.argument=resource.kind==='profile'?resource.name:'OFF';s.Rast=s.command+':'+s.argument;s.autonext=resource.kind==='profile';
  }
  pdChange(()=>{const at=pd.draft[target].findIndex(v=>v.id===before);pd.draft[target].splice(at<0?pd.draft[target].length:at,0,s);pd.selected=s.id;});
}
function pdInsertAfterSelected(resource) {
  const target=pd.draft.dock.some(s=>s.id===pd.selected)?'dock':'steps';
  const index=pd.draft[target].findIndex(s=>s.id===pd.selected);
  const before=index>=0?pd.draft[target][index+1]?.id:null;
  pdInsert(resource,target,before);
  return target;
}
function pdInsertKey(event) {
  if(event.key!=='Insert'||event.repeat||event.ctrlKey||event.altKey||event.metaKey||event.shiftKey||pd.busy||pd.comparison)return;
  if(['INPUT','TEXTAREA','SELECT'].includes(event.target?.tagName)||event.target?.isContentEditable)return;
  event.preventDefault();
  const target=pdInsertAfterSelected({});
  const parent=pdNode(target==='dock'?'Dock':'Steps');
  Array.from(parent.children).find(row=>row.dataset.id===pd.selected)?.focus();
}
function pdMoveToDock(ids,tab,before=null) {
  pdChange(()=>{
    const saved=tab==='saved';
    const source=pd.draft.steps.some(s=>ids.includes(s.id))?pd.draft.steps:pd.draft.dock;
    const copy=saved&&(source===pd.draft.steps||source.some(s=>ids.includes(s.id)&&!s.dockSaved));
    let selected=ids;
    if(copy){
      const items=source.filter(s=>ids.includes(s.id)).map(s=>({...PlanDesigner.clone(s),id:PlanDesigner.id(),dockSaved:true}));
      const at=pd.draft.dock.findIndex(s=>s.id===before);
      pd.draft.dock.splice(at<0?pd.draft.dock.length:at,0,...items);selected=items.map(s=>s.id);
    }else{
      pd.draft=PlanDesigner.moveMany(pd.draft,ids,'dock',before);
      for(const s of pd.draft.dock)if(ids.includes(s.id))s.dockSaved=saved;
    }
    pd.dockTab=tab;pd.selection=selected;pd.selected=selected[0]||null;pd.anchor=pd.selected;
  });
}
function pdDrop(zone,target,before=null,dockTab=null) {
  const afterRow=event=>target==='dock'&&before!==null&&Number.isFinite(event.clientY)&&
    event.clientY>=zone.getBoundingClientRect().top+zone.getBoundingClientRect().height/2;
  const insertionPoint=(event,ids=[])=>{
    if(!afterRow(event))return before;
    const items=pdDockItems(),at=items.findIndex(s=>s.id===before);
    return items.slice(at+1).find(s=>!ids.includes(s.id))?.id||null;
  };
  const clearMarker=()=>{zone.classList.remove('designer-drop');zone.classList.remove('designer-drop-after');};
  zone.addEventListener('dragover',event=>{if(!event.dataTransfer.types.includes('application/x-brautomat-step'))return;event.preventDefault();event.stopPropagation();clearMarker();zone.classList.add(afterRow(event)?'designer-drop-after':'designer-drop');event.dataTransfer.dropEffect=(pd.dragSource==='dock'&&target==='steps')||(target==='dock'&&(dockTab||pd.dockTab)==='saved'&&(pd.dragSource!=='dock'||pd.dragDockTab!=='saved'))?'copy':'move';});
  zone.addEventListener('dragleave',clearMarker);
  zone.addEventListener('drop',event=>{
    event.preventDefault();event.stopPropagation();clearMarker();if(pd.busy)return;
    try{const data=JSON.parse(event.dataTransfer.getData('application/x-brautomat-step'));
      if(data.id){const ids=Array.isArray(data.ids)?data.ids:[data.id];if(target==='steps'&&pd.draft.dock.some(s=>ids.includes(s.id)))pdCopyDock(ids,before);else if(target==='dock')pdMoveToDock(ids,dockTab||pd.dockTab,insertionPoint(event,ids));else pdChange(()=>{pd.draft=PlanDesigner.moveMany(pd.draft,ids,target,before);pd.selected=data.id;pd.selection=ids;});}else if(data.resource){if(target==='dock'&&dockTab)pd.dockTab=dockTab;pdInsert(data.resource,target,insertionPoint(event));}
    }catch(error){pdStatus(String(error));}
  });
}
function pdSidebar() {
  const side=pdNode('Sidebar');side.replaceChildren();
  pd.sidebarOpen||={};
  let section=side;
  const group=(title,key)=>{
    section=pdElement('details','','designer-sidebar-group');section.dataset.group=key;
    section.open=pd.sidebarOpen[key]!==false;
    const current=section;
    current.addEventListener('toggle',()=>{if(current.parentElement===side)pd.sidebarOpen[key]=current.open;});
    current.append(pdElement('summary',title));side.append(current);
  };
  const link=(label,action,title='')=>{const b=pdElement('button',label,'ghost');b.type='button';if(title)b.title=title;b.addEventListener('click',()=>pdRun(action));section.append(b);return b;};
  group(pdText('Schritte','Steps'),'steps');
  const block=resource=>{const b=pdElement('button',resource.label||resource.name,'ghost');b.type='button';b.draggable=true;
    if(resource.cached)b.title=pdText('Zuletzt bekannter Bestand; aktuell nicht vom Worker bestätigt.','Last known inventory; not currently confirmed by the worker.');
    if(resource.kind==='sensor'){b.draggable=false;b.disabled=true;section.append(b);return;}
    b.addEventListener('dragstart',event=>event.dataTransfer.setData('application/x-brautomat-step',JSON.stringify({resource})));
    b.addEventListener('click',()=>{if(!pd.busy)pdInsertAfterSelected(resource);});section.append(b);};
  for(const r of [{label:pdText('Rast','Rest'),type:'rest'},
    {label:pdText('Kochen','Boil'),type:'boil',temp:100},
    {label:pdText('Hopfengabe','Hop addition'),type:'hop',temp:100},
    {label:pdText('Zutaten','Ingredients'),type:'ingredient'}])block(r);
  group(pdText('Quellen','Sources'),'sources');
  link(pdText('Inventar','Inventory'),pdInventoryPlans);
  link(pdText('Entwürfe','Drafts'),()=>pdSource('drafts'));
  link('Brewfather',()=>pdSource('bf'));link('kleinerBrauhelfer2',()=>pdSource('kbh'));
  link(pdText('Datei Import','File import'),()=>pdImportFile(),pdText('Unterstützte Rezeptdateien importieren','Import supported recipe files'));const devicePlans=link(pdText('Pläne auf dem Gerät','Device plans'),pdDevicePlans);devicePlans.id='designerDevicePlans';pdRefreshDeviceSources();
  const resources=PlanDesigner.resources(pd.draft.snapshot);
  for(const [kind,de,en] of [['kettle','Kessel','Kettles'],['actor','Aktoren','Actors'],['profile','Profile','Profiles'],['sensor','Sensoren','Sensors']]) {
    group(pdText(de,en),kind);for(const resource of resources.filter(r=>r.kind===kind&&r.assigned!==false))block(resource);
  }
  group(pdText('Konfigurationsstand','Configuration snapshot'),'snapshot');
  link(pdText('Vom Gerät lesen','Read from device'),pdCapture);link(pdText('Config importieren','Import config'),pdOfflineConfig);
  if(pd.draft.snapshot)section.append(pdElement('small',new Date(pd.draft.snapshot.captured_at*1000).toLocaleString(currentLang)));
}
function pdContinuation(step) {
  const mark=pdElement('span','▶',step.autonext?'designer-continue':'designer-pause');
  mark.title=step.autonext?pdText('Automatisch fortsetzen','Continue automatically'):pdText('Pause','Pause');
  mark.setAttribute('aria-label',mark.title);return mark;
}
function pdSelectedIds() {
  const group=['steps','dock'].find(key=>pd.draft[key].some(s=>s.id===pd.selected));
  if(!group){pd.selection=[];return [];}
  if(!pd.selection.includes(pd.selected))pd.selection=[pd.selected];
  pd.selection=(group==='dock'?pdDockItems():pd.draft[group]).filter(s=>pd.selection.includes(s.id)).map(s=>s.id);
  return pd.selection;
}
function pdSelectStep(id,group,event={}) {
  const items=group==='dock'?pdDockItems():pd.draft[group],ids=pdSelectedIds(),anchor=items.findIndex(s=>s.id===pd.anchor);
  if(event.shiftKey&&anchor>=0){
    const end=items.findIndex(s=>s.id===id);
    pd.selection=items.slice(Math.min(anchor,end),Math.max(anchor,end)+1).map(s=>s.id);pd.selected=id;
  }else if(event.ctrlKey||event.metaKey){
    const same=items.some(s=>s.id===pd.selected);
    pd.selection=same?[...ids]:[];
    if(pd.selection.includes(id))pd.selection=pd.selection.filter(v=>v!==id);else pd.selection.push(id);
    pd.selected=pd.selection.includes(id)?id:pd.selection.at(-1)||null;pd.anchor=id;
  }else {pd.selected=id;pd.selection=[id];pd.anchor=id;}
}
function pdDeleteSelection() {
  const ids=pdSelectedIds(),group=['steps','dock'].find(key=>pd.draft[key].some(s=>ids.includes(s.id)));
  if(!group)return;
  const at=pd.draft[group].findIndex(s=>ids.includes(s.id));
  pdChange(()=>{pd.draft[group]=pd.draft[group].filter(s=>!ids.includes(s.id));pd.selected=pd.draft[group][Math.min(at,pd.draft[group].length-1)]?.id||null;pd.selection=pd.selected?[pd.selected]:[];pd.anchor=pd.selected;});
}
function pdRows() {
  const selected=pdSelectedIds();
  const list=pdNode('Steps'),dock=pdNode('Dock');list.replaceChildren();dock.replaceChildren();
  for(const [key,parent] of [['steps',list],['dock',dock]]) {
    parent.setAttribute('aria-multiselectable','true');parent.setAttribute('role','listbox');
    (key==='dock'?pdDockItems():pd.draft[key]).forEach((s,index)=>{
      const row=pdElement('div','','designer-step');row.draggable=true;row.tabIndex=0;row.dataset.id=s.id;
      row.setAttribute('role','option');if(key==='dock')row.title=pdText('Ziehen zum Umsortieren oder in den Maischeplan kopieren','Drag to reorder or copy into the mash plan');row.setAttribute('aria-selected',String(selected.includes(s.id)));
      row.append(pdElement('span',key==='steps'?String(index+1):'','designer-step-number'),pdElement('span',s.Rast||'—','designer-step-name'),
        pdElement('span',`${s.Temperatur} °C`),pdElement('span',`${s.Dauer} min`),pdContinuation(s));
      if(key==='dock'&&s.dockSaved){
        row.className+=' designer-dock-saved';
        const remove=pdButton('trash-o','Eintrag löschen','Delete entry',()=>pdChange(()=>{pd.draft.dock=pd.draft.dock.filter(item=>item.id!==s.id);pd.selection=pd.selection.filter(id=>id!==s.id);if(pd.selected===s.id)pd.selected=null;}),true);
        remove.addEventListener('keydown',event=>event.stopPropagation());row.append(remove);
      }
      const focusSelected=()=>Array.from(parent.children).find(item=>item.dataset.id===pd.selected)?.focus();
      const select=(event={})=>{if(pd.busy)return;pdSelectStep(s.id,key,event);pdRender();focusSelected();};row.addEventListener('click',select);
      row.addEventListener('keydown',e=>{
        if(pd.busy)return;
        if(e.key==='Enter'||e.key===' '){e.preventDefault();select(e);}
        else if(e.key==='Delete'&&!e.repeat){
          e.preventDefault();
          if(!pdSelectedIds().includes(s.id))pdSelectStep(s.id,key);pdDeleteSelection();
          focusSelected();
        }
      });
      row.addEventListener('dragstart',event=>{
        if(!pdSelectedIds().includes(s.id))pdSelectStep(s.id,key);
        const ids=pdSelectedIds();
        for(const node of parent.children)node.setAttribute('aria-selected',String(ids.includes(node.dataset.id)));
        pd.dragSource=key;pd.dragDockTab=key==='dock'?pd.dockTab:null;event.dataTransfer.effectAllowed='copyMove';pdProperties();event.dataTransfer.setData('application/x-brautomat-step',JSON.stringify({id:s.id,ids}));
      });
      pdDrop(row,key,s.id);parent.append(row);
    });
  }
}
function pdPropertiesKey(event) {
  if(event.key==='Enter'&&event.target.tagName==='INPUT'){
    event.preventDefault();pdApplyProperties();return;
  }
  if(event.key!=='Tab'||event.ctrlKey||event.altKey||event.metaKey)return;
  const controls=()=>Array.from(pdNode('Properties').querySelectorAll('input, select, textarea, button, summary'))
    .filter(node=>!node.disabled&&node.tabIndex!==-1&&!node.closest('[hidden]')&&
      (!node.closest('details:not([open])')||node.tagName==='SUMMARY'));
  const fields=controls(),index=fields.indexOf(event.target);
  if(index<0)return;
  const next=index+(event.shiftKey?-1:1);
  if(next<0||next>=fields.length)return;
  event.preventDefault();
  // Blur commits the value and may rebuild the entire properties panel.
  event.target.blur();
  controls()[next]?.focus();
}
function pdApplyProperties() {
  // Commit explicitly: browser password UI can interrupt focus/blur delivery.
  const input=pd.pendingPropertyInput||document.activeElement;
  pd.pendingPropertyInput=null;
  if(input&&['INPUT','SELECT','TEXTAREA'].includes(input.tagName)&&input.form===pdNode('Properties')){
    input.dispatchEvent(new Event('change',{bubbles:true}));
  }
  pdRows();
}
function pdApplyButton() {
  const button=pdElement('button','','success explorer-icon');button.id='designerApplyProperties';button.type='button';
  button.title=pdText('Eigenschaften übernehmen','Apply properties');button.setAttribute('aria-label',button.title);
  const icon=pdElement('i','','icon-floppy-disk');icon.setAttribute('aria-hidden','true');button.append(icon);
  button.addEventListener('mousedown',event=>event.preventDefault());button.addEventListener('click',pdApplyProperties);return button;
}
function pdHopTemplates() {
  const options=pdOptions();
  return [['boil',pdText('Hopfengabe','Hop addition'),Math.round(options.boil_temp)],
    ['first_wort',pdText('Vorderwürzenhopfung','First-wort hopping'),Math.round(options.first_wort_temp)],
    ['whirlpool',pdText('Whirlpoolhopfung','Whirlpool hopping'),Math.round(options.whirlpool_temp)]];
}
function pdRecipeProperties(box,s) {
  if(!s.editor)return;
  const select=(label,values,value,change)=>{
    const wrap=pdElement('label',label),input=pdElement('select');
    for(const [key,text] of values){const option=pdElement('option',text);option.value=key;input.append(option);}
    input.value=value;input.addEventListener('change',()=>pdChange(()=>change(input.value)));wrap.append(input);box.append(wrap);
  };
  if(s.editor.type==='rest'){
    const templates=[['custom',pdText('Benutzerdefiniert','Custom')],['in',pdText('Einmaischen','Mash in'),60,false],['malt',pdText('Maltoserast','Maltose rest'),63,true],['single',pdText('Kombirast','Single infusion'),67,true],['sugar',pdText('Verzuckerung','Saccharification'),72,true],['out',pdText('Abmaischen','Mash out'),78,false],['after',pdText('Nachisomerisierung','Post-boil isomerization'),0,true]];
    select(pdText('Vorlage','Template'),templates,s.editor.template||'custom',key=>{s.editor.template=key;const t=templates.find(t=>t[0]===key);if(key!=='custom'){s.Rast=t[1];s.Temperatur=t[2];s.Dauer=key==='after'?(Number(pd.draft.misc?.Nachiso)>0?Number(pd.draft.misc.Nachiso):1):0;s.autonext=t[3];}});
  }
  if(!['hop','ingredient'].includes(s.editor.type))return;
  const inputField=(label,value,type,change)=>{
    const wrap=pdElement('label',label),input=pdElement('input');input.type=type;input.value=value??'';
    if(type==='number'){input.min='0';input.step='0.1';}
    input.addEventListener('change',()=>pdChange(()=>{change(input.value);updateName();}));wrap.append(input);box.append(wrap);
  };
  const updateName=()=>{s.Rast=[s.editor.name,s.editor.amount==null?'':s.editor.amount.toFixed(1)+' '+s.editor.unit].filter(Boolean).join(' ');};
  if(s.editor.type==='hop'){
    const templates=pdHopTemplates();
    select(pdText('Vorlage','Template'),templates,s.editor.template||'boil',key=>{
      const template=templates.find(t=>t[0]===key);
      if(templates.some(t=>t[1]===s.editor.name))s.editor.name=template[1];
      s.editor.template=key;s.Temperatur=template[2];updateName();
    });
  }
  inputField(pdText('Name','Name'),s.editor.name,'text',value=>s.editor.name=value);
  inputField(s.editor.type==='hop'?pdText('Menge g','Amount g'):pdText('Menge','Amount'),s.editor.amount,'number',value=>{if(value!==''&&(!Number.isFinite(Number(value))||Number(value)<0))throw new Error('Ungültige Menge / Invalid amount');s.editor.amount=value===''?null:Number(value);});
  if(s.editor.type==='ingredient')select(pdText('Einheit','Unit'),['g','kg','mg','ml','l','Stk'].map(v=>[v,v]),s.editor.unit,value=>{s.editor.unit=value;updateName();});

}
function pdBoilHint(box,s=null) {
  const balance=PlanDesigner.boilBalance(pd.draft);
  if(!balance||Math.abs(balance.difference)<=0.001||(s&&!balance.steps.includes(s.id)))return;
  box.append(pdElement('p',pdText(
    `Hinweis: Kochzeit laut Plan ${balance.planned} min, laut Schritten ${balance.actual} min.`,
    `Note: planned boil time ${balance.planned} min, step total ${balance.actual} min.`),'muted'));
}
function pdProperties() {
  pd.pendingPropertyInput=null;
  const box=pdNode('Properties');box.replaceChildren();
  const selected=pdSelectedIds();
  const apply=pdNode('ApplyProperties');apply.disabled=selected.length>1;apply.title=pdText('Eigenschaften übernehmen','Apply properties');apply.setAttribute('aria-label',apply.title);
  const headerActions=pdNode('PropertyActions');headerActions.replaceChildren();
  if(selected.length>1){
    headerActions.append(pdButton('trash-o','Ausgewählte Schritte löschen','Delete selected steps',pdDeleteSelection),apply);
    box.append(pdElement('p',pdText(`${selected.length} Schritte ausgewählt`,`${selected.length} steps selected`)));return;
  }
  const s=[...pd.draft.steps,...pd.draft.dock].find(s=>s.id===pd.selected);
  if(!s){
    headerActions.append(apply);
    for(const [key,de,en] of [['Kochdauer','Kochdauer min','Boil duration min'],['Nachiso','Nachisomerisierung min','Post-boil isomerization min']]) {
      const label=pdElement('label',pdText(de,en)),input=pdElement('input');input.type='number';input.value=pd.draft.misc?.[key]??0;
      input.addEventListener('change',()=>pdChange(()=>{pd.draft.misc||={};pd.draft.misc[key]=Number(input.value);}));label.append(input);box.append(label);
    }
    box.append(pdElement('h3',pdText('Enzym-Limiter','Enzyme limiter')));
    for(const [key,de,en] of [['minh','Untere Grenze °C','Lower limit °C'],['maxh','Obere Grenze °C','Upper limit °C']]) {
      const label=pdElement('label',pdText(de,en)),input=pdElement('input');input.type='number';input.step='any';input.min='0';input.id='designerEnzyme'+key;input.value=pd.draft.misc?.[key]??0;
      input.addEventListener('change',()=>{
        const value=Number(input.value);
        if(input.value.trim()===''||!Number.isFinite(value)||value<0){input.value=pd.draft.misc?.[key]??0;return;}
        pdChange(()=>{pd.draft.misc||={};pd.draft.misc[key]=value;});
      });label.append(input);box.append(label);
    }
    pdBoilHint(box);
    return;
  }
  const field=(label,key,type='text')=>{
    const wrap=pdElement('label',label);const input=pdElement('input');input.type=type;input.value=s[key]??'';
    if(type==='number'){input.step=key==='Temperatur'?'1':'any';if(PlanDesigner.commandAction(s,pd.draft.snapshot)?.kind==='profile'){input.readOnly=true;input.title=pdText('Profilwechsel: fest auf 0 eingestellt.','Profile change: fixed at 0.');}}
    if(PlanDesigner.isPostBoil(s)&&key==='Dauer')input.min='1';
    input.addEventListener('change',()=>pdChange(()=>{if(PlanDesigner.isPostBoil(s)&&((key==='Temperatur'&&Number(input.value)!==0)||(key==='Dauer'&&(!Number.isFinite(Number(input.value))||Number(input.value)<=0))))throw new Error(pdText('Nachisomerisierung benötigt 0 °C und eine Dauer größer als 0 min.','Post-boil isomerization requires 0 °C and a duration greater than 0 min.'));s[key]=type==='number'?(key==='Temperatur'?Math.round(Number(input.value)):Number(input.value)):input.value;if(s.editor?.type==='rest'&&!(s.editor.template==='after'&&key!=='Rast'))s.editor.template='custom';}));wrap.append(input);box.append(wrap);
  };
  pdBoilHint(box,s);
  pdRecipeProperties(box,s);
  if(!['hop','ingredient'].includes(s.editor?.type))field(pdText('Schritt','Step'),'Rast');
  field(pdText('Temperatur °C','Temperature °C'),'Temperatur','number');
  if(PlanDesigner.commandAction(s,pd.draft.snapshot)?.operation!=='threshold')field(pdText('Dauer min','Duration min'),'Dauer','number');
  const label=pdElement('label',pdText('Automatisch fortsetzen','Continue automatically'),'designer-check');const checkbox=pdElement('input');checkbox.type='checkbox';checkbox.checked=s.autonext;
  checkbox.addEventListener('change',()=>pdChange(()=>s.autonext=checkbox.checked));label.prepend(checkbox);box.append(label);
  const actor=PlanDesigner.actorAction(s,pd.draft.snapshot);
  if(actor) {
    const wrap=pdElement('label',pdText('Aktor','Actor')),select=pdElement('select');select.id='designerActorAction';
    for(const value of ['ON','OFF',...(actor.pwm?['PWM']:[])]){const option=pdElement('option',value==='PWM'?'PWM %':value);option.value=value;select.append(option);}
    const numeric=/^\d+$/.test(actor.argument);
    select.value=numeric&&actor.pwm?'PWM':actor.argument;
    const update=argument=>pdChange(()=>{s.command=actor.command;s.argument=argument;s.Rast=actor.command+':'+argument+actor.suffix;
      s.resourceKind='actor';if(actor.resource)s.resource=actor.resource.key;});
    select.addEventListener('change',()=>update(select.value==='PWM'?'100':select.value));wrap.append(select);box.append(wrap);
    if(select.value==='PWM') {
      const label=pdElement('label',pdText('Leistung %','Power %')),input=pdElement('input');input.id='designerActorPower';input.type='number';input.min='0';input.max='100';input.step='1';input.value=actor.argument;
      input.addEventListener('change',()=>{const value=Number(input.value);if(input.value.trim()===''||!Number.isInteger(value)||value<0||value>100){input.value=actor.argument;return;}update(String(value));});label.append(input);box.append(label);
    }
  } else {
    const action=PlanDesigner.commandAction(s,pd.draft.snapshot);
    if(action && ['kettle','profile'].includes(action.kind))pdDeviceProperties(box,s,action);
  }
  const actions=pdElement('div','','designer-actions');
  const group=pd.draft.steps.includes(s)?'steps':'dock';
  actions.append(
  pdButton('copy','Schritt duplizieren','Duplicate step',()=>pdChange(()=>{const item=PlanDesigner.clone(s);item.id=PlanDesigner.id();pd.draft[group].push(item);})),
  pdButton('trash-o','Schritt löschen','Delete step',()=>pdChange(()=>{pd.draft[group]=pd.draft[group].filter(v=>v.id!==s.id);pd.selected=null;})));
  headerActions.append(...actions.children,apply);

}
function pdDeviceProperties(box,s,action) {
  const all=PlanDesigner.resources(pd.draft.snapshot),kettles=all.filter(r=>r.kind==='kettle');
  const update=(command,argument,resource=action.resource,defaults={})=>pdChange(()=>{
    Object.assign(s,defaults);
    s.command=command;s.argument=argument;s.Rast=command+':'+argument+action.suffix;
    if(s.resourceKind)s.resourceKind=action.kind;if(resource)s.resource=resource.key;
  });
  const selectField=(id,label,choices,value,changed)=>{
    const wrap=pdElement('label',label),select=pdElement('select');select.id='designer'+id;
    for(const [v,text] of choices){const option=pdElement('option',text);option.value=v;select.append(option);}
    if(!choices.some(([v])=>v===value)){const option=pdElement('option',value);option.value=value;select.append(option);}
    select.value=value;select.addEventListener('change',()=>changed(select.value));wrap.append(select);box.append(wrap);return select;
  };
  if(action.kind==='profile') {
    const targets=kettles.filter(r=>r.slot<3&&r.assigned!==false);
    selectField('ProfileTarget',pdText('Kessel','Kettle'),targets.map(r=>[r.key,r.name]),action.resource?.key||action.command,key=>{
      const target=targets.find(r=>r.key===key);if(target)update(PlanDesigner.kettleCommand(target,'profile'),action.argument,target);
    });
    if(action.resource?.remote){
      const label=pdElement('label',pdText('Profilname auf Worker','Profile name on worker')),input=pdElement('input');input.id='designerProfileName';input.value=action.argument;input.maxLength=15;
      input.addEventListener('change',()=>update(action.command,input.value.trim()));label.append(input);box.append(label);return;
    }
    selectField('ProfileName',pdText('Profil','Profile'),all.filter(r=>r.kind==='profile'&&!r.remote).map(r=>[r.name,r.name]),action.argument,name=>update(action.command,name));
    return;
  }
  const target=action.resource||{slot:action.slot};
  let operations=action.slot===3?['cooler','heater']:['output',...(action.slot<3&&!target.remote?['threshold']:[])];
  if(action.slot===3&&target.pins)operations=operations.filter(op=>target.pins[op]===undefined||!['','-','-1'].includes(String(target.pins[op])));
  const labels={output:pdText('Ausgangsleistung','Output limit'),threshold:pdText('Leistung ab Übergang','Power after boil transition'),cooler:pdText('Kühlung','Cooling'),heater:pdText('Heizung','Heating')};
  if(s.editor?.type==='kettle'||s.resourceKind==='kettle')selectField('KettleOperation',pdText('Funktion','Function'),operations.map(op=>[op,labels[op]]),action.operation,operation=>{
    if(!operations.includes(operation))return;
    update(PlanDesigner.kettleCommand(target,operation),operation==='threshold'?'100':'OFF',action.resource,operation==='threshold'?{Dauer:0,autonext:true}:{});
  });
  const percent=action.slot<3,numeric=/^\d+$/.test(action.argument),mode=numeric?'percent':action.argument.toUpperCase();
  const choices=action.operation==='threshold'?[['percent',pdText('Leistung %','Power %')]]:[['ON','ON'],['OFF','OFF'],...(percent?[['percent',pdText('Leistung %','Power %')]]:[])];
  if(action.operation!=='threshold')selectField('KettleAction',pdText('Aktion','Action'),choices,mode,value=>update(action.command,value==='percent'?'100':value));
  if(numeric||action.operation==='threshold'){
    const wrap=pdElement('label',pdText('Leistung %','Power %')),input=pdElement('input');input.id='designerKettlePower';input.type='number';input.min='0';input.max='100';input.step='1';input.value=numeric?action.argument:action.argument.toUpperCase()==='ON'?'100':'0';
    input.addEventListener('change',()=>{const value=Number(input.value);if(input.value.trim()===''||!Number.isInteger(value)||value<0||value>100){input.value=numeric?action.argument:'0';return;}update(action.command,String(value));});wrap.append(input);box.append(wrap);
  }
}
const PD_NOTES={
  partial_recipe:['KBH2-Teilexport enthält nur Rasten. Planname und Kochdaten ergänzen.','Partial KBH2 export only contains mash rests. Add name and boil data.'],
  step_limit:['Mehr als 30 Schritte: Firmwaregrenze beachten.','More than 30 steps: check the firmware limit.'],
  snapshot_missing:['Gerätekonfiguration fehlt. Ressourcen können nicht geprüft werden.','No configuration snapshot. Resources cannot be checked.'],
  snapshot_old:['Gespeicherte Gerätekonfiguration ist älter als einen Tag. Aktualisieren empfohlen.','Configuration is over a day old. Refresh recommended.'],
  snapshot_partial:['Profilbestand unvollständig. Profile zusätzlich einlesen.','Profile inventory incomplete. Read profiles as well.'],
  remote_command:['Remote-Kesselbefehl nicht unterstützt: Rolle, Dauer und Funktion prüfen.','Remote kettle command not supported: check role, duration and function.'],
  remote_profile_unknown:['Profilbestand auf dem Worker nicht über den Master prüfbar. Profil muss dort vorhanden sein.','Worker profile inventory cannot be verified through the master. The profile must exist there.'],
  remote_profile_argument:['Worker-Profilname muss 1–15 Zeichen lang sein und darf keinen Doppelpunkt enthalten.','Worker profile name must contain 1–15 characters and no colon.'],
  remote_unknown:['Remote-Ressourcen nicht vollständig bekannt. Online abgleichen.','Remote resources incomplete. Check online.'],
  step_name:['Schrittname zu kurz für die Firmware. Namen ergänzen.','Step name too short for firmware. Add a name.'],
  post_boil_values:['Nachisomerisierung benötigt 0 °C und eine Dauer größer als 0 min.','Post-boil isomerization requires 0 °C and a duration greater than 0 min.'],
  duration:['Dauer außerhalb des Gerätebereichs. Wert prüfen.','Duration outside device range. Check value.'],
  temperature:['Temperatur außerhalb des Gerätebereichs. Wert prüfen.','Temperature outside device range. Check value.'],
  rounding:['Firmware verwendet ganze Grad und Minuten. Rundung prüfen.','Firmware uses whole degrees and minutes. Review rounding.'],
  manual:['Schritt wartet auf Benutzerfreigabe. Absicht prüfen.','Step waits for user confirmation. Check intent.'],
  argument:['Befehlsargument fehlt. Aktion ergänzen.','Command argument missing. Choose an action.'],
  generation:['Remote-Befehl ist bis 1.66 nicht vorgesehen. Zielgeneration prüfen.','Remote command is not supported by 1.66. Check target generation.'],
  resource_unknown:['Ressource nicht zugeordnet. Konfiguration und Befehlsname prüfen.','Resource not mapped. Check configuration and command name.'],
  role_unassigned:['Remote-Kessel ist dieser Prozessrolle nicht zugeordnet. Rollen am Master prüfen.','Remote kettle is not assigned to this process role. Check master roles.'],
  resource_changed:['Ursprüngliche Ressource fehlt im Konfigurationsstand. Zuordnung prüfen.','Original resource is missing from snapshot. Check mapping.'],
  profile_unknown:['Profil nicht im gespeicherten Bestand. Zuordnung prüfen.','Profile is not in the saved inventory. Check mapping.'],
  actor_argument:['Aktorargument prüfen: ON, OFF oder Ausgangswert.','Check actor argument: ON, OFF or output value.'],
  persistent:['Dieser Befehl verändert eine Geräteeinstellung. Wirkung prüfen.','This command changes a device setting. Review its effect.'],
  boil_duration_difference:['Kochzeit weicht ab: Planangabe / Summe der Kochschritte. Nur ein Hinweis; der Plan bleibt unverändert.','Boil time differs: plan setting / sum of boil steps. Advisory only; the plan remains unchanged.'],
  boil_missing:['Kochdauer fehlt. Importierte Zugabezeiten prüfen.','Boil duration missing. Check imported addition times.'],
  addition_time:['Zugabe außerhalb der Kochzeit liegt im Dock. Zeitpunkt prüfen.','Addition outside boil time is parked in the dock. Check timing.'],
  unmapped_step:['Import enthält einen unbekannten Schritttyp. Originaldaten prüfen.','Import contains an unknown step type. Review original data.'],
  unmapped_addition:['Nicht eindeutig zugeordnete Zugaben liegen im Dock. Zeitpunkt und Einheit festlegen.','Unmapped additions are parked in the dock. Set timing and units.'],
  decoction_review:['Dekoktion aus Brewfather: manuelle Teilmaischeschritte anhand der Importdaten prüfen.','Brewfather decoction: review manual decoction steps against source data.'],
  source_volume:['Ausschlagwürze oder Sudhausausbeute fehlen im Import. Quelldaten prüfen.','Batch volume or efficiency missing. Check source data.']
};
function pdReview() {
  const box=pdDialog(pdText('Plan prüfen','Review plan'));
  pdNode('Dialog').classList.add('designer-kbh-dialog');
  const label=pdElement('label',pdText('autonext prüfen','Check autonext'),'designer-check');
  const check=pdElement('input');check.type='checkbox';check.checked=false;check.id='designerReviewAutonext';label.prepend(check);box.append(label);
  const results=pdElement('div');results.id='designerReviewResults';box.append(results);
  const render=()=>{
    results.replaceChildren();const notes=PlanDesigner.review(pd.draft).filter(note=>check.checked||note.code!=='manual');
    const shell=pdElement('div','','designer-compare-shell'),table=pdElement('table','','file-table designer-compare-table designer-review-table');
    const head=pdElement('thead'),heading=pdElement('tr'),body=pdElement('tbody');
    for(const text of [pdText('Schritt','Step'),pdText('Hinweis / Empfehlung','Finding / recommendation')])heading.append(pdElement('th',text));
    head.append(heading);table.append(head,body);shell.append(table);results.append(shell);
    if(!notes.length){const row=pdElement('tr'),cell=pdElement('td',pdText('Keine Hinweise aus den ausgewählten Prüfungen.','No findings from the selected checks.'));cell.setAttribute('colspan','2');row.append(cell);body.append(row);}
    for(const note of notes){
      const s=pd.draft.steps.find(s=>s.id===note.step),row=pdElement('tr'),step=pdElement('td');
      if(s){const button=pdElement('button',`${pd.draft.steps.indexOf(s)+1}. ${s.Rast}`,'ghost explorer-filename');button.type='button';button.addEventListener('click',()=>{pd.selected=s.id;pdNode('Dialog').close();pdRender();});step.append(button);}
      else step.textContent=pdText('Plan','Plan');
      row.append(step,pdElement('td',[pdText(...(PD_NOTES[note.code]||[note.code,note.code])),note.detail].filter(Boolean).join(' · ')));body.append(row);
    }
    results.append(pdElement('h3',pdText('Zusammenfassung','Summary')));
    const info=PlanDesigner.timing(pd.draft),summary=pdElement('dl','','designer-review-summary');
    const duration=value=>value==null?pdText('Nicht bestimmbar','Undetermined'):`${value.toLocaleString(currentLang)} min`;
    for(const [title,value] of [
      [pdText('Schritte / im Dock','Steps / in dock'),`${info.steps} / ${info.dock}`],
      [pdText('Manuelle Übergänge','Manual transitions'),String(info.manual)],
      [pdText('Maischerasten bis zum ersten Kochschritt','Mash rests before the first boil step'),duration(info.mash)],
      [pdText('Kochdauer (Planangabe)','Boil duration (plan setting)'),duration(info.boil)],
      [pdText('Nachisomerisierung (Planangabe)','Post-boil isomerization (plan setting)'),duration(info.after)],
      [pdText('Summe Rastzeiten ohne Sonderbefehle','Total timed rests excluding special commands'),duration(info.hold)]
    ])summary.append(pdElement('dt',title),pdElement('dd',value));
    results.append(summary,pdElement('p',pdText('Zeiten ohne Aufheizen, Abkühlen und manuelle Wartezeiten/Läutern','Times exclude heating, cooling and manual waits/lautering')));
  };
  check.addEventListener('change',render);render();
}
function pdComparison() {
  const box=pdNode('Comparison');box.replaceChildren();box.hidden=!pd.comparison;pdNode('Steps').hidden=!!pd.comparison;pdNode('Columns').hidden=!!pd.comparison;if(!pd.comparison)return;
  const shell=pdElement('div','','designer-compare-shell'),table=pdElement('table','','file-table designer-compare-table');
  const head=pdElement('thead'),titles=pdElement('tr'),columns=pdElement('tr'),body=pdElement('tbody');
  for(const [index,plan] of [pd.draft,pd.comparison].entries()) {
    if(index){const spacer=pdElement('th','','designer-compare-transfer');spacer.setAttribute('rowspan','2');spacer.setAttribute('aria-label',pdText('In den aktuellen Maischeplan übernehmen','Transfer to current mash plan'));titles.append(spacer);}
    const title=pdElement('th','','designer-compare-title');title.setAttribute('colspan','5');title.setAttribute('scope','colgroup');
    title.append(pdElement('strong',index?pdText('Vergleichsplan','Comparison plan'):pdText('Aktueller Maischeplan','Current mash plan')),pdElement('span',plan.name));titles.append(title);
    for(const label of ['#',pdText('Rast','Rest'),pdText('Temperatur','Temperature'),pdText('Dauer','Duration'),'autonext']){
      const cell=pdElement('th',label);cell.setAttribute('scope','col');columns.append(cell);
    }
  }
  head.append(titles,columns);table.append(head,body);shell.append(table);box.append(shell);
  let leftNumber=0,rightNumber=0;
  for(const row of PlanDesigner.compare(pd.draft,pd.comparison)) {
    const insertionIndex=leftNumber;
    const line=pdElement('tr','',row.changed.length?'changed':'');
    for(const [index,s] of [row.left,row.right].entries()) {
      if(index){const transfer=pdElement('td','','designer-compare-transfer');
        if(row.right){const button=pdElement('button','','primary');button.type='button';
          button.append(pdElement('span','','icon-arrow-left2'));
          button.title=pdText('Schritt rechts an dieser Position in den Maischeplan links übernehmen','Insert right-hand step at this position in the mash plan on the left');button.setAttribute('aria-label',button.title);
          button.addEventListener('click',()=>pdChange(()=>{const copy=PlanDesigner.clone(row.right);copy.id=PlanDesigner.id();pd.draft.steps.splice(insertionIndex,0,copy);}));transfer.append(button);}
        line.append(transfer);
      }
      if(!s){const empty=pdElement('td','—','designer-compare-empty');empty.setAttribute('colspan','5');line.append(empty);continue;}
      const number=index?++rightNumber:++leftNumber;
      for(const text of [String(number),s.Rast,`${s.Temperatur} °C`,`${s.Dauer} min`])line.append(pdElement('td',text));
      const auto=pdElement('td');auto.append(pdContinuation(s));line.append(auto);
    }
    body.append(line);
  }
}
function pdImportStatus() {
  const output=pdNode('ImportStatus');if(!output)return;
  const ids=new Set(pdSelectedIds());
  const items=[...pd.draft.steps,...pd.draft.dock].filter(step=>ids.has(step.id)&&Object.keys(step.original||{}).length);
  const key=JSON.stringify([pd.draft.id,items.map(step=>[step.id,step.Rast,step.original])]);
  if(output.dataset.source===key)return;
  output.dataset.source=key;
  output.textContent=items.map(step=>`${pdText('Importdaten','Import data')} · ${step.Rast}\n${JSON.stringify(step.original,null,2)}`).join('\n\n');
}
function pdRender() {
  if(!pdNode('Panel'))return;
  pdNode('Name').value=pd.draft.name;pdNode('Generation').value=pd.draft.generation;
  pdNode('Saved').textContent=pd.dirty?'●':'';pdSidebar();pdRows();pdProperties();pdComparison();pdDockTools();pdImportStatus();
  const compare=pdNode('CompareToggle'),active=!!pd.comparison;
  compare.className=(active?'danger':'info')+' explorer-icon';
  compare.title=active?pdText('Vergleich beenden','Close comparison'):pdText('Maischeplan vergleichen','Compare mash plan');
  compare.setAttribute('aria-label',compare.title);
  const icon=pdElement('i','','icon-'+(active?'cross':'copy'));icon.setAttribute('aria-hidden','true');compare.replaceChildren(icon);
  pdNode('Undo').disabled=!pd.undo.length;pdNode('Redo').disabled=!pd.redo.length;
}
async function openDesigner() {
  initializeDesigner();await pdLoadDock();const profile=appConfig.active_device_id||'primary';
  if(pd.profile!==profile){
    const token=++pd.token;const value=await pdApi('snapshot-load',{profile});if(token!==pd.token||profile!==(appConfig.active_device_id||'primary'))return;
    const wasDirty=pd.dirty;pd.profile=profile;pd.draft.snapshot=value;pd.draft.generation=PlanDesigner.generationFor(value);if(!wasDirty)pdMarkClean();pdRender();
  }
}
function initializeDesigner() {
  if(pdNode('Panel'))return;
  pd.language=currentLang;
  const panel=pdElement('section','','tab-panel span-2');panel.dataset.panel='designer';panel.id='designerPanel';
  const card=pdElement('section','','designer-card');const toolbar=pdElement('div','','designer-toolbar');
  const name=pdElement('input');name.id='designerName';name.placeholder=pdText('Planname','Plan name');name.setAttribute('aria-label',name.placeholder);
  name.addEventListener('change',()=>pdChange(()=>pd.draft.name=name.value));toolbar.append(name);
  const generation=pdElement('select');generation.id='designerGeneration';generation.setAttribute('aria-label',pdText('Zielgeneration','Target generation'));
  for(const [value,label] of [['1.66',pdText('bis 1.66','up to 1.66')],['1.67+',pdText('ab 1.70','from 1.70')]]){const o=pdElement('option',label);o.value=value;generation.append(o);}generation.addEventListener('change',()=>pdChange(()=>pd.draft.generation=generation.value));toolbar.append(generation);
  const actions=[['file-empty','Neuer Plan','New plan',()=>pdAccept(PlanDesigner.create())],['folder-open','Entwurf öffnen','Open draft',()=>pdSource('drafts')],
    ['floppy-disk','Entwurf speichern','Save draft',pdSaveChoice],['download','Ins Inventar übernehmen','Move to inventory',pdPublish],
    ['upload','Maischeplan auf Gerät übertragen','Transfer mash plan to device',pdTransfer,'Transfer'],
    ['undo','Rückgängig','Undo',()=>pdHistory('undo','redo'),'Undo'],
    ['undo','Wiederholen','Redo',()=>pdHistory('redo','undo'),'Redo'],['equalizer','Maischeplan Eigenschaften','Mash plan properties',()=>{pd.selected=null;pdRender();}],['eye','Plan prüfen','Review plan',pdReview],
    ['copy','Maischeplan vergleichen','Compare mash plan',()=>{if(pd.comparison){pd.comparison=null;pd.comparisonSource=null;pdRender();}else return pdSource('drafts',true);},'CompareToggle']];
  for(const [icon,de,en,fn,id] of actions){
    const b=pdButton(icon,de,en,fn);
    const tone=fn===pdPublish?'success':['file-empty','folder-open','floppy-disk','upload'].includes(icon)?'primary':icon==='undo'?'ghost':'info';
    b.className=tone+' explorer-icon';if(id)b.id='designer'+id;toolbar.append(b);
  }
  const saved=pdElement('span');saved.id='designerSaved';saved.title=pdText('Ungespeicherte Änderungen','Unsaved changes');toolbar.append(saved);
  const layout=pdElement('div','','designer-layout'),side=pdElement('nav','','designer-sidebar');side.id='designerSidebar';
  const center=pdElement('div','','designer-center'),steps=pdElement('div','','designer-steps');steps.id='designerSteps';steps.setAttribute('role','listbox');steps.setAttribute('aria-label',pdText('Maischeplan','Mash plan'));pdDrop(steps,'steps');
  const columns=pdElement('div','','designer-columns');columns.id='designerColumns';
  for(const label of ['#',pdText('Rast','Rest'),pdText('Temperatur','Temperature'),pdText('Dauer','Duration'),'autonext'])columns.append(pdElement('span',label));
  center.append(columns);
  const compare=pdElement('div','','designer-comparison');compare.id='designerComparison';compare.hidden=true;center.append(steps,compare);
  const right=pdElement('div','','designer-right');right.id='designerRight';const properties=pdElement('form','','designer-properties');properties.id='designerProperties';properties.autocomplete='off';properties.addEventListener('submit',event=>event.preventDefault());
  const dock=pdElement('div','','designer-dock');dock.id='designerDock';pdDrop(dock,'dock');
  const propertiesHead=pdElement('div','','designer-properties-head');propertiesHead.id='designerPropertiesHead';
  properties.addEventListener('input',event=>{pd.pendingPropertyInput=event.target;});
  properties.addEventListener('keydown',pdPropertiesKey);
  const propertyActions=pdElement('div','','designer-property-actions');propertyActions.id='designerPropertyActions';propertyActions.append(pdApplyButton());
  propertiesHead.append(pdElement('h3',pdText('Eigenschaften','Properties')),propertyActions);
  const dockHead=pdElement('div','','designer-dock-head'),dockTools=pdElement('div','','actions');dockTools.id='designerDockTools';dockHead.append(pdElement('h3','Dock'),dockTools);const dockNotice=pdElement('div','','designer-dock-notice');dockNotice.id='designerDockNotice';const dockTabs=pdElement('div','','designer-dock-tabs');dockTabs.id='designerDockTabs';dockTabs.setAttribute('role','tablist');dockTabs.setAttribute('aria-label','Dock');right.append(propertiesHead,properties,dockHead,dockTabs,dockNotice,dock);layout.append(side,center,right);
  const status=pdElement('div','','designer-status');status.id='designerStatus';status.setAttribute('role','status');
  card.append(toolbar,layout,status);panel.append(card);
  const debug=typeof debugEnabled==='function'?debugEnabled():!!appConfig.debug_output;
  const debugCard=pdElement('section','','card span-2 debug-panel'+(debug?'':' hidden-panel'));
  debugCard.id='designerDebugStatus';debugCard.append(pdElement('h2','Status'));
  const output=pdElement('pre','','output');output.id='designerImportStatus';debugCard.append(output);
  const debugActions=pdElement('div','','actions logging-actions');
  const clear=pdButton('trash-o','Status leeren','Clear status',()=>{output.textContent='';});clear.id='designerImportClear';
  const copy=pdButton('copy','In Zwischenablage kopieren','Copy to clipboard',()=>copyOutputLog('designerImportStatus'));copy.id='designerImportCopy';copy.className='primary explorer-icon';
  debugActions.append(clear,copy);debugCard.append(debugActions);panel.append(debugCard);
  document.querySelector('main.layout').append(panel);
  const dialog=pdElement('dialog','','designer-dialog');dialog.id='designerDialog';document.body.append(dialog);
  panel.addEventListener('keydown',pdInsertKey);steps.tabIndex=0;dock.tabIndex=0;
  initializeDesignerSettings();pdRender();pdLoadDock();
  if(!pd.unloadBound){window.addEventListener('beforeunload',event=>{if((pd.dirty||pd.dockPending||pd.dockError)&&!pd.allowUnload){event.preventDefault();event.returnValue='';}});pd.unloadBound=true;}
}
function initializeDesignerSettings() {
  const settings=document.querySelector('[data-panel="settings"] .card');if(!settings)return;
  const section=pdElement('section','','workspace-settings-devices');section.id='designerSettings';section.append(pdElement('h3',pdText('Rezeptquellen','Recipe sources')));
  const groups=pdElement('div','','designer-settings-grid');section.append(groups);
  const group=(title,formId=null)=>{const box=pdElement(formId?'form':'section','','designer-settings-group');if(formId){box.id=formId;box.autocomplete='off';box.addEventListener('submit',event=>event.preventDefault());}box.append(pdElement('h4',title));groups.append(box);return box;};
  const bf=group('Brewfather','designerBrewfatherForm'),kbh=group('kleinerBrauhelfer2'),imports=group(pdText('Importvorgaben','Import defaults'));
  let target=bf;
  const field=(id,label,type='text')=>{const l=pdElement('label',label);const input=pdElement('input');input.id='designer'+id;input.type=type;l.append(input);target.append(l);return input;};
  const user=field('BfUser','Brewfather User ID');const key=field('BfKey','Brewfather API Key','password');key.autocomplete='off';user.autocomplete='off';
  target=kbh;
  const path=field('KbhPath',pdText('kleinerBrauhelfer2 SQLite-Datei','kleinerBrauhelfer2 SQLite file'));
  const actions=pdElement('div','','designer-actions');const feedback=pdElement('p');feedback.setAttribute('role','status');
  const run=fn=>async()=>{try{await fn();}catch(error){feedback.textContent=error.message;}};
  const pick=pdButton('folder-open','SQLite-Datei auswählen','Choose SQLite file',run(async()=>{const r=await pdApi('pick-kbh');if(r.path)path.value=r.path;}));
  const save=pdButton('floppy-disk','Quellen speichern','Save sources',run(async()=>{const r=await pdApi('settings',{settings:{brewfather_user:user.value,brewfather_key:key.value,kbh_path:path.value,import_options:pdOptions()}});key.value='';key.placeholder=r.key_saved?pdText('Gespeichert','Saved'):'';feedback.textContent=pdText('Gespeichert.','Saved.');}));
  const remove=pdButton('trash-o','API-Schlüssel entfernen','Remove API key',run(async()=>{await pdApi('settings',{settings:{clear_key:true}});key.value='';key.placeholder='';feedback.textContent=pdText('API-Schlüssel entfernt.','API key removed.');}));
  const pathRow=pdElement('div','','designer-settings-input');path.parentElement.replaceChild(pathRow,path);pathRow.append(path,pick);
  const keyRow=pdElement('div','','designer-settings-input');key.parentElement.replaceChild(keyRow,key);keyRow.append(key,remove);
  save.className='success icon-button';save.title=pdText('Speichern','Save');save.setAttribute('aria-label',save.title);
  actions.id='designerSettingsActions';actions.className='designer-settings-actions';actions.append(save,feedback);
  target=imports;
  field('BoilTemp',pdText('Kochtemperatur °C','Boil temperature °C'),'number').value=100;
  field('MashOutTemp',pdText('Abmaischtemperatur °C','Mash-out temperature °C'),'number').value=78;
  field('FirstWortTemp',pdText('Vorderwürzenhopfung °C','First-wort hopping °C'),'number').value=78;
  field('WhirlpoolTemp',pdText('Whirlpoolhopfung °C','Whirlpool hopping °C'),'number').value=80;
  settings.append(section);
  const heading=settings.querySelector('#workspaceSettingsTitle');
  const header=pdElement('div','','settings-heading');heading.replaceWith(header);header.append(heading,save);
  document.querySelector('[data-panel="settings"] .header-side').append(actions);
  pdApi('settings').then(r=>{user.value=r.brewfather_user||'';path.value=r.kbh_path||'';key.placeholder=r.key_saved?pdText('Gespeichert','Saved'):'';const o=r.import_options||{};pdNode('BoilTemp').value=o.boil_temp??100;pdNode('MashOutTemp').value=o.mash_out_temp??78;pdNode('FirstWortTemp').value=o.first_wort_temp??78;pdNode('WhirlpoolTemp').value=o.whirlpool_temp??80;}).catch(e=>feedback.textContent=e.message);
}

function translateDesigner() {
  if(!pdNode('Panel') || pd.language===currentLang)return;
  const active=pdNode('Panel').classList.contains('active');
  pdNode('Panel').remove();pdNode('Dialog').remove();pdNode('Settings')?.remove();pdNode('SettingsActions')?.remove();
  initializeDesigner();if(active)pdNode('Panel').classList.add('active');
}
