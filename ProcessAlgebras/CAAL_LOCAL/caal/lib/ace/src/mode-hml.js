define("ace/mode/hml_highlight_rules",["require","exports","module","ace/lib/oop","ace/mode/text_highlight_rules"], function(require, exports, module) {
    "use strict";

    var oop = require("../lib/oop");
    var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;

    var HmlHighlightRules = function() {
        this.$rules = {
            "start" : [
                {
                    token: "keyword.operator", regex: /[<>\[\]]|or|and|[mM][aA][xX]=|[mM][iI][nN]=/
                },
                {
                    token: "constant", regex: /\bff|tt\b/
                },
                {
                    token: "variable.overline", regex: /'([a-z][a-zA-Z0-9?!_'\-#]*)\b/
                },
                {
                    token: "variable.bold", regex: /\b[A-Z][A-Za-z0-9?!_'\-#]*\b/
                },
                {
                    token: "comment", regex: /\*[^\n]*/
                }
            ]
        };
    };

    oop.inherits(HmlHighlightRules, TextHighlightRules);

    exports.HmlHighlightRules = HmlHighlightRules;

});

define("ace/mode/hml",["require","exports","module","ace/lib/oop","ace/mode/text","ace/tokenizer","ace/worker/worker_client","ace/mode/hml_highlight_rules"], function(require, exports, module) {
    "use strict";

    var oop = require("../lib/oop");
    var TextMode = require("./text").Mode;
    var Tokenizer = require("../tokenizer").Tokenizer;
    var WorkerClient = require("../worker/worker_client").WorkerClient;
    var HmlHighlightRules = require("./hml_highlight_rules").HmlHighlightRules;

    var Mode = function() {
        this.HighlightRules = HmlHighlightRules;
    };
    oop.inherits(Mode, TextMode);

    (function() {
        this.lineCommentStart = "*";

        this.createWorker = function(session) {
            var worker = new WorkerClient(["ace"], "ace/mode/hml_worker", "HmlWorker");
            worker.attachToDocument(session.getDocument());

            worker.on("lint", function(results) {
                session.setAnnotations(results.data);
            });

            worker.on("terminate", function() {
                session.clearAnnotations();
            });

            return worker;
        };
        
    }).call(Mode.prototype);

    exports.Mode = Mode;
});
