// One explorer, two storage locations. No device action occurs until explicitly requested.
const ex = {side:"device", path:"/", view:"all", files:[], selected:null, preview:null, previewLoading:false, previewError:"",
  context:"", request:0, busy:false, loading:false, editing:false, dirty:false,
  expandedVersions:new Set(), localFolder:"", showPreview:true,  sort:"name", descending:false};
const exNode = id => document.getElementById("explorer" + id);
const exText = (de,en) => currentLang === "de" ? de : en;
const EX_ICONS = {back:"arrow-left2",up:"arrow-up",refresh:"refresh",newFile:"file-empty",newFolder:"folder-plus",
  upload:"upload",download:"download",transfer:"folder-download",rename:"text-width",delete:"trash-o",
  copy:"copy",edit:"pencil",save:"floppy-disk",cancel:"cross",preview:"preview-pane",info:"eye",openFolder:"folder-open",root:"folder-open"};
function exLabel(action) {
  const labels = {openFolder:["Ordner öffnen","Open folder"],back:["Zur vorherigen Ansicht","Back to previous view"],up:["Übergeordnetes Verzeichnis","Parent directory"],refresh:["Aktualisieren","Refresh"],
    newFile:["Neue Datei","New file"],newFolder:["Neuer Ordner","New folder"],upload:["Datei vom PC hochladen","Upload file from PC"],
    download:["Datei herunterladen","Download file"],transfer:ex.side === "device" ? ["Im lokalen Inventar speichern","Save to local inventory"] : [`Auf ${exDeviceName()} übertragen`,`Transfer to ${exDeviceName()}`],
    rename:["Umbenennen","Rename"],delete:["Löschen","Delete"],copy:["Inhalt in Zwischenablage kopieren","Copy contents to clipboard"],
    edit:["Datei bearbeiten","Edit file"],save:["Änderungen speichern","Save changes"],cancel:["Bearbeiten abbrechen","Cancel editing"],
    preview:["Vorschau ein-/ausblenden","Toggle preview"],root:["Inventarverzeichnis auswählen","Choose inventory directory"]};
  return exText(...labels[action]);
}
function exIcon(action, handler) {
  const button=document.createElement("button");button.type="button";const tone=action==='delete'?'danger':action==='transfer'?'success':
    ['newFile','newFolder','openFolder','root','upload','download','save'].includes(action)?'primary':
    ['preview','info','copy','edit','rename'].includes(action)?'info':'ghost';
  button.className=tone+" explorer-icon";
  button.dataset.exAction=action;button.title=exLabel(action);button.setAttribute("aria-label",button.title);
  const icon=document.createElement("i");icon.className=`icon-${EX_ICONS[action]} button-icon`;icon.setAttribute("aria-hidden","true");
  const tip=document.createElement("span");tip.className="explorer-tooltip";tip.textContent=button.title;tip.setAttribute("aria-hidden","true");
  button.append(icon,tip);
  if(["transfer","preview"].includes(action)) {
    const label=document.createElement("span");label.className="explorer-command-label";
    label.textContent=action === "preview" ? exText("Vorschau","Preview") : exLabel(action);button.appendChild(label);
  }
  button.addEventListener("click",handler);return button;
}
function exDeviceName() {
  const profiles=workspaceProfiles(), index=Math.max(0,profiles.findIndex(p=>p.id === appConfig.active_device_id));
  return deviceProfileName(index,profiles.length,profiles[index]);
}
function exContext() { return `${appConfig.active_device_id || ""}|${managementDeviceUrl()}|${appConfig.inventory_root || ""}|${ex.localFolder}`; }
function syncExplorerContext() {
  if (!exNode("Files")) return;
  const context=exContext();if(context === ex.context)return;
  ex.context=context;ex.request++;ex.files=[];ex.selected=null;ex.preview=null;ex.previewLoading=false;ex.previewError="";ex.editing=false;ex.dirty=false;ex.loading=false;
  ex.path="/";ex.view="all";
  exRender();exStatus("");
}
function explorerCanLeave() {
  if(ex.busy)return false;
  if(ex.dirty && !confirm(exText("Ungespeicherte Änderungen verwerfen?","Discard unsaved changes?")))return false;
  ex.editing=false;ex.dirty=false;return true;
}
function exStatus(message) { exNode("Status").textContent=message; }
function exError(error) {
  const message=String(error);
  if(/getaddrinfo failed|name or service not known|nodename nor servname provided|temporary failure in name resolution/i.test(message)){
    return exText(`Die Geräteadresse „${managementDeviceUrl()}“ konnte nicht aufgelöst werden. Unter „Gerät“ die Adresse prüfen oder die IP-Adresse eintragen und anschließend aktualisieren. Das lokale Inventar ist unabhängig davon verfügbar.`,
      `The device address "${managementDeviceUrl()}" could not be resolved. Check the address under Device or enter its IP address, then refresh. The local inventory remains available.`);
  }
  return message;
}
function exQuery(extra={}) { return new URLSearchParams({side:ex.side,path:ex.path,view:ex.view,base_url:managementDeviceUrl(),local_folder:ex.side === "local" ? ex.localFolder : "",...extra}); }
function exValid(token,context) {return token === ex.request && context === exContext();}
function exProtectedFolder(file=ex.selected) {return ex.side==="device"&&["/Fermenter","/language","/Profile","/Rezepte"].includes(file?.path);}
function exButtons() {
  const file=ex.selected?.type === "file";
  document.querySelectorAll("[data-ex-action]").forEach(button=>{
    const action=button.dataset.exAction;
    let disabled=ex.busy || ex.loading || (ex.view === "drafts" && action !== "refresh");
    if(["copy","edit","download","transfer"].includes(action))disabled ||= !file;
    if(["rename","delete"].includes(action))disabled ||= !ex.selected;
    if(action === "newFolder")disabled ||= ex.side === "device";
    if(action === "rename")disabled ||= ex.side === "device" && !file;
    if(action === "delete")disabled ||= exProtectedFolder();
    if(action === "copy")disabled ||= ex.preview?.text == null;
    if(action === "edit")disabled ||= !ex.preview?.editable || ex.editing;
    if(action === "save")disabled ||= !ex.editing || !ex.dirty;
    if(action === "cancel")disabled ||= !ex.editing;
    if(ex.editing && !["save","cancel","copy"].includes(action))disabled=true;
    button.disabled=disabled;
    if(["openFolder","newFolder"].includes(action))button.hidden=ex.side !== "local";
    button.title=exLabel(action);button.setAttribute("aria-label",button.title);
    button.querySelector(".explorer-tooltip").textContent=button.title;
    const label=button.querySelector(".explorer-command-label");
    if(label)label.textContent=action === "preview" ? exText("Vorschau","Preview") : button.title;
    if(action === "preview")button.setAttribute("aria-pressed",String(ex.showPreview));
    if(action === "transfer")button.querySelector("i").className=`icon-folder-${ex.side === "device" ? "download" : "upload"} button-icon`;
  });
  exNode("Sidebar").querySelectorAll("button").forEach(button=>button.disabled=ex.busy);
}
function exSidebar() {
  const nav=exNode("Sidebar");nav.replaceChildren();ex.sidebarOpen||={};
  const group=(key,label)=>{
    const section=document.createElement('details');section.className='designer-sidebar-group';section.dataset.group=key;section.open=ex.sidebarOpen[key]!==false;
    const summary=document.createElement('summary');summary.textContent=label;section.append(summary);
    section.addEventListener('toggle',()=>{if(Array.from(nav.children).includes(section))ex.sidebarOpen[key]=section.open;});nav.append(section);return section;
  };
  for(const side of ["device","local"]) {
    const section=group(side,side === "device" ? exDeviceName() : exText("Inventar","Inventory"));
    const shortcuts=[["/","all",exText("Alle Dateien","All files")],["/Rezepte","all",exText("Maischepläne","Mash plans")],
      ["/Fermenter","all",exText("Fermenterpläne","Fermenter plans")],["/Profile","all",exText("Profile","Profiles")],
      [side === "local" ? "/config" : "/","config",exText("Konfiguration","Configuration")],["/","logs",exText("Logs","Logs")]];
    if(side === "local")shortcuts.splice(2,0,["/","drafts",exText("Entwürfe","Drafts")]);
    for(const [path,view,label] of shortcuts) {
      const button=document.createElement("button");button.type="button";button.className="ghost";button.textContent=label;
      if(ex.side === side && ex.path === path && ex.view === view && !(side === "local" && ex.localFolder))button.setAttribute("aria-current","location");
      button.addEventListener("click",()=>{if(!explorerCanLeave())return;if(side === "local")ex.localFolder="";syncExplorerContext();exNavigate(side,path,view);});section.appendChild(button);
    }
  }
  const quick=group('quick',exText("Schnellzugriff","Quick access")),heading=quick.children[0];
  const add=document.createElement("button");add.type="button";add.className="ghost explorer-quick-add";add.textContent="+";
  add.title=exText("Ordner hinzufügen","Add folder");add.setAttribute("aria-label",add.title);add.addEventListener("click",event=>{event.preventDefault();event.stopPropagation();exOpenFolder();});
  heading.append(add);
  const folders=appConfig.explorer_folders || [];
  for(const folder of folders) {
    const parts=folder.path.replaceAll("\\","/").replace(/\/$/,"").split("/");
    const name=parts.at(-1) || folder.path;
    const duplicate=folders.filter(item=>(item.path.replaceAll("\\","/").replace(/\/$/,"").split("/").at(-1) || item.path) === name).length > 1;
    const row=document.createElement("div");row.className="explorer-quick-row";
    const button=document.createElement("button");button.type="button";button.className="ghost explorer-quick-link";button.title=folder.path;
    const icon=document.createElement("i");icon.className="icon-folder button-icon";icon.setAttribute("aria-hidden","true");
    const label=document.createElement("span");label.textContent=duplicate ? `${name} — ${parts.slice(0,-1).join("/")}` : name;
    button.append(icon,label);
    if(ex.side === "local" && ex.localFolder === folder.token)button.setAttribute("aria-current","location");
    button.addEventListener("click",()=>{if(!explorerCanLeave())return;ex.localFolder=folder.token;syncExplorerContext();exNavigate("local","/");});
    const more=document.createElement("button");more.type="button";more.className="ghost explorer-quick-more";more.textContent="⋯";
    more.title=exText("Menü","Menu");more.setAttribute("aria-label",`${more.title}: ${name}`);more.setAttribute("aria-haspopup","menu");more.setAttribute("aria-expanded","false");
    const menu=document.createElement("div");menu.className="explorer-quick-menu";menu.hidden=true;menu.setAttribute("role","menu");
    const remove=document.createElement("button");remove.type="button";remove.className="ghost";remove.setAttribute("role","menuitem");remove.textContent=exText("Aus Schnellzugriff entfernen","Remove from quick access");
    const open=event=>{event.preventDefault();if(ex.busy)return;exCloseQuickMenu();menu.hidden=false;more.setAttribute("aria-expanded","true");ex.quickMenu={menu,more};remove.focus();};
    more.addEventListener("click",open);row.addEventListener("contextmenu",open);
    row.addEventListener("keydown",event=>{if(event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))open(event);});
    remove.addEventListener("click",()=>exRemoveFolder(folder));menu.appendChild(remove);
    row.append(button,more,menu);quick.appendChild(row);
  }
}
function exCloseQuickMenu(restore=false) {
  if(!ex.quickMenu)return;
  ex.quickMenu.menu.hidden=true;ex.quickMenu.more.setAttribute("aria-expanded","false");
  if(restore)ex.quickMenu.more.focus();ex.quickMenu=null;
}
async function exRemoveFolder(folder) {
  if(!explorerCanLeave())return;
  exCloseQuickMenu();ex.busy=true;exButtons();
  try {
    const result=await api("/api/explorer/folder/remove",{method:"POST",body:{token:folder.token}});
    appConfig.explorer_folders=result.folders;
    if(ex.localFolder === folder.token){ex.localFolder="";syncExplorerContext();}
    exSidebar();
  } catch(error){exStatus(exError(error));}
  finally {ex.busy=false;exButtons();}
  if(ex.side === "local" && !ex.localFolder)await loadExplorer();
}

async function exOpenFolder() {
  if(!explorerCanLeave())return;
  const context=exContext();ex.busy=true;exButtons();
  let result;
  try {result=await api("/api/explorer/folder/pick",{method:"POST",body:{}});}
  catch(error){exStatus(exError(error));}
  finally {ex.busy=false;exButtons();}
  if(!result?.token || context !== exContext())return;
  appConfig.explorer_folders=result.folders || [...(appConfig.explorer_folders || []),result];ex.localFolder=result.token;syncExplorerContext();await exNavigate("local","/");
}
function exDate(value) {
  if(!value)return "—";
  const date=new Date(typeof value === "number" || /^\d+$/.test(String(value)) ? Number(value)*1000 : value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString(currentLang);
}
// Shared version presentation for Explorer, inventory and drafts. Base files are newest.
function exVersionGroups(files, force=false) {
  const names=new Map(files.filter(f=>f.type==='file').map(f=>[f.name,f])), archived=new Map(),hidden=new Set();
  for(const file of files){const info=versionInfoForName(file.name);
    if(file.type==='file'&&info&&names.has(info.baseName)){
      if(!archived.has(info.baseName))archived.set(info.baseName,[]);
      archived.get(info.baseName).push(file);hidden.add(file.name);
    }
  }
  return files.filter(f=>!hidden.has(f.name)).map(file=>{
    const older=(archived.get(file.name)||[]).sort((a,b)=>versionInfoForName(a.name).index-versionInfoForName(b.name).index);
    const grouped=file.type==='file'&&older.length>0;
    return {file,versions:grouped?[...older,file].map((entry,index)=>({file:entry,version:index+1})).reverse():[]};
  });
}
function exVersionHeading(cell,name,count,expanded,toggle,showCount=false) {
  const button=document.createElement('button');button.type='button';button.className='ghost explorer-filename version-group-toggle';
  button.setAttribute('aria-expanded',String(expanded));
  const arrow=document.createElement('span');arrow.textContent=expanded?'▾':'▸';arrow.setAttribute('aria-hidden','true');
  const icon=document.createElement('i');icon.className='icon-file-text2 button-icon';icon.setAttribute('aria-hidden','true');
  const label=document.createElement('strong');label.textContent=name;
  button.append(arrow,icon,label);button.addEventListener('click',toggle);cell.append(button);
  if(!showCount)return;
  const badge=document.createElement('span');badge.className='version-count';badge.textContent=count+' '+(count===1?'Version':exText('Versionen','versions'));cell.append(badge);
}
function exTrash(cell,label,action) {
  const button=document.createElement('button');button.type='button';button.className='danger explorer-icon';button.title=label;button.setAttribute('aria-label',label);
  const icon=document.createElement('i');icon.className='icon-trash-o button-icon';icon.setAttribute('aria-hidden','true');button.append(icon);button.addEventListener('click',action);cell.append(button);
}
function exBreadcrumb(container,path,navigate) {
  container.replaceChildren();container.className='inventory-breadcrumb';container.setAttribute('aria-label',exText('Aktueller Ordner','Current folder'));
  const parts=path.split('/').filter(Boolean);
  for(let i=0;i<=parts.length;i++){
    if(i){const divider=document.createElement('span');divider.textContent=' / ';container.append(divider);}
    const button=document.createElement('button');button.type='button';button.className='ghost';button.textContent=i?parts[i-1]:exText('Inventar','Inventory');
    const location='/'+parts.slice(0,i).join('/');button.addEventListener('click',()=>navigate(location));if(i===parts.length)button.setAttribute('aria-current','location');container.append(button);
  }
}
async function exDeletePlan(file,all) {
  if(ex.busy||ex.loading||!explorerCanLeave())return;
  const label=all?exText('Alle Versionen löschen','Delete all versions'):exText('Diese Version löschen','Delete this version');
  if(!confirm(label+': '+file.name+'?'))return;
  ex.busy=true;exButtons();
  try{await api('/api/designer/inventory-delete',{method:'POST',body:{path:file.path,all_versions:all}});}
  catch(error){exStatus(exError(error));return;}
  finally{ex.busy=false;exButtons();}
  await loadExplorer();
}
async function exDeleteEntries(files) {
  if(ex.busy||ex.loading||!explorerCanLeave())return;
  const label=files.length>1?exText('Alle Versionen löschen?','Delete all versions?'):exText('Löschen?','Delete?');
  if(!confirm(files[0].name+' – '+label))return;
  ex.busy=true;exButtons();let error;
  try{for(const file of files)await api('/api/explorer/action',{method:'POST',body:{side:ex.side,path:file.path,action:'delete',base_url:managementDeviceUrl(),local_folder:ex.localFolder}});}
  catch(reason){error=reason;}
  finally{ex.busy=false;exButtons();}
  await loadExplorer();if(error)exStatus(exError(error));
}
function exFiles() {
  const body=exNode('Files');body.replaceChildren();
  let breadcrumb=exNode('Breadcrumb');
  if(!breadcrumb){breadcrumb=document.createElement('nav');breadcrumb.id='explorerBreadcrumb';body.parentElement.parentElement.before(breadcrumb);}
  const drafts=ex.side==='local'&&ex.view==='drafts';breadcrumb.hidden=drafts;exNode('FileTable').hidden=drafts;exNode('Drafts').hidden=!drafts;
  if(drafts)return;
  exBreadcrumb(breadcrumb,ex.path,path=>exNavigate(ex.side,path));
  if(ex.side==='device'&&breadcrumb.children[0])breadcrumb.children[0].textContent=exDeviceName();
  const rows=[...ex.files].sort((a,b)=>{
    if(a.type!==b.type)return a.type==='dir'?-1:1;
    const result=ex.sort==='size'?a.size-b.size:String(a[ex.sort]||'').localeCompare(String(b[ex.sort]||''),currentLang,{numeric:true});return ex.descending?-result:result;
  });
  if(ex.path!=='/'){
    const row=document.createElement('tr'),cell=document.createElement('td'),button=document.createElement('button');cell.colSpan=5;
    button.type='button';button.className='ghost explorer-filename';button.textContent='..';button.title=exText('Übergeordneter Ordner','Parent folder');button.setAttribute('aria-label',button.title);
    button.addEventListener('click',()=>exNavigate(ex.side,ex.path.slice(0,ex.path.lastIndexOf('/'))||'/'));cell.append(button);row.append(cell);body.append(row);
  }
  const appendFile=(file,version,latest=false)=>{
    const row=document.createElement('tr');row.className=version?'explorer-version-row':'';row.classList.toggle('selected',ex.selected?.path===file.path);row.setAttribute('aria-selected',String(ex.selected?.path===file.path));
    row.tabIndex=0;row.dataset.path=file.path;row.addEventListener('click',()=>exSelect(file));
    const name=document.createElement('td'),button=document.createElement('button');button.type='button';button.className='ghost explorer-filename';
    const icon=document.createElement('i');icon.className=`icon-${file.type==='dir'?'folder':'file-text2'} button-icon`;icon.setAttribute('aria-hidden','true');
    const label=document.createElement('span');label.textContent=(version?'Version '+version+(latest?' · '+exText('Neueste','Latest'):'')+' — ':'')+file.name;button.append(icon,label);
    button.addEventListener('click',event=>{event.stopPropagation?.();return file.type==='dir'?exNavigate(ex.side,file.path):exSelect(file);});name.append(button);row.append(name);
    for(const value of [exDate(file.created_at),exDate(file.mtime),file.type==='dir'?exText('Ordner','Folder'):file.name.split('.').pop().toUpperCase(),file.type==='dir'?'—':Number(file.size||0).toLocaleString(currentLang)+' B']){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}
    body.append(row);
  };
  const groups=ex.side==='local'?exVersionGroups(rows):rows.map(file=>({file,versions:[]}));
  for(const {file,versions} of groups){
    if(!versions.length){appendFile(file);continue;}
    const key=exContext()+'|'+file.path,expanded=ex.expandedVersions.has(key);
    const row=document.createElement('tr');row.className='version-group';const name=document.createElement('td');
    exVersionHeading(name,file.name,versions.length,expanded,()=>{
      if(!explorerCanLeave())return;
      if(expanded)ex.expandedVersions.delete(key);else ex.expandedVersions.add(key);
      if(versions.some(v=>v.file.path===ex.selected?.path)){ex.request++;ex.selected=null;ex.preview=null;ex.previewLoading=false;exPreview();exButtons();}exFiles();
    });row.append(name);
    for(const value of [exDate(file.created_at),exDate(file.mtime),file.name.split('.').pop().toUpperCase(),'—']){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}
    body.append(row);
    if(expanded)for(const entry of versions)appendFile(entry.file,entry.version,entry===versions[0]);
  }
}
function exPreview() {
  exNode("PreviewPane").hidden=!ex.showPreview||ex.view === "drafts";
  exNode("Content").readOnly=!ex.editing;
  if(!ex.editing)exNode("Content").value=ex.preview?.text ?? "";
  exNode("PreviewTitle").textContent=ex.editing ? exText("Bearbeiten","Edit") : exText("Vorschau","Preview");
  exNode("Content").placeholder=ex.previewLoading ? exText("Vorschau wird geladen …","Loading preview …") : "";
  exNode("Content").setAttribute("aria-busy",String(ex.previewLoading));
  exNode("").classList.toggle("without-preview",!ex.showPreview||ex.view === "drafts");
}
function exRender(){exSidebar();exFiles();exPreview();exButtons();}
let exReadQueue = Promise.resolve();
function exReadApi(url, token, context) {
  const request = exReadQueue.catch(() => {}).then(() => exValid(token, context) ? api(url) : null);
  exReadQueue = request;
  return request;
}
async function loadExplorer({automatic=false}={}) {
  syncExplorerContext();if(ex.busy)return;
  if(!explorerCanLeave())return;
  const token=++ex.request,context=exContext();ex.selected=null;ex.preview=null;ex.previewLoading=false;ex.previewError="";ex.files=[];ex.loading=true;exRender();
  if(automatic && ex.side === "device" && typeof managementDeviceAvailable === "function" && !managementDeviceAvailable()){
    ex.loading=false;exRender();
    exStatus(exText('Keine bestätigte Netzwerkverbindung zum Gerät. Unter „Gerät“ die Verbindung prüfen und anschließend aktualisieren oder links das lokale Inventar öffnen.',
      'No confirmed network connection to the device. Check the connection under Device, then refresh, or open the local inventory on the left.'));return;
  }
  exStatus(exText("Dateien werden geladen …","Loading files …"));
  try {
    if(ex.side === "local" && ex.view === "drafts"){
      initializeDesigner();
      await pdDrafts(false,{container:exNode('Drafts'),isCurrent:()=>exValid(token,context)&&ex.view==='drafts',onOpen:()=>selectWorkspaceView('designer')});
      if(exValid(token,context))exStatus('');return;
    }
    const result=await exReadApi(`/api/explorer/list?${exQuery()}`,token,context);
    if(!exValid(token,context))return;
    if(ex.side === "device")recordExplorerDeviceResponse();
    ex.files=result.files;exStatus(`${result.files.length} ${exText("Einträge","items")}`);
  } catch(error){if(exValid(token,context))exStatus(exError(error));}
  finally{if(exValid(token,context)){ex.loading=false;exRender();}}
}
async function exNavigate(side,path,view="all") {
  if(!explorerCanLeave())return;
  ex.side=side;ex.path=path;ex.view=view;
  await loadExplorer();
}
async function exSelect(file) {
  if(!explorerCanLeave())return;
  if(file.type==="file")ex.showPreview=true;
  const token=++ex.request,context=exContext();ex.selected=file;ex.preview=null;ex.previewLoading=false;ex.previewError="";ex.previewLoading=file.type === "file";exFiles();exPreview();exButtons();
  Array.from(exNode("Files").children).find(row=>row.dataset.path===file.path)?.focus();
  if(file.type === "dir")return;
  exStatus(exText("Vorschau wird geladen …","Loading preview …"));
  try {
    const result=await exReadApi(`/api/explorer/preview?${exQuery({path:file.path})}`,token,context);
    if(!exValid(token,context))return;
    if(ex.side === "device")recordExplorerDeviceResponse();
    ex.preview=result;exStatus(result.reason === "large" ? exText("Datei zu groß für die Vorschau. Bitte herunterladen.","File too large for preview. Please download it.") : "");
  } catch(error){if(exValid(token,context)){ex.previewError=exText("Vorschau konnte nicht geladen werden: ","Could not load preview: ")+exError(error);exStatus(exError(error));}}
  finally{if(exValid(token,context)){ex.previewLoading=false;exPreview();exButtons();}}
}
function exChooseInventoryVersion(target) {
  const dialog=document.createElement("dialog");dialog.className="designer-dialog designer-save-dialog";
  const heading=document.createElement("h2");heading.textContent=exText("Im Inventar speichern","Save to inventory");
  const context=document.createElement("span");context.className="designer-save-context";context.textContent=target;
  heading.append(context);
  const body=document.createElement("div");body.className="designer-picker";
  dialog.append(heading,body);document.body.append(dialog);
  return new Promise(resolve=>{
    const finish=value=>{dialog.close();dialog.remove();resolve(value);};
    for(const [mode,icon,de,en,detailDe,detailEn] of [
      ["replace","floppy-disk","Version aktualisieren","Update version","Änderungen in dieser Version speichern. Der bisherige Stand wird ersetzt.","Save changes to this version, replacing its previous contents."],
      ["version","file-empty","Neue Version speichern","Save new version","Den bisherigen Stand behalten und eine weitere Version anlegen.","Keep the previous version and create another version."]
    ]) {
      const button=document.createElement("button");button.type="button";button.className="designer-save-option"+(mode==="replace"?" designer-save-update":"");
      const symbol=document.createElement("i");symbol.className="icon-"+icon;symbol.setAttribute("aria-hidden","true");
      const text=document.createElement("span");text.className="designer-save-option-text";
      const label=document.createElement("strong");label.textContent=exText(de,en);
      const detail=document.createElement("span");detail.textContent=exText(detailDe,detailEn);text.append(label,detail);
      button.append(symbol,text);button.addEventListener("click",()=>finish(mode));body.append(button);
    }
    const close=document.createElement("button");close.type="button";close.className="ghost icon-button dialog-close";close.textContent="×";close.setAttribute("aria-label",exText("Schließen","Close"));
    close.addEventListener("click",()=>finish(null));dialog.append(close);
    dialog.addEventListener("cancel",event=>{event.preventDefault();finish(null);});dialog.showModal();
  });
}
async function exAction(action,fields={}) {
  if(ex.busy)return false;
  const context=exContext();ex.busy=true;exButtons();
  try {
    const body={side:ex.side,path:ex.selected?.path || ex.path,base_url:managementDeviceUrl(),maintenance:managementServiceActive(),local_folder:ex.side === "local" ? ex.localFolder : "",action,...fields};
    let result=await api("/api/explorer/action",{method:"POST",body});
    if(result.conflict) {
      const conflict=await exChooseInventoryVersion(result.target);
      if(!conflict || context !== exContext())return false;
      result=await api("/api/explorer/action",{method:"POST",body:{...body,conflict}});
      if(!result.done)throw new Error(exText("Datei konnte nicht gespeichert werden.","File could not be saved."));
    }
    if(context !== exContext())return false;
    if(ex.side === "device" || action === "transfer")recordExplorerDeviceResponse();
    ex.dirty=false;ex.editing=false;exStatus(exText("Aktion abgeschlossen.","Action completed."));return true;
  } catch(error){if(context === exContext())exStatus(exError(error));return false;}
  finally{ex.busy=false;exButtons();}
}
function exDeviceTarget(file) {
  const info=versionInfoForName(file.name);
  const configNames=["config.txt","log_cfg.json"];
  const name=info && (configNames.includes(info.baseName) || ex.files.some(row=>row.type === "file" && row.name === info.baseName)) ? info.baseName : file.name;
  if(file.kind === "mashplan")return {name,folder:"/Rezepte"};
  if(configNames.includes(name) || !name.toLowerCase().endsWith(".json"))return {name,folder:"/"};
  const root=ex.localFolder ? (appConfig.explorer_folders || []).find(item=>item.token === ex.localFolder)?.path || "" : appConfig.inventory_root || "";
  const parts=(root.replaceAll("\\","/")+file.path).split("/").slice(0,-1);
  const known=["Fermenter","language","Profile","Rezepte"];
  for(const part of parts.reverse()) {
    const folder=known.find(item=>item.toLowerCase() === part.toLowerCase());
    if(folder)return {name,folder:"/"+folder};
    if(part.toLowerCase() === "config")return {name,folder:"/"};
  }
  return {name,folder:"/"};
}
function exChooseDeviceTarget(file) {
  const suggested=exDeviceTarget(file),dialog=document.createElement("dialog");dialog.className="profile-dialog";
  const form=document.createElement("form");
  const title=document.createElement("h2");title.textContent=exLabel("transfer");
  const folderLabel=document.createElement("label"),folderText=document.createElement("span"),select=document.createElement("select");
  folderText.textContent=exText("Zielverzeichnis","Destination folder");select.required=true;
  for(const [value,label] of [["/",exText("Hauptverzeichnis /","Root /")],...["Fermenter","language","Profile","Rezepte"].map(name=>["/"+name,name])]) {
    const option=document.createElement("option");option.value=value;option.textContent=label;select.appendChild(option);
  }
  select.value=suggested.folder;folderLabel.append(folderText,select);
  const nameLabel=document.createElement("label"),nameText=document.createElement("span"),name=document.createElement("input");
  nameText.textContent=exText("Dateiname","Filename");name.value=suggested.name;name.required=true;nameLabel.append(nameText,name);
  const actions=document.createElement("div");actions.className="actions";
  const submit=document.createElement("button");submit.type="submit";submit.textContent=exText("Übertragen","Transfer");
  const cancel=document.createElement("button");cancel.type="button";cancel.className="ghost";cancel.textContent=exText("Abbrechen","Cancel");
  actions.append(submit,cancel);form.append(title,folderLabel,nameLabel,actions);dialog.appendChild(form);document.body.appendChild(dialog);
  return new Promise(resolve=>{
    const finish=value=>{dialog.close();dialog.remove();resolve(value);};
    const close=document.createElement("button");close.type="button";close.className="ghost icon-button dialog-close";close.textContent="×";
    close.title=exText("Schließen","Close");close.setAttribute("aria-label",close.title);close.addEventListener("click",()=>finish(null));dialog.appendChild(close);
    cancel.addEventListener("click",()=>finish(null));dialog.addEventListener("cancel",event=>{event.preventDefault();finish(null);});
    form.addEventListener("submit",event=>{
      event.preventDefault();const filename=name.value.trim();
      if(!select.value || !filename || /[\\/]/.test(filename) || filename === "." || filename === "..")return;
      finish(`${select.value === "/" ? "" : select.value}/${filename}`);
    });
    dialog.showModal();(suggested.folder ? submit : select).focus();
  });
}
function exChooseInventoryTarget(suggested) {
  const dialog=document.createElement("dialog");dialog.className="profile-dialog";
  const form=document.createElement("form"),title=document.createElement("h2");title.textContent=exText("Im lokalen Inventar speichern","Save to local inventory");
  const folderLabel=document.createElement("label"),folderTitle=document.createElement("span");folderTitle.textContent=exText("Zielordner im Inventar","Destination folder in inventory");
  const row=document.createElement("div");row.className="inventory-destination-row";
  const folder=document.createElement("input");folder.readOnly=true;folder.value=suggested.slice(0,suggested.lastIndexOf("/"))||"/";
  const browse=document.createElement("button");browse.type="button";browse.className="primary icon-button";browse.title=exText("Ordner auswählen","Choose folder");browse.setAttribute("aria-label",browse.title);
  const icon=document.createElement("i");icon.className="icon-folder-open button-icon";icon.setAttribute("aria-hidden","true");browse.append(icon);row.append(folder,browse);folderLabel.append(folderTitle,row);
  const nameLabel=document.createElement("label"),nameTitle=document.createElement("span"),name=document.createElement("input");nameTitle.textContent=exText("Dateiname","Filename");name.value=suggested.slice(suggested.lastIndexOf("/")+1);name.readOnly=true;nameLabel.append(nameTitle,name);
  const feedback=document.createElement("p");feedback.setAttribute("role","alert");
  const save=document.createElement("button");save.type="submit";save.className="success";save.textContent=exText("Speichern","Save");
  form.append(title,folderLabel,nameLabel,feedback,save);dialog.append(form);document.body.append(dialog);
  return new Promise(resolve=>{
    const finish=value=>{dialog.close();dialog.remove();resolve(value);};
    const close=document.createElement("button");close.type="button";close.className="ghost icon-button dialog-close";close.textContent="×";close.setAttribute("aria-label",exText("Schließen","Close"));close.addEventListener("click",()=>finish(null));dialog.append(close);
    dialog.addEventListener("cancel",event=>{event.preventDefault();finish(null);});
    browse.addEventListener("click",async()=>{
      browse.disabled=true;save.disabled=true;feedback.textContent="";
      try {const result=await api("/api/explorer/inventory-destination/pick",{method:"POST",body:{}});if(dialog.open&&result.path)folder.value=result.path;}
      catch(error){if(dialog.open)feedback.textContent=exError(error);}
      finally{browse.disabled=false;save.disabled=false;}
    });
    form.addEventListener("submit",event=>{
      event.preventDefault();const filename=name.value.trim();
      if(!filename||/[\\/]/.test(filename)||filename==="."||filename===".."){feedback.textContent=exText("Bitte einen gültigen Dateinamen eingeben.","Enter a valid filename.");return;}
      finish(`${folder.value.replace(/\/$/,"")}/${filename}`);
    });dialog.showModal();
  });
}
async function exMutation(action) {
  if(ex.busy || ex.editing)return;
  if(action === "mkdir" && ex.side === "device")return;
  let fields={};
  if(["new-file","mkdir"].includes(action)) {
    const name=prompt(exText(action === "mkdir" ? "Name des neuen Ordners:" : "Name der neuen Datei:",action === "mkdir" ? "New folder name:" : "New filename:"));
    if(!name)return; if(/[\\/]/.test(name)){exStatus(exText("Bitte nur einen Namen eingeben.","Enter a name only."));return;}
    fields.path=`${ex.path.replace(/\/$/,"")}/${name}`;
  } else if(action === "rename") {
    if(!ex.selected)return;const name=prompt(exLabel("rename"),ex.selected.name);if(!name || name === ex.selected.name)return;fields.name=name;
  } else if(action === "delete") {
    if(!ex.selected||exProtectedFolder())return;
    if(ex.side==="local"&&ex.selected.kind==="mashplan"&&!ex.localFolder)return exDeletePlan(ex.selected,false);
    if(!confirm(exText(`„${ex.selected.path}“ auf ${ex.side === "device" ? exDeviceName() : "Inventar"} löschen?`,`Delete "${ex.selected.path}" from ${ex.side === "device" ? exDeviceName() : "Inventory"}?`)))return;
  } else if(action === "transfer") {
    if(ex.selected?.type !== "file")return;
    let target;
    const context=exContext(),source=ex.selected.path,side=ex.side;
    if(side === "local")target=await exChooseDeviceTarget(ex.selected);
    else {
      const suggested=["/config.txt","/log_cfg.json"].includes(source) ? "/config"+source : source;
      target=await exChooseInventoryTarget(suggested);
    }
    if(!target || context !== exContext() || side !== ex.side || source !== ex.selected?.path)return;
    fields={target,overwrite:side === "local"};
  }
  if(await exAction(action,fields))await loadExplorer();
}
async function exUpload(event) {
  const file=event.target.files[0];event.target.value="";if(!file || ex.busy || !explorerCanLeave())return;
  const path=`${ex.path.replace(/\/$/,"")}/${file.name}`,context=exContext(),side=ex.side;
  const bytes=new Uint8Array(await file.arrayBuffer());let binary="";
  for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  if(context !== exContext() || side !== ex.side || path !== `${ex.path.replace(/\/$/,"")}/${file.name}`)return;
  if(await exAction("upload",{path,content:btoa(binary),overwrite:true}))await loadExplorer();
}
async function exCopy() {
  if(ex.preview?.text == null)return;
  try {await copyPlainTextToClipboard(ex.editing ? exNode("Content").value : ex.preview.text);exStatus(exText("Inhalt kopiert.","Contents copied."));}
  catch(error){exStatus(exError(error));}
}
async function exSave(){
  if(!ex.editing || !ex.dirty)return;
  const selected=ex.selected;
  if(await exAction("save",{text:exNode("Content").value,sha256:ex.preview.sha256}))await exSelect(selected);
}
function translateExplorer() {
  if(!exNode("Files"))return;
  exNode("Columns").replaceChildren();
  for(const [key,de,en] of [["name","Name","Name"],["created_at","Erstellt","Created"],["mtime","Aktualisiert","Updated"],["type","Typ","Type"],["size","Größe","Size"]]) {
    const th=document.createElement("th"),button=document.createElement("button");button.type="button";button.className="table-sort";button.textContent=exText(de,en);
    button.addEventListener("click",()=>{ex.descending=ex.sort === key ? !ex.descending : false;ex.sort=key;exFiles();});th.appendChild(button);exNode("Columns").appendChild(th);
  }

  exRender();
}
function initExplorer() {
  const attach=(container,actions)=>actions.forEach(([action,handler])=>exNode(container).appendChild(exIcon(action,handler)));
  attach("Commands",[["newFile",()=>exMutation("new-file")],["newFolder",()=>exMutation("mkdir")],["upload",()=>exNode("UploadInput").click()],
    ["download",()=>{if(ex.selected?.type === "file"){const a=document.createElement("a");a.href=`/api/explorer/download?${exQuery({path:ex.selected.path})}`;a.download=ex.selected.name;a.click();}}],
    ["transfer",()=>exMutation("transfer")],["rename",()=>exMutation("rename")],["delete",()=>exMutation("delete")],["refresh",loadExplorer]]);
  attach("ViewCommands",[["preview",()=>{ex.showPreview=!ex.showPreview;exPreview();exButtons();}]]);
  attach("EditCommands",[["copy",exCopy],["edit",()=>{if(ex.preview?.editable){ex.editing=true;ex.showPreview=true;exPreview();exButtons();exNode("Content").focus();}}],
    ["save",exSave],["cancel",()=>{if(explorerCanLeave()){exPreview();exButtons();}}]]);
  exNode("UploadInput").addEventListener("change",event=>exUpload(event).catch(error=>exStatus(exError(error))));
  exNode("Content").addEventListener("input",()=>{if(ex.editing){ex.dirty=exNode("Content").value !== ex.preview.text;exButtons();}});
  window.addEventListener("beforeunload",event=>{if(ex.dirty || ex.busy){event.preventDefault();event.returnValue="";}});
  document.addEventListener("click",event=>{if(ex.quickMenu && !event.target.closest(".explorer-quick-row"))exCloseQuickMenu();});
  exNode('FileTable').addEventListener('keydown',event=>{
    if(event.key!=='Delete'||event.repeat||event.ctrlKey||event.altKey||event.metaKey||event.shiftKey||['INPUT','TEXTAREA','SELECT'].includes(event.target?.tagName)||event.target?.isContentEditable)return;
    if(ex.busy||ex.loading||ex.editing||!ex.selected||exProtectedFolder())return;
    event.preventDefault();exMutation('delete');
  });
  document.addEventListener("keydown",event=>{if(event.key === "Escape" && ex.quickMenu){event.preventDefault();exCloseQuickMenu(true);}});
  syncExplorerContext();translateExplorer();
}

// Shared action symbols throughout the app; event handlers remain unchanged.
function applyAppActionIcons() {
  const actions={backupRenameBtn:"rename",backupDeleteBtn:"delete",backupInfoBtn:"info",
    serialCopyBtn:"copy",telegrafCopyBtn:"copy",serialClearBtn:"delete",telegrafClearBtn:"delete",
    restoreFilePickBtn:"root",choosePackageDir:"root",telegrafTemplatesPickBtn:"root",telegrafBinaryPickBtn:"newFile"};
  for(const prefix of ["firmwareStatus","backupRestoreStatus","testRunnerStatus","migrationStatus"]){actions[prefix+"CopyBtn"]="copy";actions[prefix+"ClearBtn"]="delete";}
  for(const [id,action] of Object.entries(actions)) {
    const button=document.getElementById(id);if(!button)continue;
    const label=button.title || button.getAttribute("aria-label") || button.textContent.trim() || exLabel(action);
    const icon=document.createElement("i");icon.className=`icon-${EX_ICONS[action]} button-icon`;icon.setAttribute("aria-hidden","true");
    button.replaceChildren(icon);button.title=label;button.setAttribute("aria-label",label);
    button.dataset.iconTip=label;button.classList.add("app-icon-button");
  }
}
