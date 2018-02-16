import Dexie from 'dexie'
import relationships from 'dexie-relationships'

export default class Storage {
    constructor(
        { indexedDB, IDBKeyRange, dbName } = {
            indexedDB: null,
            IDBKeyRange: null,
            dbName: 'memex',
        },
    ) {
        this._db = null
        this._dbName = dbName
        this._indexedDB = indexedDB || window.indexedDB
        this._IDBKeyRange = IDBKeyRange || window.IDBKeyRange
    }

    async createDB() {
        return new Promise((resolve, reject) => {
            this._db = new Dexie(this._dbName, {
                indexedDB: this._indexedDB,
                IDBKeyRange: this._IDBKeyRange,
                addons: [relationships],
            })

            this._db.version(1).stores({
                pages: 'url,text,*tokens',
                visits: '++,url -> pages.url,time',
            })

            if (typeof window !== 'undefined' && window.wasabi) {
                window.wasabi.db = this._db
            }

            resolve()
        })
    }

    async deleteDB() {
        return new Promise((resolve, reject) => {
            const req = this._indexedDB.deleteDatabase(this._dbName)
            req.onsuccess = resolve
            req.onerror = resolve
        })
    }

    /**
     * Adds a page + associated visit (pages never exist without either an assoc. visit or bookmark in current model).
     *
     * @param {[any, number][]} pageEntries Array of two-element entry-like arrays.
     *  El 0 being page data, el 1 being an associated visit time (defaults to current time if undefined).
     * @return {Promise<void>}
     */
    addPages(pageEntries) {
        return this._db.transaction(
            'rw',
            this._db.pages,
            this._db.visits,
            () => {
                for (const [page, time = Date.now()] of pageEntries) {
                    this._db.pages.add(page)
                    this._db.visits.add({ url: page.url, time })
                }
            },
        )
    }

    search(query) {
        return this._db.transaction(
            'r',
            this._db.pages,
            this._db.visits,
            () => {
                return this._db.pages
                    .where('tokens')
                    .equals(query)
                    .with({ visits: 'visits' })
            },
        )
    }
}
