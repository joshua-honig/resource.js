
// basic usage
define('resource', function () { });
define('resource', ['a', 'b'], function (a, b) { });
define('resource', {});
define('resource', myFunc, true);

let rsrc = require('resource');
require('resource', function (rsrc) { });
require(['a', 'b'], function (a, b) { });

define.external('resource');
define.external('resource', 'globalVar');
define.external('resource', fnSource);
define.external('resource', fnSource, fnTest);
 
define.remote('resource', '/dist/js/my-resource.js');
define.remote(['a', 'b', 'c'], '/dist/js/bundle-1.js');
define.remote('data-blob', '/data/blobs/32', true);
 
resource.resolve();
resource.resolve('resource-id'); 

var ctx = resource.Context.create('foo');
