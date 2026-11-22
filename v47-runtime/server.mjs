/** Standalone V47-only local/staging API process. Never imported by V46. */
import {initializeApp,applicationDefault,getApps} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";
import {createV47ApiServer} from "../src/v47/node-api-server.mjs";
import {requireV47FirebaseProjectId} from "../src/v47/isolated-project-guard.mjs";

// Explicit opt-in prevents accidental connection to the production V46 project.
const projectId=requireV47FirebaseProjectId(process.env.V47_FIREBASE_PROJECT_ID);
const port=Number(process.env.PORT ?? 8080);
if(!Number.isInteger(port) || port<1 || port>65535)throw new Error("Invalid PORT");
const app=getApps().find(app=>app.name==="v47-staging") ?? initializeApp({credential:applicationDefault(),projectId},"v47-staging");
const server=createV47ApiServer({auth:getAuth(app),firestore:getFirestore(app)});
server.listen(port,process.env.HOST ?? "127.0.0.1",()=>{
 console.log("V47 isolated API listening on port "+port+" for "+projectId);
});
