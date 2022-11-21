define("ace/mode/thml_highlight_rules",["require","exports","module","ace/lib/oop","ace/mode/text_highlight_rules"], function(require, exports, module) {
    "use strict";

    var oop = require("../lib/oop");
    var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;

    var ThmlHighlightRules = function() {
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
                    token: "delay", regex: /\b[0-9]+\b/
                },
                {
                    token: "comment", regex: /\*[^\n]*/
                }
            ]
        };
    };

    oop.inherits(ThmlHighlightRules, TextHighlightRules);

    exports.ThmlHighlightRules = ThmlHighlightRules;

});

define("ace/mode/thml",["require","exports","module","ace/lib/oop","ace/mode/text","ace/tokenizer","ace/worker/worker_client","ace/mode/thml_highlight_rules"], function(require, exports, module) {
    "use strict";

    var oop = require("../lib/oop");
    var TextMode = require("./text").Mode;
    var Tokenizer = require("../tokenizer").Tokenizer;
    var WorkerClient = require("../worker/worker_client").WorkerClient;
    var ThmlHighlightRules = require("./thml_highlight_rules").ThmlHighlightRules;

    var Mode = function() {
        this.HighlightRules = ThmlHighlightRules;
    };
    oop.inherits(Mode, TextMode);

    (function() {
        this.lineCommentStart = "*";

        this.createWorker = function(session) {
            var worker = new WorkerClient(["ace"], "ace/mode/thml_worker", "ThmlWorker");
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
