import { getLoungeIdentity, loungeJson, type LoungeEnv } from './lounge-platform.js';
type Row={id:string;user_sub:string;author:string;title:string;description:string;category:string;tags:string;content:string;created_at:string;updated_at:string;image_url?:string};
export async function handlePrompts(request:Request,env:LoungeEnv):Promise<Response|null>{
 const url=new URL(request.url);
 const media=url.pathname.match(/^\/lounge\/prompt-images\/([0-9a-f-]{36})$/);
 if(media){
  if(request.method!=='GET')return loungeJson(request,{error:'method_not_allowed'},405);
  // Only covers referenced by public prompt posts can be served from this namespace.
  const referenced=await env.DB.prepare('SELECT id FROM lounge_prompt_posts WHERE image_url=? LIMIT 1').bind(url.origin+url.pathname).first();
  if(!referenced)return loungeJson(request,{error:'not_found'},404);
  const object=await env.PRIVATE_REPORTS?.get('lounge/prompt-images/'+media[1]+'.jpg');
  if(!object)return loungeJson(request,{error:'not_found'},404);
  return new Response(object.body||await object.arrayBuffer(),{headers:{'Content-Type':'image/jpeg','Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'}});
 }
 if(!url.pathname.startsWith('/lounge/prompts'))return null;
 const match=url.pathname.match(/^\/lounge\/prompts(?:\/([0-9a-f-]{36}))?$/);if(!match)return loungeJson(request,{error:'not_found'},404);
 const id=match[1];const user=await getLoungeIdentity(request,env);
 const removeUnusedCover=async(value:string|undefined)=>{if(!value)return;let parsed:URL;try{parsed=new URL(value);}catch{return;}const m=parsed.pathname.match(/^\/lounge\/prompt-images\/([0-9a-f-]{36})$/);if(parsed.origin!==url.origin||!m)return;try{const used=await env.DB.prepare('SELECT id FROM lounge_prompt_posts WHERE image_url=? LIMIT 1').bind(value).first();if(!used)await env.PRIVATE_REPORTS?.delete('lounge/prompt-images/'+m[1]+'.jpg');}catch{}};
 const can=(r:Row)=>!!user&&(user.isAdmin||r.user_sub===user.sub);
 const view=(r:Row)=>({id:r.id,author:r.author,title:r.title,description:r.description,category:r.category,tags:JSON.parse(r.tags),content:r.content,createdAt:r.created_at,updatedAt:r.updated_at,canEdit:can(r),imageUrl:r.image_url||''});
 if(request.method==='GET'&&!id){
  const q=(url.searchParams.get('q')||'').slice(0,120),category=(url.searchParams.get('category')||'').slice(0,40);
  const page=Math.max(1,Math.min(100000,parseInt(url.searchParams.get('page')||'1')||1));
  const where="WHERE (?='' OR instr(lower(title||' '||description||' '||tags||' '||content),lower(?))>0) AND (?='' OR category=?)";
  const total=await env.DB.prepare('SELECT count(*) AS n FROM lounge_prompt_posts '+where).bind(q,q,category,category).first<{n:number}>();
  const rows=await env.DB.prepare('SELECT * FROM lounge_prompt_posts '+where+' ORDER BY created_at DESC,id DESC LIMIT 24 OFFSET ?').bind(q,q,category,category,(page-1)*24).all<Row>();
  return loungeJson(request,{supportsImages:true,posts:(rows.results||[]).map(view),total:total?.n||0,page,pages:Math.max(1,Math.ceil((total?.n||0)/24))});
 }
 const row=id?await env.DB.prepare('SELECT * FROM lounge_prompt_posts WHERE id=?').bind(id).first<Row>():null;
 if(id&&!row)return loungeJson(request,{error:'not_found'},404);
 if(request.method==='GET'&&row)return loungeJson(request,{post:view(row)});
 if(!user)return loungeJson(request,{error:'login_required'},401);
 if(row&&!can(row))return loungeJson(request,{error:'not_owner'},403);
 if(request.method==='DELETE'&&row){await env.DB.prepare('DELETE FROM lounge_prompt_posts WHERE id=?').bind(id).run();await removeUnusedCover(row.image_url);return loungeJson(request,{ok:true});}
 if((request.method==='POST'&&!id)||(request.method==='PATCH'&&row)){
  const raw=await request.text();if(raw.length>450000)return loungeJson(request,{error:'request_too_large'},413);
  let p:any;try{p=JSON.parse(raw);}catch{return loungeJson(request,{error:'invalid_json'},400);}
  if(!p||typeof p!=='object')return loungeJson(request,{error:'invalid_json'},400);
  const field=(k:string,max:number)=>typeof p[k]==='string'?p[k].trim().slice(0,max):'';
  const title=field('title',100),description=field('description',500),category=field('category',40),content=field('content',20000);
  if(title.length<2||!description||!content||!['업무','글쓰기','이미지','영상','코딩','학습','기타'].includes(category))return loungeJson(request,{error:'invalid_prompt'},400);
  const tags=JSON.stringify([...new Set((Array.isArray(p.tags)?p.tags:[]).filter((t:unknown)=>typeof t==='string').map((t:string)=>t.trim().replace(/^#/, '').slice(0,24)).filter(Boolean))].slice(0,8));
  let imageUrl=row?.image_url||'',newImageKey='';
  if(p.imageUrl!==undefined){
   if(typeof p.imageUrl!=='string'||p.imageUrl.length>2048)return loungeJson(request,{error:'invalid_prompt_image'},400);
   imageUrl=p.imageUrl.trim();
   if(imageUrl){try{const u=new URL(imageUrl);if(u.protocol!=='https:'&&!(u.origin===url.origin&&['127.0.0.1','localhost'].includes(u.hostname)))throw new Error();if(u.username||u.password)throw new Error();}catch{return loungeJson(request,{error:'invalid_prompt_image'},400);}}
  }
  if(p.imageData){
   if(typeof p.imageData!=='string'||p.imageData.length>400000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(p.imageData))return loungeJson(request,{error:'invalid_prompt_image'},400);
   let bytes:Uint8Array;try{bytes=Uint8Array.from(atob(p.imageData.split(',')[1]),c=>c.charCodeAt(0));}catch{return loungeJson(request,{error:'invalid_prompt_image'},400);}
   if(bytes.length<4||bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)return loungeJson(request,{error:'invalid_prompt_image'},400);
   if(!env.PRIVATE_REPORTS)return loungeJson(request,{error:'prompt_image_storage_unavailable'},503);
   const imageId=crypto.randomUUID();newImageKey='lounge/prompt-images/'+imageId+'.jpg';
   await env.PRIVATE_REPORTS.put(newImageKey,bytes,{httpMetadata:{contentType:'image/jpeg'}});
   imageUrl=url.origin+'/lounge/prompt-images/'+imageId;
  }
  const now=new Date().toISOString(),key=id||crypto.randomUUID();
  try {
  if(row)await env.DB.prepare('UPDATE lounge_prompt_posts SET title=?,description=?,category=?,tags=?,content=?,image_url=?,updated_at=? WHERE id=?').bind(title,description,category,tags,content,imageUrl,now,key).run();
  else await env.DB.prepare('INSERT INTO lounge_prompt_posts (id,user_sub,author,title,description,category,tags,content,image_url,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(key,user.sub,user.name,title,description,category,tags,content,imageUrl,now,now).run();
  } catch(error){if(newImageKey)await env.PRIVATE_REPORTS?.delete(newImageKey).catch(()=>{});throw error;}
  if(row?.image_url!==imageUrl)await removeUnusedCover(row?.image_url);
  return loungeJson(request,{post:view((await env.DB.prepare('SELECT * FROM lounge_prompt_posts WHERE id=?').bind(key).first<Row>())!)},row?200:201);
 }
 return loungeJson(request,{error:'method_not_allowed'},405);
}
