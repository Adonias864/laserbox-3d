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
function makeEdgeShape(width,height,tabCount,tabDepth,kind){
 const s=new THREE.Shape();const intervals=Math.max(2,tabCount*2);const step=height/intervals;
 const leftX=i=>kind==='male'?(i%2===0?-tabDepth:0):(i%2===0?tabDepth:0);
 const rightX=i=>kind==='male'?(i%2===0?width+tabDepth:width):(i%2===0?width-tabDepth:width);
 s.moveTo(0,0);s.lineTo(width,0);
 for(let i=0;i<intervals;i++){const y0=i*step,y1=(i+1)*step;s.lineTo(rightX(i),y0);s.lineTo(rightX(i),y1);}
 s.lineTo(0,height);
 for(let i=intervals-1;i>=0;i--){const y1=(i+1)*step,y0=i*step;s.lineTo(leftX(i),y1);s.lineTo(leftX(i),y0);}
 s.closePath();return s;
}
function addJointPanel(parent,width,height,thickness,tabCount,tabDepth,kind,x,y,z,rotation=0,mat=wood){
 const shape=makeEdgeShape(width,height,tabCount,tabDepth,kind);
 const geo=new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false,curveSegments:1,steps:1});
 geo.translate(-width/2,-height/2,-thickness/2);
 const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.rotation.y=rotation;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function addPanel(parent,w,h,depth,x,y,z,mat=wood){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,depth),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function rebuild(){
 const {w,d,h,t,n,f}=dims();scene.remove(model);model=new THREE.Group();scene.add(model);
 // Frente e traseira: bordas laterais macho; laterais: bordas complementares fêmea.
 const tabDepth=t;
 addJointPanel(model,w,h,t,n,tabDepth,'male',0,h/2,d/2-t/2,0,wood);
 addJointPanel(model,w,h,t,n,tabDepth,'male',0,h/2,-d/2+t/2,0,wood);
 addJointPanel(model,d-2*t,h,t,n,tabDepth,'female',w/2-t/2,h/2,0,Math.PI/2,darkWood);
 addJointPanel(model,d-2*t,h,t,n,tabDepth,'female',-w/2+t/2,h/2,0,Math.PI/2,darkWood);
 // Base e tampa ficam apoiadas entre as paredes; não recebem encaixes fictícios.
 addPanel(model,w-2*t,t,d-2*t,0,t/2,0,darkWood);
 if($('lid').checked)addPanel(model,w,t,d,0,h+t/2,0,wood);
 model.traverse(o=>{if(o.isMesh)o.material.wireframe=state.wire;});
 $('dimensionText').textContent=`${w} × ${d} × ${h} mm`;
 $('pieceCount').textContent=$('lid').checked?'6 peças':'5 peças';$('materialText').textContent=`MDF ${t} mm`;updateFingerPreview();
}
function updateFingerPreview(){const n=dims().n,target=$('fingerPreview');target.innerHTML='';for(let i=0;i<n;i++){const el=document.createElement('i');if(state.mode==='manual'&&i>=state.manual[$('edge').value].length)el.style.opacity='.22';target.appendChild(el);} $('jointCount').textContent=state.mode==='auto'?`${n} pares de dedos`:`${state.manual[$('edge').value].length} posições salvas`;}
function panelPath(w,h,n,t,kind,kerf){
 const count=Math.max(2,n*2),step=h/count,depth=t;
 const L=i=>kind==='male'?(i%2===0?-depth:0):(i%2===0?depth:0);
 const R=i=>kind==='male'?(i%2===0?w+depth:w):(i%2===0?w-depth:w);
 const pts=[[0,0],[w,0]];
 for(let i=0;i<count;i++)pts.push([R(i),i*step],[R(i),(i+1)*step]);
 pts.push([0,h]);for(let i=count-1;i>=0;i--)pts.push([L(i),(i+1)*step],[L(i),i*step]);
 const minX=Math.min(...pts.map(p=>p[0])),minY=0;
 return 'M '+pts.map(p=>`${(p[0]-minX+kerf).toFixed(3)} ${(p[1]-minY+kerf).toFixed(3)}`).join(' L ')+' Z';
}
function exportSVG(){
 const {w,d,h,t,n,k}=dims();const gap=12,panels=[['Frente',w,h,'male'],['Traseira',w,h,'male'],['Lateral esquerda',d-2*t,h,'female'],['Lateral direita',d-2*t,h,'female'],['Base',w-2*t,d-2*t,'plain']];
 if($('lid').checked)panels.push(['Tampa',w,d,'plain']);
 let x=10,y=10,rowH=0,maxW=0;const shapes=[];
 for(const [name,pw,ph,kind] of panels){
  const path=kind==='plain'?null:panelPath(pw,ph,n,t,kind,k/2);
  const bw=pw+(kind==='plain'?0:2*t)+2*k,bh=ph+2*k;
  if(x+bw>580){x=10;y+=rowH+gap;rowH=0;}
  const dPath=path||`M ${k} ${k} H ${(pw+k).toFixed(3)} V ${(ph+k).toFixed(3)} H ${k} Z`;
  shapes.push(`<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)})"><path d="${dPath}" fill="none" stroke="#ff0000" stroke-width="0.1"/>${$('dimensions').checked?`<text x="0" y="-3" font-size="3" fill="#777">${name} — ${pw} × ${ph} mm</text>`:''}</g>`);
  x+=bw+gap;rowH=Math.max(rowH,bh);maxW=Math.max(maxW,x);
 }
 const totalH=y+rowH+10,svg=`<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${maxW.toFixed(2)}mm" height="${totalH.toFixed(2)}mm" viewBox="0 0 ${maxW.toFixed(2)} ${totalH.toFixed(2)}">${shapes.join('\n')}</svg>`;
 const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='laserbox-projeto.svg';a.click();URL.revokeObjectURL(url);toast('SVG exportado. Faça teste em retalho antes do corte final.');
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
