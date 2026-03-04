"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/auth/logout/route";
exports.ids = ["app/api/auth/logout/route"];
exports.modules = {

/***/ "@prisma/client":
/*!*********************************!*\
  !*** external "@prisma/client" ***!
  \*********************************/
/***/ ((module) => {

module.exports = require("@prisma/client");

/***/ }),

/***/ "../../client/components/action-async-storage.external":
/*!*******************************************************************************!*\
  !*** external "next/dist/client/components/action-async-storage.external.js" ***!
  \*******************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/action-async-storage.external.js");

/***/ }),

/***/ "../../client/components/request-async-storage.external":
/*!********************************************************************************!*\
  !*** external "next/dist/client/components/request-async-storage.external.js" ***!
  \********************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/request-async-storage.external.js");

/***/ }),

/***/ "../../client/components/static-generation-async-storage.external":
/*!******************************************************************************************!*\
  !*** external "next/dist/client/components/static-generation-async-storage.external.js" ***!
  \******************************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/static-generation-async-storage.external.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2Flogout%2Froute&page=%2Fapi%2Fauth%2Flogout%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2Flogout%2Froute.ts&appDir=%2FUsers%2Fronkohen%2FDesktop%2FCursor%2Fasaf%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fronkohen%2FDesktop%2FCursor%2Fasaf&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!*************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2Flogout%2Froute&page=%2Fapi%2Fauth%2Flogout%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2Flogout%2Froute.ts&appDir=%2FUsers%2Fronkohen%2FDesktop%2FCursor%2Fasaf%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fronkohen%2FDesktop%2FCursor%2Fasaf&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \*************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   originalPathname: () => (/* binding */ originalPathname),\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   requestAsyncStorage: () => (/* binding */ requestAsyncStorage),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   staticGenerationAsyncStorage: () => (/* binding */ staticGenerationAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/future/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/future/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/future/route-kind */ \"(rsc)/./node_modules/next/dist/server/future/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_ronkohen_Desktop_Cursor_asaf_app_api_auth_logout_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/auth/logout/route.ts */ \"(rsc)/./app/api/auth/logout/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/auth/logout/route\",\n        pathname: \"/api/auth/logout\",\n        filename: \"route\",\n        bundlePath: \"app/api/auth/logout/route\"\n    },\n    resolvedPagePath: \"/Users/ronkohen/Desktop/Cursor/asaf/app/api/auth/logout/route.ts\",\n    nextConfigOutput,\n    userland: _Users_ronkohen_Desktop_Cursor_asaf_app_api_auth_logout_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks } = routeModule;\nconst originalPathname = \"/api/auth/logout/route\";\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        serverHooks,\n        staticGenerationAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIuanM/bmFtZT1hcHAlMkZhcGklMkZhdXRoJTJGbG9nb3V0JTJGcm91dGUmcGFnZT0lMkZhcGklMkZhdXRoJTJGbG9nb3V0JTJGcm91dGUmYXBwUGF0aHM9JnBhZ2VQYXRoPXByaXZhdGUtbmV4dC1hcHAtZGlyJTJGYXBpJTJGYXV0aCUyRmxvZ291dCUyRnJvdXRlLnRzJmFwcERpcj0lMkZVc2VycyUyRnJvbmtvaGVuJTJGRGVza3RvcCUyRkN1cnNvciUyRmFzYWYlMkZhcHAmcGFnZUV4dGVuc2lvbnM9dHN4JnBhZ2VFeHRlbnNpb25zPXRzJnBhZ2VFeHRlbnNpb25zPWpzeCZwYWdlRXh0ZW5zaW9ucz1qcyZyb290RGlyPSUyRlVzZXJzJTJGcm9ua29oZW4lMkZEZXNrdG9wJTJGQ3Vyc29yJTJGYXNhZiZpc0Rldj10cnVlJnRzY29uZmlnUGF0aD10c2NvbmZpZy5qc29uJmJhc2VQYXRoPSZhc3NldFByZWZpeD0mbmV4dENvbmZpZ091dHB1dD0mcHJlZmVycmVkUmVnaW9uPSZtaWRkbGV3YXJlQ29uZmlnPWUzMCUzRCEiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQXNHO0FBQ3ZDO0FBQ2M7QUFDZ0I7QUFDN0Y7QUFDQTtBQUNBO0FBQ0Esd0JBQXdCLGdIQUFtQjtBQUMzQztBQUNBLGNBQWMseUVBQVM7QUFDdkI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBLFlBQVk7QUFDWixDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0EsUUFBUSxpRUFBaUU7QUFDekU7QUFDQTtBQUNBLFdBQVcsNEVBQVc7QUFDdEI7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUN1SDs7QUFFdkgiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9wcm9kdWN0aW9uLWJvYXJkLz8xNDk3Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcFJvdXRlUm91dGVNb2R1bGUgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9mdXR1cmUvcm91dGUtbW9kdWxlcy9hcHAtcm91dGUvbW9kdWxlLmNvbXBpbGVkXCI7XG5pbXBvcnQgeyBSb3V0ZUtpbmQgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9mdXR1cmUvcm91dGUta2luZFwiO1xuaW1wb3J0IHsgcGF0Y2hGZXRjaCBhcyBfcGF0Y2hGZXRjaCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2xpYi9wYXRjaC1mZXRjaFwiO1xuaW1wb3J0ICogYXMgdXNlcmxhbmQgZnJvbSBcIi9Vc2Vycy9yb25rb2hlbi9EZXNrdG9wL0N1cnNvci9hc2FmL2FwcC9hcGkvYXV0aC9sb2dvdXQvcm91dGUudHNcIjtcbi8vIFdlIGluamVjdCB0aGUgbmV4dENvbmZpZ091dHB1dCBoZXJlIHNvIHRoYXQgd2UgY2FuIHVzZSB0aGVtIGluIHRoZSByb3V0ZVxuLy8gbW9kdWxlLlxuY29uc3QgbmV4dENvbmZpZ091dHB1dCA9IFwiXCJcbmNvbnN0IHJvdXRlTW9kdWxlID0gbmV3IEFwcFJvdXRlUm91dGVNb2R1bGUoe1xuICAgIGRlZmluaXRpb246IHtcbiAgICAgICAga2luZDogUm91dGVLaW5kLkFQUF9ST1VURSxcbiAgICAgICAgcGFnZTogXCIvYXBpL2F1dGgvbG9nb3V0L3JvdXRlXCIsXG4gICAgICAgIHBhdGhuYW1lOiBcIi9hcGkvYXV0aC9sb2dvdXRcIixcbiAgICAgICAgZmlsZW5hbWU6IFwicm91dGVcIixcbiAgICAgICAgYnVuZGxlUGF0aDogXCJhcHAvYXBpL2F1dGgvbG9nb3V0L3JvdXRlXCJcbiAgICB9LFxuICAgIHJlc29sdmVkUGFnZVBhdGg6IFwiL1VzZXJzL3JvbmtvaGVuL0Rlc2t0b3AvQ3Vyc29yL2FzYWYvYXBwL2FwaS9hdXRoL2xvZ291dC9yb3V0ZS50c1wiLFxuICAgIG5leHRDb25maWdPdXRwdXQsXG4gICAgdXNlcmxhbmRcbn0pO1xuLy8gUHVsbCBvdXQgdGhlIGV4cG9ydHMgdGhhdCB3ZSBuZWVkIHRvIGV4cG9zZSBmcm9tIHRoZSBtb2R1bGUuIFRoaXMgc2hvdWxkXG4vLyBiZSBlbGltaW5hdGVkIHdoZW4gd2UndmUgbW92ZWQgdGhlIG90aGVyIHJvdXRlcyB0byB0aGUgbmV3IGZvcm1hdC4gVGhlc2Vcbi8vIGFyZSB1c2VkIHRvIGhvb2sgaW50byB0aGUgcm91dGUuXG5jb25zdCB7IHJlcXVlc3RBc3luY1N0b3JhZ2UsIHN0YXRpY0dlbmVyYXRpb25Bc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzIH0gPSByb3V0ZU1vZHVsZTtcbmNvbnN0IG9yaWdpbmFsUGF0aG5hbWUgPSBcIi9hcGkvYXV0aC9sb2dvdXQvcm91dGVcIjtcbmZ1bmN0aW9uIHBhdGNoRmV0Y2goKSB7XG4gICAgcmV0dXJuIF9wYXRjaEZldGNoKHtcbiAgICAgICAgc2VydmVySG9va3MsXG4gICAgICAgIHN0YXRpY0dlbmVyYXRpb25Bc3luY1N0b3JhZ2VcbiAgICB9KTtcbn1cbmV4cG9ydCB7IHJvdXRlTW9kdWxlLCByZXF1ZXN0QXN5bmNTdG9yYWdlLCBzdGF0aWNHZW5lcmF0aW9uQXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcywgb3JpZ2luYWxQYXRobmFtZSwgcGF0Y2hGZXRjaCwgIH07XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWFwcC1yb3V0ZS5qcy5tYXAiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2Flogout%2Froute&page=%2Fapi%2Fauth%2Flogout%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2Flogout%2Froute.ts&appDir=%2FUsers%2Fronkohen%2FDesktop%2FCursor%2Fasaf%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fronkohen%2FDesktop%2FCursor%2Fasaf&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./app/api/auth/logout/route.ts":
/*!**************************************!*\
  !*** ./app/api/auth/logout/route.ts ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   POST: () => (/* binding */ POST),\n/* harmony export */   dynamic: () => (/* binding */ dynamic),\n/* harmony export */   fetchCache: () => (/* binding */ fetchCache),\n/* harmony export */   runtime: () => (/* binding */ runtime)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n/* harmony import */ var next_headers__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/headers */ \"(rsc)/./node_modules/next/dist/api/headers.js\");\n/* harmony import */ var _lib_prisma__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/lib/prisma */ \"(rsc)/./lib/prisma.ts\");\n// app/api/auth/logout/route.ts\nconst dynamic = \"force-dynamic\";\nconst runtime = \"nodejs\";\nconst fetchCache = \"force-no-store\";\n\n\n\nconst COOKIE_NAME = \"pb_session\";\nasync function POST() {\n    try {\n        const token = (0,next_headers__WEBPACK_IMPORTED_MODULE_1__.cookies)().get(COOKIE_NAME)?.value;\n        if (token) {\n            await _lib_prisma__WEBPACK_IMPORTED_MODULE_2__.prisma.session.delete({\n                where: {\n                    token\n                }\n            }).catch(()=>{});\n        }\n        const res = next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            success: true\n        });\n        res.cookies.set({\n            name: COOKIE_NAME,\n            value: \"\",\n            httpOnly: true,\n            sameSite: \"lax\",\n            secure: \"development\" === \"production\",\n            path: \"/\",\n            expires: new Date(0)\n        });\n        return res;\n    } catch (err) {\n        console.error(\"LOGOUT_ERROR:\", err);\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            success: true\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL2F1dGgvbG9nb3V0L3JvdXRlLnRzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSwrQkFBK0I7QUFDeEIsTUFBTUEsVUFBVSxnQkFBZ0I7QUFDaEMsTUFBTUMsVUFBVSxTQUFTO0FBQ3pCLE1BQU1DLGFBQWEsaUJBQWlCO0FBRUE7QUFDSjtBQUNEO0FBRXRDLE1BQU1JLGNBQWM7QUFFYixlQUFlQztJQUNwQixJQUFJO1FBQ0YsTUFBTUMsUUFBUUoscURBQU9BLEdBQUdLLEdBQUcsQ0FBQ0gsY0FBY0k7UUFFMUMsSUFBSUYsT0FBTztZQUNULE1BQU1ILCtDQUFNQSxDQUFDTSxPQUFPLENBQUNDLE1BQU0sQ0FBQztnQkFBRUMsT0FBTztvQkFBRUw7Z0JBQU07WUFBRSxHQUFHTSxLQUFLLENBQUMsS0FBTztRQUNqRTtRQUVBLE1BQU1DLE1BQU1aLHFEQUFZQSxDQUFDYSxJQUFJLENBQUM7WUFBRUMsU0FBUztRQUFLO1FBRTlDRixJQUFJWCxPQUFPLENBQUNjLEdBQUcsQ0FBQztZQUNkQyxNQUFNYjtZQUNOSSxPQUFPO1lBQ1BVLFVBQVU7WUFDVkMsVUFBVTtZQUNWQyxRQUFRQyxrQkFBeUI7WUFDakNDLE1BQU07WUFDTkMsU0FBUyxJQUFJQyxLQUFLO1FBQ3BCO1FBRUEsT0FBT1g7SUFDVCxFQUFFLE9BQU9ZLEtBQUs7UUFDWkMsUUFBUUMsS0FBSyxDQUFDLGlCQUFpQkY7UUFDL0IsT0FBT3hCLHFEQUFZQSxDQUFDYSxJQUFJLENBQUM7WUFBRUMsU0FBUztRQUFLO0lBQzNDO0FBQ0YiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9wcm9kdWN0aW9uLWJvYXJkLy4vYXBwL2FwaS9hdXRoL2xvZ291dC9yb3V0ZS50cz85Yjk3Il0sInNvdXJjZXNDb250ZW50IjpbIi8vIGFwcC9hcGkvYXV0aC9sb2dvdXQvcm91dGUudHNcbmV4cG9ydCBjb25zdCBkeW5hbWljID0gXCJmb3JjZS1keW5hbWljXCI7XG5leHBvcnQgY29uc3QgcnVudGltZSA9IFwibm9kZWpzXCI7XG5leHBvcnQgY29uc3QgZmV0Y2hDYWNoZSA9IFwiZm9yY2Utbm8tc3RvcmVcIjtcblxuaW1wb3J0IHsgTmV4dFJlc3BvbnNlIH0gZnJvbSBcIm5leHQvc2VydmVyXCI7XG5pbXBvcnQgeyBjb29raWVzIH0gZnJvbSBcIm5leHQvaGVhZGVyc1wiO1xuaW1wb3J0IHsgcHJpc21hIH0gZnJvbSBcIkAvbGliL3ByaXNtYVwiO1xuXG5jb25zdCBDT09LSUVfTkFNRSA9IFwicGJfc2Vzc2lvblwiO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gUE9TVCgpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCB0b2tlbiA9IGNvb2tpZXMoKS5nZXQoQ09PS0lFX05BTUUpPy52YWx1ZTtcblxuICAgIGlmICh0b2tlbikge1xuICAgICAgYXdhaXQgcHJpc21hLnNlc3Npb24uZGVsZXRlKHsgd2hlcmU6IHsgdG9rZW4gfSB9KS5jYXRjaCgoKSA9PiB7fSk7XG4gICAgfVxuXG4gICAgY29uc3QgcmVzID0gTmV4dFJlc3BvbnNlLmpzb24oeyBzdWNjZXNzOiB0cnVlIH0pO1xuXG4gICAgcmVzLmNvb2tpZXMuc2V0KHtcbiAgICAgIG5hbWU6IENPT0tJRV9OQU1FLFxuICAgICAgdmFsdWU6IFwiXCIsXG4gICAgICBodHRwT25seTogdHJ1ZSxcbiAgICAgIHNhbWVTaXRlOiBcImxheFwiLFxuICAgICAgc2VjdXJlOiBwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gXCJwcm9kdWN0aW9uXCIsXG4gICAgICBwYXRoOiBcIi9cIixcbiAgICAgIGV4cGlyZXM6IG5ldyBEYXRlKDApLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlcztcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkxPR09VVF9FUlJPUjpcIiwgZXJyKTtcbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBzdWNjZXNzOiB0cnVlIH0pO1xuICB9XG59Il0sIm5hbWVzIjpbImR5bmFtaWMiLCJydW50aW1lIiwiZmV0Y2hDYWNoZSIsIk5leHRSZXNwb25zZSIsImNvb2tpZXMiLCJwcmlzbWEiLCJDT09LSUVfTkFNRSIsIlBPU1QiLCJ0b2tlbiIsImdldCIsInZhbHVlIiwic2Vzc2lvbiIsImRlbGV0ZSIsIndoZXJlIiwiY2F0Y2giLCJyZXMiLCJqc29uIiwic3VjY2VzcyIsInNldCIsIm5hbWUiLCJodHRwT25seSIsInNhbWVTaXRlIiwic2VjdXJlIiwicHJvY2VzcyIsInBhdGgiLCJleHBpcmVzIiwiRGF0ZSIsImVyciIsImNvbnNvbGUiLCJlcnJvciJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./app/api/auth/logout/route.ts\n");

/***/ }),

/***/ "(rsc)/./lib/env.ts":
/*!********************!*\
  !*** ./lib/env.ts ***!
  \********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   validateEnv: () => (/* binding */ validateEnv)\n/* harmony export */ });\n/**\n * Server-side env validation. Ensures required variables are set at runtime.\n * Used before first DB access so deployment fails fast with a clear error.\n * Do not import this from client components.\n */ const REQUIRED_ENV = [\n    \"DATABASE_URL\"\n];\nfunction validateEnv() {\n    if (false) {}\n    const missing = [];\n    for (const key of REQUIRED_ENV){\n        const value = process.env[key];\n        if (value === undefined || value.trim() === \"\") {\n            missing.push(key);\n        }\n    }\n    if (missing.length > 0) {\n        throw new Error(`Missing required environment variable(s): ${missing.join(\", \")}. ` + \"Set them in Vercel Project Settings → Environment Variables (or in .env for local dev).\");\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvZW52LnRzIiwibWFwcGluZ3MiOiI7Ozs7QUFBQTs7OztDQUlDLEdBQ0QsTUFBTUEsZUFBZTtJQUFDO0NBQWU7QUFFOUIsU0FBU0M7SUFDZCxJQUFJLEtBQTZCLEVBQUUsRUFBTztJQUUxQyxNQUFNQyxVQUFvQixFQUFFO0lBQzVCLEtBQUssTUFBTUMsT0FBT0gsYUFBYztRQUM5QixNQUFNSSxRQUFRQyxRQUFRQyxHQUFHLENBQUNILElBQUk7UUFDOUIsSUFBSUMsVUFBVUcsYUFBYUgsTUFBTUksSUFBSSxPQUFPLElBQUk7WUFDOUNOLFFBQVFPLElBQUksQ0FBQ047UUFDZjtJQUNGO0lBQ0EsSUFBSUQsUUFBUVEsTUFBTSxHQUFHLEdBQUc7UUFDdEIsTUFBTSxJQUFJQyxNQUNSLENBQUMsMENBQTBDLEVBQUVULFFBQVFVLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUNqRTtJQUVOO0FBQ0YiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9wcm9kdWN0aW9uLWJvYXJkLy4vbGliL2Vudi50cz85M2YyIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogU2VydmVyLXNpZGUgZW52IHZhbGlkYXRpb24uIEVuc3VyZXMgcmVxdWlyZWQgdmFyaWFibGVzIGFyZSBzZXQgYXQgcnVudGltZS5cbiAqIFVzZWQgYmVmb3JlIGZpcnN0IERCIGFjY2VzcyBzbyBkZXBsb3ltZW50IGZhaWxzIGZhc3Qgd2l0aCBhIGNsZWFyIGVycm9yLlxuICogRG8gbm90IGltcG9ydCB0aGlzIGZyb20gY2xpZW50IGNvbXBvbmVudHMuXG4gKi9cbmNvbnN0IFJFUVVJUkVEX0VOViA9IFtcIkRBVEFCQVNFX1VSTFwiXSBhcyBjb25zdDtcblxuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlRW52KCk6IHZvaWQge1xuICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikgcmV0dXJuO1xuXG4gIGNvbnN0IG1pc3Npbmc6IHN0cmluZ1tdID0gW107XG4gIGZvciAoY29uc3Qga2V5IG9mIFJFUVVJUkVEX0VOVikge1xuICAgIGNvbnN0IHZhbHVlID0gcHJvY2Vzcy5lbnZba2V5XTtcbiAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZS50cmltKCkgPT09IFwiXCIpIHtcbiAgICAgIG1pc3NpbmcucHVzaChrZXkpO1xuICAgIH1cbiAgfVxuICBpZiAobWlzc2luZy5sZW5ndGggPiAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGUocyk6ICR7bWlzc2luZy5qb2luKFwiLCBcIil9LiBgICtcbiAgICAgICAgXCJTZXQgdGhlbSBpbiBWZXJjZWwgUHJvamVjdCBTZXR0aW5ncyDihpIgRW52aXJvbm1lbnQgVmFyaWFibGVzIChvciBpbiAuZW52IGZvciBsb2NhbCBkZXYpLlwiXG4gICAgKTtcbiAgfVxufVxuIl0sIm5hbWVzIjpbIlJFUVVJUkVEX0VOViIsInZhbGlkYXRlRW52IiwibWlzc2luZyIsImtleSIsInZhbHVlIiwicHJvY2VzcyIsImVudiIsInVuZGVmaW5lZCIsInRyaW0iLCJwdXNoIiwibGVuZ3RoIiwiRXJyb3IiLCJqb2luIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./lib/env.ts\n");

/***/ }),

/***/ "(rsc)/./lib/prisma.ts":
/*!***********************!*\
  !*** ./lib/prisma.ts ***!
  \***********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   prisma: () => (/* binding */ prisma)\n/* harmony export */ });\n/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @prisma/client */ \"@prisma/client\");\n/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_prisma_client__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _env__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./env */ \"(rsc)/./lib/env.ts\");\n// lib/prisma.ts\n\n\nconst globalForPrisma = globalThis;\nfunction createPrismaClient() {\n    (0,_env__WEBPACK_IMPORTED_MODULE_1__.validateEnv)();\n    return new _prisma_client__WEBPACK_IMPORTED_MODULE_0__.PrismaClient();\n}\nconst prisma = globalForPrisma.prisma ?? createPrismaClient();\nif (true) globalForPrisma.prisma = prisma;\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvcHJpc21hLnRzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQSxnQkFBZ0I7QUFDOEI7QUFDVjtBQUVwQyxNQUFNRSxrQkFBa0JDO0FBSXhCLFNBQVNDO0lBQ1BILGlEQUFXQTtJQUNYLE9BQU8sSUFBSUQsd0RBQVlBO0FBQ3pCO0FBRU8sTUFBTUssU0FBU0gsZ0JBQWdCRyxNQUFNLElBQUlELHFCQUFxQjtBQUVyRSxJQUFJRSxJQUFxQyxFQUFFSixnQkFBZ0JHLE1BQU0sR0FBR0EiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9wcm9kdWN0aW9uLWJvYXJkLy4vbGliL3ByaXNtYS50cz85ODIyIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIGxpYi9wcmlzbWEudHNcbmltcG9ydCB7IFByaXNtYUNsaWVudCB9IGZyb20gXCJAcHJpc21hL2NsaWVudFwiO1xuaW1wb3J0IHsgdmFsaWRhdGVFbnYgfSBmcm9tIFwiLi9lbnZcIjtcblxuY29uc3QgZ2xvYmFsRm9yUHJpc21hID0gZ2xvYmFsVGhpcyBhcyB1bmtub3duIGFzIHtcbiAgcHJpc21hOiBQcmlzbWFDbGllbnQgfCB1bmRlZmluZWQ7XG59O1xuXG5mdW5jdGlvbiBjcmVhdGVQcmlzbWFDbGllbnQoKTogUHJpc21hQ2xpZW50IHtcbiAgdmFsaWRhdGVFbnYoKTtcbiAgcmV0dXJuIG5ldyBQcmlzbWFDbGllbnQoKTtcbn1cblxuZXhwb3J0IGNvbnN0IHByaXNtYSA9IGdsb2JhbEZvclByaXNtYS5wcmlzbWEgPz8gY3JlYXRlUHJpc21hQ2xpZW50KCk7XG5cbmlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gXCJwcm9kdWN0aW9uXCIpIGdsb2JhbEZvclByaXNtYS5wcmlzbWEgPSBwcmlzbWE7XG4iXSwibmFtZXMiOlsiUHJpc21hQ2xpZW50IiwidmFsaWRhdGVFbnYiLCJnbG9iYWxGb3JQcmlzbWEiLCJnbG9iYWxUaGlzIiwiY3JlYXRlUHJpc21hQ2xpZW50IiwicHJpc21hIiwicHJvY2VzcyJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./lib/prisma.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fauth%2Flogout%2Froute&page=%2Fapi%2Fauth%2Flogout%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fauth%2Flogout%2Froute.ts&appDir=%2FUsers%2Fronkohen%2FDesktop%2FCursor%2Fasaf%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fronkohen%2FDesktop%2FCursor%2Fasaf&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();