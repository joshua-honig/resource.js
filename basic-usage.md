> resource.js is a lightweight, flexible dependency loader for JavaScript. It loads scripts, json, object references, or anything else in the right order. That's it! The API was designed to be obvious, and is focused on working directly with plain JavaScript or other assets. Unlike other JavaScript module loaders, there are no constraints whatsoever about the format of files, the type of the resource, or the file layout of a project. 
>
> See the [wiki for complete docs](https://github.com/joshua-honig/resource.js/wiki)!

resource.js exports global `define` and `require` functions which work similar to the AMD spec, except that module IDs are required for `define` and referenced module ids are treated as literal identifiers, not paths.

  - [`define`](#define) ([*full docs*](https://github.com/joshua-honig/resource.js/wiki/define))
  - [`define.external`](#defineexternal) ([*full docs*](https://github.com/joshua-honig/resource.js/wiki/define#defineexternal))
  - [`define.remote`](#defineremote) ([*full docs*](https://github.com/joshua-honig/resource.js/wiki/define#defineremote))
  - [`require`](#require) ([*full docs*](https://github.com/joshua-honig/resource.js/wiki/require))
  - [`resource.destroy`](#resourcedestroy) ([*full docs*](https://github.com/joshua-honig/resource.js/wiki/Context#destroy))

### `define`
Associate a string identifier with a factory function or literal value

```javascript
// typical factory function definition with no dependencies
define('string-utils', function() { 
    return { pad: function(str, width, padChar) { ... } } 
});

// typical factory function with dependencies
define('app-user-form', ['jquery', 'app-constants', 'app-form-base'], 
    function($, constants, FormBase) {
        function UserForm() { ... }
        return UserForm;
    }
);

// defining a resource that is a literal object
define('setup-data', { ... json blob ... });

// defining a resource that is a function itself (not a factory function)
define('cool-func', function() { ... }, true);
```

### `define.external`
Identify an externally define resource

```javascript
// This will automatically keep checking for window.moment until it is defined:
define.external('moment');

// This will do the same for window.jQuery. resource.js will check for the 
// global variable 'jQuery' (capital 'Q') but will register it as 'jquery' 
// within the resource.js dependency registry
define.external('jquery', 'jQuery');
```
### `define.remote`
Declare a url from which a resource can be lazy-loaded

```javascript
// In manifest-dev.js:
define.remote('app-user-form', '/js/admin/app-user-form.js');
define.remote('app-roles-form', '/js/admin/app-roles-form.js');
define.remote('app-group-form', '/js/admin/app-group-form.js'); 

// In manifest-prod.js
// It's ok to use the same url for multiple resources
const adminBundleUrl = '/dist/js/adminForms.js';
define.remote('app-user-form', adminBundleUrl);
define.remote('app-roles-form', adminBundleUrl);
define.remote('app-group-form', adminBundleUrl); 

// ... But it's more convenient to use array syntax for this
define.remote(['app-user-form', 'app-roles-form', 'app-group-form'], adminBundleUrl);
```
### `require`
Execute an action when all dependencies are resolved, or retrieve a resource by id

```javascript
// Retrieve a resource by id. Does not guarantee the resource is defined or resolved
const $ = require('jquery');

// An anonymous function to be invoke when all dependencies are resolved
require(['jquery', 'app-user-form'], function($, UserForm) {
    new UserForm($('#user-form'));
});

// If there is only on dependency, it can be provided as a bare string
require('all-the-things', function(things) {
    things.doStuff();
});
```

### `resource.destroy`
Remove resource from internal registry

```javascript
// Generated on the server with an injected guid:
const widget_id  = 3023;
const component_guid = '8d5b00b3db9043bd87bb952ccb2f3c29';
const history_rsrc = 'widget-history-' + component_guid; 

define.remote(history_rsrc, '/widget/history/' + widget_id, true); 

require([history_rsrc, 'jquery', 'widget-forms'], function(history) {
        const $ = require('jquery'); 
        const WidgetForm = require('app-widget-form');
        new WidgetForm($('#div-' + component_guid), component_guid, history);
    }
);

// In widget.dispose:
function dispose() {
    resource.destroy('widget-history-' + this.guid); 
}
```
