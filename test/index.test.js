import 'jsdom-worker';

import fs from 'fs';
import path from 'path';

const sleep = t => new Promise( r => { setTimeout(r, t); });

describe('jsdom-worker', () => {
	it('should work', async () => {
		let code = `onmessage = e => { postMessage(e.data*2) }`;
		let worker = new Worker(URL.createObjectURL(new Blob([code])));
		worker.onmessage = jest.fn();
		worker.postMessage(5);
		await sleep(10);
		expect(worker.onmessage).toHaveBeenCalledWith({ data: 10 });
	});

	it('should work with importScripts', async () => {
		const mod = fs.readFileSync(path.join(__dirname, './module.js'));
		const code = fs.readFileSync(path.join(__dirname, './worker.js'));
		const worker = new Worker(URL.createObjectURL(new Blob([mod + code])));
		worker.onmessage = jest.fn();
		worker.postMessage();
		await sleep(10);
		expect(worker.onmessage).toHaveBeenCalledWith({ data: 'test' });
	});

	it('should work with IIFE', async () => {
		const n = Math.random();
		const code = `(function(n){ onmessage = e => { postMessage(n) } })(${n})`;
		const worker = new Worker(URL.createObjectURL(new Blob([code])));
		worker.onmessage = jest.fn();
		worker.postMessage();
		await sleep(10);
		expect(worker.onmessage).toHaveBeenCalledWith({ data: n });
	});
});
