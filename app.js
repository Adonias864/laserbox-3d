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
const wood=new THREE.MeshStandardMaterial({color:0xc99155,roughness:.72,side:THREE.DoubleSide});
const darkWood=new THREE.MeshStandardMaterial({color:0x9d693a,roughness:.8,side:THREE.DoubleSide});
function dims(){return {w:clamp(+$('width').value,30,600),d:clamp(+$('depth').value,30,600),h:clamp(+$('height').value,20,500),t:clamp(+$('thickness').value,2,12),n:clamp(+$('count').value,2,16),f:clamp(+$('finger').value,3,30),k:+$('kerf').value};}
function wallPoints(length,height,count,thickness,fullOnEven){
 const bands=Math.max(4,count*2),bh=height/bands,pts=[];
 const inset=i=>((i%2===0)===fullOnEven)?0:thickness;
 pts.push([inset(0),0],[length-inset(0),0]);
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
function makeWallShape(length,height,count,thickness,fullOnEven){
 const pts=wallPoints(length,height,count,thickness,fullOnEven),s=new THREE.Shape();
 s.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)s.lineTo(pts[i][0],pts[i][1]);s.closePath();return s;
}
function addSteppedWall(parent,length,height,thickness,count,fullOnEven,x,y,z,rotation,mat){
 const shape=makeWallShape(length,height,count,thickness,fullOnEven);
 const geo=new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false,curveSegments:1,steps:1});
 geo.translate(-length/2,-height/2,-thickness/2);
 const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.rotation.y=rotation;
 mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function addPanel(parent,w,h,depth,x,y,z,mat=wood){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,depth),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function rebuild(){
 const {w,d,h,t,n}=dims();scene.remove(model);model=new THREE.Group();scene.add(model);
 // Cada canto alterna qual parede atravessa a espessura da outra.
 // Frente/traseira são inteiras nas bandas pares; laterais nas ímpares.
 addSteppedWall(model,w,h,t,n,true,0,h/2,d/2-t/2,0,wood);
 addSteppedWall(model,w,h,t,n,true,0,h/2,-d/2+t/2,0,wood);
 addSteppedWall(model,d,h,t,n,false,w/2-t/2,h/2,0,Math.PI/2,darkWood);
 addSteppedWall(model,d,h,t,n,false,-w/2+t/2,h/2,0,Math.PI/2,darkWood);
 // Fundo interno plano, apoiado nas quatro paredes. O encaixe inferior será
 // tratado como uma etapa própria, sem fingir que os rasgos atuais são válidos.
 addPanel(model,w-2*t,t,d-2*t,0,t/2,0,darkWood);
 if($('lid').checked)addPanel(model,w,t,d,0,h+t/2,0,wood);
 model.traverse(o=>{if(o.isMesh)o.material.wireframe=state.wire;});
 $('dimensionText').textContent=`${w} × ${d} × ${h} mm`;
 $('pieceCount').textContent=$('lid').checked?'6 peças':'5 peças';$('materialText').textContent=`MDF ${t} mm`;updateFingerPreview();
}
function updateFingerPreview(){const n=dims().n,target=$('fingerPreview');target.innerHTML='';for(let i=0;i<n;i++){const el=document.createElement('i');if(state.mode==='manual'&&i>=state.manual[$('edge').value].length)el.style.opacity='.22';target.appendChild(el);} $('jointCount').textContent=state.mode==='auto'?`${n} pares de dedos`:`${state.manual[$('edge').value].length} posições salvas`;}
function wallPath(length,height,n,t,fullOnEven,kerf){
 const pts=wallPoints(length,height,n,t,fullOnEven);
 const minX=Math.min(...pts.map(p=>p[0])),minY=Math.min(...pts.map(p=>p[1]));
 return 'M '+pts.map(p=>`${(p[0]-minX+kerf).toFixed(3)} ${(p[1]-minY+kerf).toFixed(3)}`).join(' L ')+' Z';
}
function exportSVG(){
 const {w,d,h,t,n,k}=dims(),gap=12,kerf=k/2;
 const panels=[
  ['Frente',w,h,wallPath(w,h,n,t,true,kerf)],
  ['Traseira',w,h,wallPath(w,h,n,t,true,kerf)],
  ['Lateral esquerda',d,h,wallPath(d,h,n,t,false,kerf)],
  ['Lateral direita',d,h,wallPath(d,h,n,t,false,kerf)],
  ['Fundo',w-2*t,d-2*t,null]
 ];
 if($('lid').checked)panels.push(['Tampa',w,d,null]);
 let x=10,y=10,rowH=0,maxW=0;const shapes=[];
 for(const [name,pw,ph,path] of panels){
  const bw=pw+2*kerf+4,bh=ph+2*kerf+4;
  if(x+bw>580){x=10;y+=rowH+gap;rowH=0;}
  const dPath=path||`M ${kerf} ${kerf} H ${(pw+kerf).toFixed(3)} V ${(ph+kerf).toFixed(3)} H ${kerf} Z`;
  shapes.push(`<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)})"><path d="${dPath}" fill="none" stroke="#ff0000" stroke-width="0.1"/>${$('dimensions').checked?`<text x="0" y="-3" font-size="3" fill="#777">${name} — ${pw} × ${ph} mm</text>`:''}</g>`);
  x+=bw+gap;rowH=Math.max(rowH,bh);maxW=Math.max(maxW,x);
 }
 const totalH=y+rowH+10,svg=`<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${maxW.toFixed(2)}mm" height="${totalH.toFixed(2)}mm" viewBox="0 0 ${maxW.toFixed(2)} ${totalH.toFixed(2)}">${shapes.join('\n')}</svg>`;
 const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='laserbox-projeto.svg';a.click();URL.revokeObjectURL(url);toast('SVG exportado. Confira as peças antes do corte.');
}
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600);}
function resize(){const el=$('viewport'),w=el.clientWidth,h=el.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);}
const ro=new ResizeObserver(resize);ro.observe($('viewport'));resize();
function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);}animate();
['width','depth','height','thickness','count','finger','kerf','lid'].forEach(id=>$(id).addEventListener('input',()=>{if(id==='count')$('countOut').textContent=$('count').value;if(id==='finger')$('fingerOut').textContent=$('finger').value;if(id==='kerf')$('kerfOut').textContent=Number($('kerf').value).toLocaleString('pt-BR');rebuild();}));
$('start').addEventListener('input',()=>$('startOut').textContent=$('start').value);
document.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>{state.mode=btn.dataset.mode;document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b===btn));$('manualTools').classList.toggle('hidden',state.mode!=='manual');updateFingerPreview();}));
$('edge').addEventListener('change',updateFingerPreview);
$('addFinger').addEventListener('click',()=>{const edge=$('edge').value;state.manual[edge].push(+$('start').value);updateFingerPreview();toast('Posição registrada. A edição manual geométrica será habilitada na próxima etapa.');});
$('clearFinger').addEventListener('click',()=>{state.manual[$('edge').value]=[];updateFingerPreview();toast('Posições salvas limpas.');});
$('exportBtn').addEventListener('click',exportSVG);
$('resetView').addEventListener('click',()=>{camera.position.set(230,180,250);controls.target.set(0,30,0);controls.update();});
$('wireBtn').addEventListener('click',()=>{state.wire=!state.wire;model.traverse(o=>{if(o.isMesh)o.material.wireframe=state.wire;});});
rebuild();
