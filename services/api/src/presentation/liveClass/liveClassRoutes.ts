import express from 'express';
import { LiveClassController } from '../../controllers/liveClass/liveClassController';
import { AuthMiddleware, AuthenticatedRequest } from '../../infrastructure/middleware/authMiddleware';

export class LiveClassRoutes {
  private router: express.Router;
  private controller: LiveClassController;
  private auth: AuthMiddleware;

  constructor() {
    this.router = express.Router();
    this.controller = new LiveClassController();
    this.auth = new AuthMiddleware();
    this.setup();
  }

  private coachOnly = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
    const roles = req.user?.roles || [];
    if (!roles.includes('coach')) return res.status(403).json({ error: 'FORBIDDEN' });
    next();
  };

  private setup() {
    // discovery / overview
    this.router.get('/live/class', this.auth.isAuthenticated, this.controller.getLiveClass);
    this.router.get('/live/:classId/session', this.auth.isAuthenticated, this.controller.getLiveSession);
    this.router.get('/workout/:workoutId/steps', this.auth.isAuthenticated, this.controller.getWorkoutSteps);

    // leaderboards
    this.router.get('/leaderboard/:classId', this.auth.isAuthenticated, this.controller.getLeaderboard);
    this.router.get('/live/:classId/leaderboard', this.auth.isAuthenticated, this.controller.getRealtimeLeaderboard);

    // auth'd member info
    this.router.get('/live/:classId/me', this.auth.isAuthenticated, this.controller.getMyProgress);

    // scoring
    this.router.post('/submitScore', this.auth.isAuthenticated, this.controller.submitScore);

    // coach controls
    this.router.post('/coach/live/:classId/start', this.auth.isAuthenticated, this.coachOnly, this.controller.startLiveClass);
    this.router.post('/coach/live/:classId/stop',  this.auth.isAuthenticated, this.coachOnly, this.controller.stopLiveClass);
    this.router.post('/coach/live/:classId/pause', this.auth.isAuthenticated, this.coachOnly, this.controller.pauseLiveClass);
    this.router.post('/coach/live/:classId/resume', this.auth.isAuthenticated, this.coachOnly, this.controller.resumeLiveClass);

    // member actions (FOR_TIME/AMRAP)
    this.router.post('/live/:classId/advance', this.auth.isAuthenticated, this.controller.advanceProgress);
    this.router.post('/live/:classId/partial', this.auth.isAuthenticated, this.controller.submitPartial);

    // interval/tabata/emom
    this.router.post('/live/:classId/interval/score', this.auth.isAuthenticated, this.controller.postIntervalScore);
    this.router.get('/live/:classId/interval/leaderboard', this.auth.isAuthenticated, this.controller.getIntervalLeaderboard);
    this.router.post('/live/:classId/emom/mark', this.auth.isAuthenticated, this.controller.postEmomMark);

    // Coach notes
    this.router.get('/coach/live/:classId/note',  this.auth.isAuthenticated, this.coachOnly, this.controller.getCoachNote);
    this.router.post('/coach/live/:classId/note', this.auth.isAuthenticated, this.coachOnly, this.controller.setCoachNote);

    // End-of-class edit endpoints (coach only)
    this.router.post('/coach/live/:classId/ft/set-finish', this.auth.isAuthenticated, this.coachOnly, this.controller.ftSetFinish);
    this.router.post('/coach/live/:classId/ft/set-reps',   this.auth.isAuthenticated, this.coachOnly, this.controller.ftSetReps);
    this.router.post('/coach/live/:classId/amrap/set-total', this.auth.isAuthenticated, this.coachOnly, this.controller.amrapSetTotal);
    this.router.post('/coach/live/:classId/interval/set-total', this.auth.isAuthenticated, this.coachOnly, this.controller.intervalSetTotal);
    this.router.post('/coach/live/:classId/emom/mark',this.auth.isAuthenticated,this.coachOnly,this.controller.coachPostEmomMark);

  this.router.post('/coach/live/:classId/emom/set-total',this.auth.isAuthenticated,this.coachOnly,this.controller.emomSetTotal);


    // Member scaling
    this.router.get('/live/:classId/scaling',  this.auth.isAuthenticated, this.controller.getMyScaling);
    this.router.post('/live/:classId/scaling', this.auth.isAuthenticated, this.controller.setMyScaling);

  }

  getRouter() { return this.router; }
}

export const createLiveClassRoutes = () => new LiveClassRoutes().getRouter();
