/// <reference path="resource.js" /> 

var __create = resource.Context.create;

// Wrap Context.create so that new contexts are also annotated 
resource.Context.create = function () {
    var _context = __create.apply(null, arguments);
    _annotate_context(_context);
    return _context;
};

intellisense.annotate(resource.Context, function () {
    /// <summary>The instance class of the resource loader. [window/global].resource is an instance. Additional named contexts can be created through resource.Context.create()</summary>
});

/* Context static methods */
intellisense.annotate(resource.Context, {
    'create': function (name, force) {
        /// <signature>
        ///   <summary>Create a named resource context</summary>
        ///   <param name="name" type="String">The name of the context</param>
        ///   <param name="force" type="Boolean" optional="true">Default false. Whether to overwrite an existing named context with the same name.</param>
        ///   <returns type="Context" />
        /// </signature> 
    },
    'get': function (name, create) {
        /// <signature>
        ///   <summary>Retrieve a previously defined named resource context</summary>
        ///   <param name="name" type="String">The name of the context</param>
        ///   <param name="create" type="Boolean" optional="true">Default false. Whether to create the named context if it does not already exist.</param>
        ///   <returns type="Context" />
        /// </signature> 
    },
    'destroy': function (name, recursive, strict) {
        /// <signature>
        ///   <summary>Destroy a previously defined named context</summary>
        ///   <param name="name" type="String">The name of the context</param>
        ///   <param name="recursive" type="Boolean" optional="true">Default true. Whether to call destroy() on each of the context's defined resources</param>
        ///   <param name="strict" type="Boolean" optional="true">Default false. Whether to throw an error if the specified named context does not exist.</param>
        /// </signature> 
    }
});

/* Context instance members */
function _annotate_context(context) {

    // Static properties
    intellisense.annotate(context, {
        /// <field name="version" type="String">The version of the loaded resource.js library</field>
        version: ''
    });

    intellisense.annotate(context, {
        /// <field name="id" type="Number" integer="true">The id of the Context instance</field>
        id: 0,

        /// <field name="name" type="String">The name of the Context instance</field> 
        name: '',

        /// <field name="config" type="Object">Configuration properties for the Context instance</field>
        config: null,

        /// <field name="internals" type="Object">Read-only view of Context instance state</field>
        internals: null
    });

    intellisense.annotate(context.config, {
        /// <field name="ajaxProvider" type="String">The name of the currently loaded ajaxProvider ('axios', 'jquery', or null)</field>
        ajaxProvider: null,

        /// <field name="debug" type="Boolean">Whether to print debugging messages during resource resolution</field>
        debug: false,

        /// <field name="ignoreRedefine" type="Boolean">Whether to ignore attempts to redefine the same resource key. If false, redefintion will throw an error</field>
        ignoreRedefine: true,

        /// <field name="immediateResolve" type="Boolean">Whether to immediate resolve named resources create with define(). If false, resources will only be resolved when a call to require()
        /// directly or indirectly names the resource as a dependency</field>
        immediateResolve: false,

        /// <field name="external" type="Object">Configuration properties for resolution of external resources</field>
        external: {},

        useAxios: function () {
            /// <signature>
            ///   <summary>Explicitly specify axios as the ajax provider</summary>
            ///   <param name="axios" type="Object" optional="true">The root axios object. If omitted, window.axios is used</param> 
            /// </signature> 
        },

        useJQuery: function () {
            /// <signature>
            ///   <summary>Explicitly specify jQuery as the ajax provider</summary>
            ///   <param name="jQuery" type="Object" optional="true">The root jQuery object. If omitted, window.jQuery is used</param> 
            /// </signature> 
        }
    });

    intellisense.annotate(context.config.external, {
        /// <field name="autoResolve" type="Boolean">Whether or not to automatically use matching global variable name as resolved resources</field>
        autoResolve: false,

        /// <field name="interval" type="Number">Interval in milliseconds between automatic checks for resolved external resources</field>
        interval: 100,

        /// <field name="timeout" type="Number">Timeout in milliseconds for automatic checking for resolved external resources</field>
        timeout: 10000
    });

    intellisense.annotate(context.internals, {
        /// <field name="anonymousIndex" type="Number" integer="true">The current index of anonymous functions created through calls to require()</field>
        anonymousIndex: false,

        /// <field name="externalPending" type="Boolean">Whether or not the external resource resolver is actively checking for unresolved external resources</field>
        externalPending: false,

        /// <field name="key" type="String">The full name of the window property to which the current resource library instance is assigned</field>
        key: ''
    });

    intellisense.annotate(context, {
        'define': function () {
            /// <signature>
            ///   <summary>Define a new resource without any dependencies</summary>
            ///   <param name="resourceID" type="String">The unique key or name of the resource</param>
            ///   <param name="definition" type="*">A plain object or function that defines the resource</param>
            ///   <param name="isLiteral" type="Boolean" optional="true">If definition is a function and literal is true, 
            ///   the definition will be used as the resource itself, rather than being invoked to obtain the resource</param>
            /// </signature> 
            /// <signature>
            ///   <summary>Define a new resource with one or more dependencies</summary>
            ///   <param name="resourceID" type="String">The unique key or name of the resource</param>
            ///   <param name="dependsOn" type="Array" elementType="String">A list of resource names on which this resource depends</param>
            ///   <param name="definition" type="*">A plain object or function that defines the resource</param>
            ///   <param name="isLiteral" type="Boolean" optional="true">If definition is a function and literal is true, 
            ///   the definition will be used as the resource itself, rather than being invoked to obtain the resource</param>
            /// </signature>
        },
        'require': function () {
            /// <signature>
            ///   <summary>Gets the value of a named resource. Returns null if the resource has not been defined or resolved</summary>
            ///   <param name="resourceID" type="String" /> 
            /// </signature> 
            /// <signature>
            ///   <summary>Execute a function that depends on one or more named resources</summary> 
            ///   <param name="dependsOn" type="Array" elementType="String">A list of resource names on which this function depends</param>
            ///   <param name="definition" type="Function">A function to execute when all required resources have been resolved</param> 
            /// </signature> 
            /// <signature>
            ///   <summary>Execute an instance method that depends on one or more named resources</summary> 
            ///   <param name="dependsOn" type="Array" elementType="String">A list of resource names on which this method depends</param>
            ///   <param name="thisArg" type="*">The thisArg to use when applying the method</param>
            ///   <param name="definition" type="Function">A function to execute when all required resources have been resolved</param> 
            /// </signature> 
        },
        'destroy': function () {
            /// <signature>
            ///   <summary>Destroy a named resource by deleting the internal reference to it and calling its destructor (~ method) if defined</summary>
            ///   <param name="resourceID" type="String" />  
            /// </signature>
        },
        'resolve': function () {
            /// <signature>
            ///   <summary>Attempt to resolve all unresolved resources</summary>  
            /// </signature> 
            /// <signature>
            ///   <summary>Attempt to resolve a resource by name</summary> 
            ///   <param name="resourceID" type="String">The unique key or name of the resource</param> 
            ///   <returns type="Boolean" />
            /// </signature>  
        },
        'get': function () {
            /// <signature>
            ///   <summary>Gets the value of a named resource. Returns null if the resource has not been defined or resolved</summary>
            ///   <param name="resourceID" type="String" /> 
            /// </signature> 
        },
        'describe': function () {
            /// <signature>
            ///   <summary>Gets a copy of externally visible information about a resource. Returns null if the resource has never been defined or referenced.</summary>
            ///   <param name="resourceID" type="String" /> 
            /// </signature>
        },
        'list': function () {

        },
        'printUnresolved': function () {
            /// <signature>
            ///   <summary>Print a formatted list of any undefined resources, unresolved resources, and unresolved actions to the console</summary>
            /// </signature>
            /// <signature>
            ///   <summary>Generate a formatted list of any undefined resources, unresolved resources, and unresolved actions and return it as text or print it to the console</summary>
            ///   <param name="returnText" type="Boolean" optional="true">Default false. Wether to return the text of the messages instead of printing it to the console</param>
            /// </signature>
        }
    });

    intellisense.annotate(context.define, {
        'external': function () {
            /// <signature>
            ///   <summary>Define an external resource reference based on the name of a global variable</summary>
            ///   <param name="resourceID" type="String">The unique key or name of the resource</param> 
            ///   <param name="variableName" type="String" optional="true">The global variable name. If ommitted, resourceID is used</param> 
            /// </signature>  
            /// <signature>
            ///   <summary>Define an external resource reference based on a source function. If the source function returns null or 
            ///   throws an error, resource will continue checking per the define.external.interval and define.external.timeout properties</summary>
            ///   <param name="resourceID" type="String">The unique key or name of the resource</param> 
            ///   <param name="source" type="Function">A function which returns the value of the external resource. Function should return null or
            ///   throw an error if the external resource is not yet available.</param> 
            /// </signature>  
            /// <signature>
            ///   <summary>Define an external resource reference based on a source function and test function. If the test function returns false,
            ///   resource will continue checking per the define.external.interval and define.external.timeout properties</summary>
            ///   <param name="resourceID" type="String">The unique key or name of the resource</param> 
            ///   <param name="source" type="Function">A function which returns the value of the external resource</param> 
            ///   <param name="test" type="Function">A function which returns true if the external resource is available or false if it is not</param> 
            /// </signature>  
        },
        'remote': function () {
            /// <signature>
            ///   <summary>Register the remote source of a lazy-loaded resource</summary>
            ///   <param name="resourceID" type="String">The unique key or name of the resource</param>
            ///   <param name="url" type="String">The URL to a script file that, when executed, defines the named resource</param> 
            /// </signature> 
            /// <signature>
            ///   <summary>Register the remote source of a lazy-loaded resource</summary>
            ///   <param name="resourceIDs" type="Array" elementType="String">An array of resource IDs</param>
            ///   <param name="url" type="String">The URL to a script file that, when executed, defines the named resource</param> 
            /// </signature> 
            /// <signature>
            ///   <summary>Register the remote source of a lazy-loaded resource</summary>
            ///   <param name="resourceID" type="String">The unique key or name of the resource</param>
            ///   <param name="url" type="String">The URL to a script file that, when executed, defines the named resource</param> 
            ///   <param name="isLiteral" type="Boolean" optional="true">If true, the parsed object return from the URL (as passed to the jQuery.ajax.success handler) will be used as the resource itself</param>
            /// </signature>
        }
    });

    intellisense.annotate(context.resolve, {
        'external': function () {
        }
    });

    intellisense.annotate(context.is, {
        // <field name="default" type="Boolean">Whether or not this context is the singleton default context</field>
        'default': false,

        'defined': function () {
        },

        'resolved': function () {
        }
    });

    intellisense.annotate(context.list, {
        'all': function () {
        },
        'resolved': function () {
        },
        'unresolved': function () {
        },
        'defined': function () {
        },
        'undefined': function () {
        },
        'resources': function () {
        },
        'actions': function () {
        }
    });
}

// Annotate the members on the default window.resource context instance
_annotate_context(resource);


