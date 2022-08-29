import mitt from 'mitt';
import uuid from 'uuid-v4';
import fetch, { Response } from 'node-fetch';

if (!global.URL) global.URL = {};
if (!global.URL.$$objects) {
	global.URL.$$objects = new Map();
	global.URL.createObjectURL = blob => {
		let id = uuid();
		global.URL.$$objects[id] = blob;
		return `blob:http://localhost/${id}`;
	};
}

if (!global.fetch || !global.fetch.jsdomWorker) {
	let oldFetch = global.fetch || fetch;
	global.fetch = function(url, opts) {
		if (url.match(/^blob:/)) {
			return new Promise( (resolve, reject) => {
				let fr = new FileReader();
				fr.onload = () => {
					let Res = global.Response || Response;
					resolve(new Res(fr.result, { status: 200, statusText: 'OK' }));
				};
				fr.onerror = () => {
					reject(fr.error);
				};
				let id = url.match(/[^/]+$/)[0];
				fr.readAsText(global.URL.$$objects[id]);
			});
		}
		return oldFetch.call(this, url, opts);
	};
	global.fetch.jsdomWorker = true;
}

if (!global.document) {
	global.document = {};
}

function Event(type) { this.type = type; }
Event.prototype.initEvent = Object;
if (!global.document.createEvent) {
	global.document.createEvent = function(type) {
		let Ctor = global[type] || Event;
		return new Ctor(type);
	};
}


global.Worker = function Worker(url) {
	let getScopeVar;
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
		fetch: global.fetch,
		importScripts() {}
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
	this.postMessage = data => {
		if (terminated) return;
		if (messageQueue != null) messageQueue.push(data);
		else inside.emit('message', { data });
	};
	this.terminate = () => {
		console.warn('Worker.prototype.terminate() not supported in jsdom-worker.');
		messageQueue = null;
		terminated = true;
	};
	global.fetch(url)
		.then(r => r.text())
		.then(code => {
			let vars = 'var self=this,global=self';
			for (let k in scope) vars += `,${k}=self.${k}`;
			getScopeVar = Function(
				vars + ';\n' + code + '\nreturn function(n){return n=="onmessage"?onmessage:null;}'
			).call(scope);
			let q = messageQueue;
			messageQueue = null;
			q.forEach(this.postMessage);
		})
		.catch(e => {
			outside.emit('error', e);
			console.error(e);
		});
};
