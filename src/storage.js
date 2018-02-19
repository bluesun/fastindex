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

    _minString = ''
    _maxString = String.fromCharCode(65535)

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
            visits: '[time+url],url -> pages.url',
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

    /**
     * TODO: find a better way to do Dexie cross-table queries like this. Ignore visits table if no specified times?.
     *
     * @param {string} query Terms search query.
     * @param {number} [startTime=0] Lower-bound for visit time.
     * @param {number} [endTime=Date.now()] Upper-bound for visit time.
     * @return {Promise<any[]>}
     */
    search(query, startTime = 0, endTime = Date.now()) {
        return this.transaction('r', this.pages, this.visits, async () => {
            // Get all visits in time
            const visits = await this.visits
                .where('[time+url]')
                .between(
                    [startTime, this._minString],
                    [endTime, this._maxString],
                )
                .toArray()

            const visitUrls = new Set(visits.map(visit => visit.url))

            return this.pages
                .where('tokens')
                .equals(query)
                .filter(page => visitUrls.has(page.url))
                .with({ visits: 'visits' })
        })
    }
}
