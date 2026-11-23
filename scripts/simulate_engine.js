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
const api=new Function(code+'\n;return {LIB,engine,weekOf,progStart,S,DAYS,avail,e1rm,syncExercise};')();
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

/* ---- 6. REGRESSION: Kevin's real first session, 2026-11-23, Day 1 ----
   Replayed from the exported JSON. Every one of these held the WRONG load before
   the 2026-11-23 threshold fix. */
S.settings.phase0=false;S.settings.dbs=[5,10,15,20,25];
const real=[
  /* id, sets prescribed, T, load, reps logged, what SHOULD happen */
  ['inclinepress',4, 8,25,[8,8,5,4], 'hold'],
  ['pushup',      3,10,'BW',[10,3,0],'easier'],
  ['shoulderpress',3,10,20,[7,3,2],  'lighter'],
  ['sideraise',   3,15,10,[15,15,15],'up'],
  ['tricepext',   3,12,25,[6,5,2],   'lighter'],
  ['skullcrusher',2,12,15,[3,2],     'lighter'],
];
for(const [id,sets,T,load,reps,want] of real){
  const r=engine({id,sets,T,load,rung:0},reps);
  const got = r.load!==load ? 'lighter'
            : (r.T<T ? 'easier' : (r.T>T ? 'up' : 'hold'));
  ok(got===want, `real session · ${id} ${load} × ${T}, logged ${reps.join('/')} → ${want} (got ${got}: ${r.load} × ${r.T})`);
}
ok(engine({id:'skullcrusher',sets:2,T:12,load:15,rung:0},[3,2]).load===10,
   '2-set exercise CAN drop load (old missed>=2 was unreachable with 1 working set)');
ok(engine({id:'pushup',sets:3,T:10,load:'BW',rung:0},[10,3,0]).T<10,
   'bodyweight target comes down when the working sets genuinely fail');

/* ---- 7. The 10/23 anti-load-walk guard must still hold ---- */
ok(engine({id:'inclinepress',sets:4,T:8,load:20,rung:0},[8,8,7,4]).load===20,
   'one rep short is NOT a material miss — load holds (10/23 load-walk guard)');
ok(engine({id:'inclinepress',sets:4,T:8,load:20,rung:0},[8,8,8,4]).load===20,
   'working sets all hit + final set fades hard -> load still holds');
ok(engine({id:'inclinepress',sets:4,T:8,load:20,rung:0},[8,8,8,9]).T===9,
   'clean success still advances the target');

/* ---- 8. Cross-day sync: one movement, one prescription ---- */
S.prog={1:[{id:'tricepext',sets:3,T:12,load:25,rung:0}],
        4:[{id:'tricepext',sets:3,T:12,load:25,rung:0},{id:'sideraise',sets:3,T:15,load:10,rung:0}]};
const d1=S.prog[1][0];
const res=engine(d1,[6,5,2]);
d1.T=res.T;d1.load=res.load;d1.rung=res.rung;api.syncExercise(d1);
ok(S.prog[4][0].load===d1.load&&S.prog[4][0].T===d1.T,
   'Day 4 copy of the same movement inherits Day 1 result (was still prescribing 25 lb)');
ok(S.prog[4][1].load===10,'sync does not touch a different movement');

console.log(fail?('\n'+fail+' FAILURE(S)'):'\nALL PASS');
process.exit(fail?1:0);
