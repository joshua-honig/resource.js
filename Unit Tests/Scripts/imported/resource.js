'use strict';

(function () {

    window.fooBar = { baz: 22 };

    var RESOURCE_JS_VERSION = '1.0.0';
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
            var _environmentIndex = 1;
            var _namedEnvironments = {};

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
            resource_module.Environment = Environment;

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

            function Environment(_environment) {
                /// <signature>
                ///   <summary>Create new environments through the Environment.create() factory method</summary>
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
                    id: { get: function () { return _environment.id; } },
                    name: { get: function () { return _environment.id; } },
                    externalPending: { get: function () { return _environment.externalPending; } },
                    anonymousIndex: { get: function () { return _environment.anonymousIndex; } },

                    // simple read-write
                    debug: {
                        get: function () { return _environment.debug; },
                        set: function (value) { _environment.debug = (value === true); }
                    },
                    ignoreRedefine: {
                        get: function () { return _environment.ignoreRedefine; },
                        set: function (value) { _environment.ignoreRedefine = (value === true); }
                    },
                    automaticExternals: {
                        get: function () { return _environment.automaticExternals; },
                        set: function (value) { _environment.automaticExternals = (value === true); }
                    },
                    immediateResolve: {
                        get: function () { return _environment.immediateResolve; },
                        set: function (value) { _environment.immediateResolve = (value === true); }
                    },

                    // validated read-write
                    externalInterval: {
                        get: function () { return _environment.externalInterval },
                        set: function (value) {
                            if (!validate.isNumber(value, 10, null, 'externalInterval', true)) return;
                            _environment.externalInterval = value;
                        }
                    },
                    externalTimeout: {
                        get: function () { return _environment.externalTimeout },
                        set: function (value) {
                            if (!validate.isNumber(value, 10, null, 'externalTimeout', true)) return;
                            _environment.externalTimeout = value;
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

                this.define = _environment.define.bind(_environment);
                this.define.remote = _environment.define_remote.bind(_environment);
                this.define.external = _environment.define_external.bind(_environment);

                this.require = _environment.require.bind(_environment);

                this.getResource = _environment.getResourceHandle.bind(_environment);
                this.getResourceInfo = _environment.getResourceInfoByName.bind(_environment);
                this.getResources = _environment.getResources.bind(_environment);
                this.getPendingActions = _environment.getPendingActions.bind(_environment);
                this.getPendingResources = _environment.getPendingResources.bind(_environment);
                this.getUndefinedResources = _environment.getUndefinedResources.bind(_environment);
                this.isDefined = _environment.isDefined.bind(_environment);
                this.isResolved = _environment.isResolved.bind(_environment);
                this.resolve = _environment.resolve.bind(_environment);
                this.reset = _environment.reset.bind(_environment);
                this.listUnresolved = _environment.list_unresolved.bind(_environment);
                this.destroy = _environment.destroy.bind(_environment);

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

                this.Environment = Environment;
            }


            Environment.create = function (name, force) {

                var isNamed = !_isEmpty(name);
                if (isNamed && (force !== true) && (_namedEnvironments.hasOwnProperty(name))) {
                    throw new Error('Environment \'' + name + '\' is already defined');
                    return;
                }

                // Private instance with all required state
                var _instance = new _Environment(name);

                // Public proxy 
                var instance = new Environment(_instance);

                if (isNamed) {
                    _namedEnvironments[instance.name] = instance;
                } else {
                    // Default environment. Export as window.res / window.resource
                    window.res = window.resource = instance;

                    // Backwards compatibility:
                    window.require = instance.require;
                    window.define = instance.define;
                }

                return instance;
            }

            Environment.get = function (name) {
                /// <returns type="Environment" />
                return _namedEnvironments[name];
            };


            // API FUNCTIONS
            function _Environment(name) {
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

                this.id = _environmentIndex++;
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

            _Environment.prototype.debug = false;
            _Environment.prototype.ignoreRedefine = true;
            _Environment.prototype.automaticExternals = true;
            _Environment.prototype.immediateResolve = true;

            _Environment.prototype.define = function (resourceName) {
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

            _Environment.prototype.define_remote = function (resourceName, url, isLiteral) {
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

            _Environment.prototype.define_external = function (resourceName, source, test) {
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

            _Environment.prototype.destroy = function (resourceName) {
                /// <summary>Destroy a named resource by deleting the internal reference to it and calling its destructor (~ method) if defined</summary>
                /// <param name="resourceName" type="String" />  
                if (!validate.argCount(arguments, 1, 'destroy', true)) return;
                if (!validate.isString(resourceName, 'resourceName', true)) return;

                return _destroyResource(this, resourceName);
            };

            _Environment.prototype.require = function (dependsOn) {
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

            _Environment.prototype.isDefined = function (resourceName) {
                /// <summary>Tests whether a resource has been defined</summary>
                /// <returns type="Boolean" />
                if (!this.resources.hasOwnProperty(resourceName)) return false;
                var resource = this.resources[resourceName];
                return resource.defined;
            };

            _Environment.prototype.isResolved = function (resourceName) {
                /// <summary>Tests whether a resource has been defined and resolved</summary>
                /// <returns type="Boolean" />
                if (!this.resources.hasOwnProperty(resourceName)) return false;
                var resource = this.resources[resourceName];
                return resource.defined && resource.resolved;
            };

            _Environment.prototype.getResourceHandle = function (resourceName, resolve) {
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

            _Environment.prototype.getResources = function (includeAnonymous) {
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

            _Environment.prototype.getResourceInfoByName = function (resourceName, expandDependsOn) {
                /// <summary>Gets a copy of externally visible information about a resource. Returns null if the resource has never been defined or referenced.</summary>
                /// <param name="resourceName" type="String" />
                /// <param name="expandDependsOn" type="Boolean" optional="true">Default false. true to expand the depends on names to separate resolved and unresolved lists</param>
                var resource = _getResourceDirect(this, resourceName);
                if (resource == null) return null;
                return this.getResourceInfo(resource, expandDependsOn);
            };

            _Environment.prototype.getResourceInfo = function (resource, expandDependsOn) {
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

            _Environment.prototype.getPendingActions = function () {
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

            _Environment.prototype.getPendingResources = function () {
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

            _Environment.prototype.getUndefinedResources = function () {
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

            _Environment.prototype.resolve = function () {
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

            _Environment.prototype.reset = function () {
                /// <summary>Discards all resource definitions and pending actions and resets the require environment</summary>

                this.id = _environmentIndex++;

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

            _Environment.prototype.list_unresolved = function (returnText) {
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



            // CORE FUNCTIONS: These require the environment state as input
            function _getResource(env, resourceName) {
                /// <param name="env" type="_Environment" />
                /// <param name="resourceName" type="String">The unique key or name of the resource</param>
                /// <returns type="Resource" /> 
                if (!env.resources.hasOwnProperty(resourceName)) {
                    var resource = env.resources[resourceName] = new Resource(resourceName);

                    if (env.automaticExternals && window.hasOwnProperty(resourceName)) {
                        if (env.debug) console.log('Using existing global object for resource \'' + resourceName + '\'');
                        resource.defined = true;
                        resource.isLiteral = true;
                        resource.isExternal = true;
                        resource.isInferred = true;
                        resource.resolved = true;
                        resource.handle = resource.definition = window[resourceName];
                    }
                }
                return env.resources[resourceName];
            }

            function _getResourceDirect(env, resourceName) {
                /// <param name="env" type="_Environment" />
                /// <param name="resourceName" type="String">The unique key or name of the resource</param>
                /// <returns type="Resource" />
                return env.resources[resourceName];
            }

            function _resolveDebug(env, message) {
                /// <param name="env" type="_Environment" />
                console.log(_space(env.resolveDepth * 2) + message);
            }

            function _resolveExternals(env) {
                /// <param name="env" type="_Environment" />

                var timeoutHandle = env.timeoutHandle;
                clearTimeout(timeoutHandle);
                delete env.timeoutHandles[timeoutHandle];

                //if (_isEmpty(env.name)) {
                //    if (env.id != _environmentIndex) return;
                //} else {
                //    var currentEnv = Environment.get(env.name);
                //    if (currentEnv && currentEnv.id != env.id) return;
                //}

                var unresolvedNames = [];

                for (var resourceName in env.resources) {
                    var resource = env.resources[resourceName];
                    if (resource.isExternal && !resource.resolved) {
                        if (!_resolve(env, resource)) {
                            unresolvedNames.push(resourceName);
                        }
                    }
                }

                if (unresolvedNames.length > 0) {
                    if (env.debug) {
                        console.log('env id ' + env.id + ' :: external modules not yet resolved : ' + unresolvedNames.join(', '));
                    }
                    var elapsed = performance.now() - env.loadMark;
                    if (elapsed > env.externalTimeout) {
                        console.log('Aborting automatic resolve of external resources. The following external resources are not yet resolved: ' + unresolvedNames.join(', '));
                    } else {
                        env.externalPending = true;
                        env.timeoutHandle = setTimeout(_resolveExternals, env.externalInterval, env);
                    }
                } else {
                    env.externalPending = false;
                }
            }

            function _resolve(env, resource, result) {
                /// <param name="env" type="_Environment" />
                /// <param name="resource" type="Resource" />
                /// <param name="result" type="*" />
                /// <returns type="Boolean" />
                if (resource.resolved) {
                    if (env.debug) _resolveDebug(env, 'Resource \'' + resource.name + '\' already resolved');
                    return true;
                }
                if (!resource.defined && !resource.isRemote) {
                    if (env.debug) _resolveDebug(env, 'Resource \'' + resource.name + '\' not yet defined');
                    return false;
                }

                var resLabel = (resource.isAnonymousAction ? resource.name : 'resource ' + resource.name);
                var resPrefix = '[' + resLabel + ']:: ';

                if (result === undefined) {
                    if (resource.resolving) {
                        if (env.debug) _resolveDebug(env, resPrefix + 'Already resolving. Exiting to avoid recursive resolve');
                        return false;
                    }
                    resource.resolving = true;

                    if (env.debug) _resolveDebug(env, resPrefix + 'Attempting to resolve');

                    env.resolveDepth++;
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
                            } else if (_resolve(env, dependsOnResource)) {
                                _removeItem(dependsOnResource.pendingDependentResources, resource);
                                if (dependsOnResource.isUrlResource) {
                                    if (resource.isLiteral) {
                                        resource.definition = dependsOnResource.handle;
                                    }
                                } else {
                                    definitionArgs.push(dependsOnResource.handle);
                                }
                            } else {
                                if (env.debug) {
                                    _resolveDebug(env, resPrefix + 'Could not resolve required resource ' + dependsOnResource.name + '. Aborting resolve');
                                }
                                // Don't bother resolving any additional resources 
                                resource.resolving = false;
                                return (env.resolveDepth--, false);
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
                                _resolve(env, resource, data);
                            },
                            error: function () {
                                resource.resolving = false;
                                env.resolveDepth--;
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
                            return (env.resolveDepth--, false);
                        }

                        if (temp_handle != null) {
                            resource.handle = temp_handle;
                        } else {
                            resource.handle = resource.definition = window[resource.name];
                        }
                    } else if (resource.isAnonymousAction) {
                        if (env.debug) _resolveDebug(env, resPrefix + 'Executing anonymous action');
                        resource.definition.apply(resource.thisArg, definitionArgs);
                    } else if (resource.isLiteral) {
                        if (env.debug) _resolveDebug(env, resPrefix + 'Assigning literal resource definition');
                        resource.handle = resource.definition;
                    } else {
                        if (env.debug) _resolveDebug(env, resPrefix + 'Executing resource definition');
                        resource.handle = resource.definition.apply(null, definitionArgs);
                    }
                } else {
                    if (env.debug) _resolveDebug(env, resPrefix + 'Assigning ajax result to URL resource definition');
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
                    return (env.resolveDepth--, true);
                }

                var lng = resource.pendingDependentResources.length;
                if (env.immediateResolve && lng > 0) {
                    if (env.debug) _resolveDebug(env, resPrefix + 'Attempting to resolve dependent resources');
                    env.resolveDepth++;
                    var i = 0;
                    while (resource.pendingDependentResources.length > i) {
                        var dependentResource = resource.pendingDependentResources[i];
                        if (dependentResource.isResolved || _resolve(env, dependentResource)) {
                            resource.pendingDependentResources.splice(i, 1);
                        } else {
                            i++;
                        }
                    }
                    env.resolveDepth--;
                }

                var lng = resource.pendingDependentActions.length;
                if (lng > 0) {
                    if (env.debug) _resolveDebug(env, resPrefix + 'Attempting to resolve dependent actions for');
                    env.resolveDepth++;
                    var i = 0;
                    while (resource.pendingDependentActions.length > i) {
                        var dependentAction = resource.pendingDependentActions[i];
                        if (dependentAction.isResolved || _resolve(env, dependentAction)) {
                            resource.pendingDependentActions.splice(i, 1);
                        } else {
                            i++;
                        }
                    }
                    env.resolveDepth--;
                }

                if (result != null) {
                    // Ajax result. Attempt to resolve all anonymous actions
                    for (i = env.pendingActions.length - 1; i >= 0; i--) {
                        _resolve(env, env.pendingActions[i]);
                    }
                }

                resource.resolving = false;
                env.resolveDepth--;

                if (resource.isAnonymousAction) {
                    _removeItem(env.pendingActions, resource);
                }

                return true;
            }

            function _define(env, resourceName, dependsOn, definition, isLiteral, thisArg, isExternal, test, url) {
                /// <param name="env" type="_Environment" />
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
                    resource = _getResource(env, resourceName);
                    url_resource = _getResource(env, '__URL::' + url_lc);

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
                            if (env.ignoreRedefine) {
                                /*if (env.debug)*/  console.log('Ignoring redefinition of resource \'' + resourceName + '\'');
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
                    resource = new Resource('Action ' + (env.anonymousIndex++));
                } else {
                    // Retrieve the existing Resource descriptor, or generate a new empty one
                    resource = _getResource(env, resourceName);
                    if (resource.defined) {
                        if (isExternal && resource.isExternal && resource.isInferred) {
                            // Ok, confirming a previously inferred external resource;
                            resource.isInferred = false;
                            return;
                        }

                        if (env.ignoreRedefine) {
                            /*if (env.debug)*/  console.log('Ignoring redefinition of resource \'' + resourceName + '\'');
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
                    var dependsOnResource = _getResource(env, dependsOnNames[i]);
                    resource.dependsOn.push(dependsOnResource);
                    if (!dependsOnResource.resolved) {
                        if (isAnonymousAction) {
                            if (env.debug) console.log('Anonymous action depends on resource ' + dependsOnResource.name + ' which is not yet resolved');
                            dependsOnResource.pendingDependentActions.unshift(resource);
                        } else {
                            if (env.debug) console.log('resource ' + resource.name + ' depends on resource ' + dependsOnResource.name + ' which is not yet resolved');
                            dependsOnResource.pendingDependentResources.unshift(resource);
                        }
                        pendingDependsOnCnt++;
                    }
                }

                if (pendingDependsOnCnt == 0 || (isAnonymousAction && !env.immediateResolve)) {
                    // No pending dependencies. Can resolve immediately.
                    if (isAnonymousAction || env.immediateResolve) {
                        var resolved = _resolve(env, resource);
                        if (!resolved && isAnonymousAction) {
                            env.pendingActions.push(resource);
                        }

                        if (!resolved && resource.isExternal && !env.externalPending) {
                            env.loadMark = performance.now();  // reset loading timer to most recent definition of external resource
                            env.externalPending = true;
                            env.timeoutHandle = setTimeout(_resolveExternals, env.externalInterval, env);
                        }
                    }
                }
            }

            function _destroyResource(env, resourceName) {
                /// <param name="env" type="_Environment" />
                /// <param name="resourceName" type="String" /> 

                if (env.resources.hasOwnProperty(resourceName)) {
                    var resource = _getResourceDirect(env, resourceName);
                    delete env.resources[resourceName]
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

            // Initialize default environment
            Environment.create();
        })();
    }
})();

