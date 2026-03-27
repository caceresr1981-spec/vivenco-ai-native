/**
 * Vinculación y escritura de projects.json / uat.json vía File System Access API.
 * Rutas esperadas (el usuario debe elegir estos archivos al vincular):
 *   …/ai-native-dev-landing/apps/web/data/projects.json
 *   …/ai-native-dev-landing/apps/web/data/uat.json
 */
(function (global) {
  'use strict';

  var DB_NAME = 'vivenco-tracker';
  var STORE = 'files';

  var HANDLE_KEYS = {
    projects: 'projects-json-handle',
    uat: 'uat-json-handle'
  };

  /** Compatibilidad: clave antigua solo UAT */
  var LEGACY_UAT_KEY = 'uat-json-handle';

  global.JsonDiskSync = global.JsonDiskSync || {};

  global.JsonDiskSync.EXPECTED = {
    dataDir:
      'S:\\Users\\Bob\\Documents\\Cursor\\Software Factory\\ai-native-dev-landing\\apps\\web\\data',
    projects:
      'S:\\Users\\Bob\\Documents\\Cursor\\Software Factory\\ai-native-dev-landing\\apps\\web\\data\\projects.json',
    uat:
      'S:\\Users\\Bob\\Documents\\Cursor\\Software Factory\\ai-native-dev-landing\\apps\\web\\data\\uat.json'
  };

  function openDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, 1);
      req.onerror = function () {
        reject(req.error);
      };
      req.onupgradeneeded = function () {
        req.result.createObjectStore(STORE);
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
    });
  }

  function getStoredHandle(kind) {
    var key = HANDLE_KEYS[kind];
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readonly');
        var store = tx.objectStore(STORE);
        var r = store.get(key);
        r.onsuccess = function () {
          var h = r.result;
          if (h || kind !== 'uat') {
            resolve(h || null);
            return;
          }
          var r2 = store.get(LEGACY_UAT_KEY);
          r2.onsuccess = function () {
            resolve(r2.result || null);
          };
          r2.onerror = function () {
            reject(r2.error);
          };
        };
        r.onerror = function () {
          reject(r.error);
        };
      });
    });
  }

  function storeHandle(kind, handle) {
    var key = HANDLE_KEYS[kind];
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(handle, key);
        if (kind === 'uat') {
          tx.objectStore(STORE).delete(LEGACY_UAT_KEY);
        }
        tx.oncomplete = function () {
          resolve();
        };
        tx.onerror = function () {
          reject(tx.error);
        };
      });
    });
  }

  function clearStoredHandle(kind) {
    var key = HANDLE_KEYS[kind];
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(key);
        if (kind === 'uat') {
          tx.objectStore(STORE).delete(LEGACY_UAT_KEY);
        }
        tx.oncomplete = function () {
          resolve();
        };
        tx.onerror = function () {
          reject(tx.error);
        };
      });
    });
  }

  function writeJsonString(kind, jsonString) {
    return getStoredHandle(kind).then(function (handle) {
      if (!handle) {
        return { ok: false, reason: 'no_handle' };
      }
      return handle
        .queryPermission({ mode: 'readwrite' })
        .then(function (perm) {
          if (perm === 'granted') return handle;
          return handle.requestPermission({ mode: 'readwrite' }).then(function (p) {
            return p === 'granted' ? handle : null;
          });
        })
        .then(function (h) {
          if (!h) return { ok: false, reason: 'permission_denied' };
          return h.createWritable().then(function (writable) {
            return writable.write(jsonString).then(function () {
              return writable.close();
            });
          }).then(function () {
            return { ok: true };
          });
        });
    });
  }

  function linkFile(kind) {
    if (!global.showOpenFilePicker) {
      return Promise.resolve({ ok: false, reason: 'unsupported' });
    }
    var expectedName = kind === 'uat' ? 'uat.json' : 'projects.json';
    var opts = {
      types: [
        {
          description: 'JSON',
          accept: { 'application/json': ['.json'] }
        }
      ],
      multiple: false,
      id: kind === 'uat' ? 'vivenco-uat-json' : 'vivenco-projects-json'
    };
    return global.showOpenFilePicker(opts).then(function (handles) {
      var handle = handles[0];
      if (handle.name !== expectedName) {
        return Promise.resolve({
          ok: false,
          reason: 'wrong_name',
          message: 'Selecciona exactamente el archivo «' + expectedName + '» en la carpeta data.'
        });
      }
      return storeHandle(kind, handle).then(function () {
        return { ok: true, name: handle.name, kind: kind };
      });
    });
  }

  var api = {
    supported: typeof global.showOpenFilePicker === 'function',
    getStoredHandle: getStoredHandle,
    storeHandle: storeHandle,
    clearStoredHandle: clearStoredHandle,
    writeJsonString: writeJsonString,
    linkFile: linkFile
  };

  global.JsonDiskSync = Object.assign(global.JsonDiskSync, api);

  global.UatDiskSync = {
    supported: api.supported,
    getStoredHandle: function () {
      return getStoredHandle('uat');
    },
    storeHandle: function (h) {
      return storeHandle('uat', h);
    },
    clearStoredHandle: function () {
      return clearStoredHandle('uat');
    },
    writeJsonString: function (jsonString) {
      return writeJsonString('uat', jsonString);
    },
    linkFile: function () {
      return linkFile('uat');
    }
  };
})(window);
