/* Re-run after ANY edit to engine(), weekOf(), or the exercise library.
   Loads the real index.html script block — no copy of the logic lives here. */
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const code=src.split('<script>')[1].split('</script>')[0];
const el=new Proxy({},{get:(t,k)=>k==='value'?'':(k==='classList'?{toggle(){},add(){},remove(){}}:(typeof k==='string'?el[k]:undefined)),set:()=>true});
const fake={textContent:'',innerHTML:'',value:'',dataset:{},classList:{toggle(){},add(){},remove(){}},style:{},focus(){}};
global.localStorage={_v:{},getItem(k){return this._v[k]||null},setItem(k,v){this._v[k]=v}};
global.document={querySelector:()=>fake,querySelectorAll:()=>[],addEventListener:()=>{},getElementById:()=>fake};
global.window={scrollTo:()=>{},addEventListener:()=>{}};
global.alert=()=>{};
const api=new Function(code+'\n;return {LIB,engine,weekOf,progStart,S,DAYS,avail,e1rm};')();
const {LIB,engine,weekOf,progStart,S}=api;

let fail=0;
const ok=(c,m)=>{console.log((c?'PASS':'FAIL')+' · '+m); if(!c)fail++;};

/* ---- 1. Week clock ---- */
S.sessions=[];
ok(weekOf('2026-11-23')===0,'no sessions logged -> week 0 (was reporting week 5)');
S.sessions=[{date:'2026-11-23',day:1,entries:[]}];
ok(progStart()==='2026-11-23','progStart = first logged session');
ok(weekOf('2026-11-23')===1,'first session day -> week 1');
ok(weekOf('2026-12-07')===3,'two weeks later -> week 3');
S.sessions=[{date:'2026-12-01'},{date:'2026-11-23'}];
ok(progStart()==='2026-11-23','progStart takes the EARLIEST session, not sessions[0]');

/* ---- 2. New bar exercises are well-formed and gated ---- */
const bar=Object.values(LIB).filter(x=>x.req);
ok(bar.length===10,'10 equipment-gated movements added (got '+bar.length+')');
ok(bar.every(x=>x.bw),'every gated movement is bodyweight');
ok(bar.every(x=>x.lo>0&&x.hi>x.lo),'every gated movement has a sane rep range');
S.settings.pullupBar=false;S.settings.bands=false;
ok(bar.every(x=>!api.avail(x)),'all hidden when no equipment toggled on');
S.settings.pullupBar=true;
ok(api.avail(LIB.negpullup)&&!api.avail(LIB.bandpullup),'bar on: bar moves visible, band move still hidden');
S.settings.bands=true;
ok(api.avail(LIB.bandpullup),'bands on: band-assisted visible');

/* ---- 3. Bodyweight progression: graduates up the chain, never walks backward ---- */
S.settings.phase0=false;
let p={id:'scappullup',sets:3,T:LIB.scappullup.lo,load:'BW',rung:0};
const seen=[p.id];let bad=0;
for(let i=0;i<60;i++){
  const T=p.T, reps=[T,T,T+2];              // succeeding: working sets hit, final set +2
  const r=engine(p,reps);
  if(r.id!==p.id)seen.push(r.id);
  // a drop in target is only legitimate when the movement got harder (graduation or rung)
  if(r.T<T && r.id===p.id && r.rung===p.rung)bad++;
  p={id:r.id,sets:3,T:r.T,load:r.load,rung:r.rung};
}
ok(bad===0,'BW: target never drops except on a graduation or a rung (10/23 load-walk bug class)');
ok(p.load==='BW','BW: load stays BW — never assigned a dumbbell weight');
ok(seen.join('>')==='scappullup>chairpullup>negpullup>chinup>neutralpullup>pullup',
   'BW: climbs the full bar chain in order ('+seen.join('>')+')');
ok(p.id==='pullup','BW: ends on the hardest variation and stays there');
ok(p.rung>0,'BW: starts the technique ladder only after the chain is exhausted');
ok(p.T<=LIB.pullup.hi,'BW: target stays inside the rep range');
const stuck=engine({id:'pullup',sets:3,T:LIB.pullup.hi,load:'BW',rung:5},[8,8,12]);
ok(stuck.flag==='outgrown'&&/backpack/.test(stuck.msgs.join(' )')),'BW: end of ladder says add weight, not "buy dumbbells"');
ok(!/BUY TRIGGER/.test(stuck.msgs.join(' ')),'BW: no equipment buy-trigger fired on a bodyweight movement');

/* ---- 4. BW failure path: no stepDown crash at BW ---- */
p={id:'pullup',sets:3,T:5,load:'BW',rung:0};
const r=engine(p,[1,1,1]);
ok(r.load==='BW'&&r.T<5,'BW: genuine failure lowers TARGET, not load, and does not crash');
ok(api.e1rm('BW',5)===null,'BW: no e1RM computed');

/* ---- 5. Loaded exercises still behave (regression on existing engine) ---- */
S.settings.dbs=[5,10,15,20,25];
p={id:'inclinerow',sets:4,T:10,load:20,rung:0};
const up=engine(p,[10,10,20]);
ok(up.load===25,'loaded: far-too-light steps 20 -> 25 lb');
p={id:'inclinerow',sets:4,T:10,load:25,rung:0};
const top=engine(p,[10,10,25]);
ok(top.rung>0||top.T<=LIB.inclinerow.hi,'loaded: at max dumbbell it ladders instead of overloading');

console.log(fail?('\n'+fail+' FAILURE(S)'):'\nALL PASS');
process.exit(fail?1:0);
