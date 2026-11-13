/**
 * V47 server-side onboarding orchestrator, dependency-injected and inert.
 * Must run ONLY on a trusted backend. No browser imports, no Firebase credentials.
 * Adapter must enforce transactional unique IEMIS index + immutable school ID,
 * and audit every attempt. Do not wire to production before integration tests.
 */
import {createRegistrationCommand} from "./school-registration.mjs";
export async function registerSchoolOnTrustedServer({actor,input,adapter}) {
 if(!adapter || typeof adapter.registerAtomically!=="function")
   throw new TypeError("Trusted transactional adapter required");
 const command=createRegistrationCommand(actor,input);
 // The adapter is responsible for independent verification of actor UID
 // against server-controlled platform_admins, NOT trusting client booleans.
 return adapter.registerAtomically(command);
}
