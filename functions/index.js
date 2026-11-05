"use strict";

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { createHash } = require("node:crypto");

initializeApp();
const db = getFirestore();

const REGION = "asia-south1";
const MAX_FAILED_ATTEMPTS = 20;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_GRADE_SHEET_CHARS = 800000;

function sha256(value) {
  return createHash("sha256").update(String(value), "utf8").digest("hex");
}

function cleanText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

// This hash format must remain identical to onlineResultHash() in index.html.
function makeLookupHash(className, examId, version, studentCode) {
  const raw = [
    className,
    examId,
    version,
    String(studentCode || "").trim().toLocaleUpperCase()
  ].join("|");
  return sha256(raw);
}

function getClientIp(request) {
  const ip = request.rawRequest && request.rawRequest.ip;
  return typeof ip === "string" && ip.trim() ? ip.trim() : "unknown";
}

async function recordFailedAttempt(request) {
  const now = Date.now();
  const windowNumber = Math.floor(now / RATE_WINDOW_MS);
  const windowStart = windowNumber * RATE_WINDOW_MS;
  const ipHash = sha256(getClientIp(request));
  const rateRef = db.collection("public_result_lookup_rate_limits")
    .doc(sha256(ipHash + ":" + windowNumber));

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(rateRef);
    const count = snap.exists ? Number(snap.get("failedAttempts") || 0) : 0;

    if (count >= MAX_FAILED_ATTEMPTS) {
      throw new HttpsError(
        "resource-exhausted",
        "धेरै पटक गलत Code प्रयास भयो। १५ मिनेटपछि फेरि प्रयास गर्नुहोस्।"
      );
    }

    tx.set(rateRef, {
      failedAttempts: count + 1,
      windowStartedAt: Timestamp.fromMillis(windowStart),
      expiresAt: Timestamp.fromMillis(windowStart + RATE_WINDOW_MS * 2),
      updatedAt: Timestamp.now()
    }, { merge: true });
  });
}

exports.lookupPublishedStudentResult = onCall(
  {
    region: REGION,
    timeoutSeconds: 15,
    memory: "256MiB",
    maxInstances: 20
  },
  async (request) => {
    const data = request.data || {};
    const className = cleanText(data.className, 80);
    const examId = cleanText(data.examId, 150);
    const version = cleanText(data.version, 100);
    const studentCode = cleanText(data.studentCode, 80).toLocaleUpperCase();

    if (
      !className || !examId || !version || !studentCode ||
      examId.includes("/") ||
      /[\u0000-\u001f]/.test(studentCode)
    ) {
      throw new HttpsError("invalid-argument", "कक्षा, परीक्षा र Result Code जाँच गर्नुहोस्।");
    }

    // Only exams explicitly published as active may be searched.
    const examRef = db.collection("public_result_exams").doc(examId);
    const examSnap = await examRef.get();

    if (
      !examSnap.exists ||
      examSnap.get("active") !== true ||
      String(examSnap.get("version") || "") !== version ||
      String(examSnap.get("className") || "").trim() !== className
    ) {
      await recordFailedAttempt(request);
      throw new HttpsError("not-found", "Result Code मिलेन वा नतिजा प्रकाशित भएको छैन।");
    }

    const lookupHash = makeLookupHash(className, examId, version, studentCode);
    const lookupSnap = await db.collection("public_result_lookup").doc(lookupHash).get();

    if (
      !lookupSnap.exists ||
      lookupSnap.get("examId") !== examId ||
      lookupSnap.get("version") !== version ||
      lookupSnap.get("className") !== className
    ) {
      await recordFailedAttempt(request);
      throw new HttpsError("not-found", "Result Code मिलेन वा नतिजा प्रकाशित भएको छैन।");
    }

    const resultId = cleanText(lookupSnap.get("resultId"), 150);
    if (!resultId || resultId.includes("/")) {
      await recordFailedAttempt(request);
      throw new HttpsError("not-found", "Result Code मिलेन वा नतिजा प्रकाशित भएको छैन।");
    }

    const resultSnap = await db.collection("public_results").doc(resultId).get();
    if (
      !resultSnap.exists ||
      resultSnap.get("examId") !== examId ||
      resultSnap.get("version") !== version ||
      resultSnap.get("className") !== className
    ) {
      await recordFailedAttempt(request);
      throw new HttpsError("not-found", "Result Code मिलेन वा नतिजा प्रकाशित भएको छैन।");
    }

    const gradeSheetHtml = resultSnap.get("gradeSheetHtml");
    if (
      typeof gradeSheetHtml !== "string" ||
      gradeSheetHtml.length === 0 ||
      gradeSheetHtml.length > MAX_GRADE_SHEET_CHARS ||
      !gradeSheetHtml.includes('class="official-grade-sheet"')
    ) {
      console.error("Published result has invalid grade sheet HTML", { examId, resultId });
      throw new HttpsError("data-loss", "नतिजा फाइल अपूर्ण छ। विद्यालय प्रशासनलाई सम्पर्क गर्नुहोस्।");
    }

    // Do not return student identifiers, lookup hashes, or Firestore document IDs.
    return { gradeSheetHtml };
  }
);
