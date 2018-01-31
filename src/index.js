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
}

if (!global.document) {
	global.document = {};
}

function Event(type) { this.type = type; }
if (!global.document.createEvent) {
	global.document.createEvent = function(type) {
		let Ctor = global[type] || Event;
		return new Ctor(type);
	};
}


global.Worker = function Worker(url) {
	let messageQueue = [],
		inside = mitt(),
		outside = mitt(),
		scope = {
			onmessage: null,
			dispatchEvent: inside.emit,
			addEventListener: inside.on,
			removeEventListener: inside.off,
			postMessage(data) {
				outside.emit('message', { data });
			},
			fetch: global.fetch
		},
		getScopeVar;
	inside.on('message', e => { let f = getScopeVar('onmessage'); if (f) f.call(scope, e); });
	this.addEventListener = outside.on;
	this.removeEventListener = outside.off;
	this.dispatchEvent = outside.emit;
	outside.on('message', e => { this.onmessage && this.onmessage(e); });
	this.postMessage = data => {
		if (messageQueue!=null) messageQueue.push(data);
		else inside.emit('message', { data });
	};
	this.terminate = () => {
		throw Error('Not Supported');
	};
	global.fetch(url)
		.then( r => r.text() )
		.then( code => {
			let vars = 'var self=this,global=self';
			for (let k in scope) vars += `,${k}=self.${k}`;
			// eval('(function() {'+vars+'\n'+code+'\n})').call(scope);
			getScopeVar = eval('(function() {'+vars+'\n'+code+'\nreturn function(__){return eval(__)}})').call(scope);
			let q = messageQueue;
			messageQueue = null;
			q.forEach(this.postMessage);
		})
		.catch( e => { outside.emit('error', e); console.error(e); });
};
