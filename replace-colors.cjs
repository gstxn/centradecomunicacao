const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist) {
  let files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(dir + '/' + file).isDirectory()) {
      filelist = walkSync(dir + '/' + file, filelist);
    }
    else {
      if (file.endsWith('.module.css')) {
        filelist.push(path.join(dir, file));
      }
    }
  });
  return filelist;
};

const cssFiles = walkSync('./src');

const replacements = [
  // Background Body
  { regex: /#(0a0a0c|101013|111114)(?![0-9a-fA-F])/gi, replacement: 'var(--color-bg-body)' },
  // Background Card
  { regex: /#(151518|161619|1c1c20|1b1b1f|17171a|18181c|19191d|222227)(?![0-9a-fA-F])/gi, replacement: 'var(--color-bg-card)' },
  // Text Main
  { regex: /#(f2efe9|fff|ffffff|f3f0ea|eeeae5|d9d6d1|ddd9d4|f7f3ed)(?![0-9a-fA-F])/gi, replacement: 'var(--color-text-main)' },
  // Text Muted
  { regex: /#(77777f|777780|62626a|626269|74747c|55555d|9999a1|85858d|5f5f67|8b8b93|6f6f77|a2a0a0|63636b|66666e|aaaab1|9b9ba3|8c8c94|706f76)(?![0-9a-fA-F])/gi, replacement: 'var(--color-text-muted)' },
  // Borders
  { regex: /#(29292e|2c2c31|2a2a2f|303036|323238|25252a|2c2c32|242429|35353a|282126)(?![0-9a-fA-F])/gi, replacement: 'var(--color-border)' },
  // Primary Accent (if hardcoded)
  { regex: /#e07a5f(?![0-9a-fA-F])/gi, replacement: 'var(--color-primary-accent)' }
];

cssFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  replacements.forEach(rule => {
    content = content.replace(rule.regex, rule.replacement);
  });
  
  if (original !== content) {
    fs.writeFileSync(file, content);
    console.log(`Updated: ${file}`);
  }
});
console.log('Done!');
