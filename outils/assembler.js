// Fabrique la version « un seul fichier » de l'appli (à envoyer par mail, ouvrir sur iPhone…) :
//   node outils/assembler.js            -> dist/Strategie_VLEP.html
// Le CSS et chaque script de index.html sont recopiés en ligne, dans le même ordre.
const fs = require('fs');
const path = require('path');

const racine = path.join(__dirname, '..');
const lire = rel => fs.readFileSync(path.join(racine, rel), 'utf8');
// « </script » dans une chaîne fermerait la balise : on le neutralise
const enLigne = code => code.replace(/<\/script/gi, '<\\/script');

let page = lire('index.html')
  .replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, href) => '<style>\n' + lire(href) + '</style>')
  .replace(/<script src="([^"]+)"><\/script>/g, (m, src) => '<script>\n' + enLigne(lire(src)) + '</script>');

const sortie = path.join(racine, 'dist', 'Strategie_VLEP.html');
fs.mkdirSync(path.dirname(sortie), { recursive: true });
fs.writeFileSync(sortie, page);
console.log('Écrit : ' + path.relative(racine, sortie) + ' (' + Math.round(page.length / 1024) + ' Ko)');
