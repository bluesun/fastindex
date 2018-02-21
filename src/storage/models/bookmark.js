export default class Bookmark {
    constructor({ url, time }) {
        this.url = url
        this.time = time
    }

    save(db) {
        return db.bookmarks.put(this)
    }
}
