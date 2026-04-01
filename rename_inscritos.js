const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            if (!file.includes('node_modules') && !file.includes('.next') && !file.includes('.git')) {
                results = results.concat(walk(file));
            }
        } else { 
            if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('./app');
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let newContent = content.replace(/\/app\/inscritos/g, '/app/participantes');
    newContent = newContent.replace(/Inscritos/g, 'Participantes');
    if (file.includes('layout.tsx') || file.includes('Sidebar') || file.includes('page.tsx')) {
        // Safe replacements
    }
    if (content !== newContent) {
        fs.writeFileSync(file, newContent, 'utf8');
        console.log("Updated", file);
    }
});
