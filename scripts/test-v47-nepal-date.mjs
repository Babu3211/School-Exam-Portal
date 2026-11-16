import assert from 'node:assert/strict';import {nepalGregorianDate} from '../v47/nepal-date.mjs';
assert.equal(nepalGregorianDate(new Date('2026-11-15T19:00:00Z')),'2026-11-16');
assert.equal(nepalGregorianDate(new Date('2026-11-15T18:00:00Z')),'2026-11-15');
assert.throws(()=>nepalGregorianDate(new Date('invalid')));
console.log('V47 Nepal local Gregorian date tests passed');
