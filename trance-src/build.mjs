import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.dirname(dir);
export function parseMidi(bytes){
 const b=Buffer.from(bytes);if(b.toString('ascii',0,4)!=='MThd')throw Error('Invalid MIDI');
 const ppq=b.readUInt16BE(12);if(ppq&32768)throw Error('SMPTE timing unsupported');
 let p=8+b.readUInt32BE(4),notes=[],end=0,tempos=[];
 const vlq=()=>{let n=0,c;do{c=b[p++];n=n*128+(c&127);}while(c&128);return n;};
 while(p<b.length){const tag=b.toString('ascii',p,p+4),len=b.readUInt32BE(p+4);p+=8;const stop=p+len;if(tag!=='MTrk'){p=stop;continue;}let tick=0,running=0;const active=new Map();
  while(p<stop){tick+=vlq();let s=b[p];if(s&128){p++;if(s<240)running=s;}else s=running;
   if(s===255){const type=b[p++],n=vlq();if(type===81)tempos.push(60000000/b.readUIntBE(p,3));p+=n;continue;}
   if(s===240||s===247){p+=vlq();continue;}
   const a=b[p++],v=(s&240)===192||(s&240)===208?0:b[p++],key=(s&15)+':'+a;
   if((s&240)===144&&v){if(!active.has(key))active.set(key,[]);active.get(key).push({n:a,t:tick/ppq,v});}
   else if((s&240)===128||((s&240)===144&&!v)){const start=active.get(key)?.shift();if(start)notes.push({...start,d:(tick/ppq)-start.t});}
  }end=Math.max(end,tick/ppq);
 }
 return {notes:notes.sort((a,b)=>a.t-b.t||a.n-b.n),beats:Math.ceil(end/4)*4,bpm:tempos[0]||null,ppq};
}
const files=fs.readdirSync(path.join(root,'material')).filter(n=>/^Trance_melody_\d+\.mid$/i.test(n)).sort();
const data=files.map((file,i)=>{const bytes=fs.readFileSync(path.join(root,'material',file));return {id:'source-'+(i+1),file,original:bytes.toString('base64'),...parseMidi(bytes)};});
if(process.argv.includes('--inspect')){for(const s of data)console.log(s.file,JSON.stringify({notes:s.notes.length,beats:s.beats,bpm:s.bpm,pitches:[...new Set(s.notes.map(n=>n.n))],bars:Array.from({length:s.beats/4},(_,i)=>[...new Set(s.notes.filter(n=>n.t>=i*4&&n.t<(i+1)*4).map(n=>n.n%12))])}));}
else{const read=n=>fs.readFileSync(path.join(dir,n),'utf8');const html=read('template.html').replace('__CSS__',()=>read('style.css')).replace('__SCRIPT__',()=>`const SOURCES=${JSON.stringify(data)};\n`+['catalog.js','engine.js','audio.js','app.js'].map(read).join('\n'));new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);fs.writeFileSync(path.join(root,'trance.html'),html);console.log('Built standalone trance.html: '+Buffer.byteLength(html)+' bytes, '+data.length+' embedded source MIDIs.');}
