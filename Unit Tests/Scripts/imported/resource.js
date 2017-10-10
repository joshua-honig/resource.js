'use strict';

(function () {

    var RESOURCE_JS_VERSION = '0.1.0';
    var RESOURCE_JS_KEY = '__resource-js-' + RESOURCE_JS_VERSION;

    if (!window[RESOURCE_JS_KEY]) {

        (function () {

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

            function _setJQueryModule(value, throwIfInvalid) {
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
                    } else {
                        if (throwIfInvalid) throw new Error('Minimum jQuery version is 1.11');
                    }
                }
            }

            _setJQueryModule(window.jQuery, false);

            function resource() { };
            var resource_module = new resource();
            resource_module.Context = Context;

            // CLASSES
            function Resource(name) {
                /// <field name="dependsOn" type="Array" elementType="Resource" />
                /// <field name="pendingDependentResources" type="Array" elementType="Resource" />
                /// <field name="pendingDependentActions" type="Array" elementType="Resource" />
                this.name = name;

                // The definition
                this.definition = null;

                // The resolved content or result of invoking the definition
                this.handle = null;

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
                this.name = resource.name;
                this.isDefined = resource.isDefined;
                this.isResolved = resource.isResolved;
                this.definition = resource.definition;
                this.dependsOn = { resolved: [], unresolved: [] };

                if (!isAnonymous) {
                    this.isExternal = resource.isExternal;
                    this.isRemote = resource.isRemote;
                    if (!_isEmpty(resource.url)) this.url = resource.url;
                    this.handle = resource.handle;
                    this.pendingDependents = { resources: [], actions: [] };
                }
            }

            ResourceInfo.prototype.toString = function () {
                return '[Resource ' + this.name + ']';
            };

            ResourceInfo.prototype.format = function () {
                var result = '\'' + this.name + '\'';
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
                    result[info.name] = info;
                }
                return result;
            };

            function compareNames(a, b) { return a.name < b.name ? -1 : 1; };

            function getName(x) { return x.name; }

            function formatSet(lines, list, label) {
                if (list.length == 0) return;
                if (!_isEmpty(label)) lines.push(label + ':');
                list.sort(compareNames);
                for (var i = 0; i < list.length; i++) {
                    lines.push(list[i].toString());
                }
            }

            ResourceInfoCollection.prototype.format = function () {
                var resolvedResources = [];
                var undefinedResources = [];
                var pendingResources = [];
                var pendingActions = [];

                for (var i = 0 ; i < this.length; i++) {
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
            }

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
                    'jQuery': {
                        get: function () { return $; },
                        set: function (value) { _setJQueryModule(value, true); },
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
                            resolved: { value: _context.isResolved.bind(_context), enumerable: true }
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

                // static exports
                Object.defineProperties(this, {
                    Context: { value: Context, enumerable: true },
                    version: { value: RESOURCE_JS_VERSION, enumerable: true },
                    ResourceInfo: { value: ResourceInfo, enumerable: false },
                    ResourceInfoCollection: { value: ResourceInfoCollection, enumerable: false }
                });
            }

            Context.create = function (name, force) {
                var isNamed = !_isEmpty(name);
                if (isNamed && (force !== true) && (_namedContexts.hasOwnProperty(name))) {
                    throw new Error('Context \'' + name + '\' is already defined');
                    return;
                }

                // Private instance with all required state
                var _instance = new _Context(name);

                // Public proxy 
                var instance = new Context(_instance);

                if (isNamed) {
                    _namedContexts[instance.name] = instance;
                } else {
                    // Default context. Export as window.res / window.resource
                    window.res = window.resource = instance;

                    // Backwards compatibility:
                    window.require = instance.require;
                    window.define = instance.define;
                }

                return instance;
            }

            Context.get = function (name, create) {
                /// <returns type="Context" />
                if (_isEmpty(name)) {
                    throw new Error('\'' + name + '\' cannot be empty');
                    return;
                }

                var context = _namedContexts[name];
                if (context == null && create) {
                    context = Context.create(name, false);
                }
                return context;
            };

            Context.destroy = function (name, recursive, strict) {
                if (_isEmpty(name)) {
                    throw new Error('\'' + name + '\' cannot be empty');
                    return;
                }

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
                            context.destroy(resource.name);
                        }
                    }
                }
            };

            // API FUNCTIONS
            function _Context(name) {
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

                this.id = _contextIndex++;
                this.name = name;
                this.resources = {};
                this.resolveDepth = 0;
                this.anonymousIndex = 1;
                this.loadMark = performance.now();
                this.externalPending = false;
                this.timeoutHandles = [];
                this.pendingActions = [];

                this.externalInterval = 100;
                this.externalTimeout = 10000;
            }

            _Context.prototype.debug = false;
            _Context.prototype.ignoreRedefine = true;
            _Context.prototype.automaticExternals = true;
            _Context.prototype.immediateResolve = true;

            _Context.prototype.define = function (resourceName) {

                var argCnt = arguments.length;
                if (!validate.argCount(arguments, 2, 'define', true)) return;
                if (!validate.isString(resourceName, 'resourceName', true)) return;

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

                _define(this, resourceName, dependsOn, definition, isLiteral);
            };

            _Context.prototype.define_remote = function (resourceName, url, isLiteral) {
                /// <signature>
                ///   <summary>Register the remote source of a lazy-loaded resource</summary>
                ///   <param name="resourceName" type="String">The unique key or name of the resource</param>
                ///   <param name="url" type="String">The URL to a script file that, when executed, defines the named resource</param> 
                /// </signature> 
                /// <signature>
                ///   <summary>Register the remote source of a lazy-loaded resource</summary>
                ///   <param name="resourceName" type="String">The unique key or name of the resource</param>
                ///   <param name="url" type="String">The URL to a script file that, when executed, defines the named resource</param> 
                ///   <param name="isLiteral" type="Boolean" optional="true">If true, the parsed object return from the URL (as passed to the jQuery.ajax.success handler) will be used as the resource itself</param>
                /// </signature>
                if (!validate.argCount(arguments, 2, 'define.remote', true)) return;
                if (!validate.isString(resourceName, 'resourceName', true)) return;
                if (!validate.isString(url, 'url', true)) return;

                if ($ == null) throw new Error('Cannot use define.remote until jQuery is loaded');

                _define(this, resourceName, [], null, isLiteral, null, false, null, url);
            };

            _Context.prototype.define_external = function (resourceName, source, test) {
                /// <signature>
                ///   <summary>Define an external resource reference based on the name of a global variable</summary>
                ///   <param name="resourceName" type="String">The unique key or name of the resource</param> 
                ///   <param name="variableName" type="String" optional="true">The global variable name. If ommitted, resourceName is used</param> 
                /// </signature>  
                /// <signature>
                ///   <summary>Define an external resource reference based on a source function. If the source function returns null or 
                ///   throws an error, resource will continue checking per the define.external.interval and define.external.timeout properties</summary>
                ///   <param name="resourceName" type="String">The unique key or name of the resource</param> 
                ///   <param name="source" type="Function">A function which returns the value of the external resource. Function should return null or
                ///   throw an error if the external resource is not yet available.</param> 
                /// </signature>  
                /// <signature>
                ///   <summary>Define an external resource reference based on a source function and test function. If the test function returns false,
                ///   resource will continue checking per the define.external.interval and define.external.timeout properties</summary>
                ///   <param name="resourceName" type="String">The unique key or name of the resource</param> 
                ///   <param name="source" type="Function">A function which returns the value of the external resource</param> 
                ///   <param name="test" type="Function">A function which returns true if the external resource is available or false if it is not</param> 
                /// </signature>  
                if (!validate.argCount(arguments, 1, 'define.external', true)) return;
                if (!validate.isString(resourceName, 'resourceName', true)) return;

                var argCnt = arguments.length;
                var isSimple = true;
                var globalVarName = resourceName;

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
                    source = function () { return window[globalVarName]; };
                    test = function () { return window.hasOwnProperty(globalVarName); };
                }

                _define(this, resourceName, [], source, false, null, true, test, null);
            };

            _Context.prototype.destroy = function (resourceName) {
                /// <summary>Destroy a named resource by deleting the internal reference to it and calling its destructor (~ method) if defined</summary>
                /// <param name="resourceName" type="String" />  
                if (!validate.argCount(arguments, 1, 'destroy', true)) return;
                if (!validate.isString(resourceName, 'resourceName', true)) return;

                return _destroyResource(this, resourceName);
            };

            _Context.prototype.require = function (dependsOn) {
                /// <signature>
                ///   <summary>Gets the content or result of a named resource. Returns null if the resource has not been defined or resolved</summary>
                ///   <param name="resourceName" type="String" /> 
                /// </signature> 
                /// <signature>
                ///   <summary>Execute a function that depends on one or more named resources</summary> 
                ///   <param name="dependsOn" type="Array" elementType="String">A list of resource names on which this function depends</param>
                ///   <param name="definition" type="Function">A function to execute when all required resources have been resolved</param> 
                /// </signature> 
                /// <signature>
                ///   <summary>Execute an instance method that depends on one or more named resources</summary> 
                ///   <param name="dependsOn" type="Array" elementType="String">A list of resource names on which this method depends</param>
                ///   <param name="thisArg" type="*">The thisArg to use when applying the method</param>
                ///   <param name="definition" type="Function">A function to execute when all required resources have been resolved</param> 
                /// </signature> 

                var argCnt = arguments.length;
                if (argCnt == 0) {
                    throw new Error('require requires at least one argument');
                    return;
                }

                if (argCnt == 1) {
                    // First overload. Simply fetching the definition of the resource. Equivalent to explicit require.getResource(true)
                    var resourceName = dependsOn;
                    return this.getResourceHandle(resourceName, true);
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

            _Context.prototype.isDefined = function (resourceName) {
                if (!this.resources.hasOwnProperty(resourceName)) return false;
                var resource = this.resources[resourceName];
                return resource.isDefined;
            };

            _Context.prototype.isResolved = function (resourceName) {
                /// <summary>Tests whether a resource has been defined and resolved</summary>
                /// <returns type="Boolean" />
                if (!this.resources.hasOwnProperty(resourceName)) return false;
                var resource = this.resources[resourceName];
                return resource.isDefined && resource.isResolved;
            };

            _Context.prototype.getResourceHandle = function (resourceName, resolve) {
                /// <summary>Gets a resource definition by name. Returns null if the resource has not been defined or resolved</summary>
                /// <param name="resourceName" type="String" />
                /// <param name="resolve" type="Boolean" optional="true">default false. Whether to attempt to resolve the resource if it is not already resolved </param>
                if (!this.resources.hasOwnProperty(resourceName)) return null;
                var resource = _getResourceDirect(this, resourceName);

                // Resource is neither defined nor registered to a URL. Return null
                if (!resource.isDefined && _isEmpty(resource.url)) {
                    if (resolve) {
                        throw new Error('Resource \'' + resourceName + '\' is not yet defined or resolved');
                        return null;
                    } else {
                        return null;
                    }
                }

                // Resource is defined and resolved. 
                if (resource.isDefined && resource.isResolved) return resource.handle;

                // Resource is not resolved. Attempt to resolve if resolve == true
                if (!resource.isResolved && resolve && _resolve(this, resource)) return resource.handle;

                if (resolve) {
                    throw new Error('Resource \'' + resourceName + '\' is not yet defined or resolved');
                    return null;
                } else {
                    return null;
                }
            };

            _Context.prototype.getResources = function (includeResources, includeAnonymous, includeDefined, includeResolved, includeUrls) {
                /// <returns type="ResourceInfoCollection" elementType="ResourceInfo" />
                var definedFiltered = ('boolean' == typeof includeDefined);
                var resolvedFiltered = ('boolean' == typeof includeResolved);

                var resultMap = {};
                var infoMap = {};

                if (includeUrls || (includeResources !== false)) {
                    for (var resourceName in this.resources) {
                        var resource = _getResourceDirect(this, resourceName);
                        if (resource.isUrlResource && !includeUrls) continue;
                        if (!resource.isUrlResource && (includeResources === false)) continue;
                        if (definedFiltered && (resource.isDefined != includeDefined)) continue;
                        if (resolvedFiltered && (resource.isResolved != includeResolved)) continue;
                        resultMap[resourceName] = infoMap[resourceName] = new ResourceInfo(resource);
                    }
                }

                if (includeAnonymous !== false) {
                    for (var i = 0 ; i < this.pendingActions.length; i++) {
                        var resource = this.pendingActions[i];
                        resourceName = resource.name;
                        if (definedFiltered && (resource.isDefined != includeDefined)) continue;
                        if (resolvedFiltered && (resource.isResolved != includeResolved)) continue;
                        resultMap[resourceName] = infoMap[resourceName] = new ResourceInfo(resource);
                    }
                }

                _expandResourceInfo(this, infoMap);
                var returnValues = new ResourceInfoCollection();
                for (var resourceName in resultMap) {
                    returnValues.push(resultMap[resourceName]);
                }
                return returnValues;
            };

            _Context.prototype.getResourceInfoByName = function (resourceName, expandDependsOn) {
                /// <summary>Gets a copy of externally visible information about a resource. Returns null if the resource has never been defined or referenced.</summary>
                /// <param name="resourceName" type="String" />
                /// <param name="expandDependsOn" type="Boolean" optional="true">Default false. true to expand the depends on names to separate resolved and unresolved lists</param>
                var resource = _getResourceDirect(this, resourceName);
                if (resource == null) return null;

                var infoMap = {};
                var info = infoMap[resourceName] = new ResourceInfo(resource);
                _expandResourceInfo(this, infoMap);
                return info;
            };

            _Context.prototype.resolve = function () {
                /// <signature>
                ///   <summary>Attempt to resolve all unresolved resources</summary>  
                /// </signature> 
                /// <signature>
                ///   <summary>Attempt to resolved a resource by name</summary> 
                ///   <param name="resourceName" type="String">The unique key or name of the resource</param> 
                ///   <returns type="Boolean" />
                /// </signature> 

                var hasName = (arguments.length > 0) && (typeof arguments[0] == 'string') && !_isEmpty(arguments[0]);
                if (hasName) {
                    var resource = _getResource(this, arguments[0]);
                    return _resolve(this, resource);
                } else {
                    for (var resourceName in this.resources) {
                        var resource = this.resources[resourceName];
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
                /// <signature>
                ///   <summary>Print a formatted list of any undefined resources, unresolved resources, and unresolved actions to the console</summary>
                /// </signature>
                /// <signature>
                ///   <summary>Generate a formatted list of any undefined resources, unresolved resources, and unresolved actions and return it as text or print it to the console</summary>
                ///   <param name="returnText" type="Boolean" optional="true">Default false. Wether to return the text of the messages instead of printing it to the console</param>
                /// </signature>

                var resources = this.getResources(true, true, null, false, true);
                var text = '';
                if (resources.length == 0) {
                    text = 'All resources and actions have been resolved';
                } else {
                    resources.format();
                }
                if (returnText) {
                    return text;
                } else {
                    console.log(text);
                }
            };

            // CORE FUNCTIONS: These require the context state as input
            function _getResource(ctx, resourceName) {
                /// <param name="ctx" type="_Context" />
                /// <param name="resourceName" type="String">The unique key or name of the resource</param>
                /// <returns type="Resource" /> 
                if (!ctx.resources.hasOwnProperty(resourceName)) {
                    var resource = ctx.resources[resourceName] = new Resource(resourceName);

                    if (ctx.automaticExternals && window.hasOwnProperty(resourceName)) {
                        if (ctx.debug) console.log('Using existing global object for resource \'' + resourceName + '\'');
                        resource.isDefined = true;
                        resource.isLiteral = true;
                        resource.isExternal = true;
                        resource.isInferred = true;
                        resource.isResolved = true;
                        resource.handle = resource.definition = window[resourceName];
                    }
                }
                return ctx.resources[resourceName];
            }

            function _getResourceDirect(ctx, resourceName) {
                /// <param name="ctx" type="_Context" />
                /// <param name="resourceName" type="String">The unique key or name of the resource</param>
                /// <returns type="Resource" />
                return ctx.resources[resourceName];
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

                for (var resourceName in ctx.resources) {
                    var resource = ctx.resources[resourceName];
                    if (resource.isExternal && !resource.isResolved) {
                        if (!_resolve(ctx, resource)) {
                            unresolvedNames.push(resourceName);
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
                        ctx.timeoutHandle = setTimeout(_resolveExternals, ctx.externalInterval, ctx);
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
                    if (ctx.debug) _resolveDebug(ctx, 'Resource \'' + resource.name + '\' already resolved');
                    return true;
                }
                if (!resource.isDefined && !resource.isRemote) {
                    if (ctx.debug) _resolveDebug(ctx, 'Resource \'' + resource.name + '\' not yet defined');
                    return false;
                }

                var resLabel = (resource.isAnonymousAction ? resource.name : 'resource ' + resource.name);
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
                        for (var i = 0 ; i < dependsOnCnt; i++) {
                            var dependsOnResource = resource.dependsOn[i];
                            if (dependsOnResource.isResolved) {
                                if (dependsOnResource.isUrlResource) {
                                    if (resource.isLiteral) {
                                        resource.definition = dependsOnResource.handle;
                                    }
                                } else {
                                    definitionArgs.push(dependsOnResource.handle);
                                }
                            } else if (_resolve(ctx, dependsOnResource)) {
                                _removeItem(dependsOnResource.pendingDependentResources, resource);
                                if (dependsOnResource.isUrlResource) {
                                    if (resource.isLiteral) {
                                        resource.definition = dependsOnResource.handle;
                                    }
                                } else {
                                    definitionArgs.push(dependsOnResource.handle);
                                }
                            } else {
                                if (ctx.debug) {
                                    _resolveDebug(ctx, resPrefix + 'Could not resolve required resource ' + dependsOnResource.name + '. Aborting resolve');
                                }
                                // Don't bother resolving any additional resources 
                                resource.isResolving = false;
                                return (ctx.resolveDepth--, false);
                            }
                        }
                    }

                    if (resource.isUrlResource) {
                        if ($ == null) {
                            throw new Error('Cannot result URL resource until jQuery is loaded');
                            return false;
                        }

                        $.ajax({
                            url: resource.url,
                            success: function (data) {
                                _resolve(ctx, resource, data);
                            },
                            error: function () {
                                resource.isResolving = false;
                                ctx.resolveDepth--;
                                throw new Error('Failed to load remote resource from url \'' + resource.url + '\'');
                            }
                        });

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
                            isLoaded = window.hasOwnProperty(resource.name);
                        } else {
                            temp_handle = resource.definition();
                            isLoaded = (temp_handle != null);
                        }

                        if (!isLoaded) {
                            // External resource not yet loaded 
                            resource.isResolving = false;
                            return (ctx.resolveDepth--, false);
                        }

                        if (temp_handle != null) {
                            resource.handle = temp_handle;
                        } else {
                            resource.handle = resource.definition = window[resource.name];
                        }
                    } else if (resource.isAnonymousAction) {
                        if (ctx.debug) _resolveDebug(ctx, resPrefix + 'Executing anonymous action');
                        resource.definition.apply(resource.thisArg, definitionArgs);
                    } else if (resource.isLiteral) {
                        if (ctx.debug) _resolveDebug(ctx, resPrefix + 'Assigning literal resource definition');
                        resource.handle = resource.definition;
                    } else {
                        if (ctx.debug) _resolveDebug(ctx, resPrefix + 'Executing resource definition');
                        resource.handle = resource.definition.apply(null, definitionArgs);
                    }
                } else {
                    if (ctx.debug) _resolveDebug(ctx, resPrefix + 'Assigning ajax result to URL resource definition');
                    resource.handle = result;
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
                    return (ctx.resolveDepth--, true);
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

            function _define(ctx, resourceName, dependsOn, definition, isLiteral, thisArg, isExternal, test, url) {
                /// <param name="ctx" type="_Context" />
                /// <param name="resourceName" type="String" />
                /// <param name="dependsOn" type="Array" elementType="String" />
                /// <param name="definition" type="*" />
                /// <param name="isLiteral" type="Boolean" />
                /// <param name="thisArg" type="*" />
                /// <param name="isExternal" type="Boolean" />
                /// <param name="test" type="Function" />

                var resource;
                var isAnonymousAction = _isEmpty(resourceName);
                var isRemote = !_isEmpty(url);
                var url_resource = null;

                if (isRemote) {
                    var url_lc = (url || '').toLowerCase();
                    resource = _getResource(ctx, resourceName);
                    url_resource = _getResource(ctx, '__URL::' + url_lc);

                    if (!resource.isDefined && _isEmpty(resource.url)) {
                        // First time _define ever called for this resource name
                        if (url_resource.isResolved) {
                            // URL has already been loaded
                            if (isLiteral) {
                                // Assign the returned content of the URL as the definition of this resource
                                definition = url_resource.handle;
                            } else {
                                // This call to define is saying that the named resource should be initialized by executing the remote script
                                // The remote URL has already been loaded, so therefore the named resource should already be defined
                                throw new Error('Specified url \'' + url + '\' for remote resource \'' + resourceName + '\' has already been loaded, but the named resource was not initialized');
                                return;
                            }
                        } else {
                            if (!url_resource.isUrlResource) {
                                // First time referencing this url
                                url_resource.isUrlResource = true;
                                url_resource.url = url;
                                url_resource.isDefined = true;
                            }
                            dependsOn.push(url_resource.name);
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
                                // hmm... this url hasn't been called before, but the specified resource name is already defined
                                // treat this is a name collision
                                isRedefinition = true;
                            }
                        }

                        if (isRedefinition) {
                            if (ctx.ignoreRedefine) {
                                /*if (ctx.debug)*/  console.log('Ignoring redefinition of resource \'' + resourceName + '\'');
                                return;
                            } else {
                                throw new Error('Resource \'' + resourceName + '\' is already defined');
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
                    resource = _getResource(ctx, resourceName);
                    if (resource.isDefined) {
                        if (isExternal && resource.isExternal && resource.isInferred) {
                            // Ok, confirming a previously inferred external resource;
                            resource.isInferred = false;
                            return;
                        }

                        if (ctx.ignoreRedefine) {
                            /*if (ctx.debug)*/  console.log('Ignoring redefinition of resource \'' + resourceName + '\'');
                            return;
                        } else {
                            throw new Error('Resource \'' + resourceName + '\' is already defined');
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
                            if (ctx.debug) console.log('Anonymous action depends on resource ' + dependsOnResource.name + ' which is not yet resolved');
                            dependsOnResource.pendingDependentActions.unshift(resource);
                        } else {
                            if (ctx.debug) console.log('resource ' + resource.name + ' depends on resource ' + dependsOnResource.name + ' which is not yet resolved');
                            dependsOnResource.pendingDependentResources.unshift(resource);
                        }
                        pendingDependsOnCnt++;
                    }
                }

                if (pendingDependsOnCnt == 0 || (isAnonymousAction && !ctx.immediateResolve)) {
                    // No pending dependencies OR anonymous action could trigger lazy resolution of dependencies. Attempt to resolve immediately.
                    if (isAnonymousAction || ctx.immediateResolve) {
                        // Only attempt to result if the resource is an anonymous action OR context calls for immediate resolution of all resources
                        var resolved = _resolve(ctx, resource);
                        if (!resolved && isAnonymousAction) {
                            ctx.pendingActions.push(resource);
                        }

                        if (!resolved && resource.isExternal && !ctx.externalPending) {
                            ctx.loadMark = performance.now();  // reset loading timer to most recent definition of external resource
                            ctx.externalPending = true;
                            ctx.timeoutHandle = setTimeout(_resolveExternals, ctx.externalInterval, ctx);
                        }
                    }
                } else if (isAnonymousAction) {
                    ctx.pendingActions.push(resource);
                }
            }

            function _destroyResource(ctx, resourceName) {
                /// <param name="ctx" type="_Context" />
                /// <param name="resourceName" type="String" /> 

                if (ctx.resources.hasOwnProperty(resourceName)) {
                    var resource = _getResourceDirect(ctx, resourceName);
                    delete ctx.resources[resourceName]
                    if (resource.isResolved && resource.handle && _isFunction(resource.handle['~'])) {
                        try {
                            resource.handle['~']();
                        } catch (err) {
                            console.warn('Encountered error when calling destructor on resource \'' + resourceName + '\'', err);
                        }
                    }
                }
            }

            function _getResourceInfo(context, infoMap, resourceNames, resource) {
                /// <returns type="ResourceInfo" />
                var info = infoMap[resource.name];
                if (info == null) {
                    info = infoMap[resource.name] = new ResourceInfo(resource);
                    resourceNames.push(resource.name);
                }
                return info;
            }

            function _expandResourceInfo(context, infoMap) {
                var resourceNames = [];
                for (var resourceName in infoMap) {
                    resourceNames.push(resourceName);
                }

                var j = 0;
                while (j < resourceNames.length) {
                    var resourceName = resourceNames[j];
                    var info = infoMap[resourceName];
                    if (info.isAnonymousAction) {
                        var resource = context.pendingActions.filter(function (x) { return x.name == resourceName; })[0];
                    } else {
                        var resource = _getResourceDirect(context, resourceName);
                    }

                    for (var i = 0; i < resource.dependsOn.length; i++) {
                        var dependsOnInfo = _getResourceInfo(context, infoMap, resourceNames, resource.dependsOn[i]);
                        if (dependsOnInfo.isResolved) {
                            info.dependsOn.resolved.push(dependsOnInfo);
                        } else {
                            info.dependsOn.unresolved.push(dependsOnInfo);
                        }
                    }

                    for (i = 0; i < resource.pendingDependentResources.length; i++) {
                        var dependentInfo = _getResourceInfo(context, infoMap, resourceNames, resource.pendingDependentResources[i]);
                        info.pendingDependents.resources.push(dependentInfo);
                    }

                    for (i = 0; i < resource.pendingDependentActions.length; i++) {
                        var dependentInfo = _getResourceInfo(context, infoMap, resourceNames, resource.pendingDependentActions[i]);
                        info.pendingDependents.actions.push(dependentInfo);
                    }

                    j++;
                }
            }


            window[RESOURCE_JS_KEY] = resource_module;

            // Initialize default context
            Context.create();
        })();
    }
})();