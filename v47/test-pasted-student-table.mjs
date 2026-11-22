import assert from 'node:assert/strict';
import {parsePastedStudentTable} from './pasted-student-table.mjs';
assert.deepEqual(parsePastedStudentTable('A\tB\tC\r\n1\t2\t\r\n'),[['A','B','C'],['1','2','']]);
assert.deepEqual(parsePastedStudentTable('\uFEFFA\tB\n1\t2'),[['A','B'],['1','2']]);
assert.throws(()=>parsePastedStudentTable('  '),/Paste/);
assert.throws(()=>parsePastedStudentTable('H\n'+'X\n'.repeat(1501)),RangeError);
assert.throws(()=>parsePastedStudentTable('X'.repeat(1500001)),RangeError);
console.log('V47 pasted student Excel table parser passed');
