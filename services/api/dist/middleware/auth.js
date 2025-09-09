"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAuthenticated = void 0;
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.generateJwt = generateJwt;
// === services/api/src/middleware/auth.ts ===
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '1h';
// Hash a plain password
async function hashPassword(password) {
    return bcrypt_1.default.hash(password, SALT_ROUNDS);
}
// Verify password against hash
async function verifyPassword(password, hashedPassword) {
    return bcrypt_1.default.compare(password, hashedPassword);
}
// Generate a JWT token
function generateJwt(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
const isAuthenticated = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            req.user = decoded;
            next();
        }
        catch (err) {
            console.error('JWT verification failed:', err);
            res.status(403).json({ error: 'Invalid token' });
        }
    }
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or malformed token' });
    }
};
exports.isAuthenticated = isAuthenticated;
