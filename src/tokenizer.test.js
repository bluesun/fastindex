import * as fs from 'fs'
import * as path from 'path'
import { expect } from 'chai'
import Tokenizer from './tokenizer'

describe('Tokenizer', () => {
    it('find the word "president" in the tokenized version of the US wikipedia article', () => {
        const pagePath = path.resolve(
            __dirname,
            '../test-pages/wikipedia-united-states.txt',
        )
        const pageText = fs.readFileSync(pagePath)
        const tokenizer = new Tokenizer()
        const tokens = tokenizer.getTokenStream(pageText)
        fs.writeFileSync('/tmp/test.txt', tokens)
        expect(tokens).contains('president')
    })
})
