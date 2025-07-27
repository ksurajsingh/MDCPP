import { predictSingle } from "../controllers/prediction.controller.js";
import { predictCottonPrice } from "../controllers/cotton.controller.js";
import { Router } from "express";

const router = Router();
router.route("/soyabean").post(predictSingle);

import {
  predictOnionPrice,
  getAvailableOptions,
  getMarketsForDistrict,
} from "../controllers/onionPrediction.controller.js";

/**
 * @route   POST /api/onion/predict
 * @desc    Predict onion price based on input parameters
 * @access  Public
 * @body    { district, year, month, variety, market }
 */
router.post("/onion", predictOnionPrice);
router.post("/cotton", predictCottonPrice);

/**
 * @route   GET /api/onion/options
 * @desc    Get all available districts, markets, and varieties
 * @access  Public
 */
router.get("/onion/options", getAvailableOptions);

/**
 * @route   GET /api/onion/markets/:district
 * @desc    Get available markets for a specific district
 * @access  Public
 * @param   district - District name
 */
router.get("/onion/markets/:district", getMarketsForDistrict);

export default router;
