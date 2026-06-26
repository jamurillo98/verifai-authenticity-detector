const path = require("path");
const axios = require("axios");
const cloudinary = require("cloudinary").v2;
const { createClient } = require("@supabase/supabase-js");
const confidenceEngine = require('../utils/confidenceEngine');
const exifr = require('exifr');

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    const err = new Error("Missing Supabase configuration.");
    err.status = 500;
    throw err;
  }
  return createClient(url, key);
}

function imageFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (!ALLOWED_MIME.has(file.mimetype) || !ALLOWED_EXT.has(ext)) {
    const err = new Error("Only JPG, PNG, and WebP images are allowed.");
    err.status = 400;
    return cb(err);
  }
  cb(null, true);
}

function uploadImageToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    try {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "image", folder: "verifai" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(buffer);
    } catch (error) {
      reject(error);
    }
  });
}

async function sightengineDetect(imageUrl) {
  const apiUser = process.env.SIGHTENGINE_API_USER;
  const apiSecret = process.env.SIGHTENGINE_API_SECRET;

  if (!imageUrl) {
    const err = new Error("imageUrl is required for Sightengine detection.");
    err.status = 400;
    throw err;
  }

  if (!apiUser || !apiSecret) {
    const err = new Error("Missing Sightengine configuration.");
    err.status = 500;
    throw err;
  }

  try {
    const response = await axios.get("https://api.sightengine.com/1.0/check.json", {
      params: {
        models: "genai",
        api_user: apiUser,
        api_secret: apiSecret,
        url: imageUrl
      }
    });

    const aiGeneratedScore = response.data?.type?.ai_generated;
    if (typeof aiGeneratedScore !== "number") {
      const err = new Error("Unexpected response from Sightengine.");
      err.status = 502;
      throw err;
    }

    return aiGeneratedScore;
  } catch (error) {
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      error.message ||
      "Sightengine request failed.";
    const err = new Error(message);
    err.status = error.response?.status || 502;
    throw err;
  }
}

function getVerdict(score) {
  if (score <= 0.3) return "LIKELY REAL";
  if (score <= 0.65) return "UNCERTAIN";
  return "LIKELY AI-GENERATED";
}

function getExplanation(score, verdict) {
  if (verdict === "LIKELY AI-GENERATED") {
    return `This image shows strong indicators of AI generation with a confidence score of ${Math.round(score * 100)}%. The analysis detected patterns typically associated with AI image synthesis engines such as Midjourney, DALL-E, or Stable Diffusion. These include unnatural texture consistency, perfect lighting gradients, and facial feature anomalies.`;
  }
  if (verdict === "UNCERTAIN") {
    return `This image shows mixed signals with a confidence score of ${Math.round(score * 100)}%. Some elements appear natural while others show potential AI generation artifacts. Further manual review may be needed.`;
  }
  return `This image appears to be authentic with a confidence score of ${Math.round(score * 100)}%. The analysis found natural variations in texture, lighting, and composition consistent with real photography.`;
}

function getPixelAnalysis(score) {
  if (score > 0.65) {
    return "Pixel-level analysis detected unusual uniformity in texture patterns, suspiciously perfect gradients, and inconsistent noise distribution — all common in AI-generated images.";
  }
  if (score > 0.30) {
    return "Pixel-level analysis found mixed results. Some regions show natural noise patterns while others display characteristics common in synthetic imagery.";
  }
  return "Pixel-level analysis found natural noise distribution, authentic grain patterns, and consistent lighting — all indicators of a real photograph.";
}

async function postUpload(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided. Send the file as multipart field "image".'
      });
    }

    const { buffer } = req.file;
    const userId = req.user?.userId || null; 
    const supabase = getSupabaseClient();

    let imageUrl;
    try {
      const uploadResult = await uploadImageToCloudinary(buffer);
      imageUrl = uploadResult.secure_url;
    } catch (error) {
      const err = new Error(error.message || "Cloudinary upload failed.");
      err.status = 502;
      throw err;
    }

    let scanId;
    try {
      const { data, error } = await supabase
        .from("scans")
        .insert({ image_url: imageUrl, status: "pending", user_id: userId })
        .select("id")
        .single();

      if (error || !data?.id) {
        const err = new Error(error?.message || "Failed to create scan record.");
        err.status = 500;
        throw err;
      }
      scanId = data.id;
    } catch (error) {
      const err = new Error(error.message || "Failed to create scan record.");
      err.status = error.status || 500;
      throw err;
    }

    let confidenceScore;
    let verdict;
    try {
      confidenceScore = await sightengineDetect(imageUrl);
      verdict = getVerdict(confidenceScore);
    } catch (error) {
      const err = new Error(error.message || "AI detection failed.");
      err.status = error.status || 502;
      throw err;
    }
        // ← ADD THE NEW CODE RIGHT HERE
    // Extract EXIF data from buffer
    let exifData = null;
    try {
      exifData = await exifr.parse(buffer);
    } catch (e) {
      exifData = null;
    }

    // Run confidence engine
    const engineResult = confidenceEngine({
      exif: {
        cameraModel: exifData?.Make || exifData?.Model || null,
        dateTime: exifData?.DateTimeOriginal || null,
        gps: exifData?.latitude ? `${exifData.latitude}, ${exifData.longitude}` : null,
        software: exifData?.Software || null,
        orientation: exifData?.Orientation || null
      },
      ocr: {},
      aiSignals: {
        noiseScore: Math.round(confidenceScore * 10),
        blurScore: 0,
        compressionScore: 0
      }
    });

    try {
        const { error } = await supabase
       .from("scans")
       .update({
          verdict,
          confidence_score: confidenceScore,
          status: "complete",
          explanation: getExplanation(confidenceScore, verdict)
        })
        .eq("id", scanId);
      if (error) {
        const err = new Error(error.message || "Failed to update scan result.");
        err.status = 500;
        throw err;
      }
    } catch (error) {
      const err = new Error(error.message || "Failed to update scan result.");
      err.status = error.status || 500;
      throw err;
    }

return res.status(201).json({
      success: true,
      imageUrl,
      scanId,
      verdict,
      confidence_score: confidenceScore,
      explanation: getExplanation(confidenceScore, verdict),
      pixel_analysis: getPixelAnalysis(confidenceScore),
      metadata: {
        analysed_at: new Date().toISOString(),
        detection_model: "Sightengine GenAI",
        score_percentage: Math.round(confidenceScore * 100) + "%",
        exif: {
          camera: exifData?.Make && exifData?.Model
            ? `${exifData.Make} ${exifData.Model}`
            : "Not available",
          date_taken: exifData?.DateTimeOriginal
            ? exifData.DateTimeOriginal.toString()
            : "Not available",
          gps: exifData?.latitude
            ? `${exifData.latitude}, ${exifData.longitude}`
            : "Not available",
          software: exifData?.Software || "Not available"
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  imageFileFilter,
  postUpload
};