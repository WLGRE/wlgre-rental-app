// Keeps an in-progress form for the life of the browser tab, so a refresh or the back button
// doesn't lose it, but closing the tab forgets it (so the next person on a shared computer starts blank).
// Form fields go to sessionStorage, which the browser clears when the tab closes. Uploaded files are too
// big for that, so they go to IndexedDB under this tab's id; a new tab deletes any files left by closed tabs.
// Every call swallows storage errors (private browsing, blocked storage): the form still works, it just won't remember.

const TAB_KEY = 'wlgre-application-tab'
const STORE = 'files'

let isNewTab = false
const tabId = (() => {
  try {
    let id = sessionStorage.getItem(TAB_KEY)
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem(TAB_KEY, id)
      isNewTab = true
    }
    return id
  } catch {
    isNewTab = true
    return crypto.randomUUID()
  }
})()

// One draft per form; `name` keeps each form's fields and files apart
export function createDraft(name) {
  const fieldsKey = `${name}-draft`

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(name, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }

  async function run(mode, op) {
    const db = await openDb()
    return new Promise((resolve, reject) => {
      const req = op(db.transaction(STORE, mode).objectStore(STORE))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }

  return {
    loadFields() {
      try {
        return JSON.parse(sessionStorage.getItem(fieldsKey))
      } catch {
        return null
      }
    },

    saveFields(data) {
      const { files, ...fields } = data
      try {
        sessionStorage.setItem(fieldsKey, JSON.stringify(fields))
      } catch {}
    },

    loadFiles() {
      // A fresh tab has nothing to restore; clear out files from tabs that have since closed
      if (isNewTab) return run('readwrite', (s) => s.clear()).then(() => null, () => null)
      return run('readonly', (s) => s.get(tabId)).catch(() => null)
    },

    saveFiles: (files) => run('readwrite', (s) => s.put(files, tabId)).catch(() => {}),

    clearDraft() {
      try {
        sessionStorage.removeItem(fieldsKey)
      } catch {}
      run('readwrite', (s) => s.delete(tabId)).catch(() => {})
    },
  }
}

// The rental application's draft (same storage names as before, so in-progress drafts survive the update)
export const { loadFields, saveFields, loadFiles, saveFiles, clearDraft } = createDraft('wlgre-application')
