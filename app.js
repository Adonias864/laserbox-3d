import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const $=id=>document.getElementById(id);
const state={mode:'auto',manual:{front:[],back:[],left:[],right:[]},wire:false};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a));
const scene=new THREE.Scene();scene.background=new THREE.Color('#111d2d');
const camera=new THREE.PerspectiveCamera(38,1,.1,3000);camera.position.set(230,180,250);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
$('viewport').appendChild(renderer.domElement);$('viewport').querySelector('.loading')?.remove();renderer.domElement.style.touchAction='none';
const controls=new OrbitControls(camera,renderer.domElement);controls.enabled=true;controls.enableRotate=true;controls.enablePan=true;controls.enableZoom=true;controls.enableDamping=true;controls.screenSpacePanning=true;controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};controls.target.set(0,30,0);
scene.add(new THREE.HemisphereLight(0xc8ddf5,0x342719,2));
const key=new THREE.DirectionalLight(0xffe1b5,3);key.position.set(150,240,180);key.castShadow=true;scene.add(key);
const fill=new THREE.DirectionalLight(0x86b9ee,1.2);fill.position.set(-160,80,-120);scene.add(fill);
const grid=new THREE.GridHelper(500,25,0x3b5069,0x25374b);grid.position.y=-1;scene.add(grid);
let model=new THREE.Group();scene.add(model);
let lidAssembly=null,lidOpen=false,lidTargetY=0;
const wood=new THREE.MeshStandardMaterial({color:0xc99155,roughness:.72,side:THREE.DoubleSide});
const darkWood=new THREE.MeshStandardMaterial({color:0x9d693a,roughness:.8,side:THREE.DoubleSide});
function dims(){return {w:clamp(+$('width').value,30,600),d:clamp(+$('depth').value,30,600),h:clamp(+$('height').value,20,500),t:clamp(+$('thickness').value,2,12),n:clamp(+$('count').value,2,16),f:clamp(+$('finger').value,3,30),k:+$('kerf').value};}
function fingerSteps(count){return Math.max(3,Math.round(count)*2+1);}
function wallPoints(length,height,count,thickness,fullOnEven,bottomOnEven=true){
 const bands=Math.max(4,count*2),bh=height/bands,pts=[];
 const inset=i=>((i%2===0)===fullOnEven)?0:thickness;
 // Rasgos no pé da parede: recebem as linguetas do fundo.
 const steps=fingerSteps(count),usable=length-2*thickness,step=usable/steps;
 pts.push([inset(0),0],[thickness,0]);
 for(let i=0;i<steps;i++){
  const x0=thickness+i*step,x1=thickness+(i+1)*step;
  if(i>0&&i<steps-1&&((i%2===0)===bottomOnEven))pts.push([x0,0],[x0,thickness],[x1,thickness],[x1,0]);
  else pts.push([x1,0]);
 }
 pts.push([length-inset(0),0]);
 for(let i=0;i<bands;i++){
  const y0=i*bh,y1=(i+1)*bh,ix=length-inset(i);
  pts.push([ix,y0],[ix,y1]);
 }
 pts.push([inset(bands-1),height]);
 for(let i=bands-1;i>=0;i--){
  const y1=(i+1)*bh,y0=i*bh,ix=inset(i);
  pts.push([ix,y1],[ix,y0]);
 }
 return pts;
}
function makeWallShape(length,height,count,thickness,fullOnEven,bottomOnEven=true){
 const pts=wallPoints(length,height,count,thickness,fullOnEven,bottomOnEven),s=new THREE.Shape();
 s.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)s.lineTo(pts[i][0],pts[i][1]);s.closePath();return s;
}
function addSteppedWall(parent,length,height,thickness,count,fullOnEven,x,y,z,rotation,mat,bottomOnEven=true){
 const shape=makeWallShape(length,height,count,thickness,fullOnEven,bottomOnEven);
 const geo=new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false,curveSegments:1,steps:1});
 geo.translate(-length/2,-height/2,-thickness/2);
 const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.rotation.y=rotation;
 mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function basePoints(width,depth,count,thickness){
 const steps=fingerSteps(count),pts=[];
 const edge=(ax,ay,bx,by,nx,ny,tabOnEven=false)=>{
  const dx=(bx-ax)/steps,dy=(by-ay)/steps;
  for(let i=0;i<steps;i++){
   const x0=ax+dx*i,y0=ay+dy*i,x1=ax+dx*(i+1),y1=ay+dy*(i+1);
   if(i===0)pts.push([x0,y0]);
   if(i>0&&i<steps-1&&((i%2===0)===tabOnEven)){
    pts.push([x0+nx*thickness,y0+ny*thickness],[x1+nx*thickness,y1+ny*thickness]);
   }
   pts.push([x1,y1]);
  }
 };
 edge(0,0,width,0,0,-1);
 edge(width,0,width,depth,1,0);
 edge(width,depth,0,depth,0,1,false);
 edge(0,depth,0,0,-1,0,false);
 return pts;
}
function addFingerBase(parent,width,depth,thickness,count){
 const pts=basePoints(width,depth,count,thickness),shape=new THREE.Shape();
 shape.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)shape.lineTo(pts[i][0],pts[i][1]);shape.closePath();
 const geo=new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false,curveSegments:1,steps:1});
 geo.translate(-width/2,-depth/2,-thickness/2);
 const mesh=new THREE.Mesh(geo,darkWood);mesh.rotation.x=Math.PI/2;mesh.position.set(0,thickness/2,0);
 mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function addPanel(parent,w,h,depth,x,y,z,mat=wood){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,depth),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function lidSkirtPoints(length,height,thickness,count,phase){
 // Mesmo padrão das laterais: 2*n faixas e dentes alternados nas duas pontas.
 const bands=Math.max(4,count*2),bh=height/bands,pts=[[0,0],[length,0]];
 const inset=i=>((i%2===0)===phase)?0:thickness;
 for(let i=0;i<bands;i++)pts.push([length-inset(i),(i+1)*bh]);
 pts.push([inset(bands-1),height]);
 for(let i=bands-1;i>=0;i--)pts.push([inset(i),i*bh]);
 return pts;
}
function addLidSkirt(parent,length,height,thickness,count,phase,x,y,z,rotation,mat){
 const pts=lidSkirtPoints(length,height,thickness,count,phase),shape=new THREE.Shape();
 shape.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)shape.lineTo(pts[i][0],pts[i][1]);shape.closePath();
 const geo=new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false,curveSegments:1,steps:1});
 geo.translate(-length/2,-height/2,-thickness/2);
 const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.rotation.y=rotation;
 mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function lidSkirtPath(length,height,thickness,count,phase,kerf){
 const pts=lidSkirtPoints(length,height,thickness,count,phase),minX=Math.min(...pts.map(p=>p[0])),minY=Math.min(...pts.map(p=>p[1]));
 return 'M '+pts.map(p=>`${(p[0]-minX+kerf).toFixed(3)} ${(p[1]-minY+kerf).toFixed(3)}`).join(' L ')+' Z';
}

function addLid(parent,type,w,d,h,t,gap){
 if(type==='none')return {pieces:0,group:null};
 const group=new THREE.Group();
 if(type==='flat'){addPanel(group,w,t,d,0,h+t/2,0,wood);parent.add(group);return {pieces:1,group};}
 if(type==='cap'){
  const lidW=w+2*t+2*gap,lidD=d+2*t+2*gap,skirtH=clamp(+$('lidSkirtHeight').value,5,50);
  addPanel(group,lidW,t,lidD,0,h+t/2,0,wood);
  const skirtY=h-skirtH/2;
  // Quatro abas com dentes alternados nas extremidades para travar os cantos.
  addLidSkirt(group,lidW,skirtH,t,n,true,0,skirtY,-(d/2+t/2+gap),0,wood);
  addLidSkirt(group,lidW,skirtH,t,2,true,0,skirtY,(d/2+t/2+gap),0,wood);
  addLidSkirt(group,lidD,skirtH,t,n,false,-(w/2+t/2+gap),skirtY,0,-Math.PI/2,wood);
  addLidSkirt(group,lidD,skirtH,t,n,false,(w/2+t/2+gap),skirtY,0,Math.PI/2,wood);
  parent.add(group);return {pieces:5,group};
 }
 if(type==='inset'){
  const iw=Math.max(10,w-2*t-2*gap),id=Math.max(10,d-2*t-2*gap);
  addPanel(group,iw,t,id,0,h+t/2,0,wood);
  const lipY=h-t/2;
  addPanel(group,iw,t,t,0,lipY,-(id-t)/2,wood);
  addPanel(group,iw,t,t,0,lipY,(id-t)/2,wood);
  addPanel(group,t,t,Math.max(1,id-2*t),-(iw-t)/2,lipY,0,wood);
  addPanel(group,t,t,Math.max(1,id-2*t),(iw-t)/2,lipY,0,wood);
  parent.add(group);return {pieces:5,group};
 }
 return {pieces:0,group:null};
}
function rebuild(){
 const {w,d,h,t,n}=dims();const lidType=$('lidType').value,lidGap=+$('lidGap').value;scene.remove(model);model=new THREE.Group();scene.add(model);lidAssembly=null;lidOpen=false;lidTargetY=0;$('lidMoveBtn').disabled=lidType==='none';$('lidMoveBtn').textContent='↑ Retirar tampa';
 // Os encaixes verticais dos cantos alternam entre paredes frontais e laterais.
 // Os rasgos inferiores usam uma paridade local comum nas quatro paredes.
 // Cada borda usa 2*n+1 segmentos. Os n dentes ficam centralizados,
 // com uma margem de um passo em cada extremidade. Base e paredes usam o mesmo passo.
 // Como a divisão é ímpar, a inversão do sentido da borda traseira preserva a paridade.
 addSteppedWall(model,w,h,t,n,true,0,h/2,d/2-t/2,0,wood,false);
 addSteppedWall(model,w,h,t,n,true,0,h/2,-d/2+t/2,0,wood,false);
 addSteppedWall(model,d,h,t,n,false,w/2-t/2,h/2,0,-Math.PI/2,darkWood,false);
 addSteppedWall(model,d,h,t,n,false,-w/2+t/2,h/2,0,Math.PI/2,darkWood,false);
 // Fundo com dentes dimensionados pelo mesmo passo dos rasgos inferiores das paredes.
 addFingerBase(model,w-2*t,d-2*t,t,n);
 const lidResult=addLid(model,lidType,w,d,h,t,lidGap);lidAssembly=lidResult.group;const lidPieces=lidResult.pieces;
 model.traverse(o=>{if(o.isMesh)o.material.wireframe=state.wire;});
 $('dimensionText').textContent=`${w} × ${d} × ${h} mm`;
 $('pieceCount').textContent=`${5+lidPieces} peças`;$('materialText').textContent=`MDF ${t} mm`;updateFingerPreview();
}
function updateFingerPreview(){const n=dims().n,target=$('fingerPreview');target.innerHTML='';for(let i=0;i<n;i++){const el=document.createElement('i');if(state.mode==='manual'&&i>=state.manual[$('edge').value].length)el.style.opacity='.22';target.appendChild(el);} $('jointCount').textContent=state.mode==='auto'?`${n} pares de dedos`:`${state.manual[$('edge').value].length} posições salvas`;}
function wallPath(length,height,n,t,fullOnEven,kerf,bottomOnEven=true){
 const pts=wallPoints(length,height,n,t,fullOnEven,bottomOnEven);
 const minX=Math.min(...pts.map(p=>p[0])),minY=Math.min(...pts.map(p=>p[1]));
 return 'M '+pts.map(p=>`${(p[0]-minX+kerf).toFixed(3)} ${(p[1]-minY+kerf).toFixed(3)}`).join(' L ')+' Z';
}
function basePath(width,depth,count,thickness,kerf){
 const pts=basePoints(width,depth,count,thickness),minX=Math.min(...pts.map(p=>p[0])),minY=Math.min(...pts.map(p=>p[1]));
 return 'M '+pts.map(p=>`${(p[0]-minX+kerf).toFixed(3)} ${(p[1]-minY+kerf).toFixed(3)}`).join(' L ')+' Z';
}
function exportSVG(){
 const {w,d,h,t,n,k}=dims(),gap=12,kerf=k/2,lidType=$('lidType').value,lidGap=+$('lidGap').value;
 const panels=[
  ['Frente',w,h,wallPath(w,h,n,t,true,kerf,false)],
  ['Traseira',w,h,wallPath(w,h,n,t,true,kerf,true)],
  ['Lateral esquerda',d,h,wallPath(d,h,n,t,false,kerf,false)],
  ['Lateral direita',d,h,wallPath(d,h,n,t,false,kerf,true)],
  ['Fundo',w-2*t,d-2*t,basePath(w-2*t,d-2*t,n,t,kerf)]
 ];
 const rect=(name,pw,ph)=>panels.push([name,pw,ph,null]);
 if(lidType==='flat')rect('Tampa plana',w,d);
 if(lidType==='cap'){
  const lidW=w+2*t+2*lidGap,lidD=d+2*t+2*lidGap,skirtH=clamp(+$('lidSkirtHeight').value,5,50);
  rect('Tampa sobreposta',lidW,lidD);
  panels.push(['Aba frontal',lidW,skirtH,lidSkirtPath(lidW,skirtH,t,n,true,kerf)]);
  panels.push(['Aba traseira',lidW,skirtH,lidSkirtPath(lidW,skirtH,t,2,true,kerf)]);
  panels.push(['Aba esquerda',lidD,skirtH,lidSkirtPath(lidD,skirtH,t,n,false,kerf)]);
  panels.push(['Aba direita',lidD,skirtH,lidSkirtPath(lidD,skirtH,t,2,false,kerf)]);
 }
 if(lidType==='inset'){
  const iw=Math.max(10,w-2*t-2*lidGap),id=Math.max(10,d-2*t-2*lidGap);
  rect('Tampa interna',iw,id);rect('Aba frontal interna',iw,t);rect('Aba traseira interna',iw,t);
  rect('Aba esquerda interna',Math.max(1,id-2*t),t);rect('Aba direita interna',Math.max(1,id-2*t),t);
 }
 let x=10,y=10,rowH=0,maxW=0;const shapes=[];
 for(const [name,pw,ph,path] of panels){
  const bw=pw+2*kerf+4,bh=ph+2*kerf+4;
  if(x+bw>580){x=10;y+=rowH+gap;rowH=0;}
  const dPath=path||`M ${kerf} ${kerf} H ${(pw+kerf).toFixed(3)} V ${(ph+kerf).toFixed(3)} H ${kerf} Z`;
  shapes.push(`<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)})"><path d="${dPath}" fill="none" stroke="#ff0000" stroke-width="0.1"/>${$('dimensions').checked?`<text x="0" y="-3" font-size="3" fill="#777">${name} — ${pw} × ${ph} mm</text>`:''}</g>`);
  x+=bw+gap;rowH=Math.max(rowH,bh);maxW=Math.max(maxW,x);
 }
 const totalH=y+rowH+10,svg=`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${maxW.toFixed(2)}mm" height="${totalH.toFixed(2)}mm" viewBox="0 0 ${maxW.toFixed(2)} ${totalH.toFixed(2)}">${shapes.join('\n')}</svg>`;
 const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='laserbox-projeto.svg';a.click();URL.revokeObjectURL(url);toast('SVG exportado. Confira as peças antes do corte.');
}
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600);}
function resize(){const el=$('viewport'),w=el.clientWidth,h=el.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);}
const ro=new ResizeObserver(resize);ro.observe($('viewport'));resize();
function animate(){requestAnimationFrame(animate);if(lidAssembly){lidAssembly.position.y+=(lidTargetY-lidAssembly.position.y)*0.12;if(Math.abs(lidTargetY-lidAssembly.position.y)<0.03)lidAssembly.position.y=lidTargetY;}controls.update();renderer.render(scene,camera);}animate();
['width','depth','height','thickness','count','finger','kerf','lidGap','lidSkirtHeight'].forEach(id=>$(id).addEventListener('input',()=>{if(id==='count')$('countOut').textContent=$('count').value;if(id==='finger')$('fingerOut').textContent=$('finger').value;if(id==='kerf')$('kerfOut').textContent=Number($('kerf').value).toLocaleString('pt-BR');if(id==='lidGap')$('lidGapOut').textContent=Number($('lidGap').value).toLocaleString('pt-BR');if(id==='lidSkirtHeight')$('lidSkirtHeightOut').textContent=$('lidSkirtHeight').value;rebuild();}));
$('lidType').addEventListener('change',rebuild);
$('start').addEventListener('input',()=>$('startOut').textContent=$('start').value);
document.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>{state.mode=btn.dataset.mode;document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b===btn));$('manualTools').classList.toggle('hidden',state.mode!=='manual');updateFingerPreview();}));
$('edge').addEventListener('change',updateFingerPreview);
$('addFinger').addEventListener('click',()=>{const edge=$('edge').value;state.manual[edge].push(+$('start').value);updateFingerPreview();toast('Posição registrada. A edição manual geométrica será habilitada na próxima etapa.');});
$('clearFinger').addEventListener('click',()=>{state.manual[$('edge').value]=[];updateFingerPreview();toast('Posições salvas limpas.');});
$('exportBtn').addEventListener('click',exportSVG);
$('lidMoveBtn').addEventListener('click',()=>{if(!lidAssembly)return;lidOpen=!lidOpen;lidTargetY=lidOpen?Math.max(35,dims().h*0.8):0;$('lidMoveBtn').textContent=lidOpen?'↓ Recolocar tampa':'↑ Retirar tampa';});
$('resetView').addEventListener('click',()=>{camera.position.set(230,180,250);controls.target.set(0,30,0);controls.update();});
$('wireBtn').addEventListener('click',()=>{state.wire=!state.wire;model.traverse(o=>{if(o.isMesh)o.material.wireframe=state.wire;});});
rebuild();
