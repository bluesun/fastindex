import lunr from 'src/vendor/lunr.min.js'
import Dexie from 'dexie'

const console = chrome.extension.getBackgroundPage().console
const log = console.log
log('Hello world')

function fetchDOMFromUrl(url, timeout) {
    const req = new XMLHttpRequest()

    return {
        cancel: () => req.abort(),
        /**
         * @returns {Promise<Document>} Resolves to the DOM which the URL points to.
         */
        run: () =>
            new Promise((resolve, reject) => {
                // Set up timeout handling
                req.timeout = timeout
                req.ontimeout = () => reject(new Error('Data fetch timeout'))

                // General non-HTTP errors
                req.onerror = () => reject(new Error('Data fetch failed'))

                // Allow non-200 response statuses to be considered failures;
                //  non-HTTP issues also show up as 0. Add any exception cases in here.
                req.onreadystatechange = function() {
                    if (this.readyState === 4) {
                        switch (this.status) {
                            case 200:
                                return resolve(this.responseXML)
                            case 0:
                            default:
                                return req.onerror()
                        }
                    }
                }

                req.open('GET', url)

                // Sets the responseXML to be of Document/DOM type
                req.responseType = 'document'
                req.send()
            }),
    }
}

function fetchPageData(url) {
    const req = fetchDOMFromUrl(url, 10000)
    const cancel = req.cancel

    /**
     * @return {Promise<any>} Resolves to an object containing `content` and `favIconURI` data
     *  fetched from the DOM pointed at by the `url` of `fetchPageData` call.
     */
    const run = async function() {
        const doc = await req.run()

        // If DOM couldn't be fetched, then we can't get anything
        if (!doc) {
            throw new Error('Cannot fetch DOM')
        }

        return doc.body.innerText
    }

    return { run, cancel }
}

const index = lunr()

function getTokenStream(text) {
    return index.pipeline.run(lunr.tokenizer(text))
}

async function search(db, query) {
    log('Searching for ' + query)
    const result = await db.transaction('r', db.notes, async () => {
        await db.notes.where('tokens').equals(query)
    })
    log(result)
}

async function deleteDB() {
    return new Promise(function(resolve, reject) {
        const req = indexedDB.deleteDatabase('test')
        req.onsuccess = resolve
        req.onerror = resolve
    })
}

async function createDB() {
    return new Promise((resolve, reject) => {
        const db = new Dexie('test')
        db.version(1).stores({ notes: '&url,text,*tokens' })
        db.open()
        resolve(db)
    })
}

async function note(source) {
    const fetcher = fetchPageData(source.url)
    const text = await fetcher.run()
    // var text = document.body.innerText
    const tokenStream = await getTokenStream(text)
    return {
        url: source.url,
        text: text,
        tokens: tokenStream,
    }
}

async function insertData(db) {
    const sources = [{ url: 'https://en.wikipedia.org/wiki/United_States' }]
    await db.transaction('rw', db.notes, async () => {
        sources.forEach(async source => {
            const noteToInsert = await note(source)
            await db.notes.add(noteToInsert)
        })
    })
    return db
}

async function run() {
    await deleteDB()
    const db = await createDB()
    log('Starting to insert data')
    await insertData(db)
    stop()
    log('Data successfully inserted')
    log(await search(db, 'president'))
    log(await search(db, 'kashdfk'))
    return 'DONE'
}

run()
