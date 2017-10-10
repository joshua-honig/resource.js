/// <reference path="_references.js" />

(function () {

    function pushBool(assert, result, message) {
        assert.pushResult({
            result: result,
            actual: result,
            expected: true,
            message: message
        });
    }

    QUnit.assert.isFunction = function (value, message) {
        /// <summary>Test whether a value is a function</summary>
        pushBool(this, util.isFunction(value), message);
    }

    QUnit.assert.isDefined = function (moduleName, message) {
        /// <summary>Test whether a require module is defined</summary>
        pushBool(this, require.isDefined(moduleName), message);
    };

    QUnit.assert.isResolved = function (moduleName, message) {
        /// <summary>Test whether a require module is resolved</summary>
        pushBool(this, require.isResolved(moduleName), message);
    };

    QUnit.assert.sameItems = function (value, expected, message, itemComparer) {
        /// <summary>Determine if the value array has the same members as the expected, but not necessarily in the same order</summary>
        var sameItems = util.sameItems(value, expected);

        this.pushResult({
            result: sameItems,
            actual: value,
            expected: expected,
            message: message
        });
    };

    QUnit.assert.allStrictEqual = function (value, expected, message) {
        /// <summary>Determine if all members in expected are present and the same value in value. IGNORE extra members in value, unlike built-in assert.deepEqual</summary>
        var actual = (expected instanceof Array) ? [] : {};
        var result = util.allMembersEqual(value, expected, actual);

        this.pushResult({
            result: result,
            actual: actual,
            expected: expected,
            message: message
        });
    };

    QUnit.assert.hasMembers = function (object, memberNames, message, strict) {
        /// <summary>Determine if the input object has exactly the named members in memberNames</summary>
        var extraKeys = [], matchedKeys = [], missingKeys = [];

        strict = strict !== false;
        var keys = {};
        for (var k in object) {
            keys[k] = true;
        }

        memberNames.forEach(function (name) {
            if (name in keys) {
                matchedKeys.push(name);
                delete keys[name];
            } else {
                missingKeys.push(name);
            }
        });

        for (k in keys) {
            extraKeys.push(k);
        }

        matchedKeys.sort();
        missingKeys.sort();
        extraKeys.sort();

        this.pushResult({
            result: (missingKeys.length == 0) && (!strict || (extraKeys.length == 0)),
            actual: matchedKeys.concat(extraKeys),
            expected: matchedKeys.concat(missingKeys),
            message: message
        });
    };

    QUnit.assert.rxMatch = function (value, pattern, message) {
        /// <summary>Test whether a value matches given regular expression</summary>
        /// <param name="value" type="String" />
        /// <param name="pattern" type="RegExp" />
        this.pushResult({
            result: pattern.test(value),
            actual: value,
            expected: pattern,
            message: message
        });
    };

})();