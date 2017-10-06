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
                this.defined = false;
                this.isLiteral = false;
                this.isExternal = false;
                this.isInferred = false;
                this.isRemote = false;
                this.resolved = false;
                this.resolving = false;
                this.hasTest = false;
                this.test = null;
                this.url = null;
                this.isUrlResource = false;

                this.dependsOn = [];
                this.pendingDependentResources = [];
                this.pendingDependentActions = [];
            }

            function Context(_context) {
                /// <signature>
                ///   <summary>Create new contexts through the Context.create() factory method</summary>
                /// </signature>
                /// <field name="id" type="Number" integer="true" />
                /// <field name="name" type="String" /> 
                /// <field name="externalPending" type="Boolean" /> 
                /// <field name="debug" type="Boolean" /> 
                /// <field name="ignoreRedefine" type="Boolean" /> 
                /// <field name="automaticExternals" type="Boolean" /> 
                /// <field name="immediateResolve" type="Boolean" /> 

                Object.defineProperties(this, {
                    // read only : 
                    id: { get: function () { return _context.id; } },
                    name: { get: function () { return _context.id; } },
                    externalPending: { get: function () { return _context.externalPending; } },
                    anonymousIndex: { get: function () { return _context.anonymousIndex; } },

                    // simple read-write
                    debug: {
                        get: function () { return _context.debug; },
                        set: function (value) { _context.debug = (value === true); }
                    },
                    ignoreRedefine: {
                        get: function () { return _context.ignoreRedefine; },
                        set: function (value) { _context.ignoreRedefine = (value === true); }
                    },
                    automaticExternals: {
                        get: function () { return _context.automaticExternals; },
                        set: function (value) { _context.automaticExternals = (value === true); }
                    },
                    immediateResolve: {
                        get: function () { return _context.immediateResolve; },
                        set: function (value) { _context.immediateResolve = (value === true); }
                    },

                    // validated read-write
                    externalInterval: {
                        get: function () { return _context.externalInterval },
                        set: function (value) {
                            if (!validate.isNumber(value, 10, null, 'externalInterval', true)) return;
                            _context.externalInterval = value;
                        }
                    },
                    externalTimeout: {
                        get: function () { return _context.externalTimeout },
                        set: function (value) {
                            if (!validate.isNumber(value, 10, null, 'externalTimeout', true)) return;
                            _context.externalTimeout = value;
                        }
                    },
                    'jQuery': {
                        get: function () { return $; },
                        set: function (value) { _setJQueryModule(value, true); }
                    },

                    //
                    version: { get: function () { return RESOURCE_JS_VERSION; } },
                    key: { get: function () { return RESOURCE_JS_KEY; } }
                });

                this.define = _context.define.bind(_context);
                this.define.remote = _context.define_remote.bind(_context);
                this.define.external = _context.define_external.bind(_context);

                this.require = _context.require.bind(_context);

                this.getResource = _context.getResourceHandle.bind(_context);
                this.getResourceInfo = _context.getResourceInfoByName.bind(_context);
                this.getResources = _context.getResources.bind(_context);
                this.getPendingActions = _context.getPendingActions.bind(_context);
                this.getPendingResources = _context.getPendingResources.bind(_context);
                this.getUndefinedResources = _context.getUndefinedResources.bind(_context);
                this.isDefined = _context.isDefined.bind(_context);
                this.isResolved = _context.isResolved.bind(_context);
                this.resolve = _context.resolve.bind(_context);
                this.reset = _context.reset.bind(_context);
                this.listUnresolved = _context.list_unresolved.bind(_context);
                this.destroy = _context.destroy.bind(_context);

                var me = this;
                Object.defineProperties(this.define.external, {
                    timeout: {
                        get: function () { return me.externalTimeout; },
                        set: function (value) { me.externalTimeout = value; }
                    },
                    interval: {
                        get: function () { return me.externalInterval; },
                        set: function (value) { me.externalInterval = value; }
                    }
                });

                this.Context = Context;
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

            Context.get = function (name) {
                /// <returns type="Context" />
                return _namedContexts[name];
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
                /// <signature>
                ///   <summary>Define a new resource without any dependencies</summary>
                ///   <param name="resourceName" type="String">The unique key or name of the resource</param>
                ///   <param name="definition" type="*">A plain object or function that defines the resource</param>
                ///   <param name="isLiteral" type="Boolean" optional="true">If definition is a function and literal is true, 
                ///   the definition will be used as the resource itself, rather than being invoked to obtain the resource</param>
                /// </signature> 
                /// <signature>
                ///   <summary>Define a new resource with one or more dependencies</summary>
                ///   <param name="resourceName" type="String">The unique key or name of the resource</param>
                ///   <param name="dependsOn" type="Array" elementType="String">A list of resource names on which this resource depends</param>
                ///   <param name="definition" type="*">A plain object or function that defines the resource</param>
                ///   <param name="isLiteral" type="Boolean" optional="true">If definition is a function and literal is true, 
                ///   the definition will be used as the resource itself, rather than being invoked to obtain the resource</param>
                /// </signature>

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
                /// <summary>Tests whether a resource has been defined</summary>
                /// <returns type="Boolean" />
                if (!this.resources.hasOwnProperty(resourceName)) return false;
                var resource = this.resources[resourceName];
                return resource.defined;
            };

            _Context.prototype.isResolved = function (resourceName) {
                /// <summary>Tests whether a resource has been defined and resolved</summary>
                /// <returns type="Boolean" />
                if (!this.resources.hasOwnProperty(resourceName)) return false;
                var resource = this.resources[resourceName];
                return resource.defined && resource.resolved;
            };

            _Context.prototype.getResourceHandle = function (resourceName, resolve) {
                /// <summary>Gets a resource definition by name. Returns null if the resource has not been defined or resolved</summary>
                /// <param name="resourceName" type="String" />
                /// <param name="resolve" type="Boolean" optional="true">default false. Whether to attempt to resolve the resource if it is not already resolved </param>
                if (!this.resources.hasOwnProperty(resourceName)) return null;
                var resource = _getResourceDirect(this, resourceName);

                // Resource is neither defined nor registered to a URL. Return null
                if (!resource.defined && _isEmpty(resource.url)) {
                    if (resolve) {
                        throw new Error('Resource \'' + resourceName + '\' is not yet defined or resolved');
                        return null;
                    } else {
                        return null;
                    }
                }

                // Resource is defined and resolved. 
                if (resource.defined && resource.resolved) return resource.handle;

                // Resource is not resolved. Attempt to resolve if resolve == true
                if (!resource.resolved && resolve && _resolve(this, resource)) return resource.handle;

                if (resolve) {
                    throw new Error('Resource \'' + resourceName + '\' is not yet defined or resolved');
                    return null;
                } else {
                    return null;
                }
            };

            _Context.prototype.getResources = function (includeAnonymous) {
                /// <summary>Gets a collection of all referenced resource names</summary>
                /// <param name="includeAnonymous" type="Boolean" optional="true">Whether or not to include pending anonymous functions in the result set</param>
                var result = {};
                for (var resourceName in this.resources) {
                    var resource = _getResourceDirect(this, resourceName);
                    if (resource.isUrlResource) continue;
                    if (resource.isAnonymousAction && !includeAnonymous) continue;
                    result[resourceName] = this.getResourceInfo(this.resources[resourceName]);
                }
                return result;
            };

            _Context.prototype.getResourceInfoByName = function (resourceName, expandDependsOn) {
                /// <summary>Gets a copy of externally visible information about a resource. Returns null if the resource has never been defined or referenced.</summary>
                /// <param name="resourceName" type="String" />
                /// <param name="expandDependsOn" type="Boolean" optional="true">Default false. true to expand the depends on names to separate resolved and unresolved lists</param>
                var resource = _getResourceDirect(this, resourceName);
                if (resource == null) return null;
                return this.getResourceInfo(resource, expandDependsOn);
            };

            _Context.prototype.getResourceInfo = function (resource, expandDependsOn) {
                /// <summary>Gets a copy of externally visible information about a resource without exposing the actual resource object itself</summary>
                /// <param name="resource" type="Resource" />
                /// <param name="expandDependsOn" type="Boolean" optional="true">Default false. true to expand the depends on names to separate resolved and unresolved lists</param>
                var dependsOnNames = [];
                for (var i = 0; i < resource.dependsOn.length; i++) {
                    dependsOnNames.push(resource.dependsOn[i].name);
                }

                var dependsOn = dependsOnNames;
                if (expandDependsOn) {
                    dependsOn = { resolved: [], unresolved: [] };

                    var dependsOnCnt = dependsOnNames.length;
                    for (var j = 0; j < dependsOnCnt; j++) {
                        var dependsOnName = dependsOnNames[j];
                        var dependsOnResource = _getResourceDirect(this, dependsOnName);

                        if (dependsOnResource.isUrlResource) {
                            dependsOnName = dependsOnResource.url;
                        }

                        if (dependsOnResource.resolved) {
                            dependsOn.resolved.push(dependsOnResource.name);
                        } else {
                            dependsOn.unresolved.push(dependsOnResource.name);
                        }
                    }
                }

                if (resource.isAnonymousAction) {
                    return {
                        name: resource.name,
                        func: resource.definition,
                        isAnonymousAction: true,
                        dependsOn: dependsOn
                    };
                } else {
                    return {
                        name: resource.name,
                        defined: resource.defined,
                        resolved: resource.resolved,
                        handle: resource.handle,
                        isExternal: resource.isExternal,
                        dependsOn: dependsOn
                    };
                }
            };

            _Context.prototype.getPendingActions = function () {
                /// <summary>Get a list of the pending actions queued with require()</summary>
                /// <returns type="Array" />

                var result = [];
                var actionKeys = {};

                for (var resourceName in this.resources) {
                    var resource = _getResourceDirect(this, resourceName);
                    var lng = resource.pendingDependentActions.length;
                    if (lng > 0) {
                        for (var i = 0; i < lng; i++) {
                            var anonResource = resource.pendingDependentActions[i];
                            var anonName = anonResource.name;
                            if (!(anonName in actionKeys)) {
                                var anonInfo = actionKeys[anonName] = this.getResourceInfo(anonResource, true);
                                result.push(anonInfo);
                            }
                        }
                    }
                }

                return result;
            };

            _Context.prototype.getPendingResources = function () {
                /// <summary>Get a list of all resources that have unresolved dependencies</summary>
                /// <returns type="Array" /> 
                var result = [];

                for (var resourceName in this.resources) {
                    var resource = this.resources[resourceName];
                    if (!resource.resolved && resource.defined) {
                        result.push(this.getResourceInfo(resource, true));
                    }
                }

                return result;
            };

            _Context.prototype.getUndefinedResources = function () {
                /// <summary>Get a list of resource names that have not yet been defined, and the resources or actions which depend on then</summary>
                var result = [];

                for (var resourceName in this.resources) {
                    var resource = _getResourceDirect(this, resourceName);
                    if (!resource.defined) {
                        var info = {
                            name: resourceName,
                            pendingResources: [],
                            pendingActions: []
                        };
                        if (resource.pendingDependentResources.length > 0) {
                            for (var i = 0; i < resource.pendingDependentResources.length; i++) {
                                info.pendingResources.push(this.getResourceInfo(resource.pendingDependentResources[i], true));
                            }
                        }
                        if (resource.pendingDependentActions.length > 0) {
                            for (var i = 0; i < resource.pendingDependentActions.length; i++) {
                                info.pendingActions.push(this.getResourceInfo(resource.pendingDependentActions[i], true));
                            }
                        }
                        result.push(info);
                    }
                }

                return result;
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
                        if (!resource.resolved) {
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

                var undefinedResources = this.getUndefinedResources();
                var unresolvedResources = this.getPendingResources();
                var unresolvedActions = this.getPendingActions();

                returnText = returnText === true;

                if (undefinedResources.length == 0 && unresolvedResources.length == 0 && unresolvedActions.length == 0) {
                    var msg = 'All resources and actions have been resolved';
                    if (returnText) {
                        return msg;
                    } else {
                        console.log(msg);
                        return;
                    }
                }

                var allLines = [];
                var fnLog = function (line) { console.log(line); };
                if (returnText) {
                    fnLog = function (line) { allLines.push(line); };
                }

                if (undefinedResources.length > 0) {
                    fnLog('Undefined resources:');
                }

                for (var i = 0; i < undefinedResources.length; i++) {
                    var mInfo = undefinedResources[i];
                    var msg = '  \'' + mInfo.name + '\'';

                    if (mInfo.pendingResources.length > 0) {
                        var names = [];
                        for (var j = 0; j < mInfo.pendingResources.length; j++) {
                            names.push(mInfo.pendingResources[j].name);
                        }
                        msg += ' (pending resources : [\'' + names.join('\', \'') + '\'])';
                    }

                    if (mInfo.pendingActions.length > 0) {
                        var names = [];
                        for (var j = 0; j < mInfo.pendingActions.length; j++) {
                            names.push(mInfo.pendingActions[j].name);
                        }
                        msg += ' (pending actions : [\'' + names.join('\', \'') + '\'])';
                    }

                    fnLog(msg);
                }

                if (unresolvedResources.length > 0) {
                    fnLog('Pending resources:');
                }

                for (var i = 0; i < unresolvedResources.length; i++) {
                    var mInfo = unresolvedResources[i];
                    fnLog('  \'' + mInfo.name + '\' (unresolved dependencies : [\'' + mInfo.dependsOn.unresolved.join('\', \'') + '\'])');
                }

                if (unresolvedActions.length > 0) {
                    fnLog('Pending actions:');
                }

                for (var i = 0; i < unresolvedActions.length; i++) {
                    var mInfo = unresolvedActions[i];
                    fnLog('  \'' + mInfo.name + '\' (unresolved dependencies : [\'' + mInfo.dependsOn.unresolved.join('\', \'') + '\'])');
                }

                if (returnText) {
                    return allLines.join('\r\n');
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
                        resource.defined = true;
                        resource.isLiteral = true;
                        resource.isExternal = true;
                        resource.isInferred = true;
                        resource.resolved = true;
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
                    if (resource.isExternal && !resource.resolved) {
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
                if (resource.resolved) {
                    if (ctx.debug) _resolveDebug(ctx, 'Resource \'' + resource.name + '\' already resolved');
                    return true;
                }
                if (!resource.defined && !resource.isRemote) {
                    if (ctx.debug) _resolveDebug(ctx, 'Resource \'' + resource.name + '\' not yet defined');
                    return false;
                }

                var resLabel = (resource.isAnonymousAction ? resource.name : 'resource ' + resource.name);
                var resPrefix = '[' + resLabel + ']:: ';

                if (result === undefined) {
                    if (resource.resolving) {
                        if (ctx.debug) _resolveDebug(ctx, resPrefix + 'Already resolving. Exiting to avoid recursive resolve');
                        return false;
                    }
                    resource.resolving = true;

                    if (ctx.debug) _resolveDebug(ctx, resPrefix + 'Attempting to resolve');

                    ctx.resolveDepth++;
                    var definitionArgs = [];
                    var dependsOnCnt = resource.dependsOn.length;

                    if (dependsOnCnt > 0) {
                        for (var i = 0 ; i < dependsOnCnt; i++) {
                            var dependsOnResource = resource.dependsOn[i];
                            if (dependsOnResource.resolved) {
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
                                resource.resolving = false;
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
                                resource.resolving = false;
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
                            resource.resolving = false;
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

                resource.resolved = true;

                // Resource was resolved. Remove it from the list of all its dependee's dependent lists
                for (var i = 0; i < dependsOnCnt; i++) {
                    var dependsOnResource = resource.dependsOn[i];
                    if (!dependsOnResource.resolving) {
                        if (resource.isAnonymousAction) {
                            _removeItem(dependsOnResource.pendingDependentActions, resource);
                        } else {
                            _removeItem(dependsOnResource.pendingDependentResources, resource);
                        }
                    }
                }

                if (resource.isAnonymousAction) {
                    resource.resolving = false;
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
                    for (i = ctx.pendingActions.length - 1; i >= 0; i--) {
                        _resolve(ctx, ctx.pendingActions[i]);
                    }
                }

                resource.resolving = false;
                ctx.resolveDepth--;

                if (resource.isAnonymousAction) {
                    _removeItem(ctx.pendingActions, resource);
                }

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

                    if (!resource.defined && _isEmpty(resource.url)) {
                        // First time _define ever called for this resource name
                        if (url_resource.resolved) {
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
                                url_resource.defined = true;
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
                            if (url_resource.resolved) {
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
                    if (resource.defined) {
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
                resource.defined = resource.defined || !isRemote;
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
                    if (!dependsOnResource.resolved) {
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
                    // No pending dependencies. Can resolve immediately.
                    if (isAnonymousAction || ctx.immediateResolve) {
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
                }
            }

            function _destroyResource(ctx, resourceName) {
                /// <param name="ctx" type="_Context" />
                /// <param name="resourceName" type="String" /> 

                if (ctx.resources.hasOwnProperty(resourceName)) {
                    var resource = _getResourceDirect(ctx, resourceName);
                    delete ctx.resources[resourceName]
                    if (resource.resolved && resource.handle && _isFunction(resource.handle['~'])) {
                        try {
                            resource.handle['~']();
                        } catch (err) {
                            console.warn('Encountered error when calling destructor on resource \'' + resourceName + '\'', err);
                        }
                    }
                }
            };

            window[RESOURCE_JS_KEY] = resource_module;

            // Initialize default context
            Context.create();
        })();
    }
})();