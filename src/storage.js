import Dexie from 'dexie'
import relationships from 'dexie-relationships'

/**
 * @typedef {Object} VisitInteraction
 * @property {number} duration Time user was active during visit (ms).
 * @property {number} scrollPx Y-axis pixel scrolled to at point in time.
 * @property {number} scrollPerc
 * @property {number} scrollMaxPx Furthest y-axis pixel scrolled to during visit.
 * @property {number} scrollMaxPerc
 */

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
            visits:
                '[url+time],url -> pages.url,duration,scrollMaxPerc,scrollMaxPx,scrollPerc,scrollPx',
        })

        // ... add versions/migration logic here
    }

    /**
     * Performs async clearing of each table in succession (may just `Promise.all` this).
     *
     * @return {Promise<void>}
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

    /**
     * Updates an existing specified visit with interactions data.
     *
     * @param {string} url The URL of the visit to get.
     * @param {string|number} time
     * @param {VisitInteraction} data
     * @return {Promise<void>}
     */
    updateVisitInteractionData(url, time, data) {
        return this.transaction('rw', this.visits, () => {
            // Should be a compound PK index on `url` and `time`
            this.visits.where({ url, time }).modify({ ...data })
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
