var express = require('express');
var app = express();
var path = require('path');

function addPath(relativePath) {
    let fullPath = path.join(__dirname, relativePath || '.');
    console.log(fullPath);
    app.use(express.static(fullPath));
}

addPath('.');
addPath('../node_modules');
addPath('../src');

app.listen(19021);
console.log('Listening on port 19021');