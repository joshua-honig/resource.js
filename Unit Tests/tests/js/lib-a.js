/// <reference path="_references.js" /> 

define('lib-a', function () { 
    var liba = {};

    function usefulFunction() {
        console.log('Executing usefulFunction in liba');
    };


    liba.usefulFunction = usefulFunction;

    return liba;
});