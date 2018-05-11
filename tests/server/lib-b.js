var require = window.resource.require;

define('lib-b-root', {});

define('lib-b-foo', ['lib-b-root'], function () {
    var libb = require('lib-b-root');

    var foo = libb.foo = {};

    function doFoo() {
        console.log('Executing doFoo in libb.foo module');
    };


    foo.doFoo = doFoo;

    return foo;
});

define('lib-b-bar', ['lib-b-root'], function () {
    var libb = require('lib-b-root');

    var bar = libb.bar = {};

    function doBar() {
        console.log('Executing doBar in libb.bar module');
    };

    bar.doBar = doBar;

    return bar;
});

define('lib-b-baz', ['lib-b-root'], function () {
    var libb = require('lib-b-root');

    var baz = libb.baz = {};

    function doBaz() {
        console.log('Executing doBaz in libb.baz module');
    };

    baz.doBaz = doBaz;

    return baz;
});