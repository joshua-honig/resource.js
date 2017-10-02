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

    QUnit.assert.sameItems = function (value, expected, message) {
        /// <summary>Determine if the value array has the same members as the expected, but not necessarily in the same order</summary>
        var sameItems = util.sameItems(value, expected);

        this.pushResult({
            result: sameItems,
            actual: value,
            expected: expected,
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