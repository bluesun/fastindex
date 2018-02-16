import { expect } from 'chai'
import fakeIDBFactory from 'fake-indexeddb'
import fakeIDBKeyRange from 'fake-indexeddb/lib/FDBKeyRange'
import Storage from './storage'

describe('Storage', () => {
    let storage

    beforeEach(async () => {
        storage = new Storage({
            indexedDB: fakeIDBFactory,
            IDBKeyRange: fakeIDBKeyRange,
            dbName: 'unittest',
        })
        await storage.deleteDB()
        await storage.createDB()
    })

    it('be able to add a page and associated visit data (explicit)', async () => {
        const visitTime = 1518755246196
        const page = {
            url: 'https://bla.com/test',
            text: 'not so much text',
            tokens: ['text'],
        }

        await storage.addPages([[page, visitTime]])
        const result = await storage.search('text')

        expect(result).to.deep.equal([page])
        expect(result[0].visits).to.be.an('array').that.is.not.empty

        const visit = result[0].visits[0]
        expect(visit.url).to.equal(page.url)
        expect(visit.time).to.equal(visitTime)
    })

    it('be able to add a page and associated visit data (implicit)', async () => {
        const page = {
            url: 'https://bla.com/test',
            text: 'not so much text',
            tokens: ['text'],
        }

        await storage.addPages([[page]])
        const result = await storage.search('text')

        expect(result).to.deep.equal([page])
        expect(result[0].visits).to.be.an('array').that.is.not.empty

        const visit = result[0].visits[0]
        expect(visit.url).to.equal(page.url)
        expect(visit.time).to.exist
    })
})
