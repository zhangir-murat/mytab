import test from 'node:test';
import assert from 'node:assert/strict';
import {formatElapsed} from '../lib/elapsed.ts';

test('Elapsed marker time comes from the order timestamp, including hours and clock skew',()=>{
 const placed=1700000000000;
 assert.equal(formatElapsed(placed,placed+3000),'00:03');
 assert.equal(formatElapsed(placed,placed+599000),'09:59');
 assert.equal(formatElapsed(placed,placed+3734000),'1:02:14');
 assert.equal(formatElapsed(placed,placed-1000),'00:00');
});
