import { expect } from 'chai'
import fakeIDBFactory from 'fake-indexeddb'
import fakeIDBKeyRange from 'fake-indexeddb/lib/FDBKeyRange'
import Storage from './storage'

describe('Storage', () => {
    const storage = new Storage({
        indexedDB: fakeIDBFactory,
        IDBKeyRange: fakeIDBKeyRange,
        dbName: 'unittest',
    })

    beforeEach(() => storage.clearData())

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

    it("be able to update a visit's interaction data", async () => {
        const visitTime = 1518755246196
        const interactionData = {
            duration: 123,
            scrollPx: 150,
            scrollMaxPx: 150,
            scrollPerc: 0.3,
            scrollMaxPerc: 0.3,
        }
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

        // Perform interactions update
        await storage.updateVisitInteractionData(
            page.url,
            visitTime,
            interactionData,
        )

        const afterRes = await storage.search('text')

        expect(afterRes[0].visits).to.be.an('array').that.is.not.empty
        expect(afterRes[0].visits[0]).to.deep.equal({
            url: page.url,
            time: visitTime,
            ...interactionData,
        })
    })
})
