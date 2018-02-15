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

    it('be able to store and find a simple document', async () => {
        const note = {
            url: 'https://bla.com/test',
            text: 'not so much text',
            tokens: ['text'],
        }
        await storage.insertNotes([Object.assign({}, note)])
        const result = await storage.search('text')
        expect(result).to.deep.equal([note])
    })
})
