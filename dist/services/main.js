/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ ((module) => {

module.exports = require("tslib");

/***/ }),
/* 2 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(1);
const express_1 = tslib_1.__importDefault(__webpack_require__(3));
const express_2 = __webpack_require__(3);
const auth_1 = __webpack_require__(4);
const app = (0, express_1.default)();
app.use((0, express_2.json)());
app.use('/api/auth', auth_1.authRouter);
exports["default"] = app;


/***/ }),
/* 3 */
/***/ ((module) => {

module.exports = require("express");

/***/ }),
/* 4 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.authRouter = void 0;
const tslib_1 = __webpack_require__(1);
const express_1 = __webpack_require__(3);
const db_1 = tslib_1.__importDefault(__webpack_require__(5));
const jsonwebtoken_1 = tslib_1.__importDefault(__webpack_require__(7));
const config_1 = __webpack_require__(8);
const bcryptjs_1 = tslib_1.__importDefault(__webpack_require__(9));
const middlewares_1 = __webpack_require__(10);
exports.authRouter = (0, express_1.Router)();
exports.authRouter.get('/health', (req, res) => res.json({ status: 'ok' }));
exports.authRouter.post('/register', (req, res) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    const { email, password, role } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'Email and password required' });
    const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
    try {
        const user = yield db_1.default.user.create({
            data: { email, password: hashedPassword, role: role || config_1.Role.USER },
        });
        res.status(201).json({ id: user.id, email: user.email, role: user.role });
    }
    catch (e) {
        res.status(400).json({ error: 'User already exists' });
    }
}));
exports.authRouter.post('/login', (req, res) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    const user = yield db_1.default.user.findUnique({ where: { email } });
    if (!user)
        return res.status(401).json({ error: 'Invalid credentials' });
    const valid = yield bcryptjs_1.default.compare(password, user.password);
    if (!valid)
        return res.status(401).json({ error: 'Invalid credentials' });
    const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, config_1.JWT_SECRET, {
        expiresIn: '1d',
    });
    res.json({ token });
}));
exports.authRouter.get('/me', middlewares_1.authenticateToken, (req, res) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const user = yield db_1.default.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true },
    });
    res.json(user);
}));
exports.authRouter.get('/admin', middlewares_1.authenticateToken, (0, middlewares_1.authorizeRole)([config_1.Role.ADMIN]), (req, res) => {
    res.json({ message: 'Welcome, admin!' });
});


/***/ }),
/* 5 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
const client_1 = __webpack_require__(6);
const prisma = new client_1.PrismaClient();
exports["default"] = prisma;


/***/ }),
/* 6 */
/***/ ((module) => {

module.exports = require("@prisma/client");

/***/ }),
/* 7 */
/***/ ((module) => {

module.exports = require("jsonwebtoken");

/***/ }),
/* 8 */
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DATABASE_URL = exports.SUPABASE_KEY = exports.SUPABASE_URL = exports.JWT_SECRET = exports.Permissions = exports.Role = void 0;
// RBAC roles and permissions
var Role;
(function (Role) {
    Role["ADMIN"] = "admin";
    Role["USER"] = "user";
    Role["GUEST"] = "guest";
})(Role || (exports.Role = Role = {}));
exports.Permissions = {
    [Role.ADMIN]: ['read', 'write', 'delete'],
    [Role.USER]: ['read', 'write'],
    [Role.GUEST]: ['read'],
};
exports.JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
exports.SUPABASE_URL = process.env.SUPABASE_URL || '';
exports.SUPABASE_KEY = process.env.SUPABASE_KEY || '';
exports.DATABASE_URL = process.env.DATABASE_URL || '';


/***/ }),
/* 9 */
/***/ ((module) => {

module.exports = require("bcryptjs");

/***/ }),
/* 10 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.authenticateToken = authenticateToken;
exports.authorizeRole = authorizeRole;
exports.authorizePermission = authorizePermission;
const tslib_1 = __webpack_require__(1);
const jsonwebtoken_1 = tslib_1.__importDefault(__webpack_require__(7));
const config_1 = __webpack_require__(8);
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token)
        return res.sendStatus(401);
    jsonwebtoken_1.default.verify(token, config_1.JWT_SECRET, (err, user) => {
        if (err)
            return res.sendStatus(403);
        req.user = user;
        next();
    });
}
function authorizeRole(roles) {
    return (req, res, next) => {
        const user = req.user;
        if (!user || !roles.includes(user.role)) {
            return res.sendStatus(403);
        }
        next();
    };
}
function authorizePermission(permission) {
    return (req, res, next) => {
        var _a;
        const user = req.user;
        if (!user || !((_a = config_1.Permissions[user.role]) === null || _a === void 0 ? void 0 : _a.includes(permission))) {
            return res.sendStatus(403);
        }
        next();
    };
}


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
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
const tslib_1 = __webpack_require__(1);
const app_1 = tslib_1.__importDefault(__webpack_require__(2));
const port = process.env.PORT || 3333;
const server = app_1.default.listen(port, () => {
    console.log(`Listening at http://localhost:${port}/api`);
});
server.on('error', console.error);

})();

/******/ })()
;