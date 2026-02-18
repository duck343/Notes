const admin = require("firebase-admin");
const { onObjectFinalized } = require("firebase-functions/v2/storage");
const logger = require("firebase-functions/logger");
const { getStorage } = require("firebase-admin/storage");

const { createCanvas, Image } = require("canvas");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");

admin.initializeApp();
const db = admin.firestore();

// Important in Node: don't try to use a worker.
pdfjsLib.GlobalWorkerOptions.disableWorker = true;

// Help PDF.js find the right Image class (node-canvas).
global.Image = Image;

exports.generateThumbnail = onObjectFinalized(
  {
    region: "us-west1",
    bucket: "reminders-ca6ef.firebasestorage.app",
  },
  async (event) => {
    const object = event.data;
    const name = object.name || "";
    const contentType = object.contentType || "";

    if (!name.startsWith("notes/")) return;
    if (!name.toLowerCase().endsWith(".pdf")) return;

    if (contentType && !contentType.startsWith("application/pdf")) {
      logger.warn("Unexpected contentType for pdf:", contentType, name);
    }

    const base = name.split("/").pop();
    const docId = base.replace(/\.pdf$/i, "");
    const thumbPath = `thumbs/${docId}.jpg`;

    logger.info("Generating thumbnail", { name, docId, thumbPath });

    const bucket = getStorage().bucket(object.bucket);

    const [pdfBuffer] = await bucket.file(name).download();
    const pdfData = new Uint8Array(pdfBuffer);

    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
    const ctx = canvas.getContext("2d");

    await page.render({ canvasContext: ctx, viewport }).promise;

    const jpgBuffer = canvas.toBuffer("image/jpeg", { quality: 0.82 });

    await bucket.file(thumbPath).save(jpgBuffer, {
      metadata: { contentType: "image/jpeg", cacheControl: "public, max-age=86400" },
    });

    await db.collection("notes").doc(docId).set(
      { thumbPath, thumbUpdatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );

    logger.info("Thumbnail created + Firestore updated", { docId, thumbPath });
  }
);
