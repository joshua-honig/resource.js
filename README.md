# resource.js
resource.js is a lightweight, flexible dependency loader for JavaScript. It loads "things" -- scripts, json, object references, or anything else -- in the right order. That's it! 

The API was designed to be obvious, and is focused on working directly with plain JavaScript or other assets. Unlike other JavaScript module loaders, there are no constraints whatsoever about the format of files, the type of the resource, or the file layout of a project. 

If lazy remote loading of resources is required, then an external ajax library is required. resource.js supports both jQuery and axios, and will automatically detect either from a global variable. resource.js itself is being loaded in a module loader context, then jQuery or axios can be injected explicitly with the `resource.config.useJQuery()` or `resource.config.useAxios()` method, respectively.

# Basic usage



