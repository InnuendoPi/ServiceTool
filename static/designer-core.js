/* Pure draft operations; no DOM, network or device execution. */
const PlanDesigner = (() => {
  const clone = value => JSON.parse(JSON.stringify(value));
  const id = () => globalThis.crypto?.randomUUID?.().replaceAll('-', '') ||
    'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random()*16).toString(16));
  const step = (name = '', temperature = 0, duration = 0, auto = true) =>
    ({id:id(), Rast:name, Temperatur:Math.round(temperature), Dauer:duration, autonext:auto, original:{}});
  const create = () => ({schema:1,id:id(),name:'',generation:'1.67+',steps:[],dock:[],misc:{Kochdauer:0,Nachiso:0},source:{type:'Designer'},notices:[],snapshot:null});
  const isPostBoil = s => s.editor?.template==='after'||/^(Nachisomerisierung|Post-boil isomerization)$/i.test(s.Rast.trim());
  function generationFor(snapshot) {
    const version=String(snapshot?.firmware??'').match(/(?:^|[^\d])(\d+)\.(\d+)(?:\.\d+)?/);
    if(!version)return '1.67+';
    return Number(version[1])<1||(Number(version[1])===1&&Number(version[2])<=66)?'1.66':'1.67+';
  }
  function move(value, itemId, target, beforeId = null) {
    if (!['steps','dock'].includes(target) || itemId === beforeId) return clone(value);
    const result=clone(value), from=['steps','dock'].find(key=>result[key].some(s=>s.id===itemId));
    if (!from) return result;
    const [item]=result[from].splice(result[from].findIndex(s=>s.id===itemId),1);
    const at=result[target].findIndex(s=>s.id===beforeId);
    result[target].splice(at<0 ? result[target].length : at,0,item);
    return result;
  }
  function moveMany(value, ids, target, beforeId=null) {
    const result=clone(value),chosen=new Set(ids);
    if(!['steps','dock'].includes(target)||chosen.has(beforeId))return result;
    const from=['steps','dock'].find(key=>result[key].some(s=>chosen.has(s.id)));
    if(!from)return result;
    const copying=from==='dock'&&target==='steps';
    const items=result[from].filter(s=>chosen.has(s.id)).map(s=>copying?{...s,id:id()}:s);
    if(!copying)result[from]=result[from].filter(s=>!chosen.has(s.id));
    const at=result[target].findIndex(s=>s.id===beforeId);
    result[target].splice(at<0?result[target].length:at,0,...items);
    return result;
  }
  function resources(snapshot) {
    if (!snapshot) return [];
    const result=[],identity=snapshot.profile_id||'local';
    for (const [index,a] of (snapshot.actors||[]).entries()) if (a.NAME)
      result.push({kind:'actor',name:a.NAME,command:a.NAME,key:`${identity}:actor:${index}`,pwm:a.PWMSW});
    for (const [index,k] of (snapshot.kettles||[]).entries()) if(index<3 && Number(k.enabled)>0 && k.name)
      result.push({kind:'kettle',name:k.name,command:['MAISCHE','SUD','HLT'][index]||k.name,key:`${identity}:kettle:${index}`,slot:index,pins:{cooler:k.pinw,heater:k.piny}});
    for (const name of Object.keys(snapshot.profiles||{}))
      result.push({kind:'profile',name:name.replace(/\.json$/i,''),key:`${identity}:profile:${name}`});
    for (const worker of snapshot.remote?.workers||[]) {
      const host=worker.host||worker.name||worker.id;
      if (!host || worker.enabled===false) continue;
      for (const name of Object.keys(worker.profiles||{})) result.push({kind:'profile',name:name.replace(/\.json$/i,''),label:`${host}/${name.replace(/\.json$/i,'')}`,host,remote:true,key:`${worker.id}:profile:${name}`,cached:worker.profilesFresh!==true});
      for (const sensor of worker.sensors||[]) result.push({kind:'sensor',name:`${host}/${sensor.NAME||sensor.name||sensor.slot}`,remote:true,key:`${worker.id}:sensor:${sensor.slot??sensor.NAME??sensor.name}`,cached:worker.sensorsFresh!==true});
      for (const a of worker.actors||[]) result.push({kind:'actor',name:`${host}/${a.name}`,command:`${host}/${a.name}`,key:`${worker.id}:actor:${a.slot}`,remote:true,cached:worker.cached_resources?.includes("actors")===true});
      for (const k of worker.kettles||[]) if(Number(k.slot)>=0 && Number(k.slot)<3 && (k.enabled===undefined || Number(k.enabled)>0)) result.push({kind:'kettle',name:`${host}/${k.name}`,command:['MAISCHE','SUD','HLT'][k.slot]||k.name,assigned:!!k.selected,key:`${worker.id}:kettle:${k.slot}`,slot:k.slot,remote:true,cached:worker.cached_resources?.includes("kettles")===true});
    }
    for(const kettle of result.filter(r=>r.kind==='kettle'&&!r.remote))kettle.assigned=!result.some(r=>r.kind==='kettle'&&r.remote&&r.assigned&&r.slot===kettle.slot);
    return result;
  }
  const roleAliases=[['MAISCHE','IDS'],['SUD','MLT'],['HLT','NACHGUSS']];
  function commandAction(step, snapshot) {
    const match=step.Rast.trim().match(/^([^:]+):([^:]*?)(:.*|!)?$/);
    if(!match)return null;
    const command=match[1].trim(),argument=match[2].trim(),suffix=match[3]||'';
    const all=resources(snapshot),slash=command.indexOf('/');
    const host=slash>=0?command.slice(0,slash):'',head=slash>=0?command.slice(slash+1):command,upper=head.toUpperCase();
    if(suffix.startsWith(':')&&host&&!(host.toLowerCase()==='master'&&Number(snapshot?.multidevice?.mode)===1))return null;
    const profile=upper.endsWith('PROFIL'),threshold=upper.endsWith('THRESOUT');
    const base=profile?upper.slice(0,-6):threshold?upper.slice(0,-8):upper;
    let slot=roleAliases.findIndex(names=>names.includes(base));
    if(slot<0)slot=(snapshot?.kettles||[]).findIndex(k=>k.name?.toUpperCase()===base);
    if(upper==='COOLER'||upper==='HEATER')slot=3;
    if(slot>=0 && (!host||profile)) {
      const candidates=all.filter(r=>r.kind==='kettle'&&r.slot===slot);
      const selected=candidates.find(r=>host?r.remote&&r.name.split('/')[0].toUpperCase()===host.toUpperCase():r.remote&&r.assigned);
      const bound=candidates.find(r=>r.key===step.resource);
      const resource=bound||selected||(!host?candidates.find(r=>!r.remote):null);
      return {kind:profile?'profile':'kettle',command,argument,suffix,resource,slot,
        operation:profile?'profile':threshold?'threshold':upper==='COOLER'?'cooler':upper==='HEATER'?'heater':'output'};
    }
    if(profile||threshold)return null;
    let resource=all.find(r=>r.kind==='actor'&&r.command.toUpperCase()===command.toUpperCase());
    if(!resource&&host.toLowerCase()==='master'&&Number(snapshot?.multidevice?.mode)===1)
      resource=all.find(r=>r.kind==='actor'&&!r.remote&&r.name.toUpperCase()===upper);
    if(!resource&&snapshot)return null;
    if(!resource&&step.resourceKind!=='actor'&&!/^(ON|OFF|\d{1,3})$/i.test(argument))return null;
    return {kind:'actor',command,argument:argument.toUpperCase(),suffix,resource,
      pwm:resource?!resource.remote&&(resource.pwm===true||resource.pwm===1):!host};
  }
  function normalizeCommand(step) {
    const match=step.Rast.trim().match(/^([^:]+):([^:]*?)(:.*|!)?$/);
    if(!match)return false;
    const command=match[1].trim(),argument=match[2].trim();
    if(!command||!argument||(!/^(ON|OFF|\d{1,3})$/i.test(argument)&&!command.toUpperCase().endsWith('PROFIL')))return false;
    const name=command+':'+argument+(match[3]||'');
    const changed=name!==step.Rast;step.Rast=name;
    if(Object.hasOwn(step,'command'))step.command=command;
    if(Object.hasOwn(step,'argument'))step.argument=argument;
    return changed;
  }
  function actorAction(step,snapshot) {
    const action=commandAction(step,snapshot);return action?.kind==='actor'?action:null;
  }
  function kettleCommand(resource, operation='output') {
    if(operation==='cooler')return 'COOLER';
    if(operation==='heater')return 'HEATER';
    const base=roleAliases[resource.slot]?.[0];
    if(!base)return '';
    if(operation==='profile')return (resource.remote?resource.name.split('/')[0]+'/':'')+base+'PROFIL';
    if(operation==='threshold')return resource.slot<3&&!resource.remote?base+'THRESOUT':'';
    return base;
  }
  function review(value, snapshot=value.snapshot) {
    const notes=[];
    const add=(code,s=null,detail='')=>notes.push({code,step:s?.id||null,detail});
    if(value.steps.length>30)add('step_limit');
    if(!snapshot)add('snapshot_missing');
    else {
      if(Date.now()/1000-(snapshot.captured_at||0)>86400)add('snapshot_old');
      if(!snapshot.complete)add('snapshot_partial');
      if(snapshot.multidevice?.mode && !snapshot.remote_complete)add('remote_unknown');
    }
    const known=resources(snapshot);
    for(const s of value.steps) {
      if(s.Rast.trim().length<2)add('step_name',s);
      if(isPostBoil(s)&&(Number(s.Temperatur)!==0||!Number.isFinite(Number(s.Dauer))||Number(s.Dauer)<=0))add('post_boil_values',s);
      if(!Number.isFinite(Number(s.Dauer))||s.Dauer<0||s.Dauer>71582)add('duration',s);
      if(!Number.isFinite(Number(s.Temperatur))||s.Temperatur<0||s.Temperatur>255)add('temperature',s);
      if(!Number.isInteger(Number(s.Dauer))||!Number.isInteger(Number(s.Temperatur)))add('rounding',s);
      if(s.autonext===false)add('manual',s);
      if(s.Rast.includes(':')) {
        const [command,...args]=s.Rast.replace(/!$/,'').split(':');
        const parsed=commandAction(s,snapshot),resource=parsed?.resource;
        const argument=parsed?.argument??args.join(':').trim();
        if(!argument)add('argument',s);
        if(command.includes('/') && value.generation==='1.66')add('generation',s);
        if(snapshot && !resource && !/^(MAISCHE|IDS|SUD|MLT|HLT|NACHGUSS)(PROFIL|THRESOUT)?$/i.test(command))add('resource_unknown',s,command);
        if(parsed?.kind==='profile'&&resource?.remote){
          const worker=(snapshot.remote?.workers||[]).find(w=>(w.host||w.name||w.id)===resource.name.split('/')[0]);
          if(!worker?.profiles || !Object.hasOwn(worker.profiles,argument+'.json'))add('remote_profile_unknown',s,argument);
          if(!argument||new TextEncoder().encode(argument).length>15||argument.includes(':'))add('remote_profile_argument',s);
          if(resource.assigned===false)add('role_unassigned',s);
        }
        if(/PROFIL$/i.test(command) && !resource?.remote && snapshot?.complete && !known.some(r=>r.kind==='profile' && r.name===argument))add('profile_unknown',s,argument);
        if(resource?.kind==='actor' && argument && !/^(ON|OFF|\d+(\.\d+)?)$/i.test(argument))add('actor_argument',s);
        if(/THRESOUT$/i.test(command))add('persistent',s);
        if(parsed?.kind==='actor' && /^\d+$/.test(argument) && (!parsed.pwm||Number(argument)>100))add('actor_argument',s);
        if(resource?.remote && parsed?.kind==='kettle'){
          const power=/^(ON|OFF)$/i.test(argument)?(argument.toUpperCase()==='ON'?100:0):/^\d+$/.test(argument)?Number(argument):NaN;
          if(parsed.operation==='threshold'||parsed.slot===0||Number(s.Dauer)!==0||!Number.isFinite(power)||power<0||power>100||(power>0&&(!Number.isFinite(Number(s.Temperatur))||Number(s.Temperatur)<=0.1||Number(s.Temperatur)>110)))add('remote_command',s);
        }
      }
      if(s.resource && known.find(r=>r.key===s.resource)?.assigned===false)add('role_unassigned',s);
      if(s.resource && snapshot && !known.some(r=>r.key===s.resource))add('resource_changed',s);
    }
    for(const code of value.notices||[])add(code);
    const balance=boilBalance(value);
    if(balance&&Math.abs(balance.difference)>0.001)add('boil_duration_difference',null,`${balance.planned} min / ${balance.actual} min`);
    return notes;
  }
  function boilBalance(value) {
    const planned=Number(value.misc?.Kochdauer);
    if(!Number.isFinite(planned)||planned<=0)return null;
    const normal=value.steps.filter(s=>!commandAction(s,value.snapshot)&&!commandAction(s,null));
    // The final hot phase excludes earlier decoction boils and subsequent cooling.
    let phase=[],last=[];
    for(const s of normal){
      if(Number(s.Temperatur)>=90&&!/nachisomer|whirlpool/i.test(s.Rast)){phase.push(s);}
      else {if(phase.length)last=phase;phase=[];}
    }
    if(phase.length)last=phase;
    if(!last.some(s=>s.editor?.type==='boil'||s.editor?.type==='hop'||Number.isFinite(s.original?.elapsed)||/^(kochen|würzekochen|boil(?:ing)?)(?:\b|\s)/i.test(s.Rast.trim())))return null;
    if(last.some(s=>!Number.isFinite(Number(s.Dauer))||Number(s.Dauer)<0))return null;
    const actual=last.reduce((sum,s)=>sum+Number(s.Dauer),0);
    return {planned,actual,difference:actual-planned,steps:last.map(s=>s.id)};
  }
  function timing(value) {
    const minutes=v=>v!==null&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;
    const normal=value.steps.filter(s=>!commandAction(s,value.snapshot)&&!commandAction(s,null));
    const sum=steps=>steps.every(s=>minutes(s.Dauer)!==null)?steps.reduce((n,s)=>n+minutes(s.Dauer),0):null;
    const boil=normal.findIndex(s=>Number.isFinite(s.original?.elapsed)||/^(kochen|würzekochen|boil(?:ing)?)(?:\b|\s)/i.test(s.Rast.trim()));
    return {steps:value.steps.length,dock:value.dock.length,manual:value.steps.filter(s=>!s.autonext).length,
      mash:boil<0?null:sum(normal.slice(0,boil)),boil:minutes(value.misc?.Kochdauer),after:minutes(value.misc?.Nachiso),hold:sum(normal)};
  }
  function compare(left,right) {
    const fields=['Rast','Temperatur','Dauer','autonext'];
    const rows=[];
    const special=(s,plan)=>!!s&&!!(commandAction(s,plan.snapshot)||commandAction(s,null));
    let i=0,j=0;
    while(i<left.steps.length||j<right.steps.length) {
      const a=left.steps[i],b=right.steps[j];
      const aSpecial=special(a,left),bSpecial=special(b,right);
      if(!b||(a&&aSpecial&&!bSpecial)) {
        rows.push({left:a,right:undefined,changed:[]});i++;
      }else if(!a||(bSpecial&&!aSpecial)) {
        rows.push({left:undefined,right:b,changed:[]});j++;
      }else {
        rows.push({left:a,right:b,changed:fields.filter(k=>a[k]!==b[k])});i++;j++;
      }
    }
    return rows;
  }
  return {clone,id,step,create,isPostBoil,generationFor,move,moveMany,resources,commandAction,normalizeCommand,kettleCommand,actorAction,review,boilBalance,timing,compare};
})();
if (typeof module !== 'undefined') module.exports=PlanDesigner;
