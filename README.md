* Motivation *

This is an experiment to improve performance of the indexing speed of HTML pages retrieved via a Chrome plugin. It will be used to test assumptions about performance enhancements in the [Worldbrain Plugin](https://github.com/WorldBrain).

* Intended audience

People working on the Worldbrain plugin

* Approach *

We use currently the function innerText to get the concanetated content of the retrieved DOM into a string for further processing. 

The tokenization of the string is done via the library [lunr](https://lunrjs.com) that offer a way to create a streaming pipeline with embedded and customizable tokenizer (as first part of a natural language processing library

Then the [dexie](http://dexie.org) library is used as a wrapper to IndexedDB. We use a [multi-entry index](http://dexie.org/docs/MultiEntry-Index) to have a fast insert and retrieval path of text tokens (words)

To run the experiment, generate and install the plugin as explained in the documentation of the worldbrain plugin, open the console then run:

1. run setup

`await window.wasabi.fns.setup()`

2. run `await window.wasabi.fns.indexNow()` first to fill the cache (didn't verify yet that the cache is really filled)
3. open the background page from the extension page
   - run setup again
   
   `await window.wasabi.fns.setup()`
   
   - open the development tools
   - open the performance tab
   - start recording
   - start indexing again
   
   `await window.wasabi.fns.indexNow()`
   
   - stop the recording

To test if a term (word) is in the IndexedDB use:

Searching for the term "wolf":
`await window.wasabi.db.notes.where('tokens').equals('wolf').toArray(val => val)`

* Code *

The only really relevant file is [src/background.js](src/background.js) 
The rest are helper files to create the Chome plugin

* Comments *

- As this a hack experiment, I just copied the list of dependencies from the Worldbrain plugin. It has a LOT of unnecessary dependencies
- It has currently a hardcoded list of URL's
- It is not yet covering the current needs of the Worldbrain project
- The start of this work has been inspired bei a [gist](https://gist.github.com/nolanlawson/6f69f4a573c1da862e92). Thanks to Nolan Lawson (@nolanlawson) for the inspiration.

* To do *

- Write tests

* Known bugs *

1. Some of the words are currently not found like "president" (from the wikipedia USA page)
