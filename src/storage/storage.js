import Dexie from 'dexie'
import relationships from 'dexie-relationships'

import { Page, Visit } from './models'

/**
 * @typedef {Object} VisitInteraction
 */

export default class Storage extends Dexie {
    static DEF_PARAMS = {
        indexedDB: null,
        IDBKeyRange: null,
        dbName: 'memex',
    }
    static MIN_STR = ''
    static MAX_STR = String.fromCharCode(65535)

    /**
     * @property {Dexie.Table} Represents page data - our main data type.
     */
    pages

    /**
     * @property {Dexie.Table} Represents page visit timestamp and activity data.
     */
    visits

    constructor({ indexedDB, IDBKeyRange, dbName } = Storage.DEF_PARAMS) {
        super(dbName, {
            indexedDB: indexedDB || window.indexedDB,
            IDBKeyRange: IDBKeyRange || window.IDBKeyRange,
            addons: [relationships],
        })

        this._initSchema()
    }

    _initSchema() {
        this.version(1).stores({
            pages: 'url, text, *terms',
            visits: '[url+time], [time+url]',
        })

        // ... add versions/migration logic here

        // Set up model classes
        this.pages.mapToClass(Page)
        this.visits.mapToClass(Visit)
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
    async addPages(pageEntries) {
        for (const [pageData, time = Date.now()] of pageEntries) {
            const visit = new Visit({ url: pageData.url, time })
            const page = new Page({ ...pageData, visits: [visit] })

            await page.save(this)
        }
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
            this.visits
                .where({ url, time })
                .modify((visit, ref) => ref.addInteractionData(data))
        })
    }

    /**
     * @param {string} [args.query=''] Terms search query.
     * @param {number} [args.startTime=0] Lower-bound for visit time.
     * @param {number} [args.endTime=Date.now()] Upper-bound for visit time.
     * @param {number} [args.skip=0]
     * @param {number} [args.limit=10]
     * @return {Promise<[number, string][]>} Ordered array of result KVPs of latest visit timestamps to page URLs.
     */
    search({
        query = '',
        startTime = 0,
        endTime = Date.now(),
        skip = 0,
        limit = 10,
    }) {
        return this.transaction('r', this.pages, this.visits, async () => {
            // Fetch all latest visits in time range, grouped by URL
            const latestVisitByUrl = new Map()
            await this.visits
                .where('[time+url]')
                .between(
                    [startTime, Storage.MIN_STR],
                    [endTime, Storage.MAX_STR],
                )
                .reverse() // Go through visits by most recent
                .eachPrimaryKey(([url, time]) => {
                    // Only ever record the first (latest) visit for each URL
                    if (!latestVisitByUrl.get(url)) {
                        latestVisitByUrl.set(url, time)
                    }
                })

            // Fetch all pages with terms matching query
            const matchingPageUrls = await this.pages
                .where('terms')
                .equals(query)
                .filter(page => latestVisitByUrl.has(page.url))
                .primaryKeys()

            // Paginate
            return matchingPageUrls
                .map(url => [latestVisitByUrl.get(url), url])
                .sort(([a], [b]) => a - b)
                .slice(skip, skip + limit)
        })
    }
}
