import mitt from 'mitt';
import uuid from 'uuid-v4';
import fetch, { Response } from 'node-fetch';

// eslint-disable-next-line no-undef

const self = /** @type {globalThis} */ (
	typeof global === 'object'
		? global
		: typeof globalThis === 'object'
		? globalThis
		: this
);

// @ts-ignore-next-line
if (!self.URL) self.URL = {};

// @ts-ignore
let objects = /** @type {Map<any, string>} */ (self.URL.$$objects);

if (!objects) {
	objects = new Map();
	// @ts-ignore
	self.URL.$$objects = objects;
	self.URL.createObjectURL = blob => {
		let id = uuid();
		objects[id] = blob;
		return `blob:http://localhost/${id}`;
	};
	self.URL.revokeObjectURL = (url) => {
		let m = String(url).match(/^blob:http:\/\/localhost\/(.+)$/);
		if (m) delete objects[m[1]];
	};
}

if (!self.fetch || !('jsdomWorker' in self.fetch)) {
	let oldFetch = self.fetch || fetch;
	self.fetch = function (url, opts) {
		let _url = typeof url === 'object' ? url.url || url.href : url;
		if (/^blob:/.test(_url)) {
			return new Promise((resolve, reject) => {
				let fr = new FileReader();
				fr.onload = () => {
					let Res = self.Response || Response;
					resolve(new Res(fr.result, { status: 200, statusText: 'OK' }));
				};
				fr.onerror = () => {
					reject(fr.error);
				};
				let id = _url.match(/[^/]+$/)[0];
				fr.readAsText(objects[id]);
			});
		}
		return oldFetch.call(this, url, opts);
	};
	Object.defineProperty(self.fetch, 'jsdomWorker', {
		configurable: true,
		value: true,
	});
}

// @ts-ignore
if (!self.document) self.document = {};

function Event(type) {
	this.type = type;
}
Event.prototype.initEvent = Object;
if (!self.document.createEvent) {
	self.document.createEvent = function (type) {
		let Ctor = global[type] || Event;
		return new Ctor(type);
	};
}

// @ts-ignore
self.Worker = Worker;

/**
 * @param {string | URL} url
 * @param {object} [options = {}]
 */
function Worker(url, options) {
	let getScopeVar;
	/** @type {any[] | null} */
	let messageQueue = [];
	let inside = mitt();
	let outside = mitt();
	let terminated = false;
	let scope = {
		onmessage: null,
		dispatchEvent: inside.emit,
		addEventListener: inside.on,
		removeEventListener: inside.off,
		postMessage(data) {
			outside.emit('message', { data });
		},
		fetch: self.fetch,
		importScripts() {},
	};
	inside.on('message', e => {
		if (terminated) return;
		let f = scope.onmessage || getScopeVar('onmessage');
		if (f) f.call(scope, e);
	});
	this.addEventListener = outside.on;
	this.removeEventListener = outside.off;
	this.dispatchEvent = outside.emit;
	outside.on('message', e => {
		if (this.onmessage) this.onmessage(e);
	});
	this.onmessage = null;
	this.postMessage = data => {
		if (terminated) return;
		if (messageQueue != null) messageQueue.push(data);
		else inside.emit('message', { data });
	};
	this.terminate = () => {
		console.warn('Worker.prototype.terminate() not supported in jsdom-worker.');
		terminated = true;
		messageQueue = null;
	};
	self
		.fetch(url)
		.then(r => r.text())
		.then(code => {
			let vars = 'var self=this,global=self';
			for (let k in scope) vars += `,${k}=self.${k}`;
			getScopeVar = Function(
				vars +
					';\n' +
					code +
					'\nreturn function(n){return n=="onmessage"?onmessage:null;}'
			).call(scope);
			let q = messageQueue;
			messageQueue = null;
			if (q) q.forEach(this.postMessage);
		})
		.catch(e => {
			outside.emit('error', e);
			console.error(e);
		});
}
