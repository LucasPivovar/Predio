import * as T from './vendor/three.core.js';
import {makeCity,units} from './city.js';
import {makeInterior,layoutFor,rooms} from './interior.js';

import {useWebGPUMaterials} from './model.js';
import {makeFloorPlan} from './floorplan.js';

const $=id=>document.getElementById(id);
const viewport=$('viewport'), tooltip=$('tooltip'), select=$('unitSelect');
const status=$('status'), reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const available=units.filter(unit=>unit.available);
const interiors=new Map();
let scenesWithShadows=new WeakSet();
let motionQuality=1, lastFrameTime=0, slowFrames=0;
let viewWidth=0, viewHeight=0, pixelRatio=0;
let renderer, usingWebGPU=false, camera, city, scene, unit=null, active=0, layout=null;
let pose, goal, frame=0, tooltipTimer, flight=null;
let roomPreview=false, refinementTimer;
const veil=$('veil');
const ray=new T.Raycaster(), cursor=new T.Vector2();
const pointers=new Map();
let dragged=false, firstPointer=null;
let floorPlan;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

function cityPose(){
  return {x:0,y:20,z:0,yaw:.46,pitch:.37,radius:viewport.clientWidth/viewport.clientHeight<.62?90:80};
}
function roomPose(index){
  const {eye,target,fov}=rooms[index];
  const [x,y,z]=layout.point(eye), [tx,ty,tz]=layout.point(target);
  return {x,y,z,yaw:Math.atan2(tx-x,tz-z),pitch:Math.atan2(ty-y,Math.hypot(tx-x,tz-z)),radius:fov};
}
function setCamera(destination,immediate=false){
  goal=destination;
  if(immediate||reduced||!pose)pose={...goal};
  else goal.yaw=pose.yaw+Math.atan2(Math.sin(goal.yaw-pose.yaw),Math.cos(goal.yaw-pose.yaw));
  draw();
}
function draw(){
  if(!frame&&renderer)frame=requestAnimationFrame(render);
}
function cameraLens(fov){
  if(camera.fov===fov)return;
  camera.fov=fov;camera.updateProjectionMatrix();
}
function placeCamera(view){
  const {x,y,z,yaw,pitch,radius}=view;
  const horizontal=Math.cos(pitch), dx=horizontal*Math.sin(yaw), dy=Math.sin(pitch), dz=horizontal*Math.cos(yaw);
  if(unit){
    cameraLens(radius);
    camera.position.set(x,y,z);
    camera.lookAt(x+dx,y+dy,z+dz);
  }else{
    cameraLens(40);
    camera.position.set(x+radius*dx,y+radius*dy,z+radius*dz);
    camera.lookAt(x,y,z);
  }
}
function render(time){
  frame=0;
  if(flight){advanceFlight(time);return;}
  let moving=false;
  for(const key of Object.keys(goal)){
    const d=goal[key]-pose[key];
    if(Math.abs(d)>.0007){pose[key]+=d*.19;moving=true;}
    else pose[key]=goal[key];
  }
  if(roomPreview){
    roomPreview=false;
    resize(true,650000);
    refinementTimer=setTimeout(draw,90);
  }else prepareFrame(time,moving);
  placeCamera(pose);
  renderer.render(scene,camera);
  if(moving)draw();
}
function prepareFrame(time,moving){
  if(moving){
    const elapsed=lastFrameTime?time-lastFrameTime:0;
    lastFrameTime=time;
    slowFrames=elapsed>=28&&elapsed<=500?slowFrames+1:0;
    if(slowFrames>=7){
      motionQuality=Math.max(.60,motionQuality*.82);
      slowFrames=0;
    }
  }else{
    lastFrameTime=0;
    slowFrames=0;
  }
  resize(moving);
}
function resize(moving, motionPixels=1100000){
  const {clientWidth:w,clientHeight:h}=viewport;
  if(!w||!h)return;
  const idleRatio=Math.min(Math.max(1.18,devicePixelRatio),1.8,Math.sqrt(2800000/(w*h)));
  const ratio=moving?Math.min(idleRatio,motionQuality*Math.min(devicePixelRatio,1.2,Math.sqrt(motionPixels/(w*h)))):idleRatio;
  if(w===viewWidth&&h===viewHeight&&ratio===pixelRatio)return;
  viewWidth=w;viewHeight=h;pixelRatio=ratio;
  camera.aspect=w/h;camera.updateProjectionMatrix();
  renderer.setDrawingBufferSize(w,h,ratio);
}
function swap(next){
  scene=next;
  if(!scenesWithShadows.has(scene)){
    if(usingWebGPU){
      scene.traverse(object=>{
        if(object.isLight&&object.castShadow){
          object.shadow.autoUpdate=false;
          object.shadow.needsUpdate=true;
        }
      });
    }else renderer.shadowMap.needsUpdate=true;
    scenesWithShadows.add(scene);
  }
}
function clearTooltip(){
  clearTimeout(tooltipTimer);tooltip.hidden=true;
}
function setScene(name,meta){
  $('sceneName').textContent=name;
  $('sceneMeta').textContent=meta??'';
  $('sceneLabel').hidden=!name;
}
function setRoom(index,initial=false){
  if(flight&&!initial)return;
  const next=clamp(index,0,rooms.length-1);
  if(next===active&&!initial)return;
  active=next;
  floorPlan.select(active);
  $('prev').disabled=active===0;
  $('next').disabled=active===rooms.length-1;
  $('step').textContent=rooms[active].name;
  setScene('');
  clearTooltip();
  clearTimeout(refinementTimer);
  roomPreview=true;
  setCamera(roomPose(active),true);
}
async function preloadInteriors(){
  const variants=[...new Map(available.map(unit=>[unit.variant,unit])).values()];
  for(const [index,chosen] of variants.entries()){
    status.textContent=`Carregando interiores (${index+1}/${variants.length})…`;
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    resize(true,180000);

    const interior=makeInterior(chosen);
    const previewCamera=camera.clone();
    const room=rooms[0], transform=layoutFor(chosen);
    previewCamera.position.set(...transform.point(room.eye));
    previewCamera.lookAt(...transform.point(room.target));

    // Submit every material in a real frame, including rooms outside the initial view.
    const meshes=[];
    interior.traverse(object=>{
      if(!object.isMesh||!object.frustumCulled)return;
      if(object.isInstancedMesh)object.computeBoundingSphere();
      object.frustumCulled=false;
      meshes.push(object);
    });
    swap(interior);
    try{
      renderer.render(interior,previewCamera);
    }finally{
      for(const mesh of meshes)mesh.frustumCulled=true;
    }
    interiors.set(chosen.variant,interior);
  }
}
function enterUnit(chosen){
  const key=chosen.variant;
  unit=chosen;layout=layoutFor(unit);swap(interiors.get(key));
  $('overview').hidden=true;$('tour').hidden=false;
  document.body.classList.add('inside');
  $('hint').querySelector('span').textContent='Arraste para olhar ao redor';
  renderer.domElement.setAttribute('aria-label','Interior 3D. Use a planta ou as setas para visitar os cômodos.');
  $('unitTitle').textContent=unit.id;
  $('unitInfo').textContent=`${unit.floor}º andar · ${unit.area} m² · Planta ${['A','B','C'][key]}`;
  floorPlan.orient(layout.flip);setRoom(0,true);
}
const smooth=t=>t*t*(3-2*t);
function advanceFlight(time){
  const t=clamp((time-flight.start)/1100,0,1);
  if(t===1){
    const chosen=flight.chosen;
    flight=null;
    veil.style.opacity=0;
    enterUnit(chosen);
    $('back').focus({preventScroll:true});
    return;
  }
  const eased=smooth(t);
  camera.position.copy(flight.path.getPoint(eased));
  camera.lookAt(flight.look.clone().lerp(flight.inside,eased));
  veil.style.opacity=smooth(clamp((t-.86)/.14,0,1));
  prepareFrame(time,true);
  renderer.render(scene,camera);
  draw();
}
function openUnit(chosen,windowHit){
  if(!chosen?.available||flight||unit)return;
  clearTooltip();
  if(reduced){enterUnit(chosen);$('back').focus({preventScroll:true});return;}
  const hit=windowHit??city.hits.find(mesh=>mesh.userData.unit===chosen&&mesh.position.z>5&&Math.abs(mesh.position.x)<6);
  const entry=hit.position.clone(), side=Math.abs(entry.x)>7;
  const normal=new T.Vector3(side?Math.sign(entry.x):0,0,side?0:Math.sign(entry.z));
  const start=camera.position.clone(), look=new T.Vector3(pose.x,pose.y,pose.z);
  const approach=entry.clone().addScaledVector(normal,21).add(new T.Vector3(0,4,0));
  const outside=entry.clone().addScaledVector(normal,3);
  const inside=entry.clone().addScaledVector(normal,-1.35);
  flight={chosen,start:performance.now(),look,inside,path:new T.CatmullRomCurve3([start,approach,outside,inside])};
  $('visit').disabled=true;
  setScene(`Entrando na unidade ${chosen.id}`,`${chosen.floor}º ANDAR`);
  draw();
}
function goBack(){
  roomPreview=false;
  clearTimeout(refinementTimer);
  flight=null;veil.style.opacity=0;
  unit=null;swap(city.scene);
  document.body.classList.remove('inside');
  $('hint').querySelector('span').innerHTML='Arraste para girar <b>·</b> Role para aproximar';
  renderer.domElement.setAttribute('aria-label','Maquete 3D. Use o acesso direto para visitar um apartamento pelo teclado.');
  $('visit').disabled=!select.value;
  $('tour').hidden=true;$('overview').hidden=false;
  clearTooltip();setScene('Vista da torre');setCamera(cityPose(),true);
  select.focus({preventScroll:true});
}
function aim(event){
  const box=viewport.getBoundingClientRect();
  cursor.set((event.clientX-box.left)/box.width*2-1,-(event.clientY-box.top)/box.height*2+1);
  ray.setFromCamera(cursor,camera);
}
function pickUnit(event){
  aim(event);
  return ray.intersectObjects(city.hits,false)[0]?.object;
}
function showUnit(chosen,event){
  const rect=viewport.getBoundingClientRect();
  tooltip.textContent=`${chosen.id} · ${chosen.available?'Disponível para visita':'Ocupado'}`;
  tooltip.hidden=false;
  tooltip.style.left=`${clamp(event.clientX-rect.left+13,6,Math.max(6,rect.width-tooltip.offsetWidth-7))}px`;
  tooltip.style.top=`${clamp(event.clientY-rect.top-36,6,rect.height-35)}px`;
}
function zoom(factor){
  if(flight)return;
  goal.radius=clamp(goal.radius*factor,unit?42:33,unit?90:139);
  if(reduced)pose={...goal};draw();
}
function distance(){
  const [a,b]=[...pointers.values()];return Math.hypot(a.x-b.x,a.y-b.y);
}
function installControls(){
  const canvas=renderer.domElement;
  canvas.setAttribute('aria-label','Maquete 3D. Use o acesso direto para visitar um apartamento pelo teclado.');
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0||flight)return;
    if(!pointers.size){dragged=false;firstPointer={x:event.clientX,y:event.clientY};}
    else dragged=true;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{
    if(flight)return;
    const p=pointers.get(event.pointerId);
    if(p){
      const oldDistance=pointers.size===2?distance():0;
      pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if(Math.hypot(event.clientX-firstPointer.x,event.clientY-firstPointer.y)>5)dragged=true;
      if(pointers.size===2){const updated=distance();if(updated>3&&oldDistance>3)zoom(oldDistance/updated);}
      else if(dragged){
        goal.yaw-=(event.clientX-p.x)*.008;
        if(unit){
          goal.pitch=clamp(goal.pitch-(event.clientY-p.y)*.005,-1.25,1.25);
        }else goal.pitch=clamp(goal.pitch+(event.clientY-p.y)*.006,.10,1.47);
        if(reduced)pose={...goal};draw();
      }
      if(dragged){clearTooltip();canvas.style.cursor='grabbing';}
      return;
    }
    if(unit){canvas.style.cursor='grab';return;}
    const chosen=pickUnit(event)?.userData.unit;
    canvas.style.cursor=chosen?'pointer':'grab';
    if(chosen)showUnit(chosen,event);else clearTooltip();
  });
  canvas.addEventListener('pointerup',event=>{
    if(!pointers.delete(event.pointerId)||pointers.size||dragged)return;
    if(unit||flight)return;
    const hit=pickUnit(event), chosen=hit?.userData.unit;
    if(chosen?.available)openUnit(chosen,hit);
    else if(chosen){showUnit(chosen,event);tooltipTimer=setTimeout(clearTooltip,2100);}
  });
  canvas.addEventListener('pointercancel',event=>{pointers.delete(event.pointerId);clearTooltip();});
  canvas.addEventListener('pointerleave',clearTooltip);
  canvas.addEventListener('wheel',event=>{event.preventDefault();clearTooltip();zoom(Math.exp(clamp(event.deltaY,-180,180)*.0014));},{passive:false});
  $('zoomIn').addEventListener('click',()=>zoom(.81));
  $('zoomOut').addEventListener('click',()=>zoom(1.24));
  $('reset').addEventListener('click',()=>{if(!flight)setCamera(unit?roomPose(active):cityPose());});
  select.addEventListener('change',()=>$('visit').disabled=!!flight||!select.value);
  $('visit').addEventListener('click',()=>openUnit(available.find(item=>item.id===select.value)));
  $('back').addEventListener('click',goBack);
  $('prev').addEventListener('click',()=>setRoom(active-1));
  $('next').addEventListener('click',()=>setRoom(active+1));
  document.addEventListener('keydown',event=>{
    if(!unit&&!flight)return;
    if(event.key==='Escape')goBack();
    else if(flight)return;
    else if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
      event.preventDefault();setRoom(active+(event.key==='ArrowLeft'?-1:1));
    }
  });
}

async function createRenderer(){
  const options={antialias:true,powerPreference:'high-performance'};
  if(navigator.gpu){
    try{
      const module=await import('./vendor/three.webgpu.js');
      const gpu=new module.WebGPURenderer(options);
      await gpu.init();
      if(gpu.backend.isWebGPUBackend){
        usingWebGPU=true;
        useWebGPUMaterials(module);
        return gpu;
      }
      gpu.dispose();
    }catch(error){
      console.warn('WebGPU indisponível. Tentando WebGL 2.',error);
    }
  }
  const {WebGLRenderer}=await import('./vendor/three.module.js');
  return new WebGLRenderer(options);
}

try{
  renderer=await createRenderer();
  renderer.domElement.dataset.renderer=usingWebGPU?'webgpu':'webgl2';
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.autoUpdate=false;
  camera=new T.PerspectiveCamera(40,1,.055,350);
  const canvas=renderer.domElement;
  canvas.style.visibility='hidden';
  viewport.append(canvas);
  city=makeCity();
  await preloadInteriors();
  status.textContent='Finalizando a maquete…';
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  swap(city.scene);
  goal=cityPose();
  pose={...goal};
  resize(false);
  placeCamera(pose);
  renderer.render(scene,camera);
  if(usingWebGPU)await renderer.backend.device.queue.onSubmittedWorkDone();

  floorPlan=makeFloorPlan($('plan'),rooms,setRoom);
  installControls();
  $('availableCount').textContent=available.length;
  for(const item of available){
    const option=document.createElement('option');option.value=item.id;
    option.textContent=`Unidade ${item.id} · ${item.floor}º andar`;select.append(option);
  }
  canvas.style.visibility='';
  select.disabled=false;
  status.hidden=true;
  new ResizeObserver(draw).observe(viewport);
  renderer.domElement.addEventListener('webglcontextlost',()=>{
    status.textContent='Reconectando a renderização 3D…';status.hidden=false;
  });
  renderer.domElement.addEventListener('webglcontextrestored',()=>{
    scenesWithShadows=new WeakSet();
    swap(scene);
    status.hidden=true;
    draw();
  });
}catch(error){
  status.textContent='A maquete precisa de um navegador com WebGPU ou WebGL 2 habilitado.';
  console.error(error);
}
