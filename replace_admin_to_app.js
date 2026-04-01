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
let replacedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    // Replace "/admin", '/admin', `/admin/` but not "/admin/login" if it should be "/login"
    // Wait, all admin routes are moving to /app routes.
    // What about /admin/login? It moves to /login.
    let newContent = content.replace(/["'`]\/admin\/login["'`]/g, match => match[0] + "/login" + match[match.length-1]);
    newContent = newContent.replace(/["'`]\/admin(\/.*?)?["'`]/g, (match, suffix) => {
        if (match.includes("/admin/login")) return match; // Already handled
        return match[0] + "/app" + (suffix || "") + match[match.length-1];
    });

    if (content !== newContent) {
        fs.writeFileSync(file, newContent, 'utf8');
        replacedCount++;
        console.log("Updated", file);
    }
});
console.log(`Replaced in ${replacedCount} files.`);
