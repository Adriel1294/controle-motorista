const DB='controleMotoristaDB',VER=2;let db,sel=new Date();const $=x=>document.getElementById(x),num=v=>Number(v)||0,brl=v=>num(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});const nomes=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];const defaults=[250,200,200,200,220,250,300];
function openDB(){return new Promise((ok,no)=>{const r=indexedDB.open(DB,VER);r.onupgradeneeded=e=>{const d=e.target.result;if(!d.objectStoreNames.contains('jornadas'))d.createObjectStore('jornadas',{keyPath:'data'});if(!d.objectStoreNames.contains('config'))d.createObjectStore('config',{keyPath:'id'});if(!d.objectStoreNames.contains('planejamento'))d.createObjectStore('planejamento',{keyPath:'data'})};r.onsuccess=e=>{db=e.target.result;ok()};r.onerror=()=>no(r.error)})}
const st=(s,m='readonly')=>db.transaction(s,m).objectStore(s);function all(s){return new Promise((ok,no)=>{const r=st(s).getAll();r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}function put(s,o){return new Promise((ok,no)=>{const r=st(s,'readwrite').put(o);r.onsuccess=()=>ok();r.onerror=()=>no(r.error)})}function clear(s){return new Promise(ok=>{const r=st(s,'readwrite').clear();r.onsuccess=()=>ok()})}
function del(s,k){return new Promise((ok,no)=>{const r=st(s,'readwrite').delete(k);r.onsuccess=()=>ok();r.onerror=()=>no(r.error)})}
async function cfg(){const a=await all('config');return a.find(x=>x.id==='main')||{id:'main',meta:6500,cap:39.4,tarifa:.9,metas:defaults}}
const key=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');const iso=(y,m,d)=>`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
async function jornadasMes(){const a=await all('jornadas'),k=key(sel);return a.filter(x=>x.data.startsWith(k))}
async function planoMes(){const a=await all('planejamento'),k=key(sel);return a.filter(x=>x.data.startsWith(k))}
function diaRestante(data){const hoje=new Date();hoje.setHours(0,0,0,0);const d=new Date(data+'T12:00');if(key(sel)!==key(hoje))return key(sel)>key(hoje);return d>=hoje}
async function stats(){const c=await cfg(),j=await jornadasMes(),p=await planoMes(),y=sel.getFullYear(),m=sel.getMonth(),dm=new Date(y,m+1,0).getDate();let fat=j.reduce((a,x)=>a+num(x.faturamento),0),horas=j.reduce((a,x)=>a+num(x.horas),0),km=j.reduce((a,x)=>a+num(x.km),0),custos=j.reduce((a,x)=>a+num(x.custoEnergia)+num(x.outros),0),disp=0,metaPrev=0;const map=new Map(p.map(x=>[x.data,x]));for(let d=1;d<=dm;d++){const data=iso(y,m,d),dt=new Date(y,m,d),pl=map.get(data),sim=!pl||pl.disponivel!=='NAO';metaPrev+=num((c.metas||defaults)[dt.getDay()]);if(sim&&diaRestante(data))disp++}return{c,j,fat,horas,km,custos,disp,metaPrev,nec:disp?Math.max(0,c.meta-fat)/disp:0}}

function setupCanvas(id){
 const c=$(id),dpr=window.devicePixelRatio||1,w=Math.max(280,c.clientWidth),h=230;
 c.width=w*dpr;c.height=h*dpr;const x=c.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,w,h);return{x,w,h};
}
function moneyShort(v){return v>=1000?'R$ '+(v/1000).toFixed(1).replace('.',',')+'k':'R$ '+Math.round(v)}
function drawLines(id,labels,series){
 const {x,w,h}=setupCanvas(id),pad={l:48,r:10,t:12,b:30},pw=w-pad.l-pad.r,ph=h-pad.t-pad.b;
 let max=Math.max(1,...series.flatMap(s=>s.values));max*=1.08;
 x.font='10px system-ui';x.fillStyle='#6b7280';x.strokeStyle='#e5e7eb';x.lineWidth=1;
 for(let i=0;i<=4;i++){let y=pad.t+ph*i/4;x.beginPath();x.moveTo(pad.l,y);x.lineTo(w-pad.r,y);x.stroke();let val=max*(1-i/4);x.fillText(moneyShort(val),2,y+3)}
 const step=labels.length>1?pw/(labels.length-1):pw;
 series.forEach((s,si)=>{x.strokeStyle=si===0?'#4472C4':'#ED7D31';x.lineWidth=si===0?2.5:1.5;x.setLineDash(si===0?[]:[6,5]);x.beginPath();s.values.forEach((v,i)=>{let px=pad.l+(labels.length>1?i*step:pw/2),py=pad.t+ph-(v/max)*ph;i?x.lineTo(px,py):x.moveTo(px,py)});x.stroke();x.setLineDash([])});
 let every=Math.max(1,Math.ceil(labels.length/6));labels.forEach((lab,i)=>{if(i%every===0||i===labels.length-1){let px=pad.l+(labels.length>1?i*step:pw/2);x.fillStyle='#6b7280';x.fillText(lab,px-7,h-8)}});
}

function drawGroupedBars(id,labels,a,b){
 const {x,w,h}=setupCanvas(id),pad={l:48,r:10,t:28,b:38},pw=w-pad.l-pad.r,ph=h-pad.t-pad.b;
 let max=Math.max(1,...a,...b)*1.08;
 x.font='10px system-ui';x.fillStyle='#6b7280';x.strokeStyle='#e5e7eb';x.lineWidth=1;
 for(let i=0;i<=4;i++){let y=pad.t+ph*i/4;x.beginPath();x.moveTo(pad.l,y);x.lineTo(w-pad.r,y);x.stroke();x.fillText(moneyShort(max*(1-i/4)),2,y+3)}
 const slot=pw/Math.max(1,labels.length),bw=Math.max(3,Math.min(10,slot*.34));
 a.forEach((v,i)=>{
   let base=pad.l+i*slot+slot/2,py=pad.t+ph-(v/max)*ph;
   x.fillStyle='#4472C4';x.fillRect(base-bw-1,py,bw,pad.t+ph-py);
   let py2=pad.t+ph-(b[i]/max)*ph;x.fillStyle='#ED7D31';x.fillRect(base+1,py2,bw,pad.t+ph-py2);
 });
 // legend
 x.fillStyle='#4472C4';x.fillRect(pad.l,5,10,10);x.fillStyle='#374151';x.fillText('Faturamento',pad.l+15,14);
 x.fillStyle='#ED7D31';x.fillRect(pad.l+92,5,10,10);x.fillStyle='#374151';x.fillText('Meta diária',pad.l+107,14);
 let every=Math.max(1,Math.ceil(labels.length/10));
 labels.forEach((lab,i)=>{if(i%every===0||i===labels.length-1){let px=pad.l+i*slot+slot/2;x.save();x.translate(px,h-8);x.rotate(-Math.PI/4);x.fillStyle='#6b7280';x.fillText(lab,0,0);x.restore()}});
}
function drawBarsLine(id,labels,bars,line){
 const {x,w,h}=setupCanvas(id),pad={l:48,r:10,t:12,b:32},pw=w-pad.l-pad.r,ph=h-pad.t-pad.b,max=Math.max(1,...bars,...line)*1.08;
 x.font='10px system-ui';x.fillStyle='#6b7280';x.strokeStyle='#e5e7eb';
 for(let i=0;i<=4;i++){let y=pad.t+ph*i/4;x.beginPath();x.moveTo(pad.l,y);x.lineTo(w-pad.r,y);x.stroke();x.fillText(moneyShort(max*(1-i/4)),2,y+3)}
 const slot=pw/Math.max(1,labels.length),bw=Math.max(4,slot*.55);
 bars.forEach((v,i)=>{let px=pad.l+i*slot+(slot-bw)/2,py=pad.t+ph-(v/max)*ph;x.fillStyle='#4472C4';x.fillRect(px,py,bw,pad.t+ph-py)});
 x.strokeStyle='#1F4E78';x.lineWidth=2.5;x.beginPath();line.forEach((v,i)=>{let px=pad.l+i*slot+slot/2,py=pad.t+ph-(v/max)*ph;i?x.lineTo(px,py):x.moveTo(px,py)});x.stroke();
 let every=Math.max(1,Math.ceil(labels.length/6));labels.forEach((lab,i)=>{if(i%every===0||i===labels.length-1){x.fillStyle='#6b7280';x.fillText(lab,pad.l+i*slot,h-8)}});
}
async function renderCharts(){
 const c=await cfg(),allJ=await all('jornadas'),y=sel.getFullYear(),m=sel.getMonth(),dm=new Date(y,m+1,0).getDate(),metas=c.metas||defaults;
 const map=new Map(allJ.filter(z=>z.data.startsWith(key(sel))).map(z=>[z.data,z]));
 let labels=[],fat=[],meta=[],ac=[],mac=[],sa=0,sm=0;
 for(let d=1;d<=dm;d++){let dt=new Date(y,m,d),r=map.get(iso(y,m,d)),f=r?num(r.faturamento):0,me=num(metas[dt.getDay()]);sa+=f;sm+=me;labels.push(String(d));fat.push(f);meta.push(me);ac.push(sa);mac.push(sm)}
 drawGroupedBars('grafDiario',labels.map(d=>String(d).padStart(2,'0')+'/'+String(m+1).padStart(2,'0')),fat,meta);drawLines('grafAcumulado',labels,[{values:ac},{values:mac}]);
 const monthly=new Map();allJ.forEach(r=>{let k=r.data.slice(0,7);monthly.set(k,(monthly.get(k)||0)+num(r.faturamento))});
 let keys=[...monthly.keys()].sort(),labs=[],bars=[],acc=[],sum=0;keys.forEach(k=>{sum+=monthly.get(k);let [yy,mm]=k.split('-');labs.push(mm+'/'+yy.slice(2));bars.push(monthly.get(k));acc.push(sum)});
 drawBarsLine('grafMensal',labs,bars,acc);
}
async function render(){const s=await stats(),pct=s.c.meta?s.fat/s.c.meta*100:0;$('mesTitulo').textContent=sel.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});$('fat').textContent=brl(s.fat);$('meta').textContent=brl(s.c.meta);$('pct').textContent=pct.toFixed(1).replace('.',',')+'% da meta';$('progress').style.width=Math.min(100,pct)+'%';$('lucro').textContent=brl(s.fat-s.custos);$('rhora').textContent=brl(s.horas?s.fat/s.horas:0);$('km').textContent=s.km.toLocaleString('pt-BR',{maximumFractionDigits:1});$('horas').textContent=s.horas.toLocaleString('pt-BR',{maximumFractionDigits:2});$('dias').textContent=s.j.filter(x=>num(x.horas)>0||num(x.km)>0||num(x.faturamento)>0).length;$('disp').textContent=s.disp;$('metaPrev').textContent=brl(s.metaPrev);$('necessario').textContent=brl(s.nec);$('planDisp').textContent=s.disp;$('planNec').textContent=brl(s.nec);$('planMes').textContent=sel.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});$('lista').innerHTML=s.j.sort((a,b)=>b.data.localeCompare(a.data)).map(x=>`<div class=item><div><strong>${new Date(x.data+'T12:00').toLocaleDateString('pt-BR')}</strong><br><small>${num(x.horas)} h · ${num(x.km)} km · ${num(x.kwh).toFixed(2)} kWh</small><br><strong>${brl(x.faturamento)}</strong></div><div class=itemActions><button class="mini editBtn" data-edit="${x.data}">Editar</button><button class="mini danger" data-del="${x.data}">Excluir</button></div></div>`).join('')||'<p>Nenhum registro neste mês.</p>';
document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editarLancamento(b.dataset.edit));
document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>excluirLancamento(b.dataset.del));
await renderPlan();await renderCharts()}
async function renderPlan(){const p=await planoMes(),map=new Map(p.map(x=>[x.data,x])),y=sel.getFullYear(),m=sel.getMonth(),dm=new Date(y,m+1,0).getDate();let html='';for(let d=1;d<=dm;d++){const data=iso(y,m,d),dt=new Date(y,m,d),pl=map.get(data)||{disponivel:'SIM',motivo:''};html+=`<div class=planDay data-date="${data}"><div class=date><strong>${String(d).padStart(2,'0')}/${String(m+1).padStart(2,'0')}</strong><small>${nomes[dt.getDay()]}</small></div><label>Disponível?<select class=dispSel><option ${pl.disponivel!=='NAO'?'selected':''}>SIM</option><option value=NAO ${pl.disponivel==='NAO'?'selected':''}>NÃO</option></select></label><label class=motivo>Motivo<input class=motivoIn value="${(pl.motivo||'').replaceAll('"','&quot;')}" placeholder="Ex.: Viagem"></label></div>`}$('planLista').innerHTML=html;document.querySelectorAll('.planDay').forEach(el=>{const save=async()=>{await put('planejamento',{data:el.dataset.date,disponivel:el.querySelector('.dispSel').value,motivo:el.querySelector('.motivoIn').value.trim()});await render()};el.querySelector('.dispSel').onchange=save;el.querySelector('.motivoIn').onchange=save})}

async function jornadaPorData(data){return (await all('jornadas')).find(x=>x.data===data)}
async function editarLancamento(data){
 const x=await jornadaPorData(data);if(!x)return;
 $('editOriginalData').value=x.data;$('editData').value=x.data;$('editHoras').value=num(x.horas);
 $('editKm').value=num(x.km);$('editFat').value=num(x.faturamento);$('editBat').value=num(x.bateria);
 $('editOutros').value=num(x.outros);$('editObs').value=x.obs||'';$('editDialog').showModal();
}
async function excluirLancamento(data){
 const x=await jornadaPorData(data);if(!x)return;
 const d=new Date(data+'T12:00').toLocaleDateString('pt-BR');
 if(!confirm(`Excluir definitivamente o lançamento de ${d} no valor de ${brl(x.faturamento)}?`))return;
 await del('jornadas',data);await render();
}
$('cancelEdit').onclick=()=>$('editDialog').close();
$('editForm').onsubmit=async e=>{
 e.preventDefault();
 const original=$('editOriginalData').value,nova=$('editData').value,c=await cfg();
 if(nova!==original && await jornadaPorData(nova)){alert('Já existe um lançamento nessa data.');return}
 const pc=num($('editBat').value),k=c.cap*pc/100;
 const obj={data:nova,horas:num($('editHoras').value),km:num($('editKm').value),
 faturamento:num($('editFat').value),bateria:pc,kwh:k,custoEnergia:k*c.tarifa,
 outros:num($('editOutros').value),obs:$('editObs').value};
 if(nova!==original)await del('jornadas',original);
 await put('jornadas',obj);sel=new Date(nova+'T12:00');$('editDialog').close();await render();
};
async function preview(){const c=await cfg(),k=c.cap*num($('batIn').value)/100;$('recargaPreview').textContent=k.toFixed(2).replace('.',',')+' kWh · '+brl(k*c.tarifa)}
function show(id){document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===id))}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>show(b.dataset.page));
$('form').onsubmit=async e=>{e.preventDefault();const c=await cfg(),pc=num($('batIn').value),k=c.cap*pc/100;await put('jornadas',{data:$('data').value,horas:num($('horasIn').value),km:num($('kmIn').value),faturamento:num($('fatIn').value),bateria:pc,kwh:k,custoEnergia:k*c.tarifa,outros:num($('outrosIn').value),obs:$('obsIn').value});sel=new Date($('data').value+'T12:00');e.target.reset();$('batIn').value=0;$('outrosIn').value=0;await preview();await render();show('dashboard')};$('batIn').oninput=preview;
$('btnMes').onclick=()=>{$('mesPicker').value=key(sel);$('mesDialog').showModal()};$('mesDialog').onclose=async()=>{if($('mesPicker').value){sel=new Date($('mesPicker').value+'-01T12:00');await render()}};
$('todosSim').onclick=async()=>{const y=sel.getFullYear(),m=sel.getMonth(),dm=new Date(y,m+1,0).getDate();for(let d=1;d<=dm;d++)await put('planejamento',{data:iso(y,m,d),disponivel:'SIM',motivo:''});await render()};
$('configForm').onsubmit=async e=>{e.preventDefault();const metas=[...document.querySelectorAll('.metaDia')].map(x=>num(x.value));await put('config',{id:'main',meta:num($('metaIn').value),cap:num($('capIn').value),tarifa:num($('tarifaIn').value),metas});await render();await preview();alert('Configurações salvas.')};
async function loadCfg(){const c=await cfg();$('metaIn').value=c.meta;$('capIn').value=c.cap;$('tarifaIn').value=c.tarifa;$('metasSemana').innerHTML=nomes.map((x,i)=>`<label>${x}<input class=metaDia type=number step=.01 value="${(c.metas||defaults)[i]}"></label>`).join('')}
$('exportar').onclick=async()=>{const o={version:2,jornadas:await all('jornadas'),planejamento:await all('planejamento'),config:await all('config')},a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(o,null,2)],{type:'application/json'}));a.download='backup-controle-motorista.json';a.click();URL.revokeObjectURL(a.href)};
$('importar').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const o=JSON.parse(await f.text());await clear('jornadas');await clear('planejamento');await clear('config');for(const x of o.jornadas||[])await put('jornadas',x);for(const x of o.planejamento||[])await put('planejamento',x);for(const x of o.config||[])await put('config',x);await loadCfg();await render();alert('Backup restaurado.')}catch{alert('Backup inválido.')}};
(async()=>{await openDB();await loadCfg();$('data').value=new Date().toISOString().slice(0,10);await preview();await render();if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js')})()
window.addEventListener('resize',()=>{clearTimeout(window.__chartResize);window.__chartResize=setTimeout(()=>renderCharts(),150)});
