// Wrapper de test sécurisé pour content.js
// Ce fichier permet de tester les fonctions sans exposer de code dans la production

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Lire le fichier content.js
const contentPath = path.join(__dirname, '../../../extension/content.js');
const contentCode = fs.readFileSync(contentPath, 'utf8');

// Créer un sandbox isolé avec tous les mocks nécessaires
function createTestEnvironment() {
  const sandbox = {
    // Mocks navigateur
    document: global.document,
    window: global.window || {},
    chrome: global.chrome,
    localStorage: global.localStorage,
    
    // APIs crypto
    TextEncoder: global.TextEncoder,
    crypto: global.crypto,
    
    // APIs standards
    setTimeout: global.setTimeout,
    setInterval: global.setInterval,
    clearTimeout: global.clearTimeout,
    clearInterval: global.clearInterval,
    console: global.console,
    
    // API fetch mockée - utiliser directement global.fetch au moment de l'exécution
    fetch: (...args) => global.fetch(...args),
    
    // Variables globales du script
    URL_SERVER: "https://gestnote-ranking.onrender.com",
    globalExtensionVersion: '1.0.7'
  };

  // Créer le contexte d'exécution
  vm.createContext(sandbox);
  
  // Exécuter le code dans le sandbox
  vm.runInContext(contentCode, sandbox);
  
  // Extraire les fonctions que nous voulons tester
  return {
    getSemesterRanking: sandbox.getSemesterRanking,
    getGlobalRank: sandbox.getGlobalRank,
    updateGlobalRank: sandbox.updateGlobalRank
  };
}

module.exports = { createTestEnvironment };