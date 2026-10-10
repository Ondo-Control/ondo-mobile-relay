'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {test}=require('node:test');
test('SQLite DO binding belongs ONLY to ChatGPT ondo-mobile-web',()=>{
 const cfg=JSON.parse(fs.readFileSync(path.join(__dirname,'..','wrangler.jsonc'),'utf8'));
 assert.equal(cfg.name,'ondo-mobile-web');
 assert.equal(cfg.main,'worker.mjs');
 assert.deepEqual(cfg.durable_objects.bindings,[{name:'P3_SESSIONS',class_name:'P3Session'}]);
 assert.deepEqual(cfg.migrations,[{tag:'p3-sqlite-v1',new_sqlite_classes:['P3Session']}]);
 const app=fs.readFileSync(path.join(__dirname,'transport.mjs'),'utf8');
 assert.match(app,/export class P3Session/);
 assert.doesNotMatch(app,/import.*\.\.\/worker\.js/);
});
