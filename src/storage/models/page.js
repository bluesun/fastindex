import Visit from './visit'

export default class Page {
    /**
     * @param {string} args.url
     * @param {string} args.text
     * @param {lunr.Token[]} args.terms
     * @param {Visit} [args.visits=[]]
     */
    constructor({ url, text, terms, visits = [] }) {
        this.url = url
        this.text = text
        this.terms = terms

        Object.defineProperties(this, {
            visits: { value: visits, enumerable: false, writeable: true },
        })
    }

    /**
     * @param {number} [time=Date.now()]
     */
    addVisit(time = Date.now()) {
        this.visits.push(new Visit({ url: this.url, time }))
    }

    async loadRels(db) {
        this.visits = await db.visits
            .where('url')
            .equals(this.url)
            .toArray()
    }

    save(db) {
        return db.transaction('rw', db.pages, db.visits, async () => {
            await db.pages.put(this)

            const visitIds = await Promise.all(
                this.visits.map(visit => visit.save(db)),
            )

            const visitTimes = new Set(visitIds.map(([url, time]) => time))

            await db.visits
                .where('[url+time]')
                .between([this.url, -Infinity], [this.url, Infinity])
                .filter(visit => !visitTimes.has(visit.time))
                .delete()
        })
    }
}
