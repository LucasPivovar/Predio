import * as T from './vendor/three.module.js';
import {Builder,glow,grain,material,seeded,lights,lamp} from './model.mjs';

export const units = Array.from({length:14},(_,i)=>Array.from({length:3},(_,j)=>({
  id:String((i+1)*100+j+1),floor:i+1,column:j,available:(i*7+j*3+2)%11<4,
  variant:j,area:[142,158,176][j]
}))).flat();

const stone=grain('#9b7b7a','pedra'), dark=material('#3e3040'), trim=material('#b29183',{metalness:.36,roughness:.38});
const glass=material('#4e4066',{metalness:.34,roughness:.21,emissive:'#382b55',emissiveIntensity:.5});
const amber=[glow('#d69a5a',.8),glow('#f9ba7b',1.13),glow('#ffdc9f',1.4)];
const rail=material('#7b627e',{metalness:.48,roughness:.27});
const road=grain('#272232','asfalto'), paving=grain('#514453','calçada'), hedge=material('#253c36');
const ground=grain('#33243d','solo'), paint=material('#8c7081'), hitMat=new T.MeshBasicMaterial({visible:false});
const foliage=['#26423a','#395243','#4a5650'].map(color=>material(color));
const cityColors=['#4d3b57','#564158','#4d415b','#59445c','#473850'].map(color=>material(color));
const cityGlass=['#6f536d','#524563','#87707f','#523d59'].map(color=>glow(color,.22));

function tree(b,x,z,size=1){
  b.round(x,.8*size,z,.18*size,1.6*size,.18*size,'#59434b');
  for(let i=0;i<4;i++){
    b.orb(x+Math.cos(i*2.4)*.43*size,(1.43+i*.16)*size,z+Math.sin(i*2.4)*.43*size,.85*size,.97*size,.85*size,foliage[i%3]);
  }
}
function streetlamp(b,x,z){
  b.round(x,1.6,z,.11,3.2,.11,'#857282');
  b.box(x,3.15,z,.52,.10,.21,dark);
  b.box(x,3.08,z,.41,.045,.17,amber[1]);
}
function car(b,x,z,color,turn){
  const p=(dx,dz)=>[x+(turn?dz:dx),z+(turn?dx:dz)];
  function part(dx,y,dz,w,h,d,mat){const [a,c]=p(dx,dz);b.box(a,y,c,turn?d:w,h,turn?w:d,mat);}
  part(0,.29,0,1.25,.39,2.6,color);part(0,.58,-.18,1.04,.33,1.32,glass);
  part(0,.76,-.18,.88,.07,.89,color);
  for(const side of [-1,1]){
    for(const end of [-1,1])part(side*.58,.22,end*.82,.22,.34,.45,dark);
    part(side*.41,.38,1.31,.23,.10,.04,amber[2]);part(side*.41,.38,-1.31,.23,.10,.04,glow('#c55060'));
  }
}
export function makeCity(){
  const scene=new T.Scene();
  scene.background=new T.Color('#3d2b48');scene.fog=new T.FogExp2('#3d2b48',.006);
  lights(scene,{sky:'#c6b7ff',ground:'#9e655a',ambient:1.2,key:'#ffcfac',intensity:2.1,position:[-38,75,51],area:43});
  const rim=new T.DirectionalLight('#8e81ff',1.65);rim.position.set(33,38,-50);scene.add(rim);
  const b=new Builder(scene), hits=[], random=seeded(891);
  b.box(0,-.36,0,310,.55,310,ground,0,false);
  for(let i=-3;i<=3;i++){
    const c=i*28+14;
    b.box(c,-.055,0,7,.10,205,road,0,false);b.box(0,-.049,c,205,.10,7,road,0,false);
    for(let d=-97;d<98;d+=3.5){
      if(Math.abs(((d+112)%28)-14)<4)continue;
      b.box(c,.012,d,.08,.017,1.35,paint,0,false);b.box(d,.013,c,1.35,.017,.08,paint,0,false);
    }
  }
  for(let x=-3;x<=3;x++)for(let z=-3;z<=3;z++){
    const cx=x*28,cz=z*28;
    b.box(cx,.12,cz,20.8,.28,20.8,paving,0,false);
    for(const side of [-1,1]){
      tree(b,cx+side*9.2,cz+8.8,.83+random()*.44);
      streetlamp(b,cx+side*9.7,cz+side*9.5);
    }
    if(x===0&&z===0)continue;
    const count=2+Math.floor(random()*3);
    for(let j=0;j<count;j++){
      const bx=cx+(j%2?4.5:-4.5)+(random()-.5)*1.2;
      const bz=cz+(j>1?4.4:-4.4)+(random()-.5)*1.2;
      const w=4.8+random()*2.9,d=4.9+random()*2.7;
      const h=3.2+random()*(Math.abs(x)+Math.abs(z)===1?9:15.5);
      b.box(bx,.23+h/2,bz,w,h,d,cityColors[Math.floor(random()*cityColors.length)],0,false);
      b.box(bx,h+.30,bz,w+.2,.18,d+.2,dark,0,false);
      b.box(bx+.7,h+.56,bz-.65,w*.34,.47,d*.32,cityColors[j],0,false);
      for(let y=1.3;y<h-.5;y+=1.22){
        for(let a=-w/2+.55;a<w/2-.32;a+=.93){
          const m=random()>.81?cityGlass[2]:cityGlass[Math.floor(random()*cityGlass.length)];
          b.panel(bx+a,y,bz+d/2+.017,.37,.46,m);
          b.panel(bx+a,y,bz-d/2-.017,.37,.46,m,Math.PI);
        }
        for(let a=-d/2+.55;a<d/2-.32;a+=.95){
          const m=cityGlass[Math.floor(random()*cityGlass.length)];
          b.panel(bx+w/2+.017,y,bz+a,.37,.44,m,Math.PI/2);
          b.panel(bx-w/2-.017,y,bz+a,.37,.44,m,-Math.PI/2);
        }
      }
    }
  }
  for(const [x,z,c,turn] of [[14,4,'#79636c',false],[-15,4,'#69547e',false],[7,15,'#ae705e',true],[-7,13,'#867686',true],[33,42,'#927984',true],[42,4,'#98796c',false],[-15,-7,'#84758b',false],[20,-15,'#877668',true],[-26,43,'#a37b7b',true]])car(b,x,z,c,turn);
  for(const x of [-14,14])for(const z of [-14,14])for(let j=-2;j<=2;j++){
    b.box(x+j*.66,.018,z-4.8,.34,.018,2.4,paint,0,false);
    b.box(x-4.8,.018,z+j*.66,2.4,.018,.34,paint,0,false);
  }

  b.box(0,.28,0,19.6,.55,18.7,stone);
  b.box(0,.63,0,17.9,.25,16.3,dark);
  b.box(0,1.9,-.5,15.2,2.6,12,stone);
  b.box(0,2.18,5.68,12.85,2.27,.18,glow('#c59373',.45));
  b.box(0,2.13,5.81,3.0,2.35,.18,glass);
  for(let x=-6.4;x<6.6;x+=.92)b.box(x,2.18,5.87,.10,2.45,.14,trim);
  b.box(0,3.38,6.05,15.2,.25,1.38,trim);
  b.box(0,3.23,6.62,13.9,.048,.05,amber[2]);
  b.box(0,.69,7.55,4.2,.17,3.6,paving);
  for(const side of [-1,1]){
    b.box(side*6.7,.61,7.55,4.2,.38,1.6,stone);
    b.box(side*6.7,.85,7.55,3.95,.26,1.3,hedge);
    tree(b,side*8,7.7,1.3);
    for(const z of [-5,-1,3])tree(b,side*8.7,z,.8);
  }

  b.box(0,21.8,-.65,14.2,36.5,10.9,dark);
  for(const unit of units){
    const f=unit.floor-1,j=unit.column,y=3.62+2.56*f,x=(j-1)*4.8;
    const room=unit.available?glass:amber[(f*3+j)%3];
    if(j===0){
      b.box(0,y,-.34,15.3,.30,11.9,stone);
      b.box(0,y-.19,5.53,15.1,.085,.12,trim);
      b.box(0,y-.19,-6.35,15.1,.085,.10,trim);
    }
    for(const side of [-1,1]){
      const z=side===1?5.13:-6.19;
      b.box(x,y+1.28,z,4.48,2.16,.11,room);
      if(!unit.available){
        b.box(x+1.4,y+1.32,z+side*.065,.72,2.04,.022,amber[0]);
        b.box(x-.82,y+.62,z+side*.084,1.5,.62,.026,glow('#a45e4e',.48));
      }
      for(const dx of [-2.22,-.73,.75,2.22])b.box(x+dx,y+1.28,z+side*.12,.082,2.18,.12,dark);
      b.box(x,y+2.35,z+side*.12,4.48,.092,.13,trim);
      b.box(x,y+.98,z+side*.13,4.48,.053,.09,dark);
      b.box(x,y+.28,z+side*.18,4.48,.075,.22,trim);
      const hit=new T.Mesh(new T.BoxGeometry(4.62,2.27,.21),hitMat);
      hit.position.set(x,y+1.26,z+side*.27);hit.userData.unit=unit;scene.add(hit);hits.push(hit);
    }
    if((f+j)%3!==1){
      const shift=j===1?.18:.55;
      b.box(x,y+.11,5.83,4.52,.19,1.57+shift,stone);
      b.box(x,y+.59,6.58+shift/2,4.48,.061,.065,trim);
      b.box(x,y+.39,6.57+shift/2,4.48,.34,.05,rail);
      for(const dx of [-2.22,0,2.22])b.box(x+dx,y+.37,6.61+shift/2,.05,.47,.07,trim);
      b.box(x-1.78,y+.31,6.02,.67,.30,.39,stone);
      b.box(x-1.78,y+.51,6.02,.64,.21,.37,hedge);
    }
    if(j!==1){
      const s=j===0?-1:1, sx=s*7.25;
      for(let a=0;a<3;a++){
        const z=-4.55+a*3.72;
        b.box(sx,y+1.28,z,.12,2.12,3.3,room);
        b.box(sx+s*.09,y+1.3,z+.52,.11,2.18,.065,dark);
        b.box(sx+s*.09,y+1.01,z,.10,.06,3.3,dark);
        b.box(sx+s*.09,y+2.32,z,.13,.084,3.3,trim);
        const hit=new T.Mesh(new T.BoxGeometry(.2,2.13,3.33),hitMat);
        hit.position.set(sx+s*.29,y+1.27,z);hit.userData.unit=unit;scene.add(hit);hits.push(hit);
      }
    }
  }
  for(const x of [-7.58,-2.4,2.4,7.58]){
    b.box(x,21.63,5.39,.26,36.4,.48,trim);
    b.box(x,21.63,-6.36,.25,36.4,.32,trim);
  }
  for(const x of [-7.53,7.53])for(const z of [-6.22,-2.58,1.10,4.98])b.box(x,21.62,z,.30,36.4,.18,stone);
  b.box(0,39.57,-.45,15.5,.53,12.4,stone);
  b.box(0,39.83,-.45,14.8,.18,11.7,trim);
  b.box(-3.58,40.93,-2.23,5.7,2.28,5.54,stone);
  b.box(-3.57,40.75,.59,5.24,1.53,.08,amber[0]);
  for(const x of [-6,-4.82,-3.57,-2.32,-1.12])b.box(x,40.75,.65,.10,1.65,.16,dark);
  b.box(-3.58,42.1,-2.23,6.1,.27,5.89,trim);
  b.box(3.7,40.01,-.75,5.65,.20,6.9,stone);
  b.box(3.7,40.13,-1.0,3.72,.09,5.75,glow('#70afc0',.64));
  for(let j=0;j<10;j++)b.box(3.7,40.18,-3.6+j*.57,3.6,.012,.025,glow('#a2d8de',.4));
  for(const x of [-6,-3.6,-1.2,1.2,3.6,6])b.box(x,40.2,4.77,1.65,.53,.77,hedge);
  for(const z of [-6.16,5.32]){b.box(0,40.26,z,15.1,.11,.12,trim);b.box(0,40.05,z,15.05,.39,.07,rail);}
  for(const x of [-7.48,7.48])b.box(x,40.26,-.44,.12,.11,11.55,trim);
  lamp(scene,'#ffc086',52,0,2.6,7.1,12);
  b.finish();
  return {scene,hits};
}
