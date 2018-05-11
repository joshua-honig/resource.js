let QUnit = require('qunit');
let fs = require('fs');
let path = require('path');
let jquery = require('jquery');
let axios = require('axios');

function assertLoaded(name, value) {
    if(value)
        console.log(name + ' loaded');
    else
        console.warn(name + ' not loaded');
}

assertLoaded('qunit', QUnit);
assertLoaded('jquery', jquery);
assertLoaded('axios', axios);

require('../test-utils');
assertLoaded('test-utils', global.test_utils);

require('../qunit-extensions');
assertLoaded('qunit-extensions', QUnit.assert.isFunction);

var rsrc = require('../../src/resource');

require('../resource-test');