/* eslint-disable no-undef */
importScripts('module.js');

onmessage = () => { postMessage(importedModule.string); };
