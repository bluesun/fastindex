Promise.resolve()
    .then(start('Attempt ' + Date.now(), 'group'))
    .then(start('Destroying database'))
    .then(function() {
        return new Promise(function(resolve, reject) {
            const req = indexedDB.deleteDatabase('test')
            req.onsuccess = resolve
            req.onerror = resolve
        })
    })
    .then(stop())
    .then(start('Creating database'))
    .then(function() {
        return new Promise(function(resolve, reject) {
            db = new Dexie('test')
            db.version(1).stores({ cards: '&url,text,*tokens' })
            db.open()
            resolve(db)
        })
    })
    .then(stop())
    .then(start('Defining'))
    .then(function(db) {
        return new Promise(function(resolve, reject) {
            resolve({
                db: db,
                cards: [{ url: 'https://en.wikipedia.org/wiki/United_States' }],
            })
        })
    })
    .then(stop())
    .then(start('Inserting data'))
    .then(function(result) {
        return new Promise(function(resolve, reject) {
            db.transaction('rw', db.cards, function() {
                result.cards.forEach(function(card) {
                    var text = fetchPageData(card.url).run()
                    // var text = document.body.innerText
                    const tokenStream = getTokenStream(text)
                    const cardToInsert = {
                        url: card.url,
                        text: text,
                        tokens: tokenStream,
                    }
                    db.cards.add(cardToInsert)
                })
            })
        })
    })
    .then(stop())
    .then(start('Searching for "northwest"'))
    .then(function() {
        return search('northwest').then(log)
    })
    .then(stop())
    .then(start('Searching for "counter"'))
    .then(function() {
        return search('counter').then(log)
    })
    .then(stop())
    .then(start('Searching for "target"'))
    .then(function() {
        return search('target').then(log)
    })
    .then(stop())
    .catch(console.error.bind(console))
    .then(console.log.bind(console, 'Done!'))
    .then(stop('group'), stop('group'))
    .catch()
