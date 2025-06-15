/**
 * @jest-environment jsdom
 */

// Mock chrome et localStorage AVANT de charger le script à tester
if (!global.chrome) {
  global.chrome = {
    runtime: {
      onMessage: {
        addListener: jest.fn(),
        removeListener: jest.fn()
      },
      sendMessage: jest.fn(),
      lastError: null
    },
    tabs: {
      query: jest.fn(),
      sendMessage: jest.fn()
    },
    storage: {
      local: {
        get: jest.fn(),
        set: jest.fn()
      }
    }
  };
}
if (!global.localStorage) {
  global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  };
}

// Mock TextEncoder and crypto for hash generation
if (!global.TextEncoder) {
  global.TextEncoder = class TextEncoder {
    encode(str) {
      return new Uint8Array(Buffer.from(str, 'utf8'));
    }
  };
}

// Define crypto globally before requiring content.js
const nodeCrypto = require('crypto');
const cryptoImplementation = {
  subtle: {
    digest: async (algorithm, data) => {
      const hash = nodeCrypto.createHash('sha256');
      hash.update(data);
      return hash.digest().buffer;
    },
    importKey: jest.fn(),
    sign: jest.fn()
  }
};

// Force-set the crypto.subtle property on all available crypto objects
if (typeof global.crypto === 'object') {
  global.crypto.subtle = cryptoImplementation.subtle;
} else {
  global.crypto = cryptoImplementation;
}

if (typeof globalThis.crypto === 'object') {
  globalThis.crypto.subtle = cryptoImplementation.subtle;
} else {
  globalThis.crypto = cryptoImplementation;
}

// Also make it available in the jsdom window
if (typeof window !== 'undefined') {
  if (typeof window.crypto === 'object') {
    window.crypto.subtle = cryptoImplementation.subtle;
  } else {
    window.crypto = cryptoImplementation;
  }
}

// Import du wrapper de test sécurisé
const { createTestEnvironment } = require('./content-test-wrapper');

describe('API calls in content.js', () => {
  let originalFetch;
  let contentFunctions;
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Initialiser l'environnement de test et extraire les fonctions
    contentFunctions = createTestEnvironment();
    // Structure DOM exacte pour getUserName()
    document.body.innerHTML = `
      <div id="dpt" value="INFO"></div>
      <div id="avg">15.5</div>
      <div id="notetab"></div>
      <div id="racine">
        <div>
          <div>
            <div id="evalnumber"></div>
          </div>
        </div>
        <div id="lastchild">Nom : DUPONT Jean</div>
      </div>
    `;
    // Use a <select> for maq with a real <option> child
    let maq = document.createElement('select');
    maq.id = 'maq';
    let option = document.createElement('option');
    option.innerText = '2024/2025';
    option.value = 'S9_IF';
    maq.appendChild(option);
    maq.selectedIndex = 0;
    document.body.appendChild(maq);
    
    // Set up the avg element's innerText for getGlobalGrade
    const avgElement = document.getElementById('avg');
    avgElement.innerText = '15.5';
    
    // Add dpt as a <select> with an option
    let dpt = document.createElement('select');
    dpt.id = 'dpt';
    let dptOption = document.createElement('option');
    dptOption.value = 'INFO';
    dpt.appendChild(dptOption);
    dpt.selectedIndex = 0;
    document.body.appendChild(dpt);
    
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve('{"rank": 5, "total": 25, "grades": [15, 16, 17]}'),
      json: () => Promise.resolve({ rank: 5, total: 25, grades: [15, 16, 17] })
    }));
  });

  afterEach(() => {
    // Clean up DOM elements
    const maq = document.getElementById('maq');
    if (maq) maq.remove();
    const dpt = document.getElementById('dpt');
    if (dpt) dpt.remove();
  });  test('getSemesterRanking fait un fetch avec les bons paramètres', async () => {
    await contentFunctions.getSemesterRanking();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const url = global.fetch.mock.calls[0][0];
    expect(url).toContain('https://scolarite.polytech.univ-nantes.fr/gestnote/');
    expect(url).toContain('maq=S9_IF');
    expect(url).toContain('dpt=INFO');
    expect(global.fetch.mock.calls[0][1].method).toBe('get');
  });  test('getGlobalRank fait un fetch GET sur l\'API /api/ranks', async () => {
    await contentFunctions.getGlobalRank();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const url = global.fetch.mock.calls[0][0];
    expect(url).toContain('/api/ranks/');
    expect(global.fetch.mock.calls[0][1].method).toBe('get');
    expect(global.fetch.mock.calls[0][1].headers['X-Extension-User-Agent']).toContain('GestNoteRanking');
  });  test('updateGlobalRank fait un fetch POST sur l\'API /api/ranks', async () => {
    await contentFunctions.updateGlobalRank();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const url = global.fetch.mock.calls[0][0];
    expect(url).toContain('/api/ranks');
    expect(global.fetch.mock.calls[0][1].method).toBe('POST');
    expect(global.fetch.mock.calls[0][1].headers['X-GestNote-Signature']).toBeDefined();
    expect(global.fetch.mock.calls[0][1].headers['X-Extension-User-Agent']).toContain('GestNoteRanking');
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.year).toBe(2024);
    expect(body.maquette).toBe('S9_IF');
    expect(body.departement).toBe('INFO');
    expect(body.grade).toBe('15.5');
  });  test('getGlobalRank gère les erreurs de fetch', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 500, text: () => Promise.resolve('Erreur') }));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Call the function and wait for promise chain to complete
    const promise = new Promise((resolve) => {
      const originalError = console.error;
      console.error = (...args) => {
        spy(...args);
        resolve();
      };
    });
    
    contentFunctions.getGlobalRank();
    await promise;
    
    expect(spy).toHaveBeenCalledWith('Error in getGlobalRank:', expect.anything());
    spy.mockRestore();
  });  test('updateGlobalRank gère les erreurs de fetch', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 400, statusText: 'Bad Request', json: () => Promise.resolve({}) }));
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Call the function and wait for promise chain to complete
    const promise = new Promise((resolve) => {
      const originalError = console.error;
      console.error = (...args) => {
        spy(...args);
        resolve();
      };
    });
    
    contentFunctions.updateGlobalRank();
    await promise;
    
    expect(spy).toHaveBeenCalledWith('Error:', expect.anything());
    spy.mockRestore();
  });
});
