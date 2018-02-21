import EventModel from './event-model'

export default class Visit extends EventModel {
    /**
     * @property {number} duration Time user was active during visit (ms).
     */
    duration

    /**
     * @property {number} scrollPx Y-axis pixel scrolled to at point in time.
     */
    scrollPx

    /**
     * @property {number} scrollPerc
     */
    scrollPerc

    /**
     * @property {number} scrollMaxPx Furthest y-axis pixel scrolled to during visit.
     */
    scrollMaxPx

    /**
     * @property {number} scrollMaxPerc
     */
    scrollMaxPerc

    save(db) {
        return db.visits.put(this)
    }
}
