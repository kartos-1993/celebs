/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
var app_1 = __importDefault(__webpack_require__(1));
var port = process.env.PORT || 3333;
var server = app_1.default.listen(port, function () {
    console.log("Listening at http://localhost:".concat(port, "/api"));
});
server.on('error', console.error);


/***/ }),
/* 1 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
var express_1 = __importDefault(__webpack_require__(2));
var express_2 = __webpack_require__(2);
var auth_routes_1 = __webpack_require__(3);
var helmet_1 = __importDefault(__webpack_require__(13));
var compression_1 = __importDefault(__webpack_require__(14));
var express_rate_limit_1 = __importDefault(__webpack_require__(15));
var pino_1 = __importDefault(__webpack_require__(16));
var pino_http_1 = __importDefault(__webpack_require__(17));
var express_session_1 = __importDefault(__webpack_require__(18));
var connect_redis_1 = __webpack_require__(19);
var redis_1 = __webpack_require__(20);
var app = (0, express_1.default)();
app.use((0, express_2.json)());
var logger = (0, pino_1.default)();
app.use((0, pino_http_1.default)({ logger: logger }));
app.use((0, helmet_1.default)());
app.use((0, compression_1.default)());
app.use((0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
}));
// Redis client setup
var redisClient = (0, redis_1.createClient)({
    url: 'redis://localhost:6379',
    legacyMode: true, // for connect-redis compatibility
});
redisClient.connect().catch(console.error);
app.use((0, express_session_1.default)({
    store: new connect_redis_1.RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET || 'change_this_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // set to true if using HTTPS
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
}));
app.use('/api/auth', auth_routes_1.authRouter);
exports["default"] = app;


/***/ }),
/* 2 */
/***/ ((module) => {

module.exports = require("express");

/***/ }),
/* 3 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.authRouter = void 0;
var express_1 = __webpack_require__(2);
var db_1 = __importDefault(__webpack_require__(4));
var jsonwebtoken_1 = __importDefault(__webpack_require__(6));
var config_1 = __webpack_require__(7);
var bcryptjs_1 = __importDefault(__webpack_require__(8));
var middlewares_1 = __webpack_require__(9);
var zod_1 = __webpack_require__(10);
var crypto_1 = __importStar(__webpack_require__(11));
var nodemailer_1 = __importDefault(__webpack_require__(12));
exports.authRouter = (0, express_1.Router)();
// Validation schemas
var registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    role: zod_1.z.string().optional(),
});
var loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
});
var requestResetSchema = zod_1.z.object({ email: zod_1.z.string().email() });
var resetPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    token: zod_1.z.string(),
    password: zod_1.z.string().min(8),
});
var verifyEmailSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    token: zod_1.z.string(),
});
function validate(schema) {
    return function (req, res, next) {
        var result = schema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ error: result.error.errors });
        }
        req.body = result.data;
        next();
    };
}
// Password policy utility
function isPasswordStrong(password) {
    // At least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/.test(password);
}
// Log authentication events
function logAuthEvent(type, email, req) {
    var _a, _b;
    (_b = (_a = req.log) === null || _a === void 0 ? void 0 : _a.info) === null || _b === void 0 ? void 0 : _b.call(_a, {
        event: type,
        email: email,
        ip: req.ip,
        time: new Date().toISOString(),
    });
}
exports.authRouter.get('/health', function (req, res) { return res.json({ status: 'ok' }); });
exports.authRouter.post('/register', validate(registerSchema), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, password, role, emailVerificationToken, emailVerificationTokenExpiry, hashedPassword, user, transporter, e_1;
    var _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _a = req.body, email = _a.email, password = _a.password, role = _a.role;
                if (!isPasswordStrong(password)) {
                    logAuthEvent('fail', email, req);
                    return [2 /*return*/, res.status(400).json({
                            error: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
                        })];
                }
                emailVerificationToken = crypto_1.default.randomBytes(32).toString('hex');
                emailVerificationTokenExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24);
                return [4 /*yield*/, bcryptjs_1.default.hash(password, 10)];
            case 1:
                hashedPassword = _d.sent();
                _d.label = 2;
            case 2:
                _d.trys.push([2, 5, , 6]);
                return [4 /*yield*/, db_1.default.user.create({
                        data: {
                            email: email,
                            password: hashedPassword,
                            role: role || config_1.Role.USER,
                            isEmailVerified: false,
                            emailVerificationToken: emailVerificationToken,
                            emailVerificationTokenExpiry: emailVerificationTokenExpiry,
                        },
                    })];
            case 3:
                user = _d.sent();
                transporter = nodemailer_1.default.createTransport({
                    host: process.env.SMTP_HOST || 'smtp.example.com',
                    port: Number(process.env.SMTP_PORT) || 587,
                    auth: {
                        user: process.env.SMTP_USER || 'user',
                        pass: process.env.SMTP_PASS || 'pass',
                    },
                });
                return [4 /*yield*/, transporter.sendMail({
                        from: process.env.SMTP_FROM || 'no-reply@example.com',
                        to: email,
                        subject: 'Verify your email',
                        text: "Verify your email: https://your-app/verify-email?token=".concat(emailVerificationToken, "&email=").concat(email),
                    })];
            case 4:
                _d.sent();
                logAuthEvent('register', email, req);
                res.status(201).json({
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    message: 'Please verify your email.',
                });
                return [3 /*break*/, 6];
            case 5:
                e_1 = _d.sent();
                logAuthEvent('fail', email, req);
                console.error('Register error:', e_1); // Log the actual error
                // Prisma unique constraint error code: P2002
                if (e_1.code === 'P2002' && ((_c = (_b = e_1.meta) === null || _b === void 0 ? void 0 : _b.target) === null || _c === void 0 ? void 0 : _c.includes('email'))) {
                    return [2 /*return*/, res.status(400).json({ error: 'User already exists' })];
                }
                res.status(500).json({ error: 'Registration failed', details: e_1.message });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
exports.authRouter.post('/login', validate(loginSchema), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, password, user, valid, failedLoginAttempts, lockoutUntil, token, refreshToken, refreshTokenExpiry;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, email = _a.email, password = _a.password;
                return [4 /*yield*/, db_1.default.user.findUnique({ where: { email: email } })];
            case 1:
                user = _b.sent();
                if (!user) {
                    logAuthEvent('fail', email, req);
                    return [2 /*return*/, res.status(401).json({ error: 'Invalid credentials' })];
                }
                // Account lockout logic
                if (user.lockoutUntil && user.lockoutUntil > new Date()) {
                    return [2 /*return*/, res.status(403).json({
                            error: 'Account is temporarily locked due to too many failed login attempts. Please try again later.',
                        })];
                }
                return [4 /*yield*/, bcryptjs_1.default.compare(password, user.password)];
            case 2:
                valid = _b.sent();
                if (!!valid) return [3 /*break*/, 4];
                failedLoginAttempts = user.failedLoginAttempts + 1;
                lockoutUntil = null;
                if (failedLoginAttempts >= 5) {
                    lockoutUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min lockout
                    failedLoginAttempts = 0; // reset after lockout
                }
                return [4 /*yield*/, db_1.default.user.update({
                        where: { email: email },
                        data: { failedLoginAttempts: failedLoginAttempts, lockoutUntil: lockoutUntil },
                    })];
            case 3:
                _b.sent();
                logAuthEvent('fail', email, req);
                return [2 /*return*/, res.status(401).json({ error: 'Invalid credentials' })];
            case 4:
                if (!(user.failedLoginAttempts > 0 || user.lockoutUntil)) return [3 /*break*/, 6];
                return [4 /*yield*/, db_1.default.user.update({
                        where: { email: email },
                        data: { failedLoginAttempts: 0, lockoutUntil: null },
                    })];
            case 5:
                _b.sent();
                _b.label = 6;
            case 6:
                logAuthEvent('login', email, req);
                token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, config_1.JWT_SECRET, {
                    expiresIn: '15m',
                });
                refreshToken = (0, crypto_1.randomBytes)(40).toString('hex');
                refreshTokenExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
                return [4 /*yield*/, db_1.default.user.update({
                        where: { email: email },
                        data: { refreshToken: refreshToken, refreshTokenExpiry: refreshTokenExpiry },
                    })];
            case 7:
                _b.sent();
                res.json({ token: token, refreshToken: refreshToken });
                return [2 /*return*/];
        }
    });
}); });
exports.authRouter.post('/refresh-token', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, refreshToken, user, newToken, newRefreshToken, newRefreshTokenExpiry;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, email = _a.email, refreshToken = _a.refreshToken;
                if (!email || !refreshToken)
                    return [2 /*return*/, res.status(400).json({ error: 'Email and refresh token required' })];
                return [4 /*yield*/, db_1.default.user.findUnique({ where: { email: email } })];
            case 1:
                user = _b.sent();
                if (!user || !user.refreshToken || !user.refreshTokenExpiry)
                    return [2 /*return*/, res.status(401).json({ error: 'Invalid refresh token' })];
                if (user.refreshToken !== refreshToken ||
                    user.refreshTokenExpiry < new Date())
                    return [2 /*return*/, res.status(401).json({ error: 'Invalid or expired refresh token' })];
                newToken = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, config_1.JWT_SECRET, {
                    expiresIn: '15m',
                });
                newRefreshToken = (0, crypto_1.randomBytes)(40).toString('hex');
                newRefreshTokenExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
                return [4 /*yield*/, db_1.default.user.update({
                        where: { email: email },
                        data: {
                            refreshToken: newRefreshToken,
                            refreshTokenExpiry: newRefreshTokenExpiry,
                        },
                    })];
            case 2:
                _b.sent();
                res.json({ token: newToken, refreshToken: newRefreshToken });
                return [2 /*return*/];
        }
    });
}); });
exports.authRouter.post('/logout', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, refreshToken, user;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, email = _a.email, refreshToken = _a.refreshToken;
                if (!email || !refreshToken)
                    return [2 /*return*/, res.status(400).json({ error: 'Email and refresh token required' })];
                return [4 /*yield*/, db_1.default.user.findUnique({ where: { email: email } })];
            case 1:
                user = _b.sent();
                if (!user || user.refreshToken !== refreshToken)
                    return [2 /*return*/, res.status(200).json({ message: 'Logged out' })];
                return [4 /*yield*/, db_1.default.user.update({
                        where: { email: email },
                        data: { refreshToken: null, refreshTokenExpiry: null },
                    })];
            case 2:
                _b.sent();
                res.json({ message: 'Logged out' });
                return [2 /*return*/];
        }
    });
}); });
exports.authRouter.post('/request-password-reset', validate(requestResetSchema), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var email, user, token, expiry, transporter;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                email = req.body.email;
                return [4 /*yield*/, db_1.default.user.findUnique({ where: { email: email } })];
            case 1:
                user = _a.sent();
                if (!user)
                    return [2 /*return*/, res
                            .status(200)
                            .json({ message: 'If the email exists, a reset link will be sent.' })];
                token = crypto_1.default.randomBytes(32).toString('hex');
                expiry = new Date(Date.now() + 1000 * 60 * 30);
                return [4 /*yield*/, db_1.default.user.update({
                        where: { email: email },
                        data: { resetToken: token, resetTokenExpiry: expiry },
                    })];
            case 2:
                _a.sent();
                transporter = nodemailer_1.default.createTransport({
                    host: process.env.SMTP_HOST || 'smtp.example.com',
                    port: Number(process.env.SMTP_PORT) || 587,
                    auth: {
                        user: process.env.SMTP_USER || 'user',
                        pass: process.env.SMTP_PASS || 'pass',
                    },
                });
                return [4 /*yield*/, transporter.sendMail({
                        from: process.env.SMTP_FROM || 'no-reply@example.com',
                        to: email,
                        subject: 'Password Reset',
                        text: "Reset your password: https://your-app/reset-password?token=".concat(token, "&email=").concat(email),
                    })];
            case 3:
                _a.sent();
                res.json({ message: 'If the email exists, a reset link will be sent.' });
                return [2 /*return*/];
        }
    });
}); });
exports.authRouter.post('/reset-password', validate(resetPasswordSchema), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, token, password, user, hashedPassword;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, email = _a.email, token = _a.token, password = _a.password;
                return [4 /*yield*/, db_1.default.user.findUnique({ where: { email: email } })];
            case 1:
                user = _b.sent();
                if (!user || !user.resetToken || !user.resetTokenExpiry)
                    return [2 /*return*/, res.status(400).json({ error: 'Invalid or expired token' })];
                if (user.resetToken !== token || user.resetTokenExpiry < new Date())
                    return [2 /*return*/, res.status(400).json({ error: 'Invalid or expired token' })];
                if (!isPasswordStrong(password))
                    return [2 /*return*/, res.status(400).json({
                            error: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
                        })];
                return [4 /*yield*/, bcryptjs_1.default.hash(password, 10)];
            case 2:
                hashedPassword = _b.sent();
                return [4 /*yield*/, db_1.default.user.update({
                        where: { email: email },
                        data: {
                            password: hashedPassword,
                            resetToken: null,
                            resetTokenExpiry: null,
                        },
                    })];
            case 3:
                _b.sent();
                res.json({ message: 'Password reset successful' });
                return [2 /*return*/];
        }
    });
}); });
exports.authRouter.post('/verify-email', validate(verifyEmailSchema), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, email, token, user;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, email = _a.email, token = _a.token;
                return [4 /*yield*/, db_1.default.user.findUnique({ where: { email: email } })];
            case 1:
                user = _b.sent();
                if (!user ||
                    !user.emailVerificationToken ||
                    !user.emailVerificationTokenExpiry) {
                    return [2 /*return*/, res.status(400).json({ error: 'Invalid or expired token' })];
                }
                if (user.emailVerificationToken !== token ||
                    user.emailVerificationTokenExpiry < new Date()) {
                    return [2 /*return*/, res.status(400).json({ error: 'Invalid or expired token' })];
                }
                return [4 /*yield*/, db_1.default.user.update({
                        where: { email: email },
                        data: {
                            isEmailVerified: true,
                            emailVerificationToken: null,
                            emailVerificationTokenExpiry: null,
                        },
                    })];
            case 2:
                _b.sent();
                res.json({ message: 'Email verified successfully' });
                return [2 /*return*/];
        }
    });
}); });
exports.authRouter.get('/me', middlewares_1.authenticateToken, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var userId, user;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                userId = req.user.id;
                return [4 /*yield*/, db_1.default.user.findUnique({
                        where: { id: userId },
                        select: { id: true, email: true, role: true },
                    })];
            case 1:
                user = _a.sent();
                res.json(user);
                return [2 /*return*/];
        }
    });
}); });
exports.authRouter.get('/admin', middlewares_1.authenticateToken, (0, middlewares_1.authorizeRole)([config_1.Role.ADMIN]), function (req, res) {
    res.json({ message: 'Welcome, admin!' });
});
// Centralized error handler
function errorHandler(err, req, res, next) {
    var _a, _b;
    (_b = (_a = req.log) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.call(_a, err);
    res.status(500).json({ error: 'Internal server error' });
}
// At the end of the file, after all routes:
exports.authRouter.use(errorHandler);


/***/ }),
/* 4 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
var client_1 = __webpack_require__(5);
var prisma = new client_1.PrismaClient();
exports["default"] = prisma;


/***/ }),
/* 5 */
/***/ ((module) => {

module.exports = require("@prisma/client");

/***/ }),
/* 6 */
/***/ ((module) => {

module.exports = require("jsonwebtoken");

/***/ }),
/* 7 */
/***/ ((__unused_webpack_module, exports) => {


var _a;
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DATABASE_URL = exports.SUPABASE_KEY = exports.SUPABASE_URL = exports.JWT_SECRET = exports.Permissions = exports.Role = void 0;
// RBAC roles and permissions
var Role;
(function (Role) {
    Role["ADMIN"] = "admin";
    Role["USER"] = "user";
    Role["EMPLOYEE"] = "employee";
})(Role || (exports.Role = Role = {}));
exports.Permissions = (_a = {},
    _a[Role.ADMIN] = ['read', 'write', 'delete'],
    _a[Role.USER] = ['read', 'write'],
    _a[Role.EMPLOYEE] = ['read'],
    _a);
exports.JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
exports.SUPABASE_URL = process.env.SUPABASE_URL || '';
exports.SUPABASE_KEY = process.env.SUPABASE_KEY || '';
exports.DATABASE_URL = process.env.DATABASE_URL || '';


/***/ }),
/* 8 */
/***/ ((module) => {

module.exports = require("bcryptjs");

/***/ }),
/* 9 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.authenticateToken = authenticateToken;
exports.authorizeRole = authorizeRole;
exports.authorizePermission = authorizePermission;
var jsonwebtoken_1 = __importDefault(__webpack_require__(6));
var config_1 = __webpack_require__(7);
function authenticateToken(req, res, next) {
    var authHeader = req.headers['authorization'];
    var token = authHeader && authHeader.split(' ')[1];
    if (!token)
        return res.sendStatus(401);
    jsonwebtoken_1.default.verify(token, config_1.JWT_SECRET, function (err, user) {
        if (err)
            return res.sendStatus(403);
        req.user = user;
        next();
    });
}
function authorizeRole(roles) {
    return function (req, res, next) {
        var user = req.user;
        if (!user || !roles.includes(user.role)) {
            return res.sendStatus(403);
        }
        next();
    };
}
function authorizePermission(permission) {
    return function (req, res, next) {
        var _a;
        var user = req.user;
        if (!user || !((_a = config_1.Permissions[user.role]) === null || _a === void 0 ? void 0 : _a.includes(permission))) {
            return res.sendStatus(403);
        }
        next();
    };
}


/***/ }),
/* 10 */
/***/ ((module) => {

module.exports = require("zod");

/***/ }),
/* 11 */
/***/ ((module) => {

module.exports = require("crypto");

/***/ }),
/* 12 */
/***/ ((module) => {

module.exports = require("nodemailer");

/***/ }),
/* 13 */
/***/ ((module) => {

module.exports = require("helmet");

/***/ }),
/* 14 */
/***/ ((module) => {

module.exports = require("compression");

/***/ }),
/* 15 */
/***/ ((module) => {

module.exports = require("express-rate-limit");

/***/ }),
/* 16 */
/***/ ((module) => {

module.exports = require("pino");

/***/ }),
/* 17 */
/***/ ((module) => {

module.exports = require("pino-http");

/***/ }),
/* 18 */
/***/ ((module) => {

module.exports = require("express-session");

/***/ }),
/* 19 */
/***/ ((module) => {

module.exports = require("connect-redis");

/***/ }),
/* 20 */
/***/ ((module) => {

module.exports = require("redis");

/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(0);
/******/ 	
/******/ })()
;