/// <reference path="resource.js" /> 

intellisense.annotate(resource.Context, function () {
    /// <summary>The instance class of the resource loaded. window.resource is an instance. Additional named contexts can be created through resource.Context.create()</summary>
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
        /// <field name="debug" type="Boolean">Whether to print debugging messages during resource resolution</field>
        debug: false,

        /// <field name="ignoreRedefine" type="Boolean">Whether to ignore attempts to redefine the same resource key. If false, redefintion will throw an error</field>
        ignoreRedefine: true,

        /// <field name="immediateResolve" type="Boolean">Whether to immediate resolve named resources create with define(). If false, resources will only be resolved when a call to require()
        /// directly or indirectly names the resource as a dependency</field>
        immediateResolve: false,

        /// <field name="external" type="Object">Configuration properties for resolution of external resources</field>
        external: {},

        /// <field name="jQuery" type="Function">The loaded jQuery instance used by resource for ajax loads of remote (lazy-fetched) resources</field>
        jQuery: null
    });

    intellisense.annotate(context.config.external, {
        /// <field name="autoResolve" type="Boolean">Whether or not to automatically use matching global variable name as resolved resources</field>
        autoResolve: false,

        /// <field name="interval" type="Number">Interval in milliseconds between automatic checks for resolved external resources</field>
        interval: true,

        /// <field name="timeout" type="Number">Timeout in milliseconds for automatic checking for resolved external resources</field>
        timeout: false
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
            ///   <param name="resourceName" type="String">The unique key or name of the resource</param>
            ///   <param name="definition" type="*">A plain object or function that defines the resource</param>
            ///   <param name="isLiteral" type="Boolean" optional="true">If definition is a function and literal is true, 
            ///   the definition will be used as the resource itself, rather than being invoked to obtain the resource</param>
            /// </signature> 
            /// <signature>
            ///   <summary>Define a new resource with one or more dependencies</summary>
            ///   <param name="resourceName" type="String">The unique key or name of the resource</param>
            ///   <param name="dependsOn" type="Array" elementType="String">A list of resource names on which this resource depends</param>
            ///   <param name="definition" type="*">A plain object or function that defines the resource</param>
            ///   <param name="isLiteral" type="Boolean" optional="true">If definition is a function and literal is true, 
            ///   the definition will be used as the resource itself, rather than being invoked to obtain the resource</param>
            /// </signature>
        },
        'require': function () {

        },
        'destroy': function () {

        },
        'resolve': function () {

        },
        'get': function () {

        },
        'describe': function () {

        } 
    });

    intellisense.annotate(context.define, {
        'external': function () { 
        },
        'remote': function () { 
        }  
    });

    intellisense.annotate(context.resolve, {
        'external': function () {
        }  
    });

    intellisense.annotate(context.is, {
        'defined': function () {
        },
        'resolved': function () {
        },
        'external': function () {
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
        'anonymous': function () {
        }
    });
}

// Annotate the members on the default window.resource context instance
_annotate_context(resource);

// Wrap Context.create so that new contexts are also annotated
var __create = resource.Context.create;
resource.Context.create = function (name, force) {
    var _context = __create(name, force);
    _annotate_context(_context);
    return _context;
};

// Redirect "go to definition" so that is goes to the actual definition of Context.create
intellisense.redirectDefinition(resource.Context.create, __create);

