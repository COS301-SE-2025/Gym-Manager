import express from "express";
import { editSettings } from "../controllers/userSettingsController";
import { isAuthenticated } from "../middleware/auth";
// (Optionally) import any admin-auth middleware here

const router = express.Router();

// POST /user/settings/visibility
// Body: { userId: number, publicVisibility: boolean }
router.post('/user/settings/visibility', isAuthenticated,  editSettings);

export default router;
