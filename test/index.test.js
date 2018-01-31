import 'jsdom-worker';

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
});
