"no use strict";
;(function(window) {
if (typeof window.window != "undefined" && window.document)
    return;
if (window.require && window.define)
    return;

window.console = function() {
    var msgs = Array.prototype.slice.call(arguments, 0);
    postMessage({type: "log", data: msgs});
};
window.console.error =
window.console.warn = 
window.console.log =
window.console.trace = window.console;

window.window = window;
window.ace = window;

window.onerror = function(message, file, line, col, err) {
    postMessage({type: "error", data: {
        message: message,
        data: err.data,
        file: file,
        line: line, 
        col: col,
        stack: err.stack
    }});
};

window.normalizeModule = function(parentId, moduleName) {
    // normalize plugin requires
    if (moduleName.indexOf("!") !== -1) {
        var chunks = moduleName.split("!");
        return window.normalizeModule(parentId, chunks[0]) + "!" + window.normalizeModule(parentId, chunks[1]);
    }
    // normalize relative requires
    if (moduleName.charAt(0) == ".") {
        var base = parentId.split("/").slice(0, -1).join("/");
        moduleName = (base ? base + "/" : "") + moduleName;
        
        while (moduleName.indexOf(".") !== -1 && previous != moduleName) {
            var previous = moduleName;
            moduleName = moduleName.replace(/^\.\//, "").replace(/\/\.\//, "/").replace(/[^\/]+\/\.\.\//, "");
        }
    }
    
    return moduleName;
};

window.require = function require(parentId, id) {
    if (!id) {
        id = parentId;
        parentId = null;
    }
    if (!id.charAt)
        throw new Error("worker.js require() accepts only (parentId, id) as arguments");

    id = window.normalizeModule(parentId, id);

    var module = window.require.modules[id];
    if (module) {
        if (!module.initialized) {
            module.initialized = true;
            module.exports = module.factory().exports;
        }
        return module.exports;
    }
   
    if (!window.require.tlns)
        return console.log("unable to load " + id);
    
    var path = resolveModuleId(id, window.require.tlns);
    if (path.slice(-3) != ".js") path += ".js";
    
    window.require.id = id;
    window.require.modules[id] = {}; // prevent infinite loop on broken modules
    importScripts(path);
    return window.require(parentId, id);
};
function resolveModuleId(id, paths) {
    var testPath = id, tail = "";
    while (testPath) {
        var alias = paths[testPath];
        if (typeof alias == "string") {
            return alias + tail;
        } else if (alias) {
            return  alias.location.replace(/\/*$/, "/") + (tail || alias.main || alias.name);
        } else if (alias === false) {
            return "";
        }
        var i = testPath.lastIndexOf("/");
        if (i === -1) break;
        tail = testPath.substr(i) + tail;
        testPath = testPath.slice(0, i);
    }
    return id;
}
window.require.modules = {};
window.require.tlns = {};

window.define = function(id, deps, factory) {
    if (arguments.length == 2) {
        factory = deps;
        if (typeof id != "string") {
            deps = id;
            id = window.require.id;
        }
    } else if (arguments.length == 1) {
        factory = id;
        deps = [];
        id = window.require.id;
    }
    
    if (typeof factory != "function") {
        window.require.modules[id] = {
            exports: factory,
            initialized: true
        };
        return;
    }

    if (!deps.length)
        // If there is no dependencies, we inject "require", "exports" and
        // "module" as dependencies, to provide CommonJS compatibility.
        deps = ["require", "exports", "module"];

    var req = function(childId) {
        return window.require(id, childId);
    };

    window.require.modules[id] = {
        exports: {},
        factory: function() {
            var module = this;
            var returnExports = factory.apply(this, deps.map(function(dep) {
                switch (dep) {
                    // Because "require", "exports" and "module" aren't actual
                    // dependencies, we must handle them seperately.
                    case "require": return req;
                    case "exports": return module.exports;
                    case "module":  return module;
                    // But for all other dependencies, we can just go ahead and
                    // require them.
                    default:        return req(dep);
                }
            }));
            if (returnExports)
                module.exports = returnExports;
            return module;
        }
    };
};
window.define.amd = {};
require.tlns = {};
window.initBaseUrls  = function initBaseUrls(topLevelNamespaces) {
    for (var i in topLevelNamespaces)
        require.tlns[i] = topLevelNamespaces[i];
};

window.initSender = function initSender() {

    var EventEmitter = window.require("ace/lib/event_emitter").EventEmitter;
    var oop = window.require("ace/lib/oop");
    
    var Sender = function() {};
    
    (function() {
        
        oop.implement(this, EventEmitter);
                
        this.callback = function(data, callbackId) {
            postMessage({
                type: "call",
                id: callbackId,
                data: data
            });
        };
    
        this.emit = function(name, data) {
            postMessage({
                type: "event",
                name: name,
                data: data
            });
        };
        
    }).call(Sender.prototype);
    
    return new Sender();
};

var main = window.main = null;
var sender = window.sender = null;

window.onmessage = function(e) {
    var msg = e.data;
    if (msg.event && sender) {
        sender._signal(msg.event, msg.data);
    }
    else if (msg.command) {
        if (main[msg.command])
            main[msg.command].apply(main, msg.args);
        else if (window[msg.command])
            window[msg.command].apply(window, msg.args);
        else
            throw new Error("Unknown command:" + msg.command);
    }
    else if (msg.init) {
        window.initBaseUrls(msg.tlns);
        require("ace/lib/es5-shim");
        sender = window.sender = window.initSender();
        var clazz = require(msg.module)[msg.classname];
        main = window.main = new clazz(sender);
    }
};
})(this);

define("ace/lib/oop",["require","exports","module"], function(require, exports, module) {
"use strict";

exports.inherits = function(ctor, superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
            value: ctor,
            enumerable: false,
            writable: true,
            configurable: true
        }
    });
};

exports.mixin = function(obj, mixin) {
    for (var key in mixin) {
        obj[key] = mixin[key];
    }
    return obj;
};

exports.implement = function(proto, mixin) {
    exports.mixin(proto, mixin);
};

});

define("ace/range",["require","exports","module"], function(require, exports, module) {
"use strict";
var comparePoints = function(p1, p2) {
    return p1.row - p2.row || p1.column - p2.column;
};
var Range = function(startRow, startColumn, endRow, endColumn) {
    this.start = {
        row: startRow,
        column: startColumn
    };

    this.end = {
        row: endRow,
        column: endColumn
    };
};

(function() {
    this.isEqual = function(range) {
        return this.start.row === range.start.row &&
            this.end.row === range.end.row &&
            this.start.column === range.start.column &&
            this.end.column === range.end.column;
    };
    this.toString = function() {
        return ("Range: [" + this.start.row + "/" + this.start.column +
            "] -> [" + this.end.row + "/" + this.end.column + "]");
    };

    this.contains = function(row, column) {
        return this.compare(row, column) == 0;
    };
    this.compareRange = function(range) {
        var cmp,
            end = range.end,
            start = range.start;

        cmp = this.compare(end.row, end.column);
        if (cmp == 1) {
            cmp = this.compare(start.row, start.column);
            if (cmp == 1) {
                return 2;
            } else if (cmp == 0) {
                return 1;
            } else {
                return 0;
            }
        } else if (cmp == -1) {
            return -2;
        } else {
            cmp = this.compare(start.row, start.column);
            if (cmp == -1) {
                return -1;
            } else if (cmp == 1) {
                return 42;
            } else {
                return 0;
            }
        }
    };
    this.comparePoint = function(p) {
        return this.compare(p.row, p.column);
    };
    this.containsRange = function(range) {
        return this.comparePoint(range.start) == 0 && this.comparePoint(range.end) == 0;
    };
    this.intersects = function(range) {
        var cmp = this.compareRange(range);
        return (cmp == -1 || cmp == 0 || cmp == 1);
    };
    this.isEnd = function(row, column) {
        return this.end.row == row && this.end.column == column;
    };
    this.isStart = function(row, column) {
        return this.start.row == row && this.start.column == column;
    };
    this.setStart = function(row, column) {
        if (typeof row == "object") {
            this.start.column = row.column;
            this.start.row = row.row;
        } else {
            this.start.row = row;
            this.start.column = column;
        }
    };
    this.setEnd = function(row, column) {
        if (typeof row == "object") {
            this.end.column = row.column;
            this.end.row = row.row;
        } else {
            this.end.row = row;
            this.end.column = column;
        }
    };
    this.inside = function(row, column) {
        if (this.compare(row, column) == 0) {
            if (this.isEnd(row, column) || this.isStart(row, column)) {
                return false;
            } else {
                return true;
            }
        }
        return false;
    };
    this.insideStart = function(row, column) {
        if (this.compare(row, column) == 0) {
            if (this.isEnd(row, column)) {
                return false;
            } else {
                return true;
            }
        }
        return false;
    };
    this.insideEnd = function(row, column) {
        if (this.compare(row, column) == 0) {
            if (this.isStart(row, column)) {
                return false;
            } else {
                return true;
            }
        }
        return false;
    };
    this.compare = function(row, column) {
        if (!this.isMultiLine()) {
            if (row === this.start.row) {
                return column < this.start.column ? -1 : (column > this.end.column ? 1 : 0);
            };
        }

        if (row < this.start.row)
            return -1;

        if (row > this.end.row)
            return 1;

        if (this.start.row === row)
            return column >= this.start.column ? 0 : -1;

        if (this.end.row === row)
            return column <= this.end.column ? 0 : 1;

        return 0;
    };
    this.compareStart = function(row, column) {
        if (this.start.row == row && this.start.column == column) {
            return -1;
        } else {
            return this.compare(row, column);
        }
    };
    this.compareEnd = function(row, column) {
        if (this.end.row == row && this.end.column == column) {
            return 1;
        } else {
            return this.compare(row, column);
        }
    };
    this.compareInside = function(row, column) {
        if (this.end.row == row && this.end.column == column) {
            return 1;
        } else if (this.start.row == row && this.start.column == column) {
            return -1;
        } else {
            return this.compare(row, column);
        }
    };
    this.clipRows = function(firstRow, lastRow) {
        if (this.end.row > lastRow)
            var end = {row: lastRow + 1, column: 0};
        else if (this.end.row < firstRow)
            var end = {row: firstRow, column: 0};

        if (this.start.row > lastRow)
            var start = {row: lastRow + 1, column: 0};
        else if (this.start.row < firstRow)
            var start = {row: firstRow, column: 0};

        return Range.fromPoints(start || this.start, end || this.end);
    };
    this.extend = function(row, column) {
        var cmp = this.compare(row, column);

        if (cmp == 0)
            return this;
        else if (cmp == -1)
            var start = {row: row, column: column};
        else
            var end = {row: row, column: column};

        return Range.fromPoints(start || this.start, end || this.end);
    };

    this.isEmpty = function() {
        return (this.start.row === this.end.row && this.start.column === this.end.column);
    };
    this.isMultiLine = function() {
        return (this.start.row !== this.end.row);
    };
    this.clone = function() {
        return Range.fromPoints(this.start, this.end);
    };
    this.collapseRows = function() {
        if (this.end.column == 0)
            return new Range(this.start.row, 0, Math.max(this.start.row, this.end.row-1), 0)
        else
            return new Range(this.start.row, 0, this.end.row, 0)
    };
    this.toScreenRange = function(session) {
        var screenPosStart = session.documentToScreenPosition(this.start);
        var screenPosEnd = session.documentToScreenPosition(this.end);

        return new Range(
            screenPosStart.row, screenPosStart.column,
            screenPosEnd.row, screenPosEnd.column
        );
    };
    this.moveBy = function(row, column) {
        this.start.row += row;
        this.start.column += column;
        this.end.row += row;
        this.end.column += column;
    };

}).call(Range.prototype);
Range.fromPoints = function(start, end) {
    return new Range(start.row, start.column, end.row, end.column);
};
Range.comparePoints = comparePoints;

Range.comparePoints = function(p1, p2) {
    return p1.row - p2.row || p1.column - p2.column;
};


exports.Range = Range;
});

define("ace/apply_delta",["require","exports","module"], function(require, exports, module) {
"use strict";

function throwDeltaError(delta, errorText){
    console.log("Invalid Delta:", delta);
    throw "Invalid Delta: " + errorText;
}

function positionInDocument(docLines, position) {
    return position.row    >= 0 && position.row    <  docLines.length &&
           position.column >= 0 && position.column <= docLines[position.row].length;
}

function validateDelta(docLines, delta) {
    if (delta.action != "insert" && delta.action != "remove")
        throwDeltaError(delta, "delta.action must be 'insert' or 'remove'");
    if (!(delta.lines instanceof Array))
        throwDeltaError(delta, "delta.lines must be an Array");
    if (!delta.start || !delta.end)
       throwDeltaError(delta, "delta.start/end must be an present");
    var start = delta.start;
    if (!positionInDocument(docLines, delta.start))
        throwDeltaError(delta, "delta.start must be contained in document");
    var end = delta.end;
    if (delta.action == "remove" && !positionInDocument(docLines, end))
        throwDeltaError(delta, "delta.end must contained in document for 'remove' actions");
    var numRangeRows = end.row - start.row;
    var numRangeLastLineChars = (end.column - (numRangeRows == 0 ? start.column : 0));
    if (numRangeRows != delta.lines.length - 1 || delta.lines[numRangeRows].length != numRangeLastLineChars)
        throwDeltaError(delta, "delta.range must match delta lines");
}

exports.applyDelta = function(docLines, delta, doNotValidate) {
    
    var row = delta.start.row;
    var startColumn = delta.start.column;
    var line = docLines[row] || "";
    switch (delta.action) {
        case "insert":
            var lines = delta.lines;
            if (lines.length === 1) {
                docLines[row] = line.substring(0, startColumn) + delta.lines[0] + line.substring(startColumn);
            } else {
                var args = [row, 1].concat(delta.lines);
                docLines.splice.apply(docLines, args);
                docLines[row] = line.substring(0, startColumn) + docLines[row];
                docLines[row + delta.lines.length - 1] += line.substring(startColumn);
            }
            break;
        case "remove":
            var endColumn = delta.end.column;
            var endRow = delta.end.row;
            if (row === endRow) {
                docLines[row] = line.substring(0, startColumn) + line.substring(endColumn);
            } else {
                docLines.splice(
                    row, endRow - row + 1,
                    line.substring(0, startColumn) + docLines[endRow].substring(endColumn)
                );
            }
            break;
    }
}
});

define("ace/lib/event_emitter",["require","exports","module"], function(require, exports, module) {
"use strict";

var EventEmitter = {};
var stopPropagation = function() { this.propagationStopped = true; };
var preventDefault = function() { this.defaultPrevented = true; };

EventEmitter._emit =
EventEmitter._dispatchEvent = function(eventName, e) {
    this._eventRegistry || (this._eventRegistry = {});
    this._defaultHandlers || (this._defaultHandlers = {});

    var listeners = this._eventRegistry[eventName] || [];
    var defaultHandler = this._defaultHandlers[eventName];
    if (!listeners.length && !defaultHandler)
        return;

    if (typeof e != "object" || !e)
        e = {};

    if (!e.type)
        e.type = eventName;
    if (!e.stopPropagation)
        e.stopPropagation = stopPropagation;
    if (!e.preventDefault)
        e.preventDefault = preventDefault;

    listeners = listeners.slice();
    for (var i=0; i<listeners.length; i++) {
        listeners[i](e, this);
        if (e.propagationStopped)
            break;
    }
    
    if (defaultHandler && !e.defaultPrevented)
        return defaultHandler(e, this);
};


EventEmitter._signal = function(eventName, e) {
    var listeners = (this._eventRegistry || {})[eventName];
    if (!listeners)
        return;
    listeners = listeners.slice();
    for (var i=0; i<listeners.length; i++)
        listeners[i](e, this);
};

EventEmitter.once = function(eventName, callback) {
    var _self = this;
    callback && this.addEventListener(eventName, function newCallback() {
        _self.removeEventListener(eventName, newCallback);
        callback.apply(null, arguments);
    });
};


EventEmitter.setDefaultHandler = function(eventName, callback) {
    var handlers = this._defaultHandlers
    if (!handlers)
        handlers = this._defaultHandlers = {_disabled_: {}};
    
    if (handlers[eventName]) {
        var old = handlers[eventName];
        var disabled = handlers._disabled_[eventName];
        if (!disabled)
            handlers._disabled_[eventName] = disabled = [];
        disabled.push(old);
        var i = disabled.indexOf(callback);
        if (i != -1) 
            disabled.splice(i, 1);
    }
    handlers[eventName] = callback;
};
EventEmitter.removeDefaultHandler = function(eventName, callback) {
    var handlers = this._defaultHandlers
    if (!handlers)
        return;
    var disabled = handlers._disabled_[eventName];
    
    if (handlers[eventName] == callback) {
        var old = handlers[eventName];
        if (disabled)
            this.setDefaultHandler(eventName, disabled.pop());
    } else if (disabled) {
        var i = disabled.indexOf(callback);
        if (i != -1)
            disabled.splice(i, 1);
    }
};

EventEmitter.on =
EventEmitter.addEventListener = function(eventName, callback, capturing) {
    this._eventRegistry = this._eventRegistry || {};

    var listeners = this._eventRegistry[eventName];
    if (!listeners)
        listeners = this._eventRegistry[eventName] = [];

    if (listeners.indexOf(callback) == -1)
        listeners[capturing ? "unshift" : "push"](callback);
    return callback;
};

EventEmitter.off =
EventEmitter.removeListener =
EventEmitter.removeEventListener = function(eventName, callback) {
    this._eventRegistry = this._eventRegistry || {};

    var listeners = this._eventRegistry[eventName];
    if (!listeners)
        return;

    var index = listeners.indexOf(callback);
    if (index !== -1)
        listeners.splice(index, 1);
};

EventEmitter.removeAllListeners = function(eventName) {
    if (this._eventRegistry) this._eventRegistry[eventName] = [];
};

exports.EventEmitter = EventEmitter;

});

define("ace/anchor",["require","exports","module","ace/lib/oop","ace/lib/event_emitter"], function(require, exports, module) {
"use strict";

var oop = require("./lib/oop");
var EventEmitter = require("./lib/event_emitter").EventEmitter;

var Anchor = exports.Anchor = function(doc, row, column) {
    this.$onChange = this.onChange.bind(this);
    this.attach(doc);
    
    if (typeof column == "undefined")
        this.setPosition(row.row, row.column);
    else
        this.setPosition(row, column);
};

(function() {

    oop.implement(this, EventEmitter);
    this.getPosition = function() {
        return this.$clipPositionToDocument(this.row, this.column);
    };
    this.getDocument = function() {
        return this.document;
    };
    this.$insertRight = false;
    this.onChange = function(delta) {
        if (delta.start.row == delta.end.row && delta.start.row != this.row)
            return;

        if (delta.start.row > this.row)
            return;
            
        var point = $getTransformedPoint(delta, {row: this.row, column: this.column}, this.$insertRight);
        this.setPosition(point.row, point.column, true);
    };
    
    function $pointsInOrder(point1, point2, equalPointsInOrder) {
        var bColIsAfter = equalPointsInOrder ? point1.column <= point2.column : point1.column < point2.column;
        return (point1.row < point2.row) || (point1.row == point2.row && bColIsAfter);
    }
            
    function $getTransformedPoint(delta, point, moveIfEqual) {
        var deltaIsInsert = delta.action == "insert";
        var deltaRowShift = (deltaIsInsert ? 1 : -1) * (delta.end.row    - delta.start.row);
        var deltaColShift = (deltaIsInsert ? 1 : -1) * (delta.end.column - delta.start.column);
        var deltaStart = delta.start;
        var deltaEnd = deltaIsInsert ? deltaStart : delta.end; // Collapse insert range.
        if ($pointsInOrder(point, deltaStart, moveIfEqual)) {
            return {
                row: point.row,
                column: point.column
            };
        }
        if ($pointsInOrder(deltaEnd, point, !moveIfEqual)) {
            return {
                row: point.row + deltaRowShift,
                column: point.column + (point.row == deltaEnd.row ? deltaColShift : 0)
            };
        }
        
        return {
            row: deltaStart.row,
            column: deltaStart.column
        };
    }
    this.setPosition = function(row, column, noClip) {
        var pos;
        if (noClip) {
            pos = {
                row: row,
                column: column
            };
        } else {
            pos = this.$clipPositionToDocument(row, column);
        }

        if (this.row == pos.row && this.column == pos.column)
            return;

        var old = {
            row: this.row,
            column: this.column
        };

        this.row = pos.row;
        this.column = pos.column;
        this._signal("change", {
            old: old,
            value: pos
        });
    };
    this.detach = function() {
        this.document.removeEventListener("change", this.$onChange);
    };
    this.attach = function(doc) {
        this.document = doc || this.document;
        this.document.on("change", this.$onChange);
    };
    this.$clipPositionToDocument = function(row, column) {
        var pos = {};

        if (row >= this.document.getLength()) {
            pos.row = Math.max(0, this.document.getLength() - 1);
            pos.column = this.document.getLine(pos.row).length;
        }
        else if (row < 0) {
            pos.row = 0;
            pos.column = 0;
        }
        else {
            pos.row = row;
            pos.column = Math.min(this.document.getLine(pos.row).length, Math.max(0, column));
        }

        if (column < 0)
            pos.column = 0;

        return pos;
    };

}).call(Anchor.prototype);

});

define("ace/document",["require","exports","module","ace/lib/oop","ace/apply_delta","ace/lib/event_emitter","ace/range","ace/anchor"], function(require, exports, module) {
"use strict";

var oop = require("./lib/oop");
var applyDelta = require("./apply_delta").applyDelta;
var EventEmitter = require("./lib/event_emitter").EventEmitter;
var Range = require("./range").Range;
var Anchor = require("./anchor").Anchor;

var Document = function(textOrLines) {
    this.$lines = [""];
    if (textOrLines.length === 0) {
        this.$lines = [""];
    } else if (Array.isArray(textOrLines)) {
        this.insertMergedLines({row: 0, column: 0}, textOrLines);
    } else {
        this.insert({row: 0, column:0}, textOrLines);
    }
};

(function() {

    oop.implement(this, EventEmitter);
    this.setValue = function(text) {
        var len = this.getLength() - 1;
        this.remove(new Range(0, 0, len, this.getLine(len).length));
        this.insert({row: 0, column: 0}, text);
    };
    this.getValue = function() {
        return this.getAllLines().join(this.getNewLineCharacter());
    };
    this.createAnchor = function(row, column) {
        return new Anchor(this, row, column);
    };
    if ("aaa".split(/a/).length === 0) {
        this.$split = function(text) {
            return text.replace(/\r\n|\r/g, "\n").split("\n");
        };
    } else {
        this.$split = function(text) {
            return text.split(/\r\n|\r|\n/);
        };
    }


    this.$detectNewLine = function(text) {
        var match = text.match(/^.*?(\r\n|\r|\n)/m);
        this.$autoNewLine = match ? match[1] : "\n";
        this._signal("changeNewLineMode");
    };
    this.getNewLineCharacter = function() {
        switch (this.$newLineMode) {
          case "windows":
            return "\r\n";
          case "unix":
            return "\n";
          default:
            return this.$autoNewLine || "\n";
        }
    };

    this.$autoNewLine = "";
    this.$newLineMode = "auto";
    this.setNewLineMode = function(newLineMode) {
        if (this.$newLineMode === newLineMode)
            return;

        this.$newLineMode = newLineMode;
        this._signal("changeNewLineMode");
    };
    this.getNewLineMode = function() {
        return this.$newLineMode;
    };
    this.isNewLine = function(text) {
        return (text == "\r\n" || text == "\r" || text == "\n");
    };
    this.getLine = function(row) {
        return this.$lines[row] || "";
    };
    this.getLines = function(firstRow, lastRow) {
        return this.$lines.slice(firstRow, lastRow + 1);
    };
    this.getAllLines = function() {
        return this.getLines(0, this.getLength());
    };
    this.getLength = function() {
        return this.$lines.length;
    };
    this.getTextRange = function(range) {
        return this.getLinesForRange(range).join(this.getNewLineCharacter());
    };
    this.getLinesForRange = function(range) {
        var lines;
        if (range.start.row === range.end.row) {
            lines = [this.getLine(range.start.row).substring(range.start.column, range.end.column)];
        } else {
            lines = this.getLines(range.start.row, range.end.row);
            lines[0] = (lines[0] || "").substring(range.start.column);
            var l = lines.length - 1;
            if (range.end.row - range.start.row == l)
                lines[l] = lines[l].substring(0, range.end.column);
        }
        return lines;
    };
    this.insertLines = function(row, lines) {
        console.warn("Use of document.insertLines is deprecated. Use the insertFullLines method instead.");
        return this.insertFullLines(row, lines);
    };
    this.removeLines = function(firstRow, lastRow) {
        console.warn("Use of document.removeLines is deprecated. Use the removeFullLines method instead.");
        return this.removeFullLines(firstRow, lastRow);
    };
    this.insertNewLine = function(position) {
        console.warn("Use of document.insertNewLine is deprecated. Use insertMergedLines(position, [\'\', \'\']) instead.");
        return this.insertMergedLines(position, ["", ""]);
    };
    this.insert = function(position, text) {
        if (this.getLength() <= 1)
            this.$detectNewLine(text);
        
        return this.insertMergedLines(position, this.$split(text));
    };
    this.insertInLine = function(position, text) {
        var start = this.clippedPos(position.row, position.column);
        var end = this.pos(position.row, position.column + text.length);
        
        this.applyDelta({
            start: start,
            end: end,
            action: "insert",
            lines: [text]
        }, true);
        
        return this.clonePos(end);
    };
    
    this.clippedPos = function(row, column) {
        var length = this.getLength();
        if (row === undefined) {
            row = length;
        } else if (row < 0) {
            row = 0;
        } else if (row >= length) {
            row = length - 1;
            column = undefined;
        }
        var line = this.getLine(row);
        if (column == undefined)
            column = line.length;
        column = Math.min(Math.max(column, 0), line.length);
        return {row: row, column: column};
    };
    
    this.clonePos = function(pos) {
        return {row: pos.row, column: pos.column};
    };
    
    this.pos = function(row, column) {
        return {row: row, column: column};
    };
    
    this.$clipPosition = function(position) {
        var length = this.getLength();
        if (position.row >= length) {
            position.row = Math.max(0, length - 1);
            position.column = this.getLine(length - 1).length;
        } else {
            position.row = Math.max(0, position.row);
            position.column = Math.min(Math.max(position.column, 0), this.getLine(position.row).length);
        }
        return position;
    };
    this.insertFullLines = function(row, lines) {
        row = Math.min(Math.max(row, 0), this.getLength());
        var column = 0;
        if (row < this.getLength()) {
            lines = lines.concat([""]);
            column = 0;
        } else {
            lines = [""].concat(lines);
            row--;
            column = this.$lines[row].length;
        }
        this.insertMergedLines({row: row, column: column}, lines);
    };    
    this.insertMergedLines = function(position, lines) {
        var start = this.clippedPos(position.row, position.column);
        var end = {
            row: start.row + lines.length - 1,
            column: (lines.length == 1 ? start.column : 0) + lines[lines.length - 1].length
        };
        
        this.applyDelta({
            start: start,
            end: end,
            action: "insert",
            lines: lines
        });
        
        return this.clonePos(end);
    };
    this.remove = function(range) {
        var start = this.clippedPos(range.start.row, range.start.column);
        var end = this.clippedPos(range.end.row, range.end.column);
        this.applyDelta({
            start: start,
            end: end,
            action: "remove",
            lines: this.getLinesForRange({start: start, end: end})
        });
        return this.clonePos(start);
    };
    this.removeInLine = function(row, startColumn, endColumn) {
        var start = this.clippedPos(row, startColumn);
        var end = this.clippedPos(row, endColumn);
        
        this.applyDelta({
            start: start,
            end: end,
            action: "remove",
            lines: this.getLinesForRange({start: start, end: end})
        }, true);
        
        return this.clonePos(start);
    };
    this.removeFullLines = function(firstRow, lastRow) {
        firstRow = Math.min(Math.max(0, firstRow), this.getLength() - 1);
        lastRow  = Math.min(Math.max(0, lastRow ), this.getLength() - 1);
        var deleteFirstNewLine = lastRow == this.getLength() - 1 && firstRow > 0;
        var deleteLastNewLine  = lastRow  < this.getLength() - 1;
        var startRow = ( deleteFirstNewLine ? firstRow - 1                  : firstRow                    );
        var startCol = ( deleteFirstNewLine ? this.getLine(startRow).length : 0                           );
        var endRow   = ( deleteLastNewLine  ? lastRow + 1                   : lastRow                     );
        var endCol   = ( deleteLastNewLine  ? 0                             : this.getLine(endRow).length ); 
        var range = new Range(startRow, startCol, endRow, endCol);
        var deletedLines = this.$lines.slice(firstRow, lastRow + 1);
        
        this.applyDelta({
            start: range.start,
            end: range.end,
            action: "remove",
            lines: this.getLinesForRange(range)
        });
        return deletedLines;
    };
    this.removeNewLine = function(row) {
        if (row < this.getLength() - 1 && row >= 0) {
            this.applyDelta({
                start: this.pos(row, this.getLine(row).length),
                end: this.pos(row + 1, 0),
                action: "remove",
                lines: ["", ""]
            });
        }
    };
    this.replace = function(range, text) {
        if (!range instanceof Range)
            range = Range.fromPoints(range.start, range.end);
        if (text.length === 0 && range.isEmpty())
            return range.start;
        if (text == this.getTextRange(range))
            return range.end;

        this.remove(range);
        var end;
        if (text) {
            end = this.insert(range.start, text);
        }
        else {
            end = range.start;
        }
        
        return end;
    };
    this.applyDeltas = function(deltas) {
        for (var i=0; i<deltas.length; i++) {
            this.applyDelta(deltas[i]);
        }
    };
    this.revertDeltas = function(deltas) {
        for (var i=deltas.length-1; i>=0; i--) {
            this.revertDelta(deltas[i]);
        }
    };
    this.applyDelta = function(delta, doNotValidate) {
        var isInsert = delta.action == "insert";
        if (isInsert ? delta.lines.length <= 1 && !delta.lines[0]
            : !Range.comparePoints(delta.start, delta.end)) {
            return;
        }
        
        if (isInsert && delta.lines.length > 20000)
            this.$splitAndapplyLargeDelta(delta, 20000);
        applyDelta(this.$lines, delta, doNotValidate);
        this._signal("change", delta);
    };
    
    this.$splitAndapplyLargeDelta = function(delta, MAX) {
        var lines = delta.lines;
        var l = lines.length;
        var row = delta.start.row; 
        var column = delta.start.column;
        var from = 0, to = 0;
        do {
            from = to;
            to += MAX - 1;
            var chunk = lines.slice(from, to);
            if (to > l) {
                delta.lines = chunk;
                delta.start.row = row + from;
                delta.start.column = column;
                break;
            }
            chunk.push("");
            this.applyDelta({
                start: this.pos(row + from, column),
                end: this.pos(row + to, column = 0),
                action: delta.action,
                lines: chunk
            }, true);
        } while(true);
    };
    this.revertDelta = function(delta) {
        this.applyDelta({
            start: this.clonePos(delta.start),
            end: this.clonePos(delta.end),
            action: (delta.action == "insert" ? "remove" : "insert"),
            lines: delta.lines.slice()
        });
    };
    this.indexToPosition = function(index, startRow) {
        var lines = this.$lines || this.getAllLines();
        var newlineLength = this.getNewLineCharacter().length;
        for (var i = startRow || 0, l = lines.length; i < l; i++) {
            index -= lines[i].length + newlineLength;
            if (index < 0)
                return {row: i, column: index + lines[i].length + newlineLength};
        }
        return {row: l-1, column: lines[l-1].length};
    };
    this.positionToIndex = function(pos, startRow) {
        var lines = this.$lines || this.getAllLines();
        var newlineLength = this.getNewLineCharacter().length;
        var index = 0;
        var row = Math.min(pos.row, lines.length);
        for (var i = startRow || 0; i < row; ++i)
            index += lines[i].length + newlineLength;

        return index + pos.column;
    };

}).call(Document.prototype);

exports.Document = Document;
});

define("ace/lib/lang",["require","exports","module"], function(require, exports, module) {
"use strict";

exports.last = function(a) {
    return a[a.length - 1];
};

exports.stringReverse = function(string) {
    return string.split("").reverse().join("");
};

exports.stringRepeat = function (string, count) {
    var result = '';
    while (count > 0) {
        if (count & 1)
            result += string;

        if (count >>= 1)
            string += string;
    }
    return result;
};

var trimBeginRegexp = /^\s\s*/;
var trimEndRegexp = /\s\s*$/;

exports.stringTrimLeft = function (string) {
    return string.replace(trimBeginRegexp, '');
};

exports.stringTrimRight = function (string) {
    return string.replace(trimEndRegexp, '');
};

exports.copyObject = function(obj) {
    var copy = {};
    for (var key in obj) {
        copy[key] = obj[key];
    }
    return copy;
};

exports.copyArray = function(array){
    var copy = [];
    for (var i=0, l=array.length; i<l; i++) {
        if (array[i] && typeof array[i] == "object")
            copy[i] = this.copyObject( array[i] );
        else 
            copy[i] = array[i];
    }
    return copy;
};

exports.deepCopy = function deepCopy(obj) {
    if (typeof obj !== "object" || !obj)
        return obj;
    var copy;
    if (Array.isArray(obj)) {
        copy = [];
        for (var key = 0; key < obj.length; key++) {
            copy[key] = deepCopy(obj[key]);
        }
        return copy;
    }
    var cons = obj.constructor;
    if (cons === RegExp)
        return obj;
    
    copy = cons();
    for (var key in obj) {
        copy[key] = deepCopy(obj[key]);
    }
    return copy;
};

exports.arrayToMap = function(arr) {
    var map = {};
    for (var i=0; i<arr.length; i++) {
        map[arr[i]] = 1;
    }
    return map;

};

exports.createMap = function(props) {
    var map = Object.create(null);
    for (var i in props) {
        map[i] = props[i];
    }
    return map;
};
exports.arrayRemove = function(array, value) {
  for (var i = 0; i <= array.length; i++) {
    if (value === array[i]) {
      array.splice(i, 1);
    }
  }
};

exports.escapeRegExp = function(str) {
    return str.replace(/([.*+?^${}()|[\]\/\\])/g, '\\$1');
};

exports.escapeHTML = function(str) {
    return str.replace(/&/g, "&#38;").replace(/"/g, "&#34;").replace(/'/g, "&#39;").replace(/</g, "&#60;");
};

exports.getMatchOffsets = function(string, regExp) {
    var matches = [];

    string.replace(regExp, function(str) {
        matches.push({
            offset: arguments[arguments.length-2],
            length: str.length
        });
    });

    return matches;
};
exports.deferredCall = function(fcn) {
    var timer = null;
    var callback = function() {
        timer = null;
        fcn();
    };

    var deferred = function(timeout) {
        deferred.cancel();
        timer = setTimeout(callback, timeout || 0);
        return deferred;
    };

    deferred.schedule = deferred;

    deferred.call = function() {
        this.cancel();
        fcn();
        return deferred;
    };

    deferred.cancel = function() {
        clearTimeout(timer);
        timer = null;
        return deferred;
    };
    
    deferred.isPending = function() {
        return timer;
    };

    return deferred;
};


exports.delayedCall = function(fcn, defaultTimeout) {
    var timer = null;
    var callback = function() {
        timer = null;
        fcn();
    };

    var _self = function(timeout) {
        if (timer == null)
            timer = setTimeout(callback, timeout || defaultTimeout);
    };

    _self.delay = function(timeout) {
        timer && clearTimeout(timer);
        timer = setTimeout(callback, timeout || defaultTimeout);
    };
    _self.schedule = _self;

    _self.call = function() {
        this.cancel();
        fcn();
    };

    _self.cancel = function() {
        timer && clearTimeout(timer);
        timer = null;
    };

    _self.isPending = function() {
        return timer;
    };

    return _self;
};
});

define("ace/worker/mirror",["require","exports","module","ace/range","ace/document","ace/lib/lang"], function(require, exports, module) {
"use strict";

var Range = require("../range").Range;
var Document = require("../document").Document;
var lang = require("../lib/lang");
    
var Mirror = exports.Mirror = function(sender) {
    this.sender = sender;
    var doc = this.doc = new Document("");
    
    var deferredUpdate = this.deferredUpdate = lang.delayedCall(this.onUpdate.bind(this));
    
    var _self = this;
    sender.on("change", function(e) {
        var data = e.data;
        if (data[0].start) {
            doc.applyDeltas(data);
        } else {
            for (var i = 0; i < data.length; i += 2) {
                if (Array.isArray(data[i+1])) {
                    var d = {action: "insert", start: data[i], lines: data[i+1]};
                } else {
                    var d = {action: "remove", start: data[i], end: data[i+1]};
                }
                doc.applyDelta(d, true);
            }
        }
        if (_self.$timeout)
            return deferredUpdate.schedule(_self.$timeout);
        _self.onUpdate();
    });
};

(function() {
    
    this.$timeout = 500;
    
    this.setTimeout = function(timeout) {
        this.$timeout = timeout;
    };
    
    this.setValue = function(value) {
        this.doc.setValue(value);
        this.deferredUpdate.schedule(this.$timeout);
    };
    
    this.getValue = function(callbackId) {
        this.sender.callback(this.doc.getValue(), callbackId);
    };
    
    this.onUpdate = function() {
    };
    
    this.isPending = function() {
        return this.deferredUpdate.isPending();
    };
    
}).call(Mirror.prototype);

});

define("ace/mode/ccs/hml_grammar",["require","exports","module"], function(require, exports, module) {
HMLParser = (function() {

  function peg$subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
  }

  function SyntaxError(message, expected, found, offset, line, column) {
    this.message  = message;
    this.expected = expected;
    this.found    = found;
    this.offset   = offset;
    this.line     = line;
    this.column   = column;

    this.name     = "SyntaxError";
  }

  peg$subclass(SyntaxError, Error);

  function parse(input) {
    var options = arguments.length > 1 ? arguments[1] : {},

        peg$FAILED = {},

        peg$startRuleFunctions = { start: peg$parsestart, TopFormula: peg$parseTopFormula },
        peg$startRuleFunction  = peg$parsestart,

        peg$c0 = peg$FAILED,
        peg$c1 = function(Ps) { return formulas; },
        peg$c2 = ";",
        peg$c3 = { type: "literal", value: ";", description: "\";\"" },
        peg$c4 = function(F) { return formulas; },
        peg$c5 = function() { return formulas; },
        peg$c6 = function(P, Qs) { return [P].concat(Qs); },
        peg$c7 = null,
        peg$c8 = function(P) { return [P]; },
        peg$c9 = function(F) { formulas.setTopFormula(F); return F;},
        peg$c10 = function(P) { var f = formulas.unnamedMinFixedPoint(P); return f; },
        peg$c11 = /^[mM]/,
        peg$c12 = { type: "class", value: "[mM]", description: "[mM]" },
        peg$c13 = /^[aA]/,
        peg$c14 = { type: "class", value: "[aA]", description: "[aA]" },
        peg$c15 = /^[xX]/,
        peg$c16 = { type: "class", value: "[xX]", description: "[xX]" },
        peg$c17 = "=",
        peg$c18 = { type: "literal", value: "=", description: "\"=\"" },
        peg$c19 = function(V, P) { return formulas.newMaxFixedPoint(V, P); },
        peg$c20 = /^[iI]/,
        peg$c21 = { type: "class", value: "[iI]", description: "[iI]" },
        peg$c22 = /^[nN]/,
        peg$c23 = { type: "class", value: "[nN]", description: "[nN]" },
        peg$c24 = function(V, P) { return formulas.newMinFixedPoint(V, P); },
        peg$c25 = "or",
        peg$c26 = { type: "literal", value: "or", description: "\"or\"" },
        peg$c27 = function(P, Q) { return Q instanceof hml.DisjFormula ? formulas.newDisj([P].concat(Q.subFormulas)) : formulas.newDisj([P, Q]); },
        peg$c28 = function(P) { return P; },
        peg$c29 = "and",
        peg$c30 = { type: "literal", value: "and", description: "\"and\"" },
        peg$c31 = function(M, P) { return P instanceof hml.ConjFormula ? formulas.newConj([M].concat(P.subFormulas)) : formulas.newConj([M, P]); },
        peg$c32 = function(M) { return M; },
        peg$c33 = "[",
        peg$c34 = { type: "literal", value: "[", description: "\"[\"" },
        peg$c35 = "]",
        peg$c36 = { type: "literal", value: "]", description: "\"]\"" },
        peg$c37 = function(AM, F) { return formulas.newWeakForAll(AM, F); },
        peg$c38 = "<",
        peg$c39 = { type: "literal", value: "<", description: "\"<\"" },
        peg$c40 = ">",
        peg$c41 = { type: "literal", value: ">", description: "\">\"" },
        peg$c42 = function(AM, F) { return formulas.newWeakExists(AM, F); },
        peg$c43 = function(AM, F) { return formulas.newStrongForAll(AM, F); },
        peg$c44 = function(AM, F) { return formulas.newStrongExists(AM, F); },
        peg$c45 = { type: "other", description: "term" },
        peg$c46 = "tt",
        peg$c47 = { type: "literal", value: "tt", description: "\"tt\"" },
        peg$c48 = function() { return formulas.newTrue(); },
        peg$c49 = "ff",
        peg$c50 = { type: "literal", value: "ff", description: "\"ff\"" },
        peg$c51 = function() { return formulas.newFalse(); },
        peg$c52 = function(V) { return formulas.referVariable(V); },
        peg$c53 = "T",
        peg$c54 = { type: "literal", value: "T", description: "\"T\"" },
        peg$c55 = "F",
        peg$c56 = { type: "literal", value: "F", description: "\"F\"" },
        peg$c57 = "(",
        peg$c58 = { type: "literal", value: "(", description: "\"(\"" },
        peg$c59 = ")",
        peg$c60 = { type: "literal", value: ")", description: "\")\"" },
        peg$c61 = function(F) { return F; },
        peg$c62 = { type: "other", description: "variable" },
        peg$c63 = /^[A-EG-SU-Z]/,
        peg$c64 = { type: "class", value: "[A-EG-SU-Z]", description: "[A-EG-SU-Z]" },
        peg$c65 = [],
        peg$c66 = function(letter, rest) { return strFirstAndRest(letter, rest); },
        peg$c67 = /^[FT]/,
        peg$c68 = { type: "class", value: "[FT]", description: "[FT]" },
        peg$c69 = /^[A-Za-z0-9?!_'\-#]/,
        peg$c70 = { type: "class", value: "[A-Za-z0-9?!_'\\-#]", description: "[A-Za-z0-9?!_'\\-#]" },
        peg$c71 = ",",
        peg$c72 = { type: "literal", value: ",", description: "\",\"" },
        peg$c73 = function(A, AM) { return AM.add(A); },
        peg$c74 = function(A) { return new hml.SingleActionMatcher(A); },
        peg$c75 = "-",
        peg$c76 = { type: "literal", value: "-", description: "\"-\"" },
        peg$c77 = function() { return new hml.AllActionMatcher(); },
        peg$c78 = { type: "other", description: "action" },
        peg$c79 = /^[']/,
        peg$c80 = { type: "class", value: "[']", description: "[']" },
        peg$c81 = function(label) { return new ccs.Action(label, true); },
        peg$c82 = function(label) { return new ccs.Action(label, false); },
        peg$c83 = { type: "other", description: "label" },
        peg$c84 = /^[a-z]/,
        peg$c85 = { type: "class", value: "[a-z]", description: "[a-z]" },
        peg$c86 = function(first, rest) { return strFirstAndRest(first, rest); },
        peg$c87 = { type: "other", description: "whitespace" },
        peg$c88 = /^[ \t]/,
        peg$c89 = { type: "class", value: "[ \\t]", description: "[ \\t]" },
        peg$c90 = { type: "other", description: "comment" },
        peg$c91 = "*",
        peg$c92 = { type: "literal", value: "*", description: "\"*\"" },
        peg$c93 = /^[^\r\n]/,
        peg$c94 = { type: "class", value: "[^\\r\\n]", description: "[^\\r\\n]" },
        peg$c95 = "\r",
        peg$c96 = { type: "literal", value: "\r", description: "\"\\r\"" },
        peg$c97 = "\n",
        peg$c98 = { type: "literal", value: "\n", description: "\"\\n\"" },
        peg$c99 = { type: "other", description: "newline" },
        peg$c100 = "\r\n",
        peg$c101 = { type: "literal", value: "\r\n", description: "\"\\r\\n\"" },

        peg$currPos          = 0,
        peg$reportedPos      = 0,
        peg$cachedPos        = 0,
        peg$cachedPosDetails = { line: 1, column: 1, seenCR: false },
        peg$maxFailPos       = 0,
        peg$maxFailExpected  = [],
        peg$silentFails      = 0,

        peg$cache = {},
        peg$result;

    if ("startRule" in options) {
      if (!(options.startRule in peg$startRuleFunctions)) {
        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
      }

      peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
    }

    function text() {
      return input.substring(peg$reportedPos, peg$currPos);
    }

    function offset() {
      return peg$reportedPos;
    }

    function line() {
      return peg$computePosDetails(peg$reportedPos).line;
    }

    function column() {
      return peg$computePosDetails(peg$reportedPos).column;
    }

    function expected(description) {
      throw peg$buildException(
        null,
        [{ type: "other", description: description }],
        peg$reportedPos
      );
    }

    function error(message) {
      throw peg$buildException(message, null, peg$reportedPos);
    }

    function peg$computePosDetails(pos) {
      function advance(details, startPos, endPos) {
        var p, ch;

        for (p = startPos; p < endPos; p++) {
          ch = input.charAt(p);
          if (ch === "\n") {
            if (!details.seenCR) { details.line++; }
            details.column = 1;
            details.seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            details.line++;
            details.column = 1;
            details.seenCR = true;
          } else {
            details.column++;
            details.seenCR = false;
          }
        }
      }

      if (peg$cachedPos !== pos) {
        if (peg$cachedPos > pos) {
          peg$cachedPos = 0;
          peg$cachedPosDetails = { line: 1, column: 1, seenCR: false };
        }
        advance(peg$cachedPosDetails, peg$cachedPos, pos);
        peg$cachedPos = pos;
      }

      return peg$cachedPosDetails;
    }

    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) { return; }

      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }

      peg$maxFailExpected.push(expected);
    }

    function peg$buildException(message, expected, pos) {
      function cleanupExpected(expected) {
        var i = 1;

        expected.sort(function(a, b) {
          if (a.description < b.description) {
            return -1;
          } else if (a.description > b.description) {
            return 1;
          } else {
            return 0;
          }
        });

        while (i < expected.length) {
          if (expected[i - 1] === expected[i]) {
            expected.splice(i, 1);
          } else {
            i++;
          }
        }
      }

      function buildMessage(expected, found) {
        function stringEscape(s) {
          function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

          return s
            .replace(/\\/g,   '\\\\')
            .replace(/"/g,    '\\"')
            .replace(/\x08/g, '\\b')
            .replace(/\t/g,   '\\t')
            .replace(/\n/g,   '\\n')
            .replace(/\f/g,   '\\f')
            .replace(/\r/g,   '\\r')
            .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
            .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
            .replace(/[\u0180-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
            .replace(/[\u1080-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
        }

        var expectedDescs = new Array(expected.length),
            expectedDesc, foundDesc, i;

        for (i = 0; i < expected.length; i++) {
          expectedDescs[i] = expected[i].description;
        }

        expectedDesc = expected.length > 1
          ? expectedDescs.slice(0, -1).join(", ")
              + " or "
              + expectedDescs[expected.length - 1]
          : expectedDescs[0];

        foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

        return "Expected " + expectedDesc + " but " + foundDesc + " found.";
      }

      var posDetails = peg$computePosDetails(pos),
          found      = pos < input.length ? input.charAt(pos) : null;

      if (expected !== null) {
        cleanupExpected(expected);
      }

      return new SyntaxError(
        message !== null ? message : buildMessage(expected, found),
        expected,
        found,
        pos,
        posDetails.line,
        posDetails.column
      );
    }

    function peg$parsestart() {
      var s0, s1, s2, s3, s4;

      var key    = peg$currPos * 19 + 0,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      s1 = peg$parseStatements();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c1(s1);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseSimpleFormula();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_();
          if (s2 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 59) {
              s3 = peg$c2;
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c3); }
            }
            if (s3 !== peg$FAILED) {
              s4 = peg$parse_();
              if (s4 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c4(s1);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parse_();
          if (s1 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c5();
          }
          s0 = s1;
        }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseStatements() {
      var s0, s1, s2, s3, s4, s5;

      var key    = peg$currPos * 19 + 1,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      s1 = peg$parseFixedPoint();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 59) {
            s3 = peg$c2;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c3); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parseStatements();
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c6(s1, s4);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseFixedPoint();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_();
          if (s2 !== peg$FAILED) {
            s3 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 59) {
              s4 = peg$c2;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c3); }
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_();
              if (s5 !== peg$FAILED) {
                s4 = [s4, s5];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$c0;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c0;
            }
            if (s3 === peg$FAILED) {
              s3 = peg$c7;
            }
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c8(s1);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseTopFormula() {
      var s0, s1, s2, s3, s4;

      var key    = peg$currPos * 19 + 2,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      s1 = peg$parseSimpleFormula();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 59) {
            s3 = peg$c2;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c3); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c9(s1);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseSimpleFormula() {
      var s0, s1, s2;

      var key    = peg$currPos * 19 + 3,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      s1 = peg$parseDisjunction();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c10(s1);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseFixedPoint() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;

      var key    = peg$currPos * 19 + 4,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      s1 = peg$parse_();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseVariable();
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            if (peg$c11.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c12); }
            }
            if (s4 !== peg$FAILED) {
              if (peg$c13.test(input.charAt(peg$currPos))) {
                s5 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c14); }
              }
              if (s5 !== peg$FAILED) {
                if (peg$c15.test(input.charAt(peg$currPos))) {
                  s6 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s6 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c16); }
                }
                if (s6 !== peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 61) {
                    s7 = peg$c17;
                    peg$currPos++;
                  } else {
                    s7 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c18); }
                  }
                  if (s7 !== peg$FAILED) {
                    s8 = peg$parse_();
                    if (s8 !== peg$FAILED) {
                      s9 = peg$parseDisjunction();
                      if (s9 !== peg$FAILED) {
                        peg$reportedPos = s0;
                        s1 = peg$c19(s2, s9);
                        s0 = s1;
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c0;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c0;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parse_();
        if (s1 !== peg$FAILED) {
          s2 = peg$parseVariable();
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_();
            if (s3 !== peg$FAILED) {
              if (peg$c11.test(input.charAt(peg$currPos))) {
                s4 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c12); }
              }
              if (s4 !== peg$FAILED) {
                if (peg$c20.test(input.charAt(peg$currPos))) {
                  s5 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s5 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c21); }
                }
                if (s5 !== peg$FAILED) {
                  if (peg$c22.test(input.charAt(peg$currPos))) {
                    s6 = input.charAt(peg$currPos);
                    peg$currPos++;
                  } else {
                    s6 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c23); }
                  }
                  if (s6 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 61) {
                      s7 = peg$c17;
                      peg$currPos++;
                    } else {
                      s7 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c18); }
                    }
                    if (s7 !== peg$FAILED) {
                      s8 = peg$parse_();
                      if (s8 !== peg$FAILED) {
                        s9 = peg$parseDisjunction();
                        if (s9 !== peg$FAILED) {
                          peg$reportedPos = s0;
                          s1 = peg$c24(s2, s9);
                          s0 = s1;
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c0;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c0;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c0;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseDisjunction() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      var key    = peg$currPos * 19 + 5,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      s1 = peg$parseConjunction();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseWhitespace();
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            if (input.substr(peg$currPos, 2) === peg$c25) {
              s4 = peg$c25;
              peg$currPos += 2;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c26); }
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parseWhitespace();
              if (s5 !== peg$FAILED) {
                s6 = peg$parse_();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parseDisjunction();
                  if (s7 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c27(s1, s7);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseConjunction();
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c28(s1);
        }
        s0 = s1;
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseConjunction() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      var key    = peg$currPos * 19 + 6,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      s1 = peg$parseModal();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseWhitespace();
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            if (input.substr(peg$currPos, 3) === peg$c29) {
              s4 = peg$c29;
              peg$currPos += 3;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c30); }
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parseWhitespace();
              if (s5 !== peg$FAILED) {
                s6 = peg$parse_();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parseConjunction();
                  if (s7 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c31(s1, s7);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseModal();
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c32(s1);
        }
        s0 = s1;
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseModal() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12;

      var key    = peg$currPos * 19 + 7,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      s1 = peg$parse_();
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 91) {
          s2 = peg$c33;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c34); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 91) {
              s4 = peg$c33;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c34); }
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_();
              if (s5 !== peg$FAILED) {
                s6 = peg$parseActionList();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parse_();
                  if (s7 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 93) {
                      s8 = peg$c35;
                      peg$currPos++;
                    } else {
                      s8 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c36); }
                    }
                    if (s8 !== peg$FAILED) {
                      s9 = peg$parse_();
                      if (s9 !== peg$FAILED) {
                        if (input.charCodeAt(peg$currPos) === 93) {
                          s10 = peg$c35;
                          peg$currPos++;
                        } else {
                          s10 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c36); }
                        }
                        if (s10 !== peg$FAILED) {
                          s11 = peg$parse_();
                          if (s11 !== peg$FAILED) {
                            s12 = peg$parseModal();
                            if (s12 !== peg$FAILED) {
                              peg$reportedPos = s0;
                              s1 = peg$c37(s6, s12);
                              s0 = s1;
                            } else {
                              peg$currPos = s0;
                              s0 = peg$c0;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$c0;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c0;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c0;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c0;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parse_();
        if (s1 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 60) {
            s2 = peg$c38;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c39); }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_();
            if (s3 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 60) {
                s4 = peg$c38;
                peg$currPos++;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c39); }
              }
              if (s4 !== peg$FAILED) {
                s5 = peg$parse_();
                if (s5 !== peg$FAILED) {
                  s6 = peg$parseActionList();
                  if (s6 !== peg$FAILED) {
                    s7 = peg$parse_();
                    if (s7 !== peg$FAILED) {
                      if (input.charCodeAt(peg$currPos) === 62) {
                        s8 = peg$c40;
                        peg$currPos++;
                      } else {
                        s8 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c41); }
                      }
                      if (s8 !== peg$FAILED) {
                        s9 = peg$parse_();
                        if (s9 !== peg$FAILED) {
                          if (input.charCodeAt(peg$currPos) === 62) {
                            s10 = peg$c40;
                            peg$currPos++;
                          } else {
                            s10 = peg$FAILED;
                            if (peg$silentFails === 0) { peg$fail(peg$c41); }
                          }
                          if (s10 !== peg$FAILED) {
                            s11 = peg$parse_();
                            if (s11 !== peg$FAILED) {
                              s12 = peg$parseModal();
                              if (s12 !== peg$FAILED) {
                                peg$reportedPos = s0;
                                s1 = peg$c42(s6, s12);
                                s0 = s1;
                              } else {
                                peg$currPos = s0;
                                s0 = peg$c0;
                              }
                            } else {
                              peg$currPos = s0;
                              s0 = peg$c0;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$c0;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c0;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c0;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c0;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parse_();
          if (s1 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 91) {
              s2 = peg$c33;
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c34); }
            }
            if (s2 !== peg$FAILED) {
              s3 = peg$parse_();
              if (s3 !== peg$FAILED) {
                s4 = peg$parseActionList();
                if (s4 !== peg$FAILED) {
                  s5 = peg$parse_();
                  if (s5 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 93) {
                      s6 = peg$c35;
                      peg$currPos++;
                    } else {
                      s6 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c36); }
                    }
                    if (s6 !== peg$FAILED) {
                      s7 = peg$parse_();
                      if (s7 !== peg$FAILED) {
                        s8 = peg$parseModal();
                        if (s8 !== peg$FAILED) {
                          peg$reportedPos = s0;
                          s1 = peg$c43(s4, s8);
                          s0 = s1;
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c0;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c0;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c0;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = peg$parse_();
            if (s1 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 60) {
                s2 = peg$c38;
                peg$currPos++;
              } else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c39); }
              }
              if (s2 !== peg$FAILED) {
                s3 = peg$parse_();
                if (s3 !== peg$FAILED) {
                  s4 = peg$parseActionList();
                  if (s4 !== peg$FAILED) {
                    s5 = peg$parse_();
                    if (s5 !== peg$FAILED) {
                      if (input.charCodeAt(peg$currPos) === 62) {
                        s6 = peg$c40;
                        peg$currPos++;
                      } else {
                        s6 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c41); }
                      }
                      if (s6 !== peg$FAILED) {
                        s7 = peg$parse_();
                        if (s7 !== peg$FAILED) {
                          s8 = peg$parseModal();
                          if (s8 !== peg$FAILED) {
                            peg$reportedPos = s0;
                            s1 = peg$c44(s4, s8);
                            s0 = s1;
                          } else {
                            peg$currPos = s0;
                            s0 = peg$c0;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c0;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c0;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c0;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$parseUnary();
            }
          }
        }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseUnary() {
      var s0, s1, s2;

      var key    = peg$currPos * 19 + 8,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      peg$silentFails++;
      s0 = peg$parseParenFormula();
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parse_();
        if (s1 !== peg$FAILED) {
          if (input.substr(peg$currPos, 2) === peg$c46) {
            s2 = peg$c46;
            peg$currPos += 2;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c47); }
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c48();
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parse_();
          if (s1 !== peg$FAILED) {
            if (input.substr(peg$currPos, 2) === peg$c49) {
              s2 = peg$c49;
              peg$currPos += 2;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c50); }
            }
            if (s2 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c51();
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = peg$parse_();
            if (s1 !== peg$FAILED) {
              s2 = peg$parseVariable();
              if (s2 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c52(s2);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              s1 = peg$parse_();
              if (s1 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 84) {
                  s2 = peg$c53;
                  peg$currPos++;
                } else {
                  s2 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c54); }
                }
                if (s2 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c48();
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                s1 = peg$parse_();
                if (s1 !== peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 70) {
                    s2 = peg$c55;
                    peg$currPos++;
                  } else {
                    s2 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c56); }
                  }
                  if (s2 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c51();
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              }
            }
          }
        }
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c45); }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseParenFormula() {
      var s0, s1, s2, s3, s4, s5, s6;

      var key    = peg$currPos * 19 + 9,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      s1 = peg$parse_();
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 40) {
          s2 = peg$c57;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c58); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            s4 = peg$parseDisjunction();
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_();
              if (s5 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 41) {
                  s6 = peg$c59;
                  peg$currPos++;
                } else {
                  s6 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c60); }
                }
                if (s6 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c61(s4);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseVariable() {
      var s0, s1, s2, s3;

      var key    = peg$currPos * 19 + 10,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      peg$silentFails++;
      s0 = peg$currPos;
      if (peg$c63.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c64); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parseIdentifierRestSym();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parseIdentifierRestSym();
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c66(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (peg$c67.test(input.charAt(peg$currPos))) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c68); }
        }
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parseIdentifierRestSym();
          if (s3 !== peg$FAILED) {
            while (s3 !== peg$FAILED) {
              s2.push(s3);
              s3 = peg$parseIdentifierRestSym();
            }
          } else {
            s2 = peg$c0;
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c66(s1, s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c62); }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseIdentifierRestSym() {
      var s0;

      var key    = peg$currPos * 19 + 11,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      if (peg$c69.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c70); }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseActionList() {
      var s0, s1, s2, s3, s4, s5;

      var key    = peg$currPos * 19 + 12,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      s1 = peg$parseAction();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 44) {
            s3 = peg$c71;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c72); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              s5 = peg$parseActionList();
              if (s5 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c73(s1, s5);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseAction();
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c74(s1);
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 45) {
            s1 = peg$c75;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c76); }
          }
          if (s1 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c77();
          }
          s0 = s1;
        }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseAction() {
      var s0, s1, s2;

      var key    = peg$currPos * 19 + 13,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      peg$silentFails++;
      s0 = peg$currPos;
      if (peg$c79.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c80); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseLabel();
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c81(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseLabel();
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c82(s1);
        }
        s0 = s1;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c78); }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseLabel() {
      var s0, s1, s2, s3;

      var key    = peg$currPos * 19 + 14,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      peg$silentFails++;
      s0 = peg$currPos;
      if (peg$c84.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c85); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parseIdentifierRestSym();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parseIdentifierRestSym();
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c86(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c83); }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseWhitespace() {
      var s0, s1;

      var key    = peg$currPos * 19 + 15,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      peg$silentFails++;
      if (peg$c88.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c89); }
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c87); }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseComment() {
      var s0, s1, s2, s3, s4;

      var key    = peg$currPos * 19 + 16,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      peg$silentFails++;
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 42) {
        s1 = peg$c91;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c92); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        if (peg$c93.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c94); }
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          if (peg$c93.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c94); }
          }
        }
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 13) {
            s3 = peg$c95;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c96); }
          }
          if (s3 === peg$FAILED) {
            s3 = peg$c7;
          }
          if (s3 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 10) {
              s4 = peg$c97;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c98); }
            }
            if (s4 === peg$FAILED) {
              s4 = peg$c7;
            }
            if (s4 !== peg$FAILED) {
              s1 = [s1, s2, s3, s4];
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c90); }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parse_() {
      var s0, s1, s2, s3;

      var key    = peg$currPos * 19 + 17,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parseWhitespace();
      if (s2 === peg$FAILED) {
        s2 = peg$parseNewline();
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parseWhitespace();
        if (s2 === peg$FAILED) {
          s2 = peg$parseNewline();
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseComment();
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            s1 = [s1, s2, s3];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = [];
        s1 = peg$parseWhitespace();
        if (s1 === peg$FAILED) {
          s1 = peg$parseNewline();
        }
        while (s1 !== peg$FAILED) {
          s0.push(s1);
          s1 = peg$parseWhitespace();
          if (s1 === peg$FAILED) {
            s1 = peg$parseNewline();
          }
        }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }

    function peg$parseNewline() {
      var s0, s1;

      var key    = peg$currPos * 19 + 18,
          cached = peg$cache[key];

      if (cached) {
        peg$currPos = cached.nextPos;
        return cached.result;
      }

      peg$silentFails++;
      if (input.substr(peg$currPos, 2) === peg$c100) {
        s0 = peg$c100;
        peg$currPos += 2;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c101); }
      }
      if (s0 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 10) {
          s0 = peg$c97;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c98); }
        }
        if (s0 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 13) {
            s0 = peg$c95;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c96); }
          }
        }
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c99); }
      }

      peg$cache[key] = { nextPos: peg$currPos, result: s0 };

      return s0;
    }


    	function strFirstAndRest(first, rest) {
    		return first + rest.join('');
    	}

        var ccs = options.ccs,
            hml = options.hml,
            formulas = options.formulaSet || new hml.FormulaSet();


    peg$result = peg$startRuleFunction();

    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return peg$result;
    } else {
      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
        peg$fail({ type: "end", description: "end of input" });
      }

      throw peg$buildException(null, peg$maxFailExpected, peg$maxFailPos);
    }
  }

  return {
    SyntaxError: SyntaxError,
    parse:       parse
  };
})();

module.exports.HMLParser = HMLParser; });

define("ace/mode/ccs/util",["require","exports","module"], function(require, exports, module) {
var ArrayUtil;
(function (ArrayUtil) {
    function removeConsecutiveDuplicates(array, byKeyFn) {
        byKeyFn = byKeyFn || (function (x) { return x; });
        if (array.length === 0)
            return [];
        var result = [array[0]];
        for (var fI = 1, rI = 0, len = array.length; fI < len; fI++) {
            var arrayElem = array[fI];
            if (byKeyFn(arrayElem) !== byKeyFn(result[rI])) {
                result.push(arrayElem);
                ++rI;
            }
        }
        return result;
    }
    ArrayUtil.removeConsecutiveDuplicates = removeConsecutiveDuplicates;
    function sortAndRemoveDuplicates(array, byKeyFn) {
        var sorted = array.slice();
        if (byKeyFn) {
            sorted.sort(keyFnToComparerFn(byKeyFn));
        }
        else {
            sorted.sort();
        }
        return removeConsecutiveDuplicates(sorted, byKeyFn);
    }
    ArrayUtil.sortAndRemoveDuplicates = sortAndRemoveDuplicates;
    function keyFnToComparerFn(keyFn) {
        return function (a, b) {
            var valA = keyFn(a), valB = keyFn(b);
            if (valA < valB)
                return -1;
            if (valB < valA)
                return 1;
            return 0;
        };
    }
    ArrayUtil.keyFnToComparerFn = keyFnToComparerFn;
    function intersperse(array, element) {
        var result = [];
        if (array.length > 0)
            result.push(array[0]);
        for (var i = 1; i < array.length; ++i) {
            result.push(element);
            result.push(array[i]);
        }
        return result;
    }
    ArrayUtil.intersperse = intersperse;
    function selectBest(array, isBetter) {
        return array.reduce(function (cur, check) {
            return isBetter(check, cur) ? check : cur;
        });
    }
    ArrayUtil.selectBest = selectBest;
    function groupBy(arr, keyFn) {
        var groupings = Object.create(null), key, elem, group;
        for (var i = 0; i < arr.length; i++) {
            elem = arr[i];
            key = keyFn(elem);
            group = groupings[key];
            if (!group)
                group = groupings[key] = [];
            group.push(elem);
        }
        return groupings;
    }
    ArrayUtil.groupBy = groupBy;
    function first(arr, pred) {
        var result = null;
        for (var i = 0; i < arr.length; i++) {
            var element = arr[i];
            if (pred(element)) {
                result = element;
                break;
            }
        }
        return result;
    }
    ArrayUtil.first = first;
})(ArrayUtil || (ArrayUtil = {}));

module.exports.ArrayUtil = ArrayUtil; });

define("ace/mode/ccs/ccs",["require","exports","module","ace/mode/ccs/util"], function(require, exports, module) {
var ArrayUtil = require("./util").ArrayUtil;
var Traverse;
(function (Traverse) {
    var UnguardedRecursionChecker = (function () {
        function UnguardedRecursionChecker() {
        }
        UnguardedRecursionChecker.prototype.findUnguardedProcesses = function (allNamedProcesses) {
            this.unknownResults = allNamedProcesses.slice(0);
            this.visiting = [];
            this.unguardedProcesses = [];
            for (var i = 0, max = allNamedProcesses.length; i < max; i++) {
                allNamedProcesses[i].dispatchOn(this);
            }
            return this.unguardedProcesses;
        };
        UnguardedRecursionChecker.prototype.dispatchNullProcess = function (process) {
            return false;
        };
        UnguardedRecursionChecker.prototype.dispatchNamedProcess = function (process) {
            var index = this.unknownResults.indexOf(process), isUnguarded;
            if (index >= 0) {
                this.unknownResults.splice(index, 1);
                this.visiting.push(process);
                isUnguarded = process.subProcess.dispatchOn(this);
                if (isUnguarded) {
                    this.unguardedProcesses.push(process);
                }
                this.visiting.splice(this.visiting.indexOf(process), 1);
            }
            else if (this.visiting.indexOf(process) !== -1) {
                isUnguarded = true;
            }
            else {
                isUnguarded = this.unguardedProcesses.indexOf(process) !== -1;
            }
            return isUnguarded;
        };
        UnguardedRecursionChecker.prototype.dispatchSummationProcess = function (process) {
            var _this = this;
            var isUnguarded = false;
            process.subProcesses.forEach(function (subProc) {
                if (subProc.dispatchOn(_this)) {
                    isUnguarded = true;
                }
            });
            return isUnguarded;
        };
        UnguardedRecursionChecker.prototype.dispatchCompositionProcess = function (process) {
            var _this = this;
            var isUnguarded = false;
            process.subProcesses.forEach(function (subProc) {
                if (subProc.dispatchOn(_this)) {
                    isUnguarded = true;
                }
            });
            return isUnguarded;
        };
        UnguardedRecursionChecker.prototype.dispatchActionPrefixProcess = function (process) {
            return false;
        };
        UnguardedRecursionChecker.prototype.dispatchRestrictionProcess = function (process) {
            return process.subProcess.dispatchOn(this);
        };
        UnguardedRecursionChecker.prototype.dispatchRelabellingProcess = function (process) {
            return process.subProcess.dispatchOn(this);
        };
        return UnguardedRecursionChecker;
    })();
    Traverse.UnguardedRecursionChecker = UnguardedRecursionChecker;
})(Traverse || (Traverse = {}));
var CCS;
(function (CCS) {
    var NullProcess = (function () {
        function NullProcess() {
        }
        NullProcess.prototype.dispatchOn = function (dispatcher) {
            return dispatcher.dispatchNullProcess(this);
        };
        NullProcess.prototype.toString = function () {
            return "0";
        };
        Object.defineProperty(NullProcess.prototype, "id", {
            get: function () {
                return this.toString();
            },
            enumerable: true,
            configurable: true
        });
        return NullProcess;
    })();
    CCS.NullProcess = NullProcess;
    var NamedProcess = (function () {
        function NamedProcess(name, subProcess) {
            this.name = name;
            this.subProcess = subProcess;
        }
        NamedProcess.prototype.dispatchOn = function (dispatcher) {
            return dispatcher.dispatchNamedProcess(this);
        };
        NamedProcess.prototype.toString = function () {
            return this.name;
        };
        Object.defineProperty(NamedProcess.prototype, "id", {
            get: function () {
                return this.toString();
            },
            enumerable: true,
            configurable: true
        });
        return NamedProcess;
    })();
    CCS.NamedProcess = NamedProcess;
    var SummationProcess = (function () {
        function SummationProcess(subProcesses) {
            this.subProcesses = subProcesses;
        }
        SummationProcess.prototype.dispatchOn = function (dispatcher) {
            return dispatcher.dispatchSummationProcess(this);
        };
        SummationProcess.prototype.toString = function () {
            if (this.ccs)
                return this.ccs;
            return this.ccs = this.subProcesses.map(function (p) { return "(" + p.toString() + ")"; }).join(" + ");
        };
        Object.defineProperty(SummationProcess.prototype, "id", {
            get: function () {
                return this.toString();
            },
            enumerable: true,
            configurable: true
        });
        return SummationProcess;
    })();
    CCS.SummationProcess = SummationProcess;
    var CompositionProcess = (function () {
        function CompositionProcess(subProcesses) {
            this.subProcesses = subProcesses;
        }
        CompositionProcess.prototype.dispatchOn = function (dispatcher) {
            return dispatcher.dispatchCompositionProcess(this);
        };
        CompositionProcess.prototype.toString = function () {
            if (this.ccs)
                return this.ccs;
            return this.ccs = this.subProcesses.map(function (p) { return "(" + p.toString() + ")"; }).join(" | ");
        };
        Object.defineProperty(CompositionProcess.prototype, "id", {
            get: function () {
                return this.toString();
            },
            enumerable: true,
            configurable: true
        });
        return CompositionProcess;
    })();
    CCS.CompositionProcess = CompositionProcess;
    var ActionPrefixProcess = (function () {
        function ActionPrefixProcess(action, nextProcess) {
            this.action = action;
            this.nextProcess = nextProcess;
        }
        ActionPrefixProcess.prototype.dispatchOn = function (dispatcher) {
            return dispatcher.dispatchActionPrefixProcess(this);
        };
        ActionPrefixProcess.prototype.toString = function () {
            if (this.ccs)
                return this.ccs;
            return this.ccs = this.action.toString() + "." + this.nextProcess.toString();
        };
        Object.defineProperty(ActionPrefixProcess.prototype, "id", {
            get: function () {
                return this.toString();
            },
            enumerable: true,
            configurable: true
        });
        return ActionPrefixProcess;
    })();
    CCS.ActionPrefixProcess = ActionPrefixProcess;
    var RestrictionProcess = (function () {
        function RestrictionProcess(subProcess, restrictedLabels) {
            this.subProcess = subProcess;
            this.restrictedLabels = restrictedLabels;
        }
        RestrictionProcess.prototype.dispatchOn = function (dispatcher) {
            return dispatcher.dispatchRestrictionProcess(this);
        };
        RestrictionProcess.prototype.toString = function () {
            if (this.ccs)
                return this.ccs;
            var parts = [];
            this.restrictedLabels.forEach(function (label) { return parts.push(label.toString()); });
            return this.ccs = "(" + this.subProcess.toString() + ") \\ {" + parts.join(",") + "}";
        };
        Object.defineProperty(RestrictionProcess.prototype, "id", {
            get: function () {
                return this.toString();
            },
            enumerable: true,
            configurable: true
        });
        return RestrictionProcess;
    })();
    CCS.RestrictionProcess = RestrictionProcess;
    var RelabellingProcess = (function () {
        function RelabellingProcess(subProcess, relabellings) {
            this.subProcess = subProcess;
            this.relabellings = relabellings;
        }
        RelabellingProcess.prototype.dispatchOn = function (dispatcher) {
            return dispatcher.dispatchRelabellingProcess(this);
        };
        RelabellingProcess.prototype.toString = function () {
            if (this.ccs)
                return this.ccs;
            var parts = [];
            this.relabellings.forEach(function (f, t) { return parts.push(t.toString() + "/" + f.toString()); });
            return this.ccs = "(" + this.subProcess.toString() + ") [" + parts.join(",") + "]";
        };
        Object.defineProperty(RelabellingProcess.prototype, "id", {
            get: function () {
                return this.toString();
            },
            enumerable: true,
            configurable: true
        });
        return RelabellingProcess;
    })();
    CCS.RelabellingProcess = RelabellingProcess;
    var CollapsedProcess = (function () {
        function CollapsedProcess(subProcesses) {
            this.subProcesses = subProcesses;
        }
        CollapsedProcess.prototype.dispatchOn = function (dispatcher) {
            return dispatcher.dispatchCollapsedProcess(this);
        };
        CollapsedProcess.prototype.toString = function () {
            if (this.ccs)
                return this.ccs;
            return this.ccs = "{" + this.subProcesses.map(function (p) { return "(" + p.toString() + ")"; }).join(",") + "}";
        };
        Object.defineProperty(CollapsedProcess.prototype, "id", {
            get: function () {
                return this.toString();
            },
            enumerable: true,
            configurable: true
        });
        return CollapsedProcess;
    })();
    CCS.CollapsedProcess = CollapsedProcess;
    var Action = (function () {
        function Action(label, isComplement) {
            if (label === "tau" && isComplement) {
                throw newError("TauNoComplement", "Tau has no complement.");
            }
            this.label = label;
            this.complement = isComplement;
        }
        Action.prototype.getLabel = function () {
            return this.label;
        };
        Action.prototype.isComplement = function () {
            return this.complement;
        };
        Action.prototype.equals = function (other) {
            return this.label === other.label && this.complement === other.complement;
        };
        Action.prototype.toString = function (formatComplement) {
            if (formatComplement === void 0) { formatComplement = false; }
            if (this.complement) {
                if (formatComplement) {
                    return "<span class=\"overline\">'" + this.label + "</span>";
                }
                else {
                    return "'" + this.label;
                }
            }
            else {
                return this.label;
            }
        };
        Action.prototype.clone = function () {
            return new Action(this.label, this.complement);
        };
        return Action;
    })();
    CCS.Action = Action;
    function newError(type, message) {
        var error = new Error(message);
        error.name = type;
        return error;
    }
    var Graph = (function () {
        function Graph() {
            this.nextId = 1;
            this.nullProcess = new NullProcess();
            this.processes = { "0": this.nullProcess };
            this.labelsToProc = Object.create(null);
            this.procsToLabel = Object.create(null);
            this.namedProcesses = Object.create(null);
            this.constructErrors = [];
            this.definedSets = Object.create(null);
            this.allRestrictedSets = new GrowingIndexedArraySet();
            this.allRelabellings = new GrowingIndexedArraySet();
            this.unguardedRecursionChecker = new Traverse.UnguardedRecursionChecker();
        }
        Graph.prototype.newNamedProcess = function (processName, process) {
            var namedProcess = this.namedProcesses[processName];
            if (!namedProcess) {
                namedProcess = this.namedProcesses[processName] = new NamedProcess(processName, process);
                this.processes[namedProcess.id] = namedProcess;
            }
            else if (!namedProcess.subProcess) {
                namedProcess.subProcess = process;
            }
            else {
                this.constructErrors.push(newError("DuplicateProcessDefinition", "Duplicate definition of process '" + processName + "'."));
            }
            return namedProcess;
        };
        Graph.prototype.referToNamedProcess = function (processName) {
            var namedProcess = this.namedProcesses[processName];
            if (!namedProcess) {
                namedProcess = this.namedProcesses[processName] = new NamedProcess(processName, null);
                this.processes[namedProcess.id] = namedProcess;
            }
            return namedProcess;
        };
        Graph.prototype.getNullProcess = function () {
            return this.nullProcess;
        };
        Graph.prototype.newActionPrefixProcess = function (action, nextProcess) {
            var result = new ActionPrefixProcess(action, nextProcess);
            return this.processes[result.id] = result;
        };
        Graph.prototype.newSummationProcess = function (subProcesses) {
            var newProcesses = subProcesses.slice(0);
            newProcesses.sort();
            var result = new SummationProcess(newProcesses);
            return this.processes[result.id] = result;
        };
        Graph.prototype.newCompositionProcess = function (subProcesses) {
            var newProcesses = subProcesses.slice(0);
            newProcesses.sort();
            var result = new CompositionProcess(newProcesses);
            return this.processes[result.id] = result;
        };
        Graph.prototype.newRestrictedProcess = function (process, restrictedLabels) {
            restrictedLabels = this.allRestrictedSets.getOrAdd(restrictedLabels);
            var result = new RestrictionProcess(process, restrictedLabels);
            return this.processes[result.id] = result;
        };
        Graph.prototype.newRestrictedProcessOnSetName = function (process, setName) {
            var labelSet = this.definedSets[setName];
            if (!labelSet) {
                this.constructErrors.push(newError("UndefinedSet", "Set '" + setName + "' has not been defined."));
                labelSet = this.allRestrictedSets.getOrAdd(new LabelSet([]));
            }
            return this.newRestrictedProcess(process, labelSet);
        };
        Graph.prototype.newRelabelingProcess = function (process, relabellings) {
            relabellings = this.allRelabellings.getOrAdd(relabellings);
            var result = new RelabellingProcess(process, relabellings);
            return this.processes[result.id] = result;
        };
        Graph.prototype.newCollapsedProcess = function (subProcesses) {
            var newProcesses = subProcesses.slice(0);
            newProcesses.sort();
            var result = new CollapsedProcess(newProcesses);
            return this.processes[result.id] = result;
        };
        Graph.prototype.defineNamedSet = function (name, labelSet) {
            if (this.definedSets[name]) {
                this.constructErrors.push(newError("DuplicateSetDefinition", "Duplicate definition of set '" + name + "'."));
            }
            this.definedSets[name] = this.allRestrictedSets.getOrAdd(labelSet);
        };
        Graph.prototype.processById = function (id) {
            return this.processes[id] || null;
        };
        Graph.prototype.processByName = function (name) {
            return this.namedProcesses[name] || null;
        };
        Graph.prototype.processByLabel = function (label) {
            var proc = this.procsToLabel[label];
            if (!proc)
                throw "processByLabel: unknown label '" + label + "'";
            return proc;
        };
        Graph.prototype.getNamedProcesses = function () {
            return Object.keys(this.namedProcesses);
        };
        Graph.prototype.getLabel = function (process) {
            var label = this.labelsToProc[process.id];
            if (!label) {
                label = this.labelsToProc[process.id] = (process instanceof CCS.NamedProcess) ? process.name : "" + this.nextId++;
                this.procsToLabel[label] = process;
            }
            return label;
        };
        Graph.prototype.getErrors = function () {
            var _this = this;
            var errors = this.constructErrors.slice(0);
            var addUndefinedProcesses = function () {
                var processName, process;
                for (processName in _this.namedProcesses) {
                    process = _this.namedProcesses[processName];
                    if (!process.subProcess) {
                        errors.push(newError("UndefinedProcess", "Process '" + processName + "' has not been defined."));
                    }
                }
            };
            var addUnguardedRecursionErrors = function () {
                var processNames = Object.keys(_this.namedProcesses), processes = processNames.map(function (name) { return _this.namedProcesses[name]; }), unguardedProcesses = _this.unguardedRecursionChecker.findUnguardedProcesses(processes);
                unguardedProcesses.forEach(function (process) {
                    errors.push(newError("UnguardedProcess", "Process '" + process.name + "' has unguarded recursion."));
                });
            };
            addUndefinedProcesses();
            if (errors.length === 0)
                addUnguardedRecursionErrors();
            return errors;
        };
        return Graph;
    })();
    CCS.Graph = Graph;
    var RelabellingSet = (function () {
        function RelabellingSet(relabellings) {
            var _this = this;
            this.froms = [];
            this.tos = [];
            relabellings.forEach(function (relabel) {
                if (relabel.from === "tau") {
                    throw newError("TauRelabel", "Cannot relabel tau.");
                }
                _this.froms.push(relabel.from);
                _this.tos.push(relabel.to);
            });
        }
        RelabellingSet.prototype.forEach = function (f, thisObject) {
            for (var i = 0, max = this.froms.length; i < max; i++) {
                f.call(thisObject, this.froms[i], this.tos[i]);
            }
        };
        RelabellingSet.prototype.hasRelabelForLabel = function (label) {
            return this.froms.indexOf(label) !== -1;
        };
        RelabellingSet.prototype.relabeledActionFor = function (action) {
            var index = this.froms.indexOf(action.getLabel()), result = null, newLabel;
            if (index >= 0) {
                newLabel = this.tos[index];
                result = newLabel === "tau" ? new Action(newLabel, false) : new Action(newLabel, action.isComplement());
            }
            return result;
        };
        RelabellingSet.prototype.equals = function (other) {
            if (other === this)
                return true;
            if (other.froms.length !== this.froms.length)
                return false;
            for (var i = 0; i < this.froms.length; i++) {
                if (this.froms[i] !== other.froms[i])
                    return false;
                if (this.tos[i] !== other.tos[i])
                    return false;
            }
            return true;
        };
        RelabellingSet.prototype.toString = function () {
            return "RelabellingSet";
        };
        return RelabellingSet;
    })();
    CCS.RelabellingSet = RelabellingSet;
    var LabelSet = (function () {
        function LabelSet(labels) {
            this.labels = [];
            this.labels = ArrayUtil.sortAndRemoveDuplicates(labels);
            if (this.contains("tau")) {
                throw newError("TauInLabelSet", "Tau is not allowed in label set.");
            }
        }
        LabelSet.prototype.toArray = function () {
            return this.labels.slice(0);
        };
        LabelSet.prototype.contains = function (label) {
            return this.labels.indexOf(label) !== -1;
        };
        LabelSet.prototype.empty = function () {
            return this.count() === 0;
        };
        LabelSet.prototype.count = function () {
            return this.labels.length;
        };
        LabelSet.prototype.forEach = function (f, thisObject) {
            var _this = this;
            if (thisObject) {
                this.labels.forEach(function (label) { return f.call(_this, label); });
            }
            else {
                this.labels.forEach(function (label) { return f(label); });
            }
        };
        LabelSet.prototype.equals = function (other) {
            var myLabels = this.labels, otherLabels = other.labels;
            if (other === this)
                return true;
            if (myLabels.length !== other.labels.length)
                return false;
            for (var i = 0; i < myLabels.length; i++) {
                if (myLabels[i] !== otherLabels[i])
                    return false;
            }
            return true;
        };
        LabelSet.prototype.union = function (other) {
            return LabelSet.Union(this, other);
        };
        LabelSet.Union = function () {
            var sets = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                sets[_i - 0] = arguments[_i];
            }
            var result = new LabelSet([]);
            sets.forEach(function (set) {
                set.labels.forEach(function (label) {
                    if (!result.contains(label)) {
                        result.labels.push(label);
                    }
                });
            });
            result.labels.sort();
            return result;
        };
        LabelSet.prototype.toString = function () {
            return "LabelSet";
        };
        return LabelSet;
    })();
    CCS.LabelSet = LabelSet;
    var Transition = (function () {
        function Transition(action, targetProcess) {
            this.action = action;
            this.targetProcess = targetProcess;
        }
        Transition.prototype.equals = function (other) {
            if (!(other instanceof Transition)) {
                return false;
            }
            return (this.action.equals(other.action) && this.targetProcess.id == other.targetProcess.id);
        };
        Transition.prototype.toString = function () {
            if (this.targetProcess instanceof NamedProcess) {
                return this.action.toString() + "->" + this.targetProcess.name;
            }
            return this.action.toString() + "->" + this.targetProcess.id;
        };
        return Transition;
    })();
    CCS.Transition = Transition;
    var TransitionSet = (function () {
        function TransitionSet(transitions) {
            this.transitions = [];
            if (transitions) {
                this.addMany(transitions);
            }
        }
        TransitionSet.prototype.add = function (transition) {
            var index = this.indexOf(transition);
            if (index === -1) {
                this.transitions.push(transition);
            }
        };
        TransitionSet.prototype.contains = function (transition) {
            return this.indexOf(transition) !== -1;
        };
        TransitionSet.prototype.indexOf = function (transition) {
            var allCurrent = this.transitions;
            for (var i = 0, max = allCurrent.length; i < max; i++) {
                if (transition.equals(allCurrent[i]))
                    return i;
            }
            return -1;
        };
        TransitionSet.prototype.addMany = function (transitions) {
            for (var i = 0, max = transitions.length; i < max; i++) {
                this.add(transitions[i]);
            }
        };
        TransitionSet.prototype.unionWith = function (tSet) {
            this.addMany(tSet.transitions);
            return this;
        };
        TransitionSet.prototype.clone = function () {
            return new TransitionSet(this.transitions);
        };
        TransitionSet.prototype.count = function () {
            return this.transitions.length;
        };
        TransitionSet.prototype.applyRestrictionSet = function (labels) {
            var count = this.transitions.length, allCurrent = this.transitions, i = 0;
            while (i < count) {
                if (allCurrent[i] instanceof Transition && labels.contains(allCurrent[i].action.getLabel())) {
                    allCurrent[i] = allCurrent[--count];
                }
                else {
                    ++i;
                }
            }
            allCurrent.length = count;
            return this;
        };
        TransitionSet.prototype.applyRelabelSet = function (relabels) {
            var allCurrent = this.transitions, newAction, oldAction, transition;
            for (var i = 0, max = allCurrent.length; i < max; i++) {
                if (allCurrent[i] instanceof Transition) {
                    transition = allCurrent[i];
                    oldAction = transition.action;
                    if (relabels.hasRelabelForLabel(transition.action.label)) {
                        newAction = relabels.relabeledActionFor(transition.action);
                        allCurrent[i] = new Transition(newAction, transition.targetProcess);
                    }
                }
            }
        };
        TransitionSet.prototype.possibleActions = function () {
            var actions = [], action, found;
            for (var i = 0; i < this.transitions.length; i++) {
                action = this.transitions[i].action;
                found = false;
                for (var j = 0; j < actions.length; j++) {
                    if (action.equals(actions[j])) {
                        found = true;
                        break;
                    }
                }
                if (!found)
                    actions.push(action);
            }
            return actions;
        };
        TransitionSet.prototype.transitionsForAction = function (action) {
            return this.transitions.filter(function (transition) { return action.equals(transition.action); });
        };
        TransitionSet.prototype.forEach = function (f) {
            for (var i = 0, max = this.transitions.length; i < max; i++) {
                f(this.transitions[i]);
            }
        };
        TransitionSet.prototype.toArray = function () {
            return this.transitions.slice(0);
        };
        return TransitionSet;
    })();
    CCS.TransitionSet = TransitionSet;
    var StrictSuccessorGenerator = (function () {
        function StrictSuccessorGenerator(graph, cache) {
            this.graph = graph;
            this.cache = cache;
            this.cache = cache || {};
        }
        StrictSuccessorGenerator.prototype.getGraph = function () {
            return this.graph;
        };
        StrictSuccessorGenerator.prototype.getSuccessors = function (processId) {
            var process = this.graph.processById(processId);
            return this.cache[process.id] = process.dispatchOn(this);
        };
        StrictSuccessorGenerator.prototype.getProcessByName = function (processName) {
            return this.graph.processByName(processName);
        };
        StrictSuccessorGenerator.prototype.getProcessById = function (processId) {
            return this.graph.processById(processId);
        };
        StrictSuccessorGenerator.prototype.dispatchNullProcess = function (process) {
            var transitionSet = this.cache[process.id];
            if (!transitionSet) {
                transitionSet = this.cache[process.id] = new TransitionSet();
            }
            return transitionSet;
        };
        StrictSuccessorGenerator.prototype.dispatchNamedProcess = function (process) {
            var transitionSet = this.cache[process.id];
            if (!transitionSet) {
                this.cache[process.id] = new TransitionSet();
                transitionSet = this.cache[process.id] = process.subProcess.dispatchOn(this).clone();
            }
            return transitionSet;
        };
        StrictSuccessorGenerator.prototype.dispatchSummationProcess = function (process) {
            var _this = this;
            var transitionSet = this.cache[process.id];
            if (!transitionSet) {
                transitionSet = this.cache[process.id] = new TransitionSet();
                process.subProcesses.forEach(function (subProcess) {
                    transitionSet.unionWith(subProcess.dispatchOn(_this));
                });
            }
            return transitionSet;
        };
        StrictSuccessorGenerator.prototype.dispatchCompositionProcess = function (process) {
            var _this = this;
            var transitionSet = this.cache[process.id], leftSet, rightSet;
            if (!transitionSet) {
                transitionSet = this.cache[process.id] = new TransitionSet();
                var subTransitionSets = process.subProcesses.map(function (subProc) { return subProc.dispatchOn(_this); });
                for (var i = 0; i < subTransitionSets.length - 1; i++) {
                    for (var j = i + 1; j < subTransitionSets.length; j++) {
                        var left = subTransitionSets[i];
                        var right = subTransitionSets[j];
                        left.forEach(function (leftTransition) {
                            right.forEach(function (rightTransition) {
                                if (leftTransition.action.getLabel() === rightTransition.action.getLabel() && leftTransition.action.isComplement() !== rightTransition.action.isComplement()) {
                                    var targetSubprocesses = process.subProcesses.slice(0);
                                    targetSubprocesses[i] = leftTransition.targetProcess;
                                    targetSubprocesses[j] = rightTransition.targetProcess;
                                    transitionSet.add(new Transition(new Action("tau", false), _this.graph.newCompositionProcess(targetSubprocesses)));
                                }
                            });
                        });
                    }
                }
                subTransitionSets.forEach(function (subTransitionSet, index) {
                    subTransitionSet.forEach(function (subTransition) {
                        var targetSubprocesses = process.subProcesses.slice(0);
                        targetSubprocesses[index] = subTransition.targetProcess;
                        transitionSet.add(new Transition(subTransition.action.clone(), _this.graph.newCompositionProcess(targetSubprocesses)));
                    });
                });
            }
            return transitionSet;
        };
        StrictSuccessorGenerator.prototype.dispatchActionPrefixProcess = function (process) {
            var transitionSet = this.cache[process.id];
            if (!transitionSet) {
                transitionSet = this.cache[process.id] = new TransitionSet([new Transition(process.action, process.nextProcess)]);
            }
            return transitionSet;
        };
        StrictSuccessorGenerator.prototype.dispatchRestrictionProcess = function (process) {
            var _this = this;
            var transitionSet = this.cache[process.id], subTransitionSet;
            if (!transitionSet) {
                transitionSet = this.cache[process.id] = new TransitionSet();
                subTransitionSet = process.subProcess.dispatchOn(this).clone();
                subTransitionSet.applyRestrictionSet(process.restrictedLabels);
                subTransitionSet.forEach(function (transition) {
                    var newRestriction = _this.graph.newRestrictedProcess(transition.targetProcess, process.restrictedLabels);
                    transitionSet.add(new Transition(transition.action.clone(), newRestriction));
                });
            }
            return transitionSet;
        };
        StrictSuccessorGenerator.prototype.dispatchRelabellingProcess = function (process) {
            var _this = this;
            var transitionSet = this.cache[process.id], subTransitionSet;
            if (!transitionSet) {
                transitionSet = this.cache[process.id] = new TransitionSet();
                subTransitionSet = process.subProcess.dispatchOn(this).clone();
                subTransitionSet.applyRelabelSet(process.relabellings);
                subTransitionSet.forEach(function (transition) {
                    var newRelabelling = _this.graph.newRelabelingProcess(transition.targetProcess, process.relabellings);
                    transitionSet.add(new Transition(transition.action.clone(), newRelabelling));
                });
            }
            return transitionSet;
        };
        return StrictSuccessorGenerator;
    })();
    CCS.StrictSuccessorGenerator = StrictSuccessorGenerator;
    var GrowingIndexedArraySet = (function () {
        function GrowingIndexedArraySet() {
            this.elements = [];
        }
        GrowingIndexedArraySet.prototype.getOrAdd = function (element) {
            var result = element, index = this.indexOf(element);
            if (element === undefined || element === null)
                throw "Bad argument to getOrAdd";
            if (index === -1) {
                this.elements.push(element);
            }
            else {
                result = this.elements[index];
            }
            return result;
        };
        GrowingIndexedArraySet.prototype.get = function (index) {
            return index >= this.elements.length ? null : this.elements[index];
        };
        GrowingIndexedArraySet.prototype.indexOf = function (element) {
            for (var i = 0; i < this.elements.length; i++) {
                if (this.elements[i].equals(element))
                    return i;
            }
            return -1;
        };
        return GrowingIndexedArraySet;
    })();
    CCS.GrowingIndexedArraySet = GrowingIndexedArraySet;
    function getSuccGenerator(graph, options) {
        var settings = { inputMode: "CCS", succGen: "strong", reduce: true, time: "timed" }, succGenerator, treeReducer;
        for (var optionName in options) {
            settings[optionName] = options[optionName];
        }
        if (settings.inputMode === "CCS") {
            succGenerator = new StrictSuccessorGenerator(graph);
            if (settings.reduce) {
                treeReducer = new Traverse.ProcessTreeReducer(graph);
            }
        }
        else {
            succGenerator = new TCCS.StrictSuccessorGenerator(graph);
            if (settings.reduce) {
                treeReducer = new Traverse.TCCSProcessTreeReducer(graph);
            }
        }
        if (settings.reduce) {
            succGenerator = new Traverse.ReducingSuccessorGenerator(succGenerator, treeReducer);
        }
        if (settings.inputMode === "CCS") {
            if (settings.succGen === "weak") {
                succGenerator = new Traverse.WeakSuccessorGenerator(succGenerator);
            }
        }
        else {
            if (settings.succGen === "weak") {
                if (settings.time === "untimed") {
                    succGenerator = new Traverse.WeakUntimedSuccessorGenerator(succGenerator);
                }
                else {
                    succGenerator = new Traverse.WeakSuccessorGenerator(succGenerator);
                }
            }
            else {
                if (settings.time === "untimed") {
                    succGenerator = new Traverse.UntimedSuccessorGenerator(succGenerator);
                }
            }
        }
        return succGenerator;
    }
    CCS.getSuccGenerator = getSuccGenerator;
    function getNSuccessors(succGen, process, maxDepth) {
        var result = {}, queue = [[1, process]], depth, fromProcess, transitions;
        for (var i = 0; i < queue.length; i++) {
            depth = queue[i][0];
            fromProcess = queue[i][1];
            result[fromProcess.id] = transitions = succGen.getSuccessors(fromProcess.id);
            transitions.forEach(function (t) {
                if (!result[t.targetProcess.id] && depth < maxDepth) {
                    queue.push([depth + 1, t.targetProcess]);
                }
            });
        }
        return result;
    }
    CCS.getNSuccessors = getNSuccessors;
    function reachableProcessIterator(initialProcess, succGen) {
        var visitStack = [initialProcess], addedProcs = Object.create(null), iterator = {};
        addedProcs[initialProcess] = true;
        iterator.hasNext = function () { return visitStack.length > 0; };
        iterator.next = function () {
            var result = visitStack.pop();
            var targetProcs = succGen.getSuccessors(result);
            targetProcs.forEach(function (t) {
                var procId = t.targetProcess.id;
                if (!addedProcs[procId]) {
                    addedProcs[procId] = true;
                    visitStack.push(procId);
                }
            });
            return result;
        };
        return iterator;
    }
    CCS.reachableProcessIterator = reachableProcessIterator;
    function expandBFS(process, succGen, maxDepth) {
        var result = {}, queue = [[1, process]], depth, qIdx, fromProcess, transitions;
        for (qIdx = 0; qIdx < queue.length; qIdx++) {
            depth = queue[qIdx][0];
            fromProcess = queue[qIdx][1];
            result[fromProcess.id] = transitions = succGen.getSuccessors(fromProcess.id);
            transitions.forEach(function (t) {
                if (!result[t.targetProcess.id] && depth < maxDepth) {
                    queue.push([depth + 1, t.targetProcess]);
                }
            });
        }
        return result;
    }
    CCS.expandBFS = expandBFS;
})(CCS || (CCS = {}));
var Traverse;
(function (Traverse) {
    var ccs = CCS;
    var CollapsingSuccessorGenerator = (function () {
        function CollapsingSuccessorGenerator(succGenerator, collapse) {
            this.succGenerator = succGenerator;
            this.collapse = collapse;
            this.cache = {};
        }
        CollapsingSuccessorGenerator.prototype.getGraph = function () {
            return this.succGenerator.getGraph();
        };
        CollapsingSuccessorGenerator.prototype.getProcessByName = function (processName) {
            return this.succGenerator.getProcessByName(processName);
        };
        CollapsingSuccessorGenerator.prototype.getProcessById = function (processId) {
            return this.succGenerator.getProcessById(processId);
        };
        CollapsingSuccessorGenerator.prototype.getSuccessors = function (processId) {
            var _this = this;
            if (this.cache[processId])
                return this.cache[processId];
            var getRepresentative = this.collapse.getRepresentative;
            var collapseProcs = getRepresentative(processId).subProcesses;
            var result = new ccs.TransitionSet();
            collapseProcs.map(function (proc) { return _this.succGenerator.getSuccessors(proc.id); }).forEach(function (tSet) {
                tSet.forEach(function (transition) {
                    var targetRepr = getRepresentative(transition.targetProcess.id);
                    result.add(new ccs.Transition(transition.action, targetRepr));
                });
            });
            this.cache[processId] = result;
            return result;
        };
        CollapsingSuccessorGenerator.prototype.getCollapseForProcess = function (processId) {
            return this.collapse.getRepresentative(processId);
        };
        return CollapsingSuccessorGenerator;
    })();
    Traverse.CollapsingSuccessorGenerator = CollapsingSuccessorGenerator;
})(Traverse || (Traverse = {}));
var HML;
(function (HML) {
    var ccs = CCS;
    var AU = ArrayUtil;
    var DisjFormula = (function () {
        function DisjFormula(subFormulas) {
            this.subFormulas = subFormulas;
        }
        DisjFormula.prototype.dispatchOn = function (dispatcher) {
            return dispatcher.dispatchDisjFormula(this);
        };
        DisjFormula.prototype.toString = function () {
            if (this.hmlStr)
                return this.hmlStr;
            var subStrs = this.subFormulas.map(function (f) { return f.toString(); });
            return this.hmlStr = subStrs.map(function (f) { return "(" + f + ")"; }).join(" or ");
        };
        Object.defineProperty(DisjFormula.prototype, "id", {
            get: function () {
                return this.toString();
            },
            enumerable: true,
            configurable: true
        });
        return DisjFormula;
    })();
    HML.DisjFormula = DisjFormula;
    var ConjFormula = (function () {
        function ConjFormula(subFormulas) {
            this.subFormulas = subFormulas;
        }
        ConjFormula.prototype.dispatchOn = function (dispatcher) {
            return dispatcher.dispatchConjFormula(this);
        };
        ConjFormula.prototype.toString = function () {
            if (this.hmlStr)
                return this.hmlStr;
            var subStrs = this.subFormulas.map(function (f) { return f.toString(); });
            return this.hmlStr = subStrs.map(function (f) { return "(" + f + ")"; }).join(" and ");
        };
        Object.defineProperty(ConjFormula.prototype, "id", {
            get: function () {
                return this.toString();
            },
            enumerable: true,
            configurable: true
        });
        return ConjFormula;
    })();
    HML.ConjFormula = ConjFormula;
    var TrueFormula = (function () {
        function TrueFormula() {
        }
        TrueFormula.prototype.dispatchOn = function (dispatcher) {
            return dispatcher.dispatchTrueFormula(this);
        };
        TrueFormula.prototype.toString = function () {
            return "tt";
        };
        Object.defineProperty(TrueFormula.prototype, "id", {
            get: function () {
                return this.toString();
            },
            enumerable: true,
            configurable: true
        });
        return TrueFormula;
    })();
    HML.TrueFormula = TrueFormula;
    var FalseFormula = (function () {
        function FalseFormula() {
        }
        FalseFormula.prototype.dispatchOn = function (dispatcher) {
            return dispatcher.dispatchFalseFormula(this);
        };
        FalseFormula.prototype.toString = function () {
            return "ff";
        };
        Object.defineProperty(FalseFormula.prototype, "id", {
            get: function () {
                return this.toString();
            },
            enumerable: true,
            configurable: true
        });
        return FalseFormula;
    })();
    HML.FalseFormula = FalseFormula;
    var StrongExistsFormula = (function () {
        function StrongExistsFormula(actionMatcher, subFormula) {
            this.actionMatcher = actionMatcher;
            this.subFormula = subFormula;
        }
        StrongExistsFormula.prototype.dispatchOn = function (dispatcher) {
            return dispatcher.dispatchStrongExistsFormula(this);
        };
        StrongExistsFormula.prototype.toString = function () {
            if (this.hmlStr)
                return this.hmlStr;
            return this.hmlStr = "<" + this.actionMatcher.toString() + ">" + this.subFormula.toString();
        };
        Object.defineProperty(StrongExistsFormula.prototype, "id", {
            get: function () {
                return this.toString();
            },
            enumerable: true,
            configurable: true
        });
        return StrongExistsFormula;
    })();
    HML.StrongExistsFormula = StrongExistsFormula;
    var StrongForAllFormula = (function () {
        function StrongForAllFormula(actionMatcher, subFormula) {
            this.actionMatcher = actionMatcher;
            this.subFormula = subFormula;
        }
        StrongForAllFormula.prototype.dispatchOn = function (dispatcher) {
            return dispatcher.dispatchStrongForAllFormula(this);
        };
        StrongForAllFormula.prototype.toString = function () {
            if (this.hmlStr)
                return this.hmlStr;
            return this.hmlStr = "[" + this.actionMatcher.toString() + "]" + this.subFormula.toString();
        };
        Object.defineProperty(StrongForAllFormula.prototype, "id", {
            get: function () {
                return this.toString();
            },
            enumerable: true,
            configurable: true
        });
        return StrongForAllFormula;
    })();
    HML.StrongForAllFormula = StrongForAllFormula;
    var WeakExistsFormula = (function () {
        function WeakExistsFormula(actionMatcher, subFormula) {
            this.actionMatcher = actionMatcher;
            this.subFormula = subFormula;
        }
        WeakExistsFormula.prototype.dispatchOn = function (dispatcher) {
            return dispatcher.dispatchWeakExistsFormula(this);
        };
        WeakExistsFormula.prototype.toString = function () {
            if (this.hmlStr)
                return this.hmlStr;
            return this.hmlStr = "<<" + this.actionMatcher.toString() + ">>" + this.subFormula.toString();
        };
        Object.defineProperty(WeakExistsFormula.prototype, "id", {
            get: function () {
                return this.toString();
            },
            enumerable: true,
            configurable: true
        });
        return WeakExistsFormula;
    })();
    HML.WeakExistsFormula = WeakExistsFormula;
    var WeakForAllFormula = (function () {
        function WeakForAllFormula(actionMatcher, subFormula) {
            this.actionMatcher = actionMatcher;
            this.subFormula = subFormula;
        }
        WeakForAllFormula.prototype.dispatchOn = function (dispatcher) {
            return dispatcher.dispatchWeakForAllFormula(this);
        };
        WeakForAllFormula.prototype.toString = function () {
            if (this.hmlStr)
                return this.hmlStr;
            return this.hmlStr = "[[" + this.actionMatcher.toString() + "]]" + this.subFormula.toString();
        };
        Object.defineProperty(WeakForAllFormula.prototype, "id", {
            get: function () {
                return this.toString();
            },
            enumerable: true,
            configurable: true
        });
        return WeakForAllFormula;
    })();
    HML.WeakForAllFormula = WeakForAllFormula;
    var MinFixedPointFormula = (function () {
        function MinFixedPointFormula(variable, subFormula) {
            this.variable = variable;
            this.subFormula = subFormula;
        }
        MinFixedPointFormula.prototype.dispatchOn = function (dispatcher) {
            return dispatcher.dispatchMinFixedPointFormula(this);
        };
        MinFixedPointFormula.prototype.toString = function () {
            if (this.hmlStr)
                return this.hmlStr;
            return this.hmlStr = this.variable + " min= " + this.subFormula.toString();
        };
        Object.defineProperty(MinFixedPointFormula.prototype, "id", {
            get: function () {
                return this.toString();
            },
            enumerable: true,
            configurable: true
        });
        return MinFixedPointFormula;
    })();
    HML.MinFixedPointFormula = MinFixedPointFormula;
    var MaxFixedPointFormula = (function () {
        function MaxFixedPointFormula(variable, subFormula) {
            this.variable = variable;
            this.subFormula = subFormula;
        }
        MaxFixedPointFormula.prototype.dispatchOn = function (dispatcher) {
            return dispatcher.dispatchMaxFixedPointFormula(this);
        };
        MaxFixedPointFormula.prototype.toString = function () {
            if (this.hmlStr)
                return this.hmlStr;
            return this.hmlStr = this.variable + " max= " + this.subFormula.toString();
        };
        Object.defineProperty(MaxFixedPointFormula.prototype, "id", {
            get: function () {
                return this.toString();
            },
            enumerable: true,
            configurable: true
        });
        return MaxFixedPointFormula;
    })();
    HML.MaxFixedPointFormula = MaxFixedPointFormula;
    var VariableFormula = (function () {
        function VariableFormula(variable) {
            this.variable = variable;
        }
        VariableFormula.prototype.dispatchOn = function (dispatcher) {
            return dispatcher.dispatchVariableFormula(this);
        };
        VariableFormula.prototype.toString = function () {
            return this.variable;
        };
        Object.defineProperty(VariableFormula.prototype, "id", {
            get: function () {
                return this.toString();
            },
            enumerable: true,
            configurable: true
        });
        return VariableFormula;
    })();
    HML.VariableFormula = VariableFormula;
    function compareStrings(strA, strB) {
        return strA.toString().localeCompare(strB.toString());
    }
    var FormulaSet = (function () {
        function FormulaSet() {
            this.topFormula = null;
            this.formulas = Object.create(null);
            this.topLevelFormulas = [];
            this.undefinedVariables = [];
            this.errors = [];
            this.falseFormula = new FalseFormula();
            this.trueFormula = new TrueFormula();
            this.actionMatchers = new ccs.GrowingIndexedArraySet();
        }
        FormulaSet.prototype.newDisj = function (formulas) {
            var subFormulas = AU.sortAndRemoveDuplicates(formulas, function (f) { return f.id; });
            var formula = new DisjFormula(subFormulas);
            return this.formulas[formula.id] = formula;
        };
        FormulaSet.prototype.newConj = function (formulas) {
            var subFormulas = AU.sortAndRemoveDuplicates(formulas, function (f) { return f.id; });
            var formula = new ConjFormula(subFormulas);
            return this.formulas[formula.id] = formula;
        };
        FormulaSet.prototype.newTrue = function () {
            return this.trueFormula;
        };
        FormulaSet.prototype.newFalse = function () {
            return this.falseFormula;
        };
        FormulaSet.prototype.newExistOrForAll = function (structuralPrefix, constructor, actionMatcher, subFormula) {
            var uniqActionMatcher = this.actionMatchers.getOrAdd(actionMatcher);
            var formula = new constructor(uniqActionMatcher, subFormula);
            return this.formulas[formula.id] = formula;
        };
        FormulaSet.prototype.newStrongExists = function (actionMatcher, subFormula) {
            return this.newExistOrForAll("SE", StrongExistsFormula, actionMatcher, subFormula);
        };
        FormulaSet.prototype.newStrongForAll = function (actionMatcher, subFormula) {
            return this.newExistOrForAll("SFA", StrongForAllFormula, actionMatcher, subFormula);
        };
        FormulaSet.prototype.newWeakExists = function (actionMatcher, subFormula) {
            return this.newExistOrForAll("WE", WeakExistsFormula, actionMatcher, subFormula);
        };
        FormulaSet.prototype.newWeakForAll = function (actionMatcher, subFormula) {
            return this.newExistOrForAll("WFA", WeakForAllFormula, actionMatcher, subFormula);
        };
        FormulaSet.prototype.newMinFixedPoint = function (variable, subFormula) {
            var result = new MinFixedPointFormula(variable, subFormula);
            if (this.formulaByName(variable)) {
                this.errors.push({ name: "DuplicateDefinition", message: "The variable '" + variable + "' is defined multiple times." });
            }
            else {
                this.topLevelFormulas.push(result);
                var undefinedIndex = this.undefinedVariables.indexOf(variable);
                if (undefinedIndex !== -1) {
                    this.undefinedVariables.splice(undefinedIndex, 1);
                }
                this.formulas[result.id] = result;
            }
            return result;
        };
        FormulaSet.prototype.newMaxFixedPoint = function (variable, subFormula) {
            var result = new MaxFixedPointFormula(variable, subFormula);
            if (this.formulaByName(variable)) {
                this.errors.push({ name: "DuplicateDefinition", message: "The variable '" + variable + "' is defined multiple times." });
            }
            else {
                this.topLevelFormulas.push(result);
                var undefinedIndex = this.undefinedVariables.indexOf(variable);
                if (undefinedIndex !== -1) {
                    this.undefinedVariables.splice(undefinedIndex, 1);
                }
                this.formulas[result.id] = result;
            }
            return result;
        };
        FormulaSet.prototype.unnamedMinFixedPoint = function (formula) {
            this.topLevelFormulas.push(formula);
            return this.addFormula(formula);
        };
        FormulaSet.prototype.referVariable = function (variable) {
            if (!this.formulaByName(variable) && this.undefinedVariables.indexOf(variable) === -1) {
                this.undefinedVariables.push(variable);
            }
            return new VariableFormula(variable);
        };
        FormulaSet.prototype.addFormula = function (formula) {
            return this.formulas[formula.id] = formula;
        };
        FormulaSet.prototype.getErrors = function () {
            var errors = this.errors.slice(0);
            this.undefinedVariables.forEach(function (variable) {
                errors.push({ name: "UndefinedVariable", message: "The variable '" + variable + "' has not been defined." });
            });
            if (errors.length === 0) {
                var cycleChecker = new ReferenceCycleChecker();
                Array.prototype.push.apply(errors, cycleChecker.check(this));
            }
            return errors;
        };
        FormulaSet.prototype.formulaByName = function (variable) {
            var allTopFormulas = this.getTopLevelFormulas();
            for (var i = 0; i < allTopFormulas.length; i++) {
                var allVariable = allTopFormulas[i].variable;
                if (allVariable === variable) {
                    return allTopFormulas[i];
                }
            }
            return null;
        };
        FormulaSet.prototype.getVariables = function () {
            var variables = [], allTopFormulas = this.getTopLevelFormulas();
            for (var i = 0; i < allTopFormulas.length; i++) {
                var variable = allTopFormulas[i].variable;
                if (variable) {
                    variables.push(variable);
                }
            }
            return variables;
        };
        FormulaSet.prototype.getTopLevelFormulas = function () {
            return this.topLevelFormulas.slice();
        };
        FormulaSet.prototype.getTopFormula = function () {
            return this.topFormula;
        };
        FormulaSet.prototype.setTopFormula = function (formula) {
            this.topFormula = formula;
        };
        FormulaSet.prototype.map = function (fn) {
            var newSet = new FormulaSet(), formulaDict = this.formulas, allFormulas = Object.keys(formulaDict).map(function (f) { return formulaDict[f]; });
            allFormulas.forEach(function (formula) {
                newSet.addFormula(fn(formula));
            });
            return newSet;
        };
        return FormulaSet;
    })();
    HML.FormulaSet = FormulaSet;
    var ReferenceCycleChecker = (function () {
        function ReferenceCycleChecker() {
            this.hasSeen = [];
        }
        ReferenceCycleChecker.prototype.hasSeenButNotIn = function (variable) {
            var index = this.hasSeen.indexOf(variable);
            return index >= 0 && index < this.hasSeen.length - 1;
        };
        ReferenceCycleChecker.prototype.isInside = function (variable) {
            return this.hasSeen.length > 0 ? (this.hasSeen[this.hasSeen.length - 1] === variable) : false;
        };
        ReferenceCycleChecker.prototype.check = function (formulaSet) {
            var _this = this;
            var errors = [];
            this.formulaSet = formulaSet;
            var variables = formulaSet.getVariables();
            variables.forEach(function (variable) {
                if (formulaSet.formulaByName(variable).dispatchOn(_this)) {
                    errors.push({ name: "NonAcyclicVariable", message: "The variable '" + variable + "' is not acyclic" });
                }
            });
            this.formulaSet = null;
            return errors;
        };
        ReferenceCycleChecker.prototype.dispatchDisjFormula = function (formula) {
            var _this = this;
            var result = false;
            formula.subFormulas.forEach(function (subFormula) {
                result = result || subFormula.dispatchOn(_this);
            });
            return !!result;
        };
        ReferenceCycleChecker.prototype.dispatchConjFormula = function (formula) {
            var _this = this;
            var result = false;
            formula.subFormulas.forEach(function (subFormula) {
                result = result || subFormula.dispatchOn(_this);
            });
            return !!result;
        };
        ReferenceCycleChecker.prototype.dispatchTrueFormula = function (formula) {
            return false;
        };
        ReferenceCycleChecker.prototype.dispatchFalseFormula = function (formula) {
            return false;
        };
        ReferenceCycleChecker.prototype.dispatchStrongExistsFormula = function (formula) {
            return formula.subFormula.dispatchOn(this);
        };
        ReferenceCycleChecker.prototype.dispatchStrongForAllFormula = function (formula) {
            return formula.subFormula.dispatchOn(this);
        };
        ReferenceCycleChecker.prototype.dispatchWeakExistsFormula = function (formula) {
            return formula.subFormula.dispatchOn(this);
        };
        ReferenceCycleChecker.prototype.dispatchWeakForAllFormula = function (formula) {
            return formula.subFormula.dispatchOn(this);
        };
        ReferenceCycleChecker.prototype.dispatchMinFixedPointFormula = function (formula) {
            if (this.hasSeenButNotIn(formula.variable))
                return true;
            if (this.isInside(formula.variable))
                return false;
            this.hasSeen.push(formula.variable);
            var result = formula.subFormula.dispatchOn(this);
            this.hasSeen.pop();
            return result;
        };
        ReferenceCycleChecker.prototype.dispatchMaxFixedPointFormula = function (formula) {
            if (this.hasSeenButNotIn(formula.variable))
                return true;
            if (this.isInside(formula.variable))
                return false;
            this.hasSeen.push(formula.variable);
            var result = formula.subFormula.dispatchOn(this);
            this.hasSeen.pop();
            return result;
        };
        ReferenceCycleChecker.prototype.dispatchVariableFormula = function (formula) {
            return this.formulaSet.formulaByName(formula.variable).dispatchOn(this);
        };
        return ReferenceCycleChecker;
    })();
    var SingleActionMatcher = (function () {
        function SingleActionMatcher(action) {
            this.action = action;
        }
        SingleActionMatcher.prototype.matches = function (action) {
            return this.action.equals(action);
        };
        SingleActionMatcher.prototype.add = function (action) {
            return new ArrayActionMatcher([this.action, action]);
        };
        SingleActionMatcher.prototype.equals = function (other) {
            if (!(other instanceof SingleActionMatcher))
                return false;
            return this.action.equals(other.action);
        };
        SingleActionMatcher.prototype.toString = function (formatComplement) {
            if (formatComplement === void 0) { formatComplement = true; }
            return this.action.toString(formatComplement);
        };
        return SingleActionMatcher;
    })();
    HML.SingleActionMatcher = SingleActionMatcher;
    var ArrayActionMatcher = (function () {
        function ArrayActionMatcher(actions) {
            var _this = this;
            this.actions = [];
            this.actions = actions.slice();
            this.actions.forEach(function (action) {
                if (!_this.matches(action)) {
                    _this.actions.push(action);
                }
            });
            this.sortActions();
        }
        ArrayActionMatcher.prototype.sortActions = function () {
            function compareActions(actLeft, actRight) {
                if (actLeft.complement !== actRight.complement)
                    return !actLeft.complement ? -1 : 1;
                if (actLeft.label !== actRight.label)
                    return actLeft.label < actRight.label ? -1 : 1;
                return 0;
            }
            this.actions.sort(compareActions);
        };
        ArrayActionMatcher.prototype.matches = function (action) {
            for (var i = 0; i < this.actions.length; i++) {
                if (this.actions[i].equals(action)) {
                    return true;
                }
            }
            return false;
        };
        ArrayActionMatcher.prototype.add = function (action) {
            var matcher = new ArrayActionMatcher([]);
            matcher.actions = this.actions.slice(0);
            if (!matcher.matches(action)) {
                matcher.actions.push(action);
                matcher.sortActions();
            }
            return matcher;
        };
        ArrayActionMatcher.prototype.equals = function (other) {
            if (!(other instanceof ArrayActionMatcher))
                return false;
            if (this.actions.length !== other.actions.length)
                return false;
            for (var i = 0, len = this.actions.length; i < len; i++) {
                if (!this.actions[i].equals(other.actions[i]))
                    return false;
            }
            return true;
        };
        ArrayActionMatcher.prototype.toString = function (formatComplement) {
            if (formatComplement === void 0) { formatComplement = true; }
            return this.actions.map(function (action) { return action.toString(formatComplement); }).join(",");
        };
        return ArrayActionMatcher;
    })();
    HML.ArrayActionMatcher = ArrayActionMatcher;
    var AllActionMatcher = (function () {
        function AllActionMatcher() {
        }
        AllActionMatcher.prototype.matches = function (action) {
            return true;
        };
        AllActionMatcher.prototype.equals = function (other) {
            return other instanceof AllActionMatcher;
        };
        AllActionMatcher.prototype.toString = function () {
            return "-";
        };
        return AllActionMatcher;
    })();
    HML.AllActionMatcher = AllActionMatcher;
})(HML || (HML = {}));
var Traverse;
(function (Traverse) {
    var ccs = CCS;
    var hml = HML;
    var LabelledBracketNotation = (function () {
        function LabelledBracketNotation() {
            this.recurseOnceForNamedProcess = undefined;
        }
        LabelledBracketNotation.prototype.visit = function (process) {
            this.stringPieces = [];
            if (process instanceof ccs.NamedProcess) {
                this.recurseOnceForNamedProcess = process.name;
            }
            process.dispatchOn(this);
            return this.stringPieces.join(" ");
        };
        LabelledBracketNotation.prototype.dispatchNullProcess = function (process) {
            this.stringPieces.push("[0]");
        };
        LabelledBracketNotation.prototype.dispatchNamedProcess = function (process) {
            if (process.name === this.recurseOnceForNamedProcess) {
                this.recurseOnceForNamedProcess = undefined;
                this.stringPieces.push("[NamedProcess");
                this.stringPieces.push(process.name + " =");
                process.subProcess.dispatchOn(this);
                this.stringPieces.push("]");
            }
            else {
                this.stringPieces.push("[ConstantProcess " + process.name + "]");
            }
        };
        LabelledBracketNotation.prototype.dispatchSummationProcess = function (process) {
            var _this = this;
            this.stringPieces.push("[Summation");
            process.subProcesses.forEach(function (subProc) {
                subProc.dispatchOn(_this);
            });
            this.stringPieces.push("]");
        };
        LabelledBracketNotation.prototype.dispatchCompositionProcess = function (process) {
            var _this = this;
            this.stringPieces.push("[Composition");
            process.subProcesses.forEach(function (subProc) {
                subProc.dispatchOn(_this);
            });
            this.stringPieces.push("]");
        };
        LabelledBracketNotation.prototype.dispatchActionPrefixProcess = function (process) {
            this.stringPieces.push("[ActionPrefix");
            this.stringPieces.push(process.action.toString() + ".");
            process.nextProcess.dispatchOn(this);
            this.stringPieces.push("]");
        };
        LabelledBracketNotation.prototype.dispatchRestrictionProcess = function (process) {
            this.stringPieces.push("[Restriction");
            process.subProcess.dispatchOn(this);
            var labels = [];
            process.restrictedLabels.forEach(function (l) { return labels.push(l); });
            this.stringPieces.push("\\ (" + labels.join(",") + ")]");
        };
        LabelledBracketNotation.prototype.dispatchRelabellingProcess = function (process) {
            this.stringPieces.push("[Relabelling");
            process.subProcess.dispatchOn(this);
            var relabels = [];
            process.relabellings.forEach(function (f, t) { return relabels.push(t + "/" + f); });
            this.stringPieces.push(" (" + relabels.join(",") + ")]");
        };
        return LabelledBracketNotation;
    })();
    Traverse.LabelledBracketNotation = LabelledBracketNotation;
    var SizeOfProcessTreeVisitor = (function () {
        function SizeOfProcessTreeVisitor() {
        }
        SizeOfProcessTreeVisitor.prototype.visit = function (process) {
            return process.dispatchOn(this);
        };
        SizeOfProcessTreeVisitor.prototype.dispatchNullProcess = function (process) {
            return 1;
        };
        SizeOfProcessTreeVisitor.prototype.dispatchNamedProcess = function (process) {
            return 1;
        };
        SizeOfProcessTreeVisitor.prototype.dispatchSummationProcess = function (process) {
            var _this = this;
            var sum = 1;
            process.subProcesses.forEach(function (subProc) {
                sum += subProc.dispatchOn(_this);
            });
            return sum;
        };
        SizeOfProcessTreeVisitor.prototype.dispatchCompositionProcess = function (process) {
            var _this = this;
            var sum = 1;
            process.subProcesses.forEach(function (subProc) {
                sum += subProc.dispatchOn(_this);
            });
            return sum;
        };
        SizeOfProcessTreeVisitor.prototype.dispatchActionPrefixProcess = function (process) {
            return 1 + process.nextProcess.dispatchOn(this);
        };
        SizeOfProcessTreeVisitor.prototype.dispatchRestrictionProcess = function (process) {
            return 1 + process.subProcess.dispatchOn(this);
        };
        SizeOfProcessTreeVisitor.prototype.dispatchRelabellingProcess = function (process) {
            return 1 + process.subProcess.dispatchOn(this);
        };
        return SizeOfProcessTreeVisitor;
    })();
    Traverse.SizeOfProcessTreeVisitor = SizeOfProcessTreeVisitor;
    function wrapIfInstanceOf(stringRepr, object, classes) {
        for (var i = 0; i < classes.length; i++) {
            if (object instanceof classes[i]) {
                return "(" + stringRepr + ")";
            }
        }
        return stringRepr;
    }
    Traverse.wrapIfInstanceOf = wrapIfInstanceOf;
    var CCSNotationVisitor = (function () {
        function CCSNotationVisitor() {
            this.insideNamedProcess = undefined;
            this.clearCache();
        }
        CCSNotationVisitor.prototype.clearCache = function () {
            this.cache = {};
        };
        CCSNotationVisitor.prototype.visit = function (process) {
            return process.dispatchOn(this);
        };
        CCSNotationVisitor.prototype.dispatchNullProcess = function (process) {
            return this.cache[process.id] = "0";
        };
        CCSNotationVisitor.prototype.dispatchNamedProcess = function (process) {
            var result = this.cache[process.id];
            if (!result) {
                result = this.cache[process.id] = process.name;
            }
            return result;
        };
        CCSNotationVisitor.prototype.dispatchSummationProcess = function (process) {
            var _this = this;
            var result = this.cache[process.id], subStr;
            if (!result) {
                subStr = process.subProcesses.map(function (subProc) { return subProc.dispatchOn(_this); });
                result = this.cache[process.id] = subStr.join(" + ");
            }
            return result;
        };
        CCSNotationVisitor.prototype.dispatchCompositionProcess = function (process) {
            var _this = this;
            var result = this.cache[process.id], subStr;
            if (!result) {
                subStr = process.subProcesses.map(function (subProc) {
                    var unwrapped = subProc.dispatchOn(_this);
                    return wrapIfInstanceOf(unwrapped, subProc, [ccs.SummationProcess]);
                });
                result = this.cache[process.id] = subStr.join(" | ");
            }
            return result;
        };
        CCSNotationVisitor.prototype.dispatchActionPrefixProcess = function (process) {
            var result = this.cache[process.id], subStr;
            if (!result) {
                subStr = process.nextProcess.dispatchOn(this);
                subStr = wrapIfInstanceOf(subStr, process.nextProcess, [ccs.SummationProcess, ccs.CompositionProcess]);
                result = this.cache[process.id] = process.action.toString(true) + "." + subStr;
            }
            return result;
        };
        CCSNotationVisitor.prototype.dispatchRestrictionProcess = function (process) {
            var result = this.cache[process.id], subStr, labels;
            if (!result) {
                subStr = process.subProcess.dispatchOn(this);
                subStr = wrapIfInstanceOf(subStr, process.subProcess, [ccs.SummationProcess, ccs.CompositionProcess, ccs.ActionPrefixProcess]);
                labels = process.restrictedLabels.toArray();
                result = this.cache[process.id] = subStr + " \\ {" + labels.join(", ") + "}";
            }
            return result;
        };
        CCSNotationVisitor.prototype.dispatchRelabellingProcess = function (process) {
            var result = this.cache[process.id], subStr, relabels;
            if (!result) {
                subStr = process.subProcess.dispatchOn(this);
                subStr = wrapIfInstanceOf(subStr, process.subProcess, [ccs.SummationProcess, ccs.CompositionProcess, ccs.ActionPrefixProcess]);
                relabels = [];
                process.relabellings.forEach(function (from, to) {
                    relabels.push(to + "/" + from);
                });
                result = this.cache[process.id] = subStr + " [" + relabels.join(",") + "]";
            }
            return result;
        };
        CCSNotationVisitor.prototype.dispatchCollapsedProcess = function (process) {
            var result = this.cache[process.id];
            if (!result) {
                result = "{" + process.subProcesses.map(function (subProc) { return subProc instanceof ccs.NamedProcess ? subProc.name : subProc.id; }).join(", ") + "}";
            }
            return result;
        };
        return CCSNotationVisitor;
    })();
    Traverse.CCSNotationVisitor = CCSNotationVisitor;
    function safeHtml(str) {
        var entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "\"": "&quot;",
            "'": "&#x27;",
            "/": "&#x2F;"
        };
        return str.replace(/[&<>"'\/]/g, function (symbol) { return entities[symbol] || symbol; });
    }
    Traverse.safeHtml = safeHtml;
    var HMLNotationVisitor = (function () {
        function HMLNotationVisitor(showSemicolon, formatComplement, safeHtml) {
            if (showSemicolon === void 0) { showSemicolon = true; }
            if (formatComplement === void 0) { formatComplement = true; }
            if (safeHtml === void 0) { safeHtml = true; }
            this.showSemicolon = showSemicolon;
            this.formatComplement = formatComplement;
            this.safeHtml = safeHtml;
            this.clearCache();
        }
        HMLNotationVisitor.prototype.clearCache = function () {
            this.cache = Object.create(null);
        };
        HMLNotationVisitor.prototype.visit = function (formula) {
            if (this.showSemicolon) {
                return formula.dispatchOn(this) + ";";
            }
            else {
                return formula.dispatchOn(this);
            }
        };
        HMLNotationVisitor.prototype.dispatchDisjFormula = function (formula) {
            var _this = this;
            var result = this.cache[formula.id];
            if (!result) {
                var subStrs = formula.subFormulas.map(function (subF) { return subF.dispatchOn(_this); });
                result = this.cache[formula.id] = subStrs.join(" or ");
            }
            return result;
        };
        HMLNotationVisitor.prototype.dispatchConjFormula = function (formula) {
            var _this = this;
            var result = this.cache[formula.id];
            if (!result) {
                var subStrs = formula.subFormulas.map(function (subF) {
                    var unwrapped = subF.dispatchOn(_this);
                    return wrapIfInstanceOf(unwrapped, subF, [hml.DisjFormula]);
                });
                result = this.cache[formula.id] = subStrs.join(" and ");
            }
            return result;
        };
        HMLNotationVisitor.prototype.dispatchTrueFormula = function (formula) {
            var result = this.cache[formula.id];
            if (!result) {
                result = this.cache[formula.id] = "tt";
            }
            return result;
        };
        HMLNotationVisitor.prototype.dispatchFalseFormula = function (formula) {
            var result = this.cache[formula.id];
            if (!result) {
                result = this.cache[formula.id] = "ff";
            }
            return result;
        };
        HMLNotationVisitor.prototype.dispatchStrongExistsFormula = function (formula) {
            var result = this.cache[formula.id];
            if (!result) {
                var subStr = formula.subFormula.dispatchOn(this);
                var starting = "<";
                var closing = ">";
                if (this.safeHtml) {
                    starting = safeHtml(starting);
                    closing = safeHtml(closing);
                }
                result = this.cache[formula.id] = starting + formula.actionMatcher.toString(this.formatComplement) + closing + wrapIfInstanceOf(subStr, formula.subFormula, [hml.DisjFormula, hml.ConjFormula]);
            }
            return result;
        };
        HMLNotationVisitor.prototype.dispatchStrongForAllFormula = function (formula) {
            var result = this.cache[formula.id];
            if (!result) {
                var subStr = formula.subFormula.dispatchOn(this);
                var starting = "[";
                var closing = "]";
                if (this.safeHtml) {
                    starting = safeHtml(starting);
                    closing = safeHtml(closing);
                }
                result = this.cache[formula.id] = starting + formula.actionMatcher.toString(this.formatComplement) + closing + wrapIfInstanceOf(subStr, formula.subFormula, [hml.DisjFormula, hml.ConjFormula]);
            }
            return result;
        };
        HMLNotationVisitor.prototype.dispatchWeakExistsFormula = function (formula) {
            var result = this.cache[formula.id];
            if (!result) {
                var subStr = formula.subFormula.dispatchOn(this);
                var starting = "<<";
                var closing = ">>";
                if (this.safeHtml) {
                    starting = safeHtml(starting);
                    closing = safeHtml(closing);
                }
                result = this.cache[formula.id] = starting + formula.actionMatcher.toString(this.formatComplement) + closing + wrapIfInstanceOf(subStr, formula.subFormula, [hml.DisjFormula, hml.ConjFormula]);
            }
            return result;
        };
        HMLNotationVisitor.prototype.dispatchWeakForAllFormula = function (formula) {
            var result = this.cache[formula.id];
            if (!result) {
                var subStr = formula.subFormula.dispatchOn(this);
                var starting = "[[";
                var closing = "]]";
                if (this.safeHtml) {
                    starting = safeHtml(starting);
                    closing = safeHtml(closing);
                }
                result = this.cache[formula.id] = starting + formula.actionMatcher.toString(this.formatComplement) + closing + wrapIfInstanceOf(subStr, formula.subFormula, [hml.DisjFormula, hml.ConjFormula]);
            }
            return result;
        };
        HMLNotationVisitor.prototype.dispatchMinFixedPointFormula = function (formula) {
            var result = this.cache[formula.id];
            if (!result) {
                var subStr = formula.subFormula.dispatchOn(this);
                result = this.cache[formula.id] = formula.variable + " min= " + subStr;
            }
            return result;
        };
        HMLNotationVisitor.prototype.dispatchMaxFixedPointFormula = function (formula) {
            var result = this.cache[formula.id];
            if (!result) {
                var subStr = formula.subFormula.dispatchOn(this);
                result = this.cache[formula.id] = formula.variable + " max= " + subStr;
            }
            return result;
        };
        HMLNotationVisitor.prototype.dispatchVariableFormula = function (formula) {
            var result = this.cache[formula.id];
            if (!result) {
                result = this.cache[formula.id] = formula.variable;
            }
            return result;
        };
        return HMLNotationVisitor;
    })();
    Traverse.HMLNotationVisitor = HMLNotationVisitor;
    var HMLSuccGenVisitor = (function () {
        function HMLSuccGenVisitor(hmlFormulaSet) {
            this.hmlFormulaSet = hmlFormulaSet;
            this.isFirst = true;
        }
        HMLSuccGenVisitor.prototype.visit = function (formula) {
            return formula.dispatchOn(this);
        };
        HMLSuccGenVisitor.prototype.isFirstFormula = function () {
            if (this.isFirst) {
                this.isFirst = !this.isFirst;
                return true;
            }
            return false;
        };
        HMLSuccGenVisitor.prototype.dispatchDisjFormula = function (formula) {
            return formula.subFormulas;
        };
        HMLSuccGenVisitor.prototype.dispatchConjFormula = function (formula) {
            return formula.subFormulas;
        };
        HMLSuccGenVisitor.prototype.dispatchTrueFormula = function (formula) {
            var result = [];
            result.push(null);
            return result;
        };
        HMLSuccGenVisitor.prototype.dispatchFalseFormula = function (formula) {
            var result = [];
            result.push(null);
            return result;
        };
        HMLSuccGenVisitor.prototype.dispatchStrongExistsFormula = function (formula) {
            var result = [];
            result.push(formula.subFormula);
            return result;
        };
        HMLSuccGenVisitor.prototype.dispatchStrongForAllFormula = function (formula) {
            var result = [];
            result.push(formula.subFormula);
            return result;
        };
        HMLSuccGenVisitor.prototype.dispatchWeakExistsFormula = function (formula) {
            var result = [];
            result.push(formula.subFormula);
            return result;
        };
        HMLSuccGenVisitor.prototype.dispatchWeakForAllFormula = function (formula) {
            var result = [];
            result.push(formula.subFormula);
            return result;
        };
        HMLSuccGenVisitor.prototype.dispatchMinFixedPointFormula = function (formula) {
            var result = [];
            result.push(formula.subFormula);
            return result;
        };
        HMLSuccGenVisitor.prototype.dispatchMaxFixedPointFormula = function (formula) {
            var result = [];
            result.push(formula.subFormula);
            return result;
        };
        HMLSuccGenVisitor.prototype.dispatchVariableFormula = function (formula) {
            var result = [];
            var namedFormulaDef = this.hmlFormulaSet.formulaByName(formula.variable);
            if (namedFormulaDef) {
                result.push(namedFormulaDef.subFormula);
            }
            else {
                throw "HML variable " + formula.variable + " has no definition";
            }
            return result;
        };
        return HMLSuccGenVisitor;
    })();
    Traverse.HMLSuccGenVisitor = HMLSuccGenVisitor;
    var HMLSimplifier = (function () {
        function HMLSimplifier() {
        }
        HMLSimplifier.prototype.visit = function (formulaSet) {
            var _this = this;
            this.prevSet = formulaSet;
            var result = formulaSet.map(function (formula) { return formula.dispatchOn(_this); });
            this.prevSet = null;
            return result;
        };
        HMLSimplifier.prototype.visitVariableFreeFormula = function (formula) {
            this.prevSet = new hml.FormulaSet();
            var result = formula.dispatchOn(this);
            this.prevSet = null;
            return result;
        };
        HMLSimplifier.prototype.dispatchDisjFormula = function (formula) {
            var _this = this;
            var subFormulas = formula.subFormulas.map(function (subF) { return subF.dispatchOn(_this); });
            return subFormulas.length > 1 ? this.prevSet.newDisj(subFormulas) : subFormulas[0];
        };
        HMLSimplifier.prototype.dispatchConjFormula = function (formula) {
            var _this = this;
            var subFormulas = formula.subFormulas.map(function (subF) { return subF.dispatchOn(_this); });
            return subFormulas.length > 1 ? this.prevSet.newConj(subFormulas) : subFormulas[0];
        };
        HMLSimplifier.prototype.dispatchTrueFormula = function (formula) {
            return this.prevSet.newTrue();
        };
        HMLSimplifier.prototype.dispatchFalseFormula = function (formula) {
            return this.prevSet.newFalse();
        };
        HMLSimplifier.prototype.dispatchStrongExistsFormula = function (formula) {
            var subFormula = formula.subFormula.dispatchOn(this);
            return this.prevSet.newStrongExists(formula.actionMatcher, subFormula);
        };
        HMLSimplifier.prototype.dispatchStrongForAllFormula = function (formula) {
            var subFormula = formula.subFormula.dispatchOn(this);
            return this.prevSet.newStrongForAll(formula.actionMatcher, subFormula);
        };
        HMLSimplifier.prototype.dispatchWeakExistsFormula = function (formula) {
            var subFormula = formula.subFormula.dispatchOn(this);
            if (subFormula instanceof hml.WeakExistsFormula) {
                if (formula.actionMatcher instanceof hml.SingleActionMatcher && formula.actionMatcher.matches(new CCS.Action("tau", false))) {
                    return subFormula;
                }
                else if (subFormula.actionMatcher instanceof hml.SingleActionMatcher && subFormula.actionMatcher.matches(new CCS.Action("tau", false))) {
                    return this.prevSet.newWeakExists(formula.actionMatcher, subFormula.subFormula);
                }
            }
            return this.prevSet.newWeakExists(formula.actionMatcher, subFormula);
        };
        HMLSimplifier.prototype.dispatchWeakForAllFormula = function (formula) {
            var subFormula = formula.subFormula.dispatchOn(this);
            if (subFormula instanceof hml.WeakForAllFormula) {
                if (formula.actionMatcher instanceof hml.SingleActionMatcher && formula.actionMatcher.matches(new CCS.Action("tau", false))) {
                    return subFormula;
                }
                else if (subFormula.actionMatcher instanceof hml.SingleActionMatcher && subFormula.actionMatcher.matches(new CCS.Action("tau", false))) {
                    return this.prevSet.newWeakForAll(formula.actionMatcher, subFormula.subFormula);
                }
            }
            return this.prevSet.newWeakForAll(formula.actionMatcher, subFormula);
        };
        HMLSimplifier.prototype.dispatchMinFixedPointFormula = function (formula) {
            var subFormula = formula.subFormula.dispatchOn(this);
            return this.prevSet.newMinFixedPoint(formula.variable, subFormula);
        };
        HMLSimplifier.prototype.dispatchMaxFixedPointFormula = function (formula) {
            var subFormula = formula.subFormula.dispatchOn(this);
            return this.prevSet.newMaxFixedPoint(formula.variable, subFormula);
        };
        HMLSimplifier.prototype.dispatchVariableFormula = function (formula) {
            return this.prevSet.referVariable(formula.variable);
        };
        return HMLSimplifier;
    })();
    Traverse.HMLSimplifier = HMLSimplifier;
})(Traverse || (Traverse = {}));
var DependencyGraph;
(function (DependencyGraph) {
    function copyHyperEdges(hyperEdges) {
        var result = [];
        for (var i = 0; i < hyperEdges.length; i++) {
            result.push(hyperEdges[i].slice(0));
        }
        return result;
    }
    DependencyGraph.copyHyperEdges = copyHyperEdges;
    var MuCalculusNode = (function () {
        function MuCalculusNode(process, formula, isMin) {
            this.process = process;
            this.formula = formula;
            this.isMin = isMin;
            if (isMin == undefined) {
                this.isMin = true;
            }
        }
        MuCalculusNode.prototype.toString = function () {
            return [this.isMin ? "MIN" : "MAX", this.process.toString(), this.formula.toString()].join("@");
        };
        Object.defineProperty(MuCalculusNode.prototype, "id", {
            get: function () {
                return this.toString();
            },
            enumerable: true,
            configurable: true
        });
        MuCalculusNode.prototype.newWithProcess = function (process) {
            return new MuCalculusNode(process, this.formula, this.isMin);
        };
        MuCalculusNode.prototype.newWithMinMax = function (value) {
            return new MuCalculusNode(this.process, this.formula, value);
        };
        MuCalculusNode.prototype.newWithFormula = function (formula) {
            return new MuCalculusNode(this.process, formula, this.isMin);
        };
        return MuCalculusNode;
    })();
    DependencyGraph.MuCalculusNode = MuCalculusNode;
    var MuCalculusDG = (function () {
        function MuCalculusDG(strongSuccGen, weakSuccGen, formulaSet) {
            this.strongSuccGen = strongSuccGen;
            this.weakSuccGen = weakSuccGen;
            this.formulaSet = formulaSet;
            this.variableEdges = {};
            this.maxFixPoints = {};
            this.calculator = null;
        }
        MuCalculusDG.prototype.getHyperEdges = function (node) {
            this.currentNode = node;
            return node.formula.dispatchOn(this);
        };
        MuCalculusDG.prototype.dispatchDisjFormula = function (formula) {
            var _this = this;
            var hyperEdges = [];
            if (this.currentNode.isMin) {
                formula.subFormulas.forEach(function (subFormula) {
                    hyperEdges.push([_this.currentNode.newWithFormula(subFormula)]);
                });
            }
            else {
                var targetNodes = [];
                formula.subFormulas.forEach(function (subFormula) {
                    targetNodes.push(_this.currentNode.newWithFormula(subFormula));
                });
                hyperEdges.push(targetNodes);
            }
            return hyperEdges;
        };
        MuCalculusDG.prototype.dispatchConjFormula = function (formula) {
            var _this = this;
            var hyperEdges = [];
            if (this.currentNode.isMin) {
                var targetNodes = [];
                formula.subFormulas.forEach(function (subFormula) {
                    targetNodes.push(_this.currentNode.newWithFormula(subFormula));
                });
                hyperEdges.push(targetNodes);
            }
            else {
                formula.subFormulas.forEach(function (subFormula) {
                    hyperEdges.push([_this.currentNode.newWithFormula(subFormula)]);
                });
            }
            return hyperEdges;
        };
        MuCalculusDG.prototype.dispatchTrueFormula = function (formula) {
            if (this.currentNode.isMin) {
                return [[]];
            }
            else {
                return [];
            }
        };
        MuCalculusDG.prototype.dispatchFalseFormula = function (formula) {
            if (this.currentNode.isMin) {
                return [];
            }
            else {
                return [[]];
            }
        };
        MuCalculusDG.prototype.existsFormula = function (formula, succGen) {
            var _this = this;
            var hyperEdges = [], transitionSet = succGen.getSuccessors(this.currentNode.process.id);
            transitionSet.forEach(function (transition) {
                if (formula.actionMatcher.matches(transition.action)) {
                    hyperEdges.push([new MuCalculusNode(transition.targetProcess, formula.subFormula, _this.currentNode.isMin)]);
                }
            });
            return hyperEdges;
        };
        MuCalculusDG.prototype.forallFormula = function (formula, succGen) {
            var _this = this;
            var targetNodes = [], transitionSet = succGen.getSuccessors(this.currentNode.process.id);
            transitionSet.forEach(function (transition) {
                if (formula.actionMatcher.matches(transition.action)) {
                    targetNodes.push(new MuCalculusNode(transition.targetProcess, formula.subFormula, _this.currentNode.isMin));
                }
            });
            return [targetNodes];
        };
        MuCalculusDG.prototype.dispatchStrongExistsFormula = function (formula) {
            return this.currentNode.isMin ? this.existsFormula(formula, this.strongSuccGen) : this.forallFormula(formula, this.strongSuccGen);
        };
        MuCalculusDG.prototype.dispatchStrongForAllFormula = function (formula) {
            return this.currentNode.isMin ? this.forallFormula(formula, this.strongSuccGen) : this.existsFormula(formula, this.strongSuccGen);
        };
        MuCalculusDG.prototype.dispatchWeakExistsFormula = function (formula) {
            return this.currentNode.isMin ? this.existsFormula(formula, this.weakSuccGen) : this.forallFormula(formula, this.weakSuccGen);
        };
        MuCalculusDG.prototype.dispatchWeakForAllFormula = function (formula) {
            return this.currentNode.isMin ? this.forallFormula(formula, this.weakSuccGen) : this.existsFormula(formula, this.weakSuccGen);
        };
        MuCalculusDG.prototype.dispatchMinFixedPointFormula = function (formula) {
            if (this.currentNode.isMin) {
                return formula.subFormula.dispatchOn(this);
            }
            else {
                var minNode = new MuCalculusNode(this.currentNode.process, formula.subFormula, true);
                var minDg = new MuCalculusDG(this.strongSuccGen, this.weakSuccGen, this.formulaSet);
                var marking = solveMuCalculusIncremental(minDg, minNode, this.calculator);
                return marking.getMarking(minNode) === marking.ZERO ? [[]] : [];
            }
        };
        MuCalculusDG.prototype.dispatchMaxFixedPointFormula = function (formula) {
            if (!this.currentNode.isMin) {
                return formula.subFormula.dispatchOn(this);
            }
            else {
                var maxNode = new MuCalculusNode(this.currentNode.process, formula.subFormula, false);
                var maxDg = new MuCalculusDG(this.strongSuccGen, this.weakSuccGen, this.formulaSet);
                var marking = solveMuCalculusIncremental(maxDg, maxNode, this.calculator);
                return marking.getMarking(maxNode) === marking.ONE ? [] : [[]];
            }
        };
        MuCalculusDG.prototype.dispatchVariableFormula = function (formula) {
            return [[this.currentNode.newWithFormula(this.formulaSet.formulaByName(formula.variable))]];
        };
        return MuCalculusDG;
    })();
    DependencyGraph.MuCalculusDG = MuCalculusDG;
    function solveMuCalculusIncremental(dg, node, calculator) {
        calculator.solve(node);
        return {
            getMarking: calculator.getMarking.bind(calculator),
            getLevel: calculator.getLevel.bind(calculator),
            ZERO: calculator.ZERO,
            ONE: calculator.ONE,
            UNKNOWN: calculator.BOTTOM
        };
    }
    function solveMuCalculusForNode(dg, node) {
        var calculator = new MinFixedPointCalculator(function (k) { return dg.getHyperEdges(k); });
        dg.calculator = calculator;
        var marking = solveMuCalculusIncremental(dg, node, calculator);
        dg.calculator = null;
        return marking;
    }
    DependencyGraph.solveMuCalculusForNode = solveMuCalculusForNode;
    function solveMuCalculus(formulaSet, formula, strongSuccGen, weakSuccGen, processId) {
        var process = strongSuccGen.getProcessById(processId), node = new MuCalculusNode(process, formula, true), dg = new MuCalculusDG(strongSuccGen, weakSuccGen, formulaSet), marking = solveMuCalculusForNode(dg, node);
        return marking.getMarking(node) === marking.ONE;
    }
    DependencyGraph.solveMuCalculus = solveMuCalculus;
    function compareTargetNodes(nodesA, nodesB) {
        var lengthDiff = nodesA.length - nodesB.length;
        if (lengthDiff !== 0)
            return lengthDiff;
        var copyA = nodesA; //Copy already done in 'load'
        var copyB = nodesB; //Copy alredy done in 'load'
        for (var i = 0; i < copyA.length; ++i) {
            var elemA = copyA[i];
            var elemB = copyB[i];
            if (elemA !== elemB)
                return elemA < elemB ? -1 : 1;
        }
        return 0;
    }
    function compareHyperedgesMFPCalculator(edgeA, edgeB) {
        if (edgeA[0] !== edgeB[0])
            return edgeA[0] < edgeB[0] ? -1 : 1;
        return compareTargetNodes(edgeA[1], edgeB[1]);
    }
    var MinFixedPointCalculator = (function () {
        function MinFixedPointCalculator(nodeSuccGen) {
            this.nodeSuccGen = nodeSuccGen;
            this.Deps = Object.create(null);
            this.Level = Object.create(null);
            this.nodesToBeSolved = [];
            this.BOTTOM = 1;
            this.ZERO = 2;
            this.ONE = 3;
        }
        MinFixedPointCalculator.prototype.solve = function (solveNode) {
            if (solveNode != undefined) {
                this.nodesToBeSolved.push(solveNode);
            }
            while (this.nodesToBeSolved.length > 0) {
                this.solveSingle(this.nodesToBeSolved.pop());
            }
        };
        MinFixedPointCalculator.prototype.solveSingle = function (solveNode) {
            var Level = this.Level;
            var Deps = this.Deps;
            var succGen = this.nodeSuccGen;
            var W = [];
            var edgeComparer = compareHyperedgesMFPCalculator;
            function load(node) {
                var hyperedges = succGen(node);
                for (var i = 0; i < hyperedges.length; ++i) {
                    var hyperEdge = hyperedges[i].slice();
                    hyperEdge.sort();
                    W.push([node, hyperEdge]);
                }
            }
            var solveNodeMarking = this.getMarking(solveNode);
            if (solveNodeMarking === this.BOTTOM) {
                Level[solveNode] = Infinity;
                Deps[solveNode] = new SetUtil.OrderedSet(edgeComparer);
            }
            else if (solveNodeMarking === this.ONE) {
                return;
            }
            load(solveNode);
            var solveNodeStr = "" + solveNode;
            var BOTTOM = this.BOTTOM, ZERO = this.ZERO, ONE = this.ONE;
            while (W.length > 0) {
                var hEdge = W.pop();
                var source = hEdge[0];
                var tNodes = hEdge[1];
                var numOnes = 0;
                var maxTargetLevel = 0;
                if ((Level[source] || Infinity) < Infinity)
                    continue; //is ONE
                for (var i = 0; i < tNodes.length; ++i) {
                    var tNode = tNodes[i];
                    var tNodeMarking = this.getMarking(tNode);
                    if (tNodeMarking === ONE) {
                        ++numOnes;
                        maxTargetLevel = Math.max(maxTargetLevel, Level[tNode]);
                    }
                    else if (tNodeMarking === ZERO) {
                        Deps[tNode].add(hEdge);
                    }
                    else {
                        Level[tNode] = Infinity;
                        Deps[tNode] = new SetUtil.OrderedSet(edgeComparer);
                        Deps[tNode].add(hEdge);
                        load(tNode);
                    }
                }
                var sourceLevel = Level[source] || Infinity;
                if (numOnes === tNodes.length && sourceLevel > (maxTargetLevel + 1)) {
                    Level[source] = maxTargetLevel + 1;
                    Deps[source].forEach(function (edge) { return W.push(edge); });
                    if (("" + source) === solveNodeStr) {
                        return;
                    }
                }
            }
        };
        MinFixedPointCalculator.prototype.addNodeToBeSolved = function (node) {
            this.nodesToBeSolved.push(node);
        };
        MinFixedPointCalculator.prototype.getMarking = function (node) {
            var level = this.Level[node];
            if (level == undefined)
                return this.BOTTOM;
            return level === Infinity ? this.ZERO : this.ONE;
        };
        MinFixedPointCalculator.prototype.getLevel = function (node) {
            return this.Level[node] || Infinity;
        };
        return MinFixedPointCalculator;
    })();
    DependencyGraph.MinFixedPointCalculator = MinFixedPointCalculator;
    function liuSmolkaLocal2(m, graph) {
        var calculator = new MinFixedPointCalculator(function (k) { return graph.getHyperEdges(k); });
        calculator.solve(m);
        return {
            getMarking: calculator.getMarking.bind(calculator),
            getLevel: calculator.getLevel.bind(calculator),
            ZERO: calculator.ZERO,
            ONE: calculator.ONE,
            UNKNOWN: calculator.BOTTOM
        };
    }
    DependencyGraph.liuSmolkaLocal2 = liuSmolkaLocal2;
    function solveDgGlobalLevel(graph) {
        var S_ZERO = 2, S_ONE = 3;
        var Level = (function () {
            var a = {};
            var o = {
                get: function (k) {
                    return a[k] || Infinity;
                },
                set: function (k, level) {
                    a[k] = level;
                }
            };
            return o;
        }());
        var D = (function () {
            var d = {};
            var o = {
                empty: function (k) {
                    d[k] = [];
                },
                add: function (k, edgeL) {
                    d[k] = d[k] || [];
                    d[k].push(edgeL);
                },
                get: function (k, level) {
                    return (d[k] || []).map(function (pair) {
                        return [pair[0], pair[1], level];
                    });
                }
            };
            return o;
        }());
        var W = [];
        graph.getAllHyperEdges().forEach(function (pair) {
            var sourceNode = pair[0];
            pair[1].forEach(function (hyperEdge) { return W.push([sourceNode, hyperEdge, -1]); });
        });
        while (W.length > 0) {
            var next = W.pop();
            var k = next[0];
            var l = next[1];
            var candidateLevel = next[2];
            var kLevel = Level.get(k);
            if (candidateLevel === -1) {
                for (var edgeIdx = 0; edgeIdx < l.length; edgeIdx++) {
                    D.add(l[edgeIdx], [k, l]);
                }
                candidateLevel = Infinity;
            }
            if (candidateLevel < kLevel || kLevel === Infinity) {
                var highestSubLevel = 0;
                for (var edgeIdx = 0; edgeIdx < l.length; edgeIdx++) {
                    var subLevel = Level.get(l[edgeIdx]);
                    highestSubLevel = Math.max(subLevel, highestSubLevel);
                    if (subLevel >= kLevel)
                        break;
                }
                if (edgeIdx >= l.length && (highestSubLevel + 1) < kLevel) {
                    Level.set(k, highestSubLevel + 1);
                    W = W.concat(D.get(k, highestSubLevel + 2));
                }
            }
        }
        return {
            getMarking: function (dgNodeId) {
                return Level.get(dgNodeId) === Infinity ? S_ZERO : S_ONE;
            },
            getLevel: function (dgNodeId) {
                return Level.get(dgNodeId);
            },
            ZERO: S_ZERO,
            ONE: S_ONE
        };
    }
    DependencyGraph.solveDgGlobalLevel = solveDgGlobalLevel;
})(DependencyGraph || (DependencyGraph = {}));
var Equivalence;
(function (Equivalence) {
    var ccs = CCS;
    var hml = HML;
    var dg = DependencyGraph;
    var BisimulationDG = (function () {
        function BisimulationDG(attackSuccGen, defendSuccGen, leftNode, rightNode) {
            this.attackSuccGen = attackSuccGen;
            this.defendSuccGen = defendSuccGen;
            this.nodes = []; //Reference to node ids already constructed.
            this.constructData = []; //Data necessary to construct nodes.
            this.leftPairs = {}; // leftPairs[P.id][Q.id] is a cache for solved process pairs.
            this.isFullyConstructed = false;
            this.constructData[0] = [0, leftNode, rightNode];
            this.nextIdx = 1;
        }
        BisimulationDG.prototype.getHyperEdges = function (identifier) {
            var type, result;
            if (this.nodes[identifier]) {
                result = this.nodes[identifier];
            }
            else {
                result = this.constructNode(identifier);
            }
            return dg.copyHyperEdges(result);
        };
        BisimulationDG.prototype.constructNode = function (identifier) {
            var result, data = this.constructData[identifier], type = data[0];
            if (type === 0) {
                result = this.nodes[identifier] = this.getProcessPairStates(data[1], data[2]);
            }
            else if (type === 1) {
                result = this.nodes[identifier] = this.getNodeForLeftTransition(data);
            }
            else if (type === 2) {
                result = this.nodes[identifier] = this.getNodeForRightTransition(data);
            }
            return result;
        };
        BisimulationDG.prototype.getAllHyperEdges = function () {
            if (!this.isFullyConstructed) {
                this.isFullyConstructed = true;
                for (var i = 0; i < this.nextIdx; i++) {
                    this.constructNode(i);
                }
            }
            var result = [];
            result.length = this.nextIdx;
            for (var i = 0; i < this.nextIdx; i++) {
                result[i] = [i, dg.copyHyperEdges(this.nodes[i])];
            }
            return result;
        };
        BisimulationDG.prototype.getNodeForLeftTransition = function (data) {
            var _this = this;
            var action = data[1], toLeftId = data[2], fromRightId = data[3], result = [];
            var rightTransitions = this.defendSuccGen.getSuccessors(fromRightId);
            rightTransitions.forEach(function (rightTransition) {
                var existing, toRightId;
                if (rightTransition.action.equals(action)) {
                    toRightId = rightTransition.targetProcess.id;
                    result.push(_this.getOrCreatePairNode(toLeftId, toRightId));
                }
            });
            return [result];
        };
        BisimulationDG.prototype.getNodeForRightTransition = function (data) {
            var _this = this;
            var action = data[1], toRightId = data[2], fromLeftId = data[3], result = [];
            var leftTransitions = this.defendSuccGen.getSuccessors(fromLeftId);
            leftTransitions.forEach(function (leftTransition) {
                var existing, toLeftId;
                if (leftTransition.action.equals(action)) {
                    toLeftId = leftTransition.targetProcess.id;
                    result.push(_this.getOrCreatePairNode(toLeftId, toRightId));
                }
            });
            return [result];
        };
        BisimulationDG.prototype.getOrCreatePairNode = function (leftId, rightId) {
            var result;
            var rightIds = this.leftPairs[leftId];
            if (rightIds) {
                result = rightIds[rightId];
            }
            if (result) {
                return result;
            }
            result = this.nextIdx++;
            if (!rightIds)
                this.leftPairs[leftId] = rightIds = {};
            rightIds[rightId] = result;
            this.constructData[result] = [0, leftId, rightId];
            return result;
        };
        BisimulationDG.prototype.getProcessPairStates = function (leftProcessId, rightProcessId) {
            var _this = this;
            var hyperedges = [];
            var leftTransitions = this.attackSuccGen.getSuccessors(leftProcessId);
            var rightTransitions = this.attackSuccGen.getSuccessors(rightProcessId);
            leftTransitions.forEach(function (leftTransition) {
                var newNodeIdx = _this.nextIdx++;
                _this.constructData[newNodeIdx] = [1, leftTransition.action, leftTransition.targetProcess.id, rightProcessId];
                hyperedges.push([newNodeIdx]);
            });
            rightTransitions.forEach(function (rightTransition) {
                var newNodeIdx = _this.nextIdx++;
                _this.constructData[newNodeIdx] = [2, rightTransition.action, rightTransition.targetProcess.id, leftProcessId];
                hyperedges.push([newNodeIdx]);
            });
            return hyperedges;
        };
        BisimulationDG.prototype.getAttackerOptions = function (dgNodeId) {
            var _this = this;
            if (this.constructData[dgNodeId][0] !== 0)
                throw "Bad node for attacker options";
            var hyperedges = this.getHyperEdges(dgNodeId);
            var result = [];
            hyperedges.forEach(function (hyperedge) {
                var targetNode = hyperedge[0];
                var data = _this.constructData[targetNode];
                var action = data[1];
                var targetProcess = _this.attackSuccGen.getProcessById(data[2]);
                var move = data[0];
                result.push({
                    action: action,
                    targetProcess: targetProcess,
                    nextNode: targetNode,
                    move: move
                });
            });
            return result;
        };
        BisimulationDG.prototype.getDefenderOptions = function (dgNodeId) {
            var _this = this;
            if (this.constructData[dgNodeId][0] === 0)
                throw "Bad node for defender options";
            var hyperedge = this.getHyperEdges(dgNodeId)[0];
            var result = [];
            var tcpi = this.constructData[dgNodeId][0] === 1 ? 2 : 1;
            hyperedge.forEach(function (targetNode) {
                var data = _this.constructData[targetNode];
                var targetProcess = _this.defendSuccGen.getProcessById(data[tcpi]);
                result.push({
                    targetProcess: targetProcess,
                    nextNode: targetNode
                });
            });
            return result;
        };
        BisimulationDG.prototype.addReachablePairs = function (fromProcess) {
            var reachableProcessIds = [];
            var count = 0, maxCount = 666;
            var iterator = ccs.reachableProcessIterator(fromProcess, this.attackSuccGen);
            while (iterator.hasNext()) {
                if (count++ > maxCount) {
                    var error = new Error("Too many process pairs");
                    error.name = "CollapseTooLarge";
                    throw "Too many process pairs";
                }
                reachableProcessIds.push(iterator.next());
            }
            for (var leftIndex = 0; leftIndex < reachableProcessIds.length; ++leftIndex) {
                for (var rightIndex = 0; rightIndex < reachableProcessIds.length; ++rightIndex) {
                    if (leftIndex != rightIndex) {
                        var leftProcId = reachableProcessIds[leftIndex];
                        var rightProcId = reachableProcessIds[rightIndex];
                        this.getOrCreatePairNode(leftProcId, rightProcId);
                    }
                }
            }
        };
        BisimulationDG.prototype.getBisimulationCollapse = function (marking, graph) {
            var _this = this;
            var sets = Object.create(null);
            function singleton(id) {
                var o = { val: id, rank: 0 };
                o.parent = o;
                sets[id] = o;
            }
            function findRootInternal(set) {
                if (set.parent !== set) {
                    set.parent = findRootInternal(set.parent);
                }
                return set.parent;
            }
            function findRoot(id) {
                return findRootInternal(sets[id]);
            }
            function union(pId, qId) {
                var pRoot = findRoot(pId), qRoot = findRoot(qId);
                if (pRoot === qRoot)
                    return;
                if (pRoot.rank < qRoot.rank)
                    pRoot.parent = qRoot;
                else if (pRoot.rank > qRoot.rank)
                    qRoot.parent = pRoot;
                else {
                    qRoot.parent = pRoot;
                    ++pRoot.rank;
                }
            }
            Object.keys(this.constructData).forEach(function (id) {
                var pId, qId, pair;
                pair = _this.constructData[id];
                if (pair[0] !== 0)
                    return;
                pId = pair[1];
                qId = pair[2];
                if (!sets[pId])
                    singleton(pId);
                if (!sets[qId])
                    singleton(qId);
                if (marking.getMarking(id) === marking.ZERO) {
                    union(pId, qId);
                }
            });
            var collapses = {};
            Object.keys(sets).forEach(function (procId) {
                var reprId = findRoot(procId).val, process = graph.processById(procId);
                (collapses[reprId] = collapses[reprId] || []).push(process);
            });
            var proc2collapse = {};
            Object.keys(collapses).forEach(function (reprId) {
                var collapsedProces = collapses[reprId];
                var collapse = graph.newCollapsedProcess(collapses[reprId]);
                collapsedProces.forEach(function (proc) {
                    proc2collapse[proc.id] = collapse;
                });
                proc2collapse[collapse.id] = collapse;
            });
            return {
                getRepresentative: function (id) {
                    return proc2collapse[id];
                }
            };
        };
        BisimulationDG.prototype.findDistinguishingFormula = function (marking, isWeak) {
            var that = this, formulaSet = new hml.FormulaSet(), trace;
            if (marking.getMarking(0) !== marking.ONE)
                throw "Error: Processes are bisimilar";
            function selectMinimaxLevel(node) {
                var hyperEdges = that.getHyperEdges(node), bestHyperEdge, bestNode;
                function wrapMax(a, b) {
                    return Math.max(a, b);
                }
                if (hyperEdges.length === 0)
                    return null;
                var bestHyperEdge = ArrayUtil.selectBest(hyperEdges, function (tNodesLeft, tNodesRight) {
                    var maxLevelLeft = tNodesLeft.map(marking.getLevel).reduce(wrapMax, 1), maxLevelRight = tNodesRight.map(marking.getLevel).reduce(wrapMax, 1);
                    if (maxLevelLeft < maxLevelRight)
                        return true;
                    if (maxLevelLeft > maxLevelRight)
                        return false;
                    return tNodesLeft.length < tNodesRight.length;
                });
                if (bestHyperEdge.length === 0)
                    return null;
                bestNode = ArrayUtil.selectBest(bestHyperEdge, function (nodeLeft, nodeRight) {
                    return marking.getLevel(nodeLeft) < marking.getLevel(nodeRight);
                });
                return bestNode;
            }
            var muDG = new dg.MuCalculusDG(this.attackSuccGen, this.defendSuccGen, formulaSet);
            var minfpCalc = new dg.MinFixedPointCalculator(function (node) { return muDG.getHyperEdges(node); });
            function simplifyConjOrDisjunctions(processes, terms, mustSatisfy) {
                if (terms.length < 2)
                    return terms.slice();
                var desiredMarking = mustSatisfy ? minfpCalc.ONE : minfpCalc.ZERO;
                var table = Object.create(null);
                terms.forEach(function (t) {
                    processes.forEach(function (p) {
                        var node = new dg.MuCalculusNode(p, t, true);
                        minfpCalc.solve(node);
                        table[node.id] = minfpCalc.getMarking(node) === desiredMarking ? 1 : 0;
                    });
                });
                function fulfilledProcesses(term) {
                    var result = [];
                    processes.forEach(function (p) {
                        var node = new dg.MuCalculusNode(p, term, true);
                        if (table[node.id] === 1) {
                            result.push(p);
                        }
                    });
                    return result;
                }
                function clearProcs(procs) {
                    terms.forEach(function (t) {
                        procs.forEach(function (p) {
                            var node = new dg.MuCalculusNode(p, t, true);
                            table[node.id] = 0;
                        });
                    });
                }
                var resultTerms = [];
                var fulfilledProcs = 0;
                function greedySelect() {
                    var fProcesses = terms.map(fulfilledProcesses);
                    var scores = fProcesses.map(function (fprocs) { return fprocs.length; });
                    var bestTermIdx = 0;
                    for (var i = 1; i < terms.length; ++i) {
                        if (scores[i] > scores[bestTermIdx])
                            bestTermIdx = i;
                    }
                    resultTerms.push(terms[bestTermIdx]);
                    fulfilledProcs += scores[bestTermIdx];
                    clearProcs(fProcesses[bestTermIdx]);
                }
                while (fulfilledProcs < processes.length) {
                    greedySelect();
                }
                return resultTerms;
            }
            var selectSuccessor = selectMinimaxLevel;
            var existConstructor = function (matcher, sub) { return formulaSet.newStrongExists(matcher, sub); };
            var forallConstructor = function (matcher, sub) { return formulaSet.newStrongForAll(matcher, sub); };
            if (isWeak) {
                existConstructor = function (matcher, sub) { return formulaSet.newWeakExists(matcher, sub); };
                forallConstructor = function (matcher, sub) { return formulaSet.newWeakForAll(matcher, sub); };
            }
            var succGen = that.attackSuccGen;
            function getTargetProcs(pairs, getRight) {
                var index = getRight ? 2 : 1;
                var procIds = pairs.map(function (node) { return that.constructData[node][index]; });
                return procIds.map(function (pId) { return succGen.getProcessById(pId); });
            }
            function formulaForBranch(node) {
                var cData = that.constructData[node];
                if (cData[0] === 0) {
                    var selectedNode = selectSuccessor(node);
                    return formulaForBranch(selectedNode);
                }
                else if (cData[0] === 1) {
                    var targetPairNodes = that.getHyperEdges(node)[0];
                    var actionMatcher = new hml.SingleActionMatcher(cData[1]);
                    if (targetPairNodes.length > 0) {
                        var subFormulas = targetPairNodes.map(formulaForBranch);
                        var subProcesses = getTargetProcs(targetPairNodes, true);
                        subFormulas = simplifyConjOrDisjunctions(subProcesses, subFormulas, false);
                        return existConstructor(actionMatcher, formulaSet.newConj(subFormulas));
                    }
                    else {
                        return existConstructor(actionMatcher, formulaSet.newTrue());
                    }
                }
                else {
                    var targetPairNodes = that.getHyperEdges(node)[0];
                    var actionMatcher = new hml.SingleActionMatcher(cData[1]);
                    if (targetPairNodes.length > 0) {
                        var subFormulas = targetPairNodes.map(formulaForBranch);
                        var subProcesses = getTargetProcs(targetPairNodes, false);
                        subFormulas = simplifyConjOrDisjunctions(subProcesses, subFormulas, true);
                        return forallConstructor(actionMatcher, formulaSet.newDisj(subFormulas));
                    }
                    else {
                        return forallConstructor(actionMatcher, formulaSet.newFalse());
                    }
                }
            }
            var formula = formulaForBranch(0);
            return new Traverse.HMLSimplifier().visitVariableFreeFormula(formula);
        };
        return BisimulationDG;
    })();
    Equivalence.BisimulationDG = BisimulationDG;
    var SimulationDG = (function () {
        function SimulationDG(attackSuccGen, defendSuccGen, leftNode, rightNode) {
            this.attackSuccGen = attackSuccGen;
            this.defendSuccGen = defendSuccGen;
            this.nodes = [];
            this.constructData = [];
            this.leftPairs = {};
            this.isFullyConstructed = false;
            this.constructData[0] = [0, leftNode, rightNode];
            this.nextIdx = 1;
        }
        SimulationDG.prototype.getHyperEdges = function (identifier) {
            var type, result;
            if (this.nodes[identifier]) {
                result = this.nodes[identifier];
            }
            else {
                result = this.constructNode(identifier);
            }
            return dg.copyHyperEdges(result);
        };
        SimulationDG.prototype.constructNode = function (identifier) {
            var result, data = this.constructData[identifier], type = data[0];
            if (type === 0) {
                result = this.nodes[identifier] = this.getProcessPairStates(data[1], data[2]);
            }
            else if (type === 1) {
                result = this.nodes[identifier] = this.getNodeForLeftTransition(data);
            }
            return result;
        };
        SimulationDG.prototype.getAllHyperEdges = function () {
            if (!this.isFullyConstructed) {
                this.isFullyConstructed = true;
                for (var i = 0; i < this.nextIdx; i++) {
                    this.constructNode(i);
                }
            }
            var result = [];
            result.length = this.nextIdx;
            for (var i = 0; i < this.nextIdx; i++) {
                result[i] = [i, dg.copyHyperEdges(this.nodes[i])];
            }
            return result;
        };
        SimulationDG.prototype.getNodeForLeftTransition = function (data) {
            var _this = this;
            var action = data[1], toLeftId = data[2], fromRightId = data[3], result = [];
            var rightTransitions = this.defendSuccGen.getSuccessors(fromRightId);
            rightTransitions.forEach(function (rightTransition) {
                var existing, toRightId;
                if (rightTransition.action.equals(action)) {
                    toRightId = rightTransition.targetProcess.id;
                    var rightIds = _this.leftPairs[toLeftId];
                    if (rightIds) {
                        existing = rightIds[toRightId];
                    }
                    if (existing) {
                        result.push(existing);
                    }
                    else {
                        var newIndex = _this.nextIdx++;
                        if (!rightIds)
                            _this.leftPairs[toLeftId] = rightIds = {};
                        rightIds[toRightId] = newIndex;
                        _this.constructData[newIndex] = [0, toLeftId, toRightId];
                        result.push(newIndex);
                    }
                }
            });
            return [result];
        };
        SimulationDG.prototype.getProcessPairStates = function (leftProcessId, rightProcessId) {
            var _this = this;
            var hyperedges = [];
            var leftTransitions = this.attackSuccGen.getSuccessors(leftProcessId);
            leftTransitions.forEach(function (leftTransition) {
                var newNodeIdx = _this.nextIdx++;
                _this.constructData[newNodeIdx] = [1, leftTransition.action, leftTransition.targetProcess.id, rightProcessId];
                hyperedges.push([newNodeIdx]);
            });
            return hyperedges;
        };
        SimulationDG.prototype.getAttackerOptions = function (dgNodeId) {
            var _this = this;
            if (this.constructData[dgNodeId][0] !== 0)
                throw "Bad node for attacker options";
            var hyperedges = this.getHyperEdges(dgNodeId);
            var result = [];
            hyperedges.forEach(function (hyperedge) {
                var targetNode = hyperedge[0];
                var data = _this.constructData[targetNode];
                var action = data[1];
                var targetProcess = _this.attackSuccGen.getProcessById(data[2]);
                var move = data[0];
                result.push({
                    action: action,
                    targetProcess: targetProcess,
                    nextNode: targetNode,
                    move: move
                });
            });
            return result;
        };
        SimulationDG.prototype.getDefenderOptions = function (dgNodeId) {
            var _this = this;
            if (this.constructData[dgNodeId][0] === 0)
                throw "Bad node for defender options";
            var hyperedge = this.getHyperEdges(dgNodeId)[0];
            var result = [];
            var tcpi = this.constructData[dgNodeId][0] === 1 ? 2 : 1;
            hyperedge.forEach(function (targetNode) {
                var data = _this.constructData[targetNode];
                var targetProcess = _this.defendSuccGen.getProcessById(data[tcpi]);
                result.push({
                    targetProcess: targetProcess,
                    nextNode: targetNode
                });
            });
            return result;
        };
        return SimulationDG;
    })();
    Equivalence.SimulationDG = SimulationDG;
    function isBisimilar(attackSuccGen, defendSuccGen, leftProcessId, rightProcessId, graph) {
        var bisimDG = new Equivalence.BisimulationDG(attackSuccGen, defendSuccGen, leftProcessId, rightProcessId), marking = dg.liuSmolkaLocal2(0, bisimDG);
        return marking.getMarking(0) === marking.ZERO;
    }
    Equivalence.isBisimilar = isBisimilar;
    function isSimilar(attackSuccGen, defendSuccGen, leftProcessId, rightProcessId) {
        var simDG = new Equivalence.SimulationDG(attackSuccGen, defendSuccGen, leftProcessId, rightProcessId);
        var marking = dg.liuSmolkaLocal2(0, simDG);
        return marking.getMarking(0) === marking.ZERO;
    }
    Equivalence.isSimilar = isSimilar;
    function getBisimulationCollapse(attackSuccGen, defendSuccGen, leftProcessId, rightProcessId) {
        var bisimDG = new Equivalence.BisimulationDG(attackSuccGen, defendSuccGen, leftProcessId, rightProcessId);
        bisimDG.addReachablePairs(leftProcessId);
        if (leftProcessId != rightProcessId) {
            bisimDG.addReachablePairs(rightProcessId);
        }
        var marking = dg.solveDgGlobalLevel(bisimDG);
        return bisimDG.getBisimulationCollapse(marking, attackSuccGen.getGraph());
    }
    Equivalence.getBisimulationCollapse = getBisimulationCollapse;
    var TraceDG = (function () {
        function TraceDG(leftNode, rightNode, attackSuccGen) {
            this.attackSuccGen = attackSuccGen;
            this.constructData = [];
            this.nodes = [];
            this.leftPairs = {};
            this.isFullyConstructed = false;
            this.constructData[0] = [0, null, leftNode, [rightNode]];
            this.nextIdx = 1;
        }
        TraceDG.prototype.getHyperEdges = function (identifier) {
            var type, result;
            if (this.nodes[identifier]) {
                result = this.nodes[identifier];
            }
            else {
                result = this.constructNode(identifier);
            }
            return dg.copyHyperEdges(result);
        };
        TraceDG.prototype.getAllHyperEdges = function () {
            if (!this.isFullyConstructed) {
                this.isFullyConstructed = true;
                for (var i = 0; i < this.nextIdx; i++) {
                    this.constructNode(i);
                }
            }
            var result = [];
            result.length = this.nextIdx;
            for (var i = 0; i < this.nextIdx; i++) {
                result[i] = [i, dg.copyHyperEdges(this.nodes[i])];
            }
            return result;
        };
        TraceDG.prototype.constructNode = function (identifier) {
            var data = this.constructData[identifier];
            return this.nodes[identifier] = this.getProcessPairStates(data[2], data[3]);
        };
        TraceDG.prototype.getProcessPairStates = function (leftProcessId, rightProcessIds) {
            var _this = this;
            if (rightProcessIds.length === 0)
                return [[]];
            var hyperedges = [];
            var leftTransitions = this.attackSuccGen.getSuccessors(leftProcessId);
            var rightTransitions = [];
            rightProcessIds.forEach(function (rightProcessId) {
                var succs = _this.attackSuccGen.getSuccessors(rightProcessId);
                succs.forEach(function (succ) {
                    rightTransitions.push(succ);
                });
            });
            leftTransitions.forEach(function (leftTransition) {
                var rightTargets = [];
                rightTransitions.forEach(function (rightTransition) {
                    if (rightTransition.action.equals(leftTransition.action)) {
                        rightTargets.push(rightTransition.targetProcess.id);
                    }
                });
                rightTargets.sort();
                rightTargets = ArrayUtil.removeConsecutiveDuplicates(rightTargets);
                if (_this.leftPairs[leftTransition.targetProcess.id] === undefined)
                    _this.leftPairs[leftTransition.targetProcess.id] = [];
                if (_this.leftPairs[leftTransition.targetProcess.id][rightTargets.length] === undefined)
                    _this.leftPairs[leftTransition.targetProcess.id][rightTargets.length] = [];
                var rightSets = _this.leftPairs[leftTransition.targetProcess.id][rightTargets.length];
                var existing = false;
                for (var n = 0; n < rightSets.length; n++) {
                    if (rightTargets.every(function (v, i) { return v === rightSets[n].set[i]; })) {
                        hyperedges.push([rightSets[n].index]);
                        existing = true;
                        break;
                    }
                }
                if (!existing) {
                    var newNodeIdx = _this.nextIdx++;
                    var rightSet = { set: rightTargets, index: newNodeIdx };
                    _this.leftPairs[leftTransition.targetProcess.id][rightTargets.length].push(rightSet);
                    _this.constructData[newNodeIdx] = [0, leftTransition.action, leftTransition.targetProcess.id, rightTargets];
                    hyperedges.push([newNodeIdx]);
                }
            });
            return hyperedges;
        };
        TraceDG.prototype.getDistinguishingFormula = function (marking) {
            if (marking.getMarking(0) === marking.ZERO)
                return null;
            var hyperedges = this.getHyperEdges(0);
            var formulaStr = "";
            var emptySetReached = false;
            var isWeak = this.attackSuccGen instanceof Traverse.WeakSuccessorGenerator;
            while (!emptySetReached) {
                var bestTarget = 0;
                var lowestLevel = Infinity;
                hyperedges.forEach(function (hyperedge) {
                    var level;
                    var edge = hyperedge[0];
                    if (marking.getMarking(edge) === marking.ONE) {
                        level = marking.getLevel(edge);
                        if (level <= lowestLevel) {
                            lowestLevel = level;
                            bestTarget = edge;
                        }
                    }
                });
                formulaStr += (isWeak ? "<<" : "<") + this.constructData[bestTarget][1].toString(false) + (isWeak ? ">>" : ">");
                hyperedges = this.getHyperEdges(bestTarget);
                for (var i = 0; i < hyperedges.length; i++) {
                    if (hyperedges[i].length === 0) {
                        emptySetReached = true;
                        break;
                    }
                }
            }
            formulaStr += "tt;";
            return formulaStr;
        };
        return TraceDG;
    })();
    Equivalence.TraceDG = TraceDG;
    function isTraceIncluded(attackSuccGen, defendSuccGen, leftProcessId, rightProcessId, graph) {
        var traceDG = new TraceDG(leftProcessId, rightProcessId, attackSuccGen);
        var marking = dg.liuSmolkaLocal2(0, traceDG);
        return {
            isSatisfied: marking.getMarking(0) === marking.ZERO,
            formula: traceDG.getDistinguishingFormula(marking)
        };
    }
    Equivalence.isTraceIncluded = isTraceIncluded;
    function prettyPrintTrace(graph, trace) {
        var notation = new Traverse.CCSNotationVisitor(), stringParts = [];
        for (var i = 0; i < trace.length; i++) {
            if (i % 2 == 1)
                stringParts.push("---- " + trace[i].toString() + " ---->");
            else
                stringParts.push(notation.visit(graph.processById(trace[i])));
        }
        return stringParts.join("\n\t");
    }
})(Equivalence || (Equivalence = {}));
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Traverse;
(function (Traverse) {
    var ccs = CCS;
    var ProcessTreeReducer = (function () {
        function ProcessTreeReducer(graph) {
            this.graph = graph;
            this.cache = Object.create(null);
        }
        ProcessTreeReducer.prototype.visit = function (process) {
            return process.dispatchOn(this);
        };
        ProcessTreeReducer.prototype.dispatchNullProcess = function (process) {
            var resultProcess = this.cache[process.id];
            if (!resultProcess) {
                resultProcess = this.cache[process.id] = process;
            }
            return resultProcess;
        };
        ProcessTreeReducer.prototype.dispatchNamedProcess = function (process) {
            return process;
        };
        ProcessTreeReducer.prototype.dispatchSummationProcess = function (process) {
            var _this = this;
            var resultProcess = this.cache[process.id];
            if (!resultProcess) {
                var subProcesses = process.subProcesses.map(function (subProc) { return subProc.dispatchOn(_this); });
                subProcesses = subProcesses.filter(function (subProc) { return !(subProc instanceof ccs.NullProcess); });
                subProcesses = ArrayUtil.sortAndRemoveDuplicates(subProcesses, function (p) { return p.id; });
                if (subProcesses.length === 0) {
                    return this.graph.getNullProcess();
                }
                resultProcess = this.cache[process.id] = this.graph.newSummationProcess(subProcesses);
            }
            return resultProcess;
        };
        ProcessTreeReducer.prototype.dispatchCompositionProcess = function (process) {
            var _this = this;
            var resultProcess = this.cache[process.id];
            if (!resultProcess) {
                var subProcesses = process.subProcesses.map(function (subProc) { return subProc.dispatchOn(_this); });
                subProcesses = subProcesses.filter(function (subProc) { return !(subProc instanceof ccs.NullProcess); });
                if (subProcesses.length === 0) {
                    return this.graph.getNullProcess();
                }
                resultProcess = this.cache[process.id] = this.graph.newCompositionProcess(subProcesses);
            }
            return resultProcess;
        };
        ProcessTreeReducer.prototype.dispatchActionPrefixProcess = function (process) {
            var resultProcess = this.cache[process.id];
            if (!resultProcess) {
                var nextProcess = process.nextProcess.dispatchOn(this);
                resultProcess = this.cache[process.id] = this.graph.newActionPrefixProcess(process.action, nextProcess);
            }
            return resultProcess;
        };
        ProcessTreeReducer.prototype.dispatchRestrictionProcess = function (process) {
            var resultProcess = this.cache[process.id];
            if (!resultProcess) {
                var subProcess = process.subProcess.dispatchOn(this);
                var tempProcess;
                if (subProcess instanceof ccs.RestrictionProcess) {
                    var subRestriction = subProcess;
                    var mergedLabels = subRestriction.restrictedLabels.union(process.restrictedLabels);
                    tempProcess = this.graph.newRestrictedProcess(subRestriction.subProcess, mergedLabels);
                }
                else {
                    tempProcess = this.graph.newRestrictedProcess(subProcess, process.restrictedLabels);
                }
                if (tempProcess.subProcess instanceof ccs.NullProcess) {
                    return tempProcess.subProcess;
                }
                if (tempProcess.restrictedLabels.empty()) {
                    return tempProcess.subProcess;
                }
                resultProcess = this.cache[process.id] = tempProcess;
            }
            return resultProcess;
        };
        ProcessTreeReducer.prototype.dispatchRelabellingProcess = function (process) {
            var resultProcess = this.cache[process.id];
            if (!resultProcess) {
                var subProcess = process.subProcess.dispatchOn(this);
                if (subProcess instanceof ccs.NullProcess)
                    return subProcess; // 0 [f] => 0
                resultProcess = this.cache[process.id] = this.graph.newRelabelingProcess(subProcess, process.relabellings);
            }
            return resultProcess;
        };
        return ProcessTreeReducer;
    })();
    Traverse.ProcessTreeReducer = ProcessTreeReducer;
    var AbstractTransition = (function () {
        function AbstractTransition(fromId, action, toId) {
            this.fromId = fromId;
            this.action = action;
            this.toId = toId;
        }
        return AbstractTransition;
    })();
    var FromData = (function () {
        function FromData(prev, action, to) {
            this.prev = prev;
            this.action = action;
            this.to = to;
        }
        return FromData;
    })();
    function compareAction(left, right) {
        if (left.isComplement() !== right.isComplement())
            return left.isComplement() - right.isComplement();
        if (left.getLabel() < right.getLabel())
            return -1;
        if (right.getLabel() < left.getLabel())
            return 1;
        return 0;
    }
    function compareTransitionTuple(left, right) {
        var fromIdDiff = left.fromId.localeCompare(right.fromId);
        if (fromIdDiff !== 0)
            return fromIdDiff;
        var toIdDiff = left.toId.localeCompare(right.toId);
        if (toIdDiff !== 0)
            return toIdDiff;
        return compareAction(left.action, right.action);
    }
    var AbstractingSuccessorGenerator = (function () {
        function AbstractingSuccessorGenerator(abstractions, strictSuccGenerator, cache) {
            this.fromTable = new MapUtil.OrderedMap(compareTransitionTuple);
            this.abstractions = abstractions;
            this.strictSuccGenerator = strictSuccGenerator;
            this.cache = cache || {};
        }
        AbstractingSuccessorGenerator.prototype.getAbstractions = function () {
            return this.abstractions;
        };
        AbstractingSuccessorGenerator.prototype.getGraph = function () {
            return this.strictSuccGenerator.getGraph();
        };
        AbstractingSuccessorGenerator.prototype.getProcessByName = function (processName) {
            return this.strictSuccGenerator.getProcessByName(processName);
        };
        AbstractingSuccessorGenerator.prototype.getProcessById = function (processId) {
            return this.strictSuccGenerator.getProcessById(processId);
        };
        AbstractingSuccessorGenerator.prototype.getSuccessors = function (sourceProcessId) {
            var _this = this;
            if (this.cache[sourceProcessId])
                return this.cache[sourceProcessId];
            var result = new ccs.TransitionSet();
            var sourceProcess = this.strictSuccGenerator.getProcessById(sourceProcessId);
            var stage1Processes = [];
            var stage2Processes = [];
            var isAbstraction = function (action) {
                return _this.abstractions.some(function (abstraction) { return abstraction.equals(action); });
            };
            var findNonAbstraction = function (fromData) {
                if (isAbstraction(fromData.action))
                    return findNonAbstraction(fromData.prev);
                return fromData.action;
            };
            var addTransitions = function (prevFromData, fromProcess, isStageTwo) {
                var strongSuccessors = _this.strictSuccGenerator.getSuccessors(fromProcess.id);
                strongSuccessors.forEach(function (transition) {
                    var isActionAbstract = isAbstraction(transition.action);
                    if (!isActionAbstract || fromProcess.id !== transition.targetProcess.id) {
                        var targetId = transition.targetProcess.id;
                        var newFromData = new FromData(prevFromData, transition.action, transition.targetProcess);
                        if (!isStageTwo) {
                            if (isActionAbstract) {
                                _this.abstractions.forEach(function (abstraction) {
                                    _this.fromTable.set(new AbstractTransition(sourceProcessId, abstraction, targetId), newFromData);
                                });
                                stage1Processes.push(newFromData);
                            }
                            else {
                                _this.fromTable.set(new AbstractTransition(sourceProcessId, transition.action, targetId), newFromData);
                                stage2Processes.push(newFromData);
                            }
                        }
                        else if (isActionAbstract) {
                            var nonAbstractAction = findNonAbstraction(prevFromData);
                            _this.fromTable.set(new AbstractTransition(sourceProcessId, nonAbstractAction, targetId), newFromData);
                            stage2Processes.push(newFromData);
                        }
                    }
                });
            };
            addTransitions(null, sourceProcess, false);
            while (stage1Processes.length > 0) {
                var fromData = stage1Processes.pop();
                var transition = new CCS.Transition(fromData.action, fromData.to);
                if (!result.contains(transition)) {
                    this.abstractions.forEach(function (abstraction) {
                        result.add(new CCS.Transition(abstraction, fromData.to));
                    });
                    addTransitions(fromData, fromData.to, false);
                }
            }
            while (stage2Processes.length > 0) {
                var fromData = stage2Processes.pop();
                var nonAbstractAction = findNonAbstraction(fromData);
                var transition = new CCS.Transition(nonAbstractAction, fromData.to);
                if (!result.contains(transition)) {
                    result.add(transition);
                    addTransitions(fromData, fromData.to, true);
                }
            }
            this.abstractions.forEach(function (abstraction) {
                var abstractTransition = new AbstractTransition(sourceProcessId, abstraction, sourceProcessId);
                if (!_this.fromTable.has(abstractTransition)) {
                    var fromData = new FromData(null, abstraction, sourceProcess);
                    _this.fromTable.set(abstractTransition, fromData);
                }
                result.add(new CCS.Transition(abstraction, sourceProcess));
            });
            this.cache[sourceProcessId] = result;
            return result;
        };
        AbstractingSuccessorGenerator.prototype.getStrictPath = function (fromId, action, toId) {
            var transitions = [], succGen = this.strictSuccGenerator;
            var fromData = this.fromTable.get(new AbstractTransition(fromId, action, toId));
            if (!fromData)
                throw "Do not call getStrictPath with unknown data.";
            do {
                transitions.push(new ccs.Transition(fromData.action, fromData.to));
                fromData = fromData.prev;
            } while (fromData);
            transitions.reverse();
            return transitions;
        };
        return AbstractingSuccessorGenerator;
    })();
    Traverse.AbstractingSuccessorGenerator = AbstractingSuccessorGenerator;
    var WeakSuccessorGenerator = (function (_super) {
        __extends(WeakSuccessorGenerator, _super);
        function WeakSuccessorGenerator(strictSuccGenerator, cache) {
            _super.call(this, [new ccs.Action("tau", false)], strictSuccGenerator, cache);
        }
        return WeakSuccessorGenerator;
    })(AbstractingSuccessorGenerator);
    Traverse.WeakSuccessorGenerator = WeakSuccessorGenerator;
    var ReducingSuccessorGenerator = (function () {
        function ReducingSuccessorGenerator(succGenerator, reducer) {
            this.succGenerator = succGenerator;
            this.reducer = reducer;
        }
        ReducingSuccessorGenerator.prototype.getGraph = function () {
            return this.succGenerator.getGraph();
        };
        ReducingSuccessorGenerator.prototype.getProcessByName = function (processName) {
            var namedProcess = this.succGenerator.getProcessByName(processName);
            return this.reducer.visit(namedProcess);
        };
        ReducingSuccessorGenerator.prototype.getProcessById = function (processId) {
            var proc = this.succGenerator.getProcessById(processId);
            return this.reducer.visit(proc);
        };
        ReducingSuccessorGenerator.prototype.getSuccessors = function (processId) {
            var transitionSet = this.succGenerator.getSuccessors(processId);
            return this.reduceSuccessors(transitionSet);
        };
        ReducingSuccessorGenerator.prototype.reduceSuccessors = function (transitionSet) {
            var _this = this;
            transitionSet.forEach(function (transition) {
                transition.targetProcess = _this.reducer.visit(transition.targetProcess);
            });
            return transitionSet;
        };
        return ReducingSuccessorGenerator;
    })();
    Traverse.ReducingSuccessorGenerator = ReducingSuccessorGenerator;
})(Traverse || (Traverse = {}));
var TCCS;
(function (TCCS) {
    var DelayPrefixProcess = (function () {
        function DelayPrefixProcess(delay, nextProcess) {
            this.delay = delay;
            this.nextProcess = nextProcess;
        }
        DelayPrefixProcess.prototype.dispatchOn = function (dispatcher) {
            return dispatcher.dispatchDelayPrefixProcess(this);
        };
        DelayPrefixProcess.prototype.toString = function () {
            if (this.ccs)
                return this.ccs;
            return this.ccs = "." + this.delay.toString() + "." + this.nextProcess.toString();
        };
        Object.defineProperty(DelayPrefixProcess.prototype, "id", {
            get: function () {
                return this.toString();
            },
            enumerable: true,
            configurable: true
        });
        return DelayPrefixProcess;
    })();
    TCCS.DelayPrefixProcess = DelayPrefixProcess;
    var Delay = (function (_super) {
        __extends(Delay, _super);
        function Delay(delay) {
            _super.call(this, "Delay", false);
            this.delay = delay;
        }
        Delay.prototype.getDelay = function () {
            return this.delay;
        };
        Delay.prototype.toString = function () {
            return this.delay.toString();
        };
        Delay.prototype.clone = function () {
            return new Delay(this.delay);
        };
        return Delay;
    })(CCS.Action);
    TCCS.Delay = Delay;
    var DelayTransition = (function (_super) {
        __extends(DelayTransition, _super);
        function DelayTransition(delay, targetProcess) {
            _super.call(this, delay, targetProcess);
            this.delay = delay;
        }
        DelayTransition.prototype.toString = function () {
            if (this.targetProcess instanceof CCS.NamedProcess) {
                return this.delay.toString() + "->" + this.targetProcess.name;
            }
            return this.delay.toString() + "->" + this.targetProcess.id;
        };
        return DelayTransition;
    })(CCS.Transition);
    TCCS.DelayTransition = DelayTransition;
    var Graph = (function (_super) {
        __extends(Graph, _super);
        function Graph() {
            _super.call(this);
            this.unguardedRecursionChecker = new Traverse.TCCSUnguardedRecursionChecker();
        }
        Graph.prototype.newDelayPrefixProcess = function (delay, nextProcess) {
            var result = new DelayPrefixProcess(delay, nextProcess);
            return this.processes[result.id] = result;
        };
        return Graph;
    })(CCS.Graph);
    TCCS.Graph = Graph;
    var StrictSuccessorGenerator = (function (_super) {
        __extends(StrictSuccessorGenerator, _super);
        function StrictSuccessorGenerator(tccsgraph, cache) {
            _super.call(this, tccsgraph, cache);
            this.tccsgraph = tccsgraph;
            this.tauFoundCache = {};
            this.delaySuccessor = new DelaySuccessor(tccsgraph);
        }
        StrictSuccessorGenerator.prototype.getSuccessors = function (processId) {
            var process = this.graph.processById(processId);
            var result = this.cache[process.id] = process.dispatchOn(this);
            if (this.tauFoundCache[process.id] === false) {
                result = result.clone();
                result.add(this.delaySuccessor.visit(process));
            }
            return result;
        };
        StrictSuccessorGenerator.prototype.checkTransitionsForTau = function (process, transitions) {
            if (!this.tauFoundCache[process.id]) {
                var canDoTau = false;
                transitions.forEach(function (transition) {
                    if (transition.action.getLabel() === "tau") {
                        canDoTau = true;
                    }
                });
                this.tauFoundCache[process.id] = canDoTau;
            }
        };
        StrictSuccessorGenerator.prototype.dispatchNullProcess = function (process) {
            var result = _super.prototype.dispatchNullProcess.call(this, process);
            if (!this.tauFoundCache[process.id]) {
                this.tauFoundCache[process.id] = false;
            }
            return result;
        };
        StrictSuccessorGenerator.prototype.dispatchNamedProcess = function (process) {
            var result = _super.prototype.dispatchNamedProcess.call(this, process);
            if (!this.tauFoundCache[process.id]) {
                this.tauFoundCache[process.id] = this.tauFoundCache[process.subProcess.id];
            }
            return result;
        };
        StrictSuccessorGenerator.prototype.dispatchSummationProcess = function (process) {
            var result = _super.prototype.dispatchSummationProcess.call(this, process);
            this.checkTransitionsForTau(process, result);
            return result;
        };
        StrictSuccessorGenerator.prototype.dispatchCompositionProcess = function (process) {
            var result = _super.prototype.dispatchCompositionProcess.call(this, process);
            this.checkTransitionsForTau(process, result);
            return result;
        };
        StrictSuccessorGenerator.prototype.dispatchActionPrefixProcess = function (process) {
            var result = _super.prototype.dispatchActionPrefixProcess.call(this, process);
            this.checkTransitionsForTau(process, result);
            return result;
        };
        StrictSuccessorGenerator.prototype.dispatchRestrictionProcess = function (process) {
            var result = _super.prototype.dispatchRestrictionProcess.call(this, process);
            this.checkTransitionsForTau(process, result);
            return result;
        };
        StrictSuccessorGenerator.prototype.dispatchRelabellingProcess = function (process) {
            var result = _super.prototype.dispatchRelabellingProcess.call(this, process);
            this.checkTransitionsForTau(process, result);
            return result;
        };
        StrictSuccessorGenerator.prototype.dispatchDelayPrefixProcess = function (process) {
            var result = this.cache[process.id];
            if (!result) {
                this.cache[process.id] = result = new CCS.TransitionSet(); // yields no action transition
                this.tauFoundCache[process.id] = false;
            }
            return result;
        };
        return StrictSuccessorGenerator;
    })(CCS.StrictSuccessorGenerator);
    TCCS.StrictSuccessorGenerator = StrictSuccessorGenerator;
    var DelaySuccessor = (function () {
        function DelaySuccessor(graph) {
            this.graph = graph;
            this.cache = {};
            this.delayFoundCache = {};
        }
        DelaySuccessor.prototype.visit = function (process) {
            var targetProcess;
            this.cache[process.id] = targetProcess = process.dispatchOn(this);
            if (this.delayFoundCache[process.id] === false) {
                return new DelayTransition(new Delay(1), process); // self-loop
            }
            else {
                return new DelayTransition(new Delay(1), targetProcess);
            }
        };
        DelaySuccessor.prototype.dispatchNullProcess = function (process) {
            var result = this.cache[process.id];
            if (!result) {
                result = this.cache[process.id] = process;
                this.delayFoundCache[process.id] = false;
            }
            return result;
        };
        DelaySuccessor.prototype.dispatchNamedProcess = function (process) {
            var result = this.cache[process.id];
            if (!result) {
                result = this.cache[process.id] = process.subProcess.dispatchOn(this);
                this.delayFoundCache[process.id] = this.delayFoundCache[process.subProcess.id];
            }
            return result;
        };
        DelaySuccessor.prototype.dispatchSummationProcess = function (process) {
            var _this = this;
            var result = this.cache[process.id];
            if (!result) {
                var newSubProcesses = [];
                var delayFound = false;
                process.subProcesses.forEach(function (subProcess) {
                    var newSubProcess = subProcess.dispatchOn(_this);
                    if (newSubProcess instanceof CCS.SummationProcess) {
                        newSubProcess.subProcesses.forEach(function (subSubProcess) {
                            newSubProcesses.push(subSubProcess);
                        });
                    }
                    else {
                        newSubProcesses.push(newSubProcess);
                    }
                    if (!delayFound && _this.delayFoundCache[subProcess.id])
                        delayFound = true;
                });
                if (delayFound) {
                    this.cache[process.id] = result = this.graph.newSummationProcess(newSubProcesses);
                }
                else {
                    this.cache[process.id] = result = process;
                }
                this.delayFoundCache[process.id] = delayFound;
            }
            return result;
        };
        DelaySuccessor.prototype.dispatchCompositionProcess = function (process) {
            var _this = this;
            var result = this.cache[process.id];
            if (!result) {
                var newSubProcesses = [];
                var delayFound = false;
                process.subProcesses.forEach(function (subProcess) {
                    newSubProcesses.push(subProcess.dispatchOn(_this));
                    if (!delayFound && _this.delayFoundCache[subProcess.id])
                        delayFound = true;
                });
                if (delayFound) {
                    this.cache[process.id] = result = this.graph.newCompositionProcess(newSubProcesses);
                }
                else {
                    this.cache[process.id] = result = process;
                }
                this.delayFoundCache[process.id] = delayFound;
            }
            return result;
        };
        DelaySuccessor.prototype.dispatchActionPrefixProcess = function (process) {
            var result = this.cache[process.id];
            if (!result) {
                result = this.cache[process.id] = process;
                this.delayFoundCache[process.id] = false;
            }
            return result;
        };
        DelaySuccessor.prototype.dispatchRestrictionProcess = function (process) {
            var result = this.cache[process.id];
            if (!result) {
                var newProcess = process.subProcess.dispatchOn(this);
                var delayFound = this.delayFoundCache[process.subProcess.id];
                if (delayFound) {
                    this.cache[process.id] = result = this.graph.newRestrictedProcess(newProcess, process.restrictedLabels);
                }
                else {
                    this.cache[process.id] = result = process;
                }
                this.delayFoundCache[process.id] = delayFound;
            }
            return result;
        };
        DelaySuccessor.prototype.dispatchRelabellingProcess = function (process) {
            var result = this.cache[process.id];
            if (!result) {
                var newProcess = process.subProcess.dispatchOn(this);
                var delayFound = this.delayFoundCache[process.subProcess.id];
                if (delayFound) {
                    this.cache[process.id] = result = this.graph.newRelabelingProcess(newProcess, process.relabellings);
                }
                else {
                    this.cache[process.id] = result = process;
                }
                this.delayFoundCache[process.id] = delayFound;
            }
            return result;
        };
        DelaySuccessor.prototype.dispatchDelayPrefixProcess = function (process) {
            var result = this.cache[process.id];
            if (!result) {
                if (process.delay.getDelay() > 1) {
                    var newDelay = new Delay(process.delay.getDelay() - 1);
                    this.cache[process.id] = result = this.graph.newDelayPrefixProcess(newDelay, process.nextProcess);
                    this.delayFoundCache[process.id] = true;
                }
                else if (process.delay.getDelay() === 1) {
                    this.cache[process.id] = result = process.nextProcess;
                    this.delayFoundCache[process.id] = true;
                }
                else {
                    throw "DelayPrefixProcess of delay 0";
                }
            }
            return result;
        };
        return DelaySuccessor;
    })();
    TCCS.DelaySuccessor = DelaySuccessor;
})(TCCS || (TCCS = {}));
var Traverse;
(function (Traverse) {
    var TCCSLabelledBracketNotation = (function (_super) {
        __extends(TCCSLabelledBracketNotation, _super);
        function TCCSLabelledBracketNotation() {
            _super.apply(this, arguments);
        }
        TCCSLabelledBracketNotation.prototype.dispatchDelayPrefixProcess = function (process) {
            this.stringPieces.push("[DelayPrefix");
            this.stringPieces.push(process.delay + ".");
            process.nextProcess.dispatchOn(this);
            this.stringPieces.push("]");
        };
        return TCCSLabelledBracketNotation;
    })(Traverse.LabelledBracketNotation);
    Traverse.TCCSLabelledBracketNotation = TCCSLabelledBracketNotation;
    var TCCSNotationVisitor = (function (_super) {
        __extends(TCCSNotationVisitor, _super);
        function TCCSNotationVisitor() {
            _super.apply(this, arguments);
        }
        TCCSNotationVisitor.prototype.dispatchDelayPrefixProcess = function (process) {
            var result = this.cache[process.id], subStr;
            if (!result) {
                subStr = process.nextProcess.dispatchOn(this);
                subStr = Traverse.wrapIfInstanceOf(subStr, process.nextProcess, [CCS.SummationProcess, CCS.CompositionProcess]);
                result = this.cache[process.id] = process.delay.toString() + "." + subStr;
            }
            return result;
        };
        return TCCSNotationVisitor;
    })(Traverse.CCSNotationVisitor);
    Traverse.TCCSNotationVisitor = TCCSNotationVisitor;
    var TCCSUnguardedRecursionChecker = (function (_super) {
        __extends(TCCSUnguardedRecursionChecker, _super);
        function TCCSUnguardedRecursionChecker() {
            _super.apply(this, arguments);
        }
        TCCSUnguardedRecursionChecker.prototype.dispatchDelayPrefixProcess = function (process) {
            return false;
        };
        return TCCSUnguardedRecursionChecker;
    })(Traverse.UnguardedRecursionChecker);
    Traverse.TCCSUnguardedRecursionChecker = TCCSUnguardedRecursionChecker;
    var TCCSProcessTreeReducer = (function (_super) {
        __extends(TCCSProcessTreeReducer, _super);
        function TCCSProcessTreeReducer(tccsgraph) {
            _super.call(this, tccsgraph);
            this.tccsgraph = tccsgraph;
        }
        TCCSProcessTreeReducer.prototype.dispatchDelayPrefixProcess = function (process) {
            var resultProcess = this.cache[process.id];
            if (!resultProcess) {
                var nextProcess = process.nextProcess;
                var resultDelay = process.delay.getDelay();
                while (nextProcess instanceof TCCS.DelayPrefixProcess) {
                    var nextDelayProcess = nextProcess;
                    resultDelay += nextDelayProcess.delay.getDelay();
                    nextProcess = nextDelayProcess.nextProcess;
                }
                if (resultDelay === 0) {
                    resultProcess = this.cache[process.id] = nextProcess.dispatchOn(this);
                }
                else {
                    nextProcess = nextProcess.dispatchOn(this);
                    resultProcess = this.cache[process.id] = this.tccsgraph.newDelayPrefixProcess(new TCCS.Delay(resultDelay), nextProcess);
                }
            }
            return resultProcess;
        };
        return TCCSProcessTreeReducer;
    })(Traverse.ProcessTreeReducer);
    Traverse.TCCSProcessTreeReducer = TCCSProcessTreeReducer;
    var UntimedSuccessorGenerator = (function (_super) {
        __extends(UntimedSuccessorGenerator, _super);
        function UntimedSuccessorGenerator(strictSuccGenerator, cache) {
            _super.call(this, [new TCCS.Delay(1)], strictSuccGenerator, cache);
        }
        return UntimedSuccessorGenerator;
    })(Traverse.AbstractingSuccessorGenerator);
    Traverse.UntimedSuccessorGenerator = UntimedSuccessorGenerator;
    var WeakUntimedSuccessorGenerator = (function (_super) {
        __extends(WeakUntimedSuccessorGenerator, _super);
        function WeakUntimedSuccessorGenerator(strictSuccGenerator, cache) {
            _super.call(this, [new CCS.Action("tau", false), new TCCS.Delay(1)], strictSuccGenerator, cache);
        }
        return WeakUntimedSuccessorGenerator;
    })(Traverse.AbstractingSuccessorGenerator);
    Traverse.WeakUntimedSuccessorGenerator = WeakUntimedSuccessorGenerator;
})(Traverse || (Traverse = {}));

module.exports.CCS = CCS; module.exports.HML = HML; module.exports.TCCS = TCCS; });

define("ace/mode/hml_worker",["require","exports","module","ace/lib/oop","ace/worker/mirror","ace/mode/ccs/hml_grammar","ace/mode/ccs/ccs","ace/mode/ccs/ccs"], function(require, exports, module) {
    "use strict";
    
    var oop = require("../lib/oop");
    var Mirror = require("../worker/mirror").Mirror;
    var HMLParser = require("./ccs/hml_grammar").HMLParser;
    var CCS = require("./ccs/ccs").CCS;
    var HML = require("./ccs/ccs").HML;

    var HmlWorker = exports.HmlWorker = function(sender) {
        Mirror.call(this, sender);
        this.setTimeout(1500);
    };
    oop.inherits(HmlWorker, Mirror);

    (function() {
        this.onUpdate = function() {
            var value = this.doc.getValue();
            var errors = [];
            var results = lint(value);            

            for (var i = 0; i < results.length; i++) {
                var error = results[i];
                errors.push({
                    row: error.line-1, // must be 0 based
                    column: error.column-1,  // must be 0 based
                    text: error.message,  // text to show in tooltip
                    type: "error"
                });
            }
            this.sender.emit("lint", errors);
        };
    }).call(HmlWorker.prototype);


    function lint(value) {
        var lines = value.split("\n");
        var e = [];
        
        var i = 0; 
        while (i < lines.length) {
            try {
                HMLParser.parse(value, {ccs: CCS, hml: HML});
            } catch (err) {
                var temp = err.line;
                
                err.line += i; // adjust line number
                e.push(err);
                var nextLines = lines.slice(0);
                nextLines.splice(0, i+temp);
                value = nextLines.join("\n");
                i += temp;
                continue;
            }

            break;
        }
        
        return e;
   } 



});

define("ace/lib/es5-shim",["require","exports","module"], function(require, exports, module) {

function Empty() {}

if (!Function.prototype.bind) {
    Function.prototype.bind = function bind(that) { // .length is 1
        var target = this;
        if (typeof target != "function") {
            throw new TypeError("Function.prototype.bind called on incompatible " + target);
        }
        var args = slice.call(arguments, 1); // for normal call
        var bound = function () {

            if (this instanceof bound) {

                var result = target.apply(
                    this,
                    args.concat(slice.call(arguments))
                );
                if (Object(result) === result) {
                    return result;
                }
                return this;

            } else {
                return target.apply(
                    that,
                    args.concat(slice.call(arguments))
                );

            }

        };
        if(target.prototype) {
            Empty.prototype = target.prototype;
            bound.prototype = new Empty();
            Empty.prototype = null;
        }
        return bound;
    };
}
var call = Function.prototype.call;
var prototypeOfArray = Array.prototype;
var prototypeOfObject = Object.prototype;
var slice = prototypeOfArray.slice;
var _toString = call.bind(prototypeOfObject.toString);
var owns = call.bind(prototypeOfObject.hasOwnProperty);
var defineGetter;
var defineSetter;
var lookupGetter;
var lookupSetter;
var supportsAccessors;
if ((supportsAccessors = owns(prototypeOfObject, "__defineGetter__"))) {
    defineGetter = call.bind(prototypeOfObject.__defineGetter__);
    defineSetter = call.bind(prototypeOfObject.__defineSetter__);
    lookupGetter = call.bind(prototypeOfObject.__lookupGetter__);
    lookupSetter = call.bind(prototypeOfObject.__lookupSetter__);
}
if ([1,2].splice(0).length != 2) {
    if(function() { // test IE < 9 to splice bug - see issue #138
        function makeArray(l) {
            var a = new Array(l+2);
            a[0] = a[1] = 0;
            return a;
        }
        var array = [], lengthBefore;
        
        array.splice.apply(array, makeArray(20));
        array.splice.apply(array, makeArray(26));

        lengthBefore = array.length; //46
        array.splice(5, 0, "XXX"); // add one element

        lengthBefore + 1 == array.length

        if (lengthBefore + 1 == array.length) {
            return true;// has right splice implementation without bugs
        }
    }()) {//IE 6/7
        var array_splice = Array.prototype.splice;
        Array.prototype.splice = function(start, deleteCount) {
            if (!arguments.length) {
                return [];
            } else {
                return array_splice.apply(this, [
                    start === void 0 ? 0 : start,
                    deleteCount === void 0 ? (this.length - start) : deleteCount
                ].concat(slice.call(arguments, 2)))
            }
        };
    } else {//IE8
        Array.prototype.splice = function(pos, removeCount){
            var length = this.length;
            if (pos > 0) {
                if (pos > length)
                    pos = length;
            } else if (pos == void 0) {
                pos = 0;
            } else if (pos < 0) {
                pos = Math.max(length + pos, 0);
            }

            if (!(pos+removeCount < length))
                removeCount = length - pos;

            var removed = this.slice(pos, pos+removeCount);
            var insert = slice.call(arguments, 2);
            var add = insert.length;            
            if (pos === length) {
                if (add) {
                    this.push.apply(this, insert);
                }
            } else {
                var remove = Math.min(removeCount, length - pos);
                var tailOldPos = pos + remove;
                var tailNewPos = tailOldPos + add - remove;
                var tailCount = length - tailOldPos;
                var lengthAfterRemove = length - remove;

                if (tailNewPos < tailOldPos) { // case A
                    for (var i = 0; i < tailCount; ++i) {
                        this[tailNewPos+i] = this[tailOldPos+i];
                    }
                } else if (tailNewPos > tailOldPos) { // case B
                    for (i = tailCount; i--; ) {
                        this[tailNewPos+i] = this[tailOldPos+i];
                    }
                } // else, add == remove (nothing to do)

                if (add && pos === lengthAfterRemove) {
                    this.length = lengthAfterRemove; // truncate array
                    this.push.apply(this, insert);
                } else {
                    this.length = lengthAfterRemove + add; // reserves space
                    for (i = 0; i < add; ++i) {
                        this[pos+i] = insert[i];
                    }
                }
            }
            return removed;
        };
    }
}
if (!Array.isArray) {
    Array.isArray = function isArray(obj) {
        return _toString(obj) == "[object Array]";
    };
}
var boxedString = Object("a"),
    splitString = boxedString[0] != "a" || !(0 in boxedString);

if (!Array.prototype.forEach) {
    Array.prototype.forEach = function forEach(fun /*, thisp*/) {
        var object = toObject(this),
            self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                object,
            thisp = arguments[1],
            i = -1,
            length = self.length >>> 0;
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(); // TODO message
        }

        while (++i < length) {
            if (i in self) {
                fun.call(thisp, self[i], i, object);
            }
        }
    };
}
if (!Array.prototype.map) {
    Array.prototype.map = function map(fun /*, thisp*/) {
        var object = toObject(this),
            self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                object,
            length = self.length >>> 0,
            result = Array(length),
            thisp = arguments[1];
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
        }

        for (var i = 0; i < length; i++) {
            if (i in self)
                result[i] = fun.call(thisp, self[i], i, object);
        }
        return result;
    };
}
if (!Array.prototype.filter) {
    Array.prototype.filter = function filter(fun /*, thisp */) {
        var object = toObject(this),
            self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                    object,
            length = self.length >>> 0,
            result = [],
            value,
            thisp = arguments[1];
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
        }

        for (var i = 0; i < length; i++) {
            if (i in self) {
                value = self[i];
                if (fun.call(thisp, value, i, object)) {
                    result.push(value);
                }
            }
        }
        return result;
    };
}
if (!Array.prototype.every) {
    Array.prototype.every = function every(fun /*, thisp */) {
        var object = toObject(this),
            self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                object,
            length = self.length >>> 0,
            thisp = arguments[1];
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
        }

        for (var i = 0; i < length; i++) {
            if (i in self && !fun.call(thisp, self[i], i, object)) {
                return false;
            }
        }
        return true;
    };
}
if (!Array.prototype.some) {
    Array.prototype.some = function some(fun /*, thisp */) {
        var object = toObject(this),
            self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                object,
            length = self.length >>> 0,
            thisp = arguments[1];
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
        }

        for (var i = 0; i < length; i++) {
            if (i in self && fun.call(thisp, self[i], i, object)) {
                return true;
            }
        }
        return false;
    };
}
if (!Array.prototype.reduce) {
    Array.prototype.reduce = function reduce(fun /*, initial*/) {
        var object = toObject(this),
            self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                object,
            length = self.length >>> 0;
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
        }
        if (!length && arguments.length == 1) {
            throw new TypeError("reduce of empty array with no initial value");
        }

        var i = 0;
        var result;
        if (arguments.length >= 2) {
            result = arguments[1];
        } else {
            do {
                if (i in self) {
                    result = self[i++];
                    break;
                }
                if (++i >= length) {
                    throw new TypeError("reduce of empty array with no initial value");
                }
            } while (true);
        }

        for (; i < length; i++) {
            if (i in self) {
                result = fun.call(void 0, result, self[i], i, object);
            }
        }

        return result;
    };
}
if (!Array.prototype.reduceRight) {
    Array.prototype.reduceRight = function reduceRight(fun /*, initial*/) {
        var object = toObject(this),
            self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                object,
            length = self.length >>> 0;
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
        }
        if (!length && arguments.length == 1) {
            throw new TypeError("reduceRight of empty array with no initial value");
        }

        var result, i = length - 1;
        if (arguments.length >= 2) {
            result = arguments[1];
        } else {
            do {
                if (i in self) {
                    result = self[i--];
                    break;
                }
                if (--i < 0) {
                    throw new TypeError("reduceRight of empty array with no initial value");
                }
            } while (true);
        }

        do {
            if (i in this) {
                result = fun.call(void 0, result, self[i], i, object);
            }
        } while (i--);

        return result;
    };
}
if (!Array.prototype.indexOf || ([0, 1].indexOf(1, 2) != -1)) {
    Array.prototype.indexOf = function indexOf(sought /*, fromIndex */ ) {
        var self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                toObject(this),
            length = self.length >>> 0;

        if (!length) {
            return -1;
        }

        var i = 0;
        if (arguments.length > 1) {
            i = toInteger(arguments[1]);
        }
        i = i >= 0 ? i : Math.max(0, length + i);
        for (; i < length; i++) {
            if (i in self && self[i] === sought) {
                return i;
            }
        }
        return -1;
    };
}
if (!Array.prototype.lastIndexOf || ([0, 1].lastIndexOf(0, -3) != -1)) {
    Array.prototype.lastIndexOf = function lastIndexOf(sought /*, fromIndex */) {
        var self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                toObject(this),
            length = self.length >>> 0;

        if (!length) {
            return -1;
        }
        var i = length - 1;
        if (arguments.length > 1) {
            i = Math.min(i, toInteger(arguments[1]));
        }
        i = i >= 0 ? i : length - Math.abs(i);
        for (; i >= 0; i--) {
            if (i in self && sought === self[i]) {
                return i;
            }
        }
        return -1;
    };
}
if (!Object.getPrototypeOf) {
    Object.getPrototypeOf = function getPrototypeOf(object) {
        return object.__proto__ || (
            object.constructor ?
            object.constructor.prototype :
            prototypeOfObject
        );
    };
}
if (!Object.getOwnPropertyDescriptor) {
    var ERR_NON_OBJECT = "Object.getOwnPropertyDescriptor called on a " +
                         "non-object: ";
    Object.getOwnPropertyDescriptor = function getOwnPropertyDescriptor(object, property) {
        if ((typeof object != "object" && typeof object != "function") || object === null)
            throw new TypeError(ERR_NON_OBJECT + object);
        if (!owns(object, property))
            return;

        var descriptor, getter, setter;
        descriptor =  { enumerable: true, configurable: true };
        if (supportsAccessors) {
            var prototype = object.__proto__;
            object.__proto__ = prototypeOfObject;

            var getter = lookupGetter(object, property);
            var setter = lookupSetter(object, property);
            object.__proto__ = prototype;

            if (getter || setter) {
                if (getter) descriptor.get = getter;
                if (setter) descriptor.set = setter;
                return descriptor;
            }
        }
        descriptor.value = object[property];
        return descriptor;
    };
}
if (!Object.getOwnPropertyNames) {
    Object.getOwnPropertyNames = function getOwnPropertyNames(object) {
        return Object.keys(object);
    };
}
if (!Object.create) {
    var createEmpty;
    if (Object.prototype.__proto__ === null) {
        createEmpty = function () {
            return { "__proto__": null };
        };
    } else {
        createEmpty = function () {
            var empty = {};
            for (var i in empty)
                empty[i] = null;
            empty.constructor =
            empty.hasOwnProperty =
            empty.propertyIsEnumerable =
            empty.isPrototypeOf =
            empty.toLocaleString =
            empty.toString =
            empty.valueOf =
            empty.__proto__ = null;
            return empty;
        }
    }

    Object.create = function create(prototype, properties) {
        var object;
        if (prototype === null) {
            object = createEmpty();
        } else {
            if (typeof prototype != "object")
                throw new TypeError("typeof prototype["+(typeof prototype)+"] != 'object'");
            var Type = function () {};
            Type.prototype = prototype;
            object = new Type();
            object.__proto__ = prototype;
        }
        if (properties !== void 0)
            Object.defineProperties(object, properties);
        return object;
    };
}

function doesDefinePropertyWork(object) {
    try {
        Object.defineProperty(object, "sentinel", {});
        return "sentinel" in object;
    } catch (exception) {
    }
}
if (Object.defineProperty) {
    var definePropertyWorksOnObject = doesDefinePropertyWork({});
    var definePropertyWorksOnDom = typeof document == "undefined" ||
        doesDefinePropertyWork(document.createElement("div"));
    if (!definePropertyWorksOnObject || !definePropertyWorksOnDom) {
        var definePropertyFallback = Object.defineProperty;
    }
}

if (!Object.defineProperty || definePropertyFallback) {
    var ERR_NON_OBJECT_DESCRIPTOR = "Property description must be an object: ";
    var ERR_NON_OBJECT_TARGET = "Object.defineProperty called on non-object: "
    var ERR_ACCESSORS_NOT_SUPPORTED = "getters & setters can not be defined " +
                                      "on this javascript engine";

    Object.defineProperty = function defineProperty(object, property, descriptor) {
        if ((typeof object != "object" && typeof object != "function") || object === null)
            throw new TypeError(ERR_NON_OBJECT_TARGET + object);
        if ((typeof descriptor != "object" && typeof descriptor != "function") || descriptor === null)
            throw new TypeError(ERR_NON_OBJECT_DESCRIPTOR + descriptor);
        if (definePropertyFallback) {
            try {
                return definePropertyFallback.call(Object, object, property, descriptor);
            } catch (exception) {
            }
        }
        if (owns(descriptor, "value")) {

            if (supportsAccessors && (lookupGetter(object, property) ||
                                      lookupSetter(object, property)))
            {
                var prototype = object.__proto__;
                object.__proto__ = prototypeOfObject;
                delete object[property];
                object[property] = descriptor.value;
                object.__proto__ = prototype;
            } else {
                object[property] = descriptor.value;
            }
        } else {
            if (!supportsAccessors)
                throw new TypeError(ERR_ACCESSORS_NOT_SUPPORTED);
            if (owns(descriptor, "get"))
                defineGetter(object, property, descriptor.get);
            if (owns(descriptor, "set"))
                defineSetter(object, property, descriptor.set);
        }

        return object;
    };
}
if (!Object.defineProperties) {
    Object.defineProperties = function defineProperties(object, properties) {
        for (var property in properties) {
            if (owns(properties, property))
                Object.defineProperty(object, property, properties[property]);
        }
        return object;
    };
}
if (!Object.seal) {
    Object.seal = function seal(object) {
        return object;
    };
}
if (!Object.freeze) {
    Object.freeze = function freeze(object) {
        return object;
    };
}
try {
    Object.freeze(function () {});
} catch (exception) {
    Object.freeze = (function freeze(freezeObject) {
        return function freeze(object) {
            if (typeof object == "function") {
                return object;
            } else {
                return freezeObject(object);
            }
        };
    })(Object.freeze);
}
if (!Object.preventExtensions) {
    Object.preventExtensions = function preventExtensions(object) {
        return object;
    };
}
if (!Object.isSealed) {
    Object.isSealed = function isSealed(object) {
        return false;
    };
}
if (!Object.isFrozen) {
    Object.isFrozen = function isFrozen(object) {
        return false;
    };
}
if (!Object.isExtensible) {
    Object.isExtensible = function isExtensible(object) {
        if (Object(object) === object) {
            throw new TypeError(); // TODO message
        }
        var name = '';
        while (owns(object, name)) {
            name += '?';
        }
        object[name] = true;
        var returnValue = owns(object, name);
        delete object[name];
        return returnValue;
    };
}
if (!Object.keys) {
    var hasDontEnumBug = true,
        dontEnums = [
            "toString",
            "toLocaleString",
            "valueOf",
            "hasOwnProperty",
            "isPrototypeOf",
            "propertyIsEnumerable",
            "constructor"
        ],
        dontEnumsLength = dontEnums.length;

    for (var key in {"toString": null}) {
        hasDontEnumBug = false;
    }

    Object.keys = function keys(object) {

        if (
            (typeof object != "object" && typeof object != "function") ||
            object === null
        ) {
            throw new TypeError("Object.keys called on a non-object");
        }

        var keys = [];
        for (var name in object) {
            if (owns(object, name)) {
                keys.push(name);
            }
        }

        if (hasDontEnumBug) {
            for (var i = 0, ii = dontEnumsLength; i < ii; i++) {
                var dontEnum = dontEnums[i];
                if (owns(object, dontEnum)) {
                    keys.push(dontEnum);
                }
            }
        }
        return keys;
    };

}
if (!Date.now) {
    Date.now = function now() {
        return new Date().getTime();
    };
}
var ws = "\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003" +
    "\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028" +
    "\u2029\uFEFF";
if (!String.prototype.trim || ws.trim()) {
    ws = "[" + ws + "]";
    var trimBeginRegexp = new RegExp("^" + ws + ws + "*"),
        trimEndRegexp = new RegExp(ws + ws + "*$");
    String.prototype.trim = function trim() {
        return String(this).replace(trimBeginRegexp, "").replace(trimEndRegexp, "");
    };
}

function toInteger(n) {
    n = +n;
    if (n !== n) { // isNaN
        n = 0;
    } else if (n !== 0 && n !== (1/0) && n !== -(1/0)) {
        n = (n > 0 || -1) * Math.floor(Math.abs(n));
    }
    return n;
}

function isPrimitive(input) {
    var type = typeof input;
    return (
        input === null ||
        type === "undefined" ||
        type === "boolean" ||
        type === "number" ||
        type === "string"
    );
}

function toPrimitive(input) {
    var val, valueOf, toString;
    if (isPrimitive(input)) {
        return input;
    }
    valueOf = input.valueOf;
    if (typeof valueOf === "function") {
        val = valueOf.call(input);
        if (isPrimitive(val)) {
            return val;
        }
    }
    toString = input.toString;
    if (typeof toString === "function") {
        val = toString.call(input);
        if (isPrimitive(val)) {
            return val;
        }
    }
    throw new TypeError();
}
var toObject = function (o) {
    if (o == null) { // this matches both null and undefined
        throw new TypeError("can't convert "+o+" to object");
    }
    return Object(o);
};

});
