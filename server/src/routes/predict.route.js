import { predictSingle } from "../controllers/prediction.controller.js";
import { Router } from "express";

const router = Router();
router.route("/soyabean").post(predictSingle);

export default router;
