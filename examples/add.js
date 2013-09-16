var ll = require("../ll.js");
var p = ll.Factory;

/** Create a simple grammar for parsing addition. Equivalent EBNF is:
value := number
add := value ('+' value)*
**/
var grammar = new ll.Grammar();
grammar.addRule('value', p.number());
grammar.addRule('add', p.sequence(
	p.other('value'), 
	p.kleene(
		p.sequence(
			p.keyword('+'), 
			p.other('value')
		).op(function(stack, cb) {
			var a = stack.pop();
			var b = stack.pop();
			stack.push(a+b);
			return cb();
		})
	)
), true);

// Create a reader using a simple test string and parse it
var reader = new ll.Reader("13+37+38");
var script = [];
grammar.parse(reader, script, function(ok) {
	// The parser has generated an array with all functions to be called in order
	console.log(script);

	var stack = [];
	
	// Execute the functions asynchronously
	function step() {
		var f = script.shift();
		if(f) {
			f(stack, step);
		}
		else {
			console.log('evaluation ended: ', stack);
		}
	}

	step(script);
});

