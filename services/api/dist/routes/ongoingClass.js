"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const roles_1 = require("../middleware/roles");
const ongoingClassController_1 = require("../controllers/ongoingClassController");
const router = express_1.default.Router();
//discovery / overview
router.get('/live/class', auth_1.isAuthenticated, ongoingClassController_1.getLiveClass);
router.get('/live/:classId/session', auth_1.isAuthenticated, ongoingClassController_1.getLiveSession); // NEW
router.get('/workout/:workoutId/steps', auth_1.isAuthenticated, ongoingClassController_1.getWorkoutSteps);
//leaderboards
router.get('/leaderboard/:classId', auth_1.isAuthenticated, ongoingClassController_1.getLeaderboard);
router.get('/live/:classId/leaderboard', auth_1.isAuthenticated, ongoingClassController_1.getRealtimeLeaderboard);
//auth'd member info
router.get('/live/:classId/me', auth_1.isAuthenticated, ongoingClassController_1.getMyProgress);
//scoring
router.post('/submitScore', auth_1.isAuthenticated, ongoingClassController_1.submitScore);
//coach controls
router.post('/coach/live/:classId/start', auth_1.isAuthenticated, (0, roles_1.roles)(['coach']), ongoingClassController_1.startLiveClass);
router.post('/coach/live/:classId/stop', auth_1.isAuthenticated, (0, roles_1.roles)(['coach']), ongoingClassController_1.stopLiveClass);
router.post('/coach/live/:classId/pause', auth_1.isAuthenticated, (0, roles_1.roles)(['coach']), ongoingClassController_1.pauseLiveClass);
router.post('/coach/live/:classId/resume', auth_1.isAuthenticated, (0, roles_1.roles)(['coach']), ongoingClassController_1.resumeLiveClass);
//member actions (FOR_TIME/AMRAP)
router.post('/live/:classId/advance', auth_1.isAuthenticated, ongoingClassController_1.advanceProgress);
router.post('/live/:classId/partial', auth_1.isAuthenticated, ongoingClassController_1.submitPartial);
// interval/tabata
router.post('/live/:classId/interval/score', auth_1.isAuthenticated, ongoingClassController_1.postIntervalScore);
router.get('/live/:classId/interval/leaderboard', auth_1.isAuthenticated, ongoingClassController_1.getIntervalLeaderboard);
exports.default = router;
