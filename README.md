# resource.js
resource.js is a lightweight, flexible dependency loader for JavaScript. It loads "things" -- scripts, json, object references, or anything else -- in the right order. That's it! 

The API was designed to be obvious, and is focused on working directly with plain JavaScript or other assets. Unlike other JavaScript module loaders, there are no constraints whatsoever about the format of files, the type of the resource, or the file layout of a project. 

resource.js supports lazy loading from remote (AJAX) sources, but does not include an AJAX loader itself. resource.js supports both jQuery and axios, and will automatically detect either from a global variable. Alternatively, jQuery or axios can be injected explicitly with the `resource.config.useJQuery()` or `resource.config.useAxios()` methods, respectively. 

## What it is
resource.js is a dependency loader. You `define` and `require` resources; resource.js ensures they are loaded in the correct order.

## What it is not
resource.js is **not** an Asynchronous Module Definition loader; at least it does not implement the full [AMD spec](https://github.com/amdjs/amdjs-api/wiki/AMD). Specifically, resource.js does not support path-based references, or any source code modification.
 
## resource != file
resource.js is completely decoupled from the file system. resource.js requires no bundler; and at the same time bundling simply by concatenation just works. As noted above, resource.js does not modify source files or support path-based references. This requires that all `define` calls include an explicit resource id, all dependencies must be listed explicitly (they will not be hoisted CommonJS-style), and all dependency identifiers must be bare and globally unique. 

## resource != JavaScript module
Although resource.js can be used to define JavaScript modules, a resource can be any valid value referencable from JavaScript. 

# Quick Docs

 - [Basic usage](#basic-usage)
   - [`define`](#define)
     - [JavaScript modules via factory functions](#javascript-modules-via-factory-functions)
     - [Literal values](#literal-values)
   - [`require`](#require)
     - [Execute an action](#schedule-an-anonymous-function-to-be-invoked-when-all-dependencies-are-resolved)
     - [Retrieve a resource](#retrieve-an-already-resolved-resource)
   - [`define.external`](defineexternal)
   - [`define.remote`](#defineremote)
 - [Configuration](#configuration)
 - [Cleanup](#cleanup)
   - [`resource.destroy`](#resourcedestroy)
   - [`Context.create`](#contextcreate)
   - [`Context.destroy`](#contextdestroy)

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

## `define.remote`

define.remote allows you to declare a url from which a named resource should be loaded when it is required. Multiple resources can be associated with the same url, accommodating bundled scripts. The default usage assumes that the target url is a script file which, when executed, will itself call `define` to concretely define the applicable resources. Alternatively, you can indicate that the url represents a literal content resource (json, html, etc). 

**Note:** the order in which `define.remote` and `define` is called doesn't matter. The only requirement is that `define` and `define.remote` can only be called once each for the same resourceID.

#### Syntax
```typescript
define.remote(resourceID:string, url:string):void
define.remote(resourceIDs:string[], url:string):void 
define.remote(resourceID:string, url:string, isLiteral:boolean):void
```

### Declaring the location of a module
As noted above, resource.js makes a different decision than conformant AMD module loaders when it comes to file paths and lazy loading. In AMD loaders, dependency strings are treated as paths relative to the file in which `require` or `define` is called. This gives you path-based lazy-loading of script files for free, but requires that all of your modules know where they are on disk relative to each other, and also precludes bundling unless you introduce a transpiling JavaScript build step. 

resource.js makes no assumptions about the file structure of your modules or other resources. The cost of this is that lazy loading requires you to explicitly declare the location of resources. In practice, all of these declarations can go in a single manifest script. Further, you will generally have one version of the manifest script for dev, where most script modules are in their own files, and another for prod, where script modules are consolidated into a small number of bundle files.

```javascript
// In manifest-dev.js:
define.remote('app-user-form', '/js/admin/app-user-form.js');
define.remote('app-roles-form', '/js/admin/app-roles-form.js');
define.remote('app-group-form', '/js/admin/app-group-form.js');
define.remote('app-user-audit', '/js/admin/app-user-form.js');

// In manifest-prod.js
// It's ok to use the same url for multiple resources
const adminBundleUrl = '/dist/js/adminForms.js';
define.remote('app-user-form', adminBundleUrl);
define.remote('app-roles-form', adminBundleUrl);
define.remote('app-group-form', adminBundleUrl);
define.remote('app-user-audit', adminBundleUrl);

// ... But it's more convenient to use array syntax for this
define.remote(['app-user-form', 'app-roles-form', 'app-group-form', 'app-user-audit'], adminBundleUrl);
```

### Declaring content resources
define.remote can also be used to succinctly define content resources. This is useful for declaring expensive or dynamic data that only needs to be loaded in certain situations (such as going to a certain route in a single page application), and simplifies the logic for fetching such resources compared to more complex chains of `Promises`s or other callback strategies.

```javascript
// Compiled data blobs for building walkthrough
define.remote('asset-hq-building', '/models/compiledAsset?modelId=hq-building', true);
define.remote('asset-hq-hvac', '/models/compiledAsset?modelId=hq-hvac', true);
define.remote('asset-hq-wan', '/models/compiledAsset?modelId=hq-wan', true);
 
// If user loads the building viewer, load the assets
function openBuildingViewer(mode) {
    ... /* other stuff */
    viewer.init();
    require('asset-hq-building', function(asset) { viewer.load(asset) }); 
    
    switch(mode) {
        case 'hvac':
            require('asset-hq-hvac', function(asset) { viewer.load(asset) }); 
            break;
            
        case 'wan':
            require('asset-hq-wan', function(asset) { viewer.load(asset) }); 
            break;
    }
}
```

# Configuration



# Cleanup

AMD loaders don't really have a concept of disposing of a module, because in a narrow understanding of resource as *only* JavaScript modules it doesn't make much sense. The expense is generally in the GET request to fetch the script file and then in executing the definition itself. Neither of these can be undone. 

resource.js is intentionally built to manage any kind of resource, and sometimes the expense of a data resource is in the memory it occupies, and we want to release that memory when the resource is no longer needed in the lifetime of a page. resource.js provides two mechanisms to accomodate this: `resource.destroy` to release a single named resource, and the concept of `Context`s to manage and release whole related collections of resources.

## `resource.destroy`

resource.destroy is very simple: It simply removes the provided resource id from the resource.js registry. This does not guarantee the resource can be garbage collected, nor does it "undefine" the value of the resource already injected into other contexts. This is most useful when cleaning up strongly-named resources associated with a chunk of a single page application or other long-lived page.

#### Syntax

```TypeScript
resource.destroy(resourceID:string):void
```

### Example
```javascript
// Generated on the server with an injected guid:
const widget_id  = 3023;
const component_guid = '8d5b00b3db9043bd87bb952ccb2f3c29';
const history_rsrc = 'widget-history-' + component_guid;
const relations_rsrc = 'widget-relations-' + component_guid;
const graph_rsrc = 'widghet-graph-' + component_guid;

// Fetch these json blobs in parallel:
define.remote(history_rsrc, '/widget/history/' + widget_id, true);
define.remote(relations_rsrc, '/widget/relations/' + widget_id, true);
define.remote(graph_rsrc, '/widget/graph/' + widget_id, true);

require([history_rsrc, relations_rsrc, graph_rsrc, 'app-utils', 'jquery', 'app-forms', 'widget-forms'], 
    function(history, relations, graph) {
        let $ = require('jquery');
        let $form = $('#div-' + component_guid);
        let widgetForm = require('app-widget-form');
        new widgetForm($form, component_guid, history, relations, graph);
    }
);

// In widget.dispose:
function dispose() {
    resource.destroy('widget-history-' + this.guid);
    resource.destroy('widget-relations-' + this.guid);
    resource.destroy('widget-graph-' + this.guid);
}
```
 
