# ll.js

Ll.js provides a simple way of parsing about anything using a recursive-descent
algorithm. The grammar to be parsed is written in a friendly DSL (domain specific language) in
JavaScript itself that resembles EBNF. Each parser term can be annotated with a function; when
the final parse tree includes the term, the function is added to a list. This allows for the 
asynchronous execution of parsed scripts.

## Prerequisites

LL.js works in any JavaScript environment that supports CommonJS modules (e.g. Node.js).

## Usage

The following is a simple gramar (in EBNF) for parsing multiple addition:

````
value := number
add := value ('+' value)*
````

The following code parses this grammar with ll.js, and executes the additions:

````javascript
var ll = require("ll.js");

function adder(stack, cb) {
        var a = stack.pop();
        var b = stack.pop();
        stack.push(a+b);
        return cb();
};

var grammar = new ll.Grammar();
grammar.addRule('value', p.number());
grammar.addRule('add', p.sequence(
        p.other('value'),
        p.kleene(
                p.sequence(
                        p.keyword('+'),
                        p.other('value')
                ).op(adder)
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
````

The above outputs:

````javascript
[ [Function: pushNumber],
  [Function: pushNumber],
  [Function adder],
  [Function: pushNumber],
  [Function adder] ]
evaluation ended:  [ 88 ]
````

## Documentation

A parser grammar in ll.js consists of a set of named 'rules'; rules are top-level terms. A term
'matches' when the input at the current position in the stream conforms to the pattern specified.
When a term does not match, the parser backtracks and tries something else. If a term matches, the
associated action is executed. The number and string parsers have associated actions that push the
parsed values to the stack. Other terms can be annotated with an action by calling .op(cb) on them,
with cb being a function that executed the action asynchronously; its signature should be 
(Array stack, Function callback).

Parser grammar can be created in the parser DSL provided by the ll.js 'Term 
factory'. For efficient usage, it is best to create a variable alias for the factory
(e.g. the variable 'p' in the above example). The following built-in term types are available:

* p.sequence(a, b, c): matches when it successfully parses a sequence of a, b and c (in that order)
* p.number(): matches any integer number (that matches the regular expression /^\-?[0-9]+(\.[0-9]+)?/)
* p.string(): matches any escaped string
* p.other('name'): finds the rule with name 'name' in the grammar, and matches if that rule matches
* p.dynamic(factory): calls the factory function as soon as this rule becomes a candidate for parsing. The factory callback then returns the term that is to be matched.
* p.keyword('keyword'): matches the specified 'keyword' string
* p.keywords(['key','keywords']): matches any of the specified keywords (and is smart enough to try the longer ones first)
  p.optionally(t): tries to parse t; whether it matches or not, this term always matches
* p.either(a, b, c): matches when either a, b or c successfully matches. The parser tries terms in the order specified.
* p.kleene(k): matches any number of k 


## Contact
- Tommy van der Vorst
- Twitter: [@tommyvdv](http://twitter.com/tommyvdv)
- Web: [http://pixelspark.nl](http://pixelspark.nl)

## License

### The MIT License
Copyright (c) 2013 [Pixelspark](http://pixelspark.nl)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
