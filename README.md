<p align="center">
  <img src="https://i.imgur.com/Xqla6Ia.jpg" width="1100">
</p>

# jsdom-worker

> _Lets you use Web Workers in Jest!_

This is an experimental implementation of the Web Worker API (specifically Dedicated Worker) for JSDOM.

It does not currently do any real threading, rather it implements the `Worker` interface but all work is done in the current thread. `jsdom-worker` runs wherever JSDOM runs, and does not require Node.

It supports both "inline" _(created via Blob)_ and standard _(loaded via URL)_ workers.

> **Hot Take:** this module likely works in the browser, where it could act as a simple inline worker "poorlyfill".

<a href="https://www.npmjs.org/package/jsdom-worker"><img src="https://img.shields.io/npm/v/jsdom-worker.svg?style=flat" alt="npm"></a> <a href="https://travis-ci.org/developit/jsdom-worker"><img src="https://travis-ci.org/developit/jsdom-worker.svg?branch=master" alt="travis"></a>

## Why?

Jest uses a JSDOM environment by default, which means it doesn't support Workers. This means it is impossible to test code that requires both NodeJS functionality _and_ Web Workers. `jsdom-worker` implements enough of the Worker spec that it is now possible to do so.

## Installation

`npm i jsdom-worker`

## Example

```js
import 'jsdom-global/register';
import 'jsdom-worker';

let code = `onmessage = e => postMessage(e.data*2)`;
let worker = new Worker(URL.createObjectURL(new Blob([code])));
worker.onmessage = console.log;
worker.postMessage(5); // 10
```

## Usage with Jest

For single tests, simply add `import 'jsdom-worker'` to your module.

Otherwise, add it via the [setupFiles](https://facebook.github.io/jest/docs/en/configuration.html#setupfiles-array) Jest config option:

```js
{
  "setupFiles": [
    "jsdom-worker"
  ]
}
```

## License

[MIT License](https://oss.ninja/mit/developit)
