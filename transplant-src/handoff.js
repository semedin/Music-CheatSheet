/* fieldwork-handoff:start */
// Handing a measured track from one Fieldwork page to another (Blueprint → Transplant), in this browser only:
// the analysis and the audio file go into IndexedDB under one key, and the next page takes them out once.
// GitHub Pages serves every page from the same origin, so this works there and on localhost. Some browsers keep
// file:// pages apart; then the page says so and you drop the file in again.
const FWH = (() => {
  'use strict';
  const DB = 'fieldwork-handoff', STORE = 'items';
  function open() {
    return new Promise((res, rej) => {
      if (typeof indexedDB === 'undefined') return rej(Error('This browser has no IndexedDB.'));
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error || Error('IndexedDB is blocked here.'));
    });
  }
  async function put(key, value) {
    const db = await open();
    try { await new Promise((res, rej) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(Object.assign({at: Date.now()}, value), key); tx.oncomplete = res; tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error || Error('Saving the hand-off was refused (storage full?).')); }); }
    finally { db.close(); }
  }
  async function take(key, maxAgeMs = 30 * 60 * 1000) {
    const db = await open();
    try {
      return await new Promise((res, rej) => {
        const tx = db.transaction(STORE, 'readwrite'), st = tx.objectStore(STORE), g = st.get(key);
        g.onsuccess = () => { const v = g.result; st.delete(key); res(v && Date.now() - (v.at || 0) <= maxAgeMs ? v : null); };
        g.onerror = () => rej(g.error);
      });
    } finally { db.close(); }
  }
  return {put, take};
})();
/* fieldwork-handoff:end */
