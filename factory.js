"use strict";
var Class = require("./class");

var Term = Class.create(function() {
});

Term.extend({
	parse: function(reader, script, grammar, callback) {
		return callback();
	},
	
	dump: function(callback) {
		return callback("term of this type cannot be serialized");
	},
	
	extend: function(term) {
		return new OrTerm([this, term]);
	},
	
	example: function(grammar, callback) {
		return callback('??');
	},
	
	op: function(op) {
		return new OpTerm(this, op);
	}
});

var OpTerm = Class.create(Term, function(term, op) {
	this.term = term;
	this.op = op;
});

OpTerm.extend({
	parse: function(reader, script, grammar, callback) {
		var self = this;
		this.term.parse(reader, script, grammar, function(ok) {
			if(ok) {
				script.push(self.op);
			}
			return callback(ok);
		});
	},
	
	example: function(grammar, callback) {
		return this.term.example(grammar, callback);
	},
	
	dump: function(grammar, callback) {
		return this.term.dump(grammar, callback);
	}
});

var OtherTerm = Class.create(Term, function(name) {
	this.name = name;
});

OtherTerm.extend({
	parse: function(reader, script, grammar, callback) {
		var self = this;
		grammar.getRuleByName(this.name, function(err, other) {
			if(err) {
				console.log('could not find rule ', self.name);
				return callback(false);
			}
			return other.parse(reader, script, grammar, callback);
		});
	},
	
	dump: function(grammar, callback) {
		return callback(null, {other: this.name});
	},
	
	example: function(grammar, callback) {
		grammar.getRuleByName(this.name, function(err, other) {
			if(err) return callback(err);
			return other.example(grammar, callback);
		});
	}
});

// Dynamic term is a term whose grammar is determined when it actually is needed
var DynamicTerm = Class.create(Term, function(factory) {
	this.factory = factory;
});

DynamicTerm.extend({
	parse: function(reader, script, grammar, callback) {
		this.factory(function(err, term) {
			if(err) {
				return callback(err);
			}
			
			return term.parse(reader, script, grammar, callback);
		});	
	},
	
	example: function(grammar, callback) {
		this.factory(function(err, term) {
			if(err) {
				return callback(err);
			}
			
			return term.example(grammar, callback);
		});
	},
	
	dump: function(grammar, callback) {
		this.factory(function(err, term) {
			if(err) {
				return callback(err);
			}
			return term.dump(grammar, callback);
		});
	}
});

/** Matches arbitrary decimal numbers **/
var NumberTerm = Class.create(Term, function() {
});

NumberTerm.extend({
	parse: function(reader, script, grammar, callback) {
		var number = reader.nextMatching(/^\-?[0-9]+(\.[0-9]+)?/, this);
		if(number && !isNaN(parseFloat(number[0]))) {
			script.push(function pushNumber(stack, cb) {
				stack.push(parseFloat(number[0]));
				return cb();
			});
			reader.consume(number[0]);
			return callback(true);
		}
		return callback(false);
	},

	dump: function(grammar, callback) {
		return callback(null, {number:true});
	},

	example: function(grammar, callback) {
		return callback(null, Math.round(Math.random()*1000));
	}
});

/** Matches arbitrary, escaped strings between double quotes **/
var StringTerm = Class.create(Term, function() {
});

StringTerm.extend({
	parse: function(reader, script, grammar, callback) {
		var text = reader.nextMatching(/^"((?:[^"\\]|\\.)*)"/, this);
	
		if(text) {
			// unescape
			var str = text[1];
			str = str.replace(/\\\"/,"\"", str);
			str = str.replace(/\\\'/,"'", str);
			str = str.replace(/\\\\/,"\\", str);
			str = str.replace(/\\n/,"\n", str);
			str = str.replace(/\\r/,"\r", str);
			str = str.replace(/\\t/,"\t", str);
			
			script.push(function pushText(stack, cb) {
				stack.push(str);
				return cb();
			});
			reader.consume(text[0]);
			return callback(true);
		}
		return callback(false);
	},
	
	dump: function(grammar, callback) {
		return callback(null, {string:true});
	},
	
	example: function(grammar, callback) {
		return callback(null, '"..."');
	}
});

var KeywordTerm = Class.create(Term, function(keyword, push) {
	this.keyword = keyword;
	this.push = push;
});

KeywordTerm.extend({
	parse: function(reader, script, grammar, callback) {
		var self = this;
		if(reader.nextMatching(this.keyword, this)) {
			reader.consume(this.keyword);
			if(this.push==true) {
				script.push(function pushKeyword(stack, cb) {
					stack.push(self.keyword);
					return cb();
				});
			}
			return callback(true);
		}
		return callback(false);
	},
	
	dump: function(grammar, callback) {
		return callback(null, {keyword: this.keyword});
	},
	
	example: function(grammar, callback) {
		return callback(null, this.keyword);
	}
});

var OptionalTerm = Class.create(Term, function(term) {
	this.term = term;
});

OptionalTerm.extend({
	parse: function(reader, script, grammar, callback) {
		this.term.parse(reader, script, grammar, function(err) {
			return callback(true);
		});
	},
	
	dump: function(grammar, callback) {
		this.term.dump(grammar, function(err, dumped) {
			return callback(null, {optionally: dumped});
		});
	},
	
	example: function(grammar, callback) {
		if(Math.random()>0.5) {
			this.term.example(grammar, function(err, example) {
				return callback(null, example);
			});
		}
		else {
			return callback(null, '');
		}
	}
});

var KleeneTerm = Class.create(Term, function(term) {
	this.term = term;
});

KleeneTerm.extend({
	parse: function(reader, script, grammar, callback) {
		var self = this;
		
		if(reader.end()) return callback(true);
		this.term.parse(reader, script, grammar, function(ok) {
			if(!ok) {
				return callback(true);
			}
			return self.parse(reader, script, grammar, callback);
		});
	},
	
	dump: function(grammar, callback) {
		this.term.dump(grammar, function(err, dumped) {
			if(err) return callback(err);
			return callback(null, {repeating: dumped});
		});
	},
	
	example: function(grammar, callback) {
		return this.term.example(grammar, callback);
	}
});

var SequenceTerm = Class.create(Term, function(terms) {
	this.terms = terms;
});

SequenceTerm.extend({
	_parseIndex: function(index, reader, script, grammar, callback) {
		if(index >= this.terms.length) {
			return callback(true);
		}
	
		var self = this;
		this.terms[index].parse(reader, script, grammar, function(ok) {
			if(ok) {
				index++;
				return self._parseIndex(index, reader, script, grammar, callback);
			}
			return callback(false);
		});
	},
	
	parse: function(reader, script, grammar, callback) {
		var original = reader.save();
		var scriptlet = [];
		
		this._parseIndex(0, reader, scriptlet, grammar, function(ok) {
			if(!ok) {
				reader.restore(original);
				return callback(false);
			}
			
			// append scriptlet to script
			for(var i=0; i<scriptlet.length; i++) {
				script.push(scriptlet[i]);
			}
			return callback(true);
		});
	},
	
	_dumpIndex: function(index, grammar, dump, callback) {
		var self = this;
		if(index >= this.terms.length) return callback(null);
		
		this.terms[index].dump(grammar, function(err, dumped) {
			if(err) {
				return callback(err);
			}
			dump.push(dumped);
			index++;
			self._dumpIndex(index, grammar, dump, callback);
		});
	},
	
	dump: function(grammar, callback) {
		var dump = [];
		this._dumpIndex(0, grammar, dump, function(err) {
			if(err) {
				return callback(err);
			}
			return callback(null, {sequence:dump});
		});
	},
	
	_exampleIndex: function(index, grammar, example, callback) {
		var self = this;
		
		this.terms[index].example(grammar, function(err, example) {
			if(err) {
				return callback(err);
			}
			
			index++;
			if(index<=self.terms.length) {
				self._exampleIndex(index, grammar, function(err, others) {
					if(err) return callback(err);
					return callback(null, example + " " + others);
				});	
			}
			else {
				return callback(null, example);
			}
		});
	},
	
	example: function(grammar, callback) {
        console.log('seq', this.terms);
        var s = '', space = '';
        for (var i = 0; i < this.terms.length; ++i) {
            this.terms[i].example(grammar, (e,t) => {
                if (e)
                    return callback(e);
                s += space + t;
                space = ' ';
            })
        }
		callback(null, s);
	}
});

var OrTerm = Class.create(Term, function(terms) {
	this.terms = terms ? terms: [];
});

OrTerm.extend({
	_parseIndex: function(index, reader, script, grammar, callback) {
		var self = this;
		if(index >= this.terms.length) return callback(false);
		
		var scriptlet = [];
		this.terms[index].parse(reader, scriptlet, grammar, function(ok) {
			if(ok) {
				// append scriptlet to script
				for(var i=0; i<scriptlet.length; i++) {
					script.push(scriptlet[i]);
				}
				return callback(true);
			}
			else {
				index++;
				return self._parseIndex(index, reader, script, grammar, callback);
			}
		});
	},
	
	parse: function(reader, script, grammar, callback) {
		return this._parseIndex(0, reader, script, grammar, callback);
	},
	
	_dumpIndex: function(index, grammar, dump, callback) {
		var self = this;
		if(index >= this.terms.length) return callback(null);
		
		this.terms[index].dump(grammar, function(err, dumped) {
			if(err) {
				return callback(err);
			}
			dump.push(dumped);
			index++;
			self._dumpIndex(index, grammar, dump, callback);
		});
	},
	
	dump: function(grammar, callback) {
		var terms = [];
		this._dumpIndex(0, grammar, terms, function(err) {
			if(err) return callback(err);
			return callback(null, {either:terms});
		});
	},
	
	example: function(grammar, callback) {
		var idx = Math.floor(Math.random()*this.terms.length);
		return this.terms[idx].example(grammar, callback);
	},
	
	extend: function(term) {
		this.terms.push(term);
		return this;
	}
});

/** The factory function reads JSON-serialized terms to term objects. In addition, several
helper functions are defined on the Factory object that can be used to construct grammar 
rules from code without too much typing. **/
function Factory(dumped) {
	if("other" in dumped) {
		return new OtherTerm(Factory(dumped.other));
	}
	else if("optionally" in dumped) {
		return new OptionalTerm(Factory(dumped.other));
	}
	else if("kleene" in dumped) {
		return new KleeneTerm(Factory(dumped.kleene));
	}
	else if("keyword" in dumped) {
		return new KeywordTerm(dumped.keyword);
	}
	else if("other" in dumped) {
		return new OtherTerm(dumped.other);
	}
	else if("number" in dumped) {
		return new NumberTerm();
	}
	else if("sequence" in dumped) {
		var terms = [];
		for(var i=0; i<dumped.sequence.length; i++) {
			terms.push(Factory(dumped.sequence[i]));
		}
		return new SequenceTerm(terms);
	}
	else if("either" in dumped) {
		var terms = [];
		for(var i=0; i<dumped.either.length; i++) {
			terms.push(Factory(dumped.either[i]));
		}
		return new OrTerm(terms);
	}
	
	
	throw new Error("Unknown term serialization");
};

Factory.other = function(name) {
	return new OtherTerm(name)
};

Factory.optionally = function(term) {
	return new OptionalTerm(term);
};

Factory.either = function() {
	var terms = [];
	for(var i=0; i<arguments.length; i++) {
		terms.push(arguments[i]);
	}

	return new OrTerm(terms);
};

Factory.sequence = function() {
	return new SequenceTerm(arguments);
};

Factory.number = function() {
	return new NumberTerm();
};

Factory.string = function() {
	return new StringTerm();
};

Factory.dynamic = function(factory) {
	return new DynamicTerm(factory);
};

Factory.keywords = function(keywords, push) {
	// keyword list needs to be sorted so that longer keywords appear earlier than shorter ones
	// e.g. match 'trains' before 'train'
	keywords.sort(function(a,b) { return b.length < a.length ? -1 : 1; });
	
	var keywordTerms = [];
	for(var i=0; i<keywords.length; i++) {
		keywordTerms.push(new KeywordTerm(keywords[i], push));
	}
	return new OrTerm(keywordTerms);
}

Factory.keyword = function(keyword, push) {
	return new KeywordTerm(keyword, push);
};

Factory.kleene = function(term) {
	return new KleeneTerm(term);
};

module.exports = Factory;
