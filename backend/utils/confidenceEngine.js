// utils/confidenceEngine.js

/**
 * Confidence Score Engine
 * -----------------------
 * Input:
 *   - exif: { cameraModel, dateTime, gps, software, orientation, ... }
 *   - ocr: { text, suspiciousPatterns }
 *   - aiSignals: { noiseScore, blurScore, compressionScore }
 *
 * Output:
 *   {
 *     score: Number,
 *     breakdown: { exifScore, ocrScore, aiScore },
 *     verdict: "real" | "suspect" | "fake"
 *   }
 */

function confidenceEngine({ exif = {}, ocr = {}, aiSignals = {} }) {
  let exifScore = 0;
  let ocrScore = 0;
  let aiScore = 0;

  // -----------------------------
  // 1. EXIF SCORING (0–50 points)
  // -----------------------------
  if (exif.cameraModel) exifScore += 15;
  if (exif.dateTime) exifScore += 10;
  if (exif.gps) exifScore += 10;

  if (exif.software) {
    const software = exif.software.toLowerCase();
    if (software.includes("photoshop") || software.includes("editor")) {
      exifScore -= 10; // edited image penalty
    } else {
      exifScore += 10;
    }
  }

  if (exif.orientation) exifScore += 5;

  exifScore = Math.max(0, Math.min(exifScore, 50));

  // -----------------------------
  // 2. OCR SCORING (0–20 points)
  // -----------------------------
  if (ocr.text && ocr.text.length > 0) {
    ocrScore += 10;
  }

  if (ocr.suspiciousPatterns && ocr.suspiciousPatterns.length > 0) {
    ocrScore -= 10;
  }

  ocrScore = Math.max(0, Math.min(ocrScore, 20));

  // -----------------------------
  // 3. AI SIGNALS (0–30 points)
  // -----------------------------
  if (aiSignals.noiseScore !== undefined) {
    aiScore += Math.max(0, 10 - aiSignals.noiseScore);
  }

  if (aiSignals.blurScore !== undefined) {
    aiScore += Math.max(0, 10 - aiSignals.blurScore);
  }

  if (aiSignals.compressionScore !== undefined) {
    aiScore += Math.max(0, 10 - aiSignals.compressionScore);
  }

  aiScore = Math.max(0, Math.min(aiScore, 30));

  // -----------------------------
  // FINAL SCORE
  // -----------------------------
  const finalScore = exifScore + ocrScore + aiScore;

  let verdict = "real";
  if (finalScore < 40) verdict = "fake";
  else if (finalScore < 70) verdict = "suspect";

  return {
    score: finalScore,
    breakdown: {
      exifScore,
      ocrScore,
      aiScore
    },
    verdict
  };
}

module.exports = confidenceEngine;
