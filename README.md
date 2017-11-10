# resource.js
resource.js is a lightweight, flexible dependency loader for JavaScript. It loads "things" -- scripts, json, object references, or anything else -- in the right order. That's it! 

The API was designed to be obvious, and is focused on working directly with plain JavaScript or other assets. Unlike other JavaScript module loaders, there are no constraints whatsoever about the format of files, the type of the resource, or the file layout of a project. 

resource.js supports lazy loading from remote (AJAX) sources, but does not include an AJAX loader itself. resource.js supports both jQuery and axios, and will automatically detect either from a global variable. Alternatively, jQuery or axios can be injected explicitly with the `resource.config.useJQuery()` or `resource.config.useAxios()` methods, respectively. 

## What it is
resource.js is a dependency loader. You `define` and `require` resources; resource.js ensures they are loaded in the correct order.

## What it is not
resource.js is **not** an Asynchronous Module Definition loader; at least it does not implement the full [AMD spec](https://github.com/amdjs/amdjs-api/wiki/AMD). Specifically, resource.js does not support path-based references, or any source code modification.

# Basic usage
resource.js defines global `define` and `require` methods that behave similar to standard [AMD loaders](https://github.com/amdjs/amdjs-api/wiki/AMD) such as [require.js](http://requirejs.org/). 

## `define`
Use `define` to give a string identifier to a resource. Resources can be anything.

#### Syntax
```typescript
define(resourceID:string, factory:Function):void
define(resourceID:string, dependencies:string[], factory:Function):void
define(resourceID:string, value:any):void
define(resourceID:string, value:Function, isLiteral:boolean):void
```
 
### JavaScript modules via factory functions 
JavaScript modules can be defined with factory functions using the same syntax as AMD loaders, with the exception that the module id is **required** and named dependencies will be treated as literal identifiers, not paths:
   
```javascript
// typical factory function definition with no dependencies
define('string-utils', function() { 
    return { pad: function(str, width, padChar) { ... } } 
});

// typical factory function with dependencies
define('app-user-form', ['jquery', 'app-constants', 'app-form-base'], function($, constants, FormBase) {
    function UserForm() { ... }
    return UserForm;
});
```

### Literal values
Unlike AMD loaders, resources can be anything. No plugins or special syntax is required. A literal function can also be defined as a resource (not treated as a factory function) if no depenencies are specified, and the third argument is `true`.

```javascript
// defining a resource that is a literal object
define('setup-data', { ... json blob ... });

// defining a resource that is a function itself (not a factory function)
define('cool-func', function() { ... }, true);
```

## `require`
As in AMD loaders, `require` can be used to define an anonymous action to be invoked when all dependencies are resolved, or to retrieve an already-resolved resource by name

#### Syntax
```typescript
require(resourceID:string):any
require(dependency:string, action:Function):void
require(dependencies:string[], action:Function):void
```

### Schedule an anonymous function to be invoked when all dependencies are resolved
The whole point of defining your resources is to be able to use them without worrying about the load order of dependencies. We do this with `require`:

```javascript
// An anonymous function to be invoke when all dependencies are resolved
require(['jquery', 'app-user-form'], function($, UserForm) {
    new UserForm($('#user-form'));
});

// If there is only on dependency, it can be provided as a bare string
require('all-the-things', function(things) {

});
```

### Retrieve an already resolved resource
At any point in code, you can retrieve a resolved resource by calling `require` with a single string argument. This does not guarantee that the resource has been defined or resolved, but inside a `define` or `require` call, this can be used for a CommonJS-like syntax, so you don't have to meticulously order your dependency names and injected parameters:

```javascript
define(
  'app-user-form',
  // You still have to declare your dependencies
  ['jquery', 'bootstrap', 'app-constants', 'app-form-base', 'jquery-date-picker'],
  function() {
    // But you can retrieve them by name with require:
    let $ = require('jquery');
    let FormBase = require('app-form-base');
    ...
});
```

This also makes it easy to define bundle resources, while still retrieving individual resources as needed:

```javascript
define('all-the-basics', ['jquery', 'bootstrap', 'app-root', 'app-constants', 'app-form-base', 'jquery-date-picker'], function() {
    return require('app-root');
});

define('app-user-form', ['all-the-basics'], function() {
    let $ = require('jquery');
    let FormBase = require('app-form-base');
    ...
});
```

## `define.external`

define.external allows you to register an external library as a named resource even if you're not sure when that library will be loaded. resource.js will keep checking at regular intervals until the resource is available. The interval and timeout of these checks is configurable, but defaults to every 100ms for a maximum of 10 seconds.

#### Syntax
```typescript
define.external(resourceID:string):void
define.external(resourceID:string, string:variableName):void
define.external(resourceID:string, source:Function):void
define.external(resourceID:string, source:Function, test:Function):void
```

### Expecting a global variable
In the simplest case, you know a library will register a global variable:

```javascript
// This works, but requires you to know that moment is already loaded:
define('moment', moment, true);

// This will automatically keep checking for moment until it is defined:
define.external('moment');

// This will do the same for jQuery. resource.js will check for the global variable 'jQuery'
// (capital 'Q') but will register it as 'jquery' within the resource.js dependency registry
define.external('jquery', 'jQuery');
```

### Evaluating an arbitrary expression
You can also provide a source function. resource.js will keep invoking the source function until it successfully returns a non-null value. Errors will be silently swallowed. Alternatively, a separate test function can be provided, and resource.js will keep checking until `test` returns `true`, and then will invoke `source` to actually get the resource.

```javascript
// I know that when jQuery datatables is loaded, then window.jQuery.fn.dataTable will exist
define.external('jquery-datatables', function() { return window.jQuery.fn.dataTable });

// When some weird side effect has occurred, I know the library is loaded, and / or
// I don't like throwing and swallowing a bunch of errors
define.external(
  'ui-monitor', 
  function() { return window.__secretName.instance(); },
  function() { return document.getElementById('__UI_MONITOR') != null; }
};
```

# Notes

## resource != file
resource.js is completely decoupled from the file system. resource.js requires no bundler; and at the same time bundling simply by concatenation just works. As noted above, resource.js does not modify source files or support path-based references. This requires that all `define` calls include an explicit resource id, all dependencies must be listed explicitly (they will not be hoisted CommonJS-style), and all dependency identifiers must be bare and globally unique. 

## resource != JavaScript module
Although resource.js can be used to define JavaScript modules, a resource can be any valid value referencable from JavaScript. 
