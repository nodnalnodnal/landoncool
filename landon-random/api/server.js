// tiny api for /button and /guestbook. no dependencies.
const http=require('http'),fs=require('fs'),path=require('path');
const PORT=process.env.PORT||3069;
const FILE=path.join(__dirname,'data.json');
let db={button:0,hits:0,entries:[]};
try{db=Object.assign(db,JSON.parse(fs.readFileSync(FILE,'utf8')))}catch(e){}
let dirty=false;
setInterval(()=>{if(!dirty)return;dirty=false;fs.writeFileSync(FILE+'.tmp',JSON.stringify(db));fs.renameSync(FILE+'.tmp',FILE)},3000);

const btnRate=new Map(),gbRate=new Map(),hitRate=new Map();
setInterval(()=>{const now=Date.now();for(const m of [btnRate,gbRate,hitRate])for(const[k,v]of m)if(now-(v.t||v)>3600000)m.delete(k)},600000);

const ip=req=>(req.headers['x-forwarded-for']||req.socket.remoteAddress||'').split(',')[0].trim();
const send=(res,code,obj)=>{res.writeHead(code,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(obj))};
const body=req=>new Promise((ok,no)=>{let d='';req.on('data',c=>{d+=c;if(d.length>4000){no();req.destroy()}});req.on('end',()=>{try{ok(JSON.parse(d||'{}'))}catch(e){no()}});req.on('error',no)});
const clean=(s,n)=>String(s||'').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g,' ').replace(/\n{3,}/g,'\n\n').trim().slice(0,n);

http.createServer(async(req,res)=>{
  const [u,qs]=req.url.split('?');
  try{
    if(u==='/api/button'){
      if(req.method==='POST'){
        const b=await body(req),k=ip(req),now=Date.now();
        const r=btnRate.get(k)||{t:now,n:0};
        if(now-r.t>1500){r.t=now;r.n=0}
        const n=Math.max(0,Math.min(Math.floor(Number(b.n))||0,45-r.n)); // about 30 presses/sec max per person
        r.n+=n;btnRate.set(k,r);
        if(n){db.button+=n;dirty=true}
      }
      return send(res,200,{count:db.button});
    }
    if(u==='/api/guestbook'){
      if(req.method==='GET'){
        if(qs&&qs.includes('hit=1')){const k=ip(req),now=Date.now();if(now-(hitRate.get(k)||0)>1800000){hitRate.set(k,now);db.hits++;dirty=true}}
        return send(res,200,{hits:db.hits,entries:db.entries.slice(0,200)});
      }
      if(req.method==='POST'){
        const k=ip(req),now=Date.now();
        if(now-(gbRate.get(k)||0)<60000)return send(res,429,{error:'slow down, you can sign once a minute'});
        const b=await body(req);
        const e={name:clean(b.name,40),from:clean(b.from,60),msg:clean(b.msg,500),t:now};
        if(!e.name||!e.msg)return send(res,400,{error:'you need a name and a message'});
        gbRate.set(k,now);
        db.entries.unshift(e);db.entries=db.entries.slice(0,1000);dirty=true;
        return send(res,200,{ok:true});
      }
    }
    send(res,404,{error:'not found'});
  }catch(e){send(res,400,{error:'bad request'})}
}).listen(PORT,'127.0.0.1',()=>console.log('landon api on '+PORT));
