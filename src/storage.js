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
        this._dbName = dbName
        this._indexedDB = indexedDB || window.indexedDB
        this._IDBKeyRange = IDBKeyRange || window.IDBKeyRange

        this._initInstance()
        this._initSchema()
    }

    get pageCount() {
        return this._db.pages.count()
    }

    _initInstance() {
        this._db = new Dexie(this._dbName, {
            indexedDB: this._indexedDB,
            IDBKeyRange: this._IDBKeyRange,
            addons: [relationships],
        })
    }

    _initSchema() {
        this._db.version(1).stores({
            pages: 'url,text,*tokens',
            visits: '++,url -> pages.url,time',
        })

        // ... add versions/migration logic here
    }

    /**
     * Performs async clearing of each table in succession (may just `Promise.all` this).
     */
    async clearData() {
        for (const table of this._db.tables) {
            await table.clear()
        }
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
