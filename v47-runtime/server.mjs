/** Standalone V47-only local/staging API process. Never imported by V46. */
import {fileURLToPath} from "node:url";
import {createV47StaticHandler} from "./static-handler.mjs";
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
const staticHandler=process.env.V47_SERVE_BUILT_UI==="true"?await createV47StaticHandler(fileURLToPath(new URL("../v47/dist/",import.meta.url))):null;
// Both privileged final-write routes remain disabled; no env flag bypasses release approval.
const server=createV47ApiServer({auth:getAuth(app),firestore:getFirestore(app),staticHandler});
const host=process.env.HOST ?? "127.0.0.1";
if(!["127.0.0.1","::1","localhost"].includes(host))throw Error("V47 runtime must bind to loopback; an independently secured HTTPS reverse proxy is required for remote access");
server.listen(port,host,()=>{
 console.log("V47 isolated API listening on port "+port+" for "+projectId);
});
