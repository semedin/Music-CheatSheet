import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const files=['arrangement.html','between.html','buildorder.html','chords.html','disco-house-cheatsheet.html','drum-library.html','groove-cheatsheet.html','groove-vol2.html','inkey.html','keyboard.html','low-end.html','melody.html','patch-lab.html','sampling.html','serum.html','the-move.html','field-guides-v1.html'];
for(const file of files){let html=fs.readFileSync(path.join(root,file),'utf8');
 html=html.replace('480 MIDI recipes · open','1,760 MIDI recipes · open');
 if(file==='field-guides-v1.html'){
  html=html.replace(/\{n:14,file:'ears\.html'[\s\S]*?(?=\{n:15,)/,"{n:14,file:'disco-house-cheatsheet.html',t:'Disco house',orig:'Disco',tag:'The original quick reference',fam:'Make the parts',midi:false,lab:false,d:'A compact production reference for disco house: rhythm, sampling, bass, harmony and arrangement.',li:['Disco and house vocabulary','A quick production checklist','Standalone reference sheet'],first:'<b>Start with:</b> the groove and bass relationship.',kw:'disco house french sampling groove bass reference'},\n\n");
  html=html.replace(/^.*\['I can’t hear what producers are talking about'.*\r?\n/gm,'');
  html=html.replace(/^.*\['Ear Training','Your accuracy, per drill'.*\r?\n/gm,'');
  html=html.replace(/<li><b>Ten minutes a day in <a href="ears.html">Ear Training<\/a><\/b>.*?<\/li>/g,'<li><b>Ten minutes a day in <a href="keyboard.html">Keyboard</a></b>, most days. Start with the note-finding drills and then play along with a progression.</li>');
  html=html.replace(/The only one worth returning to daily is <a href="ears.html">Ear Training<\/a>, because it is the only one that changes what you can do rather than what you can look up\./g,'Return to <a href="keyboard.html">Keyboard</a> regularly to practise playing the ideas you find here.');
  html=html.replace('Twenty-six playable patterns','Twenty-five playable patterns');
 }
 if(!html.includes('id="v2-navigation"')){const target=file==='melody.html'?'melody-v2.html':file==='chords.html'?'chords-v2.html':file==='low-end.html'?'bass-v2.html':'index.html';const nav=`\n<div id="v2-navigation" style="padding:12px 24px;background:#19221e;color:#eeeade;font:14px Arial,sans-serif;display:flex;gap:20px;flex-wrap:wrap"><a href="index.html" style="color:inherit">← Fieldwork V2 studio</a><a href="${target}" style="color:#ffc96e">480 MIDI recipes · open the V2 tools ↗</a><span style="color:#b3beb5">V1 field guide</span></div>\n`;html=html.replace(/<\/style>/i,'</style>'+nav)}
 fs.writeFileSync(path.join(root,file),html);
}
console.log('V1 labs retained; V2 navigation added; missing ear-training routes replaced or removed.');
