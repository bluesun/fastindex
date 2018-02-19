import Dexie from 'dexie'
import relationships from 'dexie-relationships'

export default class Storage extends Dexie {
    /**
     * @property {Dexie.Table} Represents page data - our main data type.
     */
    pages

    /**
     * @property {Dexie.Table} Represents page visit timestamp and activity data.
     */
    visits

    constructor(
        { indexedDB, IDBKeyRange, dbName } = {
            indexedDB: null,
            IDBKeyRange: null,
            dbName: 'memex',
        },
    ) {
        super(dbName, {
            indexedDB: indexedDB || window.indexedDB,
            IDBKeyRange: IDBKeyRange || window.IDBKeyRange,
            addons: [relationships],
        })

        this._initSchema()
    }

    _initSchema() {
        this.version(1).stores({
            pages: 'url,text,*tokens',
            visits: '++,url -> pages.url,time',
        })

        // ... add versions/migration logic here
    }

    /**
     * Performs async clearing of each table in succession (may just `Promise.all` this).
     */
    async clearData() {
        for (const table of this.tables) {
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
        return this.transaction('rw', this.pages, this.visits, () => {
            for (const [page, time = Date.now()] of pageEntries) {
                this.pages.add(page)
                this.visits.add({ url: page.url, time })
            }
        })
    }

    search(query) {
        return this.transaction('r', this.pages, this.visits, () => {
            return this.pages
                .where('tokens')
                .equals(query)
                .with({ visits: 'visits' })
        })
    }
}
