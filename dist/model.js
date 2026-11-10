import * as T from './vendor/three.module.js';

const matrix = new T.Matrix4(), rotation = new T.Quaternion(), euler = new T.Euler();
const pos = new T.Vector3(), scale = new T.Vector3();
const cube = new T.BoxGeometry(1,1,1), ball = new T.IcosahedronGeometry(1,1), tube = new T.CylinderGeometry(.5,.5,1,16);
const softCube=new T.BoxGeometry(1,1,1,5,5,5);
const roundedPositions=softCube.attributes.position, roundedNormals=softCube.attributes.normal;
const corner=new T.Vector3(), center=new T.Vector3(), normal=new T.Vector3();
for(let i=0;i<roundedPositions.count;i++){
  corner.fromBufferAttribute(roundedPositions,i);
  center.copy(corner).clampScalar(-.37,.37);
  normal.subVectors(corner,center).normalize();
  corner.copy(center).addScaledVector(normal,.13);
  roundedPositions.setXYZ(i,corner.x,corner.y,corner.z);
  roundedNormals.setXYZ(i,normal.x,normal.y,normal.z);
}
const materials = new Map();
export function material(color, options = {}) {
  const key = JSON.stringify([color,options]);
  if (!materials.has(key)) materials.set(key,new T.MeshStandardMaterial({color,roughness:.76,...options}));
  return materials.get(key);
}
let facadeTexture;
export function skylineMaterial(color){
  if(!facadeTexture){
    const size=128, data=new Uint8Array(size*size*4);
    const random=seeded(123);
    const windows=Array.from({length:64},()=>random());
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const cellX=x%16, cellY=y%16;
      const inside=cellX>=5&&cellX<=10&&cellY>=4&&cellY<=11;
      const light=windows[Math.floor(x/16)+8*Math.floor(y/16)];
      const tint=inside ? (light>.84?1:light>.52?.64:.28) : .40;
      const i=4*(x+y*size);
      data[i]=Math.round(255*tint);
      data[i+1]=Math.round(255*tint*(inside&&light>.84?.92:1));
      data[i+2]=Math.round(255*tint*(inside&&light>.84?.75:1));
      data[i+3]=255;
    }
    facadeTexture=new T.DataTexture(data,size,size);
    facadeTexture.colorSpace=T.SRGBColorSpace;
    facadeTexture.generateMipmaps=true;
    facadeTexture.minFilter=T.LinearMipmapLinearFilter;
    facadeTexture.magFilter=T.LinearFilter;
    facadeTexture.needsUpdate=true;
  }
  return new T.MeshBasicMaterial({color,map:facadeTexture});
}
export const glow = (color,power=.9) => material(color,{emissive:color,emissiveIntensity:power});
export function grain(color, type) {
  const mat = material(color,{name:type});
  mat.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 vGrain;\n' + shader.vertexShader.replace('#include <begin_vertex>',`
      #include <begin_vertex>
      vec4 grainPosition = vec4(position,1.0);
      #ifdef USE_INSTANCING
      grainPosition = instanceMatrix * grainPosition;
      #endif
      vGrain = (modelMatrix * grainPosition).xyz;`);
    const patterns={
      madeira:'0.97 + 0.045 * sin(vGrain.x*144.0 + 1.5*sin(vGrain.z*3.7+vGrain.y*3.2)) + 0.035 * sin(vGrain.x*43.0 + sin(vGrain.z*7.2+vGrain.y*4.8))',
      marmore:'0.99 - 0.24*pow(0.5+0.5*sin(vGrain.x*9.2+vGrain.z*5.9+vGrain.y*6.0+1.8*sin(vGrain.z*8.2+vGrain.x*2.3)+0.35*sin(vGrain.x*38.0+vGrain.z*24.0)),14.0)',
      tecido:'0.96 + 0.035 * sin((vGrain.x+vGrain.y)*340.0) * sin((vGrain.z+vGrain.y)*310.0)'
    };
    const pattern = patterns[type] ?? '0.96 + 0.08 * fract(sin(dot(floor(vGrain*135.0),vec3(12.9898,78.233,51.13)))*43758.5453)';
    shader.fragmentShader = 'varying vec3 vGrain;\n' + shader.fragmentShader.replace('#include <color_fragment>',`
      #include <color_fragment>
      diffuseColor.rgb *= ${pattern};`);
  };
  mat.customProgramCacheKey=()=>type;
  return mat;
}
export class Builder {
  constructor(scene){this.scene=scene;this.batches=new Map();}
  shape(geometry,mat,x,y,z,w,h,d,ry=0,rx=0,rz=0,shadow=true){
    const actual = typeof mat==='object' ? mat : material(mat);
    const key = [geometry.id,actual.id,shadow].join('/');
    if(!this.batches.has(key))this.batches.set(key,{geometry,actual,shadow,items:[]});
    euler.set(rx,ry,rz);rotation.setFromEuler(euler);
    matrix.compose(pos.set(x,y,z),rotation,scale.set(w,h,d));
    this.batches.get(key).items.push(matrix.clone());
  }
  box(x,y,z,w,h,d,mat,ry=0,shadow=true){this.shape(cube,mat,x,y,z,w,h,d,ry,0,0,shadow);}
  soft(x,y,z,w,h,d,mat,ry=0,rx=0,rz=0){this.shape(softCube,mat,x,y,z,w,h,d,ry,rx,rz);}
  round(x,y,z,w,h,d,mat,ry=0,rx=0){this.shape(tube,mat,x,y,z,w,h,d,ry,rx);}
  orb(x,y,z,w,h,d,mat,shadow=true){this.shape(ball,mat,x,y,z,w,h,d,0,0,0,shadow);}
  finish(){
    for(const {geometry,actual,shadow,items} of this.batches.values()){
      const mesh=new T.InstancedMesh(geometry,actual,items.length);
      items.forEach((item,index)=>mesh.setMatrixAt(index,item));
      mesh.castShadow=shadow;mesh.receiveShadow=true;
      this.scene.add(mesh);
    }
  }
}
export function seeded(initial){
  let n=initial;
  return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
}
export function lights(scene,{sky,ground,ambient,key,intensity,position,area,shadow=true}){
  scene.add(new T.HemisphereLight(sky,ground,ambient));
  const sun=new T.DirectionalLight(key,intensity);
  sun.position.set(...position);sun.castShadow=shadow;
  if(shadow){
    sun.shadow.mapSize.set(2048,2048);
    Object.assign(sun.shadow.camera,{left:-area,right:area,top:area,bottom:-area,near:1,far:180});
    sun.shadow.normalBias=.065;sun.shadow.bias=-.00015;sun.shadow.radius=2;
  }
  scene.add(sun);
}
export function lamp(scene,color,power,x,y,z,reach){
  const light=new T.PointLight(color,power,reach);light.position.set(x,y,z);scene.add(light);
}
