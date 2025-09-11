"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
// === services/api/src/index.ts ===
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const admin_1 = __importDefault(require("./routes/admin"));
const classes_1 = __importDefault(require("./routes/classes"));
const auth_1 = __importDefault(require("./routes/auth"));
const ongoingClass_1 = __importDefault(require("./routes/ongoingClass"));
// import liveRoutes from './routes/live';  // REMOVED
const userSettings_1 = __importDefault(require("./routes/userSettings"));
const health_1 = __importDefault(require("./routes/health"));
const requestTimeout_1 = require("./middleware/requestTimeout");
const errorHandler_1 = require("./middleware/errorHandler");
const swagger_1 = require("./swagger");
require("./listeners/adminNotificationListener");
const app = (0, express_1.default)();
exports.app = app;
const port = process.env.PORT || 4000;
const allowedOrigins = [
    'http://localhost:3000',
    'https://gym-manager-ashen.vercel.app',
    'http://localhost:4000',
];
const corsOptions = {
    origin(origin, cb) {
        if (!origin)
            return cb(null, true);
        cb(null, allowedOrigins.includes(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200,
};
// CORS must run before any other routes
app.use((0, cors_1.default)(corsOptions));
app.options('*', (0, cors_1.default)(corsOptions));
app.use(body_parser_1.default.json());
app.use((0, requestTimeout_1.requestTimeout)(20000));
app.use(health_1.default);
app.use(auth_1.default);
app.use(admin_1.default);
app.use(classes_1.default);
app.use(ongoingClass_1.default);
app.use(userSettings_1.default);
app.use(errorHandler_1.errorHandler);
(0, swagger_1.setupSwagger)(app);
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
app.use((err, req, res) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong on the server' });
});
exports.default = app;
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}
