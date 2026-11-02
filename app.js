import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const $=id=>document.getElementById(id);
const state={mode:'auto',manual:{front:[],back:[],left:[],right:[]},wire:false};
const scene=new THREE.Scene();scene.background=new THREE.Color('#111d2d');
const camera=new THREE.PerspectiveCamera(38,1,.1,3000);camera.position.set(230,180,250);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
$('viewport').appendChild(renderer.domElement);
$('viewport').querySelector('.loading')?.remove();
renderer.domElement.style.touchAction='none';
const controls=new OrbitControls(camera,renderer.domElement);controls.enabled=true;controls.enableRotate=true;controls.enablePan=true;controls.enableZoom=true;controls.enableDamping=true;controls.screenSpacePanning=true;controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN};controls.target.set(0,30,0);
scene.add(new THREE.HemisphereLight(0xc8ddf5,0x342719,2));
const key=new THREE.DirectionalLight(0xffe1b5,3);key.position.set(150,240,180);key.castShadow=true;scene.add(key);
const fill=new THREE.DirectionalLight(0x86b9ee,1.2);fill.position.set(-160,80,-120);scene.add(fill);
const grid=new THREE.GridHelper(500,25,0x3b5069,0x25374b);grid.position.y=-1;scene.add(grid);
let model=new THREE.Group();scene.add(model);let boxWire=null;
const wood=new THREE.MeshStandardMaterial({color:0xc99155,roughness:.72,metalness:0});
const darkWood=new THREE.MeshStandardMaterial({color:0x9d693a,roughness:.8});
function dims(){return {w:clamp(+$('width').value,30,600),d:clamp(+$('depth').value,30,600),h:clamp(+$('height').value,20,500),t:clamp(+$('thickness').value,2,12),n:clamp(+$('count').value,1,16),f:clamp(+$('finger').value,3,30),k:+$('kerf').value};}
function clamp(v,a,b){return Math.max(a,Math.min(b,Number.isFinite(v)?v:a));}
function addPanel(parent,w,h,depth,x,y,z,mat=wood){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,depth),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function rebuild(){const {w,d,h,t,n,f}=dims();scene.remove(model);model=new THREE.Group();scene.add(model);
 addPanel(model,w,h,t,0,h/2,d/2-t/2);addPanel(model,w,h,t,0,h/2,-d/2+t/2);
 addPanel(model,t,h,d-t,t/2,h/2,0,darkWood);addPanel(model,t,h,d-t,-w/2+t/2,h/2,0,darkWood);
 addPanel(model,w-2*t,t,d-2*t,0,t/2,0,darkWood);
 if($('lid').checked)addPanel(model,w,t,d,0,h+t/2,0,wood);
 // visual finger-joint markers along the front edge
 const tabWidth=Math.min(f,w/(n*1.5));for(let i=0;i<n;i++){const x=-w/2+(i+.5)*w/n;const tab=addPanel(model,tabWidth,Math.max(t*.9,2),t*1.15,x,h/2,d/2+t*.15,i%2?darkWood:wood);tab.position.y=h/2; }
 const edges=new THREE.EdgesGeometry(new THREE.BoxGeometry(w,h+( $('lid').checked?t:0),d));boxWire=new THREE.LineSegments(edges,new THREE.LineBasicMaterial({color:0xf1c27e,transparent:true,opacity:.5}));boxWire.position.y=(h+( $('lid').checked?t:0))/2;model.add(boxWire);
 model.traverse(o=>{if(o.isMesh)o.material.wireframe=state.wire;});
 $('dimensionText').textContent=`${w} × ${d} × ${h} mm`;$('pieceCount').textContent=$('lid').checked?'6 peças':'5 peças';$('materialText').textContent=`MDF ${t} mm`;
 updateFingerPreview();
}
function updateFingerPreview(){const n=dims().n;const target=$('fingerPreview');target.innerHTML='';for(let i=0;i<n;i++){const el=document.createElement('i');if(state.mode==='manual'&&i>=state.manual[$('edge').value].length)el.style.opacity='.22';target.appendChild(el);} $('jointCount').textContent=state.mode==='auto'?`${n} dedos`:`${state.manual[$('edge').value].length} personalizados`;}
function svgPath(w,h,tabs,kerf){const tab=Math.max(2,Math.min(dims().f,w/(tabs*1.5)));let pts=[[-w/2,-h/2]];const addEdge=(x1,y1,x2,y2,count,normal)=>{for(let i=0;i<count;i++){const a=i/count,b=(i+.5)/count,c=(i+1)/count;const p=(q)=>[x1+(x2-x1)*q,y1+(y2-y1)*q];const p1=p(a),pm=p(b),p2=p(c);pts.push(p1);if(i%2===0){pts.push([pm[0]+normal[0]*tab,pm[1]+normal[1]*tab]);}pts.push(p2);}};pts=[[-w/2,-h/2]];addEdge(-w/2,-h/2,w/2,-h/2,tabs,[0,-1]);addEdge(w/2,-h/2,w/2,h/2,Math.max(2,Math.round(h/dims().f)),[1,0]);addEdge(w/2,h/2,-w/2,h/2,tabs,[0,1]);addEdge(-w/2,h/2,-w/2,-h/2,Math.max(2,Math.round(h/dims().f)),[-1,0]);const minX=Math.min(...pts.map(p=>p[0])),minY=Math.min(...pts.map(p=>p[1]));return 'M '+pts.map(p=>`${(p[0]-minX+kerf).toFixed(3)} ${(p[1]-minY+kerf).toFixed(3)}`).join(' L ')+' Z';}
function exportSVG(){const {w,d,h,t,n,k}=dims();const gap=12,panels=[['Frente',w,h],['Traseira',w,h],['Lateral esquerda',d-2*t,h],['Lateral direita',d-2*t,h],['Base',w-2*t,d-2*t]];if($('lid').checked)panels.push(['Tampa',w,d]);let x=10,y=10,rowH=0,maxW=0;const shapes=[];for(const [name,pw,ph] of panels){const path=svgPath(pw,ph,Math.max(2,Math.min(n,Math.floor(pw/Math.max(2,dims().f)))),k);const boundsW=pw+2*dims().f+2*k,boundsH=ph+2*dims().f+2*k;if(x+boundsW>580){x=10;y+=rowH+gap;rowH=0;}shapes.push(`<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)})"><path d="${path}" fill="none" stroke="#ff0000" stroke-width="0.1"/>${$('dimensions').checked?`<text x="0" y="-3" font-size="3" fill="#777">${name} — ${pw} × ${ph} mm</text>`:''}</g>`);x+=boundsW+gap;rowH=Math.max(rowH,boundsH);maxW=Math.max(maxW,x);}const totalH=y+rowH+10;const svg=`<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${maxW.toFixed(2)}mm" height="${totalH.toFixed(2)}mm" viewBox="0 0 ${maxW.toFixed(2)} ${totalH.toFixed(2)}">${shapes.join('\n')}</svg>`;const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='laserbox-projeto.svg';a.click();URL.revokeObjectURL(url);toast('SVG exportado! Confira o arquivo antes do corte.');}
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2600);}
function resize(){const el=$('viewport');const w=el.clientWidth,h=el.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);}
const ro=new ResizeObserver(resize);ro.observe($('viewport'));resize();
function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);}animate();
['width','depth','height','thickness','count','finger','kerf','lid'].forEach(id=>$(id).addEventListener('input',()=>{if(id==='count')$('countOut').textContent=$('count').value;if(id==='finger')$('fingerOut').textContent=$('finger').value;if(id==='kerf')$('kerfOut').textContent=Number($('kerf').value).toLocaleString('pt-BR');rebuild();}));
$('start').addEventListener('input',()=>$('startOut').textContent=$('start').value);
document.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>{state.mode=btn.dataset.mode;document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b===btn));$('manualTools').classList.toggle('hidden',state.mode!=='manual');updateFingerPreview();}));
$('edge').addEventListener('change',updateFingerPreview);
$('addFinger').addEventListener('click',()=>{const edge=$('edge').value;state.manual[edge].push(+$('start').value);updateFingerPreview();toast('Dedo adicionado à borda '+edge+'.');});
$('clearFinger').addEventListener('click',()=>{state.manual[$('edge').value]=[];updateFingerPreview();toast('Borda personalizada limpa.');});
$('exportBtn').addEventListener('click',exportSVG);
$('resetView').addEventListener('click',()=>{camera.position.set(230,180,250);controls.target.set(0,30,0);controls.update();});
$('wireBtn').addEventListener('click',()=>{state.wire=!state.wire;model.traverse(o=>{if(o.isMesh)o.material.wireframe=state.wire;});});
rebuild();
