'use strict';

(function () {

    // Safely get the root JavaScript object even in strict mode:
    var __require = null;
    try {
        __require = require;
        if (__require != null) { console.log('Captured existing require value', __require); }
    } catch (e) { }

    var ___global = null;
    try { ___global = window; } catch (e) { }
    if (___global == null) try { ___global = self; } catch (e) { }
    if (___global == null) try { ___global = global; } catch (e) { }
    if (___global == null) try { ___global = root; } catch (e) { }

    var performance = ___global.performance || {};
    if (typeof performance.now != 'function') {
        performance.now = function () { return Date.now(); };
    }

    var RESOURCE_JS_VERSION = '1.0.5';
    var RESOURCE_JS_KEY = '__resource-js-' + RESOURCE_JS_VERSION;

    if (!___global[RESOURCE_JS_KEY]) {

        (function () {

            var DEFAULTS = {
                debug: false,
                ignoreRedefine: true,
                automaticExternals: true,
                immediateResolve: false,
                externalInterval: 100,
                externalTimeout: 10000
            };

            var __createToken = {};
            var __defaultContext = null;
            var _hasMapClass = false;
            var _proxyMap = {};

            if (___global.Map && ___global.Map instanceof Function) {
                _hasMapClass = true;
                _proxyMap = new ___global.Map();
            }

            // UTILITY FUNCTIONS
            function _space(count) {
                if (count < 0) count = 0;
                var a = [];
                a[count] = '';
                return a.join(' ');
            }

            function _removeItem(array, item) {
                var ix = array.indexOf(item);
                if (ix >= 0) array.splice(ix, 1);
            }

            function _isEmpty(value) {
                if (value == null) return true;
                if ('string' != typeof value) {
                    value = value.toString();
                }
                if (value.length == 0) return true;
                if (value.trim().length == 0) return true;
                return false;
            }

            function _isFunction(object) {
                if (object == null) return false;
                if (typeof object != 'function') return false;
                return (object instanceof Function);
            }

            function _isArray(object) {
                if (object == null) return false;
                if (typeof object != 'object') return false;
                return (object instanceof Array);
            }

            var NUM_NAMES = 'zero|one|two|three|four|five|six|seven|eight'.split('|');

            var validate = {
                isNumber: function (value, min, max, argName, throwOnFalse) {
                    argName = argName || 'value';
                    if ('number' !== typeof value) if (throwOnFalse) { throw new TypeError(argName + ' must be a Number'); } else { return false; }
                    if (isNaN(value)) if (throwOnFalse) { throw new RangeError(argName + ' cannt be NaN'); } else { return false; }
                    if (this.isNumber(min) && (value < min)) if (throwOnFalse) { throw new TypeError(argName + ' must be greater than or equal to ' + min); } else { return false; }
                    if (this.isNumber(max) && (value > max)) if (throwOnFalse) { throw new TypeError(argName + ' must be less than or equal to ' + max); } else { return false; }
                    return true;
                },

                isString: function (value, argName, throwOnFalse) {
                    if ('string' != typeof value) {
                        if (throwOnFalse) { throw new TypeError(argName + ' must be a string'); }
                        return false;
                    } else if (_isEmpty(value)) {
                        if (throwOnFalse) { throw new TypeError(argName + ' cannot be empty'); }
                        return false;
                    }
                    return true;
                },

                argCount: function (argArray, minCount, funcName, throwOnFalse) {
                    if (argArray.length < minCount) {
                        if (throwOnFalse) { throw new Error(funcName + ' requires at least ' + (NUM_NAMES[minCount] || minCount) + ' argument' + (minCount == 1 ? '' : 's')); }
                        return false;
                    }
                    return true;
                }
            };

            // Static private fields
            var _contextIndex = 1;
            var _namedContexts = {};

            var $ = null;
            var axios = null;
            var ajaxProvider = null;

            function _setJQueryModule(value, throwIfInvalid) {
                if (value == null) {
                    if (__require != null) try { value = __require('jquery'); } catch (e) { }
                }

                if (value == null) {
                    if (throwIfInvalid) throw new Error('value cannot be null');
                    return;
                } if (!value.fn || ('string' != typeof value.fn.jquery)) {
                    if (throwIfInvalid) throw new Error('Provided value is not a recognized jQuery module');
                    return;
                } else {
                    var versionParts = value.fn.jquery.split('.');
                    // Require at least jQuery version 1.11
                    if (((+versionParts[0]) > 1) || ((+versionParts[1]) >= 11)) {
                        $ = value;
                        axios = null;
                        ajaxProvider = 'jquery';
                    } else {
                        if (throwIfInvalid) throw new Error('Minimum jQuery version is 1.11');
                    }
                }
            }

            function _setAxiosModule(value, throwIfInvalid) {
                if (value == null) {
                    if (__require != null) try { value = __require('axios'); } catch (e) { }
                }

                if (value == null) {
                    if (throwIfInvalid) throw new Error('value cannot be null');
                    return;
                } if (!value.Axios || ('function' != typeof value.Axios)) {
                    if (throwIfInvalid) throw new Error('Provided value is not a recognized Axios module');
                    return;
                } else {
                    axios = value;
                    $ = null;
                    ajaxProvider = 'axios';
                }
            }

            function _ensureAjaxProvider(throwIfNone) {
                if (ajaxProvider != null) return;
                if (___global.jQuery) _setJQueryModule(___global.jQuery, false);

                if (ajaxProvider != null) return;
                if (___global.axios) _setAxiosModule(___global.axios, false);

                if (ajaxProvider != null) return;
                if (throwIfNone) throw new Error('No ajax provider has been loaded.');
            }

            _ensureAjaxProvider(false);

            function resource() { };
            var resource_module = new resource();
            resource_module.Context = Context;

            // CLASSES
            function Resource(id) {
                /// <field name="dependsOn" type="Array" elementType="Resource" />
                /// <field name="pendingDependentResources" type="Array" elementType="Resource" />
                /// <field name="pendingDependentActions" type="Array" elementType="Resource" />
                this.id = id;

                // The definition
                this.definition = null;

                // The resolved content or result of invoking the definition
                this.value = null;

                this.isAnonymousAction = false;
                this.thisArg = null;
                this.isDefined = false;
                this.isLiteral = false;
                this.isExternal = false;
                this.isInferred = false;
                this.isRemote = false;
                this.isResolved = false;
                this.isResolving = false;
                this.hasTest = false;
                this.test = null;
                this.url = null;
                this.isUrlResource = false;

                this.dependsOn = [];
                this.pendingDependentResources = [];
                this.pendingDependentActions = [];
            }

            function ResourceInfo(resource) {
                /// <param name="resource" type="Resource" />

                var isAnonymous = this.isAnonymousAction = resource.isAnonymousAction;
                this.id = resource.id;
                this.isDefined = resource.isDefined;
                this.isResolved = resource.isResolved;
                this.definition = resource.definition;
                this.dependsOn = { resolved: [], unresolved: [] };

                if (!isAnonymous) {
                    this.isExternal = resource.isExternal;
                    this.isRemote = resource.isRemote;
                    if (!_isEmpty(resource.url)) this.url = resource.url;
                    this.value = resource.value;
                    this.pendingDependents = { resources: [], actions: [] };
                }
            }

            ResourceInfo.prototype.toString = function () {
                return '[Resource ' + this.id + ']';
            };

            ResourceInfo.prototype.format = function () {
                var result = '\'' + this.id + '\'';
                if (this.isDefined) {
                    var unresolved = this.dependsOn.unresolved;
                    if (unresolved.length > 0) {
                        result += ' (unresolved dependencies: [' + unresolved.map(getName).sort().join(', ') + '])';
                    }
                } else {
                    var pendingResources = this.pendingDependents.resources;
                    var pendingActions = this.pendingDependents.actions;

                    if (pendingResources.length > 0) {
                        result += ' (pending resources: [' + pendingResources.map(getName).sort().join(', ') + '])';
                    }
                    if (pendingActions.length > 0) {
                        result += ' (pending actions: [' + pendingActions.map(getName).sort().join(', ') + '])';
                    }
                }

                return result;
            };

            function ResourceInfoCollection() { }

            ResourceInfoCollection.prototype = [];
            ResourceInfoCollection.prototype.constructor = ResourceInfoCollection;

            ResourceInfoCollection.prototype.toMap = function () {
                var result = {};
                for (var i = 0; i < this.length; i++) {
                    var info = this[i];
                    result[info.id] = info;
                }
                return result;
            };

            function compareNames(a, b) { return a.id < b.id ? -1 : 1; };

            function getName(x) { return x.id; }

            function formatSet(lines, list, label) {
                if (list.length == 0) return;
                if (!_isEmpty(label)) lines.push(label + ':');
                list.sort(compareNames);
                for (var i = 0; i < list.length; i++) {
                    var item = list[i];
                    if (_isFunction(item.format)) {
                        lines.push('  ' + item.format());
                    } else {
                        lines.push('  ' + item.toString());
                    }
                }
            }

            ResourceInfoCollection.prototype.format = function () {
                var resolvedResources = [];
                var undefinedResources = [];
                var pendingResources = [];
                var pendingActions = [];

                for (var i = 0; i < this.length; i++) {
                    var info = this[i];
                    if (!info.isDefined) {
                        undefinedResources.push(info);
                    } else if (info.isResolved) {
                        resolvedResources.push(info);
                    } else if (info.isAnonymousAction) {
                        pendingActions.push(info);
                    } else {
                        pendingResources.push(info);
                    }
                }

                var lines = [];
                formatSet(lines, resolvedResources, 'Resolved resources');
                formatSet(lines, undefinedResources, 'Undefined resources');
                formatSet(lines, pendingResources, 'Pending resources');
                formatSet(lines, pendingActions, 'Pending actions');
                return lines.join('\r\n');
            };

            function Context(_context) {
                /// <param name="_context" type="_Context" />
                if (!(this instanceof Context)) {
                    throw new TypeError("Context must be called with the new keyword");
                    return;
                }
                if (!(_context instanceof _Context)) {
                    throw new TypeError("Context instances must be constructed by calling resource.Context.create()");
                    return;
                }

                var isDefault = _isEmpty(_context.name);

                var _external = Object.create(null, {
                    // read only :
                    autoResolve: {
                        get: function () { return _context.automaticExternals; },
                        set: function (value) { _context.automaticExternals = (value === true); },
                        enumerable: true
                    },

                    // validated read-write
                    interval: {
                        get: function () { return _context.externalInterval },
                        set: function (value) {
                            if (!validate.isNumber(value, 10, null, 'externalInterval', true)) return;
                            _context.externalInterval = value;
                        },
                        enumerable: true
                    },
                    timeout: {
                        get: function () { return _context.externalTimeout },
                        set: function (value) {
                            if (!validate.isNumber(value, 10, null, 'externalTimeout', true)) return;
                            _context.externalTimeout = value;
                        },
                        enumerable: true
                    }
                });

                var _config = Object.create(null, {
                    // validated read-write
                    debug: {
                        get: function () { return _context.debug; },
                        set: function (value) { _context.debug = (value === true); },
                        enumerable: true
                    },
                    ignoreRedefine: {
                        get: function () { return _context.ignoreRedefine; },
                        set: function (value) { _context.ignoreRedefine = (value === true); },
                        enumerable: true
                    },
                    immediateResolve: {
                        get: function () { return _context.immediateResolve; },
                        set: function (value) { _context.immediateResolve = (value === true); },
                        enumerable: true
                    },

                    useJQuery: {
                        value: function (jQuery) { _setJQueryModule(jQuery || (___global.jQuery), true) },
                        enumerable: true
                    },
                    useAxios: {
                        value: function (axios) { _setAxiosModule(axios || (___global.axios), true); },
                        enumerable: true
                    },
                    ajaxProvider: {
                        get: function () { return ajaxProvider; },
                        enumerable: true
                    },

                    // read only
                    external: { value: _external, enumerable: true }
                });

                var _internals = Object.create(null, {
                    // read only :
                    anonymousIndex: {
                        get: function () { return _context.anonymousIndex; },
                        enumerable: true
                    },
                    externalPending: {
                        get: function () { return _context.externalPending; },
                        enumerable: true
                    },
                    key: {
                        value: RESOURCE_JS_KEY,
                        enumerable: true
                    }
                });

                // Properties
                Object.defineProperties(this, {
                    id: { get: function () { return _context.id; }, enumerable: true },
                    name: { get: function () { return _context.name; }, enumerable: true },
                    config: { value: _config, enumerable: true },
                    internals: { value: _internals, enumerable: true }
                });

                var fnList = _context.getResources.bind(_context);

                // Methods
                Object.defineProperties(this, {
                    // Core API:
                    define: { value: _context.define.bind(_context), enumerable: true },
                    require: { value: _context.require.bind(_context), enumerable: true },
                    destroy: { value: _context.destroy.bind(_context), enumerable: true },

                    // Extended API:
                    resolve: { value: _context.resolve.bind(_context), enumerable: true },
                    reset: { value: _context.reset.bind(_context), enumerable: true },

                    // Descriptive API:
                    get: { value: _context.getResourceHandle.bind(_context), enumerable: true },
                    describe: { value: _context.getResourceInfoByName.bind(_context), enumerable: true },
                    is: {
                        value: Object.create(null, {
                            defined: { value: _context.isDefined.bind(_context), enumerable: true },
                            resolved: { value: _context.isResolved.bind(_context), enumerable: true },
                            'default': { value: isDefault, enumerable: true }
                        }), enumerable: true
                    },
                    list: { value: fnList, enumerable: true },
                    printUnresolved: { value: _context.list_unresolved.bind(_context), enumerable: true }
                });

                // Nested methods
                Object.defineProperties(this.define, {
                    // Core API:
                    remote: { value: _context.define_remote.bind(_context), enumerable: true },
                    external: { value: _context.define_external.bind(_context), enumerable: true }
                });

                Object.defineProperties(this.list, {
                    all: { value: function () { return fnList(true, true); }, enumerable: true },
                    resolved: { value: function () { return fnList(true, true, null, true); }, enumerable: true },
                    unresolved: { value: function () { return fnList(true, true, null, false); }, enumerable: true },
                    defined: { value: function () { return fnList(true, true, true); }, enumerable: true },
                    undefined: { value: function () { return fnList(true, true, false); }, enumerable: true },
                    resources: { value: function (defined, resolved) { return fnList(true, false, defined, resolved); }, enumerable: true },
                    actions: { value: function (defined, resolved) { return fnList(false, true, defined, resolved); }, enumerable: true }
                });

                // static exports of default context (root.resource)
                if (isDefault) {
                    Object.defineProperties(this, {
                        Context: { value: Context, enumerable: true },
                        version: { value: RESOURCE_JS_VERSION, enumerable: true },
                        ResourceInfo: { value: ResourceInfo, enumerable: false },
                        ResourceInfoCollection: { value: ResourceInfoCollection, enumerable: false }
                    });
                }

                if (_hasMapClass) {
                    _proxyMap.set(_context, this);
                    _proxyMap.set(this, _context);
                } else {
                    _proxyMap[_context.name || '__default'] = {
                        context: _context,
                        proxy: this
                    };
                }
            }

            Context.create = function (name, parentContext, force) {
                validate.argCount(arguments, 1, 'Context.create', true);

                var isNamed = true;
                if (name === __createToken) {
                    isNamed = false;
                } else {
                    validate.isString(name, 'name', true);
                    if (arguments.length == 1) {
                        parentContext = null;
                        force = false;
                    } else if ('boolean' == typeof parentContext) {
                        force = parentContext;
                        parentContext = null;
                    } else if (parentContext instanceof Context) {
                        // Get the internal _Context for the provided Context
                        if (_hasMapClass) {
                            parentContext = _proxyMap.get(parentContext);
                        } else {
                            parentContext = _proxyMap[parentContext.name || '__default'].context;
                        }
                    } else {
                        throw new Error('Invalid argument. Second argument to Context.create must be a boolean or Context object');
                        return;
                    }

                    if (isNamed && (force !== true) && (_namedContexts.hasOwnProperty(name))) {
                        throw new Error('Context \'' + name + '\' is already defined');
                        return;
                    }
                }

                // Private instance with all required state
                var _instance = new _Context(name, parentContext);

                // Public proxy
                var instance = new Context(_instance);

                if (isNamed) {
                    _namedContexts[instance.name] = instance;
                } else {
                    // Default context. Export as ___global.res / ___global.resource
                    __defaultContext = ___global.res = ___global.resource = instance;

                    // Backwards compatibility:
                    ___global.require = instance.require;
                    ___global.define = instance.define;
                }

                return instance;
            };

            Context.get = function (name, create) {
                /// <returns type="Context" />
                validate.argCount(arguments, 1, 'Context.get', true);
                validate.isString(name, 'name', true);

                var context = _namedContexts[name];
                if (context == null && create) {
                    context = Context.create(name, false);
                }
                return context;
            };

            Context.destroy = function (name, recursive, strict) {
                var context = Context.get(name, false);
                if (context == null) {
                    if (strict) {
                        throw new Error('Context \'' + name + '\' does not exist');
                    }
                    return;
                }

                if (recursive) {
                    var resources = context.list.resolved();
                    for (var i = 0; i < resources.length; i++) {
                        if (!resource.isAnonymousAction) {
                            context.destroy(resource.id);
                        }
                    }
                }


            };

            // API FUNCTIONS
            function _Context(name, parentContext) {
                /// <field name="id" type="Number" integer="true" />
                /// <field name="name" type="String" />
                /// <field name="externalInterval" type="Number" />
                /// <field name="externalTimeout" type="Number" />
                /// <field name="resources" type="Object" />
                /// <field name="resolveDepth" type="Number" integer="true" />
                /// <field name="anonymousIndex" type="Number" integer="true" />
                /// <field name="loadMark" type="Number" integer="true" />
                /// <field name="externalPending" type="Boolean" />
                /// <field name="debug" type="Boolean" />
                /// <field name="ignoreRedefine" type="Boolean" />
                /// <field name="automaticExternals" type="Boolean" />
                /// <field name="immediateResolve" type="Boolean" />
                /// <field name="childContexts" type="Array" elementType="_Context" />
                /// <field name="parentContext" type="_Context" />

                this.id = _contextIndex++;

                if ('string' === typeof name) {
                    this.name = name;
                }

                this.resources = {};
                this.resolveDepth = 0;
                this.anonymousIndex = 1;
                this.loadMark = performance.now();
                this.externalPending = false;
                this.timeoutHandles = [];
                this.pendingActions = [];
                this.childContexts = [];
                this.parentContext = parentContext;

                this.externalInterval = DEFAULTS.externalInterval;
                this.externalTimeout = DEFAULTS.externalTimeout;
            }

            _Context.prototype.debug = DEFAULTS.debug;
            _Context.prototype.ignoreRedefine = DEFAULTS.ignoreRedefine;
            _Context.prototype.automaticExternals = DEFAULTS.automaticExternals;
            _Context.prototype.immediateResolve = DEFAULTS.immediateResolve;

            _Context.prototype.define = function (resourceID) {

                var argCnt = arguments.length;
                if (!validate.argCount(arguments, 2, 'define', true)) return;
                if (!validate.isString(resourceID, 'resourceID', true)) return;

                var i;
                var arg1 = arguments[1];
                var arg2 = arguments[2];
                var definition, dependsOn, isLiteral = false;

                if (argCnt >= 3) {
                    if (typeof arg2 == 'boolean') {
                        // Third arg is boolean. Treat second arg as definition, third arg as isLiteral
                        dependsOn = [];
                        definition = arg1;
                        isLiteral = arg2;
                    } else {
                        // Treat second arg as dependsOn, third arg as definition
                        dependsOn = arg1;
                        definition = arg2;
                        if (argCnt >= 4 && (typeof arguments[3] == 'boolean')) {
                            isLiteral = arguments[3];
                        }
                    }
                } else {
                    // Only two args. Second arg must be the definition
                    dependsOn = [];
                    definition = arg1;
                }

                _define(this, resourceID, dependsOn, definition, isLiteral);
            };

            _Context.prototype.define_remote = function (resourceID, url, isLiteral) {
                if (!validate.argCount(arguments, 2, 'define.remote', true)) return;
                if (!validate.isString(url, 'url', true)) return;

                var resourceIDs = [];
                if (_isArray(resourceID)) {
                    resourceIDs = resourceID;
                    if (isLiteral === true) {
                        throw new Error('isLiteral = true is not valid with an array of resource ids');
                        return;
                    }
                } else {
                    resourceIDs = [resourceID];
                }

                for (var i = 0; i < resourceIDs.length; i++) {
                    if (!validate.isString(resourceIDs[i], 'resourceID', true)) return;
                }

                _ensureAjaxProvider(true);

                for (var i = 0; i < resourceIDs.length; i++) {
                    _define(this, resourceIDs[i], [], null, isLiteral, null, false, null, url);
                }
            };

            _Context.prototype.define_external = function (resourceID, source, test) {
                if (!validate.argCount(arguments, 1, 'define.external', true)) return;
                if (!validate.isString(resourceID, 'resourceID', true)) return;

                var argCnt = arguments.length;
                var isSimple = true;
                var globalVarName = resourceID;

                if (argCnt > 1) {
                    if ('string' == typeof source) {
                        globalVarName = source;
                    } else if (_isFunction(source)) {
                        isSimple = false;
                    } else {
                        throw new TypeError('source must be a string or a function');
                        return;
                    }

                    if (argCnt > 2 && !_isFunction(test)) {
                        throw new TypeError('test must be a function');
                        return;
                    }
                }

                if (isSimple) {
                    source = function () { return ___global[globalVarName]; };
                    test = function () { return ___global.hasOwnProperty(globalVarName); };
                }

                _define(this, resourceID, [], source, false, null, true, test, null);
            };

            _Context.prototype.destroy = function (resourceID) {
                if (!validate.argCount(arguments, 1, 'destroy', true)) return;
                if (!validate.isString(resourceID, 'resourceID', true)) return;

                return _destroyResource(this, resourceID);
            };

            _Context.prototype.require = function (dependsOn) {
                var argCnt = arguments.length;
                if (argCnt == 0) {
                    throw new Error('require requires at least one argument');
                    return;
                }

                if (argCnt == 1) {
                    // First overload. Simply fetching the definition of the resource. Equivalent to explicit require.getResource(true)
                    var resourceID = dependsOn;
                    return this.getResourceHandle(resourceID, true);
                }

                var definition, thisArg;
                var arg1 = arguments[1];

                if (argCnt == 2) {
                    definition = arg1;
                } else {
                    thisArg = arg1;
                    definition = arguments[2];
                }

                if (!_isFunction(definition)) {
                    throw new Error('definition must be a function');
                }

                if (!_isArray(dependsOn)) {
                    if (typeof dependsOn == 'string') {
                        dependsOn = [dependsOn];
                    } else {
                        throw new Error('dependsOn must be a string or array of strings');
                    }
                }

                _define(this, null, dependsOn, definition, false, thisArg);
            };

            _Context.prototype.isDefined = function (resourceID) {
                var resource = _getResourceDirect(this, resourceID);
                return (resource != null) && resource.isDefined;
            };

            _Context.prototype.isResolved = function (resourceID) {
                /// <summary>Tests whether a resource has been defined and resolved</summary>
                /// <returns type="Boolean" />
                var resource = _getResourceDirect(this, resourceID);
                return (resource != null) && resource.isDefined && resource.isResolved;
            };

            _Context.prototype.getResourceHandle = function (resourceID, resolve) {
                /// <summary>Gets a resource definition by name. Returns null if the resource has not been defined or resolved</summary>
                /// <param name="resourceID" type="String" />
                /// <param name="resolve" type="Boolean" optional="true">default false. Whether to attempt to resolve the resource if it is not already resolved </param>
                var resource = _getResourceDirect(this, resourceID);
                if (resource == null) return undefined;

                // Resource is neither defined nor registered to a URL. Return null
                if (!resource.isDefined && _isEmpty(resource.url)) {
                    if (resolve) {
                        throw new Error('Resource \'' + resourceID + '\' is not yet defined or resolved');
                        return null;
                    } else {
                        return null;
                    }
                }

                // Resource is defined and resolved.
                if (resource.isDefined && resource.isResolved) return resource.value;

                // Resource is not resolved. Attempt to resolve if resolve == true
                if (!resource.isResolved && resolve && _resolve(this, resource)) return resource.value;

                if (resolve) {
                    throw new Error('Resource \'' + resourceID + '\' is not yet defined or resolved');
                    return null;
                } else {
                    return null;
                }
            };

            _Context.prototype.getResources = function (includeResources, includeActions, includeDefined, includeResolved, includeUrls) {
                /// <returns type="ResourceInfoCollection" elementType="ResourceInfo" />
                var definedFiltered = ('boolean' == typeof includeDefined);
                var resolvedFiltered = ('boolean' == typeof includeResolved);

                var resultMap = {};
                var infoMap = {};

                if (includeUrls || (includeResources !== false)) {
                    for (var resourceID in this.resources) {
                        var resource = _getResourceDirect(this, resourceID);
                        if (resource.isUrlResource && !includeUrls) continue;
                        if (!resource.isUrlResource && (includeResources === false)) continue;
                        if (definedFiltered && (resource.isDefined != includeDefined)) continue;
                        if (resolvedFiltered && (resource.isResolved != includeResolved)) continue;
                        resultMap[resourceID] = infoMap[resourceID] = new ResourceInfo(resource);
                    }
                }

                if (includeActions !== false) {
                    for (var i = 0; i < this.pendingActions.length; i++) {
                        var resource = this.pendingActions[i];
                        resourceID = resource.id;
                        if (definedFiltered && (resource.isDefined != includeDefined)) continue;
                        if (resolvedFiltered && (resource.isResolved != includeResolved)) continue;
                        resultMap[resourceID] = infoMap[resourceID] = new ResourceInfo(resource);
                    }
                }

                _expandResourceInfo(this, infoMap);
                var returnValues = new ResourceInfoCollection();
                for (var resourceID in resultMap) {
                    returnValues.push(resultMap[resourceID]);
                }
                return returnValues;
            };

            // Implementation of resource.describe
            _Context.prototype.getResourceInfoByName = function (resourceID) {
                var resource = _getResourceDirect(this, resourceID);
                if (resource == null) return null;

                var infoMap = {};
                var info = infoMap[resourceID] = new ResourceInfo(resource);
                _expandResourceInfo(this, infoMap);
                return info;
            };

            _Context.prototype.resolve = function () {
                var hasName = (arguments.length > 0) && (typeof arguments[0] == 'string') && !_isEmpty(arguments[0]);
                if (hasName) {
                    var resource = _getResource(this, arguments[0]);
                    return _resolve(this, resource);
                } else {
                    for (var resourceID in this.resources) {
                        var resource = this.resources[resourceID];
                        if (!resource.isResolved) {
                            _resolve(this, resource);
                        }
                    }
                }
            };

            _Context.prototype.reset = function () {
                /// <summary>Discards all resource definitions and pending actions and resets the require context</summary>

                this.id = _contextIndex++;

                for (var h in this.timeoutHandles) {
                    clearTimeout(h);
                    delete this.timeoutHandles[h];
                }

                this.resources = {};
                this.pendingActions = [];
                this.resolveDepth = 0;
                this.anonymousIndex = 1;
                this.externalPending = false;
                this.loadMark = performance.now();

                this.debug = false;
                this.ignoreRedefine = true;
                this.automaticExternals = true;
                this.immediateResolve = true;
            };

            _Context.prototype.list_unresolved = function (returnText) {
                var resources = this.getResources(true, true, null, false, true);
                var text = '';
                if (resources.length == 0) {
                    text = 'All resources and actions have been resolved';
                } else {
                    text = resources.format();
                }
                if (returnText) {
                    return text;
                } else {
                    console.log(text);
                }
            };

            // CORE FUNCTIONS: These require the context state as input
            function _getResource(ctx, resourceID) {
                /// <param name="ctx" type="_Context" />
                /// <param name="resourceID" type="String">The unique key or name of the resource</param>
                /// <returns type="Resource" />
                var resource = _getResourceDirect(ctx, resourceID);
                if (resource == null) {
                    resource = ctx.resources[resourceID] = new Resource(resourceID);

                    if (ctx.automaticExternals && ___global.hasOwnProperty(resourceID)) {
                        if (ctx.debug) console.log('Using existing global object for resource \'' + resourceID + '\'');
                        resource.isDefined = true;
                        resource.isLiteral = true;
                        resource.isExternal = true;
                        resource.isInferred = true;
                        resource.isResolved = true;
                        resource.value = resource.definition = ___global[resourceID];
                    }
                }

                return resource;
            }

            function _getResourceDirect(ctx, resourceID) {
                /// <param name="ctx" type="_Context" />
                /// <param name="resourceID" type="String">The unique key or name of the resource</param>
                /// <returns type="Resource" />
                var ctxtemp = ctx;
                while (ctxtemp != null) {
                    var resource = ctxtemp.resources[resourceID];
                    if (resource != null) return resource;
                    ctxtemp = ctxtemp.parentContext;
                }
                return undefined;
            }

            function _resolveDebug(ctx, message) {
                /// <param name="ctx" type="_Context" />
                console.log(_space(ctx.resolveDepth * 2) + message);
            }

            function _resolveExternals(ctx) {
                /// <param name="ctx" type="_Context" />

                var timeoutHandle = ctx.timeoutHandle;
                clearTimeout(timeoutHandle);
                delete ctx.timeoutHandles[timeoutHandle];

                //if (_isEmpty(ctx.name)) {
                //    if (ctx.id != _contextIndex) return;
                //} else {
                //    var currentEnv = Context.get(ctx.name);
                //    if (currentEnv && currentEnv.id != ctx.id) return;
                //}

                var unresolvedNames = [];

                for (var resourceID in ctx.resources) {
                    var resource = ctx.resources[resourceID];
                    if (resource.isExternal && !resource.isResolved) {
                        if (!_resolve(ctx, resource)) {
                            unresolvedNames.push(resourceID);
                        }
                    }
                }

                if (unresolvedNames.length > 0) {
                    if (ctx.debug) {
                        console.log('ctx id ' + ctx.id + ' :: external modules not yet resolved : ' + unresolvedNames.join(', '));
                    }
                    var elapsed = performance.now() - ctx.loadMark;
                    if (elapsed > ctx.externalTimeout) {
                        console.log('Aborting automatic resolve of external resources. The following external resources are not yet resolved: ' + unresolvedNames.join(', '));
                    } else {
                        ctx.externalPending = true;
                        ctx.timeoutHandle = setTimeout(_resolveExternals.bind(null, ctx), ctx.externalInterval);
                    }
                } else {
                    ctx.externalPending = false;
                }
            }

            function _resolve(ctx, resource, result) {
                /// <param name="ctx" type="_Context" />
                /// <param name="resource" type="Resource" />
                /// <param name="result" type="*" />
                /// <returns type="Boolean" />
                if (resource.isResolved) {
                    if (ctx.debug) _resolveDebug(ctx, 'Resource \'' + resource.id + '\' already resolved');
                    return true;
                }
                if (!resource.isDefined && !resource.isRemote) {
                    if (ctx.debug) _resolveDebug(ctx, 'Resource \'' + resource.id + '\' not yet defined');
                    return false;
                }

                var resLabel = (resource.isAnonymousAction ? resource.id : 'resource ' + resource.id);
                var resPrefix = '[' + resLabel + ']:: ';

                if (result === undefined) {
                    if (resource.isResolving) {
                        if (ctx.debug) _resolveDebug(ctx, resPrefix + 'Already resolving. Exiting to avoid recursive resolve');
                        return false;
                    }
                    resource.isResolving = true;

                    if (ctx.debug) _resolveDebug(ctx, resPrefix + 'Attempting to resolve');

                    ctx.resolveDepth++;
                    var definitionArgs = [];
                    var dependsOnCnt = resource.dependsOn.length;

                    if (dependsOnCnt > 0) {
                        for (var i = 0; i < dependsOnCnt; i++) {
                            var dependsOnResource = resource.dependsOn[i];
                            if (dependsOnResource.isResolved) {
                                if (dependsOnResource.isUrlResource) {
                                    if (resource.isLiteral) {
                                        resource.definition = dependsOnResource.value;
                                    }
                                } else {
                                    definitionArgs.push(dependsOnResource.value);
                                }
                            } else if (_resolve(ctx, dependsOnResource)) {
                                _removeItem(dependsOnResource.pendingDependentResources, resource);
                                if (dependsOnResource.isUrlResource) {
                                    if (resource.isLiteral) {
                                        resource.definition = dependsOnResource.value;
                                    }
                                } else {
                                    definitionArgs.push(dependsOnResource.value);
                                }
                            } else {
                                if (ctx.debug) {
                                    _resolveDebug(ctx, resPrefix + 'Could not resolve required resource ' + dependsOnResource.id + '. Aborting resolve');
                                }
                                // Don't bother resolving any additional resources
                                resource.isResolving = false;
                                return (ctx.resolveDepth-- , false);
                            }
                        }
                    }

                    if (resource.isUrlResource) {
                        _ensureAjaxProvider(true);

                        var fnSuccess = function (data) {
                            _resolve(ctx, resource, data);
                        };

                        var fnError = function () {
                            resource.isResolving = false;
                            ctx.resolveDepth--;
                            throw new Error('Failed to load remote resource from url \'' + resource.url + '\'');
                        };

                        if (ajaxProvider == 'jquery') {
                            $.ajax({
                                url: resource.url,
                                success: function (data) {
                                    try {
                                        _resolve(ctx, resource, data);
                                    } catch (error) {
                                        console.error(error);
                                        fnError();
                                    }
                                },
                                error: fnError
                            });
                        } else if (ajaxProvider == 'axios') {
                            axios.get(resource.url)
                                .then(function (response) {
                                    var data = response.data;
                                    if (response.headers && (/javascript/i.test(String(response.headers['content-type'])))) {
                                        var h = document.getElementsByTagName('head')[0];
                                        var scr = document.createElement('script');
                                        scr.innerHTML = data;
                                        h.appendChild(scr);
                                        scr.remove();
                                    }
                                    _resolve(ctx, resource, data);
                                })
                                .catch(function (error) {
                                    console.error(error);
                                    fnError();
                                });
                        }

                        // Return false now because the resource is NOT yet resolved
                        return false;

                    } else if (resource.isExternal) {
                        var isLoaded = false;
                        var temp_handle = null;
                        if (resource.hasTest) {
                            if (isLoaded = resource.test()) {
                                temp_handle = resource.definition();
                            }
                        } else if (resource.isLiteral) {
                            isLoaded = ___global.hasOwnProperty(resource.id);
                        } else {
                            temp_handle = resource.definition();
                            isLoaded = (temp_handle != null);
                        }

                        if (!isLoaded) {
                            // External resource not yet loaded
                            resource.isResolving = false;
                            return (ctx.resolveDepth-- , false);
                        }

                        if (temp_handle != null) {
                            resource.value = temp_handle;
                        } else {
                            resource.value = resource.definition = ___global[resource.id];
                        }
                    } else if (resource.isAnonymousAction) {
                        if (ctx.debug) _resolveDebug(ctx, resPrefix + 'Executing anonymous action');
                        resource.definition.apply(resource.thisArg, definitionArgs);
                    } else if (resource.isLiteral) {
                        if (ctx.debug) _resolveDebug(ctx, resPrefix + 'Assigning literal resource definition');
                        resource.value = resource.definition;
                    } else {
                        if (ctx.debug) _resolveDebug(ctx, resPrefix + 'Executing resource definition');
                        resource.value = resource.definition.apply(null, definitionArgs);
                    }
                } else {
                    if (ctx.debug) _resolveDebug(ctx, resPrefix + 'Assigning ajax result to URL resource definition');
                    resource.value = result;
                }

                resource.isResolved = true;

                // Resource was resolved. Remove it from the list of all its dependee's dependent lists
                for (var i = 0; i < dependsOnCnt; i++) {
                    var dependsOnResource = resource.dependsOn[i];
                    if (!dependsOnResource.isResolving) {
                        if (resource.isAnonymousAction) {
                            _removeItem(dependsOnResource.pendingDependentActions, resource);
                        } else {
                            _removeItem(dependsOnResource.pendingDependentResources, resource);
                        }
                    }
                }

                if (resource.isAnonymousAction) {
                    resource.isResolving = false;
                    _removeItem(ctx.pendingActions, resource);
                    return (ctx.resolveDepth-- , true);
                }

                var lng = resource.pendingDependentResources.length;
                if (ctx.immediateResolve && lng > 0) {
                    if (ctx.debug) _resolveDebug(ctx, resPrefix + 'Attempting to resolve dependent resources');
                    ctx.resolveDepth++;
                    var i = 0;
                    while (resource.pendingDependentResources.length > i) {
                        var dependentResource = resource.pendingDependentResources[i];
                        if (dependentResource.isResolved || _resolve(ctx, dependentResource)) {
                            resource.pendingDependentResources.splice(i, 1);
                        } else {
                            i++;
                        }
                    }
                    ctx.resolveDepth--;
                }

                var lng = resource.pendingDependentActions.length;
                if (lng > 0) {
                    if (ctx.debug) _resolveDebug(ctx, resPrefix + 'Attempting to resolve dependent actions for');
                    ctx.resolveDepth++;
                    var i = 0;
                    while (resource.pendingDependentActions.length > i) {
                        var dependentAction = resource.pendingDependentActions[i];
                        if (dependentAction.isResolved || _resolve(ctx, dependentAction)) {
                            resource.pendingDependentActions.splice(i, 1);
                        } else {
                            i++;
                        }
                    }
                    ctx.resolveDepth--;
                }

                if (result != null) {
                    // Ajax result. Attempt to resolve all anonymous actions
                    var actions = ctx.pendingActions.concat();
                    for (i = actions.length - 1; i >= 0; i--) {
                        _resolve(ctx, actions[i]);
                    }
                }

                resource.isResolving = false;
                ctx.resolveDepth--;

                return true;
            }

            function _define(ctx, resourceID, dependsOn, definition, isLiteral, thisArg, isExternal, test, url) {
                /// <param name="ctx" type="_Context" />
                /// <param name="resourceID" type="String" />
                /// <param name="dependsOn" type="Array" elementType="String" />
                /// <param name="definition" type="*" />
                /// <param name="isLiteral" type="Boolean" />
                /// <param name="thisArg" type="*" />
                /// <param name="isExternal" type="Boolean" />
                /// <param name="test" type="Function" />

                var resource;
                var isAnonymousAction = _isEmpty(resourceID);
                var isRemote = !_isEmpty(url);
                var url_resource = null;

                if (isRemote) {
                    var url_lc = (url || '').toLowerCase();
                    resource = _getResource(ctx, resourceID);
                    url_resource = _getResource(ctx, '__URL::' + url_lc);

                    if (!resource.isDefined && _isEmpty(resource.url)) {
                        // First time _define ever called for this resource id
                        if (url_resource.isResolved) {
                            // URL has already been loaded
                            if (isLiteral) {
                                // Assign the returned content of the URL as the definition of this resource
                                definition = url_resource.value;
                            } else {
                                // This call to define is saying that the named resource should be initialized by executing the remote script
                                // The remote URL has already been loaded, so therefore the named resource should already be defined
                                throw new Error('Specified url \'' + url + '\' for remote resource \'' + resourceID + '\' has already been loaded, but the named resource was not initialized');
                                return;
                            }
                        } else {
                            if (!url_resource.isUrlResource) {
                                // First time referencing this url
                                url_resource.isUrlResource = true;
                                url_resource.url = url;
                                url_resource.isDefined = true;
                            }
                            dependsOn.push(url_resource.id);
                        }
                    } else {
                        var isRedefinition = false;
                        // _define has been called before
                        if (!_isEmpty(resource.url)) {
                            // define.remote has been called before
                            isRedefinition = true;
                        } else {
                            // direct _define already called. Basically just setting which URL we expected to get this from
                            if (url_resource.isResolved) {
                                resource.url = url;
                                return;
                            } else {
                                // hmm... this url hasn't been called before, but the specified resource id is already defined
                                // treat this is a id collision
                                isRedefinition = true;
                            }
                        }

                        if (isRedefinition) {
                            if (ctx.ignoreRedefine) {
                                /*if (ctx.debug)*/  console.log('Ignoring redefinition of resource \'' + resourceID + '\'');
                                return;
                            } else {
                                throw new Error('Resource \'' + resourceID + '\' is already defined');
                                return;
                            }
                        }
                    }
                }

                if (isAnonymousAction) {
                    // Anonymous action ALWAYS generates a new Resource descriptor
                    resource = new Resource('Action ' + (ctx.anonymousIndex++));
                } else {
                    // Retrieve the existing Resource descriptor, or generate a new empty one
                    resource = _getResource(ctx, resourceID);
                    if (resource.isDefined) {
                        if (isExternal && resource.isExternal && resource.isInferred) {
                            // Ok, confirming a previously inferred external resource;
                            resource.isInferred = false;
                            return;
                        }

                        if (ctx.ignoreRedefine) {
                            /*if (ctx.debug)*/  console.warn('Ignoring redefinition of resource \'' + resourceID + '\'');
                            return;
                        } else {
                            throw new Error('Resource \'' + resourceID + '\' is already defined');
                            return;
                        }
                    }
                }

                var i;
                var dependsOnNames = [], dependsOnResources = [];

                if (!_isArray(dependsOn)) {
                    throw new Error('dependsOn argument must be an array');
                    return;
                }

                for (i = 0; i < dependsOn.length; i++) {
                    var item = dependsOn[i];
                    if (typeof item != 'string') {
                        throw new Error('dependsOn must be an array of strings. Item at index ' + i + ' is a ' + (typeof item));
                        return;
                    }
                    dependsOnNames.push(item);
                }

                isLiteral = isLiteral || !_isFunction(definition);

                resource.isAnonymousAction = isAnonymousAction;
                resource.definition = definition;
                resource.isLiteral = isLiteral;
                resource.isDefined = resource.isDefined || !isRemote;
                resource.url = url;
                resource.isRemote = isRemote;
                resource.thisArg = thisArg;

                if (isExternal === true) {
                    resource.isExternal = true;

                    if (_isFunction(test)) {
                        resource.test = test;
                        resource.hasTest = true;
                    }
                }

                var lng = dependsOnNames.length;
                var pendingDependsOnCnt = 0;

                for (i = 0; i < lng; i++) {
                    var dependsOnResource = _getResource(ctx, dependsOnNames[i]);
                    resource.dependsOn.push(dependsOnResource);
                    if (!dependsOnResource.isResolved) {
                        if (isAnonymousAction) {
                            if (ctx.debug) console.log('Anonymous action depends on resource ' + dependsOnResource.id + ' which is not yet resolved');
                            dependsOnResource.pendingDependentActions.unshift(resource);
                        } else {
                            if (ctx.debug) console.log('resource ' + resource.id + ' depends on resource ' + dependsOnResource.id + ' which is not yet resolved');
                            dependsOnResource.pendingDependentResources.unshift(resource);
                        }
                        pendingDependsOnCnt++;
                    }
                }

                if (pendingDependsOnCnt == 0 || (isAnonymousAction && !ctx.immediateResolve)) {
                    // No pending dependencies OR anonymous action could trigger lazy resolution of dependencies. Attempt to resolve immediately.
                    if (isAnonymousAction || ctx.immediateResolve) {
                        // Only attempt to resolve if the resource is an anonymous action OR context calls for immediate resolution of all resources
                        var resolved = _resolve(ctx, resource);
                        if (!resolved && isAnonymousAction) {
                            ctx.pendingActions.push(resource);
                        }

                        if (!resolved && resource.isExternal && !ctx.externalPending) {
                            ctx.loadMark = performance.now();  // reset loading timer to most recent definition of external resource
                            ctx.externalPending = true;
                            ctx.timeoutHandle = setTimeout(_resolveExternals.bind(null, ctx), ctx.externalInterval);
                        }
                    }
                } else if (isAnonymousAction) {
                    ctx.pendingActions.push(resource);
                }
            }

            function _destroyResource(ctx, resourceID, removeReferencesOnly) {
                /// <param name="ctx" type="_Context" />
                /// <param name="resourceID" type="String" />

                // ONLY destroy resources on THIS context, not parent context.
                if (ctx.resources.hasOwnProperty(resourceID)) {
                    var resource = _getResourceDirect(ctx, resourceID);

                    var dependsOn = resource.dependsOn;
                    if (!resource.isResolved) {
                        if (resource.pendingDependentActions.length > 0) {
                            throw new Error('Cannot destroy resource that has pending dependent actions');
                            return;
                        } else if (resource.pendingDependentResources.length > 0) {
                            throw new Error('Cannot destroy resource that has pending dependent resources');
                            return;
                        }

                        resource.dependsOn = [];

                        // Remove from lists of pending actions / resources
                        for (var i = 0; i < dependsOn.length; i++) {
                            var dependsOnResource = dependsOn[i];
                            _removeItem(dependsOnResource.pendingDependentActions, resource);
                            _removeItem(dependsOnResource.pendingDependentResources, resource);
                        }
                    }

                    if (removeReferencesOnly) return;

                    delete ctx.resources[resourceID]
                    if (resource.isResolved && resource.value && _isFunction(resource.value['~'])) {
                        try {
                            resource.value['~']();
                        } catch (err) {
                            console.warn('Encountered error when calling destructor on resource \'' + resourceID + '\'', err);
                        }
                    }
                }
            }

            function _getResourceInfo(context, infoMap, resourceIDs, resource) {
                /// <returns type="ResourceInfo" />
                var info = infoMap[resource.id];
                if (info == null) {
                    info = infoMap[resource.id] = new ResourceInfo(resource);
                    resourceIDs.push(resource.id);
                }
                return info;
            }

            function _expandResourceInfo(context, infoMap) {
                var resourceIDs = [];
                for (var resourceID in infoMap) {
                    resourceIDs.push(resourceID);
                }

                var j = 0;
                while (j < resourceIDs.length) {
                    var resourceID = resourceIDs[j];
                    var info = infoMap[resourceID];
                    if (info.isAnonymousAction) {
                        var resource = context.pendingActions.filter(function (x) { return x.id == resourceID; })[0];
                    } else {
                        var resource = _getResourceDirect(context, resourceID);
                    }

                    for (var i = 0; i < resource.dependsOn.length; i++) {
                        var dependsOnInfo = _getResourceInfo(context, infoMap, resourceIDs, resource.dependsOn[i]);
                        if (dependsOnInfo.isResolved) {
                            info.dependsOn.resolved.push(dependsOnInfo);
                        } else {
                            info.dependsOn.unresolved.push(dependsOnInfo);
                        }
                    }

                    for (i = 0; i < resource.pendingDependentResources.length; i++) {
                        var dependentInfo = _getResourceInfo(context, infoMap, resourceIDs, resource.pendingDependentResources[i]);
                        info.pendingDependents.resources.push(dependentInfo);
                    }

                    for (i = 0; i < resource.pendingDependentActions.length; i++) {
                        var dependentInfo = _getResourceInfo(context, infoMap, resourceIDs, resource.pendingDependentActions[i]);
                        info.pendingDependents.actions.push(dependentInfo);
                    }

                    j++;
                }
            }

            ___global[RESOURCE_JS_KEY] = resource_module;

            // Initialize default context
            Context.create(__createToken);
            Object.defineProperty(Context, 'default', { value: __defaultContext });

            try {
                if (typeof module == 'object' && typeof module.exports == 'object') {
                    module.exports = ___global[RESOURCE_JS_KEY];
                }
            } catch (e) { }
        })();
    }

})();