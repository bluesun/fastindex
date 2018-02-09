import Dexie from 'dexie'

export default class Storage {
    constructor(
        { IDBFactory, IDBKeyRange, dbName } = {
            IDBFactory: null,
            IDBKeyRange: null,
            dbName: 'memex',
        },
    ) {
        this._db = null
        this._dbName = dbName
        this._IDBFactory = IDBFactory || window.IDBFactory
        this._IDBKeyRange = IDBKeyRange || window.IDBKeyRange
    }

    async createDB() {
        return new Promise((resolve, reject) => {
            this._db = new Dexie(this._dbName, {
                indexedDB: this._IDBFactory,
                IDBKeyRange: this._IDBKeyRange,
            })
            this._db.version(1).stores({ notes: '&url,text,*tokens' })
            this._db.open()

            if (typeof window !== 'undefined' && window.wasabi) {
                window.wasabi.db = this._db
            }

            // resolve(this._db)
        })
    }

    async deleteDB() {
        return new Promise((resolve, reject) => {
            const req = this._IDBFactory.deleteDatabase(this._dbName)
            req.onsuccess = resolve
            req.onerror = resolve
        })
    }

    async insertNotes(notes) {
        return this._db
            .transaction('rw', this._db.notes, () => {
                notes.forEach(noteToInsert => {
                    this._db.notes.add(noteToInsert)
                })
            })
            .then(() => {
                return 'wow'
            })
    }

    search(query) {
        // log('Starting query ' + query)
        return this._db.transaction('r', this._db.notes, () => {
            return this._db.notes
                .where('tokens')
                .equals(query)
                .toArray(val => {
                    return val
                })
        })
    }
}
