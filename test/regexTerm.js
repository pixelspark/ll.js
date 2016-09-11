var ll = require("../index");
var p = ll.Factory;

require('should');

describe('Regex term', () => {
    
    var g = new ll.Grammar();
    g.addRule(
        'playingCard', 
        p.regex(/^[AKQJT98765432][SHDC]/, 'KH'),
        true);
    
    it('should parse true', done => {
        var reader = new ll.Reader("TH");
        var script = [];
        g.parse(reader, script, function(ok) {
            ok.should.equal(true);
            done();
        });
    });
    
    it('should parse false', done => {
        var reader = new ll.Reader("10H");
        var script = [];
        g.parse(reader, script, function(ok) {
            ok.should.equal(false);
            done();
        });
    });

    it('should push the matched string', done => {
        var reader = new ll.Reader("2C");
        var script = [];
        g.parse(reader, script, function(ok) {
            var stack = [];
            function step() {
                var f = script.shift();
                if(f) {
                    f(stack, step);
                } else {
                    stack.length.should.equal(1);
                    stack.pop().should.equal('2C');
                    done();
                }
            }
            step(script);
        });
    });
    
    it('should dump all properties', done => {
        g.dump((e, dump) => {
            dump.should.have.property('playingCard');
            var rule = dump.playingCard;
            rule.should.have.property('regex');
            rule.should.have.property('example')
            done();
        }); 
    });
    
    it('should have an example', done => {
        g.example((e,s) => {
            s.should.equal('KH');
            done();
        });
    });

});