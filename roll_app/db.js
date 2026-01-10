// db.js — Universal IndexedDB Engine for RollnConnect
const DB = (() => {
  const DB_NAME = "RollnConnectDB";
  const DB_VERSION = 1;

  const STORES = [
    "users",
    "profiles",
    "sessions",
    "chatrooms",
    "messages",
    "marketplace_items",
    "notifications",
    "events",
    "spots",
    "settings"
  ];

  let db = null;

  // Open or upgrade DB
  function init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        db = e.target.result;

        STORES.forEach(store => {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: "id", autoIncrement: true });
          }
        });
      };

      request.onsuccess = (e) => {
        db = e.target.result;
        resolve(true);
      };

      request.onerror = (e) => reject(e);
    });
  }

  // Generic write
  function put(store, data) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      const req = tx.objectStore(store).put(data);

      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e);
    });
  }

  // Generic read by ID
  function get(store, id) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const req = tx.objectStore(store).get(id);

      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e);
    });
  }

  // Get all items
  function getAll(store) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const req = tx.objectStore(store).getAll();

      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e);
    });
  }

  // Delete by ID
  function remove(store, id) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      const req = tx.objectStore(store).delete(id);

      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e);
    });
  }

  return {
    init,
    put,
    get,
    getAll,
    remove
  };
})();
