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
  const button=document.createElement("button");button.type="button";button.className="ghost explorer-icon";
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
function exQuery(extra={}) { return new URLSearchParams({side:ex.side,path:ex.path,view:ex.view,base_url:managementDeviceUrl(),local_folder:ex.side === "local" ? ex.localFolder : "",...extra}); }
function exValid(token,context) {return token === ex.request && context === exContext();}
function exButtons() {
  const file=ex.selected?.type === "file";
  document.querySelectorAll("[data-ex-action]").forEach(button=>{
    const action=button.dataset.exAction;
    let disabled=ex.busy || ex.loading;
    if(["copy","edit","download","transfer"].includes(action))disabled ||= !file;
    if(["rename","delete"].includes(action))disabled ||= !ex.selected;
    if(action === "copy")disabled ||= ex.preview?.text == null;
    if(action === "edit")disabled ||= !ex.preview?.editable || ex.editing;
    if(action === "save")disabled ||= !ex.editing || !ex.dirty;
    if(action === "cancel")disabled ||= !ex.editing;
    if(ex.editing && !["save","cancel","copy"].includes(action))disabled=true;
    button.disabled=disabled;
    if(action === "openFolder")button.hidden=ex.side !== "local";
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
  const nav=exNode("Sidebar");nav.replaceChildren();
  for(const side of ["device","local"]) {
    const heading=document.createElement("h3");heading.textContent=side === "device" ? exDeviceName() : exText("Lokales Inventar","Local inventory");nav.appendChild(heading);
    const shortcuts=[["/","all",exText("Alle Dateien","All files")],["/Rezepte","all",exText("Maischepläne","Mash plans")],
      ["/Fermenter","all",exText("Fermenterpläne","Fermenter plans")],["/Profile","all",exText("Profile","Profiles")],
      [side === "local" ? "/config" : "/","config",exText("Konfiguration","Configuration")],["/","logs",exText("Logs","Logs")]];
    for(const [path,view,label] of shortcuts) {
      const button=document.createElement("button");button.type="button";button.className="ghost";button.textContent=label;
      if(ex.side === side && ex.path === path && ex.view === view && !(side === "local" && ex.localFolder))button.setAttribute("aria-current","location");
      button.addEventListener("click",()=>{if(!explorerCanLeave())return;if(side === "local")ex.localFolder="";syncExplorerContext();exNavigate(side,path,view);});nav.appendChild(button);
    }
  }
  const heading=document.createElement("h3");heading.className="explorer-quick-heading";
  const title=document.createElement("span");title.textContent=exText("Schnellzugriff","Quick access");
  const add=document.createElement("button");add.type="button";add.className="ghost explorer-quick-add";add.textContent="+";
  add.title=exText("Ordner hinzufügen","Add folder");add.setAttribute("aria-label",add.title);add.addEventListener("click",exOpenFolder);
  heading.append(title,add);nav.appendChild(heading);
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
    row.append(button,more,menu);nav.appendChild(row);
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
  } catch(error){exStatus(String(error));}
  finally {ex.busy=false;exButtons();}
  if(ex.side === "local" && !ex.localFolder)await loadExplorer();
}

async function exOpenFolder() {
  if(!explorerCanLeave())return;
  const context=exContext();ex.busy=true;exButtons();
  let result;
  try {result=await api("/api/explorer/folder/pick",{method:"POST",body:{}});}
  catch(error){exStatus(String(error));}
  finally {ex.busy=false;exButtons();}
  if(!result?.token || context !== exContext())return;
  appConfig.explorer_folders=result.folders || [...(appConfig.explorer_folders || []),result];ex.localFolder=result.token;syncExplorerContext();await exNavigate("local","/");
}
function exDate(value) {
  if(!value)return "—";
  const date=new Date(typeof value === "number" || /^\d+$/.test(String(value)) ? Number(value)*1000 : value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString(currentLang);
}
function exFiles() {
  const body=exNode("Files");body.replaceChildren();
  const rows=[...ex.files].sort((a,b)=>{
    if(a.type !== b.type)return a.type === "dir" ? -1 : 1;
    let result=ex.sort === "size" ? a.size-b.size : String(a[ex.sort] || "").localeCompare(String(b[ex.sort] || ""),currentLang,{numeric:true});
    return ex.descending ? -result : result;
  });
  if(ex.path !== "/") {
    const row=document.createElement("tr"),cell=document.createElement("td"),button=document.createElement("button");
    cell.colSpan=4;button.type="button";button.className="ghost explorer-filename";
    button.textContent="..";button.title=exText("Übergeordneter Ordner","Parent folder");button.setAttribute("aria-label",button.title);
    button.addEventListener("click",()=>exNavigate(ex.side,ex.path.slice(0,ex.path.lastIndexOf("/")) || "/"));
    cell.appendChild(button);row.appendChild(cell);body.appendChild(row);
  }
  const versions=new Map(), grouped=new Set();
  if(ex.side === "local") {
    const names=new Map(rows.filter(file=>file.type === "file").map(file=>[file.name,file]));
    for(const file of rows) {
      const info=file.type === "file" ? versionInfoForName(file.name) : null;
      if(info && names.has(info.baseName)) {
        if(!versions.has(info.baseName))versions.set(info.baseName,[]);
        versions.get(info.baseName).push(file);grouped.add(file.name);
      }
    }
  }
  const visible=[];
  for(const file of rows) {
    if(grouped.has(file.name))continue;
    const children=(versions.get(file.name) || []).sort((a,b)=>versionInfoForName(a.name).index-versionInfoForName(b.name).index);
    const key=`${exContext()}|${ex.side}|${file.path}`;
    visible.push({file,children,key});
    if(ex.expandedVersions.has(key))for(const child of children)visible.push({file:child,version:versionInfoForName(child.name).index,children:[]});
  }
  for(const {file,children,key,version} of visible) {
    const row=document.createElement("tr");row.classList.toggle("selected",ex.selected?.path === file.path);row.setAttribute("aria-selected",String(ex.selected?.path === file.path));
    const name=document.createElement("td"), button=document.createElement("button");button.type="button";button.className="ghost explorer-filename";
    const icon=document.createElement("i");icon.className=`icon-${file.type === "dir" ? "folder" : "file-text2"} button-icon`;icon.setAttribute("aria-hidden","true");
    const label=document.createElement("span");label.textContent=file.name;button.append(icon,label);
    button.addEventListener("click",()=>exSelect(file));
    button.addEventListener("dblclick",()=>{if(file.type === "dir")exNavigate(ex.side,file.path,"all");});
    button.addEventListener("keydown",event=>{if(event.key === "Enter" && file.type === "dir"){event.preventDefault();exNavigate(ex.side,file.path,"all");}});
    if(children.length) {
      const toggle=document.createElement("button");toggle.type="button";toggle.className="ghost explorer-version-toggle";
      const expanded=ex.expandedVersions.has(key);toggle.textContent=expanded ? "−" : "+";
      toggle.setAttribute("aria-expanded",String(expanded));toggle.setAttribute("aria-label",exText(`Versionen von ${file.name}`,`Versions of ${file.name}`));
      toggle.addEventListener("click",()=>{
        if(ex.busy || ex.loading)return;
        if(expanded) {
          if(children.some(child=>child.path === ex.selected?.path)) {
            if(!explorerCanLeave())return;
            ex.request++;ex.selected=null;ex.preview=null;ex.previewLoading=false;exPreview();exButtons();
          }
          ex.expandedVersions.delete(key);
        } else ex.expandedVersions.add(key);
        exFiles();
      });
      name.appendChild(toggle);
    }
    if(version !== undefined) {
      row.classList.toggle("explorer-version-row",true);
      const badge=document.createElement("span");badge.className="explorer-version-label";badge.textContent=`Version ${version}`;
      button.replaceChildren(badge,label);
    }
    name.appendChild(button);row.appendChild(name);
    for(const value of [exDate(file.mtime),file.type === "dir" ? exText("Ordner","Folder") : (file.name.split(".").length>1 ? file.name.split(".").pop().toUpperCase() : exText("Datei","File")),file.type === "dir" ? "—" : `${file.size.toLocaleString(currentLang)} B`]) {
      const td=document.createElement("td");td.textContent=value;row.appendChild(td);
    }
    body.appendChild(row);
  }
}
function exPreview() {
  exNode("PreviewPane").hidden=!ex.showPreview;
  exNode("Content").readOnly=!ex.editing;
  if(!ex.editing)exNode("Content").value=ex.preview?.text ?? "";
  exNode("PreviewTitle").textContent=ex.editing ? exText("Bearbeiten","Edit") : exText("Vorschau","Preview");
  exNode("Content").placeholder=ex.previewLoading ? exText("Vorschau wird geladen …","Loading preview …") : "";
  exNode("Content").setAttribute("aria-busy",String(ex.previewLoading));
  exNode("").classList.toggle("without-preview",!ex.showPreview);
}
function exRender(){exSidebar();exFiles();exPreview();exButtons();}
let exReadQueue = Promise.resolve();
function exReadApi(url, token, context) {
  const request = exReadQueue.catch(() => {}).then(() => exValid(token, context) ? api(url) : null);
  exReadQueue = request;
  return request;
}
async function loadExplorer() {
  syncExplorerContext();if(ex.busy)return;
  if(!explorerCanLeave())return;
  const token=++ex.request,context=exContext();ex.selected=null;ex.preview=null;ex.previewLoading=false;ex.previewError="";ex.files=[];ex.loading=true;exRender();
  exStatus(exText("Dateien werden geladen …","Loading files …"));
  try {
    const result=await exReadApi(`/api/explorer/list?${exQuery()}`,token,context);
    if(!exValid(token,context))return;
    if(ex.side === "device")recordExplorerDeviceResponse();
    ex.files=result.files;exStatus(`${result.files.length} ${exText("Einträge","items")}`);
  } catch(error){if(exValid(token,context))exStatus(String(error));}
  finally{if(exValid(token,context)){ex.loading=false;exRender();}}
}
async function exNavigate(side,path,view="all") {
  if(!explorerCanLeave())return;
  ex.side=side;ex.path=path;ex.view=view;
  await loadExplorer();
}
async function exSelect(file) {
  if(!explorerCanLeave())return;
  const token=++ex.request,context=exContext();ex.selected=file;ex.preview=null;ex.previewLoading=false;ex.previewError="";ex.previewLoading=file.type === "file";exFiles();exPreview();exButtons();
  if(file.type === "dir")return;
  exStatus(exText("Vorschau wird geladen …","Loading preview …"));
  try {
    const result=await exReadApi(`/api/explorer/preview?${exQuery({path:file.path})}`,token,context);
    if(!exValid(token,context))return;
    if(ex.side === "device")recordExplorerDeviceResponse();
    ex.preview=result;exStatus(result.reason === "large" ? exText("Datei zu groß für die Vorschau. Bitte herunterladen.","File too large for preview. Please download it.") : "");
  } catch(error){if(exValid(token,context)){ex.previewError=exText("Vorschau konnte nicht geladen werden: ","Could not load preview: ")+String(error);exStatus(String(error));}}
  finally{if(exValid(token,context)){ex.previewLoading=false;exPreview();exButtons();}}
}
async function exAction(action,fields={}) {
  if(ex.busy)return false;
  const context=exContext();ex.busy=true;exButtons();
  try {
    await api("/api/explorer/action",{method:"POST",body:{side:ex.side,path:ex.selected?.path || ex.path,base_url:managementDeviceUrl(),maintenance:managementServiceActive(),local_folder:ex.side === "local" ? ex.localFolder : "",action,...fields}});
    if(context !== exContext())return false;
    if(ex.side === "device" || action === "transfer")recordExplorerDeviceResponse();
    ex.dirty=false;ex.editing=false;exStatus(exText("Aktion abgeschlossen.","Action completed."));return true;
  } catch(error){if(context === exContext())exStatus(String(error));return false;}
  finally{ex.busy=false;exButtons();}
}
function exDeviceTarget(file) {
  const info=versionInfoForName(file.name);
  const configNames=["config.txt","log_cfg.json"];
  const name=info && (configNames.includes(info.baseName) || ex.files.some(row=>row.type === "file" && row.name === info.baseName)) ? info.baseName : file.name;
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
    cancel.addEventListener("click",()=>finish(null));dialog.addEventListener("cancel",event=>{event.preventDefault();finish(null);});
    form.addEventListener("submit",event=>{
      event.preventDefault();const filename=name.value.trim();
      if(!select.value || !filename || /[\\/]/.test(filename) || filename === "." || filename === "..")return;
      finish(`${select.value === "/" ? "" : select.value}/${filename}`);
    });
    dialog.showModal();(suggested.folder ? submit : select).focus();
  });
}
async function exMutation(action) {
  if(ex.busy || ex.editing)return;
  let fields={};
  if(["new-file","mkdir"].includes(action)) {
    const name=prompt(exText(action === "mkdir" ? "Name des neuen Ordners:" : "Name der neuen Datei:",action === "mkdir" ? "New folder name:" : "New filename:"));
    if(!name)return; if(/[\\/]/.test(name)){exStatus(exText("Bitte nur einen Namen eingeben.","Enter a name only."));return;}
    fields.path=`${ex.path.replace(/\/$/,"")}/${name}`;
  } else if(action === "rename") {
    if(!ex.selected)return;const name=prompt(exLabel("rename"),ex.selected.name);if(!name || name === ex.selected.name)return;fields.name=name;
  } else if(action === "delete") {
    if(!ex.selected || !confirm(exText(`„${ex.selected.path}“ auf ${ex.side === "device" ? exDeviceName() : "Lokales Inventar"} löschen?`,`Delete "${ex.selected.path}" from ${ex.side === "device" ? exDeviceName() : "Local inventory"}?`)))return;
  } else if(action === "transfer") {
    if(ex.selected?.type !== "file")return;
    let target;
    const context=exContext(),source=ex.selected.path,side=ex.side;
    if(side === "local")target=await exChooseDeviceTarget(ex.selected);
    else {
      const suggested=["/config.txt","/log_cfg.json"].includes(source) ? "/config"+source : source;
      target=prompt(exLabel("transfer")+exText(" – Zielpfad:"," – destination path:"),suggested);
    }
    if(!target || context !== exContext() || side !== ex.side || source !== ex.selected?.path)return;
    fields={target,overwrite:true};
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
  catch(error){exStatus(String(error));}
}
async function exSave(){
  if(!ex.editing || !ex.dirty)return;
  const selected=ex.selected;
  if(await exAction("save",{text:exNode("Content").value,sha256:ex.preview.sha256}))await exSelect(selected);
}
function translateExplorer() {
  if(!exNode("Files"))return;
  exNode("Columns").replaceChildren();
  for(const [key,de,en] of [["name","Name","Name"],["mtime","Änderungsdatum","Modified"],["type","Typ","Type"],["size","Größe","Size"]]) {
    const th=document.createElement("th"),button=document.createElement("button");button.type="button";button.className="ghost";button.textContent=exText(de,en);
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
  exNode("UploadInput").addEventListener("change",event=>exUpload(event).catch(error=>exStatus(String(error))));
  exNode("Content").addEventListener("input",()=>{if(ex.editing){ex.dirty=exNode("Content").value !== ex.preview.text;exButtons();}});
  window.addEventListener("beforeunload",event=>{if(ex.dirty || ex.busy){event.preventDefault();event.returnValue="";}});
  document.addEventListener("click",event=>{if(ex.quickMenu && !event.target.closest(".explorer-quick-row"))exCloseQuickMenu();});
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
