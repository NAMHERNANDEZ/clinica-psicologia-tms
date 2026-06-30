const http = require('http');
const fs = require('fs');
const path = require('path');

const types = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.glb': 'model/gltf-binary', '.json': 'application/json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.wasm': 'application/wasm',
};

const s = http.createServer((q, res) => {
  let f = path.join(__dirname, 'dist', q.url === '/' ? '/index.html' : q.url.split('?')[0]);
  const ext = path.extname(f);
  fs.readFile(f, (err, data) => {
    if (err) {
      fs.readFile(path.join(__dirname, 'dist', 'index.html'), (e2, d2) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(d2);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    res.end(data);
  });
});
s.listen(5180, () => console.log('Serving dist at http://localhost:5180'));
