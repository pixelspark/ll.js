"use strict";
var Class = require("./class");

var Reader = Class.create(function(tokens) {
	this.tokens = tokens;
	this.index = 0;
	this.expected = null;
	this.expectedTerm = null;
});

Reader.extend({
	next: function() {
		if(this.index < this.tokens.length) {
			return this.tokens[this.index];
		}
		return null;
	},
	
	consumed: function() {
		return this.tokens.substr(0, this.index);
	},
	
	end: function() {
		return this.index >= this.tokens.length;
	},
	
	nextMatching: function(pattern, term) {
		if(pattern instanceof RegExp) {
			var match = this.rest().match(pattern);
			if(match) {
				return match;
			}
			return null;
		}
		else if(pattern.length>0) {
			if(this.tokens.substr(this.index, pattern.length).toLowerCase()==pattern.toLowerCase()) {
				return pattern;
			}
		}
		
		this.expectedTerm = term;
		this.expected = pattern;
		return '';
	},
	
	consume: function(token) {
		if(token) {
			this.index += token.length;
		}
		else {
			this.index++;
		}
		
		// after each consume, also consume whitespace
		var whiteSpace = this.nextMatching(/^[\ \r\n\t]*/);
		if(whiteSpace) {
			this.index += whiteSpace[0].length;
		}
	},
	
	rest: function() {
		return this.tokens.substr(this.index);
	},
	
	save: function() {
		return {index: this.index};
	},
	
	restore: function(state) {
		this.index = state.index;
	}
});

module.exports = Reader;