﻿/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: true, newcap: true, noarg: true, undef: true, globalstrict: true*/
/*global test:false, suite:false */
"use strict";
var Q = require('q');
var Qx = require('..');

require("mocha");
require("mocha-as-promised")();
var assert = require("assert");

/**
 * Tests all four invocation styles for a Qx method.
 *
 * @param {Function}	method		The Qx method to test.
 * @param {Function}	arrayFunc	A function that generates a promise of an input array.  This function will be called four times.
 * @param {Function}	callback	The callback to pass to the Qx method.
 * @param {Function}	resultFunc	A function to verify the results of the Qx method.  This function will be called up to four times.
 * @param {Function}	errorFunc	A function to handle errors from the Qx method.  This function will be called up to four times.
 * 
 * @returns {Promise}	A promise for the completion of all four tests.
 */
function testInvocation(method, arrayFunc, callback, resultFunc, errorFunc) {
	if (arrayFunc instanceof Array || Q.isPromise(arrayFunc)) {
		var array = arrayFunc;
		arrayFunc = function () { return array; };
	}

	/**
	 * Turns an array of elements into an array of functions
	 * The functions will call the callback on the elements.
	 */
	function createFunctionArray(arr) {
		return arr.map(function (item, actualIndex) {
			return function (index) {
				assert.strictEqual(actualIndex, index, "Function-array call passed wrong index to callback");
				return callback(item, index);
			};
		});
	}

	return Q.all([
		//method(array, callback)
		method(arrayFunc(), callback).then(resultFunc, errorFunc),

		//method(callback)
		Q.when(arrayFunc()).then(method(callback)).then(resultFunc, errorFunc),

		//method(funcArray)
		method(Q.when(arrayFunc(), createFunctionArray)).then(resultFunc, errorFunc),

		//method()
		Q.when(arrayFunc(), createFunctionArray).then(method).then(resultFunc, errorFunc)
	]);
}


describe('#map()', function () {
	it('should return the result of the callback', function () {
		return testInvocation(
			Qx.map,
			[1, 2, 3, 4],
			function (x) { return x * 2; },
			function (result) {
				assert.deepEqual(result, [2, 4, 6, 8]);
			}
		);
	});

	it("should wait for the array promise", function () {
		return testInvocation(
			Qx.map,
			Q.resolve([1, 2, 3, 4]),
			function (x) { return x * 2; },
			function (result) {
				assert.deepEqual(result, [2, 4, 6, 8]);
			}
		);
	});
	it("should wait for callback promises", function () {
		return testInvocation(
			Qx.map,
			[new Date, "a", "b", "c"],
			function (x, i) { return Q.delay(500).then(function () { return i ? x + i : x; }); },
			function (result) {
				assert((new Date - result[0]) > 500, "map() didn't wait for callback promise");
				assert.deepEqual(result, [result[0], "a1", "b2", "c3"]);
			}
		);
	});
	it("should return the first error if a callback fails", function () {
		return testInvocation(
			Qx.map,
			[1, 2, 3, 4],
			function (x, i) {
				if (i > 2)
					throw "Test error";
				return x * 2;
			},
			function (result) { assert.fail("Failed callback didn't fail result " + result); },
			function (err) { assert.strictEqual(err, "Test error"); }
		);
	});
});