/// <reference path="_references.js" /> 

(function () {

    // IE polyfill for function.name
    function testFunc() { };

    if (testFunc.name == undefined) {
        Object.defineProperty(Function.prototype, 'name', {
            get: function () {
                return (/(^\s*function\s+)(\w+)/.exec(this.toString()) || [])[2];
            }
        });
    }
     
    function objectModel_base(constants) {

        function Person(firstName, lastName, age) {
            this.firstName = firstName;
            this.lastName = lastName;
            this.age = age;
        }
        Person.prototype.firstName = '';
        Person.prototype.lastName = '';
        Person.prototype.age = 0;

        Object.defineProperty(Person.prototype, 'fullName', {
            get: function () {
                var hasFirst = (this.firstName.length > 0);
                var hasLast = (this.lastName.length > 0);
                if (hasFirst && hasLast) return this.lastName + ', ' + this.firstName;
                if (hasLast) return this.lastName;
                if (hasFirst) return this.firstName;
            }
        });

        Object.defineProperty(Person.prototype, 'isMinor', {
            get: function () {
                return this.age < constants.majorityAge;
            }
        });

        var objectModel = {};
        objectModel.Person = Person;
        return objectModel;

    }

    function createResourceInit(name) {
        return function () {
            console.log('initializing module ' + name);

            return { name: name };
        }
    }

    function define_object_literal(withDependency) {
        var module_def = { name: 'object literal module' };

        if (withDependency) {
            define('object-literal', ['base'], module_def);
        } else {
            define('object-literal', module_def);
        }

        return module_def;
    }

    function define_function_literal(withDependency) {
        function module_func() {
            console.log('module_func called!');
            console.log(arguments);
        }

        module_func.staticMethod1 = function () { console.log('staticMethod1 called!'); };
        module_func.staticMethod2 = function () { console.log('staticMethod2 called!'); };

        Object.defineProperty(module_func, 'readOnlyName', { get: function () { return 'my read only name'; } });

        if (withDependency) {
            define('func-literal', ['base'], module_func, true);
        } else {
            define('func-literal', module_func, true);
        }

        return module_func;
    }

    function define_anon_function(withDependency) {

        if (withDependency) {
            define('anon-module', ['base'], function () {
                var anon = {};
                anon.whenConstructed = Date();
                return anon;
            });
        } else {
            define('anon-module', function () {
                var anon = {};
                anon.whenConstructed = Date();
                return anon;
            });
        }


    }

    function define_named_function(withDependency) {

        function module_def() {
            var def = {};
            def.whenConstructed = Date();
            def.source = module_def;
            def.sourceName = module_def.name;
            return def;
        }

        if (withDependency) {
            define('named-module', ['base'], module_def);
        } else {
            define('named-module', module_def);
        }

    }

    function define_constants() {
        define('app-constants', { majorityAge: 18 });
    }

    function define_base() {
        define('object-model-base', ['app-constants'], objectModel_base);
    }

    function define_employee() {
        define('object-model-employee', ['object-model-base'], function (objectModel) {

            var Person = objectModel.Person;

            function Employee(firstName, lastName, employeeID, age) {
                Person.call(this, firstName, lastName, age);
                this.employeeID = employeeID;
            }

            Employee.prototype = new Person();
            Employee.prototype.constructor = Employee;
            Employee.prototype.employeeID = 0;

            objectModel.Employee = Employee;
            return objectModel;

        });
    }

    QUnit.module('base');

    QUnit.test('Basic API exists', function (assert) {
        /// <param name="assert" type="QUnit.Assert" /> 
        assert.ok(window.hasOwnProperty('res'), 'window.res is defined');
        assert.ok(window.hasOwnProperty('resource'), 'window.resource is defined');

        var currentKey = window.resource.key;
        assert.ok(window[currentKey] != null, 'resource-js version defined');

        assert.ok(resource.hasOwnProperty('anonymousIndex'), 'resource.anonymousIndex is defined');
        assert.ok(resource.hasOwnProperty('id'), 'resource.id is defined');
        assert.ok(resource.hasOwnProperty('externalPending'), 'resource.externalPending is defined');

        assert.ok(window.hasOwnProperty('define'), 'window.define is defined');
        assert.ok(define.hasOwnProperty('external'), 'define.external is defined');
        assert.ok(define.external.hasOwnProperty('interval'), 'define.external.interval is defined');
        assert.ok(define.external.hasOwnProperty('timeout'), 'define.external.timeout is defined');
        assert.ok(define.remote, 'define.external.timeout is defined');
    });

    QUnit.test('require static methods exist', function (assert) {
        /// <param name="assert" type="QUnit.Assert" /> 
        assert.ok(util.isFunction(resource.getResource), 'resource.getResource function is defined');
        assert.ok(util.isFunction(resource.getResourceInfo), 'resource.getResourceInfo function is defined');
        assert.ok(util.isFunction(resource.getResources), 'resource.getResources function is defined');
        assert.ok(util.isFunction(resource.getPendingActions), 'resource.getPendingActions function is defined');
        assert.ok(util.isFunction(resource.getPendingResources), 'resource.getPendingResources function is defined');
        assert.ok(util.isFunction(resource.getUndefinedResources), 'resource.getUndefinedResources function is defined');
        assert.ok(util.isFunction(resource.isDefined), 'resource.isDefined function is defined');
        assert.ok(util.isFunction(resource.isResolved), 'resource.isResolved function is defined');
        assert.ok(util.isFunction(resource.reset), 'resource.reset function is defined');
        assert.ok(util.isFunction(resource.resolve), 'resource.resolve function is defined');
    });

    QUnit.module('require static methods');

    QUnit.test('getResource', function (assert) {
        /// <param name="assert" type="QUnit.Assert" /> 
        resource.reset();

        var def = { foo: 'bar' };
        define('a', def);
        assert.strictEqual(resource.getResource('a'), def, 'getResource returns object literal definition');

        function def_func() { };
        define('b', def_func, true);
        assert.strictEqual(resource.getResource('b'), def_func, 'getResource returns function literal definition');

        function init_func() { return { name: 'bif', value: 42 }; }
        define('c', init_func);
        assert.propEqual(resource.getResource('c'), { name: 'bif', value: 42 }, 'getResource returns init function result');

        define.external('jQuery');
        assert.strictEqual(resource.getResource('jQuery'), window.jQuery, 'getResource returns global variable for external module');
    });

    QUnit.test('require([moduleName])', function (assert) {
        /// <param name="assert" type="QUnit.Assert" /> 
        resource.reset();

        var def = { foo: 'bar' };
        define('a', def);
        assert.strictEqual(require('a'), def, 'require([moduleName]) returns object literal definition');

        function def_func() { };
        define('b', def_func, true);
        assert.strictEqual(require('b'), def_func, 'require([moduleName]) returns function literal definition');

        function init_func() { return { name: 'bif', value: 42 }; }
        define('c', init_func);
        assert.propEqual(require('c'), { name: 'bif', value: 42 }, 'require([moduleName]) returns init function result');

        define.external('jQuery');
        assert.strictEqual(require('jQuery'), window.jQuery, 'require([moduleName]) returns global variable for external module');
    });

    QUnit.test('getResourceInfo', function (assert) {
        /// <param name="assert" type="QUnit.Assert" /> 
        resource.reset();

        var def = { foo: 'bar' };
        define('a', def);
        assert.deepEqual(resource.getResourceInfo('a'), {
            defined: true,
            dependsOn: [],
            handle: def,
            isExternal: false,
            name: 'a',
            resolved: true
        }, 'getResourceInfo: object literal');

        function def_func() { };
        define('b', def_func, true);
        assert.deepEqual(resource.getResourceInfo('b'), {
            defined: true,
            dependsOn: [],
            handle: def_func,
            isExternal: false,
            name: 'b',
            resolved: true
        }, 'getResourceInfo: function literal');

        function init_func() { return { name: 'bif', value: 42 }; }
        define('c', init_func);
        assert.deepEqual(resource.getResourceInfo('c'), {
            defined: true,
            dependsOn: [],
            handle: { name: 'bif', value: 42 },
            isExternal: false,
            name: 'c',
            resolved: true
        }, 'getResourceInfo: init function');

        define.external('jQuery');
        assert.deepEqual(resource.getResourceInfo('jQuery'), {
            defined: true,
            dependsOn: [],
            handle: window.jQuery,
            isExternal: true,
            name: 'jQuery',
            resolved: true
        }, 'getResourceInfo: external module');
    });

    QUnit.test('getResources', function (assert) {
        /// <param name="assert" type="QUnit.Assert" /> 
        resource.reset();

        var def = { foo: 'bar' };
        define('a', def);

        function def_func() { };
        define('b', def_func, true);

        assert.deepEqual(resource.getResources(), {
            a: {
                defined: true,
                dependsOn: [],
                handle: def,
                isExternal: false,
                name: 'a',
                resolved: true
            },
            b: {
                defined: true,
                dependsOn: [],
                handle: def_func,
                isExternal: false,
                name: 'b',
                resolved: true
            }
        }, 'getResources');
    });

    QUnit.test('getPendingActions', function (assert) {
        resource.reset();

        var anonFunc1 = function (constants) {
            assert.strictEqual(constants.majorityAge, 18, 'app-constants injected to anonFunc1');
        };

        var anonFunc2 = function (constants) {
            assert.strictEqual(constants.majorityAge, 18, 'app-constants injected to anonFunc2');
        };

        require('app-constants', anonFunc1);
        require('app-constants', anonFunc2);

        assert.strictEqual(resource.getPendingActions().length, 2, 'Two pending actions');
        assert.deepEqual(resource.getPendingActions(), [
            {
                isAnonymousAction: true,
                func: anonFunc2,
                dependsOn: {
                    resolved: [],
                    unresolved: ['app-constants']
                },
                name: 'Action 2'
            },
            {
                isAnonymousAction: true,
                func: anonFunc1,
                dependsOn: {
                    resolved: [],
                    unresolved: ['app-constants']
                },
                name: 'Action 1'
            }
        ], 'Action info');

        define_constants();
        assert.strictEqual(resource.getPendingActions().length, 0, 'Actions now resolved');
    });

    QUnit.test('getPendingResources', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        define_object_literal(true);
        assert.strictEqual(resource.getPendingResources().length, 1, 'One pending module');

        assert.deepEqual(resource.getPendingResources(), [{
            defined: true,
            dependsOn: {
                resolved: [],
                unresolved: ['base']
            },
            handle: null,
            isExternal: false,
            name: 'object-literal',
            resolved: false
        }], 'Pending module info');

        define('base', {});

        assert.strictEqual(resource.getPendingResources().length, 0, 'Modules now resolved');
    });

    QUnit.test('getUndefinedResources', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        define('a', ['b'], {});

        var aInfo = resource.getResourceInfo('a', true);

        assert.strictEqual(resource.getUndefinedResources().length, 1, 'One undefined module');
        assert.deepEqual(resource.getUndefinedResources(), [
            {
                name: 'b',
                pendingActions: [],
                pendingResources: [aInfo]
            }
        ], 'undefined modules info');

        define('b', {});
        assert.strictEqual(resource.getUndefinedResources().length, 0, 'No undefined modules now');
    });

    QUnit.test('isDefined', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        define('a', {});
        assert.ok(resource.isDefined('a'), 'a is defined');
        assert.notOk(resource.isDefined('b'), 'b is not defined');
    });

    QUnit.test('isResolved', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        define('a', {});
        define('b', ['c'], {});

        assert.ok(resource.isResolved('a'), 'a is resolved');
        assert.ok(resource.isDefined('b'), 'b is defined');
        assert.notOk(resource.isResolved('b'), 'b is not resolved');
        assert.notOk(resource.isResolved('c'), 'c is not resolved');
        assert.notOk(resource.isResolved('x'), 'x is not resolved');
    });

    QUnit.test('reset', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        define('a', {});
        define('b', ['c'], {});
        require(['c'], function () { });

        var indexBefore = resource.id;

        assert.strictEqual(util.toArray(resource.getResources()).length, 3, 'Three modules defined or referenced');
        assert.strictEqual(resource.getPendingResources().length, 1, 'One pending module');
        assert.strictEqual(resource.getPendingActions().length, 1, 'One pending action');
        assert.strictEqual(resource.getUndefinedResources().length, 1, 'One undefined module reference');

        resource.reset();

        assert.strictEqual(util.toArray(resource.getResources()).length, 0, 'No modules defined or referenced');
        assert.strictEqual(resource.getPendingResources().length, 0, 'No pending modules');
        assert.strictEqual(resource.getPendingActions().length, 0, 'No pending actions');
        assert.strictEqual(resource.getUndefinedResources().length, 0, 'No undefined module references');
        assert.strictEqual(resource.id, indexBefore + 1, 'environmentIndex incremented');
    });

    QUnit.test('resolve (all)', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        util.clearGlobal('global-1');
        util.clearGlobal('global-2');

        define('a', {});
        define('b', ['global-1'], {});
        define('c', ['global-2'], {});
        define.external('global-1');
        define.external('global-2');

        assert.strictEqual(resource.getPendingResources().length, 4, 'Four pending modules');

        window['global-1'] = {};
        window['global-2'] = {};

        resource.resolve();

        assert.strictEqual(resource.getPendingResources().length, 0, 'No pending modules');
    });

    QUnit.test('resolve (selective)', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        util.clearGlobal('global-1');
        util.clearGlobal('global-2');

        define('a', {});
        define('b', ['global-1'], {});
        define('c', ['global-2'], {});
        define.external('global-1');
        define.external('global-2');

        assert.strictEqual(resource.getPendingResources().length, 4, 'Four pending modules');

        window['global-1'] = {};
        window['global-2'] = {};

        resource.resolve('global-1');

        assert.strictEqual(resource.getPendingResources().length, 2, 'Two pending modules');

        resource.resolve('global-2');

        assert.strictEqual(resource.getPendingResources().length, 0, 'No pending modules');
    });

    QUnit.module('basic module definitions');

    QUnit.test('Object constant', function (assert) {
        /// <param name="assert" type="QUnit.Assert" /> 
        resource.reset();

        var module_object = define_object_literal();

        var info = resource.getResourceInfo('object-literal');
        assert.ok(info, 'object-literal module exists');
        assert.ok(info.defined, 'object-literal module is defined');
        assert.ok(info.resolved, 'object-literal module is resolved');

        assert.strictEqual(resource.getResource('object-literal'), module_object, 'getResource returns module definition object');
        assert.strictEqual(resource.getResourceInfo('object-literal').handle, module_object, 'getResourceInfo().handle returns module definition object');
    });

    QUnit.test('Function constant', function (assert) {
        /// <param name="assert" type="QUnit.Assert" /> 
        resource.reset();

        var func_def = define_function_literal();

        var info = resource.getResourceInfo('func-literal');
        assert.ok(info, 'func-literal module exists');
        assert.ok(info.defined, 'func-literal module is defined');
        assert.ok(info.resolved, 'func-literal module is resolved');

        assert.strictEqual(resource.getResource('func-literal'), func_def, 'getResource returns module definition function');
        assert.strictEqual(resource.getResourceInfo('func-literal').handle, func_def, 'getResourceInfo().handle returns module definition function');
    });

    QUnit.test('Anonymous function', function (assert) {
        /// <param name="assert" type="QUnit.Assert" /> 
        resource.reset();

        define_anon_function();

        var info = resource.getResourceInfo('anon-module');
        assert.ok(info, 'anon-module module exists');
        assert.ok(info.defined, 'anon-module module is defined');
        assert.ok(info.resolved, 'anon-module module is resolved');

        var module_object = resource.getResource('anon-module');
        assert.ok(module_object.hasOwnProperty('whenConstructed'), 'module initialized');
    });

    QUnit.test('Named function', function (assert) {
        /// <param name="assert" type="QUnit.Assert" /> 
        resource.reset();

        define_named_function();

        var info = resource.getResourceInfo('named-module');
        assert.ok(info, 'named-module module exists');
        assert.ok(info.defined, 'named-module module is defined');
        assert.ok(info.resolved, 'named-module module is resolved');

        var module_object = resource.getResource('named-module');
        assert.ok(module_object.hasOwnProperty('whenConstructed'), 'module initialized : whenConstructed');
        assert.ok(module_object.hasOwnProperty('source'), 'module initialized : source');
        assert.ok(module_object.hasOwnProperty('sourceName'), 'module initialized : sourceName');
        assert.strictEqual(module_object.sourceName, 'module_def', 'sourceName === \'module_def\'');
    });

    QUnit.test('External', function (assert) {
        /// <param name="assert" type="QUnit.Assert" /> 
        resource.reset();

        define.external('baz');
        var info = resource.getResourceInfo('baz');
        assert.ok(info, 'baz module exists');
        assert.ok(info.isExternal, 'baz module is external');
        assert.ok(info.defined, 'baz module is defined');
        assert.notOk(info.resolved, 'baz module is NOT resolved');

        window.baz = { name: 'baz module!' };

        resource.resolve('baz');

        var info = resource.getResourceInfo('baz');
        assert.ok(info.defined, 'baz module is now defined');
        assert.ok(info.resolved, 'baz module is now resolved');
    });

    QUnit.module('dependent module definitions');

    QUnit.test('Object constant', function (assert) {
        /// <param name="assert" type="QUnit.Assert" /> 
        resource.reset();

        var module_object = define_object_literal(true);

        var info = resource.getResourceInfo('object-literal');
        assert.ok(info, 'object-literal module exists');
        assert.ok(info.defined, 'object-literal module is defined');
        assert.notOk(info.resolved, 'object-literal module is NOT resolved');

        define('base', {});

        var info = resource.getResourceInfo('object-literal');
        assert.ok(info.resolved, 'object-literal module is now resolved');

        assert.strictEqual(resource.getResource('object-literal'), module_object, 'getResource returns module definition object');
    });

    QUnit.test('Function constant', function (assert) {
        /// <param name="assert" type="QUnit.Assert" /> 
        resource.reset();

        var func_def = define_function_literal(true);

        var info = resource.getResourceInfo('func-literal');
        assert.ok(info, 'func-literal module exists');
        assert.ok(info.defined, 'func-literal module is defined');
        assert.notOk(info.resolved, 'func-literal module is NOT resolved');

        define('base', {});

        var info = resource.getResourceInfo('func-literal');
        assert.ok(info.resolved, 'func-literal module is now resolved');

        assert.strictEqual(resource.getResource('func-literal'), func_def, 'getResource returns module definition function');
    });

    QUnit.test('Anonymous function', function (assert) {
        /// <param name="assert" type="QUnit.Assert" /> 
        resource.reset();

        define_anon_function(true);

        var info = resource.getResourceInfo('anon-module');
        assert.ok(info, 'anon-module module exists');
        assert.ok(info.defined, 'anon-module module is defined');
        assert.notOk(info.resolved, 'anon-module module is NOT resolved');

        define('base', {});

        var info = resource.getResourceInfo('anon-module');
        assert.ok(info.resolved, 'anon-module module is now resolved');

        var module_object = resource.getResource('anon-module');
        assert.ok(module_object.hasOwnProperty('whenConstructed'), 'module initialized');
    });

    QUnit.test('Named function', function (assert) {
        /// <param name="assert" type="QUnit.Assert" /> 
        resource.reset();

        define_named_function(true);

        var info = resource.getResourceInfo('named-module');
        assert.ok(info, 'named-module module exists');
        assert.ok(info.defined, 'named-module module is defined');
        assert.notOk(info.resolved, 'named-module module is NOT resolved');

        define('base', {});

        var info = resource.getResourceInfo('named-module');
        assert.ok(info.resolved, 'named-module module is now resolved');

        var module_object = resource.getResource('named-module');
        assert.ok(module_object.hasOwnProperty('whenConstructed'), 'module initialized : whenConstructed');
        assert.ok(module_object.hasOwnProperty('source'), 'module initialized : source');
        assert.ok(module_object.hasOwnProperty('sourceName'), 'module initialized : sourceName');
        assert.strictEqual(module_object.sourceName, 'module_def', 'sourceName === \'module_def\'');
    });


    QUnit.module('dependency injection');

    QUnit.test('Constant module injection', function (assert) {
        /// <param name="assert" type="QUnit.Assert" /> 
        resource.reset();

        define_base();
        define_constants();

        var dataModel = resource.getResource('object-model-base');
        var Person = dataModel.Person;

        var bob = new Person('Robert', 'Fillmore', 89);
        var bif = new Person('Bif', 'Foobar', 12);

        assert.strictEqual(bob.isMinor, false, 'Bob is not a minor');
        assert.strictEqual(bif.isMinor, true, 'Bif is a minor');
    });

    QUnit.test('Named function module injection', function (assert) {
        /// <param name="assert" type="QUnit.Assert" /> 
        resource.reset();

        define_base();
        define_constants();
        define_employee();

        var dataModel = resource.getResource('object-model-employee');
        var Employee = dataModel.Employee;

        var joe = new Employee('Joe', 'Schmoe', 23409, 25);
        var bb = new Employee('Bus', 'Boy', 0932, 16);

        assert.strictEqual(joe.isMinor, false, 'Joe is not a minor');
        assert.strictEqual(bb.isMinor, true, 'Bus Buy is a minor');
    });

    QUnit.test('Automatic detection of existing global variable', function (assert) {
        /// <param name="assert" type="QUnit.Assert" /> 
        resource.reset();

        define('test-module', ['jQuery'], function ($) {
            return { myjQueryHandle: $ };
        });

        var moduleInfo = resource.getResourceInfo('test-module');
        var jqueryInfo = resource.getResourceInfo('jQuery');

        assert.strictEqual(jqueryInfo.resolved, true, 'jQuery module is defined and resolved');
        assert.strictEqual(jqueryInfo.isExternal, true, 'jQuery module is an external module');

        assert.strictEqual(moduleInfo.resolved, true, 'test-module module is defined and resolved');
    });

    QUnit.test('require with single dependency', function (assert) {
        /// <param name="assert" type="QUnit.Assert" /> 
        resource.reset();

        require('app-constants', function (constants) {
            assert.strictEqual(constants.majorityAge, 18, 'Dependency injected successfully');
        });

        assert.strictEqual(resource.getPendingActions().length, 1, 'Action is now pending');
        define_constants();
        assert.strictEqual(resource.getPendingActions().length, 0, 'Actions no longer pending');
    });

    QUnit.test('require with multiple dependencies', function (assert) {
        /// <param name="assert" type="QUnit.Assert" /> 
        resource.reset();

        require(['app-constants', 'jQuery'], function (constants, jq) {
            assert.strictEqual(constants.majorityAge, 18, 'app-constants injected successfully');
            var body = jq('body')[0];
            assert.ok(body instanceof HTMLBodyElement, 'jQuery injected successfully');
        });

        assert.strictEqual(resource.getPendingActions().length, 1, 'Action is now pending');
        define_constants();
        assert.strictEqual(resource.getPendingActions().length, 0, 'Actions no longer pending');
    });

    QUnit.test('Automatic detection of subsequently defined global varaible', function (assert) {
        /// <param name="assert" type="QUnit.Assert" /> 
        resource.reset();

        define('test-module', ['moment'], function (moment) {
            return { otherResource: moment };
        });

        var moduleInfo = resource.getResourceInfo('test-module');
        var momentInfo = resource.getResourceInfo('moment');

        assert.ok(!momentInfo.resolved && !momentInfo.defined, 'moment module is neither defined nor resolved');
        assert.notOk(momentInfo.isExternal, 'moment module is not an external module');
        assert.ok(moduleInfo.defined && !moduleInfo.resolved, 'test-module module is defined but not resolved');

        define.external('moment');

        momentInfo = resource.getResourceInfo('moment');
        assert.ok(momentInfo.defined && !momentInfo.resolved, 'moment module is now defined but not yet resolved');
        assert.ok(momentInfo.isExternal, 'moment module is now marked as an external module');
        assert.ok(resource.externalPending, 'External modules pending');

        var done = assert.async();

        window.moment = { name: 'Mock moment module' };

        setTimeout(function () {
            var moduleInfo = resource.getResourceInfo('test-module');
            var momentInfo = resource.getResourceInfo('moment');

            assert.notOk(resource.externalPending, 'External modules no longer pending');
            assert.ok(momentInfo.resolved, 'moment module is now resolved');
            assert.strictEqual(momentInfo.handle, window.moment, 'moment module handle === window.moment');
            assert.ok(moduleInfo.resolved, 'test-module module is now resolved');

            done();
        }, 300);

    });

    QUnit.test('Manually triggered resolve of subsequently defined global varaible', function (assert) {
        /// <param name="assert" type="QUnit.Assert" /> 
        resource.reset();

        define('test-module-2', ['moment2'], function (moment) {
            return { otherResource: moment };
        });

        var moduleInfo = resource.getResourceInfo('test-module-2');
        var momentInfo = resource.getResourceInfo('moment2');

        assert.ok(!momentInfo.resolved && !momentInfo.defined, 'moment-2 module is neither defined nor resolved');
        assert.notOk(momentInfo.isExternal, 'moment2 module is not an external module');
        assert.ok(moduleInfo.defined && !moduleInfo.resolved, 'test-module-2 module is defined but not resolved');

        define.external('moment2');

        momentInfo = resource.getResourceInfo('moment2');
        assert.ok(momentInfo.defined && !momentInfo.resolved, 'moment2 module is now defined but not yet resolved');
        assert.ok(momentInfo.isExternal, 'moment2 module is now marked as an external module');
        assert.ok(resource.externalPending, 'External modules pending');

        window.moment2 = { name: 'Mock moment module' };

        resource.resolve('moment2');

        var moduleInfo = resource.getResourceInfo('test-module-2');
        var momentInfo = resource.getResourceInfo('moment2');

        assert.ok(momentInfo.resolved, 'moment2 module is now resolved');
        assert.strictEqual(momentInfo.handle, window.moment2, 'moment2 module handle === window.moment2');
        assert.ok(moduleInfo.resolved, 'test-module-2 module is now resolved');
    });

    QUnit.test('Complex dependencies', function (assert) {
        /// <param name="assert" type="QUnit.Assert" /> 
        resource.reset();
        resource.debug = true;

        console.log('-----------------------------------------------------------');

        // Dependency tree:
        //      
        //       a   b
        //      / \ /
        //     d   c
        //    / \ / \
        //   g   e   f 
        //    \__|__/
        //       |
        //       h  

        define('c', ['a', 'b'], createResourceInit('c'));

        assert.sameItems(util.select(resource.getResources(), 'name'), ['a', 'b', 'c'], 'a, b, c defined or referenced');
        assert.sameItems(util.select(resource.getPendingResources(), 'name'), ['c'], 'c pending');

        define('f', ['c'], createResourceInit('f'));
        define('e', ['c', 'd'], createResourceInit('e'));

        assert.sameItems(util.select(resource.getResources(), 'name'), ['a', 'b', 'c', 'd', 'e', 'f'], 'a, b, c, d, e, f defined or referenced');
        assert.sameItems(util.select(resource.getPendingResources(), 'name'), ['c', 'e', 'f'], 'c, e, f pending');

        define('h', ['e', 'f', 'g'], createResourceInit('h'));
        define('d', ['a'], createResourceInit('d'));

        assert.sameItems(util.select(resource.getResources(), 'name'), ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], 'a, b, c, d, e, f, g, h defined or referenced');
        assert.sameItems(util.select(resource.getPendingResources(), 'name'), ['c', 'd', 'e', 'f', 'h'], 'c, d, e, f, h pending');

        var anonResolved = false;

        require(['a', 'e'], function (a, e) {
            console.log('a.name = \'' + a.name + '\'');
            console.log('e.name = \'' + e.name + '\'');
            anonResolved = true;
        });

        resource.listUnresolved();

        define('a', { name: 'module a' });
        assert.ok(resource.isResolved('a'), 'a is now resolved');
        assert.ok(resource.isResolved('d'), 'd is now resolved');
        assert.sameItems(util.select(resource.getPendingResources(), 'name'), ['c', 'e', 'f', 'h'], 'c, e, f, h pending');

        assert.notOk(anonResolved, 'Action 1 not yet invoked');
        assert.sameItems(util.select(resource.getPendingActions(), 'name'), ['Action 1'], 'Anonymous action 1 still pending');

        define('g', ['d'], createResourceInit('g'));
        assert.ok(resource.isResolved('g'), 'g is resolved immediately');

        define('b', {});
        assert.strictEqual(resource.getPendingResources().length, 0, 'All modules now resolved');

        assert.ok(anonResolved, 'Action 1 has now been invoked');

        resource.listUnresolved();

        resource.debug = false;
        console.log('-----------------------------------------------------------');
    });

    QUnit.module('define.external');

    QUnit.test('define.external with alias', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />  
        resource.reset();

        var jqInfo1 = resource.getResourceInfo('jQuery');
        assert.strictEqual(jqInfo1, null, 'jQuery is not yet defined');
        define.external('jQuery');

        var jqInfo2 = resource.getResourceInfo('jQuery');
        assert.ok(jqInfo2.defined, 'jQuery is now defined');
        assert.ok(jqInfo2.isExternal, 'jQuery is external');
        assert.strictEqual(jqInfo2.handle, window.jQuery, 'jQuery resource handle matches global varaible');

        define.external('$', 'jQuery');
        var info = resource.getResourceInfo('$');
        assert.ok(info.defined, '$ resource is defined');
        assert.ok(info.isExternal, '$ resource is external');
        assert.strictEqual(info.handle, window.jQuery, '$ resource handle matches global jQuery varaible');
    });

    QUnit.test('define.external with source callback', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />  
        resource.reset();

        // Simple factory function. Invoke until not null
        define.external(
            'span-foo',
            function () {
                console.log('Looking for #span-foo')
                return document.querySelector('#span-foo');
            }
        );

        var done = assert.async();

        setTimeout(function () {
            var $fixture = $("#qunit-fixture");
            $fixture.append($("<span id='span-foo'>Foo!</span>"));

            setTimeout(function () {
                var spanFoo = require('span-foo');
                assert.notStrictEqual(spanFoo, null, 'spanFoo is now defined');
                assert.ok(spanFoo instanceof HTMLSpanElement, 'spanFoo is a span element');

                done();
            }, 200);
        }, 100);
    });

    QUnit.test('define.external with source and test callbacks', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />  
        resource.reset();

        // Factory function with test function. Invoke until test function returns true
        define.external(
            'some-lib',
            function () {
                function somLibFunc(value) { return value; };
                return somLibFunc;
            },
            function () {
                return window['org.some.lib'] != null;
            }
        );

        var done = assert.async();

        setTimeout(function () {
            window['org.some.lib'] = {};

            setTimeout(function () {
                var somLibFunc = require('some-lib');
                assert.ok(somLibFunc instanceof Function, 'somLibFunc is a function');
                done();
            }, 200);
        }, 100);
    });

    QUnit.module('lazy loading');

    QUnit.test('basic lazy loading', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />  
        resource.reset();
        resource.immediateResolve = false;
        resource.debug = true;

        //      a
        //    / | \
        //   b  c  d
        //   \ /
        //    e 
        //    |
        //  Action

        define('a', createResourceInit('a'));

        var aInfo = resource.getResourceInfo('a');
        assert.ok(aInfo.defined, 'a is defined');
        assert.notOk(aInfo.resolved, 'a is *NOT* resolved');

        define('b', ['a'], createResourceInit('b'));
        define('c', ['a'], createResourceInit('c'));
        define('d', ['a'], createResourceInit('d'));
        define('e', ['b', 'c'], createResourceInit('e'));

        aInfo = resource.getResourceInfo('a');
        assert.notOk(aInfo.resolved, 'a is still *NOT* resolved');

        require('e', function (e) {
            assert.strictEqual(e.name, 'e', 'verify injected \'e\' module');
        });

        aInfo = resource.getResourceInfo('a');
        assert.ok(aInfo.resolved, 'a is now resolved');

        var dInfo = resource.getResourceInfo('d');
        assert.notOk(dInfo.resolved, 'd is still *NOT* resolved');
    });


    QUnit.test('remote file lazy loading', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />  
        resource.reset();
        resource.immediateResolve = false;
        resource.debug = true;

        //               lib-a                  - remote-lib-a.js
        //             /    |    \
        //   lib-b-foo  lib-b-bar  lib-b-baz    - remote-lib-b.js
        //   \ /
        //    |         my-resource.json        - my-resource.json
        //    |             |
        //  local __________/                   - Local
        //    |  /
        //  Action

        define.remote('lib-a', 'js/lib-a.js');

        // Make QUnit wait for all this to complete
        var aDone = assert.async();
        var bDone = assert.async();
        var jsonDone = assert.async();
        var anonDone = assert.async();

        var libAInfo = resource.getResourceInfo('lib-a');
        assert.notOk(libAInfo.defined, 'lib-a not yet defined');
        assert.notOk(libAInfo.resolved, 'lib-a not yet resolved');

        define.remote('lib-b-foo', 'js/lib-b.js');
        define.remote('lib-b-bar', 'js/lib-b.js');
        define.remote('my-resource-1.0.0', 'js/my-resource.json', true);

        define('local', ['lib-b-foo'], createResourceInit('local'));

        require(['local', 'my-resource-1.0.0'], function (local, myrsrc) {
            assert.strictEqual(local.name, 'local', 'verify injected \'local\' module');
            assert.strictEqual(myrsrc.name, 'my-resource', 'verify injected \'my-resource\' module');

            var libAInfo = resource.getResourceInfo('lib-a');
            assert.ok(libAInfo.resolved, 'lib-a now resolved');

            var libBFoo = resource.getResourceInfo('lib-b-foo');
            var libBBar = resource.getResourceInfo('lib-b-bar');
            assert.ok(libBFoo.defined, 'lib-b-foo is defined');
            assert.ok(libBFoo.resolved, 'lib-b-foo is resolved');

            assert.ok(libBBar.defined, 'lib-b-bar is defined');
            assert.notOk(libBBar.resolved, 'lib-b-bar is NOT resolved');

            define.remote('lib-b-baz', 'js/lib-b.js');

            anonDone();
        });

        require('lib-a', aDone);
        require('lib-b-foo', bDone);
        require('my-resource-1.0.0', jsonDone);
    });

    QUnit.module('lazy loading');

    QUnit.test('Prevent redefinition', function (assert) {
        /// <param name="assert" type="QUnit.Assert" /> 
        resource.reset();

        var def_1 = { name: 'def 1' };
        var def_2 = { name: 'def 2' };

        define('a', def_1);

        assert.strictEqual(resource.getResource('a'), def_1, 'a module defined');

        define('a', def_2);

        assert.strictEqual(resource.getResource('a'), def_1, 'a module retains original definition');
        assert.notStrictEqual(resource.getResource('a'), def_2, 'a module ignores redefinition');
    });

    QUnit.test('Prevent overwriting of existing global variable module', function (assert) {
        /// <param name="assert" type="QUnit.Assert" /> 
        resource.reset();

        var current_jQuery = window.jQuery;

        function redef_jQuery(selector) {
            return window.document.querySelectorAll(selector);
        }

        define('jQuery', redef_jQuery, true);

        assert.strictEqual(resource.getResource('jQuery'), current_jQuery, 'jQuery is still global value');
        assert.notStrictEqual(resource.getResource('jQuery'), redef_jQuery, 'jQuery redefinition ignored');
    });

    QUnit.test('Redefinition throws exception when ignoreRedefine == false', function (assert) {
        /// <param name="assert" type="QUnit.Assert" /> 
        resource.reset();

        var def_1 = { name: 'def 1' };
        var def_2 = { name: 'def 2' };

        define('a', def_1);

        assert.strictEqual(resource.getResource('a'), def_1, 'a module defined');

        resource.ignoreRedefine = false;

        assert.throws(function () {
            define('a', def_2);
        }, /Resource 'a' is already defined/, 'Redifintion throws exception');

        resource.ignoreRedefine = true;

        assert.strictEqual(resource.getResource('a'), def_1, 'a module retains original definition');
        assert.notStrictEqual(resource.getResource('a'), def_2, 'a module ignores redefinition');
    });

    QUnit.test('define arguments', function (assert) {
        /// <param name="assert" type="QUnit.Assert" /> 
        assert.throws(function () { define(); }, /define requires at least two arguments/, 'define with no arguments fails');
        assert.throws(function () { define('a'); }, /define requires at least two arguments/, 'define with a single arguments fails');
        assert.throws(function () { define(1, 'a'); }, /resourceName must be a string/, 'First argument must be a string');
        assert.throws(function () { define('b', 'a', {}); }, /dependsOn argument must be an array/, 'Second of three arguments must be an array');
    });

    QUnit.test('define.external arguments', function (assert) {
        /// <param name="assert" type="QUnit.Assert" /> 
        assert.throws(function () { define.external(); }, /define.external requires at least one argument/, 'define.external with no arguments fails');
        assert.throws(function () { define.external(1); }, /resourceName must be a string/, 'First argument must be a string');
    });

    QUnit.test('require arguments', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />         
        assert.throws(function () { require(); }, /require requires at least one argument/, 'require with no arguments fails');
        //assert.throws(function () { require('a'); }, /require requires at least two arguments/, 'require with one arguments fails');
        assert.throws(function () { require(1, function () { }); }, /dependsOn must be a string or array of strings/, 'First argument must be a string or array of strings');
        assert.throws(function () { require('a', 1); }, /definition must be a function/, 'Second argument must be a function');
    });

    QUnit.test('resource.destroy', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />         

        define('foo-1', { name: 'foo-1' });
        assert.ok(resource.isDefined('foo-1'));
        resource.destroy('foo-1');
        assert.strictEqual(resource.isDefined('foo-1'), false, 'destroy removes the module');
        assert.strictEqual(resource.getResourceInfo('foo-1'), null, 'destroy removes module info');

        // Can redfine
        define('foo-1', { name: 'foo-1' });
    });
})();