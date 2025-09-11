"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userSettingsController_1 = require("../controllers/userSettingsController");
const auth_1 = require("../middleware/auth");
// (Optionally) import any admin-auth middleware here
const router = express_1.default.Router();
// GET /user/settings
router.get('/user/settings', auth_1.isAuthenticated, userSettingsController_1.getUserSettings);
// POST /user/settings/visibility
// Body: { userId: number, publicVisibility: boolean }
router.post('/user/settings/visibility', auth_1.isAuthenticated, userSettingsController_1.editSettings);
exports.default = router;
