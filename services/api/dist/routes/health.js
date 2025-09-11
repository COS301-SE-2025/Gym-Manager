"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// === services/api/src/routes/health.ts ===
const express_1 = __importDefault(require("express"));
const healthController_1 = require("../controllers/healthController");
const router = express_1.default.Router();
// 200 -> all good
// 503 -> DB (or Node) problem
router.get('/healthz', healthController_1.healthCheck);
router.get('/health', healthController_1.healthCheck);
router.get('/ready', healthController_1.healthCheck);
exports.default = router;
