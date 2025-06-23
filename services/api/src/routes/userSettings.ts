import express from "express";
import { editSettings } from "../controllers/userSettingsController";
// (Optionally) import any admin-auth middleware here

const router = express.Router();

// POST /user/settings/visibility
// Body: { userId: number, publicVisibility: boolean }
router.post("/user/settings/visibility", /* isAdmin, */ editSettings);

export default router;
