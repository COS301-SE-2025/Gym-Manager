"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationEmitter = void 0;
const events_1 = require("events");
class NotificationEmitter extends events_1.EventEmitter {
}
exports.notificationEmitter = new NotificationEmitter();
