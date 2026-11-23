/* Replay a tracker JSON export through the CURRENT engine and emit a corrected export.
   Why this exists: on 2026-11-23 the first real session exposed three load-adjustment
   defects that were invisible in the code and obvious the moment real reps were run
   through it. Run this after each session for the first month.

     node scripts/replay_export.js <export.json> <corrected.json>

   It rebuilds the program from the written defaults, replays every logged session, and
   applies the Phase 0 volume cap. No value is hand-edited. */
const fs=require('fs'),path=require('path');
const src=fs.readFileSync('index.html','utf8');
const code=src.split('<script>')[1].split('</script>')[0];
const fake={textContent:'',innerHTML:'',value:'',dataset:{},classList:{toggle(){},add(){},remove(){}},style:{},focus(){}};
global.localStorage={_v:{},getItem(k){return this._v[k]||null},setItem(k,v){this._v[k]=v}};
global.document={querySelector:()=>fake,querySelectorAll:()=>[],addEventListener:()=>{},getElementById:()=>fake};
global.window={scrollTo:()=>{},addEventListener:()=>{}};
global.alert=()=>{};
const api=new Function(code+'\n;return {LIB,engine,DAYS,S,syncExercise};')();
const {engine,DAYS,S,syncExercise}=api;

const IN=process.argv[2], OUT=process.argv[3];
const ex=JSON.parse(fs.readFileSync(IN,'utf8'));

// Rebuild prog from the written program (this was Kevin's first session, so defaults = pre-session state)
const prog={};
for(const d in DAYS) prog[d]=DAYS[d].ex.map(([id,sets,T,load])=>({id,sets,T,load,rung:0}));

// Replay his logged session through the FIXED engine
S.settings=Object.assign({},ex.settings,{phase0:false});   // it was off when he lifted
S.prog=prog;
const report=[];
for(const s of ex.sessions){
  for(const e of s.entries){
    const p=prog[s.day].find(q=>q.id===e.id);
    if(!p){report.push('!! not in program: '+e.id);continue;}
    const before=p.load+' x '+p.T;
    const r=engine(p,e.reps);
    p.T=r.T;p.load=r.load;p.rung=r.rung;
    if(r.id&&r.id!==p.id)p.id=r.id;
    syncExercise(p);
    report.push(`${e.name.padEnd(22)} ${e.reps.join('/').padEnd(10)} ${before.padEnd(9)} -> ${(p.load+' x '+p.T).padEnd(9)} ${r.msgs.join(' ')}`);
  }
}

/* PHASE 0 VOLUME CUT. 18 sets collapsed him inside session one (8/8/5/4 -> 3/2, and a
   set of zero on push-ups). Cap: 3 sets on the first exercise, 2 on everything else.
   No exercise is REMOVED -- the app has no "add exercise" UI, only swap, so a deletion
   would be unrecoverable without another import. Original counts are preserved in
   setsFull so volume can be restored when Phase 0 ends. */
for(const d in prog){
  prog[d].forEach((q,i)=>{ q.setsFull=q.sets; q.sets=Math.min(q.sets, i===0?3:2); });
}

const out={
  settings:Object.assign({},ex.settings,{
    phase0:true,            // back ON: weeks 1-2 ramp, and he is 1 session in
    proteinTarget:150,      // floor, labs cleared 11-04
    startDate:ex.sessions.length?ex.sessions[0].date:ex.settings.startDate
  }),
  prog, sessions:ex.sessions, fuel:ex.fuel, body:ex.body
};
fs.writeFileSync(OUT,JSON.stringify(out,null,1));
console.log(report.join('\n'));
console.log('\nwrote '+OUT);
