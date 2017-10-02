﻿window.util = (function () {

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

    function _toArray(source) {
        var result = [];
        for (var p in source) {
            result.push(source[p]);
        }
        return result;
    }

    function clearGlobal(name) {
        if (window.hasOwnProperty(name)) {
            delete window[name];
        }
    }

    function select(source, propName) {
        var result = [];
        for (var k in source) {
            result.push(source[k][propName]);
        }
        return result;
    }

    function arrayValues(source) {
        var result = [];
        for (var k in source) {
            k = parseInt(k);
            if (isNaN(k)) continue;
            result.push(source[k]);
        }
        return result;
    }

    function _sameItems(value, expected) {
        /// <summary>Determine if the value array has the same members as the expected, but not necessarily in the same order</summary>

        if (jQuery && (value instanceof jQuery)) {
            value = value.toArray();
        } else if (!_isArray(value)) {
            throw new Error('value must be an Array');
        }

        if (jQuery && (expected instanceof jQuery)) {
            expected = expected.toArray();
        } else if (!_isArray(expected)) {
            throw new Error('expected must be an Array');
        }

        // Normalize sparse arrays:
        value = arrayValues(value);
        expected = arrayValues(expected);
         
        if (value.length != expected.length) {
            return false;
        }
         
        var lng = value.length;
        var test = value.concat();

        for (var i = 0; i < lng; i++) {
            var sourceItem = expected[i];
            var valIndex = test.indexOf(sourceItem);
            if (valIndex == -1) {
                return false;
            }
            test.splice(valIndex, 1);
        }

        if (test.length > 0) {
            return false;
        }

        return true;
    };

    return {
        isFunction: _isFunction,
        isArray: _isArray,
        toArray: _toArray,
        clearGlobal: clearGlobal,
        select: select,
        sameItems: _sameItems
    };
})();