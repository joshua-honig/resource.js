var root = (function () {
    try { if (typeof global != 'undefined') return global; } catch (e) { }
    try { if (typeof window != 'undefined') return window; } catch (e) { }
    return this;
})();

var is_node = false;
try { is_node = !!(module && module.exports && require('path').join); }
catch (e) { }

var supports_promise = false;
try { supports_promise = Promise && Promise instanceof Function; }
catch (e) { console.log('Environment does not support Promise api'); }

var QUnit = root.QUnit;
if (QUnit == undefined) QUnit = require('qunit');

var script_base_path = '/server/';
var resource = root.resource;
var require = root.resource.require;
var define = root.resource.define;
var util = root.test_utils;

root.globalLib = {
    echo: function (input) {
        return 'you supplied ' + String(input);
    }
};


(function (window) {

    // IE polyfill for function.name
    if ((function f() { }).name == undefined) {
        Object.defineProperty(Function.prototype, 'name', {
            get: function () {
                return (/(^\s*function\s+)(\w+)/.exec(this.toString()) || [])[2];
            }
        });
    }

    function wrapAsync(assert, name, timeout) {
        var doneFunc = assert.async();
        var handle = { done: false };
        var wrapper = handle.func = function () {
            if (handle.func.canceled) {
                console.log('Async test was already canceled');
                return;
            }
            handle.func.done = true;
            doneFunc();
        };
        wrapper.cancel = function (isTimeout) {
            if (handle.func.done) return;
            isTimeout = isTimeout !== false;
            console.log('Canceling async test');
            assert.ok(false, 'Async test \'' + name + '\' ' + (isTimeout ? 'timed out' : 'canceled'))
            handle.func.canceled = true;
            doneFunc();
        };

        if (!isNaN(+timeout)) {
            setTimeout(wrapper.cancel, +timeout);
        }

        return handle.func;
    };

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
            if (arguments.length == 0) {
                console.log('initializing module ' + name);
            } else {
                console.log('initializing module ' + name + ' from');
                for(var i = 0; i < arguments.length; i++) {
                    console.log(' - ' + String(arguments[0]));
                }
            }

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

        var currentKey = window.resource.internals.key;
        assert.ok(window[currentKey] != null, 'resource-js version defined');

        assert.hasMembers(
            resource,
            ['version', 'Context', 'id', 'name', 'config', 'internals', 'define', 'require', 'destroy', 'resolve', 'reset', 'get', 'describe', 'is', 'list', 'printUnresolved'],
            'Verify members of window.resource'
        );

        assert.hasMembers(
            resource.Context,
            ['get', 'create', 'destroy'],
            'Verify members of window.resource.Context'
        );

        assert.hasMembers(
            resource.config,
            ['debug', 'ignoreRedefine', 'immediateResolve', 'external', 'useAxios', 'useJQuery', 'ajaxProvider'],
            'Verify members of window.resource.config'
        );

        assert.hasMembers(
            resource.config.external,
            ['autoResolve', 'interval', 'timeout'],
            'Verify members of window.resource.config.external'
        );

        assert.hasMembers(
            resource.internals,
            ['anonymousIndex', 'externalPending', 'key'],
            'Verify members of window.resource.internals'
        );
    });

    QUnit.module('Context instance methods');

    QUnit.test('get', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        var def = { foo: 'bar' };
        define('a', def);
        assert.strictEqual(resource.get('a'), def, 'get returns object literal definition');

        function def_func() { };
        define('b', def_func, true);
        assert.strictEqual(resource.get('b'), def_func, 'get returns function literal definition');

        function init_func() { return { name: 'bif', value: 42 }; }
        define('c', init_func);
        assert.propEqual(resource.get('c'), { name: 'bif', value: 42 }, 'get returns init function result');

        window['fiz-bang-bar'] = {};

        define.external('fiz-bang-bar');
        assert.strictEqual(resource.get('fiz-bang-bar'), window['fiz-bang-bar'], 'get returns global variable for external module');
    });


    QUnit.test('describe', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        var def = { foo: 'bar' };
        define('a', def);
        assert.allStrictEqual(resource.describe('a'), {
            id: 'a',
            isDefined: true,
            isResolved: true,
            isExternal: false,
            dependsOn: { resolved: [], unresolved: [] },
            value: def
        }, 'describe: object literal');

        function def_func() { };
        define('b', def_func, true);
        assert.allStrictEqual(resource.describe('b'), {
            id: 'b',
            isDefined: true,
            isResolved: true,
            isExternal: false,
            dependsOn: { resolved: [], unresolved: [] },
            value: def_func
        }, 'describe: function literal');

        function init_func() { return { name: 'bif', value: 42 }; }
        define('c', init_func);
        assert.allStrictEqual(resource.describe('c'), {
            id: 'c',
            isDefined: true,
            isResolved: true,
            isExternal: false,
            dependsOn: { resolved: [], unresolved: [] },
            value: { name: 'bif', value: 42 }
        }, 'describe: init function');

        define.external('globalLib');
        assert.allStrictEqual(resource.describe('globalLib'), {
            id: 'globalLib',
            isDefined: true,
            isResolved: true,
            isExternal: true,
            dependsOn: { resolved: [], unresolved: [] },
            value: window.globalLib
        }, 'describe: external module');
    });

    QUnit.test('list.all', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        var def = { foo: 'bar' };
        define('a', def);

        function def_func() { };
        define('b', def_func, true);

        var resourceMap = resource.list.all().toMap();

        assert.hasMembers(resourceMap, ['a', 'b'], 'Check resource keys', true);

        assert.allStrictEqual(resourceMap['a'], {
            id: 'a',
            isDefined: true,
            isResolved: true,
            isExternal: false,
            dependsOn: [],
            value: def
        }, 'Verify module a info');

        assert.allStrictEqual(resourceMap['b'], {
            id: 'b',
            isDefined: true,
            isResolved: true,
            isExternal: false,
            dependsOn: [],
            value: def_func
        }, 'Verify module b info');

    });

    QUnit.test('list.actions', function (assert) {
        resource.reset();

        var anonFunc1 = function (constants) {
            assert.strictEqual(constants.majorityAge, 18, 'app-constants injected to anonFunc1');
        };

        var anonFunc2 = function (constants) {
            assert.strictEqual(constants.majorityAge, 18, 'app-constants injected to anonFunc2');
        };

        require('app-constants', anonFunc1);
        require('app-constants', anonFunc2);

        var fnSortName = util.propSorter('id');
        var infos = resource.list.actions().sort(fnSortName);

        assert.strictEqual(infos.length, 2, 'Two pending actions');

        assert.allStrictEqual(infos, [
            {
                isAnonymousAction: true,
                definition: anonFunc1,
                dependsOn: {
                    resolved: [],
                    unresolved: [{ id: 'app-constants' }]
                },
                id: 'Action 1'
            },
            {
                isAnonymousAction: true,
                definition: anonFunc2,
                dependsOn: {
                    resolved: [],
                    unresolved: [{ id: 'app-constants' }]
                },
                id: 'Action 2'
            }
        ], 'Action info');

        define_constants();
        assert.strictEqual(resource.list.actions().length, 0, 'Actions now resolved');
    });

    QUnit.test('list.resources (defined but unresolved)', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        define_object_literal(true);

        var infos = resource.list.resources(true, false);

        assert.strictEqual(infos.length, 1, 'One pending module');

        assert.allStrictEqual(infos, [{
            id: 'object-literal',
            isDefined: true,
            isResolved: false,
            isExternal: false,
            dependsOn: {
                resolved: [],
                unresolved: [{ id: 'base' }]
            },
            value: null
        }], 'Pending module info');

        define('base', {});

        assert.strictEqual(resource.list.resources(true, false).length, 0, 'Modules now resolved');
    });

    QUnit.test('list.resources (undefined)', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        define('a', ['b'], {});

        var aInfo = resource.describe('a', true);

        var infos = resource.list.resources(false);

        assert.strictEqual(infos.length, 1, 'One undefined module');
        assert.allStrictEqual(infos, [
            {
                id: 'b',
                pendingDependents: {
                    actions: [],
                    resources: [{
                        id: 'a'
                    }]
                }
            }
        ], 'undefined modules info');

        define('b', {});
        assert.strictEqual(resource.list.resources(false).length, 0, 'No undefined modules now');
    });

    QUnit.test('is.defined', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        define('a', {});
        assert.ok(resource.is.defined('a'), 'a is defined');
        assert.notOk(resource.is.defined('b'), 'b is not defined');
    });

    QUnit.test('is.resolved', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        define('a', {});
        define('b', ['c'], {});

        assert.ok(resource.is.resolved('a'), 'a is resolved');
        assert.ok(resource.is.defined('b'), 'b is defined');
        assert.notOk(resource.is.resolved('b'), 'b is not resolved');
        assert.notOk(resource.is.resolved('c'), 'c is not resolved');
        assert.notOk(resource.is.resolved('x'), 'x is not resolved');
    });

    QUnit.test('reset', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        define('a', {});
        define('b', ['c'], {});
        require(['c'], function () { });

        var indexBefore = resource.id;

        assert.strictEqual(resource.list.resources().length, 3, 'Three modules defined or referenced');
        assert.strictEqual(resource.list.resources(true, false).length, 1, 'One pending module');
        assert.strictEqual(resource.list.actions().length, 1, 'One pending action');
        assert.strictEqual(resource.list.resources(false).length, 1, 'One undefined module reference');

        resource.reset();

        assert.strictEqual(resource.list.resources().length, 0, 'No modules defined or referenced');
        assert.strictEqual(resource.list.resources(true, false).length, 0, 'No pending modules');
        assert.strictEqual(resource.list.actions().length, 0, 'No pending actions');
        assert.strictEqual(resource.list.resources(false).length, 0, 'No undefined module references');
        assert.strictEqual(resource.id, indexBefore + 1, '_contextIndex incremented');
    });

    QUnit.test('resolve (all)', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        // util.clearGlobal('global-1');
        // util.clearGlobal('global-2');

        define('a', {});
        define('b', ['global-1'], {});
        define('c', ['global-2'], {});
        define.external('global-1');
        define.external('global-2');

        assert.strictEqual(resource.list.resources(true, false).length, 4, 'Four pending modules');

        window['global-1'] = {};
        window['global-2'] = {};

        resource.resolve();

        assert.strictEqual(resource.list.resources(true, false).length, 0, 'No pending modules');
    });

    QUnit.test('resolve (selective)', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        // util.clearGlobal('global-1');
        // util.clearGlobal('global-2');

        define('a', {});
        define('b', ['global-3'], {});
        define('c', ['global-4'], {});
        define.external('global-3');
        define.external('global-4');

        assert.strictEqual(resource.list.resources(true, false).length, 4, 'Four pending modules');

        window['global-3'] = {};
        window['global-4'] = {};

        resource.resolve('global-3');

        assert.strictEqual(resource.list.resources(true, false).length, 2, 'Two pending modules');

        resource.resolve('global-4');

        assert.strictEqual(resource.list.resources(true, false).length, 0, 'No pending modules');
    });






    QUnit.module('require');

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

        define.external('globalLib');
        assert.strictEqual(require('globalLib'), window.globalLib, 'require([moduleName]) returns global variable for external module');
    });

    QUnit.module('basic module definitions');

    QUnit.test('Object constant', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        var module_object = define_object_literal();

        var info = resource.describe('object-literal');
        assert.ok(info, 'object-literal module exists');
        assert.ok(info.isDefined, 'object-literal module is defined');
        assert.ok(info.isResolved, 'object-literal module is resolved');

        assert.strictEqual(resource.get('object-literal'), module_object, 'get returns module definition object');
        assert.strictEqual(resource.describe('object-literal').value, module_object, 'describe().value returns module definition object');
    });

    QUnit.test('Function constant', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        var func_def = define_function_literal();

        var info = resource.describe('func-literal');
        assert.ok(info, 'func-literal module exists');
        assert.ok(info.isDefined, 'func-literal module is defined');
        assert.ok(info.isResolved, 'func-literal module is resolved');

        assert.strictEqual(resource.get('func-literal'), func_def, 'get returns module definition function');
        assert.strictEqual(resource.describe('func-literal').value, func_def, 'describe().value returns module definition function');
    });

    QUnit.test('Anonymous function', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        define_anon_function();

        var info = resource.describe('anon-module');
        assert.ok(info, 'anon-module module exists');
        assert.ok(info.isDefined, 'anon-module module is defined');
        assert.ok(info.isResolved, 'anon-module module is resolved');

        var module_object = resource.get('anon-module');
        assert.ok(module_object.hasOwnProperty('whenConstructed'), 'module initialized');
    });

    QUnit.test('Named function', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        define_named_function();

        var info = resource.describe('named-module');
        assert.ok(info, 'named-module module exists');
        assert.ok(info.isDefined, 'named-module module is defined');
        assert.ok(info.isResolved, 'named-module module is resolved');

        var module_object = resource.get('named-module');
        assert.ok(module_object.hasOwnProperty('whenConstructed'), 'module initialized : whenConstructed');
        assert.ok(module_object.hasOwnProperty('source'), 'module initialized : source');
        assert.ok(module_object.hasOwnProperty('sourceName'), 'module initialized : sourceName');
        assert.strictEqual(module_object.sourceName, 'module_def', 'sourceName === \'module_def\'');
    });

    QUnit.test('External', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        define.external('baz');
        var info = resource.describe('baz');
        assert.ok(info, 'baz module exists');
        assert.ok(info.isExternal, 'baz module is external');
        assert.ok(info.isDefined, 'baz module is defined');
        assert.notOk(info.isResolved, 'baz module is NOT resolved');

        window.baz = { name: 'baz module!' };

        resource.resolve('baz');

        var info = resource.describe('baz');
        assert.ok(info.isDefined, 'baz module is now defined');
        assert.ok(info.isResolved, 'baz module is now resolved');
    });

    QUnit.module('dependent module definitions');

    QUnit.test('Object constant', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        var module_object = define_object_literal(true);

        var info = resource.describe('object-literal');
        assert.ok(info, 'object-literal module exists');
        assert.ok(info.isDefined, 'object-literal module is defined');
        assert.notOk(info.isResolved, 'object-literal module is NOT resolved');

        define('base', {});

        var info = resource.describe('object-literal');
        assert.ok(info.isResolved, 'object-literal module is now resolved');

        assert.strictEqual(resource.get('object-literal'), module_object, 'get returns module definition object');
    });

    QUnit.test('Function constant', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        var func_def = define_function_literal(true);

        var info = resource.describe('func-literal');
        assert.ok(info, 'func-literal module exists');
        assert.ok(info.isDefined, 'func-literal module is defined');
        assert.notOk(info.isResolved, 'func-literal module is NOT resolved');

        define('base', {});

        var info = resource.describe('func-literal');
        assert.ok(info.isResolved, 'func-literal module is now resolved');

        assert.strictEqual(resource.get('func-literal'), func_def, 'get returns module definition function');
    });

    QUnit.test('Anonymous function', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        define_anon_function(true);

        var info = resource.describe('anon-module');
        assert.ok(info, 'anon-module module exists');
        assert.ok(info.isDefined, 'anon-module module is defined');
        assert.notOk(info.isResolved, 'anon-module module is NOT resolved');

        define('base', {});

        var info = resource.describe('anon-module');
        assert.ok(info.isResolved, 'anon-module module is now resolved');

        var module_object = resource.get('anon-module');
        assert.ok(module_object.hasOwnProperty('whenConstructed'), 'module initialized');
    });

    QUnit.test('Named function', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        define_named_function(true);

        var info = resource.describe('named-module');
        assert.ok(info, 'named-module module exists');
        assert.ok(info.isDefined, 'named-module module is defined');
        assert.notOk(info.isResolved, 'named-module module is NOT resolved');

        define('base', {});

        var info = resource.describe('named-module');
        assert.ok(info.isResolved, 'named-module module is now resolved');

        var module_object = resource.get('named-module');
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

        var dataModel = resource.get('object-model-base');
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

        var dataModel = resource.get('object-model-employee');
        var Employee = dataModel.Employee;

        var joe = new Employee('Joe', 'Schmoe', 23409, 25);
        var bb = new Employee('Bus', 'Boy', 0932, 16);

        assert.strictEqual(joe.isMinor, false, 'Joe is not a minor');
        assert.strictEqual(bb.isMinor, true, 'Bus Buy is a minor');
    });

    QUnit.test('Automatic detection of existing global variable', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        define('test-module', ['globalLib'], function ($lib) {
            return { myLibHandle: $lib };
        });

        var moduleInfo = resource.describe('test-module');
        var globalLibInfo = resource.describe('globalLib');

        assert.strictEqual(globalLibInfo.isResolved, true, 'globalLib module is defined and resolved');
        assert.strictEqual(globalLibInfo.isExternal, true, 'globalLib module is an external module');

        assert.strictEqual(moduleInfo.isResolved, true, 'test-module module is defined and resolved');
    });

    QUnit.test('require with single dependency', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        require('app-constants', function (constants) {
            assert.strictEqual(constants.majorityAge, 18, 'Dependency injected successfully');
        });

        assert.strictEqual(resource.list.actions().length, 1, 'Action is now pending');
        define_constants();
        assert.strictEqual(resource.list.actions().length, 0, 'Actions no longer pending');
    });

    QUnit.test('require with multiple dependencies', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        require(['app-constants', 'globalLib'], function (constants, g) {
            assert.strictEqual(constants.majorityAge, 18, 'app-constants injected successfully');
            var msg = g.echo('Hello');
            assert.strictEqual(msg, 'you supplied Hello', 'globalLib injected successfully');
        });

        assert.strictEqual(resource.list.actions().length, 1, 'Action is now pending');
        define_constants();
        assert.strictEqual(resource.list.actions().length, 0, 'Actions no longer pending');
    });

    QUnit.test('Automatic detection of subsequently defined global variable', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        define('test-module', ['moment'], function (moment) {
            return { otherResource: moment };
        });

        var moduleInfo = resource.describe('test-module');
        var momentInfo = resource.describe('moment');

        assert.ok(!momentInfo.isResolved && !momentInfo.isDefined, 'moment module is neither defined nor resolved');
        assert.notOk(momentInfo.isExternal, 'moment module is not an external module');
        assert.ok(moduleInfo.isDefined && !moduleInfo.isResolved, 'test-module module is defined but not resolved');

        define.external('moment');

        momentInfo = resource.describe('moment');
        assert.ok(momentInfo.isDefined && !momentInfo.isResolved, 'moment module is now defined but not yet resolved');
        assert.ok(momentInfo.isExternal, 'moment module is now marked as an external module');
        assert.ok(resource.internals.externalPending, 'External modules pending');

        var done = assert.async();

        window.moment = { name: 'Mock moment module' };

        setTimeout(function () {
            var moduleInfo = resource.describe('test-module');
            var momentInfo = resource.describe('moment');

            assert.notOk(resource.internals.externalPending, 'External modules no longer pending');
            assert.ok(momentInfo.isResolved, 'moment module is now resolved');
            assert.strictEqual(momentInfo.value, window.moment, 'moment module value === window.moment');
            assert.ok(moduleInfo.isResolved, 'test-module module is now resolved');

            done();
        }, 300);

    });

    QUnit.test('Manually triggered resolve of subsequently defined global variable', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        define('test-module-2', ['moment2'], function (moment) {
            return { otherResource: moment };
        });

        var moduleInfo = resource.describe('test-module-2');
        var momentInfo = resource.describe('moment2');

        assert.ok(!momentInfo.isResolved && !momentInfo.isDefined, 'moment-2 module is neither defined nor resolved');
        assert.notOk(momentInfo.isExternal, 'moment2 module is not an external module');
        assert.ok(moduleInfo.isDefined && !moduleInfo.isResolved, 'test-module-2 module is defined but not resolved');

        define.external('moment2');

        momentInfo = resource.describe('moment2');
        assert.ok(momentInfo.isDefined && !momentInfo.isResolved, 'moment2 module is now defined but not yet resolved');
        assert.ok(momentInfo.isExternal, 'moment2 module is now marked as an external module');
        assert.ok(resource.internals.externalPending, 'External modules pending');

        window.moment2 = { name: 'Mock moment module' };

        resource.resolve('moment2');

        var moduleInfo = resource.describe('test-module-2');
        var momentInfo = resource.describe('moment2');

        assert.ok(momentInfo.isResolved, 'moment2 module is now resolved');
        assert.strictEqual(momentInfo.value, window.moment2, 'moment2 module value === window.moment2');
        assert.ok(moduleInfo.isResolved, 'test-module-2 module is now resolved');
    });

    QUnit.test('Complex dependencies', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();
        if (!is_node) resource.config.debug = true;
        if (!is_node) console.log('-----------------------------------------------------------');

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

        assert.sameItems(util.select(resource.list.resources(), 'id'), ['a', 'b', 'c'], 'a, b, c defined or referenced');
        assert.sameItems(util.select(resource.list.resources(true, false), 'id'), ['c'], 'c pending');

        define('f', ['c'], createResourceInit('f'));
        define('e', ['c', 'd'], createResourceInit('e'));

        assert.sameItems(util.select(resource.list.resources(), 'id'), ['a', 'b', 'c', 'd', 'e', 'f'], 'a, b, c, d, e, f defined or referenced');
        assert.sameItems(util.select(resource.list.resources(true, false), 'id'), ['c', 'e', 'f'], 'c, e, f pending');

        define('h', ['e', 'f', 'g'], createResourceInit('h'));
        define('d', ['a'], createResourceInit('d'));

        assert.sameItems(util.select(resource.list.resources(), 'id'), ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], 'a, b, c, d, e, f, g, h defined or referenced');
        assert.sameItems(util.select(resource.list.resources(true, false), 'id'), ['c', 'd', 'e', 'f', 'h'], 'c, d, e, f, h pending');

        var anonResolved = false;

        require(['a', 'e'], function (a, e) {
            console.log('a.name = \'' + a.name + '\'');
            console.log('e.name = \'' + e.name + '\'');
            anonResolved = true;
        });

        resource.printUnresolved();

        define('a', { name: 'module a' });
        assert.ok(resource.is.resolved('a'), 'a is now resolved');
        assert.ok(resource.is.resolved('d'), 'd is now resolved');
        assert.sameItems(util.select(resource.list.resources(true, false), 'id'), ['c', 'e', 'f', 'h'], 'c, e, f, h pending');

        assert.notOk(anonResolved, 'Action 1 not yet invoked');
        assert.sameItems(util.select(resource.list.actions(), 'id'), ['Action 1'], 'Anonymous action 1 still pending');

        define('g', ['d'], createResourceInit('g'));
        assert.ok(resource.is.resolved('g'), 'g is resolved immediately');

        define('b', {});
        assert.strictEqual(resource.list.resources(true, false).length, 0, 'All modules now resolved');

        assert.ok(anonResolved, 'Action 1 has now been invoked');

        resource.printUnresolved();

        resource.config.debug = false;
        if (!is_node) console.log('-----------------------------------------------------------');
    });

    QUnit.module('define.external');

    QUnit.test('define.external with alias', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        var glbInfo1 = resource.describe('globalLib');
        assert.strictEqual(glbInfo1, null, 'globalLib is not yet defined');
        define.external('globalLib');

        var glbInfo2 = resource.describe('globalLib');
        assert.ok(glbInfo2.isDefined, 'globalLib is now defined');
        assert.ok(glbInfo2.isExternal, 'globalLib is external');
        assert.strictEqual(glbInfo2.value, window.globalLib, 'globalLib resource value matches global variable');

        define.external('glib', 'globalLib');
        var info = resource.describe('glib');
        assert.ok(info.isDefined, 'glib resource is defined');
        assert.ok(info.isExternal, 'glib resource is external');
        assert.strictEqual(info.value, window.globalLib, 'glib resource value matches global globalLib variable');
    });

    if (is_node) {
        QUnit.test('define.external with source callback', function (assert) {
            /// <param name="assert" type="QUnit.Assert" />
            resource.reset();

            var handle = {};

            // Simple factory function. Invoke until not null
            define.external(
                'magic-number',
                function () {
                    console.log('Looking for #magic-number')
                    return handle['#magic-number'];
                }
            );

            var done = assert.async();

            setTimeout(function () {
                handle['#magic-number'] = 42;

                setTimeout(function () {
                    var magicnum = require('magic-number');
                    assert.notStrictEqual(magicnum, null, 'magicnum is now defined');
                    assert.ok(typeof magicnum == 'number', 'magicnum is a number');

                    done();
                }, 200);
            }, 100);
        });
    } else {
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
    }


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
        resource.config.immediateResolve = false;
        if (!is_node) resource.config.debug = true;

        //      a
        //    / | \
        //   b  c  d
        //   \ /
        //    e
        //    |
        //  Action

        define('a', createResourceInit('a'));

        var aInfo = resource.describe('a');
        assert.ok(aInfo.isDefined, 'a is defined');
        assert.notOk(aInfo.isResolved, 'a is *NOT* resolved');

        define('b', ['a'], createResourceInit('b'));
        define('c', ['a'], createResourceInit('c'));
        define('d', ['a'], createResourceInit('d'));
        define('e', ['b', 'c'], createResourceInit('e'));

        aInfo = resource.describe('a');
        assert.notOk(aInfo.isResolved, 'a is still *NOT* resolved');

        require('e', function (e) {
            assert.strictEqual(e.name, 'e', 'verify injected \'e\' module');
        });

        aInfo = resource.describe('a');
        assert.ok(aInfo.isResolved, 'a is now resolved');

        var dInfo = resource.describe('d');
        assert.notOk(dInfo.isResolved, 'd is still *NOT* resolved');
    });

    QUnit.test('pending action', function (assert) {
        assert.timeout(500);
        var done = assert.async();

        resource.reset();
        resource.config.immediateResolve = false;
        if (!is_node) resource.config.debug = true;

        // This simulates a bug that occurred when a module
        // ('$page' / 'c') was defined in an event callback
        // triggered by functionality in jQuery ('b'), which
        // failed to trigger a pending action

        //  
        //      jquery  
        //      / | \
        //  form  |  $page
        //     \  |  /
        //      Action
        //

        define('form', ['mock-jquery'], function ($) {
            function HelpfulForm($element) {
                this.$element = $element;
            }

            HelpfulForm.fake_name = 'Form';

            return HelpfulForm;
        });

        var formInfo = resource.describe('form');
        assert.ok(formInfo.isDefined, 'form is defined');
        assert.notOk(formInfo.isResolved, 'form is *NOT* resolved');

        define('mock-jquery', function () {
            var _readyCallbacks = [];

            function pretendJQuery() {
                if (arguments.length == 1 && (util.isFunction(arguments[0]))) {
                    var callback = arguments[0];
                    _readyCallbacks.push(callback);
                }
            }

            pretendJQuery._ready = function () {
                for (var i = (_readyCallbacks.length - 1); i >= 0; i--) {
                    (_readyCallbacks.shift())();
                }
            };

            pretendJQuery.fake_name = 'jQuery';
            return pretendJQuery;
        });

        assert.ok(resource.is.defined('mock-jquery'), 'mock-jquery is defined');
        assert.notOk(resource.is.resolved('mock-jquery'), 'mock-jquery is *NOT* resolved');

        function FakeDocument() {
            this.name = 'document';
        }

        // Definition of '$page' waits for callback from 'mock-jquery' (like $(document).ready(...))
        require('mock-jquery', function ($) {
            $(function () {
                var local_document = new FakeDocument();
                define('$page', local_document);
            })
        });

        var actionIsResolved = false;

        // Anonymous action that must be triggered
        require(['form', 'mock-jquery', '$page'], function (Form, $) {
            actionIsResolved = true;
            assert.ok(resource.is.resolved('form'), 'form is resolved');
            assert.strictEqual(Form.fake_name, 'Form', 'verify injected \'form\' module');

            assert.ok(resource.is.resolved('mock-jquery'), 'mock-jquery is resolved');
            assert.strictEqual($.fake_name, 'jQuery', 'verify injected \'mock-jquery\' module');

            assert.ok(resource.is.resolved('$page'), '$page is resolved');
            var $page = require('$page');
            assert.strictEqual($page.name, 'document', 'verify \'$page\' module');

            done();
        });

        assert.notOk(actionIsResolved, 'Action is not yet resolved');

        // Trigger 'document ready' in 200 ms
        var jq = require('mock-jquery');
        setTimeout(jq._ready.bind(jq), 200);
    });

    if (!is_node) {
        QUnit.test('remote file lazy loading - jquery', function (assert) {
            /// <param name="assert" type="QUnit.Assert" />
            resource.reset();
            resource.config.immediateResolve = false;
            resource.config.debug = true;
            resource.config.useJQuery();

            //               lib-a                  - remote-lib-a.js
            //             /    |    \
            //   lib-b-foo  lib-b-bar  lib-b-baz    - remote-lib-b.js
            //   \ /
            //    |         my-resource.json        - my-resource.json
            //    |             |
            //  local __________/                   - Local
            //    |  /
            //  Action

            define.remote('lib-a', script_base_path + 'lib-a.js');

            // Make QUnit wait for all this to complete
            var aDone = wrapAsync(assert, 'resolve a', 2000);
            var bDone = wrapAsync(assert, 'resolve b', 2000);
            var jsonDone = wrapAsync(assert, 'resolve json', 2000);
            var anonDone = wrapAsync(assert, 'resolve anonymous', 2000);

            var libAInfo = resource.describe('lib-a');
            assert.notOk(libAInfo.isDefined, 'lib-a not yet defined');
            assert.notOk(libAInfo.isResolved, 'lib-a not yet resolved');

            define.remote('lib-b-foo', script_base_path + 'lib-b.js');
            define.remote('lib-b-bar', script_base_path + 'lib-b.js');
            define.remote('my-resource-1.0.0', script_base_path + 'my-resource.json', true);

            define('local', ['lib-b-foo'], createResourceInit('local'));

            require(['local', 'my-resource-1.0.0'], function (local, myrsrc) {
                assert.strictEqual(local.name, 'local', 'verify injected \'local\' module');
                assert.strictEqual(myrsrc.name, 'my-resource', 'verify injected \'my-resource\' module');

                var libAInfo = resource.describe('lib-a');
                assert.ok(libAInfo.isResolved, 'lib-a now resolved');

                var libBFoo = resource.describe('lib-b-foo');
                var libBBar = resource.describe('lib-b-bar');
                assert.ok(libBFoo.isDefined, 'lib-b-foo is defined');
                assert.ok(libBFoo.isResolved, 'lib-b-foo is resolved');

                assert.ok(libBBar.isDefined, 'lib-b-bar is defined');
                assert.notOk(libBBar.isResolved, 'lib-b-bar is NOT resolved');

                define.remote('lib-b-baz', script_base_path + 'lib-b.js');

                anonDone();
            });

            require('lib-a', aDone);
            require('lib-b-foo', bDone);
            require('my-resource-1.0.0', jsonDone);
        });
    }

    if (!is_node && supports_promise) {
        QUnit.test('remote file lazy loading - axios', function (assert) {
            /// <param name="assert" type="QUnit.Assert" />
            resource.reset();
            resource.config.immediateResolve = false;
            resource.config.debug = true;
            resource.config.useAxios();

            //               lib-a                  - remote-lib-a.js
            //             /    |    \
            //   lib-b-foo  lib-b-bar  lib-b-baz    - remote-lib-b.js
            //   \ /
            //    |         my-resource.json        - my-resource.json
            //    |             |
            //  local __________/                   - Local
            //    |  /
            //  Action

            define.remote('lib-a', script_base_path + 'lib-a.js');

            // Make QUnit wait for all this to complete
            var aDone = wrapAsync(assert, 'resolve a', 2000);
            var bDone = wrapAsync(assert, 'resolve b', 2000);
            var jsonDone = wrapAsync(assert, 'resolve json', 2000);
            var anonDone = wrapAsync(assert, 'resolve anonymous', 2000);

            var libAInfo = resource.describe('lib-a');
            assert.notOk(libAInfo.isDefined, 'lib-a not yet defined');
            assert.notOk(libAInfo.isResolved, 'lib-a not yet resolved');

            define.remote('lib-b-foo', script_base_path + 'lib-b.js');
            define.remote('lib-b-bar', script_base_path + 'lib-b.js');
            define.remote('my-resource-1.0.0', script_base_path + 'my-resource.json', true);

            define('local', ['lib-b-foo'], createResourceInit('local'));

            require(['local', 'my-resource-1.0.0'], function (local, myrsrc) {
                assert.strictEqual(local.name, 'local', 'verify injected \'local\' module');
                assert.strictEqual(myrsrc.name, 'my-resource', 'verify injected \'my-resource\' module');

                var libAInfo = resource.describe('lib-a');
                assert.ok(libAInfo.isResolved, 'lib-a now resolved');

                var libBFoo = resource.describe('lib-b-foo');
                var libBBar = resource.describe('lib-b-bar');
                assert.ok(libBFoo.isDefined, 'lib-b-foo is defined');
                assert.ok(libBFoo.isResolved, 'lib-b-foo is resolved');

                assert.ok(libBBar.isDefined, 'lib-b-bar is defined');
                assert.notOk(libBBar.isResolved, 'lib-b-bar is NOT resolved');

                define.remote('lib-b-baz', script_base_path + 'lib-b.js');

                anonDone();
            });

            require('lib-a', aDone);
            require('lib-b-foo', bDone);
            require('my-resource-1.0.0', jsonDone);
        });
    }

    QUnit.module('Context');

    QUnit.test('Context.create', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        var context = resource.Context.create('my-context');
        var ctxid = context.id;
        assert.throws(function () {
            resource.Context.create('my-context');
        }, /Context 'my-context' is already defined/, 'Redefinition throws exception');

        context2 = resource.Context.create('my-context', true);
        assert.notEqual(context.id, context2.id, 'Overwrite = true overwrites the existing context');

        var parent = resource.Context.create('parent');
        parent.define.external('jquery', 'jQuery');
        assert.ok(parent.is.defined('jquery'), 'jQuery is defined on parent');

        var child = resource.Context.create('child', parent);
        assert.ok(child.is.defined('jquery'), 'jquery is inherited by child');
        child.define('a', {});
        assert.ok(child.is.defined('a'), 'a is defined in child');
        assert.notOk(parent.is.defined('a'), 'a is NOT defined in parent');
    });


    QUnit.module('Validation');

    QUnit.test('Prevent redefinition', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        var def_1 = { name: 'def 1' };
        var def_2 = { name: 'def 2' };

        define('a', def_1);

        assert.strictEqual(resource.get('a'), def_1, 'a module defined');

        define('a', def_2);

        assert.strictEqual(resource.get('a'), def_1, 'a module retains original definition');
        assert.notStrictEqual(resource.get('a'), def_2, 'a module ignores redefinition');
    });

    QUnit.test('Prevent overwriting of existing global variable module', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        var current_globalLib = window.globalLib;

        function redef_globalLib() {
            return { name: 'New Library' };
        }

        define('globalLib', redef_globalLib, true);

        assert.strictEqual(resource.get('globalLib'), current_globalLib, 'globalLib is still global value');
        assert.notStrictEqual(resource.get('globalLib'), redef_globalLib, 'globalLib redefinition ignored');
    });

    QUnit.test('Redefinition throws exception when ignoreRedefine == false', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        resource.reset();

        var def_1 = { name: 'def 1' };
        var def_2 = { name: 'def 2' };

        define('a', def_1);

        assert.strictEqual(resource.get('a'), def_1, 'a module defined');

        resource.config.ignoreRedefine = false;

        assert.throws(function () {
            define('a', def_2);
        }, /Resource 'a' is already defined/, 'Redefinition throws exception');

        resource.config.ignoreRedefine = true;

        assert.strictEqual(resource.get('a'), def_1, 'a module retains original definition');
        assert.notStrictEqual(resource.get('a'), def_2, 'a module ignores redefinition');
    });

    QUnit.test('define arguments', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        assert.throws(function () { define(); }, /define requires at least two arguments/, 'define with no arguments fails');
        assert.throws(function () { define('a'); }, /define requires at least two arguments/, 'define with a single arguments fails');
        assert.throws(function () { define(1, 'a'); }, /resourceID must be a string/, 'First argument must be a string');
        assert.throws(function () { define('b', 'a', {}); }, /dependsOn argument must be an array/, 'Second of three arguments must be an array');
    });

    QUnit.test('define.external arguments', function (assert) {
        /// <param name="assert" type="QUnit.Assert" />
        assert.throws(function () { define.external(); }, /define.external requires at least one argument/, 'define.external with no arguments fails');
        assert.throws(function () { define.external(1); }, /resourceID must be a string/, 'First argument must be a string');
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
        assert.ok(resource.is.defined('foo-1'));
        resource.destroy('foo-1');
        assert.strictEqual(resource.is.defined('foo-1'), false, 'destroy removes the module');
        assert.strictEqual(resource.describe('foo-1'), null, 'destroy removes module info');

        // Can redefine
        define('foo-1', { name: 'foo-1' });
    });
})(root);