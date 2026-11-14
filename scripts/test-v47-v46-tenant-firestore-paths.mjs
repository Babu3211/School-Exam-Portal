import assert from "node:assert/strict";
import {V46_COLLECTION_POLICY} from "../src/v47/v46-collection-map.mjs";
import {createV47V46ScopedRefs,v47V46CollectionSegments,v47V46DocumentSegments} from "../src/v47/v46-tenant-firestore-paths.mjs";
const db={};
const ref=createV47V46ScopedRefs({db,verifiedSchoolId:"school_A001",collectionFn:(instance,...segments)=>({instance,segments}),docFn:(instance,...segments)=>({instance,segments})});
for(const collection of Object.keys(V46_COLLECTION_POLICY)) {
 assert.deepEqual(ref.collection(collection).segments,["schools","school_A001",collection]);
 assert.deepEqual(ref.doc(collection,"record_1").segments,["schools","school_A001",collection,"record_1"]);
}
assert.notDeepEqual(v47V46CollectionSegments({schoolId:"school_A001",collection:"marks"}),v47V46CollectionSegments({schoolId:"school_B001",collection:"marks"}));
assert.throws(()=>ref.collection("unexpected"),/Unreviewed/);
assert.throws(()=>ref.doc("students","../escape"),/Invalid document ID/);
assert.throws(()=>ref.doc("students",""),/Invalid document ID/);
assert.throws(()=>v47V46DocumentSegments({schoolId:"bad",collection:"marks",documentId:"one"}),/Invalid immutable school ID/);
assert.throws(()=>createV47V46ScopedRefs({db,verifiedSchoolId:"school_A001"}),/functions required/);
console.log("V47 V46 Firestore tenant path mapping tests passed for all "+Object.keys(V46_COLLECTION_POLICY).length+" collections");
