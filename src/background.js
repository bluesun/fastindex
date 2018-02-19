import Tokenizer from './tokenizer'
import Storage from './storage'

const console = chrome.extension.getBackgroundPage().console
const log = console.log
const TOKENIZER = new Tokenizer()
const index = new Storage({ dbName: 'test' })

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
    return doc.body.innerText
}
window.fetchPageData = fetchPageData

async function note(source) {
    const text = await fetchPageData(source.url)
    const tokenStream = TOKENIZER.getTokenStream(text)
    return {
        url: source.url,
        text: text,
        tokens: tokenStream,
    }
}

async function insertData() {
    const sources = [
        { url: 'https://en.wikipedia.org/wiki/United_States' },
        { url: 'https://en.wikipedia.org/wiki/Golden_jackal' },
        { url: 'https://en.wikipedia.org/wiki/Gray_wolf' },
        { url: 'https://en.wikipedia.org/wiki/Genus' },
        { url: 'https://en.wikipedia.org/wiki/Taxonomy_(biology)' },
    ]
    const augmented = (await Promise.all(
        sources.map(source => {
            return note(source)
        }),
    )).map(pageData => [pageData]) // Shape as page entries (change later)

    return await index.addPages(augmented)
}

async function setup() {
    await index.clearData()
    window.wasabi.storage = index
    log('Setup done')
}

async function indexNow() {
    log('Starting to insert data')
    await insertData()
    log('Data successfully inserted')
    log(await index.pageCount)
}

async function doStuff() {
    log(await index.search('president'))
    log(await index.search('usa'))
    log(await index.search('kashdfk'))
    const wolf = await index.search('wolf')
    log('wolf search')
    log(wolf)
}

window.wasabi = { fns: { setup, indexNow, doStuff } }
