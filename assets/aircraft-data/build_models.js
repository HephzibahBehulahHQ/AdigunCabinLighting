function makeCabin(record) {
 const interior=record.interior, ex=record.exterior;
 const isBoeing=record.manufacturer==='Boeing', wide=/777|787|A330|A350|A380/.test(record.model), vip=/G650/.test(record.model);
 const width=interior.maximum_cabin_width_m || interior.main_deck_maximum_cabin_width_m || interior.finished_cabin_width_m || (/777/.test(record.model)?5.86:/787/.test(record.model)?5.49:3.54);
 const length=interior.published_cabin_length_m || interior.cabin_length_excluding_baggage_m || +(ex.overall_length_m*(wide?.76:.72)).toFixed(2);
 const height=interior.finished_cabin_height_m || (vip?1.91:wide?2.45:2.12);
 const assumptions=[];
 if(!interior.maximum_cabin_width_m&&!interior.main_deck_maximum_cabin_width_m&&!interior.finished_cabin_width_m)assumptions.push('Cabin width is a modeling assumption; not established by the cited manufacturer record.');
 if(!interior.published_cabin_length_m&&!interior.cabin_length_excluding_baggage_m)assumptions.push('Cabin length is estimated from exterior length.');
 if(!interior.finished_cabin_height_m)assumptions.push('Cabin height is a modeling assumption.');
 assumptions.push('Seat geometry, pitch, window spacing, bins, bulkheads and fixture positions are authored simulation geometry; not measured OEM or airline-specific CAD.');
 const binary=[], views=[],accessors=[],meshes=[],nodes=[],materials=[],cache=new Map(); let bytes=0;
 function material(name,col,metal=0,rough=.6,emission){let m={name,pbrMetallicRoughness:{baseColorFactor:[...col,1],metallicFactor:metal,roughnessFactor:rough},doubleSided:true};if(emission)m.emissiveFactor=emission;materials.push(m);return materials.length-1;}
 const wall=material('Ivory molded cabin lining',[.77,.78,.80]),seat=material('Navy woven upholstery',[.035,.075,.135],0,.9),leather=material('Pearl seat headrest',[.48,.53,.60],0,.48),floor=material('Charcoal aisle carpet',[.035,.045,.065],0,1),metal=material('Brushed aluminum',[.5,.55,.61],.85,.24),dark=material('Seat frames and recesses',[.018,.025,.035]),glass=material('Window glass',[.055,.18,.30],.35,.15),wood=material('Walnut consoles',[.12,.055,.025],.1,.32),seam=material('Upholstery stitching',[.17,.23,.31],0,.9);
 const emit={};for(const [n,c]of Object.entries({ceiling_cove:[.5,.12,1],left_sidewall:[.02,.75,1],right_sidewall:[.55,.08,1],footwell:[.02,.6,.5]}))emit[n]=material(n,c,0,.4,c);
 function buffer(arr,type,comp){let pad=(4-bytes%4)%4;if(pad){binary.push(new Uint8Array(pad));bytes+=pad;}const v=new Uint8Array(arr.buffer,arr.byteOffset,arr.byteLength);views.push({buffer:0,byteOffset:bytes,byteLength:v.length});binary.push(v);bytes+=v.length;const a={bufferView:views.length-1,componentType:comp,count:arr.length/(type==='VEC3'?3:1),type};if(type==='VEC3'){a.min=[Infinity,Infinity,Infinity];a.max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<arr.length;i++){a.min[i%3]=Math.min(a.min[i%3],arr[i]);a.max[i%3]=Math.max(a.max[i%3],arr[i]);}}accessors.push(a);return accessors.length-1;}
 function mesh(name,v,f,mat){const ns=new Float32Array(v.length);for(let i=0;i<f.length;i+=3){const a=f[i]*3,b=f[i+1]*3,c=f[i+2]*3,ab=[v[b]-v[a],v[b+1]-v[a+1],v[b+2]-v[a+2]],ac=[v[c]-v[a],v[c+1]-v[a+1],v[c+2]-v[a+2]],n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];for(const k of[a,b,c])for(let j=0;j<3;j++)ns[k+j]+=n[j];}for(let i=0;i<ns.length;i+=3){const s=Math.hypot(ns[i],ns[i+1],ns[i+2])||1;for(let j=0;j<3;j++)ns[i+j]/=s;}const position=buffer(new Float32Array(v),'VEC3',5126),normal=buffer(ns,'VEC3',5126),indices=buffer(new Uint32Array(f),'SCALAR',5125);meshes.push({name,primitives:[{attributes:{POSITION:position,NORMAL:normal},indices,material:mat}]});return meshes.length-1;}
 function instance(name,index,pos=[0,0,0]){nodes.push({name,mesh:index,translation:pos});}
 function rounded(name,size,mat,r=.035){let key=JSON.stringify([size,mat,r]);if(cache.has(key))return cache.get(key);const v=[],f=[],h=size.map(a=>a/2);r=Math.min(r,...h.map(x=>x*.8));const N=5;for(let axis=0;axis<3;axis++)for(const sign of[-1,1]){const other=[0,1,2].filter(a=>a!==axis),start=v.length/3;for(let i=0;i<=N;i++)for(let j=0;j<=N;j++){let p=[0,0,0];p[axis]=sign*h[axis];p[other[0]]=(2*i/N-1)*h[other[0]];p[other[1]]=(2*j/N-1)*h[other[1]];const q=p.map((x,k)=>Math.max(-h[k]+r,Math.min(h[k]-r,x))),d=p.map((x,k)=>x-q[k]),l=Math.hypot(...d);v.push(...p.map((x,k)=>q[k]+d[k]/l*r));}for(let i=0;i<N;i++)for(let j=0;j<N;j++){const a=start+i*(N+1)+j,b=a+N+1,c=b+1,d=a+1;const t=axis===1?-sign:sign;if(t>0)f.push(a,b,c,a,c,d);else f.push(a,c,b,a,d,c);}}const m=mesh(name,v,f,mat);cache.set(key,m);return m;}
 function box(name,center,size,mat,r=.035){instance(name,rounded(name,size,mat,r),center);}
 function tube(name,points,r,mat,sides=6){const v=[],f=[];for(let i=0;i<points.length;i++){const p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],t=b.map((x,k)=>x-a[k]),tl=Math.hypot(...t)||1;for(let k=0;k<3;k++)t[k]/=tl;let u=Math.abs(t[1])<.9?[-t[2],0,t[0]]:[0,t[2],-t[1]],ul=Math.hypot(...u)||1;u=u.map(x=>x/ul);const w=[t[1]*u[2]-t[2]*u[1],t[2]*u[0]-t[0]*u[2],t[0]*u[1]-t[1]*u[0]];for(let j=0;j<sides;j++){let ang=2*Math.PI*j/sides;v.push(...p.map((x,k)=>x+r*(u[k]*Math.cos(ang)+w[k]*Math.sin(ang))));}}for(let i=0;i<points.length-1;i++)for(let j=0;j<sides;j++){const a=i*sides+j,b=i*sides+(j+1)%sides;f.push(a,b,b+sides,a,b+sides,a+sides);}return mesh(name,v,f,mat);}
 box('Carpet floor',[0,-.045,0],[width*.90,.09,length],floor);
 const bay=.76,bays=Math.floor(length/bay),cy=height*.36,ry=height*.64;
 for(const side of[-1,1]){
  const v=[],f=[],nz=20,nt=44;
  for(let iz=0;iz<=nz;iz++)for(let it=0;it<=nt;it++){let t=-.55+(Math.PI/2+.55)*it/nt;v.push(side*width/2*Math.cos(t),cy+ry*Math.sin(t),-bay/2+bay*iz/nz);}
  for(let iz=0;iz<nz;iz++)for(let it=0;it<nt;it++){let t=-.55+(Math.PI/2+.55)*(it+.5)/nt,y=cy+ry*Math.sin(t),z=-bay/2+bay*(iz+.5)/nz;if((z/.145)**2+((y-height*.57)/.22)**2<1)continue;let a=iz*(nt+1)+it,b=a+nt+1,c=b+1,d=a+1;if(side<0)f.push(a,b,c,a,c,d);else f.push(a,c,b,a,d,c);}
  const shell=mesh('Curved window bay '+side,v,f,wall);
  const oval=[];for(let i=0;i<=48;i++){let a=2*Math.PI*i/48,y=height*.57+.22*Math.sin(a),x=side*width/2*Math.sqrt(Math.max(0,1-((y-cy)/ry)**2));oval.push([x-side*.015,y,.145*Math.cos(a)]);}
  const trim=tube('Recessed oval window frame '+side,oval,.018,leather,8),gv=[side*(width/2-.055),height*.57,0],gf=[];
  for(let i=0;i<=48;i++){const p=oval[i];gv.push(p[0]+side*.012,p[1],p[2]);if(i<48)gf.push(0,i+1,i+2);}
  const pane=mesh('Window glazing '+side,gv,gf,glass);
  for(let b=0;b<bays;b++){const z=-length/2+bay*(b+.5);instance('Cabin wall bay '+side+' '+b,shell,[0,0,z]);instance('Oval window frame '+side+' '+b,trim,[0,0,z]);instance('Window glass '+side+' '+b,pane,[0,0,z]);}
  box('Window sill '+side,[side*width*.455,height*.37,0],[.10,.08,length],wall);
  box('Lower sidewall '+side,[side*width*.46,height*.16,0],[.055,height*.32,length],wall);
  box('Sidewall light '+side,[side*width*.448,height*.39,0],[.018,.02,length-.1],side<0?emit.left_sidewall:emit.right_sidewall,.005);
  box('Ceiling cove '+side,[side*width*.30,height*.87,0],[.025,.025,length-.1],emit.ceiling_cove,.006);
  box('Footwell '+side,[side*width*.39,.05,0],[.025,.02,length-.1],emit.footwell,.005);
  if(!vip)for(let z=-length/2+.7;z<length/2-.4;z+=1.2){box('Overhead luggage bin '+side,[side*width*.33,height*.79,z],[.50,.32,1.17],wall,.10);box('Bin door handle '+side,[side*width*.29,height*.70,z],[.13,.018,.025],metal,.008);}
 }
 // Reusable seat geometry, instanced rather than duplicated vertex buffers.
 const seatWidth=vip?.62:.445,pitch=vip?1.75:.81;
 let xs;
 if(vip)xs=[-width*.27,width*.27];
 else if(/A220/.test(record.model))xs=[-1.08,-.60,.42,.90,1.38].map(x=>x*width/3.28);
 else if(!wide)xs=[-1.37,-.91,-.45,.45,.91,1.37].map(x=>x*width/3.70);
 else {const groups=/A330/.test(record.model)?[2,4,2]:/777|A380/.test(record.model)?[3,4,3]:[3,3,3];const sw=.46,aw=.52,total=groups.reduce((a,b)=>a+b,0)*sw+2*aw;let x=-total/2;xs=[];for(let g=0;g<groups.length;g++){for(let i=0;i<groups[g];i++)xs.push(x+sw*(i+.5));x+=groups[g]*sw+aw;}}
 const parts=[['frame',[0,.23,0],[seatWidth*.86,.35,.49],dark,.035],['cushion',[0,.48,0],[seatWidth,.16,.49],seat,.065],['backrest',[0,.88,-.20],[seatWidth,.76,.13],seat,.06],['headrest',[0,1.27,-.19],[seatWidth*.78,.23,.16],leather,.06],['left arm',[-seatWidth/2-.025,.65,.015],[.055,.07,.53],leather,.025],['right arm',[seatWidth/2+.025,.65,.015],[.055,.07,.53],leather,.025],['tray table',[0,.88,-.278],[seatWidth*.74,.29,.018],dark,.015],['seatback screen',[0,1.11,-.278],[seatWidth*.61,.17,.018],glass,.01],['left pedestal',[-seatWidth*.3,.16,0],[.025,.27,.33],metal,.01],['right pedestal',[seatWidth*.3,.16,0],[.025,.27,.33],metal,.01]];
 const quilting=[];for(const slope of[-1,1])for(let off=-.5;off<.6;off+=.10){const pts=[];for(let j=0;j<=24;j++){let y=.63+j*.53/24,x=off+slope*(y-.87)*.5;if(Math.abs(x)<seatWidth*.41)pts.push([x,y,-.126]);}if(pts.length>1)quilting.push(tube('Seat diamond seam',pts,.0016,seam,4));}
 const rows=Math.max(1,Math.floor((length-4)/pitch));for(let row=0;row<rows;row++)for(let i=0;i<xs.length;i++){const x=xs[i],z=-length/2+2.2+row*pitch,name='Seat row '+(row+1)+' position '+(i+1);for(const [part,offset,size,mat,r]of parts)instance(name+' '+part,rounded(part,size,mat,r),[x+offset[0],offset[1],z+offset[2]]);for(const m of quilting)instance(name+' stitching',m,[x,0,z]);}
 for(const z of[-length/2+.15,length/2-.15]){box('Bulkhead left',[-width*.32,height*.46,z],[width*.30,height*.92,.08],wall);box('Bulkhead right',[width*.32,height*.46,z],[width*.30,height*.92,.08],wall);box('Galley module',[-width*.29,.65,z+(z<0?.5:-.5)],[width*.26,1.25,.6],wall,.045);}
 if(vip)for(const side of[-1,1])box('VIP side console '+side,[side*width*.40,.68,0],[.21,.12,length-.4],wood,.035);
 const lights=[];for(let i=0;i<8;i++){let z=-length/2+(i+.5)*length/8;for(const [x,c,zone]of[[-width*.28,[.04,.6,1],'left_sidewall'],[width*.28,[.55,.1,1],'right_sidewall']]){lights.push({name:zone,type:'point',color:c,intensity:22,range:5});nodes.push({name:zone+' fixture '+i,translation:[x,height*.72,z],extensions:{KHR_lights_punctual:{light:lights.length-1}}});}}
 nodes.push({name:'Aisle camera',camera:0,translation:[0,Math.min(1.6,height*.7),length/2-1]});
 const metadata={aircraft_id:record.id,units:'meters',scope:/A380/.test(record.model)?'main_deck_cabin_only':'passenger_cabin',mode:'SIMULATION',source:record.source.url,published_dimensions:record,modeled_dimensions_m:{length,width,height},assumptions,seat_count:rows*xs.length,rows,seats_per_row:xs.length,airline_configuration_id:null};
 const gltf={asset:{version:'2.0',generator:'AdigunCabinLighting dimension-based cabin builder',extras:metadata},scene:0,scenes:[{name:record.model+' cabin simulation',nodes:nodes.map((_,i)=>i)}],nodes,meshes,materials,bufferViews:views,accessors,buffers:[{byteLength:bytes}],cameras:[{type:'perspective',perspective:{yfov:1.05,znear:.03,zfar:200}}],extensionsUsed:['KHR_lights_punctual'],extensions:{KHR_lights_punctual:{lights}}};
 const enc=new TextEncoder(),json=enc.encode(JSON.stringify(gltf)),jp=(4-json.length%4)%4,bp=(4-bytes%4)%4,total=12+8+json.length+jp+8+bytes+bp,result=new Uint8Array(total),dv=new DataView(result.buffer);dv.setUint32(0,0x46546c67,true);dv.setUint32(4,2,true);dv.setUint32(8,total,true);dv.setUint32(12,json.length+jp,true);dv.setUint32(16,0x4e4f534a,true);result.set(json,20);result.fill(32,20+json.length,20+json.length+jp);let off=20+json.length+jp;dv.setUint32(off,bytes+bp,true);dv.setUint32(off+4,0x004e4942,true);off+=8;for(const b of binary){result.set(b,off);off+=b.length;}
 if(dv.getUint32(8,true)!==result.length)throw Error('Invalid GLB size');
 const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let base64='';for(let i=0;i<result.length;i+=3){const a=result[i],b=result[i+1]||0,c=result[i+2]||0,n=(a<<16)|(b<<8)|c;base64+=chars[(n>>>18)&63]+chars[(n>>>12)&63]+(i+1<result.length?chars[(n>>>6)&63]:'=')+(i+2<result.length?chars[n&63]:'=');}
 return {base64,metadata,stats:{bytes:result.length,meshes:meshes.length,nodes:nodes.length,triangles:accessors.filter(a=>a.type==='SCALAR').reduce((a,b)=>a+b.count/3,0)}};
}

if (typeof require !== 'undefined' && require.main === module) {
 const fs = require('fs'), path = require('path');
 const root = __dirname, catalog = JSON.parse(fs.readFileSync(path.join(root, 'aircraft-dimensions.json'), 'utf8'));
 fs.mkdirSync(path.join(root, 'meshes'), { recursive: true });
 const models = [];
 for (const record of catalog.aircraft) {
  const model = makeCabin(record);
  const file = 'meshes/' + record.id + '.glb';
  fs.writeFileSync(path.join(root, file), Buffer.from(model.base64, 'base64'));
  models.push({ file, ...model.stats, ...model.metadata });
 }
 fs.writeFileSync(path.join(root, 'mesh-manifest.json'), JSON.stringify({ models }, null, 2));
 console.log('Generated', models.length, 'GLB cabin meshes.');
}
