const admin = require("firebase-admin");
const { onObjectFinalized } = require("firebase-functions/v2/storage");
const logger = require("firebase-functions/logger");
const { getStorage } = require("firebase-admin/storage");

let createCanvas, Image;
try {
  ({ createCanvas, Image } = require("canvas"));
} catch (e) {
  console.warn("canvas module not available, thumbnail generation disabled", e);
}
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");

admin.initializeApp();
const db = admin.firestore();

// Node environment
pdfjsLib.GlobalWorkerOptions.disableWorker = true;
global.Image = Image;

exports.generateThumbnail = onObjectFinalized(
  {
    region: "us-west1",
    bucket: "reminders-ca6ef.firebasestorage.app",
  },
  async (event) => {
    const object = event.data;
    const name = object.name || "";

    if (!name.startsWith("notes/")) return;
    if (!name.toLowerCase().endsWith(".pdf")) return;

    const base = name.split("/").pop();           // {docId}.pdf
    const docId = base.replace(/\.pdf$/i, "");
    const thumbPath = `thumbs/${docId}.jpg`;

    const bucket = getStorage().bucket(object.bucket);

    logger.info("Thumb job", { name, docId, thumbPath });

    // mark as processing (optional)
    await db.collection("notes").doc(docId).set(
      { thumbStatus: "processing", thumbUpdatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );

    // Download PDF
    const [pdfBuffer] = await bucket.file(name).download();
    const pdfData = new Uint8Array(pdfBuffer);

    let jpgBuffer;
    let status = "ok";
    let errMsg = null;

    try {
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      const page = await pdf.getPage(1);

      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
      const ctx = canvas.getContext("2d");

      await page.render({ canvasContext: ctx, viewport }).promise;

      jpgBuffer = canvas.toBuffer("image/jpeg", { quality: 0.82 });
    } catch (e) {
      // ✅ don’t die — create a fallback thumbnail
      status = "fallback";
      errMsg = String(e);

      logger.error("PDF render failed, using fallback", { docId, err: errMsg });

      const canvas = createCanvas(800, 1100);
      const ctx = canvas.getContext("2d");

      // simple placeholder (no fancy fonts/colors)
      ctx.fillStyle = "#f2f2f2";
      ctx.fillRect(0, 0, 800, 1100);
      ctx.fillStyle = "#222";
      ctx.font = "bold 64px sans-serif";
      ctx.fillText("PDF", 330, 180);
      ctx.font = "28px sans-serif";
      ctx.fillText("Thumbnail not available", 220, 260);
      ctx.font = "20px sans-serif";
      ctx.fillText(docId, 60, 1040);

      jpgBuffer = canvas.toBuffer("image/jpeg", { quality: 0.82 });
    }

    // Upload thumb (always)
    await bucket.file(thumbPath).save(jpgBuffer, {
      metadata: { contentType: "image/jpeg", cacheControl: "public, max-age=86400" },
    });

    // Update Firestore (always)
    await db.collection("notes").doc(docId).set(
      {
        thumbPath,
        thumbStatus: status, // ok | fallback
        thumbError: errMsg ? errMsg.slice(0, 500) : null,
        thumbUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    logger.info("Thumbnail done", { docId, status, thumbPath });
  }
);
