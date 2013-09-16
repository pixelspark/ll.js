"use strict";

/** Create a subclass of a particular parent class. Use as follows:
function Parent() {
	this.parentProperty = 123;
}

var Child = Class.create(Parent, function() {
	this.childProperty = 123;
}).extend({
	toString: function() {
		return "child" + this.childProperty;
	}
});
**/
exports.create = function(parentConstructor, constructor) {
	if(arguments.length==1) {
		constructor = arguments[0];
	}
	else if(arguments.length==2) {
		constructor.prototype = new parentConstructor();
	}
	
	constructor.extend = function(members) {
		for(var i in members) {
			this.prototype[i] = members[i];
		}
		return this;
	};
	
	return constructor;
};