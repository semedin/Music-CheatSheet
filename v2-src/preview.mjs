import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const server=http.createServer((req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html';const file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!['.html','.zip','.md'].includes(path.extname(file))){res.writeHead(403).end();return}res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.zip')?'application/zip':'text/plain; charset=utf-8');res.setHeader('Cache-Control','no-store');fs.createReadStream(file).on('error',()=>{res.writeHead(404).end('Not found')}).pipe(res)}catch{res.writeHead(400).end('Bad request')}});
server.listen(8765,'127.0.0.1',()=>console.log('Fieldwork preview: http://127.0.0.1:8765'));
