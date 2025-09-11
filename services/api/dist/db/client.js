"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
// src/db/client.ts
const node_postgres_1 = require("drizzle-orm/node-postgres");
const pg_1 = require("pg");
const schema = __importStar(require("./schema"));
const dotenv_1 = __importDefault(require("dotenv"));
// Ensure dotenv is loaded as early as possible
dotenv_1.default.config();
console.log('--- DRIZZLE CLIENT DB CONNECTION ATTEMPT ---');
const url = process.env.DATABASE_URL // Production URL
    ?? `postgres://${process.env.PG_USER}:` +
        `${process.env.PG_PASSWORD}@` +
        `${process.env.PG_HOST}:${process.env.PG_PORT}/` +
        `${process.env.PG_DATABASE}`;
const pool = new pg_1.Pool({
    connectionString: url,
    ssl: /supabase\.com/.test(url) ? { rejectUnauthorized: false } : undefined,
});
pool.on('connect', () => {
    //console.log('Drizzle client pool successfully connected to PostgreSQL!');
});
pool.on('error', (err) => {
    console.error('Drizzle client pool error:', err);
});
exports.db = (0, node_postgres_1.drizzle)(pool, { schema });
