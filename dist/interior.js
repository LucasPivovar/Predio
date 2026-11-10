import * as T from './vendor/three.module.js';
import {Builder,glow,grain,material,lights,lamp,seeded,skylineMaterial} from './model.js';

export const rooms = [
  {name:'Sala',box:[-7,0,14,3.5],eye:[-1.41,1.57,2.95],target:[-4.25,1.12,.90],fov:65},
  {name:'Cozinha',box:[1,-5,6,5],eye:[2.14,1.58,-.18],target:[4.35,1.12,-3.48],fov:64},
  {name:'Suíte',box:[-7,-5,5.2,5],eye:[-2.53,1.54,-.60],target:[-4.54,1.16,-3.89],fov:65},
  {name:'Banho',box:[-1.8,-5,2.8,3.65],eye:[-.60,1.53,-1.65],target:[.02,1.17,-4.22],fov:68},
  {name:'Varanda',box:[-7,3.5,14,2.45],eye:[4.46,1.57,4.19],target:[-2.15,1.07,5.60],fov:63}
];

// Positions along the clear route from each viewpoint to the hall.
const hall=[-1.24,.45], livingPassage=[-1.24,2.92];
const routes=[
  [livingPassage],
  [[1.53,-.19],[1.36,.45]],
  [[-2.04,-.29],[-2.04,.24]],
  [[-.58,-1.15],[-.58,-.42]],
  [[4.40,4.16],[-1.30,4.17],[-1.30,3.20],livingPassage]
];

export function roomRoute(from,to){
  const start=routes[from], end=routes[to];
  let a=start.length,b=end.length;
  // Skip the hall when both rooms share part of the same route.
  while(a&&b&&start[a-1]===end[b-1]){a--;b--;}
  const join=a===start.length?hall:start[a];
  return [...start.slice(0,a),join,...end.slice(0,b).reverse()];
}

export function layoutFor(unit){
  const flip=unit.variant===1?-1:1, width=[.9,1,1.1][unit.variant], depth=[.94,1,1.07][unit.variant];
  return {flip,width,depth,point:([x,y,z])=>[x*flip*width,y,z*depth]};
}

const warm=grain('#c29671','madeira'), oak=grain('#997054','madeira'), walnut=grain('#674537','madeira');
const tile=grain('#b9a798','pedra'), marble=grain('#e8ddcf','marmore'), walls=grain('#c4b4a6','gesso');
const cream=material('#ddc8ab'), white=material('#eee4d6'), black=material('#282329');
const brass=material('#bd925d',{metalness:.67,roughness:.31});
const steel=material('#9c9ca2',{metalness:.68,roughness:.23});
const screen=material('#241e2a',{metalness:.55,roughness:.17});
const water=material('#597d88',{metalness:.22,roughness:.15});
const light=glow('#ffce94',1.6), green=material('#436553');
const glass=material('#b9cadd',{transparent:true,opacity:.13,roughness:.23,metalness:.12,depthWrite:false});
const ceiling=material('#e1d7cc');
const variants=[
  {cloth:'#a38670',linen:'#e5cdb4',paint:'#4b5d52',rug:'#948077'},
  {cloth:'#758778',linen:'#e4d6bf',paint:'#625c75',rug:'#a59a88'},
  {cloth:'#c6ad98',linen:'#f0ddca',paint:'#534c53',rug:'#986b63'}
].map(m=>({...m,cloth:grain(m.cloth,'tecido'),linen:grain(m.linen,'tecido'),rug:grain(m.rug,'tecido')}));

function plant(b,x,y,z,s=1){
  b.round(x,y+.25*s,z,.45*s,.5*s,.45*s,walls);
  b.round(x,y+.51*s,z,.39*s,.025*s,.39*s,walnut);
  for(let i=0;i<7;i++){
    const a=i*2.39,r=(.14+(i%3)*.09)*s;
    b.round(x,y+.68*s+i*.02*s,z,.025*s,.42*s,.025*s,green,a,.33);
    b.orb(x+Math.sin(a)*r,y+(.73+i*.062)*s,z+Math.cos(a)*r,.13*s,.28*s,.10*s,i%2?green:'#627d53');
  }
}
function chair(b,x,z,ry=0,mat=cream){
  const p=(dx,dz)=>[x+dx*Math.cos(ry)+dz*Math.sin(ry),z-dx*Math.sin(ry)+dz*Math.cos(ry)];
  for(const a of [-1,1])for(const c of [-1,1]){
    const [bx,bz]=p(a*.24,c*.23);
    b.box(bx,.23,bz,.067,.46,.067,walnut,ry);
  }
  b.soft(x,.49,z,.62,.13,.62,mat,ry);
  const [bx,bz]=p(0,-.28);b.box(bx,.76,bz,.57,.47,.10,mat,ry);
}
function table(b,x,z,w,d,h,mat){
  b.box(x,h,z,w,.10,d,mat);
  for(const a of [-1,1])for(const c of [-1,1])b.box(x+a*(w/2-.12),h/2,z+c*(d/2-.12),.082,h,.082,walnut);
}
function pendant(b,x,z,h){
  b.round(x,h+.45,z,.035,.9,.035,brass);
  b.round(x,h,z,.36,.18,.36,brass);
  b.orb(x,h-.09,z,.14,.10,.14,light);
}
function framed(b,x,y,z,w,h,mat){
  b.box(x,y,z,w,h,.055,walnut);
  b.box(x,y,z+.036,w-.12,h-.12,.025,mat);
  b.box(x-w*.17,y,z+.054,w*.14,h*.55,.012,marble,.0);
  b.box(x+w*.12,y+h*.17,z+.056,w*.29,h*.21,.015,brass);
}
function floor(b,x,z,w,d,mat,seam){
  b.box(x,-.035,z,w,.09,d,mat,0,false);
  for(let i=-w/2+.26;i<w/2;i+=.36)b.box(x+i,.014,z,.011,.008,d-.04,seam,0,false);
}
function horizontalWall(b,x,z,w,h=2.65){
  b.box(x,h/2,z,w,h,.15,walls);b.box(x,.08,z+.081,w,.14,.035,white);
}
function verticalWall(b,x,z,d,h=2.65){
  b.box(x,h/2,z,.15,h,d,walls);b.box(x+.081,.08,z,.035,.14,d,white);
}
function cabinet(b,x,z,w,d,h,mat,front=1){
  b.box(x,h/2,z,w,h,d,mat);b.box(x,h+.026,z,w+.045,.064,d+.06,marble);
  const n=Math.ceil(w/.65);
  for(let i=0;i<n;i++){
    const bx=x-w/2+(i+.5)*w/n;
    b.box(bx,h*.48,z+front*(d*.5+.013),w/n-.022,h*.83,.032,mat);
    b.box(bx,h*.73,z+front*(d*.5+.053),Math.min(.21,w/n*.5),.033,.055,brass);
  }
}
function living(b,m){
  b.box(-3.5,.033,1.66,5.05,.024,3.22,m.rug);
  b.box(-4.21,.25,.73,3.42,.34,1.08,walnut);
  for(let i=0;i<3;i++){
    const x=-5.29+i*1.08;
    b.soft(x,.49,.76,1.03,.25,.87,m.cloth);
    b.soft(x,.79,.28,1.05,.49,.24,m.cloth);
    b.soft(x+.11,.79,.46,.45,.42,.18,i%2?m.paint:cream,i*.09,.25,(i-1)*.14);
  }
  for(const x of [-5.98,-2.43])b.soft(x,.56,.74,.22,.55,1.1,m.cloth);
  b.soft(-2.02,.33,2.33,1.00,.41,1.10,m.cloth);b.soft(-1.65,.63,2.33,.26,.43,1.1,m.cloth);
  table(b,-4.06,1.99,1.72,.75,.37,marble);
  b.box(-4.44,.445,2,.29,.045,.24,m.paint,.26);
  b.box(-4.39,.477,2,.27,.027,.22,white,.17);
  b.round(-3.55,.53,1.98,.17,.26,.17,brass);
  cabinet(b,-4.8,3.22,2.6,.40,.43,walnut,-1);
  b.box(-4.8,1.02,3.38,1.97,1.02,.09,black);
  b.box(-4.8,1.03,3.324,1.88,.93,.014,screen);
  plant(b,-6.48,0,2.92,.92);
  framed(b,-4.48,1.75,.086,1.38,.73,m.paint);
  framed(b,-5.75,1.64,.086,.66,.55,m.paint);
  b.round(-6.42,.035,1.05,.42,.07,.42,walnut);
  b.round(-6.42,.86,1.05,.045,1.72,.045,brass);
  b.round(-6.42,1.70,1.05,.43,.29,.43,cream);
  b.round(-6.42,1.55,1.05,.29,.05,.29,light);
  table(b,3.64,1.93,2.65,1.25,.77,oak);
  for(const s of [-1,1])for(const dx of [-.7,.7]){
    chair(b,3.64+dx,1.93+s*1.02,s<0?0:Math.PI,m.cloth);
    b.round(3.64+dx,.836,1.93+s*.38,.24,.027,.24,white);
    b.round(3.64+dx+.16,.91,1.93+s*.26,.073,.14,.073,water);
  }
  b.round(3.64,.97,1.93,.19,.3,.19,brass);b.orb(3.64,1.19,1.93,.18,.20,.17,green);
  pendant(b,3.10,1.93,1.88);pendant(b,4.18,1.93,1.88);
}
function kitchen(b,m){
  cabinet(b,4,-4.57,5.5,.7,.92,m.paint);
  b.box(5.68,1.05,-4.55,1.36,2.1,.73,steel);
  b.box(5.68,1.05,-4.168,1.34,.032,.02,black);
  for(const y of [.72,1.44])b.box(5.22,y,-4.13,.046,.31,.075,brass);
  b.box(3.25,1.2,-4.904,3.55,.46,.035,marble);
  for(const x of [2,2.82,3.64,4.46]){
    b.box(x,1.86,-4.72,.79,.68,.43,oak);
    b.box(x+.23,1.7,-4.477,.035,.17,.05,brass);
  }
  b.box(3.2,1.505,-4.5,3.24,.03,.06,light);
  b.box(2.25,.958,-4.52,.64,.035,.42,steel);
  b.box(2.25,.977,-4.52,.52,.022,.30,screen);
  b.round(2.25,1.11,-4.80,.045,.29,.045,steel);
  b.round(2.25,1.245,-4.68,.044,.26,.044,steel,0,Math.PI/2);
  cabinet(b,4.18,-1.87,2.66,1.03,.94,walnut,-1);
  b.box(4.45,.985,-1.9,.92,.034,.66,screen);
  for(const x of [4.22,4.66])for(const z of [-2.07,-1.77])b.round(x,1.007,z,.19,.021,.19,black);
  for(const x of [3.35,4.25,5.12]){
    b.round(x,.32,-.92,.08,.64,.08,brass);
    b.round(x,.055,-.92,.34,.09,.34,black);
    b.round(x,.67,-.92,.45,.14,.45,m.cloth);
  }
  pendant(b,3.72,-1.87,1.96);pendant(b,4.7,-1.87,1.96);
  for(const x of [2.96,3.15,3.36]){
    b.round(x,1.065,-4.56,.13,.18,.13,cream);
    b.round(x,1.165,-4.56,.15,.027,.15,oak);
  }
  b.box(3.23,1.002,-1.78,.30,.034,.35,oak,.14);
  for(let i=0;i<4;i++)b.orb(3.15+i*.064,1.06,-1.78+(i%2)*.10,.057,.055,.06,'#b3744e');
}
function suite(b,m){
  b.box(-4.49,.033,-2.61,3.9,.027,3.41,m.rug);
  b.box(-4.45,.24,-3.43,2.13,.36,2.56,walnut);
  b.soft(-4.45,.46,-3.41,2.04,.28,2.42,white);
  b.soft(-4.45,.63,-2.98,2.1,.13,1.62,m.linen);
  b.box(-4.45,.59,-2.22,2.12,.26,.25,m.linen);
  b.soft(-4.45,.71,-2.46,2.13,.064,.47,grain(m.paint,'tecido'));
  for(const z of [-2.64,-2.30])b.box(-4.45,.744,z,2.02,.009,.012,cream);
  b.soft(-3.46,.60,-2.46,.11,.22,.47,grain(m.paint,'tecido'));

  b.box(-4.45,.81,-4.68,2.48,1.39,.25,m.cloth);
  for(let i=0;i<6;i++)b.box(-5.45+i*.40,.82,-4.537,.375,1.28,.075,m.cloth);
  for(const x of [-4.97,-3.95]){
    b.soft(x,.67,-4.18,.80,.16,.43,white);
    b.soft(x,.76,-3.91,.62,.29,.20,cream,.03);
  }
  for(const x of [-6.05,-2.84]){
    cabinet(b,x,-4.24,.61,.55,.53,oak);
    b.round(x,.67,-4.23,.052,.27,.052,brass);
    b.round(x,.83,-4.23,.29,.18,.29,light);
  }
  framed(b,-4.45,1.89,-4.89,1.49,.63,m.paint);
  b.box(-6.61,1.16,-1.52,.53,2.32,1.75,oak);
  for(const z of [-2.08,-1.50,-.92]){
    b.box(-6.33,1.16,z,.06,2.25,.55,walnut);
    b.box(-6.27,1.11,z+.13,.066,.33,.032,brass);
  }
  b.box(-4.39,.36,-1.27,1.66,.20,.49,m.cloth);
  for(const x of [-5.05,-3.73])b.box(x,.14,-1.27,.12,.28,.39,walnut);
}
function bath(b){
  b.box(-.90,.10,-4.16,1.39,.19,1.46,marble);
  b.box(-.90,.203,-4.16,1.23,.036,1.28,tile);
  b.round(-.86,.224,-4.20,.16,.012,.16,steel);
  b.box(-.17,.97,-4.14,.019,1.54,1.52,glass,0,false);
  b.box(-.17,.96,-3.39,.04,1.57,.025,brass);
  b.box(-.17,1.74,-4.14,.042,.034,1.52,brass);
  b.box(-1.59,1.38,-4.39,.11,.065,.065,brass);
  b.round(-1.51,1.72,-4.44,.055,.66,.055,steel);
  b.round(-1.41,2.05,-4.44,.24,.063,.24,steel);
  b.box(.45,.53,-4.72,.53,.72,.24,white);
  b.orb(.45,.27,-4.37,.27,.23,.36,white);
  b.orb(.45,.41,-4.35,.18,.035,.25,screen);
  b.box(.61,.57,-2.59,.67,.48,1.06,oak);
  b.box(.61,.832,-2.59,.72,.072,1.11,marble);
  for(const z of [-2.86,-2.33]){
    b.box(.263,.58,z,.04,.42,.49,walnut);
    b.box(.233,.68,z,.054,.027,.19,brass);
  }
  b.soft(.58,.901,-2.59,.50,.095,.62,white);
  b.soft(.58,.953,-2.59,.35,.018,.45,tile);
  b.round(.87,.98,-2.59,.037,.23,.037,brass);
  b.box(.809,1.094,-2.59,.15,.039,.039,brass);
  b.box(.902,1.52,-2.59,.075,.80,.91,brass);
  b.box(.858,1.52,-2.59,.022,.73,.84,material('#aaa3a7',{metalness:.32,roughness:.28}));
  for(const z of [-3.07,-2.11])b.box(.907,1.52,z,.038,.73,.025,light);
  b.round(.67,.937,-2.98,.095,.15,.095,green);
  for(let y=.33;y<2.67;y+=.39)b.box(-1.711,y,-3.15,.009,.012,3.52,marble,0,false);
  b.box(-1.70,1.59,-2.31,.07,.06,.48,brass);
  b.soft(-1.65,1.37,-2.31,.08,.39,.37,cream);
  b.box(-1.22,.029,-2.38,.79,.022,.58,cream);
}
function terrace(b,m){
  for(const x of [-6.9,6.9])b.box(x,.62,4.69,.13,1.18,2.4,steel);
  b.box(0,.17,5.87,13.85,.30,.14,walls);
  b.box(0,1.18,5.87,13.85,.067,.081,brass);
  for(let x=-6.9;x<=7;x+=.69)b.box(x,.66,5.87,.048,1.03,.051,brass);
  for(const x of [-6.2,6.18,4.94])plant(b,x,0,5.19,1.05);
  chair(b,-3.36,4.66,Math.PI/2,m.cloth);chair(b,-1.42,4.66,-Math.PI/2,m.cloth);
  b.round(-2.41,.22,4.65,.15,.44,.15,brass);
  b.round(-2.41,.47,4.65,.69,.09,.69,marble);
  b.round(-2.41,.56,4.65,.12,.13,.12,green);
  b.box(2.73,.32,4.73,2.75,.58,.67,oak);
  b.box(2.73,.64,4.73,2.64,.13,.56,cream);
  b.box(2.73,.87,5.02,2.73,.43,.14,m.cloth);
}

function cityBackdrop(scene){
  const b=new Builder(scene), random=seeded(41);
  const facades=['#816f98','#8b749f','#967da7','#706d96'].map(skylineMaterial);
  const rooftops=['#2a2237','#332a45','#3b304c','#272438'].map(color=>new T.MeshBasicMaterial({color}));
  for(let i=0;i<85;i++){
    const angle=i*2.39996, distance=15+random()*66;
    const x=Math.cos(angle)*distance,z=Math.sin(angle)*distance;
    const top=1.5+random()*18-distance*.11, w=2+random()*4.7,d=2.7+random()*4.5;
    b.box(x,top-14,z,w,28,d,facades[i%facades.length],0,false);
    b.box(x+.13,top+.27,z-.21,w*.42,.54,d*.4,rooftops[(i+1)%4],0,false);

  }
  b.finish();
}

function rearWall(b){
  let left=-7;
  for(const x of [-6.02,-.91,3.54,6.17]){
    const width=x<0?1.24:1.12, start=x-width/2;
    horizontalWall(b,(left+start)/2,-5,start-left,2.84);
    b.box(x,.44,-5,width,.88,.15,walls);
    b.box(x,2.55,-5,width,.58,.15,walls);
    b.box(x,1.57,-4.99,width,1.37,.027,glass,0,false);
    b.box(x,1.56,-4.896,.046,1.39,.078,walnut);
    for(const y of [.875,2.263])b.box(x,y,-4.9,width+.06,.062,.16,walnut);
    for(const side of [-1,1])b.box(x+side*width/2,1.57,-4.9,.054,1.38,.085,walnut);
    left=x+width/2;
  }
  horizontalWall(b,(left+7)/2,-5,7-left,2.84);
}
function curtain(b,x,z,length){
  b.box(x,2.72,z,length+.09,.036,.049,brass);
  for(let i=0;i<Math.ceil(length/.11);i++){
    const dx=-length/2+(i+.5)*.11;
    b.soft(x+dx,1.39,z+(i%2)*.045,.126,2.64,.095,grain(i%2?'#c0a899':'#cfbaaa','tecido'));
  }
}

export function makeInterior(unit){
  const scene=new T.Scene(), apartment=new T.Group();
  const layout=layoutFor(unit), m=variants[unit.variant];
  scene.background=new T.Color('#302339');scene.fog=new T.FogExp2('#302339',.028);
  cityBackdrop(scene);
  apartment.scale.set(layout.width*layout.flip,1,layout.depth);scene.add(apartment);
  lights(scene,{sky:'#e1dbfb',ground:'#98705a',ambient:1.11,key:'#ffdec0',intensity:1.76,position:[3,10,7],area:11});
  const fill=new T.DirectionalLight('#9a92dd',.34);fill.position.set(-9,7,-8);scene.add(fill);
  for(const [x,z,power,y] of [[-4.35,1.25,19,2.63],[3.65,1.9,14,2.54],[4.1,-1.86,17,2.56],[-4.5,-3.2,18,2.62],[-.36,-2.55,13,2.6],[-6.4,1.05,5,1.56],[2.35,4.37,6,2.48]]){
    const [a,,c]=layout.point([x,0,z]);lamp(scene,'#ffcc98',power,a,y,c,7);
  }
  const b=new Builder(apartment);
  b.box(0,-.19,.44,14.17,.28,11.08,walnut);
  floor(b,0,1.75,14,3.5,warm,oak);
  floor(b,-4.4,-2.5,5.2,5,warm,oak);
  floor(b,-.40,-3.17,2.8,3.65,tile,marble);
  floor(b,4,-2.5,6,5,tile,marble);
  floor(b,-.40,-.67,2.8,1.31,warm,oak);
  floor(b,0,4.72,14,2.45,oak,walnut);

  rearWall(b);
  horizontalWall(b,-4.96,0,4.06,2.84);
  b.box(-2.42,2.53,0,1.02,.62,.15,walls);
  b.box(-2.42,2.22,.01,1.04,.055,.22,oak);
  for(const x of [-2.95,-1.88])b.box(x,1.12,.01,.072,2.25,.22,oak);
  for(const side of [-1,1])verticalWall(b,side*7,-.75,8.5,2.84);
  verticalWall(b,-1.8,-2.5,5,2.84);
  verticalWall(b,1,-3.18,3.64,2.84);
  horizontalWall(b,-1.43,-1.35,.74,2.84);
  horizontalWall(b,.76,-1.35,.48,2.84);
  b.box(-.22,2.53,-1.35,1.68,.62,.15,walls);
  for(const x of [-1.07,.52])b.box(x,1.12,-1.35,.075,2.25,.20,oak);
  b.box(-.27,2.22,-1.35,1.63,.055,.19,oak);

  b.box(0,2.91,-.75,14.15,.14,8.61,ceiling,0,false);
  for(const [x,z] of [[-5.9,1.20],[-2.8,1.2],[1.4,1.2],[5.8,1.2],[-5.8,-2.3],[-3,-2.3],[-.5,-2.72],[2.2,-3.13],[5.5,-3.13]]){
    b.round(x,2.834,z,.20,.021,.20,brass);
    b.round(x,2.817,z,.145,.022,.145,light);
  }
  for(const x of [-6.91,-4.6,-2.2,0,2.2,4.55,6.91])b.box(x,1.42,3.49,.066,2.84,.08,brass);
  for(const y of [.043,2.78])b.box(0,y,3.49,13.86,.075,.083,brass);
  for(const [x,w] of [[-5.75,2.27],[-3.4,2.34],[1.1,2.15],[3.37,2.3],[5.72,2.31]]){
    b.box(x,1.42,3.49,w,2.67,.028,glass,0,false);
  }
  curtain(b,-6.54,3.23,.78);
  curtain(b,6.51,3.23,.80);
  curtain(b,-6.59,-4.73,.55);
  living(b,m);kitchen(b,m);suite(b,m);bath(b);terrace(b,m);
  b.finish();
  return scene;
}
