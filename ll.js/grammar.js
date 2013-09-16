"use strict";
var Class = require("./class");

var Grammar = Class.create(function() {
	this.rules = {};
	this.root = null;
});

Grammar.extend({
	/** callback = function(ok) **/
	parse: function(reader, script, callback) {
		return this.root.parse(reader, script, this, callback);
	},
	
	addRule: function(name, term, root) {
		if(name in this.rules) {
			// try extending
			this.rules[name] = this.rules[name].extend(term);
			if(root===true) {
				if(this.root) throw new Error("root rule already set!");
				this.root = this.rules[name];
			}
		}
		else {
			this.rules[name] = term;
			if(root===true) {
				if(this.root) throw new Error("root rule already set!");
				this.root = term;
			}
		}
	},
	
	/** callback = function(err, example string) **/
	example: function(callback) {
		return this.root.example(this, callback);
	},
	
	_dumpNext: function(rules, dump, callback) {
		var self = this;
		if(rules.length<1) return callback(null);
		
		var ruleName = rules.pop();
		this.rules[ruleName].dump(this, function(err, dumped) {
			if(err) {
				return callback(err);
			}
			dump[ruleName] = dumped;
			self._dumpNext(rules, dump, callback);
		});
	},
	
	dumpHTML: function(callback) {
		this.dump(function(err, dumped) {
			if(err) return callback("at dump: "+err);
			
			var html = "<ul>";
			
			function ruleToHTML(rule) {
				if('optionally' in rule) {
					ruleToHTML(rule.optionally);
					html += '? ';
				}
				if('repeating' in rule) {
					ruleToHTML(rule.repeating);
					html += '*';
				}
				else if('keyword' in rule) html += '"'+rule.keyword+'"';
				else if('number' in rule) html += '#';
				else if('sequence' in rule) {
					html += "(";
					for(var i=0; i<rule.sequence.length; i++) {
						ruleToHTML(rule.sequence[i]);
						html +=" ";
					}
					html += ")";
				}
				else if('either' in rule) {
					html += "(";
					for(var i=0; i<rule.either.length; i++) {
						ruleToHTML(rule.either[i]);
						if(i<rule.either.length-1) html +=" | ";
					}
					html += ")";
				}
				else if('other' in rule) html += ("<a href='#"+rule.other+"'>" + rule.other + "</a>");
			}
			
			for(var ruleName in dumped) {
				html += "<li><a name='"+ruleName+"'>"+ruleName+"</a> = ";
				ruleToHTML(dumped[ruleName]);
				html += "</li>";
			}
			return callback(null, html + "</ul>");
		});
	},
	
	/** callback = function(err, dumped object) **/
	dump: function(callback) {
		var dump = {};
		var rules = [];
		for(var ruleName in this.rules) {
			rules.push(ruleName);
		}
		this._dumpNext(rules, dump, function(err) {
			if(err) return callback(err);
			return callback(null, dump);
		});
	},
	
	/** callback = function(err, term) **/
	getRuleByName: function(name, callback) {
		return callback((name in this.rules) ? null : 'Rule not found', this.rules[name]);
	}
});

module.exports = Grammar;