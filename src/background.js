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
                req.onerror = () =>
                    reject(
                        new Error(
                            'Data fetch failed:[' +
                                req.status +
                                ':' +
                                req.statusText +
                                ']',
                        ),
                    )

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

async function fetchPageData(url) {
    const result = fetchDOMFromUrl(url, 10000)
    const doc = await result.run()

    // If DOM couldn't be fetched, then we can't get anything
    if (!doc) {
        throw new Error('Cannot fetch DOM')
    }
    const text = await doc.body.innerText
    return text
}

const index = lunr()

function getTokenStream(text) {
    return index.pipeline.run(lunr.tokenizer(text))
}

async function search(db, query) {
    const docs = []
    log('Starting query ' + query)
    await db.transaction('r', db.notes, function() {
        db.notes
            .where('tokens')
            .equals(query)
            .each(function(doc) {
                docs.push(doc)
            })
    })
    return docs
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
    const text = await fetchPageData(source.url)
    const tokenStream = await getTokenStream(text)
    return {
        url: source.url,
        text: text,
        tokens: tokenStream,
    }
}

function insertData(db) {
    const sources = [{ url: 'https://en.wikipedia.org/wiki/United_States' }]
    const augmented = sources.map(source => {
        return note(source).then(val => val)
    })
    return db
        .transaction('rw', db.notes, () => {
            augmented.forEach(noteToInsert => {
                db.notes.add(noteToInsert)
            })
        })
        .then(() => {
            return db
        })
        .catch(log('Insertion failed'))
}

async function run() {
    await deleteDB()
    const db = await createDB()
    log('Starting to insert data')
    insertData(db)
    log('Data successfully inserted')
    log(await db.notes.count())
    // log(await search(db, 'president'))
    // log(search(db, 'kashdfk'))
}

run()
