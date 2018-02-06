import lunr from './vendor/lunr.min.js'

export default class Tokenizer {
    constructor() {
        this._index = lunr()
    }

    getTokenStream(text) {
        return this._index.pipeline.run(lunr.tokenizer(text))
    }
}
