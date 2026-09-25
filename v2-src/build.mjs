import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.dirname(here);
const read=name=>fs.readFileSync(path.join(here,name),'utf8');
const sources={CSS:read('style.css'),CATALOG:[read('catalog.js'),read('artists.js'),read('sounds.js')].join('\n'),ENGINE:[read('engine.js'),read('artist-engine.js'),read('audio.js')].join('\n'),APP:read('app.js')};
const template=read('template.html');
const pages=[
 {file:'studio-v2.html',page:'studio',title:'Find your next idea.',eyebrow:'The electronic music workbench',subtitle:'Browse a recipe. Make the parts talk. Take the MIDI into your next track.',lessonTitle:'One lead voice at a time',lesson:'Melody, bass, chords and arpeggio do not all need to speak at once. Solo a pair, find their conversation, then bring the drums back in.',exercise:'Try this: choose a style, lock the bass, then make three variations. Export the one whose melody leaves the most useful space.'},
 {file:'melody-v2.html',page:'melody',title:'A motif with somewhere to go.',eyebrow:'Melody lab / hooks · riffs · arpeggios',subtitle:'Emotional hooks, restless sequences and melodic answers. Shape the rhythm, then develop the phrase.',lessonTitle:'Give repetition a purpose',lesson:'A strong electronic hook survives a change of sound. Repeat its rhythm, move one interval, then leave an answer. AABA preserves the opening idea; ABAC introduces more dialogue.',exercise:'Try this: solo the melody and drums. Remove a third of the notes, use Call & response, then raise just the last answer. Compare with Undo.'},
 {file:'chords-v2.html',page:'chords',title:'Harmony that moves the room.',eyebrow:'Harmony lab / progressions · voicings · rhythm',subtitle:'48 harmonic paths across 24 styles. From intimate ninths to blunt rave triads, with bass and melody in context.',lessonTitle:'The top note is a second melody',lesson:'Listen to the highest note of each chord as its own line. Nearest inversions reduce jumps between adjacent chords. Open voicings create space; root position gives a more direct, block-like sound.',exercise:'Try this: choose Deep house and compare Root position with Nearest inversion. Then try a Phrygian mode and a 1–2–1–2 path for a very different tension.'},
 {file:'bass-v2.html',page:'bass',title:'Write from the low end up.',eyebrow:'Bass lab / sub · rollers · acid · broken rhythms',subtitle:'18 bass articulations, 96 starting recipes. Build the pocket, find an answer and export the sequence.',lessonTitle:'Length is part of the groove',lesson:'A bassline has a pitch shape and a silence shape. Rolling psy notes end quickly; a halftime sub needs space to sustain. The same pitches can imply a different genre when their release changes.',exercise:'Try this: solo bass and drums. Compare Gate at 50% and 110%, then shift the bass by a sixteenth. Add glide or accent modulation in your synth after importing.'}
];
for(const p of pages){
 const vars={...sources,TITLE:p.title,EYEBROW:p.eyebrow,SUBTITLE:p.subtitle,LESSON_TITLE:p.lessonTitle,LESSON:p.lesson,EXERCISE:p.exercise,PAGE:JSON.stringify(p.page)};
 const html=template.replace(/__([A-Z_]+)__/g,(_,key)=>{if(!(key in vars))throw Error('Unknown placeholder '+key);return vars[key]});
 new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1],{filename:p.file});
 fs.writeFileSync(path.join(root,p.file),html);
 console.log(`${p.file}: ${Buffer.byteLength(html).toLocaleString()} bytes, standalone`);
}
if(process.argv.includes('--pack')){
 const context={module:{exports:{}},TextEncoder,Uint8Array};vm.createContext(context);vm.runInContext(sources.CATALOG+'\n'+sources.ENGINE,context);const F=context.module.exports;
 fs.writeFileSync(path.join(root,'Fieldwork-V2-504-MIDI-Library.zip'),F.zipBytes(F.packFiles(F.GENRE_PRESETS,true)));
 fs.writeFileSync(path.join(root,'Fieldwork-V2-Artist-Studies-1312-MIDI.zip'),F.zipBytes(F.artistPackFiles()));
 console.log('MIDI library: 480 recipe clips + 24 five-part sketches');
 console.log('Artist pack: 1,280 clips + 32 five-part sketches; 48 tonal patches + 16 drum kits');
}
