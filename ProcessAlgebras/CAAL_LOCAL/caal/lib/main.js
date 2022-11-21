/// <reference path="../main.ts" />
/// <reference path="../../lib/ccs.d.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var PropertyStatus;
(function (PropertyStatus) {
    PropertyStatus[PropertyStatus["satisfied"] = 0] = "satisfied";
    PropertyStatus[PropertyStatus["unsatisfied"] = 1] = "unsatisfied";
    PropertyStatus[PropertyStatus["invalid"] = 2] = "invalid";
    PropertyStatus[PropertyStatus["unknown"] = 3] = "unknown";
})(PropertyStatus || (PropertyStatus = {}));
;
var Property;
(function (_Property) {
    var Property = (function () {
        function Property(status) {
            if (status === void 0) { status = 3 /* unknown */; }
            this.error = "";
            this.icons = {
                "checkmark": $("<i class=\"fa fa-check-circle fa-lg text-success\"></i>"),
                "cross": $("<i class=\"fa fa-times-circle fa-lg text-danger\"></i>"),
                "triangle": $("<i class=\"fa fa-exclamation-triangle fa-lg text-danger\"></i>"),
                "questionmark": $("<i class=\"fa fa-question-circle fa-lg \"></i>")
            };
            this.project = Project.getInstance();
            this.status = status;
            this.id = Property.counter;
            Property.counter++;
        }
        Property.prototype.getId = function () {
            return this.id;
        };
        Property.prototype.getStatus = function () {
            return this.status;
        };
        Property.prototype.getComment = function () {
            return this.comment;
        };
        Property.prototype.getRow = function () {
            return this.$row;
        };
        Property.prototype.setRow = function ($row) {
            this.$row = $row;
        };
        Property.prototype.setTimeCell = function ($timeCell) {
            this.$timeCell = $timeCell;
        };
        Property.prototype.getElapsedTime = function () {
            return this.elapsedTime;
        };
        Property.prototype.startTimer = function () {
            var _this = this;
            var startTime = new Date().getTime();
            var updateTimer = function () {
                _this.elapsedTime = new Date().getTime() - startTime + " ms";
                _this.$timeCell.text(_this.elapsedTime);
            };
            this.timer = setInterval(updateTimer, 25);
        };
        Property.prototype.stopTimer = function () {
            clearInterval(this.timer);
        };
        Property.prototype.getStatusIcon = function () {
            switch (this.status) {
                case 3 /* unknown */:
                    return this.icons.questionmark;
                case 0 /* satisfied */:
                    return this.icons.checkmark;
                case 1 /* unsatisfied */:
                    return this.icons.cross;
                case 2 /* invalid */:
                    return this.icons.triangle;
            }
        };
        Property.prototype.setInvalidateStatus = function (error) {
            this.error = error;
            this.status = 2 /* invalid */;
        };
        Property.prototype.setUnknownStatus = function () {
            this.status = 3 /* unknown */;
            this.elapsedTime = "";
        };
        Property.prototype.abortVerification = function () {
            this.worker.terminate();
            this.worker = null;
            this.stopTimer();
            this.setUnknownStatus();
        };
        Property.prototype.verify = function (callback) {
            var _this = this;
            if (!this.isReadyForVerification()) {
                console.log("something is wrong, please check the property");
                callback(this);
                return;
            }
            this.startTimer();
            var program = this.project.getCCS();
            var inputMode = InputMode[this.project.getInputMode()];
            this.worker = new Worker("lib/workers/verifier.js");
            this.worker.postMessage({
                type: "program",
                program: program,
                inputMode: inputMode
            });
            this.worker.postMessage(this.getWorkerMessage());
            this.worker.addEventListener("error", function (error) {
                _this.worker.terminate();
                _this.worker = null;
                _this.setInvalidateStatus(error.message);
                _this.stopTimer();
                callback(_this);
            }, false);
            this.worker.addEventListener("message", function (event) {
                _this.workerFinished(event, callback);
            });
        };
        Property.prototype.workerFinished = function (event, callback) {
            this.worker.terminate();
            this.worker = null;
            this.onWorkerFinished(event);
            this.stopTimer();
            callback(this); /* verification ended */
        };
        Property.prototype.onWorkerFinished = function (event) {
            var res = (typeof event.data.result === "boolean") ? event.data.result : 3 /* unknown */;
            if (res === true) {
                this.status = 0 /* satisfied */;
            }
            else if (res === false) {
                this.status = 1 /* unsatisfied */;
            }
            else {
                this.status = res;
            }
        };
        Property.prototype.getWorkerMessage = function () {
            throw "Not implemented by subclass";
        };
        Property.prototype.getDescription = function () {
            throw "Not implemented by subclass";
        };
        Property.prototype.toJSON = function () {
            throw "Not implemented by subclass";
        };
        Property.prototype.isReadyForVerification = function () {
            throw "Not implemented by subclass";
        };
        Property.prototype.getGameConfiguration = function () {
            throw "Not implemented by subclass";
        };
        Property.counter = 0;
        return Property;
    })();
    _Property.Property = Property;
    var HML = (function (_super) {
        __extends(HML, _super);
        function HML(options, status) {
            if (status === void 0) { status = 3 /* unknown */; }
            _super.call(this, status);
            this.process = options.process;
            this.definitions = options.definitions;
            this.topFormula = options.topFormula;
            this.comment = options.comment;
        }
        HML.prototype.getProcess = function () {
            return this.process;
        };
        HML.prototype.getTopFormula = function () {
            return this.topFormula;
        };
        HML.prototype.setTopFormula = function (formula) {
            this.topFormula = formula;
            this.setUnknownStatus();
        };
        HML.prototype.getDefinitions = function () {
            return this.definitions;
        };
        HML.prototype.getDescription = function () {
            var formula = this.topFormula.replace(";", "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            var definitions = this.definitions.split(";").map(function (d) {
                return "<span>" + d.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim() + "</span>";
            });
            return this.process + " &#8872; " + formula + definitions.join("");
        };
        HML.prototype.getGameConfiguration = function () {
            var formulaSetForProperty = this.project.getFormulaSetsForProperties()[this.id];
            var HmlConfiguration = Object.create(null), graph = this.project.getGraph();
            HmlConfiguration.succGen = CCS.getSuccGenerator(this.project.getGraph(), { inputMode: InputMode[this.project.getInputMode()], succGen: "strong", reduce: false });
            HmlConfiguration.processName = this.process;
            HmlConfiguration.propertyId = this.id;
            HmlConfiguration.formulaId = formulaSetForProperty.getTopFormula().id;
            return HmlConfiguration;
        };
        HML.prototype.toJSON = function () {
            return {
                className: "HML",
                status: this.status,
                options: {
                    process: this.process,
                    definitions: this.definitions,
                    topFormula: this.topFormula,
                    comment: this.comment
                }
            };
        };
        /**
         * Checks whehter the process is defined, and the property is not invalid, and the HML syntactically correct.
         * @return {boolean} if true everything is defined correctly.
         */
        HML.prototype.isReadyForVerification = function () {
            var isReady = true;
            var error = "";
            if (!this.getProcess()) {
                isReady = false;
                error = "There is no process selected.";
            }
            else {
                // if they are defined check whether they are defined in the CCS-program
                var processList = this.project.getGraph().getNamedProcesses();
                if (processList.indexOf(this.getProcess()) === -1) {
                    error = "The processes selected is not defined in the CCS program.";
                    isReady = false;
                }
            }
            /**
             * HML syntax check (simple)
             * complete syntax check are done by the worker, it will post a error if the hml syntax did not parse.
             */
            if (!this.topFormula || this.topFormula === "") {
                error = "Formula is not defined.";
                isReady = false;
            }
            if (!isReady) {
                this.setInvalidateStatus(error);
            }
            return isReady;
        };
        HML.prototype.getWorkerMessage = function () {
            return {
                type: "checkFormula",
                processName: this.process,
                useStrict: false,
                definitions: this.definitions,
                formula: this.topFormula
            };
        };
        return HML;
    })(Property);
    _Property.HML = HML;
    var Relation = (function (_super) {
        __extends(Relation, _super);
        function Relation(options, status) {
            if (status === void 0) { status = 3 /* unknown */; }
            _super.call(this, status);
            this.firstProcess = options.firstProcess;
            this.secondProcess = options.secondProcess;
            this.type = options.type;
            this.time = options.time;
            this.comment = options.comment;
        }
        Relation.prototype.getFirstProcess = function () {
            return this.firstProcess;
        };
        Relation.prototype.getSecondProcess = function () {
            return this.secondProcess;
        };
        Relation.prototype.getType = function () {
            return this.type;
        };
        Relation.prototype.getTime = function () {
            return this.time;
        };
        Relation.prototype.getTimeSubscript = function () {
            if (this.project.getInputMode() === 0 /* CCS */) {
                return "";
            }
            else {
                return "<sub>" + (this.time === "untimed" ? "u" : "t") + "</sub>";
            }
        };
        Relation.prototype.getGameConfiguration = function () {
            return {
                leftProcess: this.firstProcess,
                rightProcess: this.secondProcess,
                type: this.type,
                time: this.time ? this.time : "",
                relation: this.getClassName(),
                playerType: this.status === 0 /* satisfied */ ? "attacker" : "defender"
            };
        };
        Relation.prototype.toJSON = function () {
            return {
                className: this.getClassName(),
                status: this.status,
                options: {
                    type: this.type,
                    time: this.time,
                    firstProcess: this.firstProcess,
                    secondProcess: this.secondProcess,
                    comment: this.comment
                }
            };
        };
        Relation.prototype.getWorkerMessage = function () {
            return {
                type: this.getWorkerHandler(),
                time: this.time,
                leftProcess: this.firstProcess,
                rightProcess: this.secondProcess
            };
        };
        /**
         * Check whether both process(first and second) is defined, and it exists in the CCS program.
         * And property status must not be invalid.
         * @return {boolean} if true, everything is defined.
         */
        Relation.prototype.isReadyForVerification = function () {
            var isReady = true;
            var error = "";
            if (!this.getFirstProcess() && !this.getSecondProcess()) {
                isReady = false;
                error = "Two processes must be selected";
            }
            else {
                // if they are defined check whether they are defined in the CCS-program
                var processList = this.project.getGraph().getNamedProcesses();
                if (processList.indexOf(this.getFirstProcess()) === -1 || processList.indexOf(this.getSecondProcess()) === -1) {
                    isReady = false;
                    error = "One of the processes is not defined in the CCS program.";
                }
            }
            if (!isReady) {
                this.setInvalidateStatus(error);
            }
            return isReady;
        };
        Relation.prototype.getClassName = function () {
            throw "Not implemented by class";
        };
        Relation.prototype.getWorkerHandler = function () {
            throw "Not implemented by subclass";
        };
        return Relation;
    })(Property);
    _Property.Relation = Relation;
    var DistinguishingFormula = (function (_super) {
        __extends(DistinguishingFormula, _super);
        function DistinguishingFormula(options, status) {
            if (status === void 0) { status = 3 /* unknown */; }
            _super.call(this, options, status);
        }
        DistinguishingFormula.prototype.generateDistinguishingFormula = function (generationEnded) {
            throw "Not implemented by subclass";
        };
        return DistinguishingFormula;
    })(Relation);
    _Property.DistinguishingFormula = DistinguishingFormula;
    var Bisimulation = (function (_super) {
        __extends(Bisimulation, _super);
        function Bisimulation(options, status) {
            if (status === void 0) { status = 3 /* unknown */; }
            _super.call(this, options, status);
        }
        Bisimulation.prototype.generateDistinguishingFormula = function (generationEnded) {
            var _this = this;
            // start the worker, and make the worker generationEnded with the result.
            var program = this.project.getCCS();
            this.worker = new Worker("lib/workers/verifier.js");
            this.worker.postMessage({
                type: "program",
                program: program,
                inputMode: InputMode[this.project.getInputMode()]
            });
            this.worker.postMessage({
                type: "findDistinguishingFormula",
                leftProcess: this.getFirstProcess(),
                rightProcess: this.getSecondProcess(),
                succGenType: _super.prototype.getType.call(this)
            });
            this.worker.addEventListener("error", function (error) {
                _this.worker.terminate();
                _this.worker = null;
                _this.setInvalidateStatus(error.message);
                _this.stopTimer();
                generationEnded();
            }, false);
            this.worker.addEventListener("message", function (event) {
                _this.worker.terminate();
                _this.worker = null;
                if (!event.data.result.isBisimilar) {
                    var properties = {
                        firstProperty: new HML({ process: _this.firstProcess, topFormula: event.data.result.formula, definitions: "" }),
                        secondProperty: new HML({ process: _this.secondProcess, topFormula: event.data.result.formula, definitions: "" })
                    };
                    generationEnded(properties);
                }
                else {
                    _this.setInvalidateStatus("The two selected processes are bisimilar, and no distinguishing formula exists.");
                    _this.stopTimer();
                    generationEnded();
                }
            });
        };
        Bisimulation.prototype.getDescription = function () {
            var symbol = _super.prototype.getType.call(this) === "strong" ? "&#8764;" : "&#8776;";
            return this.firstProcess + " " + symbol + _super.prototype.getTimeSubscript.call(this) + " " + this.secondProcess;
        };
        Bisimulation.prototype.getClassName = function () {
            return "Bisimulation";
        };
        Bisimulation.prototype.getWorkerHandler = function () {
            return _super.prototype.getType.call(this) === "strong" ? "isStronglyBisimilar" : "isWeaklyBisimilar";
        };
        return Bisimulation;
    })(DistinguishingFormula);
    _Property.Bisimulation = Bisimulation;
    var Simulation = (function (_super) {
        __extends(Simulation, _super);
        function Simulation(options, status) {
            if (status === void 0) { status = 3 /* unknown */; }
            _super.call(this, options, status);
        }
        Simulation.prototype.getDescription = function () {
            var symbol = _super.prototype.getType.call(this) === "strong" ? "&#8594;" : "&#8658;";
            return this.firstProcess + " sim<sub>" + symbol + _super.prototype.getTimeSubscript.call(this) + "</sub> " + this.secondProcess;
        };
        Simulation.prototype.getClassName = function () {
            return "Simulation";
        };
        Simulation.prototype.getWorkerHandler = function () {
            return _super.prototype.getType.call(this) === "strong" ? "isStronglySimilar" : "isWeaklySimilar";
        };
        return Simulation;
    })(Relation);
    _Property.Simulation = Simulation;
    var SimulationEquivalence = (function (_super) {
        __extends(SimulationEquivalence, _super);
        function SimulationEquivalence(options, status) {
            if (status === void 0) { status = 3 /* unknown */; }
            _super.call(this, options, status);
        }
        SimulationEquivalence.prototype.getDescription = function () {
            var symbol = _super.prototype.getType.call(this) === "strong" ? "&#8771;" : "&#8778;";
            return this.firstProcess + " " + symbol + _super.prototype.getTimeSubscript.call(this) + " " + this.secondProcess;
        };
        SimulationEquivalence.prototype.getGameConfiguration = function () {
            return null;
        };
        SimulationEquivalence.prototype.getClassName = function () {
            return "SimulationEquivalence";
        };
        SimulationEquivalence.prototype.getWorkerHandler = function () {
            return _super.prototype.getType.call(this) === "strong" ? "isStronglySimulationEquivalent" : "isWeaklySimulationEquivalent";
        };
        return SimulationEquivalence;
    })(Relation);
    _Property.SimulationEquivalence = SimulationEquivalence;
    var Traces = (function (_super) {
        __extends(Traces, _super);
        function Traces(options, status) {
            _super.call(this, options, status);
            this.formula = null;
        }
        Traces.prototype.getGameConfiguration = function () {
            return null;
        };
        Traces.prototype.workerFinished = function (event, callback) {
            this.formula = event.data.result.formula;
            event.data.result = event.data.result.isSatisfied;
            _super.prototype.workerFinished.call(this, event, callback);
        };
        Traces.prototype.generateDistinguishingFormula = function (generationEnded) {
            // formula should already be generated when the formula was verified
            if (this.formula !== null) {
                var properties = {
                    firstProperty: new HML({ process: this.firstProcess, topFormula: this.formula, definitions: "" }),
                    secondProperty: new HML({ process: this.secondProcess, topFormula: this.formula, definitions: "" })
                };
                generationEnded(properties);
            }
            else {
                generationEnded();
            }
        };
        return Traces;
    })(DistinguishingFormula);
    _Property.Traces = Traces;
    var TraceEquivalence = (function (_super) {
        __extends(TraceEquivalence, _super);
        function TraceEquivalence(options, status) {
            if (status === void 0) { status = 3 /* unknown */; }
            _super.call(this, options, status);
        }
        TraceEquivalence.prototype.getDescription = function () {
            var symbol = _super.prototype.getType.call(this) === "strong" ? "&#8594;" : "&#8658;";
            return "Traces<sub>" + symbol + _super.prototype.getTimeSubscript.call(this) + "</sub>(" + this.firstProcess + ") = Traces<sub>" + symbol + _super.prototype.getTimeSubscript.call(this) + "</sub>(" + this.secondProcess + ")";
        };
        TraceEquivalence.prototype.getClassName = function () {
            return "TraceEquivalence";
        };
        TraceEquivalence.prototype.getWorkerHandler = function () {
            return _super.prototype.getType.call(this) === "strong" ? "isStronglyTraceEq" : "isWeaklyTraceEq";
        };
        return TraceEquivalence;
    })(Traces);
    _Property.TraceEquivalence = TraceEquivalence;
    var TraceInclusion = (function (_super) {
        __extends(TraceInclusion, _super);
        function TraceInclusion(options, status) {
            if (status === void 0) { status = 3 /* unknown */; }
            _super.call(this, options, status);
        }
        TraceInclusion.prototype.getDescription = function () {
            var symbol = _super.prototype.getType.call(this) === "strong" ? "&#8594;" : "&#8658;";
            return "Traces<sub>" + symbol + _super.prototype.getTimeSubscript.call(this) + "</sub>(" + this.getFirstProcess() + ") &sube; Traces<sub>" + symbol + _super.prototype.getTimeSubscript.call(this) + "</sub>(" + this.getSecondProcess() + ")";
        };
        TraceInclusion.prototype.getClassName = function () {
            return "TraceInclusion";
        };
        TraceInclusion.prototype.getWorkerHandler = function () {
            return _super.prototype.getType.call(this) === "strong" ? "isStronglyTraceIncluded" : "isWeaklyTraceIncluded";
        };
        return TraceInclusion;
    })(Traces);
    _Property.TraceInclusion = TraceInclusion;
})(Property || (Property = {}));
/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="../../lib/ace.d.ts" />
/// <reference path="../../lib/ccs.d.ts" />
/// <reference path="property.ts" />
var InputMode;
(function (InputMode) {
    InputMode[InputMode["CCS"] = 0] = "CCS";
    InputMode[InputMode["TCCS"] = 1] = "TCCS";
})(InputMode || (InputMode = {}));
var Project = (function () {
    function Project() {
        var _this = this;
        this.defaultTitle = "Untitled Project";
        this.defaultCCS = "";
        this.id = null;
        this.$projectTitle = $("#project-title");
        this.properties = Array();
        this.changed = false;
        this.inputMode = 0 /* CCS */;
        if (Project.instance) {
            throw new Error("Cannot instantiate singleton. Use getInstance() instead.");
        }
        else {
            Project.instance = this;
        }
        this.reset();
        this.$projectTitle.keypress(function (e) {
            return e.which != 13;
        }); // Disable line breaks. Can still be copy/pasted.
        this.$projectTitle.focusout(function () { return _this.onTitleChanged(); });
    }
    Project.getInstance = function () {
        if (Project.instance === null) {
            Project.instance = new Project();
        }
        return Project.instance;
    };
    Project.prototype.reset = function () {
        this.update(null, this.defaultTitle, this.defaultCCS, Array(), "CCS");
    };
    Project.prototype.update = function (id, title, ccs, properties, inputMode) {
        this.setId(id);
        this.setTitle(title);
        this.setCCS(ccs);
        this.setProperties(properties);
        this.setInputMode(InputMode[inputMode]);
        this.updateInputModeToggle();
        this.changed = true;
        $(document).trigger("ccs-changed");
    };
    Project.prototype.getId = function () {
        return this.id;
    };
    Project.prototype.setId = function (id) {
        this.id = id;
    };
    Project.prototype.getTitle = function () {
        return this.$projectTitle.text();
    };
    Project.prototype.setTitle = function (title) {
        this.$projectTitle.text(title);
    };
    Project.prototype.onTitleChanged = function () {
        var title = this.$projectTitle.text();
        if (title === "") {
            this.setTitle(this.defaultTitle);
        }
        else {
            this.setTitle(title); // Removes line breaks since $.text() trims line breaks.
        }
    };
    Project.prototype.getCCS = function () {
        return this.ccs;
    };
    Project.prototype.setCCS = function (ccs) {
        this.ccs = ccs;
    };
    Project.prototype.getProperties = function () {
        return this.properties;
    };
    Project.prototype.setProperties = function (properties) {
        this.properties = Array();
        for (var i = 0; i < properties.length; i++) {
            try {
                this.addProperty(new window["Property"][properties[i].className](properties[i].options, properties[i].status));
            }
            catch (e) {
                console.log("Unknown property type");
            }
        }
    };
    Project.prototype.addProperty = function (property) {
        this.properties.push(property);
    };
    Project.prototype.addPropertyAfter = function (id, property) {
        for (var i = 0; i < this.properties.length; i++) {
            if (this.properties[i].getId() === id) {
                this.properties.splice(i + 1, 0, property);
            }
        }
    };
    Project.prototype.deleteProperty = function (property) {
        var id = property.getId();
        for (var i = 0; i < this.properties.length; i++) {
            if (this.properties[i].getId() === id) {
                this.properties.splice(i, 1);
                break;
            }
        }
    };
    Project.prototype.getFormulaSetsForProperties = function () {
        var _this = this;
        var result = {};
        this.properties.forEach(function (prop) {
            if (prop instanceof Property.HML) {
                result[prop.getId()] = _this.createFormulaSetFromProperty(prop);
            }
        });
        return result;
    };
    Project.prototype.createFormulaSetFromProperty = function (property) {
        var formulaSet = new HML.FormulaSet;
        if (this.inputMode === 0 /* CCS */) {
            HMLParser.parse(property.getDefinitions(), { ccs: CCS, hml: HML, formulaSet: formulaSet });
            HMLParser.parse(property.getTopFormula(), { startRule: "TopFormula", ccs: CCS, hml: HML, formulaSet: formulaSet });
        }
        else if (this.inputMode === 1 /* TCCS */) {
            THMLParser.parse(property.getDefinitions(), { ccs: CCS, tccs: TCCS, hml: HML, formulaSet: formulaSet });
            THMLParser.parse(property.getTopFormula(), { startRule: "TopFormula", ccs: CCS, tccs: TCCS, hml: HML, formulaSet: formulaSet });
        }
        return formulaSet;
    };
    Project.prototype.isChanged = function () {
        return this.changed;
    };
    Project.prototype.setChanged = function (changed) {
        // Changed from false to true.
        if (changed !== this.changed && changed === true) {
            $(document).trigger("ccs-changed");
        }
        this.changed = changed;
    };
    Project.prototype.getInputMode = function () {
        return this.inputMode;
    };
    Project.prototype.updateInputModeToggle = function () {
        $("#input-mode").find("input[value=" + InputMode[this.inputMode] + "]").click();
    };
    Project.prototype.setInputMode = function (inputMode) {
        this.inputMode = inputMode;
    };
    Project.prototype.getGraph = function () {
        var graph;
        if (this.inputMode === 0 /* CCS */) {
            graph = new CCS.Graph();
            CCSParser.parse(this.ccs, { ccs: CCS, graph: graph });
        }
        else {
            graph = new TCCS.Graph();
            TCCSParser.parse(this.ccs, { ccs: CCS, tccs: TCCS, graph: graph });
        }
        return graph;
    };
    Project.prototype.isSaved = function () {
        return this.ccs === "";
    };
    Project.prototype.toJSON = function () {
        var properties = Array();
        for (var i = 0; i < this.properties.length; i++) {
            properties.push(this.properties[i].toJSON());
        }
        return {
            id: this.getId(),
            title: this.getTitle(),
            ccs: this.getCCS(),
            properties: properties,
            inputMode: InputMode[this.inputMode]
        };
    };
    Project.instance = null;
    return Project;
})();
var WebStorage = (function () {
    function WebStorage(storageObj) {
        this.storageObj = storageObj;
    }
    WebStorage.prototype.getStorageObj = function () {
        return this.storageObj;
    };
    WebStorage.prototype.get = function (key) {
        if (!this.isCompatible()) {
            return;
        }
        return this.storageObj.getItem(key);
    };
    WebStorage.prototype.getObj = function (key) {
        if (!this.isCompatible()) {
            return;
        }
        try {
            return JSON.parse(this.get(key));
        }
        catch (e) {
            console.log('Invalid JSON: ' + e.message);
        }
    };
    WebStorage.prototype.set = function (key, value) {
        if (!this.isCompatible()) {
            return;
        }
        this.storageObj.setItem(key, value);
    };
    WebStorage.prototype.setObj = function (key, value) {
        if (!this.isCompatible()) {
            return;
        }
        try {
            this.set(key, JSON.stringify(value));
        }
        catch (e) {
            console.log('Invalid JSON: ' + e.message);
        }
    };
    WebStorage.prototype.delete = function (key) {
        if (!this.isCompatible()) {
            return;
        }
        this.storageObj.removeItem(key);
    };
    WebStorage.prototype.isCompatible = function () {
        if (typeof (Storage) !== 'undefined') {
            return true;
        }
        else {
            console.log('Your browser does not support Web Storage.');
            return false;
        }
    };
    return WebStorage;
})();
var Activity;
(function (_Activity) {
    var Activity = (function () {
        function Activity(container, button, activeToggle) {
            var _this = this;
            if (activeToggle === void 0) { activeToggle = button; }
            this.project = Project.getInstance();
            this.$container = $(container);
            this.$button = $(button);
            this.$activeToggle = $(activeToggle);
            $(document).on("ccs-changed", function () { return _this.changed = true; });
        }
        Activity.prototype.getContainer = function () {
            return this.$container;
        };
        Activity.prototype.getButton = function () {
            return this.$button;
        };
        Activity.prototype.getActiveToggle = function () {
            return this.$activeToggle;
        };
        Activity.prototype.showMessageBox = function (title, message) {
            $("#message-box-title").text(title);
            $("#message-box-body").text(message);
            $("#message-box").modal("show");
        };
        Activity.prototype.checkPreconditions = function () {
            try {
                var graph = this.project.getGraph();
                if (graph.getNamedProcesses().length === 0) {
                    this.showMessageBox("No Named Processes", "There must be at least one named process in the program.");
                    return false;
                }
                var errors = graph.getErrors();
                if (errors.length > 0) {
                    this.showMessageBox("Error", errors.map(function (error) { return error.toString(); }).join("\n"));
                    return false;
                }
            }
            catch (error) {
                this.showMessageBox("Error", error);
                return false;
            }
            return true;
        };
        Activity.prototype.onShow = function (configuration) {
        };
        Activity.prototype.onHide = function () {
        };
        return Activity;
    })();
    _Activity.Activity = Activity;
})(Activity || (Activity = {}));
/// <reference path="activity.ts" />
var Activity;
(function (Activity) {
    var ActivityHandler = (function () {
        function ActivityHandler() {
            this.activities = [];
        }
        ActivityHandler.prototype.addActivity = function (name, activity) {
            var _this = this;
            this.activities[name] = activity;
            activity.getButton().on("click", function () {
                _this.selectActivity(name);
            });
            activity.getContainer().hide();
        };
        ActivityHandler.prototype.selectActivity = function (name, configuration) {
            var activity = this.activities[name];
            if (activity.checkPreconditions()) {
                if (this.currentActivity) {
                    this.currentActivity.onHide();
                    this.currentActivity.getContainer().hide();
                    this.currentActivity.getActiveToggle().removeClass("active");
                }
                this.currentActivity = activity;
                this.currentActivity.getContainer().show();
                this.currentActivity.getActiveToggle().addClass("active");
                activity.onShow(configuration);
            }
        };
        return ActivityHandler;
    })();
    Activity.ActivityHandler = ActivityHandler;
})(Activity || (Activity = {}));
/// <reference path="../project.ts" />
/// <reference path="../storage.ts" />
/// <reference path="../../activity/activityhandler.ts" />
var MenuItem = (function () {
    function MenuItem(button, activityHandler) {
        var _this = this;
        this.$button = $(button);
        this.activityHandler = activityHandler;
        this.project = Project.getInstance();
        this.storage = new WebStorage(localStorage);
        this.session = new WebStorage(sessionStorage);
        this.$confirmModal = $("#confirm-modal");
        this.$confirmModalNo = $("#confirm-modal-no");
        this.$confirmModalYes = $("#confirm-modal-yes");
        this.$button.on("click", function (e) { return _this.onClick(e); });
    }
    MenuItem.prototype.onClick = function (e) {
    };
    MenuItem.prototype.showConfirmModal = function (title, message, noText, yesText, noCallback, yesCallback) {
        this.$confirmModal.find(".modal-title").text(title);
        this.$confirmModal.find(".modal-body > p").text(message);
        this.$confirmModalNo.text(noText);
        this.$confirmModalYes.text(yesText);
        this.$confirmModalNo.off("click");
        this.$confirmModalYes.off("click");
        this.$confirmModalNo.on("click", noCallback);
        this.$confirmModalYes.on("click", yesCallback);
        this.$confirmModal.modal("show");
    };
    return MenuItem;
})();
/// <reference path="menuitem.ts" />
/// <reference path="../../activity/activityhandler.ts" />
var Save = (function (_super) {
    __extends(Save, _super);
    function Save(button, activityHandler) {
        var _this = this;
        _super.call(this, button, activityHandler);
        this.$saveFileButton = $("#save-file-btn");
        this.$saveMyProjectsButton = $("#save-projects-btn");
        this.$saveFileButton.on("click", function () { return _this.saveToFile(); });
        this.$saveMyProjectsButton.on("click", function () { return _this.saveToStorage(); });
    }
    Save.prototype.saveToFile = function () {
        var json = this.project.toJSON();
        json.id = null;
        var blob = new Blob([JSON.stringify(json)], { type: "text/plain" });
        this.$saveFileButton.attr("href", URL.createObjectURL(blob));
        this.$saveFileButton.attr("download", this.project.getTitle() + ".caal");
        Main.showNotification("Project saved!", 2000);
    };
    Save.prototype.saveToStorage = function () {
        this.storage.setObj("autosave", null); // Reset the auto save.
        var id = this.project.getId();
        var projects = this.storage.getObj("projects");
        if (id !== null) {
            for (var i = 0; i < projects.length; i++) {
                if (projects[i].id === id) {
                    if (projects[i].title !== this.project.getTitle()) {
                        this.project.setId(this.nextId());
                        projects.push(this.project.toJSON());
                    }
                    else {
                        projects[i] = this.project.toJSON();
                    }
                    this.storage.setObj("projects", projects);
                    break;
                }
            }
        }
        else {
            this.project.setId(this.nextId());
            if (projects) {
                projects.push(this.project.toJSON());
                this.storage.setObj("projects", projects);
            }
            else {
                this.storage.setObj("projects", [this.project.toJSON()]);
            }
        }
        Main.showNotification("Project saved!", 2000);
        $(document).trigger("save");
    };
    /*
     * Returns a unique id.
     * Does not consider holes in the id's.
     * E.g. [0, 1, 3] will return 4 and not 2.
     */
    Save.prototype.nextId = function () {
        var projects = this.storage.getObj("projects");
        if (!projects) {
            return 0;
        }
        projects.sort(function (a, b) {
            return a.id - b.id;
        });
        return projects[projects.length - 1].id + 1;
    };
    return Save;
})(MenuItem);
/// <reference path="menuitem.ts" />
/// <reference path="save.ts" />
/// <reference path="../../activity/activityhandler.ts" />
var New = (function (_super) {
    __extends(New, _super);
    function New() {
        _super.apply(this, arguments);
    }
    New.prototype.onClick = function (e) {
        var _this = this;
        var reset = function () {
            _this.storage.setObj("autosave", null); // Reset the auto save.
            _this.project.reset();
            _this.activityHandler.selectActivity("editor");
            Main.showNotification("New project created!", 2000);
        };
        var saveAndReset = function () {
            var save = new Save(null, _this.activityHandler);
            save.saveToStorage();
            reset();
        };
        if (this.project.isSaved()) {
            reset();
        }
        else {
            this.showConfirmModal("Save Changes", "Any unsaved changes will be lost. Save current project before proceeding?", "Don't Save", "Save", reset, saveAndReset);
        }
    };
    return New;
})(MenuItem);
var examples = [
    {
        title: "Peterson's Algorithm",
        ccs: [
            "* Peterson's algorithm for mutual exclusion.",
            "* See Chapter 7 of \"Reactive Systems\" for a full description.",
            "",
            "B1f = 'b1rf.B1f + b1wf.B1f + b1wt.B1t;",
            "B1t = 'b1rt.B1t + b1wf.B1f + b1wt.B1t;",
            "",
            "B2f = 'b2rf.B2f + b2wf.B2f + b2wt.B2t;",
            "B2t = 'b2rt.B2t + b2wf.B2f + b2wt.B2t;",
            "",
            "K1 = 'kr1.K1 + kw1.K1 + kw2.K2;",
            "K2 = 'kr2.K2 + kw1.K1 + kw2.K2;",
            "",
            "P1 = 'b1wt.'kw2.P11;",
            "P11 = b2rf.P12 + b2rt.(kr2.P11 + kr1.P12);",
            "P12 = enter1.exit1.'b1wf.P1;",
            "",
            "P2 = 'b2wt.'kw1.P21;",
            "P21 = b1rf.P22 + b1rt.(kr1.P21 + kr2.P22);",
            "P22 = enter2.exit2.'b2wf.P2;",
            "",
            "set L = {b1rf, b2rf, b1rt, b2rt, b1wf, b2wf, b1wt, b2wt, kr1, kr2, kw1, kw2};",
            "Peterson = (P1 | P2 | B1f | B2f | K1) \\ L;",
            "",
            "Spec = enter1.exit1.Spec + enter2.exit2.Spec;"
        ].join("\n"),
        properties: [
            {
                className: "TraceEquivalence",
                status: 0,
                options: {
                    type: "weak",
                    firstProcess: "Peterson",
                    secondProcess: "Spec"
                }
            },
            {
                className: "Bisimulation",
                status: 1,
                options: {
                    type: "weak",
                    firstProcess: "Peterson",
                    secondProcess: "Spec"
                }
            },
            {
                className: "HML",
                status: 0,
                options: {
                    process: "Peterson",
                    definitions: "MutualExclusion max= [[enter1]][[enter2]]ff and [[enter2]][[enter1]]ff and [-]MutualExclusion;",
                    topFormula: "MutualExclusion;",
                    comment: "An invariant property that guarantees that immediately after enter1 it is not possible to perform enter2 and vice versa. "
                }
            }
        ],
        inputMode: "CCS"
    },
    {
        title: "Orchard",
        ccs: [
            "Man = 'shake.(redapple.walk.Man + greenapple.walk.Man);",
            "",
            "AppleTree = shake.('greenapple.AppleTree + 'redapple.AppleTree);",
            "",
            "Orchard = (AppleTree | Man) \\ {shake, redapple, greenapple};",
            "",
            "Spec = walk.Spec;"
        ].join("\n"),
        properties: [
            {
                className: "Bisimulation",
                status: 3,
                options: {
                    type: "strong",
                    firstProcess: "Orchard",
                    secondProcess: "Spec"
                }
            },
            {
                className: "Bisimulation",
                status: 3,
                options: {
                    type: "weak",
                    firstProcess: "Orchard",
                    secondProcess: "Spec"
                }
            }
        ],
        inputMode: "CCS"
    },
    {
        title: "Simple Communication Protocol",
        ccs: [
            "* The implementation and specification given below are not weakly bisimilar.",
            "* See if you can correct the implementation such that it is weakly bisimilar to its specification.",
            "",
            "Send = acc.Sending;",
            "Sending = 'send.Wait;",
            "Wait = ack.Send + error.Sending + 'send.Wait;",
            "",
            "Rec = trans.Del;",
            "Del = 'del.Ack;",
            "Ack = 'ack.Rec;",
            "",
            "Med = send.Med';",
            "Med' = 'trans.Med + tau.Err + tau.Med;",
            "Err = 'error.Med;",
            "",
            "set L = {send, trans, ack, error};",
            "Impl = (Send | Med | Rec) \\ L;",
            "Spec = acc.'del.Spec;"
        ].join("\n"),
        properties: [
            {
                className: "Bisimulation",
                status: 1,
                options: {
                    type: "weak",
                    firstProcess: "Impl",
                    secondProcess: "Spec"
                }
            },
            {
                className: "TraceEquivalence",
                status: 1,
                options: {
                    type: "weak",
                    firstProcess: "Impl",
                    secondProcess: "Spec"
                }
            }
        ],
        inputMode: "CCS"
    },
    {
        title: "Lightswitch",
        ccs: [
            "Off = press.Light;",
            "Bright = press.Off;",
            "Light = 2.tau.press.Off + press.Bright;",
            "",
            "FastUser = 'press.1.'press.FastUser;",
            "SlowUser = 'press.3.'press.SlowUser;",
            "",
            "Lightswitch1 = (FastUser | Off) \\ {press};",
            "Lightswitch2 = (SlowUser | Off) \\ {press};"
        ].join("\n"),
        properties: [],
        inputMode: "TCCS"
    },
    {
        title: "Airbag",
        ccs: [
            "Driver = drive.Driver + drive.Crash;",
            "Crash  = 'crash.(inflate.Driver + 2.tau.0);",
            "",
            "GoodAirbag = crash.1.'inflate.GoodAirbag;",
            "BadAirbag  = crash.3.'inflate.BadAirbag;",
            "",
            "Impl1 = (Driver | GoodAirbag) \\ {crash, inflate};",
            "Impl2 = (Driver | BadAirbag) \\ {crash, inflate};",
            "Spec = drive.Spec;",
        ].join("\n"),
        properties: [],
        inputMode: "TCCS"
    },
    {
        title: "Timed Communication Protocol",
        ccs: [
            "Send = acc.2.'send.1.ack.2.Send;",
            "Rec = trans.1.'del.2.'ack.8.Rec;",
            "Med = send.(3.'trans.Med + 5.tau.Med);",
            "",
            "Impl = (Send | Med | Rec) \\ {send, trans, ack};",
            "Spec = acc.'del.Spec;",
        ].join("\n"),
        properties: [
            {
                className: "Bisimulation",
                status: 3,
                options: {
                    type: "weak",
                    time: "untimed",
                    firstProcess: "Impl",
                    secondProcess: "Spec"
                }
            },
            {
                className: "HML",
                status: 3,
                options: {
                    process: "Impl",
                    topFormula: "X;",
                    definitions: "X max= [acc]<<0,6>><'del>tt and [-]X;",
                    comment: "When acc is performed the message can be delivered within 6 time units."
                }
            },
            {
                className: "HML",
                status: 3,
                options: {
                    process: "Impl",
                    topFormula: "X;",
                    definitions: "X max= [acc]<<0,7>><'del>tt and [-]X;",
                    comment: "When acc is performed the message can be delivered within 7 time units."
                }
            }
        ],
        inputMode: "TCCS"
    },
    {
        title: "Fischer's Mutual Exclusion",
        ccs: [
            "* Fischer's Protocol for Mutual Exclusion (instance for two processes)",
            "",
            "* a template for process behaviour (to be instantiated by relabelling later on)",
            "Sleeping = try.(read0.Waiting + tau.Sleeping); * a visible 'try' action is used to avoid urgency ",
            "Waiting = 1.'writeMe.Trying; * wait one time unit and write my ID to the variable L",
            "Trying = 2.(readMe.CS + readNotMe.Sleeping);  * wait two time units, if the id in L is still me, enter critical section",
            "CS = enter.exit.'write0.Sleeping;",
            "",
            "* channel renaming to create two instances of the processes",
            "P1 = Sleeping[ write1/writeMe, read1/readMe, notme1/readNotMe ];",
            "P2 = Sleeping[ write2/writeMe, read2/readMe, notme2/readNotMe ];",
            "",
            "* implementation of variable L with values 0, 1, and 2",
            "Update = write0.L0 + write1.L1 + write2.L2;",
            "L0 = 'read0.L0 + Update + 'notme1.L0 + 'notme2.L0 ;",
            "L1 = 'read1.L1 + Update + 'notme2.L1;",
            "L2 = 'read2.L2 + Update + 'notme1.L2;",
            "",
            "set Internals = {read0, read1, read2, write0, write1, write2, notme1, notme2};",
            "System = (P1 | P2 | L0) \\ Internals; * protocol implementation",
            "",
            "EnterExit = enter.exit.EnterExit; * expected abstract behaviour of the protocol",
            "HideTry = try.HideTry; * allows the specification to ignore any 'try' actions",
            "Spec = EnterExit | HideTry; * specification of the protocol"
        ].join("\n"),
        properties: [
            {
                className: "TraceInclusion",
                status: 0,
                options: {
                    type: "weak",
                    time: "untimed",
                    firstProcess: "System",
                    secondProcess: "Spec",
                    comment: "Trace inclusion guarantees that the system must after every enter perform (possibly after some tau and try sequence) the exit action."
                }
            },
            {
                className: "HML",
                status: 0,
                options: {
                    process: "System",
                    definitions: "Safe max= [[enter]]NoMoreEnter and [-]Safe;\nNoMoreEnter max= [[enter]]ff and [[try]]NoMoreEnter;",
                    topFormula: "Safe; ",
                    comment: "Describes that it is impossible at any moment to perform two enters after each other, with only tau and try actions in between (after each enter we must eventually see exit before enter can be done again)."
                }
            },
            {
                className: "Simulation",
                status: 0,
                options: {
                    type: "weak",
                    time: "untimed",
                    firstProcess: "System",
                    secondProcess: "Spec",
                    comment: "Stronger property than trace inclusion but because it holds, it implies also trace inclusion and verification of simulation usually takes less time than trace inclusion."
                }
            }
        ],
        inputMode: "TCCS"
    },
    {
        title: "Dekker's Mutual Exclusion",
        ccs: [
            "* dekker-2 (written by David Walker) ",
            "* ",
            "* This file contains a development of Dekker's mutual exclusion algorithm for two processes. ",
            "* ",
            "* The specification is the agent \"Spec\", and the implementation is \"Dekker-2\". ",
            "* ",
            "* A complete description of this development of the algorithm can be ",
            "* found in the Edinburgh University technical report ECS-LFCS-89-91 ",
            "* by David Walker, entitled \"Automated Analysis of Mutual Exclusion Algorithms using CCS",
            "*",
            "* This example is taken diretly from CWB example database found here (using the CWB input syntax):",
            "* http://homepages.inf.ed.ac.uk/perdita/cwb/Examples/ccs/dekker-2.cwb",
            "",
            "agent B1f = 'b1rf.B1f + b1wf.B1f + b1wt.B1t; ",
            "agent B1t = 'b1rt.B1t + b1wt.B1t + b1wf.B1f; ",
            "agent B2f = 'b2rf.B2f + b2wf.B2f + b2wt.B2t; ",
            "agent B2t = 'b2rt.B2t + b2wt.B2t + b2wf.B2f; ",
            "",
            "agent K1 = 'kr1.K1 + kw1.K1 + kw2.K2; ",
            "agent K2 = 'kr2.K2 + kw2.K2 + kw1.K1; ",
            "",
            "agent P1 = 'b1wt.P11; ",
            "agent P11 = b2rf.P14 + b2rt.P12; ",
            "agent P12 = kr1.P11 + kr2.'b1wf.P13; ",
            "agent P13 = kr2.P13 + kr1.'b1wt.P11; ",
            "agent P14 = enter.exit.'kw2.'b1wf.P1; ",
            "",
            "agent P2 = 'b2wt.P21; ",
            "agent P21 = b1rf.P24 + b1rt.P22; ",
            "agent P22 = kr2.P21 + kr1.'b2wf.P23; ",
            "agent P23 = kr1.P23 + kr2.'b2wt.P21; ",
            "agent P24 = enter.exit.'kw1.'b2wf.P2;",
            "",
            "agent Pre-Dekker-2 = P1 | P2 | K1 | B1f | B2f; ",
            "set L = {b1rf,b1rt,b1wf,b1wt,b2rf,b2rt,b2wf,b2wt,kr1,kr2,kw1,kw2}; ",
            "agent Dekker-2 = Pre-Dekker-2\\L;",
            "",
            "agent Spec = enter.exit.Spec;"
        ].join("\n"),
        properties: [
            {
                className: "Bisimulation",
                status: 0,
                options: {
                    type: "weak",
                    time: "",
                    firstProcess: "Spec",
                    secondProcess: "Dekker-2",
                    comment: "The protocol guarantees mutual exclusion as the implementation and specification are weakly bisimilar."
                }
            },
            {
                className: "HML",
                status: "0",
                options: {
                    "process": "Dekker-2",
                    "definitions": "NoTwoEnter max= [[enter]][[enter]]ff and [-]NoTwoEnter;",
                    "topFormula": "NoTwoEnter;",
                    "comment": "The fixed point expresses the invariant that it is never possible to perform twice the action enter critical section after each other."
                }
            }
        ],
        inputMode: "CCS"
    },
    {
        title: "Basic Buffer Example",
        ccs: [
            "* This is a basic buffer example in CWB syntax taken form",
            "* http://homepages.inf.ed.ac.uk/perdita/cwb/Examples/ccs/ (basic.cwb)",
            "",
            "agent Buff3 = (C0 | C1 | C2)\\{c,d}; ",
            "agent C0 = Cell[c/b]; ",
            "agent C1 = Cell[c/a,d/b]; ",
            "agent C2 = Cell[d/a]; ",
            "agent Cell = a.'b.Cell; ",
            "",
            "agent Spec = a.Spec'; ",
            "agent Spec' = 'b.Spec + a.Spec'';",
            "agent Spec'' = 'b.Spec' + a.'b.Spec'';"
        ].join("\n"),
        properties: [
            {
                className: "HML",
                status: 0,
                options: {
                    process: "Buff3",
                    definitions: "Deadlock min= [-]ff or <->Deadlock;",
                    topFormula: "Deadlock;",
                    comment: "This property is checking the existence of deadlock."
                }
            },
            {
                className: "Bisimulation",
                status: 0,
                options: {
                    type: "weak",
                    firstProcess: "Buff3",
                    secondProcess: "Spec",
                    comment: "Buffer and its specification are weakly bisimilar."
                }
            }
        ],
        inputMode: "CCS"
    }
];
/// <reference path="menuitem.ts" />
/// <reference path="save.ts" />
/// <reference path="../examples.ts" />
/// <reference path="../../activity/activityhandler.ts" />
var Load = (function (_super) {
    __extends(Load, _super);
    function Load(button, activityHandler) {
        var _this = this;
        _super.call(this, button, activityHandler);
        this.$loadFileButton = $("#load-file-btn");
        this.$fileInput = $("#file-input");
        this.showProjects();
        this.showExamples();
        this.$loadFileButton.on("click", function () { return _this.loadFromFile(); });
        this.$fileInput.on("change", function (e) { return _this.readFile(e); });
        $(document).on("save", function () { return _this.showProjects(); });
        $(document).on("delete", function () { return _this.showProjects(); });
    }
    Load.prototype.readFile = function (e) {
        var _this = this;
        var file = e.target.files[0];
        var reader = new FileReader();
        reader.readAsText(file);
        reader.onload = function () {
            var project = JSON.parse(reader.result);
            _this.project.update(null, project.title, project.ccs, project.properties, project.inputMode);
            _this.activityHandler.selectActivity("editor");
            _this.$fileInput.replaceWith(_this.$fileInput = _this.$fileInput.clone(true)); // Clear input field.
            Main.showNotification("Project loaded!", 2000);
        };
    };
    Load.prototype.loadFromFile = function () {
        var _this = this;
        var load = function () {
            _this.storage.setObj("autosave", null); // Reset the auto save.
            _this.$fileInput.click();
        };
        var saveAndLoad = function () {
            var save = new Save(null, _this.activityHandler);
            save.saveToStorage();
            load();
        };
        if (this.project.isSaved()) {
            this.$fileInput.click();
        }
        else {
            this.showConfirmModal("Save Changes", "Any unsaved changes will be lost. Save current project before proceeding?", "Don't Save", "Save", load, saveAndLoad);
        }
    };
    Load.prototype.loadFromStorage = function (e) {
        var _this = this;
        var id = e.data.id;
        var load = function () {
            _this.storage.setObj("autosave", null); // Reset the auto save.
            var projects = _this.storage.getObj("projects");
            for (var i = 0; i < projects.length; i++) {
                if (projects[i].id === id) {
                    _this.project.update(id, projects[i].title, projects[i].ccs, projects[i].properties, projects[i].inputMode);
                    _this.activityHandler.selectActivity("editor");
                    Main.showNotification("Project loaded!", 2000);
                    break;
                }
            }
        };
        var saveAndLoad = function () {
            var save = new Save(null, _this.activityHandler);
            save.saveToStorage();
            load();
        };
        if (this.project.isSaved()) {
            load();
        }
        else {
            this.showConfirmModal("Save Changes", "Any unsaved changes will be lost. Save current project before proceeding?", "Don't Save", "Save", load, saveAndLoad);
        }
    };
    Load.prototype.loadExample = function (e) {
        var _this = this;
        var title = e.data.title;
        var load = function () {
            _this.storage.setObj("autosave", null); // Reset the auto save.
            for (var i = 0; i < examples.length; i++) {
                if (examples[i].title === title) {
                    _this.project.update(null, examples[i].title, examples[i].ccs, examples[i].properties, examples[i].inputMode);
                    _this.activityHandler.selectActivity("editor");
                    Main.showNotification("Example loaded!", 2000);
                    break;
                }
            }
        };
        var saveAndLoad = function () {
            var save = new Save(null, _this.activityHandler);
            save.saveToStorage();
            load();
        };
        if (this.project.isSaved()) {
            load();
        }
        else {
            this.showConfirmModal("Save Changes", "Any unsaved changes will be lost. Save current project before proceeding?", "Don't Save", "Save", load, saveAndLoad);
        }
    };
    Load.prototype.showProjects = function () {
        var _this = this;
        var projects = this.storage.getObj("projects");
        var $ccsProjects = $("#ccs-projects-list");
        var $tccsProjects = $("#tccs-projects-list");
        var ccsFound = false;
        var tccsFound = false;
        $("li.project").remove();
        if (projects) {
            projects.sort(function (a, b) {
                return b.title.localeCompare(a.title);
            });
            for (var i = 0; i < projects.length; i++) {
                var html = $("<li class=\"project\"><a>" + projects[i].title + "</a></li>");
                if (!projects[i].inputMode) {
                    // for backwards compatibility, if input is not defined, then default to CCS.
                    projects[i].inputMode = "CCS";
                }
                if (projects[i].inputMode.toLowerCase() === "ccs") {
                    ccsFound = true;
                    $ccsProjects.after(html);
                }
                else if (projects[i].inputMode.toLowerCase() === "tccs") {
                    tccsFound = true;
                    $tccsProjects.after(html);
                }
                html.on("click", { id: projects[i].id }, function (e) { return _this.loadFromStorage(e); });
            }
        }
        $ccsProjects.toggle(ccsFound).prev().toggle(ccsFound);
        $tccsProjects.toggle(tccsFound).prev().toggle(tccsFound);
    };
    Load.prototype.showExamples = function () {
        var _this = this;
        var $ccsExamples = $("#ccs-examples-list");
        var $tccsExamples = $("#tccs-examples-list");
        var ccsFound = false;
        var tccsFound = false;
        if (examples) {
            examples.sort(function (a, b) {
                return b.title.localeCompare(a.title);
            });
            for (var i = 0; i < examples.length; i++) {
                var html = $("<li><a>" + examples[i].title + "</a></li>");
                if (examples[i].inputMode.toLowerCase() === "ccs") {
                    ccsFound = true;
                    $ccsExamples.after(html);
                }
                else if (examples[i].inputMode.toLowerCase() === "tccs") {
                    tccsFound = true;
                    $tccsExamples.after(html);
                }
                html.on("click", { title: examples[i].title }, function (e) { return _this.loadExample(e); });
            }
        }
        $ccsExamples.toggle(ccsFound).prev().toggle(ccsFound);
        $tccsExamples.toggle(tccsFound).prev().toggle(tccsFound);
    };
    return Load;
})(MenuItem);
/// <reference path="menuitem.ts" />
/// <reference path="../../activity/activityhandler.ts" />
var Delete = (function (_super) {
    __extends(Delete, _super);
    function Delete(button, activityHandler) {
        var _this = this;
        _super.call(this, button, activityHandler);
        this.showProjects();
        $(document).on("save", function () { return _this.showProjects(); });
        $(document).on("delete", function () { return _this.showProjects(); });
    }
    Delete.prototype.deleteFromStorage = function (e) {
        var _this = this;
        var id = e.data.id;
        var callback = function () {
            var projects = _this.storage.getObj("projects");
            for (var i = 0; i < projects.length; i++) {
                if (projects[i].id === id) {
                    if (projects.length === 1) {
                        _this.storage.delete("projects");
                    }
                    else {
                        projects.splice(i, 1);
                        _this.storage.setObj("projects", projects);
                    }
                    _this.project.setId(null);
                    $(document).trigger("delete");
                    Main.showNotification("Project deleted!", 2000);
                    break;
                }
            }
        };
        this.showConfirmModal("Confirm Delete", "Are you sure you want to delete this project?", "Cancel", "Delete", null, callback);
    };
    Delete.prototype.showProjects = function () {
        var _this = this;
        var projects = this.storage.getObj("projects");
        var $ccsProjects = $("#ccs-delete-list");
        var $tccsProjects = $("#tccs-delete-list");
        var ccsFound = false;
        var tccsFound = false;
        $("li.delete").remove();
        if (projects) {
            this.$button.show();
            projects.sort(function (a, b) {
                return b.title.localeCompare(a.title);
            });
            for (var i = 0; i < projects.length; i++) {
                var html = $("<li class=\"delete\"><a>" + projects[i].title + "</a></li>");
                if (!projects[i].inputMode) {
                    // for backwards compatibility, if input is not defined, then default to CCS.
                    projects[i].inputMode = "CCS";
                }
                if (projects[i].inputMode.toLowerCase() === "ccs") {
                    ccsFound = true;
                    $ccsProjects.after(html);
                }
                else if (projects[i].inputMode.toLowerCase() === "tccs") {
                    tccsFound = true;
                    $tccsProjects.after(html);
                }
                html.on("click", { id: projects[i].id }, function (e) { return _this.deleteFromStorage(e); });
            }
        }
        else {
            this.$button.hide();
        }
        $ccsProjects.toggle(ccsFound);
        $tccsProjects.toggle(tccsFound).prev().toggle(ccsFound && tccsFound);
    };
    return Delete;
})(MenuItem);
/// <reference path="menuitem.ts" />
var Export = (function (_super) {
    __extends(Export, _super);
    function Export() {
        _super.apply(this, arguments);
    }
    Export.prototype.onClick = function (e) {
        var _this = this;
        this.doc = new PDFDocument();
        this.doc.info.Title = this.project.getTitle();
        this.doc.fontSize(26).font("Helvetica").fillColor("black").text(this.project.getTitle(), { align: "center" });
        this.doc.moveDown();
        this.project.setCCS(this.project.getCCS().replace("\r", "")); // remove return characters.
        var splitted = this.project.getCCS().split(/\n/);
        for (var line in splitted) {
            this.addLine(splitted[line]);
        }
        var stream = this.doc.pipe(blobStream());
        stream.on("finish", function () {
            window.open(stream.toBlobURL("application/pdf"), _this.project.getTitle());
        });
        this.doc.end();
    };
    Export.prototype.addLine = function (text) {
        if (text) {
            // match[1] contains the code. match[2] contains a potential comment.
            var match = text.match(/^([^\*]*)(\*.*)?$/);
            var continueCheck = true;
            if (match[1] === undefined) {
                match[1] = "";
            }
            if (match[2] === undefined) {
                match[2] = "";
                continueCheck = false;
            }
            this.doc.fontSize(10).font("Courier").fillColor("black").text(match[1], { continued: continueCheck }).fillColor("green").text(match[2], { continued: false });
        }
        else {
            this.doc.fontSize(10).font("Courier").text("\n");
        }
    };
    return Export;
})(MenuItem);
/// <reference path="jquery.hotkeys.d.ts" />
var HotkeyHandler = (function () {
    function HotkeyHandler() {
    }
    HotkeyHandler.prototype.setGlobalHotkeys = function (activityHandler, save) {
        jQuery.hotkeys.options.filterContentEditable = false;
        jQuery.hotkeys.options.filterTextInputs = false;
        jQuery.hotkeys.options.filterInputAcceptingElements = false;
        $(document).bind('keydown', 'ctrl+1', function () {
            activityHandler.selectActivity("editor");
            return false;
        });
        $(document).bind('keydown', 'ctrl+2', function () {
            activityHandler.selectActivity("explorer");
            return false;
        });
        $(document).bind('keydown', 'ctrl+3', function () {
            activityHandler.selectActivity("verifier");
            return false;
        });
        $(document).bind('keydown', 'ctrl+4', function () {
            activityHandler.selectActivity("game");
            return false;
        });
        $(document).bind('keydown', 'ctrl+s', function () {
            save.saveToStorage();
            return false;
        });
    };
    return HotkeyHandler;
})();
/// <reference path="storage.ts" />
/// <reference path="project.ts" />
var AutoSave = (function () {
    function AutoSave() {
        var _this = this;
        this.DELAY = 1000;
        this.project = Project.getInstance();
        this.storage = new WebStorage(localStorage);
        window.onbeforeunload = function () {
            if (_this.checkAutosave()) {
                // Alert user.
                return 'You have unsaved data!';
            }
            else {
                // Reset alert.
                window.onbeforeunload = undefined;
            }
        };
        window.onunload = function () {
            _this.setAutosave(null);
        };
    }
    AutoSave.prototype.autoSaveToStorage = function () {
        var id = this.project.getId();
        this.storage.setObj("autosave", this.project.toJSON());
        $(document).trigger("save");
    };
    AutoSave.prototype.resetTimer = function () {
        var _this = this;
        clearTimeout(this.timer);
        this.timer = setTimeout(function () { return _this.autoSaveToStorage(); }, this.DELAY);
    };
    AutoSave.prototype.checkAutosave = function () {
        if (this.storage.getObj("autosave")) {
            return true;
        }
        else {
            return false;
        }
    };
    AutoSave.prototype.getAutosave = function () {
        return this.storage.getObj("autosave");
    };
    AutoSave.prototype.setAutosave = function (value) {
        this.storage.setObj("autosave", value);
    };
    return AutoSave;
})();
/// <reference path="project.ts" />
var ContactForm;
(function (ContactForm) {
    function init() {
        // Get project
        var project = Project.getInstance();
        // Set version in contact form
        $("#contact-version").attr("placeholder", Main.getVersion());
        // Set validation on focusout
        $("#contact-form > .form-group").each(function (i, item) {
            $(item).on("focusout", function () {
                verifyFormGroup($(item));
            });
        });
        $("#contact-send").on("click", function () {
            var url = "mailer.php";
            if (!verifyForm()) {
                return false;
            }
            $.ajax({
                type: "POST",
                url: url,
                data: { subject: $("#contact-subject").val(), email: $("#contact-email").val(), text: $("#contact-text").val(), name: $("#contact-name").val(), project: ($('#contact-isAttached').is(':checked')) ? project.toJSON() : "", version: Main.getVersion() },
                success: function (data) {
                    if (data == "true") {
                        showSuccess();
                    }
                    else {
                        showError();
                    }
                },
                error: function (data) {
                    showError();
                }
            });
            return false; // avoid to execute the actual submit of the form.
        });
    }
    ContactForm.init = init;
    function verifyFormGroup(element) {
        var control = element.find(".form-control");
        var result = true;
        var test = control.attr('id');
        if (control.attr('id') == "contact-email") {
            result = validateEmail(control.val());
        }
        else {
            result = (control.val() == "") ? false : true;
        }
        if (result) {
            element.removeClass("has-error");
        }
        else {
            element.removeClass("has-error").addClass("has-error");
        }
        return result;
    }
    function verifyForm() {
        var result = true;
        $("#contact-form > .form-group").each(function (i, item) {
            var test = $(item).attr('class');
            result = (verifyFormGroup($(item))) ? result : false;
        });
        return result;
    }
    function validateEmail(email) {
        var re = /\S+@\S+/;
        return re.test(email);
    }
    function showSuccess() {
        $("#contactModal").modal("hide");
        Main.showNotification("Thank you!", 2000);
    }
    function showError() {
        $("#contactModal").modal("hide");
        Main.showNotification("An error occurred, please try again", 2000);
    }
})(ContactForm || (ContactForm = {}));
var Activity;
(function (Activity) {
    var Editor = (function (_super) {
        __extends(Editor, _super);
        function Editor(container, button) {
            var _this = this;
            _super.call(this, container, button);
            // http://stackoverflow.com/questions/11703093/
            this.handleClick = function (e) {
                if (!$(e.target).is(_this.$parse) && $(e.target).parents(".popover.in").length === 0) {
                    _this.$parse.popover("hide");
                }
            };
            this.project = Project.getInstance();
            this.$editor = $("#editor");
            this.$parse = $("#parse");
            this.editor = ace.edit(this.$editor[0]);
            this.editor.setTheme("ace/theme/crisp");
            this.editor.getSession().setMode("ace/mode/ccs");
            this.editor.getSession().setUseWrapMode(true);
            this.editor.setOptions({
                enableBasicAutocompletion: true,
                showPrintMargin: false,
                fontSize: 16,
                fontFamily: "Inconsolata",
            });
            this.editor.on("change", function () {
                if (_this.editor.curOp && _this.editor.curOp.command.name) {
                    _this.autosave.resetTimer();
                }
                _this.project.setCCS(_this.editor.getValue());
                _this.updateHeight();
            });
            this.autosave = new AutoSave();
            if (this.autosave.checkAutosave()) {
                var autosaveProject = this.autosave.getAutosave();
                this.project.update(0, autosaveProject.title, autosaveProject.ccs, autosaveProject.properties, autosaveProject.inputMode);
            }
            this.$parse.on("click", function () { return _this.parse(); });
            this.$parse.popover({ delay: { "show": 100, "hide": 100 }, html: true, placement: "bottom", trigger: "manual" });
            $("#input-mode").on("change", function (e) { return _this.setInputMode(e); });
            $("#font-size").on("change", function (e) { return _this.setFontSize(e); });
        }
        Editor.prototype.checkPreconditions = function () {
            return true;
        };
        Editor.prototype.onShow = function (configuration) {
            var _this = this;
            $(window).on("resize", function () { return _this.resize(); });
            this.resize();
            this.project.setChanged(false);
            this.initialCCS = this.editor.getValue();
            if (this.initialCCS !== this.project.getCCS()) {
                this.editor.setValue(this.project.getCCS());
                this.editor.clearSelection();
            }
            this.editor.focus();
        };
        Editor.prototype.onHide = function () {
            $(window).off("resize");
            this.project.setChanged(this.initialCCS !== this.project.getCCS());
        };
        Editor.prototype.parse = function () {
            var graph, errors, title, content;
            title = '<span class="text-danger"><i class="fa fa-exclamation-circle fa-lg"></i> Error</span>';
            try {
                graph = this.project.getGraph();
                errors = graph.getErrors();
                if (errors.length > 0) {
                    content = "";
                    for (var i = 0; i < errors.length; i++) {
                        content += "<p>" + errors[i].name + ": " + errors[i].message + "</p>";
                    }
                }
                else {
                    title = '<span class="text-success"><i class="fa fa-check fa-lg"></i> Success</span>';
                    content = "<p>This is a valid " + InputMode[this.project.getInputMode()] + " program.</p>";
                    this.showPopover(title, content, false);
                    return;
                }
            }
            catch (error) {
                content = "<p>" + error.name + ": " + error.message + "</p>";
            }
            this.showPopover(title, content, true);
        };
        Editor.prototype.showPopover = function (title, content, sticky) {
            var _this = this;
            this.$parse.attr("data-original-title", title);
            this.$parse.attr("data-content", content);
            this.$parse.popover("show");
            if (sticky) {
                this.$parse.siblings().find(".popover-title").append('<button type="button" id="parse-close" class="close">&times;</button>');
                $(document).off("click", this.handleClick);
                $("#parse-close").on("click", function () {
                    _this.$parse.popover("hide");
                    _this.editor.focus();
                });
            }
            else {
                $(document).on("click", this.handleClick);
            }
        };
        Editor.prototype.setInputMode = function (e) {
            var inputMode = InputMode[$(e.target).val()];
            if (inputMode === 0 /* CCS */) {
                this.editor.getSession().setMode("ace/mode/ccs");
            }
            else if (inputMode === 1 /* TCCS */) {
                this.editor.getSession().setMode("ace/mode/tccs");
            }
            this.project.setInputMode(inputMode);
            this.project.setChanged(true);
            this.editor.focus();
        };
        Editor.prototype.setFontSize = function (e) {
            var fontSize = $(e.target).val();
            this.editor.setFontSize(parseInt(fontSize));
            this.updateHeight();
        };
        // http://stackoverflow.com/questions/11584061/
        Editor.prototype.updateHeight = function () {
            var height = this.editor.getSession().getScreenLength() * this.editor.renderer.lineHeight + this.editor.renderer.scrollBar.getWidth();
            this.$editor.height(height);
            this.$editor.find("#editor-section").height(height);
            this.editor.resize();
        };
        Editor.prototype.resize = function () {
            var height = window.innerHeight - this.$editor.parent().offset().top - 32;
            this.$editor.css("max-height", height);
        };
        return Editor;
    })(Activity.Activity);
    Activity.Editor = Editor;
})(Activity || (Activity = {}));
var GUI;
(function (GUI) {
    function highlightTransitions(uiGraph, startId, transitions) {
        transitions.forEach(function (t) {
            uiGraph.highlightEdge(startId, t.targetProcess.id);
            startId = t.targetProcess.id;
        });
    }
    GUI.highlightTransitions = highlightTransitions;
})(GUI || (GUI = {}));
/// <reference path="../../../lib/jquery.d.ts" />
/// <reference path="../../../lib/arbor.d.ts" />
/// <reference path="renderer.ts" />
var counter = 0;
var Handler = (function () {
    function Handler(renderer) {
        var _this = this;
        this.selectedNode = null;
        this.draggedObject = null;
        this.hoverNode = null;
        this.mouseP = null;
        this.onClick = null;
        this.onHover = null;
        this.onHoverOut = null;
        this.isDragging = false;
        this.clickDistance = 50;
        this.hoverDistance = 30;
        this.renderer = null;
        this.mousedown = function (e) {
            var pos = $(_this.renderer.canvas).offset();
            if (!_this.renderer.particleSystem) {
                return false;
            }
            _this.isDragging = false;
            _this.mouseDownPos = arbor.Point(e.pageX - pos.left, e.pageY - pos.top);
            _this.mouseP = _this.mouseDownPos;
            _this.draggedObject = _this.renderer.particleSystem.nearest(_this.mouseP);
            _this.selectedNode = _this.draggedObject.node;
            if (_this.selectedNode && _this.draggedObject.distance <= _this.clickDistance) {
                // only register the mousedown, if they press within the this.clickDistance
                _this.selectedNode.fixed = true;
                _this.selectedNode.tempMass = 50;
                $(_this.renderer.canvas).unbind('mousemove', _this.hover); // unbind hover
                $(_this.renderer.canvas).bind('mousemove', _this.dragged); // bind drag
                $(window).bind('mouseup', _this.dropped); // bind mouse dropped
            }
            return false;
        };
        this.hover = function (e) {
            var pos = $(_this.renderer.canvas).offset();
            var s = arbor.Point(e.pageX - pos.left, e.pageY - pos.top);
            var newHoverNode = _this.renderer.particleSystem.nearest(s);
            // On hover event
            if (newHoverNode !== null) {
                if (_this.hoverNode == null && newHoverNode.distance <= _this.hoverDistance) {
                    if (_this.onHover) {
                        _this.hoverNode = newHoverNode; // call the onHover function given by the user of the arbor-graph
                        _this.onHover(_this.hoverNode.node.name);
                    }
                }
                else if (_this.hoverNode !== null && newHoverNode.distance > _this.hoverDistance) {
                    if (_this.onHoverOut) {
                        _this.onHoverOut(_this.hoverNode.node.name); // call the onHoverOut function given by the user of the arbor-graph
                        _this.hoverNode = null;
                    }
                }
            }
            return false;
        };
        this.dragged = function (e) {
            var pos = $(_this.renderer.canvas).offset();
            var s = arbor.Point(e.pageX - pos.left, e.pageY - pos.top);
            if (!_this.isDragging && _this.mouseDownPos.subtract(s).magnitude() > 10) {
                _this.isDragging = true;
                _this.selectedNode.fixed = true;
            }
            // Drag node visually around
            if (_this.isDragging) {
                var p = _this.renderer.particleSystem.fromScreen(s);
                _this.selectedNode.p = p;
            }
            return false;
        };
        this.dropped = function (e) {
            _this.selectedNode.fixed = false;
            _this.selectedNode.tempMass = 50;
            if (_this.selectedNode && !_this.isDragging && _this.onClick) {
                _this.onClick(_this.selectedNode.name); // call the click function given by the user of the arbor-graph
            }
            _this.selectedNode = null;
            _this.draggedObject = null;
            $(window).unbind('mouseup', _this.dropped);
            $(_this.renderer.canvas).unbind('mousemove', _this.dragged);
            $(_this.renderer.canvas).bind('mousemove', _this.hover); // event for hovering over a node
            _this.mouseP = null;
            return false;
        };
        this.renderer = renderer;
        //this.bindCanvasEvents();
    }
    Handler.prototype.bindCanvasEvents = function () {
        $(this.renderer.canvas).bind('mousedown', this.mousedown);
        $(this.renderer.canvas).bind('mousemove', this.hover); // event for hovering over a node (bind)
    };
    Handler.prototype.unbindCanvasEvents = function () {
        $(this.renderer.canvas).unbind('mousedown', this.mousedown);
        $(this.renderer.canvas).unbind('mousemove', this.hover); // event for hovering over a node (unbind)
    };
    return Handler;
})();
/// <reference path="../../../lib/jquery.d.ts" />
/// <reference path="../../../lib/arbor.d.ts" />
/// <reference path="handler.ts" />
var Renderer = (function () {
    function Renderer(canvas) {
        this.nodeBoxes = []; // stores the points of the node box.
        this.particleSystem = null;
        this.nodeStatusColors = {
            "unexpanded": "rgb(160,160,160)",
            "expanded": "rgb(51, 65, 185)",
            "selected": "rgb(245, 50, 50)"
        };
        this.highlightSettings = {
            "color": "rgb(245, 50, 50)",
            "lineWidth": 2.0
        };
        this.canvas = canvas;
        this.ctx = this.canvas.getContext("2d");
        this.gfx = arbor.Graphics(this.canvas);
    }
    Renderer.prototype.init = function (system) {
        this.particleSystem = system;
        this.resize(this.canvas.width, this.canvas.height);
        this.ctx.translate(0.5, 0.5);
    };
    Renderer.prototype.resize = function (width, height) {
        this.particleSystem.screenSize(width, height);
        this.particleSystem.screenPadding(45, 25, 25, 25);
        this.redraw();
    };
    Renderer.prototype.redraw = function () {
        var _this = this;
        if (!this.particleSystem) {
            console.log("Particlesystem is not yet defined in the renderer");
            return;
        }
        // redraw will be called repeatedly during the run.
        this.gfx.clear();
        this.particleSystem.eachNode(function (node, pt) {
            // node: {mass:#, p:{x,y}, name:"", data:{}}
            // pt:   {x:#, y:#}  node position in screen coords
            _this.drawRectNode(node, pt);
        });
        // draw the edges
        this.particleSystem.eachEdge(function (edge, pt1, pt2) {
            // edge: {source:Node, target:Node, length:#, data:{}}
            // pt1:  {x:#, y:#}  source position in screen coords
            // pt2:  {x:#, y:#}  target position in screen coords
            // draw a line from pt1 to pt2
            var arrowLength = 13;
            var arrowWidth = 6;
            var chevronColor = "#4D4D4D";
            var isSelfloop = edge.source.name === edge.target.name;
            var oppo = _this.particleSystem.getEdges(edge.target, edge.source)[0];
            function strShorten(str) {
                return str.length > 10 ? str.substring(0, 8) + ".." : str;
            }
            var label = strShorten(edge.data.datas.map(function (data) { return data.label; }).join(","));
            _this.ctx.save();
            if (edge.data.highlight) {
                _this.ctx.lineWidth = edge.data.lineWidth || _this.highlightSettings.lineWidth; // Edge line width
                if (isSelfloop) {
                    _this.ctx.strokeStyle = edge.data.color || _this.highlightSettings.color; // Edge color*/
                }
                else {
                    var gradient = _this.ctx.createLinearGradient(pt1.x, pt1.y, pt2.x, pt2.y);
                    gradient.addColorStop(0, "maroon");
                    gradient.addColorStop(0.4, "red");
                    gradient.addColorStop(0.6, "red");
                    gradient.addColorStop(1, "orange");
                    _this.ctx.strokeStyle = gradient;
                }
            }
            else {
                _this.ctx.strokeStyle = edge.data.color || "rgb(196, 196, 196)"; // Edge color
                _this.ctx.lineWidth = edge.data.lineWidth || 2.0; // Edge line width
            }
            if (isSelfloop) {
                _this.drawSelfEdge(pt1, pt2, arrowLength, arrowWidth, chevronColor, label, _this.nodeBoxes[edge.target.name]);
            }
            else if (oppo != undefined) {
                /* Bend the edges, otherwise the two edges will "overlap" eachother*/
                if (edge.source == oppo.target && edge.target == oppo.source) {
                    _this.drawBendingEdge(pt1, pt2, _this.nodeBoxes[edge.source.name], _this.nodeBoxes[edge.target.name], arrowLength, arrowWidth, chevronColor, label);
                }
            }
            else {
                /*Draw normal edge*/
                _this.drawNormalEdge(pt1, pt2, _this.nodeBoxes[edge.source.name], _this.nodeBoxes[edge.target.name], arrowLength, arrowWidth, chevronColor, label);
            }
            _this.ctx.restore();
        });
    };
    Renderer.prototype.drawSelfEdge = function (pt1, pt2, arrowLength, arrowWidth, chevronColor, label, nodeBox) {
        var cpH = 90; // horizontal offset to the control points.
        var cpV = 60; // vertical offset to the control points.
        var cp1 = arbor.Point(pt1.x - (cpH / 2), pt1.y - cpV);
        var cp2 = arbor.Point(pt1.x + (cpH / 2), pt1.y - cpV);
        var start = (nodeBox && this.intersect_line_box(pt1, cp1, nodeBox)) || pt1;
        var end = (nodeBox && this.intersect_line_box(cp2, pt2, nodeBox)) || pt2;
        // Draw edge
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, end.x, end.y);
        this.ctx.stroke();
        // Draw label
        if (label) {
            this.drawLabel(pt2.x, pt2.y - (cpV), label);
        }
        // Draw chevron
        this.ctx.translate(end.x, end.y); // translate pointer to the top og the nodebox.
        this.ctx.rotate(-Math.atan2(-(end.y - cp2.y), end.x - cp2.x) - Math.PI / 23); // Rotates in radians use (degrees*Math.PI/180)
        this.ctx.clearRect(-arrowLength / 2, 1 / 2, arrowLength / 2, 1); // delete some of the edge this's already there (so the point isn't hidden)
        this.drawChevron(arrowLength, arrowWidth, chevronColor); // draw the chevron
    };
    /**
     * Draw a normal edge between two nodes.
     * @param {Point}  pt1          source point
     * @param {Point}  pt2          target point
     * @param {[type]} nodeBox1     nodebox for source node
     * @param {[type]} nodeBox2     nodebox for target node
     * @param {number} arrowLength  the lenght of the arrowhead
     * @param {number} arrowWidth   the width of the arrowhead
     * @param {string} chevronColor the color of the arrowhead
     * @param {string} label        the label of the edge
     */
    Renderer.prototype.drawNormalEdge = function (pt1, pt2, nodeBox1, nodeBox2, arrowLength, arrowWidth, chevronColor, label) {
        var tail = this.intersect_line_box(pt1, pt2, nodeBox1);
        var temp = this.intersect_line_box(tail, pt2, nodeBox2);
        var head = (temp != null) ? temp : this.intersect_line_box(pt1, pt2, nodeBox2);
        // Draw the edge.
        this.ctx.beginPath();
        this.ctx.moveTo(tail.x, tail.y);
        this.ctx.lineTo(head.x, head.y);
        this.ctx.stroke();
        // Draw the label
        if (label) {
            var offsetAngle = Math.atan2(-(pt2.y - pt1.y), pt2.x - pt1.x) + Math.PI * 0.5;
            if (offsetAngle < 0) {
                offsetAngle += Math.PI * 2;
            }
            else if (offsetAngle >= Math.PI * 2) {
                offsetAngle -= Math.PI * 2;
            }
            var offset = arbor.Point(Math.cos(offsetAngle), -Math.sin(offsetAngle)).multiply(10);
            if (offsetAngle < Math.PI * 0.25 || offsetAngle > Math.PI * 1.25) {
                offset = offset.multiply(-1);
            }
            var midPoint = pt1.add(pt2).multiply(0.5);
            this.drawLabel(midPoint.x + offset.x, midPoint.y + offset.y, label);
        }
        // Draw the arrow
        this.ctx.translate(head.x, head.y); // translate pointer to the top og the nodebox.
        this.ctx.rotate(Math.atan2(head.y - tail.y, head.x - tail.x));
        this.ctx.clearRect(-arrowLength / 2, 1 / 2, arrowLength / 2, 1); // delete some of the edge that's already there (so the point isn't hidden)
        this.drawChevron(arrowLength, arrowWidth, chevronColor); // draw the chevron
    };
    /**
     * The bending edges between two nodes.
     * @param {Point}  pt1          source point
     * @param {Point}  pt2          target point
     * @param {[type]} nodeBox1     nodebox for source node
     * @param {[type]} nodeBox2     nodebox for target node
     * @param {number} arrowLength  the lenght of the arrowhead
     * @param {number} arrowWidth   the width of the arrowhead
     * @param {string} chevronColor the color of the arrowhead
     * @param {string} label        the label of the edge
     */
    Renderer.prototype.drawBendingEdge = function (pt1, pt2, nodeBox1, nodeBox2, arrowLength, arrowWidth, chevronColor, label) {
        var midPoint = pt1.add(pt2).multiply(0.5);
        var angle = Math.atan2(-(pt2.y - pt1.y), pt2.x - pt1.x) - Math.PI / 2;
        if (angle < 0) {
            angle += Math.PI * 2;
        }
        var cpOffset = arbor.Point(Math.cos(angle), -Math.sin(angle)).multiply(45);
        var cp = midPoint.add(cpOffset);
        var start = (nodeBox1 && this.intersect_line_box(pt1, cp, nodeBox1)) || pt1;
        var end = (nodeBox2 && this.intersect_line_box(cp, pt2, nodeBox2)) || pt2;
        // Draw the edge
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.quadraticCurveTo(cp.x, cp.y, end.x, end.y);
        this.ctx.stroke();
        if (label) {
            var labelcp = midPoint.add(cpOffset.multiply(0.8));
            this.drawLabel(labelcp.x, labelcp.y, label);
        }
        this.ctx.translate(end.x, end.y); // translate pointer to the top of the nodebox.
        var arrowMathRotation = Math.atan2(-(end.y - cp.y), end.x - cp.x);
        this.ctx.rotate(-arrowMathRotation);
        this.ctx.clearRect(-arrowLength / 2, 1 / 2, arrowLength / 2, 1); // delete some of the edge s already there (so the point isn't hidden)
        this.drawChevron(arrowLength, arrowWidth, chevronColor); // draw the chevron
    };
    /**
     * Draws the rectangle of the node
     * @param {Node}  node
     * @param {Point} pt
     */
    Renderer.prototype.drawRectNode = function (node, pt) {
        // draw a circle centered at pt
        var label = node.data.label || "";
        var textWidth = this.ctx.measureText(label).width + 30;
        if (label && label.length > 10) {
            label = node.data.label = label.substring(0, 8) + "..";
        }
        this.ctx.fillStyle = this.nodeStatusColors[node.data.status] || this.nodeStatusColors["expanded"];
        this.gfx.rect(pt.x - textWidth / 2, pt.y - 10, textWidth, 26, 8, { fill: this.ctx.fillStyle }); // draw the node rect
        this.nodeBoxes[node.name] = [pt.x - textWidth / 2, pt.y - 11, textWidth, 28]; // save the bounds of the node-rect for drawing the edges correctly.
        // draw the text
        if (label) {
            if (node.data.color != 'none' || node.data.color != 'white') {
                this.drawLabel(pt.x, pt.y + 8, label, 'white');
            }
            else {
                this.drawLabel(pt.x, pt.y + 8, label, 'black');
            }
        }
    };
    /**
     * Draws the label upon the edge
     * @param {number}                   x     the x coordinate
     * @param {number}                   y     the y coordinate
     * @param {string}                   label the text to be written.
     * @param {CanvasRenderingContext2D} ctx   the canvas to draw on.
     */
    Renderer.prototype.drawLabel = function (x, y, label, color) {
        this.ctx.save();
        this.ctx.font = "14px 'Open Sans'";
        this.ctx.textAlign = "center";
        this.ctx.fillStyle = color === undefined ? "black" : color;
        this.ctx.fillText(label, x, y);
        this.ctx.restore();
    };
    /**
     * Draws the arrowhead
     * @param {number}                   arrowLength the length of the arrowhead
     * @param {number}                   arrowWidth  the width of the arrowhead
     * @param {string}                   color       the color of the arrowhead
     * @param {CanvasRenderingContext2D} ctx         the canvas
     */
    Renderer.prototype.drawChevron = function (arrowLength, arrowWidth, color) {
        this.ctx.save();
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(-arrowLength, arrowWidth);
        this.ctx.lineTo(0, 0);
        this.ctx.lineTo(-arrowLength, -arrowWidth);
        this.ctx.lineTo(-arrowLength * 0.8, -0);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();
    };
    // helpers for figuring out where to draw arrows (thanks springy.js)
    Renderer.prototype.intersect_line_line = function (p1, p2, p3, p4) {
        var denom = ((p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y));
        if (denom === 0) {
            return null; // lines are parallel
        }
        var ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
        var ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;
        if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
            return null;
        }
        return arbor.Point(p1.x + ua * (p2.x - p1.x), p1.y + ua * (p2.y - p1.y));
    };
    Renderer.prototype.intersect_line_box = function (p1, p2, boxTuple) {
        var p3 = arbor.Point(boxTuple[0], boxTuple[1]);
        var w = boxTuple[2];
        var h = boxTuple[3];
        var tl = arbor.Point(p3.x, p3.y);
        var tr = arbor.Point(p3.x + w, p3.y);
        var bl = arbor.Point(p3.x, p3.y + h);
        var br = arbor.Point(p3.x + w, p3.y + h);
        return this.intersect_line_line(p1, p2, tl, tr) || this.intersect_line_line(p1, p2, tr, br) || this.intersect_line_line(p1, p2, br, bl) || this.intersect_line_line(p1, p2, bl, tl) || arbor.Point(p2.x, p2.y);
    };
    return Renderer;
})();
/*libs Jquery, graphics is needed.*/
/// <reference path="../../../lib/jquery.d.ts" />
/// <reference path="../../../lib/arbor.d.ts" />
/// <reference path="renderer.ts" />
/// <reference path="handler.ts" />
/// <reference path="../gui.ts" />
var GUI;
(function (GUI) {
    var ArborGraph = (function () {
        function ArborGraph(renderer, options) {
            if (options === void 0) { options = { repulsion: 400, stiffness: 800, friction: 0.5, integrator: "verlet" }; }
            this.highlightedEdges = [];
            this.sys = arbor.ParticleSystem(options);
            this.sys.parameters({ gravity: true });
            this.renderer = renderer;
            this.sys.renderer = renderer;
            this.handler = new Handler(renderer);
        }
        ArborGraph.prototype.showProcess = function (nodeId, data) {
            var node = this.sys.getNode(nodeId);
            if (node) {
                node.data = data;
            }
            else {
                this.sys.addNode(nodeId, data);
            }
        };
        ArborGraph.prototype.getProcessDataObject = function (nodeId) {
            var node = this.sys.getNode(nodeId), data = node ? node.data : null;
            return data;
        };
        ArborGraph.prototype.getNode = function (name) {
            return this.sys.getNode(name);
        };
        ArborGraph.prototype.getPosition = function (name) {
            return this.sys.toScreen(this.getNode(name).p);
        };
        ArborGraph.prototype.showTransitions = function (fromId, toId, datas) {
            var edges = this.sys.getEdges(fromId, toId), edge = edges.length > 0 ? edges[0] : null;
            if (edge) {
                edge.data.datas = datas;
            }
            else {
                this.sys.addEdge(fromId, toId, { datas: datas });
            }
        };
        ArborGraph.prototype.setSelected = function (name) {
            if (!name)
                return;
            var newSelectedNode = this.sys.getNode(name);
            if (this.selectedNode && newSelectedNode) {
                this.selectedNode.data.status = "expanded";
            }
            if (newSelectedNode) {
                this.selectedNode = newSelectedNode;
                this.selectedNode.data.status = 'selected';
            }
            this.renderer.redraw();
        };
        ArborGraph.prototype.getSelected = function () {
            return this.selectedNode.name;
        };
        ArborGraph.prototype.highlightToNode = function (name) {
            var node = this.sys.getNode(name);
            if (this.selectedNode && node) {
                this.highlightEdgeNodes(this.selectedNode, node);
            }
        };
        ArborGraph.prototype.clearHighlights = function () {
            while (this.highlightedEdges.length > 0) {
                var edge = this.highlightedEdges.pop();
                edge.data.highlight = false;
            }
            this.renderer.redraw();
        };
        ArborGraph.prototype.highlightEdge = function (from, to) {
            var fromNode = this.sys.getNode(from);
            var toNode = this.sys.getNode(to);
            if (fromNode && toNode) {
                this.highlightEdgeNodes(fromNode, toNode);
            }
        };
        ArborGraph.prototype.highlightEdgeNodes = function (from, to) {
            var edges = this.sys.getEdges(from, to);
            for (var i = 0; i < edges.length; i++) {
                edges[i].data.highlight = true;
                this.highlightedEdges.push(edges[i]);
            }
            this.renderer.redraw();
        };
        ArborGraph.prototype.getTransitionDataObjects = function (fromId, toId) {
            var edges = this.sys.getEdges(fromId, toId), edge = edges.length > 0 ? edges[0] : null, datas = edge && edge.data ? edge.data.datas : null;
            return datas;
        };
        /* Event handling */
        ArborGraph.prototype.setOnSelectListener = function (f) {
            this.handler.onClick = function (nodeId) {
                f(nodeId);
            };
        };
        ArborGraph.prototype.clearOnSelectListener = function () {
            this.handler.onClick = null;
        };
        ArborGraph.prototype.setHoverOnListener = function (f) {
            this.handler.onHover = f;
        };
        ArborGraph.prototype.clearHoverOutListener = function () {
            this.handler.onHover = null;
        };
        ArborGraph.prototype.setHoverOutListener = function (f) {
            this.handler.onHoverOut = f;
        };
        ArborGraph.prototype.clearHoverOnListener = function () {
            this.handler.onHoverOut = null;
        };
        ArborGraph.prototype.clearAll = function () {
            this.sys.prune(function (node, from, to) { return true; });
        };
        ArborGraph.prototype.freeze = function () {
            this.sys.stop();
        };
        ArborGraph.prototype.unfreeze = function () {
            this.sys.start(true);
        };
        ArborGraph.prototype.bindCanvasEvents = function () {
            this.handler.bindCanvasEvents();
        };
        ArborGraph.prototype.unbindCanvasEvents = function () {
            this.handler.unbindCanvasEvents();
        };
        return ArborGraph;
    })();
    GUI.ArborGraph = ArborGraph;
})(GUI || (GUI = {}));
/// <reference path="../../lib/suppressWarnings.d.ts" />
var Activity;
(function (Activity) {
    var Fullscreen = (function () {
        function Fullscreen(container, $button, onChanged) {
            var _this = this;
            this.container = container;
            this.$button = $button;
            this.onChanged = onChanged;
            this.$button.on("click", function () { return _this.toggleFullscreen(); });
        }
        Fullscreen.prototype.onShow = function () {
            var _this = this;
            $(document).on("fullscreenchange", function () { return _this.fullscreenChanged(); });
            $(document).on("webkitfullscreenchange", function () { return _this.fullscreenChanged(); });
            $(document).on("mozfullscreenchange", function () { return _this.fullscreenChanged(); });
            $(document).on("MSFullscreenChange", function () { return _this.fullscreenChanged(); });
            $(document).on("fullscreenerror", function () { return _this.fullscreenError(); });
            $(document).on("webkitfullscreenerror", function () { return _this.fullscreenError(); });
            $(document).on("mozfullscreenerror", function () { return _this.fullscreenError(); });
            $(document).on("MSFullscreenError", function () { return _this.fullscreenError(); });
        };
        Fullscreen.prototype.onHide = function () {
            $(document).off("fullscreenchange");
            $(document).off("webkitfullscreenchange");
            $(document).off("mozfullscreenchange");
            $(document).off("MSFullscreenChange");
            $(document).off("fullscreenerror");
            $(document).off("webkitfullscreenerror");
            $(document).off("mozfullscreenerror");
            $(document).off("MSFullscreenError");
        };
        Fullscreen.prototype.isFullscreen = function () {
            return !!document.fullscreenElement || !!document.mozFullScreenElement || !!document.webkitFullscreenElement || !!document.msFullscreenElement;
        };
        Fullscreen.prototype.toggleFullscreen = function () {
            if (!this.isFullscreen()) {
                if (this.container.requestFullscreen) {
                    this.container.requestFullscreen();
                }
                else if (this.container.msRequestFullscreen) {
                    this.container.msRequestFullscreen();
                }
                else if (this.container.mozRequestFullScreen) {
                    this.container.mozRequestFullScreen();
                }
                else if (this.container.webkitRequestFullscreen) {
                    this.container.webkitRequestFullscreen();
                }
            }
            else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
                else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }
                else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                }
                else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
            }
        };
        Fullscreen.prototype.fullscreenChanged = function () {
            this.$button.text(this.isFullscreen() ? "Exit" : "Fullscreen");
            this.onChanged();
        };
        Fullscreen.prototype.fullscreenError = function () {
            this.fullscreenChanged();
        };
        return Fullscreen;
    })();
    Activity.Fullscreen = Fullscreen;
})(Activity || (Activity = {}));
var Activity;
(function (Activity) {
    var Tooltips = {
        "collapse-none": "Do not collapse the labelled transition system.",
        "collapse-strong": "Collapse all processes that are strongly bisimilar (∼) into a single process.",
        "collapse-weak": "Collapse all processes that are weakly bisimilar (≈) into a single process.",
        "collapse-tccs-strong-timed": "Collapse all processes that are strongly timed bisimilar (∼<sub>t</sub>) into a single process.",
        "collapse-tccs-strong-untimed": "Collapse all processes that are strongly untimed bisimilar (∼<sub>u</sub>) into a single process.",
        "collapse-tccs-weak-timed": "Collapse all processes that are weakly timed bisimilar (≈<sub>t</sub>) into a single process.",
        "collapse-tccs-weak-untimed": "Collapse all processes that are weakly untimed bisimilar (≈<sub>u</sub>) into a single process.",
        "simplify": "Simplify processes by applying structural congruence.",
        "depth": "Set the unfolding depth of the labelled transition system.",
        "freeze": "Lock/unlock the current location of states.",
        "save-image": "Export the labelled transition system."
    };
    function addTooltips() {
        //Non delegating since these tooltips only cover static elements.
        $("[data-tooltip]").tooltip({
            title: function () {
                return Tooltips[this.dataset.tooltip];
            },
            delay: {
                "show": 500,
                "hide": 100
            },
            html: true
        });
    }
    Activity.addTooltips = addTooltips;
    var Tooltip = (function () {
        function Tooltip($container, titleFunction, selectorClass) {
            this.$container = $container;
            this.$container.tooltip({
                title: titleFunction,
                selector: "span." + selectorClass,
                html: true
            });
        }
        // used for matching process names/ids globally
        Tooltip.wrapProcess = function (text) {
            return $("<span>").attr("class", "ccs-tooltip-process").append(text);
        };
        Tooltip.wrap = function (text) {
            return $("<span>").attr("class", "ccs-tooltip").append(text);
        };
        Tooltip.setTooltip = function ($element, text) {
            $element.tooltip({ title: text });
            return $element;
        };
        Tooltip.strongSequence = function (abstractingSuccGen, source, action, target, graph) {
            if (graph === void 0) { graph = null; }
            var graph = graph || Project.getInstance().getGraph();
            var labelFor = graph.getLabel.bind(graph);
            var strictPath = abstractingSuccGen.getStrictPath(source.id, action, target.id);
            var strongActions = labelFor(source);
            for (var i = 0; i < strictPath.length; i++) {
                var actionStr;
                // if (abstractingSuccGen.getAbstractions().some(abstraction => abstraction.getLabel() === strictPath[i].action.getLabel())) {
                //     actionStr = abstractingSuccGen.getAbstractions().map(abstraction => abstraction.toString()).join("/");
                // } else {
                actionStr = strictPath[i].action.toString();
                // }
                strongActions += " -" + actionStr + "-> " + labelFor(strictPath[i].targetProcess);
            }
            return strongActions;
        };
        return Tooltip;
    })();
    Activity.Tooltip = Tooltip;
    var ProcessTooltip = (function (_super) {
        __extends(ProcessTooltip, _super);
        function ProcessTooltip($container) {
            this.visitor = new Traverse.TCCSNotationVisitor();
            var getCCSNotation = this.ccsNotationForProcessId.bind(this);
            var thisTooltip = this;
            var titleFunction = function () {
                var process = thisTooltip.graph.processByLabel($(this).text());
                return getCCSNotation(process);
            };
            _super.call(this, $container, titleFunction, "ccs-tooltip-process");
        }
        ProcessTooltip.prototype.ccsNotationForProcessId = function (idOrName) {
            var process = this.graph.processByName(idOrName) || this.graph.processById(idOrName);
            var text;
            if (process) {
                if (process instanceof ccs.NamedProcess) {
                    text = this.visitor.visit(process.subProcess);
                }
                else if (process instanceof ccs.CollapsedProcess) {
                    var labelFor = this.graph.getLabel.bind(this.graph);
                    var subLabels = process.subProcesses.map(function (subProc) { return labelFor(subProc); });
                    text = "{" + subLabels.join(", ") + "}";
                }
                else {
                    text = this.visitor.visit(process);
                }
            }
            return this.graph.getLabel(process) + " = " + text;
        };
        ProcessTooltip.prototype.setGraph = function (graph) {
            this.graph = graph;
            this.visitor.clearCache();
        };
        return ProcessTooltip;
    })(Tooltip);
    Activity.ProcessTooltip = ProcessTooltip;
    var DataTooltip = (function (_super) {
        __extends(DataTooltip, _super);
        function DataTooltip($container) {
            var titleFunction = function () {
                return $(this).data("tooltip");
            };
            _super.call(this, $container, titleFunction, "ccs-tooltip-data");
        }
        return DataTooltip;
    })(Tooltip);
    Activity.DataTooltip = DataTooltip;
})(Activity || (Activity = {}));
/// <reference path="../../lib/jquery.d.ts" />
/// <reference path="../../lib/util.d.ts" />
/// <reference path="../../lib/ccs.d.ts" />
/// <reference path="../../lib/suppressWarnings.d.ts" />
/// <reference path="../gui/project.ts" />
/// <reference path="../gui/gui.ts" />
/// <reference path="../gui/arbor/arbor.ts" />
/// <reference path="../gui/arbor/renderer.ts" />
/// <reference path="activity.ts" />
/// <reference path="fullscreen.ts" />
/// <reference path="tooltip.ts" />
var Activity;
(function (Activity) {
    var Explorer = (function (_super) {
        __extends(Explorer, _super);
        function Explorer(container, button) {
            var _this = this;
            _super.call(this, container, button);
            this.project = Project.getInstance();
            this.fullscreen = new Activity.Fullscreen($("#explorer-fullscreen-container")[0], $("#explorer-fullscreen"), function () { return _this.resize(_this.$zoom.val()); });
            this.$canvasContainer = $("#explorer-canvas");
            this.$statusContainer = $("#explorer-transitions");
            this.$statusTable = this.$statusContainer.find("tbody");
            this.tooltip = new Activity.ProcessTooltip(this.$statusTable);
            this.$ccsOptions = $("#ccs-options");
            this.$tccsOptions = $("#tccs-options");
            this.$zoom = $("#explorer-zoom");
            this.$depth = $("#explorer-depth");
            this.$freeze = $("#explorer-freeze");
            this.$save = $("#explorer-save");
            this.canvas = $("#explorer-canvas").find("canvas")[0];
            this.renderer = new Renderer(this.canvas);
            this.uiGraph = new GUI.ArborGraph(this.renderer);
            this.$statusTable.on("click", "tr", this.onTransitionTableRowClick.bind(this)).on("mouseenter", "tr", this.onTransitionTableRowHover.bind(this, true)).on("mouseleave", "tr", this.onTransitionTableRowHover.bind(this, false));
            // Use onchange instead of oninput for IE.
            if (navigator.userAgent.indexOf("MSIE ") > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)) {
                this.$zoom.on("change", function () { return _this.resize(_this.$zoom.val()); });
            }
            else {
                this.$zoom.on("input", function () { return _this.resize(_this.$zoom.val()); });
            }
            this.$depth.on("change", function () { return _this.setDepth(_this.$depth.val()); });
            this.$freeze.on("click", function () { return _this.toggleFreeze(!_this.$freeze.data("frozen")); });
            this.$save.on("click", function () { return _this.save(); });
            // Prevent options menu from closing when pressing form elements.
            $(document).on('click', '.yamm .dropdown-menu', function (e) { return e.stopPropagation(); });
            // Manually remove focus from zoom, depth and freeze when the canvas is clicked.
            this.$canvasContainer.on("click", function () {
                _this.$zoom.blur();
                _this.$depth.blur();
                _this.$freeze.blur();
            });
            $("#explorer-process-list, #option-simplify").on("change", function () { return _this.draw(); });
            this.$ccsOptions.find("input").on("change", function () { return _this.draw(); });
            this.$tccsOptions.find("input").on("change", function () { return _this.draw(); });
        }
        Explorer.prototype.onShow = function (configuration) {
            var _this = this;
            $(window).on("resize", function () { return _this.resize(_this.$zoom.val()); });
            this.resize(this.$zoom.val());
            this.fullscreen.onShow();
            if (this.changed) {
                this.changed = false;
                this.graph = this.project.getGraph();
                this.tooltip.setGraph(this.graph);
                this.displayOptions();
                this.draw();
            }
            this.uiGraph.bindCanvasEvents();
            this.uiGraph.setOnSelectListener(function (processId) { return _this.expand(_this.graph.processById(processId)); });
            this.uiGraph.setHoverOnListener(function (processId) {
                _this.timeout = setTimeout(function () {
                    var tooltipAnchor = $("#explorer-canvas-tooltip");
                    var position = _this.uiGraph.getPosition(processId);
                    tooltipAnchor.css("left", position.x - _this.$canvasContainer.scrollLeft());
                    tooltipAnchor.css("top", position.y - _this.$canvasContainer.scrollTop() - 10);
                    tooltipAnchor.tooltip({ title: _this.tooltip.ccsNotationForProcessId(processId), html: true });
                    tooltipAnchor.tooltip("show");
                }, 1000);
            });
            this.uiGraph.setHoverOutListener(function () {
                clearTimeout(_this.timeout);
                $("#explorer-canvas-tooltip").tooltip("destroy");
            });
            this.toggleFreeze(this.isFreezeSet());
        };
        Explorer.prototype.onHide = function () {
            $(window).off("resize");
            this.fullscreen.onHide();
            this.uiGraph.unbindCanvasEvents();
            this.uiGraph.clearOnSelectListener();
            this.uiGraph.clearHoverOnListener();
            this.uiGraph.clearHoverOutListener();
            this.uiGraph.freeze();
        };
        Explorer.prototype.displayOptions = function () {
            var processes = this.graph.getNamedProcesses().reverse();
            var list = $("#explorer-process-list").empty();
            for (var i = 0; i < processes.length; i++) {
                var $option = $("<option></option>").append(processes[i]);
                list.append($option);
                if (this.lastSelectedProcess && this.lastSelectedProcess.toString() === processes[i]) {
                    $option.prop("selected", true);
                }
            }
            if (this.project.getInputMode() === 0 /* CCS */) {
                this.$ccsOptions.show();
                this.$tccsOptions.hide();
            }
            else {
                this.$ccsOptions.hide();
                this.$tccsOptions.show();
            }
        };
        Explorer.prototype.getOptions = function () {
            var options = {
                process: $("#explorer-process-list :selected").text(),
                simplify: $("#option-simplify").prop("checked"),
                inputMode: InputMode[this.project.getInputMode()]
            };
            if (this.project.getInputMode() === 0 /* CCS */) {
                options["successor"] = $("input[name=option-ccs-successor]:checked").val();
                options["collapse"] = $("input[name=option-collapse]:checked").val();
            }
            else {
                options["collapse"] = $("input[name=option-tccs-collapse]:checked").val();
                options["successor"] = $("input[name=option-tccs-successor]:checked").val();
                options["time"] = $("input[name=option-tccs-successor]:checked").data("time");
            }
            this.options = options;
            return options;
        };
        Explorer.prototype.draw = function () {
            this.uiGraph.clearAll();
            this.$zoom.val("1");
            this.resize(1);
            var options = this.getOptions();
            this.succGenerator = CCS.getSuccGenerator(this.graph, { inputMode: options.inputMode, succGen: options.successor, time: options.time, reduce: options.simplify });
            var process = this.succGenerator.getProcessByName(options.process);
            var mode = this.project.getInputMode();
            if (options.collapse !== 'none') {
                var defendInfos = {
                    'strong': { succGen: 'strong', time: undefined },
                    'weak': { succGen: 'weak', time: undefined },
                    'strong-timed': { succGen: 'strong', time: 'timed' },
                    'strong-untimed': { succGen: 'strong', time: 'untimed' },
                    'weak-timed': { succGen: 'weak', time: 'timed' },
                    'weak-untimed': { succGen: 'weak', time: 'untimed' }
                };
                var defInfo = defendInfos[options.collapse];
                if (!defInfo)
                    throw "Invalid collapse setting: '" + options.collapse + "'";
                try {
                    //Always attack with strong succ generator (improves performance)
                    var attackSuccGen = CCS.getSuccGenerator(this.graph, { inputMode: mode, succGen: "strong", time: "timed", reduce: options.simplify });
                    var defendSuccGen = CCS.getSuccGenerator(this.graph, { inputMode: mode, succGen: defInfo.succGen, time: defInfo.time, reduce: options.simplify });
                    var collapse = Equivalence.getBisimulationCollapse(attackSuccGen, defendSuccGen, process.id, process.id);
                    var collapseSuccGen = new Traverse.CollapsingSuccessorGenerator(this.succGenerator, collapse);
                    //Wrap the transition relation used in the collapse.
                    this.succGenerator = collapseSuccGen;
                    //Process have been replaced by collapse.
                    process = collapseSuccGen.getCollapseForProcess(process.id);
                }
                catch (err) {
                    if (err.name === "CollapseTooLarge") {
                        //Possible, this restriction should be removed eventually and the calculation run in a worker.
                        this.showMessageBox("Unable to Collapse", "There are too many processes to collapse.");
                        //This is safe (no looping), because this code is not run when 'none' collapse is set.
                        $("input[name=option-collapse][value='none']").prop("checked", true);
                        $("input[name=option-tccs-collapse][value='none']").prop("checked", true);
                    }
                    else {
                        throw err;
                    }
                }
            }
            this.lastSelectedProcess = process;
            this.expand(process);
        };
        Explorer.prototype.save = function () {
            this.$save.attr("href", this.canvas.toDataURL("image/png"));
            this.$save.attr("download", this.getOptions().process + ".png");
        };
        Explorer.prototype.setDepth = function (depth) {
            if (!/^[1-9][0-9]*$/.test(depth.toString())) {
                this.$depth.val(this.$depth.data("previous-depth"));
            }
            else {
                this.$depth.data("previous-depth", depth);
                this.draw();
            }
        };
        Explorer.prototype.isFreezeSet = function () {
            return !!(this.$freeze.data("frozen"));
        };
        Explorer.prototype.toggleFreeze = function (freeze) {
            var icon = this.$freeze.find("i");
            if (freeze) {
                this.uiGraph.freeze();
                icon.replaceWith("<i class='fa fa-lock fa-lg'></i>");
            }
            else {
                this.uiGraph.unfreeze();
                icon.replaceWith("<i class='fa fa-unlock-alt fa-lg'></i>");
            }
            this.$freeze.data("frozen", freeze);
        };
        Explorer.prototype.showProcess = function (process) {
            if (!process || this.uiGraph.getProcessDataObject(process.id))
                return;
            this.uiGraph.showProcess(process.id, { label: this.graph.getLabel(process), status: "unexpanded" });
        };
        Explorer.prototype.expand = function (process) {
            var _this = this;
            this.selectedProcess = process;
            var allTransitions = CCS.getNSuccessors(this.succGenerator, process, this.$depth.val());
            var data = this.uiGraph.getProcessDataObject(process.id.toString());
            if (!data || data.status === "unexpanded") {
                this.toggleFreeze(false);
                for (var fromId in allTransitions) {
                    var fromProcess = this.graph.processById(fromId);
                    this.showProcess(fromProcess);
                    this.showProcessAsExplored(fromProcess);
                    var groupedByTargetProcessId = ArrayUtil.groupBy(allTransitions[fromId].toArray(), function (t) { return t.targetProcess.id; });
                    Object.keys(groupedByTargetProcessId).forEach(function (strProcId) {
                        var group = groupedByTargetProcessId[strProcId];
                        var data = group.map(function (t) {
                            return { label: t.action.toString() };
                        });
                        _this.showProcess(_this.graph.processById(strProcId));
                        _this.uiGraph.showTransitions(fromProcess.id, strProcId, data);
                    });
                }
            }
            this.updateStatusTable(allTransitions[process.id]);
            this.uiGraph.setSelected(process.id.toString());
            this.centerProcess(process);
        };
        Explorer.prototype.updateStatusTable = function (transitions) {
            var _this = this;
            this.$statusTable.empty();
            transitions.forEach(function (t) {
                var row = $("<tr>");
                var $actionTd = $("<td>");
                if (_this.succGenerator instanceof Traverse.AbstractingSuccessorGenerator) {
                    var abstractingSuccGen = _this.succGenerator;
                    var $action = Activity.Tooltip.wrap(t.action.toString(true));
                    Activity.Tooltip.setTooltip($action, Activity.Tooltip.strongSequence(abstractingSuccGen, _this.selectedProcess, t.action, t.targetProcess, _this.graph));
                    $actionTd.append($action);
                }
                else {
                    $actionTd.append(t.action.toString(true));
                }
                row.append($("<td>").append(_this.sourceText(_this.selectedProcess)));
                row.append($actionTd);
                row.append($("<td>").append(_this.sourceText(t.targetProcess)));
                // row.append($("<td>").append(Tooltip.wrapProcess(this.graph.getLabel(t.targetProcess))));
                row.data("targetId", t.targetProcess.id);
                row.data("action", t.action);
                _this.$statusTable.append(row);
            });
        };
        Explorer.prototype.sourceText = function (process) {
            var _this = this;
            /* Collapsed processes present us with another indirection meaning
               that under normal cirsumstances it would not be possible to hover
               over the constituent processes and get their description. */
            if (process instanceof CCS.CollapsedProcess) {
                var wrappedSubProcs = process.subProcesses.map(function (p) { return Activity.Tooltip.wrapProcess(_this.graph.getLabel(p)); });
                return [].concat([Activity.Tooltip.wrapProcess(this.graph.getLabel(process))], [" = {"], ArrayUtil.intersperse(wrappedSubProcs, ", "), ["}"]);
            }
            else {
                return Activity.Tooltip.wrapProcess(this.graph.getLabel(process));
            }
        };
        Explorer.prototype.onTransitionTableRowHover = function (entering, event) {
            this.uiGraph.clearHighlights();
            if (entering) {
                var targetId = $(event.currentTarget).data("targetId");
                // Disabled for now - Can cause confusion.
                /*if (this.options.successor === "weak") {
                    var action = $(event.currentTarget).data("action");
                    this.highlightStrictPath(action, targetId);
                } else {*/
                this.uiGraph.highlightToNode(targetId);
            }
        };
        Explorer.prototype.highlightStrictPath = function (action, toTargetId) {
            var strictPath = this.succGenerator.getStrictPath(this.selectedProcess.id, action, toTargetId);
            var from = this.selectedProcess.id;
            GUI.highlightTransitions(this.uiGraph, this.selectedProcess.id, strictPath);
        };
        Explorer.prototype.onTransitionTableRowClick = function (e) {
            var targetId = $(e.currentTarget).data("targetId");
            if (targetId !== "undefined") {
                this.expand(this.graph.processById(targetId));
                this.uiGraph.clearHighlights();
            }
        };
        Explorer.prototype.showProcessAsExplored = function (process) {
            this.uiGraph.getProcessDataObject(process.id).status = "expanded";
        };
        Explorer.prototype.centerProcess = function (process) {
            var position = this.uiGraph.getPosition(process.id.toString());
            if (position && this.$zoom.val() > 1) {
                this.$canvasContainer.scrollLeft(position.x - (this.$canvasContainer.width() / 2));
                this.$canvasContainer.scrollTop(position.y - (this.$canvasContainer.height() / 2));
            }
        };
        Explorer.prototype.resize = function (zoom) {
            var offsetTop = this.$canvasContainer.offset().top;
            var offsetBottom = this.$statusContainer.height() + 38; // Margin bot + border.
            var availableHeight = window.innerHeight - offsetTop - offsetBottom;
            var width = this.$canvasContainer.width();
            var height = Math.max(265, availableHeight); // Minimum height 265px.
            this.$canvasContainer.height(height);
            this.canvas.width = width * zoom;
            this.canvas.height = height * zoom;
            this.renderer.resize(this.canvas.width, this.canvas.height);
            if (zoom > 1) {
                this.$canvasContainer.parent().find(".input-group").css("right", 30);
                this.$canvasContainer.css("overflow", "auto");
                this.centerProcess(this.selectedProcess);
            }
            else {
                this.$canvasContainer.parent().find(".input-group").css("right", 10);
                this.$canvasContainer.css("overflow", "hidden");
            }
        };
        return Explorer;
    })(Activity.Activity);
    Activity.Explorer = Explorer;
})(Activity || (Activity = {}));
var Activity;
(function (Activity) {
    var Verifier = (function (_super) {
        __extends(Verifier, _super);
        function Verifier(container, button) {
            var _this = this;
            _super.call(this, container, button);
            this.verifyingProperty = null;
            this.queue = [];
            $("#add-property").on("click", function () { return _this.showPropertyModal(); });
            $("#verify-all").on("click", function () { return _this.verifyAll(); });
            $("#verify-stop").on("click", function () { return _this.stopVerify(); });
            $("input[name=property-type]").on("change", function () { return _this.showSelectedPropertyType(); });
            this.formulaEditor = ace.edit("hml-formula-editor");
            this.formulaEditor.setTheme("ace/theme/crisp");
            this.formulaEditor.getSession().setMode("ace/mode/hml");
            this.formulaEditor.setOptions({
                enableBasicAutocompletion: true,
                showPrintMargin: false,
                highlightActiveLine: false,
                fontSize: 16,
                fontFamily: "Inconsolata",
                showLineNumbers: false,
                maxLines: 1
            });
            this.definitionsEditor = ace.edit("hml-definitions-editor");
            this.definitionsEditor.setTheme("ace/theme/crisp");
            this.definitionsEditor.getSession().setMode("ace/mode/hml");
            this.definitionsEditor.getSession().setUseWrapMode(true);
            this.definitionsEditor.setOptions({
                enableBasicAutocompletion: true,
                showPrintMargin: false,
                highlightActiveLine: false,
                fontSize: 16,
                fontFamily: "Inconsolata",
                showLineNumbers: false,
                maxLines: 4
            });
        }
        Verifier.prototype.onShow = function () {
            if (this.changed) {
                this.changed = false;
                this.graph = this.project.getGraph();
                if (this.project.getInputMode() === 0 /* CCS */) {
                    this.formulaEditor.getSession().setMode("ace/mode/hml");
                    this.definitionsEditor.getSession().setMode("ace/mode/hml");
                }
                else {
                    this.formulaEditor.getSession().setMode("ace/mode/thml");
                    this.definitionsEditor.getSession().setMode("ace/mode/thml");
                }
                var properties = this.project.getProperties();
                for (var i = 0; i < properties.length; i++) {
                    properties[i].setUnknownStatus();
                    properties[i].isReadyForVerification();
                }
                this.displayProperties();
                this.setPropertyModalOptions();
            }
        };
        Verifier.prototype.onHide = function () {
            this.stopVerify();
        };
        Verifier.prototype.displayProperty = function (property) {
            var _this = this;
            var $row = $("<tr>");
            if (property.getStatus() === 2 /* invalid */) {
            }
            $row.append($("<td>").append(property.getStatusIcon()));
            var $time = $("<td>").append(property.getElapsedTime());
            property.setTimeCell($time);
            $row.append($time);
            var $description = $("<td>").append(property.getDescription());
            $description.on("dblclick", { property: property }, function (e) { return _this.showPropertyModal(e); });
            $row.append($description);
            var $verify = $("<i>").addClass("fa fa-play-circle fa-lg verify-property");
            $verify.on("click", { property: property }, function (e) { return _this.verify(e); });
            $row.append($("<td>").append($verify));
            var $edit = $("<i>").addClass("fa fa-pencil fa-lg");
            $edit.on("click", { property: property }, function (e) { return _this.showPropertyModal(e); });
            $row.append($("<td>").append($edit));
            var $delete = $("<i>").addClass("fa fa-trash fa-lg");
            $delete.on("click", { property: property }, function (e) { return _this.deleteProperty(e); });
            $row.append($("<td>").append($delete));
            var $options = $("<i>").addClass("fa fa-bars fa-lg");
            $row.append($("<td>").append(this.generateContextMenu(property, $options)));
            if (property.getRow()) {
                property.getRow().replaceWith($row);
            }
            else {
                $("#property-table tbody").append($row);
            }
            property.setRow($row);
        };
        Verifier.prototype.displayProperties = function () {
            $("#property-table tbody").empty();
            var properties = this.project.getProperties();
            for (var i = 0; i < properties.length; i++) {
                properties[i].setRow(null);
                this.displayProperty(properties[i]);
            }
        };
        Verifier.prototype.generateContextMenu = function (property, $element) {
            var _this = this;
            var status = property.getStatus();
            var $ul = $("<ul>");
            if (status === 3 /* unknown */ || status === 2 /* invalid */) {
            }
            else {
                var gameConfiguration = property.getGameConfiguration();
                if (gameConfiguration) {
                    var startGame = function () {
                        if (property instanceof Property.HML) {
                            Main.activityHandler.selectActivity("hmlgame", gameConfiguration);
                        }
                        else {
                            Main.activityHandler.selectActivity("game", gameConfiguration);
                        }
                    };
                    $ul.append($("<li>").append($("<a>").append("Play Game")).on("click", function () { return startGame(); }));
                }
                if (status === 1 /* unsatisfied */ && property instanceof Property.DistinguishingFormula && property.getTime() !== "untimed") {
                    var generateFormula = function (properties) {
                        if (properties) {
                            _this.project.addPropertyAfter(property.getId(), properties.secondProperty);
                            _this.project.addPropertyAfter(property.getId(), properties.firstProperty);
                            _this.displayProperties();
                        }
                    };
                    $ul.append($("<li>").append($("<a>").append("Generate Distinguishing Formula")).on("click", function () { return property.generateDistinguishingFormula(generateFormula); }));
                }
            }
            if ($ul.find("li").length > 0) {
                $ul.addClass("dropdown-menu pull-right");
                $element.attr("data-toggle", "dropdown");
                return $("<div>").addClass("relative").append($element).append($ul);
            }
            else {
                return $element.addClass("text-muted");
            }
        };
        Verifier.prototype.setPropertyModalOptions = function () {
            var processes = this.graph.getNamedProcesses().reverse();
            var $lists = $("#firstProcess").add($("#secondProcess")).add($("#hmlProcess")).empty();
            for (var i = 0; i < processes.length; i++) {
                var $option = $("<option></option>").append(processes[i]);
                $lists.append($option);
            }
            $("#secondProcess").find("option:nth-child(2)").prop("selected", true);
            $("#ccsTransition").toggle(this.project.getInputMode() === 0 /* CCS */);
            $("#tccsTransition").toggle(this.project.getInputMode() === 1 /* TCCS */);
        };
        Verifier.prototype.showPropertyModal = function (e) {
            var _this = this;
            $("#save-property").off("click");
            $("#propertyComment").val("");
            this.formulaEditor.setValue("");
            this.definitionsEditor.setValue("");
            if (e) {
                var property = e.data.property;
                $("#propertyComment").val(property.getComment());
                if (property instanceof Property.HML) {
                    $("#hmlProcess").val(property.getProcess());
                    this.formulaEditor.setValue(property.getTopFormula(), 1);
                    this.definitionsEditor.setValue(property.getDefinitions(), 1);
                    this.setSelectedPropertyType("hml-formula");
                }
                else {
                    if (this.project.getInputMode() === 0 /* CCS */) {
                        $("#ccsTransition [value=" + property.getType() + "]").prop("selected", true);
                    }
                    else {
                        $("#tccsTransition [value=" + property.getType() + "][data-time=" + property.getTime() + "]").prop("selected", true);
                    }
                    $("#relationType").val(property.getClassName());
                    $("#firstProcess").val(property.getFirstProcess());
                    $("#secondProcess").val(property.getSecondProcess());
                    this.setSelectedPropertyType("relation");
                }
                $("#save-property").on("click", e.data, function (e) { return _this.saveProperty(e); });
            }
            else {
                $("#save-property").on("click", function () { return _this.saveProperty(); });
            }
            this.formulaEditor.focus();
            $("#property-modal").modal("show");
        };
        Verifier.prototype.getSelectedPropertyType = function () {
            return $("input[name=property-type]:checked").val();
        };
        Verifier.prototype.setSelectedPropertyType = function (value) {
            $("input[name=property-type][value=" + value + "]").prop("checked", true).trigger("change");
        };
        Verifier.prototype.showSelectedPropertyType = function () {
            var _this = this;
            if (this.getSelectedPropertyType() === "relation") {
                $("#add-hml-formula").fadeOut(200, function () { return $("#add-relation").fadeIn(200); });
            }
            else {
                $("#add-relation").fadeOut(200, function () { return $("#add-hml-formula").fadeIn(200, function () { return _this.formulaEditor.focus(); }); });
            }
        };
        Verifier.prototype.saveProperty = function (e) {
            var propertyName, options;
            if (this.getSelectedPropertyType() === "relation") {
                propertyName = $("#relationType option:selected").val();
                options = {
                    firstProcess: $("#firstProcess option:selected").val(),
                    secondProcess: $("#secondProcess option:selected").val(),
                    type: null,
                    time: null
                };
                if (this.project.getInputMode() === 0 /* CCS */) {
                    options["type"] = $("#ccsTransition option:selected").val();
                }
                else {
                    options["type"] = $("#tccsTransition option:selected").val();
                    options["time"] = $("#tccsTransition option:selected").data("time");
                }
            }
            else {
                propertyName = "HML";
                options = {
                    process: $("#hmlProcess option:selected").val(),
                    topFormula: this.formulaEditor.getValue(),
                    definitions: this.definitionsEditor.getValue()
                };
            }
            options["comment"] = $("#propertyComment").val();
            var property = new window["Property"][propertyName](options);
            this.project.addProperty(property);
            if (e) {
                this.project.deleteProperty(e.data.property);
                property.setRow(e.data.property.getRow());
            }
            this.displayProperty(property);
        };
        Verifier.prototype.deleteProperty = function (e) {
            this.project.deleteProperty(e.data.property);
            e.data.property.getRow().fadeOut(200, function () {
                $(this).remove();
            });
        };
        Verifier.prototype.verify = function (e) {
            var _this = this;
            if (this.verifyingProperty == null) {
                this.verifyingProperty = e.data.property;
                this.disableVerification();
                this.verifyingProperty.verify(function (property) { return _this.verificationEnded(property); });
            }
        };
        Verifier.prototype.verifyNext = function () {
            if (this.queue.length > 0) {
                var property = this.queue.shift();
                this.verify({ data: { property: property } });
            }
        };
        Verifier.prototype.verifyAll = function () {
            var _this = this;
            ;
            this.queue = [];
            var properties = this.project.getProperties();
            properties.forEach(function (property) { return _this.queue.push(property); });
            this.verifyNext();
        };
        Verifier.prototype.stopVerify = function () {
            if (this.verifyingProperty != null) {
                this.verifyingProperty.abortVerification();
                this.enableVerification();
                this.displayProperty(this.verifyingProperty);
                this.queue = [];
                this.verifyingProperty = null;
            }
        };
        Verifier.prototype.verificationEnded = function (property) {
            this.verifyingProperty = null;
            this.enableVerification();
            this.displayProperty(property);
            this.verifyNext();
        };
        Verifier.prototype.enableVerification = function () {
            $(".verify-property").removeClass("text-muted");
            $("#verify-all").prop("disabled", false);
            $("#verify-stop").prop("disabled", true);
        };
        Verifier.prototype.disableVerification = function () {
            $(".verify-property").addClass("text-muted");
            $("#verify-all").prop("disabled", true);
            $("#verify-stop").prop("disabled", false);
        };
        return Verifier;
    })(Activity.Activity);
    Activity.Verifier = Verifier;
})(Activity || (Activity = {}));
/// <reference path="../../lib/util.d.ts" />
/// <reference path="../gui/project.ts" />
/// <reference path="../gui/gui.ts" />
/// <reference path="../gui/arbor/arbor.ts" />
/// <reference path="../gui/arbor/renderer.ts" />
/// <reference path="activity.ts" />
/// <reference path="fullscreen.ts" />
/// <reference path="tooltip.ts" />
var Activity;
(function (Activity) {
    var dg = DependencyGraph;
    var Game = (function (_super) {
        __extends(Game, _super);
        function Game(container, button, activeToggle) {
            var _this = this;
            _super.call(this, container, button, activeToggle);
            this.project = Project.getInstance();
            this.fullscreen = new Activity.Fullscreen($("#game-container")[0], $("#game-fullscreen"), function () { return _this.resize(null, null); });
            this.tooltip = new Activity.ProcessTooltip($("#game-status"));
            new Activity.DataTooltip($("#game-log")); // no need to save instance
            this.$leftProcessList = $("#game-left-process");
            this.$rightProcessList = $("#game-right-process");
            this.$ccsGameTypes = $("#game-ccs-type");
            this.$tccsGameTypes = $("#game-tccs-type");
            this.$gameRelation = $("#game-relation");
            this.$playerType = $("input[name=player-type]");
            this.$restart = $("#game-restart");
            this.$leftContainer = $("#game-left-canvas");
            this.$rightContainer = $("#game-right-canvas");
            this.$leftZoom = $("#zoom-left");
            this.$rightZoom = $("#zoom-right");
            this.$leftDepth = $("#depth-left");
            this.$rightDepth = $("#depth-right");
            this.$leftFreeze = $("#freeze-left");
            this.$rightFreeze = $("#freeze-right");
            this.leftCanvas = this.$leftContainer.find("canvas")[0];
            this.rightCanvas = this.$rightContainer.find("canvas")[0];
            this.leftRenderer = new Renderer(this.leftCanvas);
            this.rightRenderer = new Renderer(this.rightCanvas);
            this.leftGraph = new GUI.ArborGraph(this.leftRenderer);
            this.rightGraph = new GUI.ArborGraph(this.rightRenderer);
            this.$leftProcessList.on("change", function () { return _this.newGame(true, false); });
            this.$rightProcessList.on("change", function () { return _this.newGame(false, true); });
            this.$ccsGameTypes.on("change", function () { return _this.newGame(true, true); });
            this.$tccsGameTypes.on("change", function () { return _this.newGame(true, true); });
            this.$gameRelation.on("change", function () { return _this.newGame(false, false); });
            this.$playerType.on("change", function () { return _this.newGame(false, false); });
            this.$restart.on("click", function () { return _this.newGame(false, false); });
            this.$rightDepth.on("change", function () { return _this.setDepth(_this.dgGame.getCurrentConfiguration().right, _this.rightGraph, _this.$rightDepth.val(), 0 /* Right */); });
            this.$leftFreeze.on("click", function (e) { return _this.toggleFreeze(_this.leftGraph, !_this.$leftFreeze.data("frozen"), $(e.currentTarget)); });
            this.$rightFreeze.on("click", function (e) { return _this.toggleFreeze(_this.rightGraph, !_this.$rightFreeze.data("frozen"), $(e.currentTarget)); });
            // Manually remove focus from depth input when the canvas is clicked.
            $(this.leftCanvas).on("click", function () {
                if (_this.$leftDepth.is(":focus"))
                    _this.$leftDepth.blur();
            });
            $(this.rightCanvas).on("click", function () {
                if (_this.$rightDepth.is(":focus"))
                    _this.$rightDepth.blur();
            });
            this.$leftDepth.on("change", function () {
                _this.validateDepth(_this.$leftDepth);
                _this.setDepth(_this.dgGame.getCurrentConfiguration().left, _this.leftGraph, _this.$leftDepth.val(), 1 /* Left */);
            });
            this.$rightDepth.on("change", function () {
                _this.validateDepth(_this.$rightDepth);
                _this.setDepth(_this.dgGame.getCurrentConfiguration().right, _this.rightGraph, _this.$rightDepth.val(), 0 /* Right */);
            });
            // Use onchange instead of oninput for IE.
            if (navigator.userAgent.indexOf("MSIE ") > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)) {
                this.$leftZoom.on("change", function () { return _this.resize(_this.$leftZoom.val(), null); });
                this.$rightZoom.on("change", function () { return _this.resize(null, _this.$rightZoom.val()); });
            }
            else {
                this.$leftZoom.on("input", function () { return _this.resize(_this.$leftZoom.val(), null); });
                this.$rightZoom.on("input", function () { return _this.resize(null, _this.$rightZoom.val()); });
            }
        }
        Game.prototype.getSuccessorGenerator = function () {
            return this.succGen;
        };
        Game.prototype.getGraph = function () {
            return this.graph;
        };
        Game.prototype.setDepth = function (process, graph, depth, move) {
            this.clear(graph);
            this.draw(process, graph, depth);
            this.centerNode(process, move);
            if (move === 1 /* Left */)
                this.toggleFreeze(graph, false, this.$leftFreeze);
            else
                this.toggleFreeze(graph, false, this.$rightFreeze);
        };
        Game.prototype.validateDepth = function ($input) {
            if (!/^[1-9][0-9]*$/.test($input.val())) {
                $input.val($input.data("previous-depth"));
            }
            else {
                $input.data("previous-depth", $input.val());
            }
        };
        Game.prototype.toggleFreeze = function (graph, freeze, button) {
            if (freeze) {
                graph.freeze();
                button.find("i").replaceWith("<i class='fa fa-lock fa-lg'></i>");
            }
            else {
                graph.unfreeze();
                button.find("i").replaceWith("<i class='fa fa-unlock-alt fa-lg'></i>");
            }
            button.data("frozen", freeze);
        };
        Game.prototype.onShow = function (configuration) {
            var _this = this;
            $(window).on("resize", function () { return _this.resize(_this.$leftZoom.val(), _this.$rightZoom.val()); });
            this.fullscreen.onShow();
            if (this.changed || configuration) {
                if (this.project.getInputMode() === 0 /* CCS */) {
                    this.$ccsGameTypes.show();
                    this.$tccsGameTypes.hide();
                }
                else {
                    this.$ccsGameTypes.hide();
                    this.$tccsGameTypes.show();
                }
                this.changed = false;
                this.graph = this.project.getGraph();
                this.displayOptions();
                this.newGame(true, true, configuration);
            }
            this.tooltip.setGraph(this.graph);
            this.leftGraph.setOnSelectListener(function (processId) {
                if (_this.leftGraph.getProcessDataObject(processId.toString()).status === "unexpanded")
                    _this.draw(_this.graph.processById(processId), _this.leftGraph, _this.$leftDepth.val());
            });
            this.rightGraph.setOnSelectListener(function (processId) {
                if (_this.rightGraph.getProcessDataObject(processId.toString()).status === "unexpanded")
                    _this.draw(_this.graph.processById(processId), _this.rightGraph, _this.$rightDepth.val());
            });
            this.leftGraph.setHoverOnListener(function (processId) {
                _this.timeout = setTimeout(function () {
                    var tooltipAnchor = $("#game-canvas-tooltip-left");
                    var position = _this.leftGraph.getPosition(processId);
                    tooltipAnchor.css("left", position.x - _this.$leftContainer.scrollLeft());
                    tooltipAnchor.css("top", position.y - _this.$leftContainer.scrollTop() - 10);
                    tooltipAnchor.tooltip({ title: _this.tooltip.ccsNotationForProcessId(processId), html: true });
                    tooltipAnchor.tooltip("show");
                }, 1000);
            });
            this.leftGraph.setHoverOutListener(function () {
                clearTimeout(_this.timeout);
                $("#game-canvas-tooltip-left").tooltip("destroy");
            });
            this.rightGraph.setHoverOnListener(function (processId) {
                _this.timeout = setTimeout(function () {
                    var tooltipAnchor = $("#game-canvas-tooltip-right");
                    var position = _this.rightGraph.getPosition(processId);
                    tooltipAnchor.css("left", position.x - _this.$rightContainer.scrollLeft());
                    tooltipAnchor.css("top", position.y - _this.$rightContainer.scrollTop() - 10);
                    tooltipAnchor.tooltip({ title: _this.tooltip.ccsNotationForProcessId(processId), html: true });
                    tooltipAnchor.tooltip("show");
                }, 1000);
            });
            this.rightGraph.setHoverOutListener(function () {
                clearTimeout(_this.timeout);
                $("#game-canvas-tooltip-right").tooltip("destroy");
            });
            this.leftGraph.bindCanvasEvents();
            this.rightGraph.bindCanvasEvents();
            this.toggleFreeze(this.leftGraph, this.$leftFreeze.data("frozen"), this.$leftFreeze); // (un)freeze, depending on the lock icon
            this.toggleFreeze(this.rightGraph, this.$rightFreeze.data("frozen"), this.$rightFreeze); // (un)freeze, depending on the lock icon
        };
        Game.prototype.onHide = function () {
            $(window).off("resize");
            this.fullscreen.onHide();
            this.leftGraph.clearOnSelectListener();
            this.rightGraph.clearOnSelectListener();
            this.leftGraph.clearHoverOnListener();
            this.rightGraph.clearHoverOnListener();
            this.leftGraph.clearHoverOutListener();
            this.rightGraph.clearHoverOutListener();
            this.leftGraph.unbindCanvasEvents();
            this.rightGraph.unbindCanvasEvents();
            this.leftGraph.freeze(); // force freeze for graph
            this.rightGraph.freeze(); // force freeze for graph
        };
        Game.prototype.displayOptions = function () {
            var processes = this.graph.getNamedProcesses().reverse();
            this.$leftProcessList.empty();
            this.$rightProcessList.empty();
            for (var i = 0; i < processes.length; i++) {
                this.$leftProcessList.append($("<option></option>").append(processes[i]));
                this.$rightProcessList.append($("<option></option>").append(processes[i]));
            }
            // Set second option as default selection for the right process.
            this.$rightProcessList.find("option:nth-child(2)").prop("selected", true);
        };
        Game.prototype.getOptions = function () {
            var options = {
                leftProcess: this.$leftProcessList.val(),
                rightProcess: this.$rightProcessList.val(),
                type: null,
                time: "",
                relation: this.$gameRelation.val(),
                playerType: this.$playerType.filter(":checked").val()
            };
            if (this.project.getInputMode() === 0 /* CCS */) {
                options.type = this.$ccsGameTypes.val();
            }
            else {
                options.type = this.$tccsGameTypes.find("option:selected").val();
                options.time = this.$tccsGameTypes.find("option:selected").data("time");
            }
            return options;
        };
        Game.prototype.setOptions = function (options) {
            this.$leftProcessList.val(options.leftProcess);
            this.$rightProcessList.val(options.rightProcess);
            if (this.project.getInputMode() === 0 /* CCS */) {
                this.$ccsGameTypes.val(options.type);
            }
            else {
                this.$tccsGameTypes.find("[value=" + options.type + "][data-time=" + options.time + "]").prop("selected", true);
            }
            this.$gameRelation.val(options.relation);
            // Bootstrap radio buttons only support changes via click events.
            // Manually handle .active class.
            this.$playerType.each(function () {
                if ($(this).attr("value") === options.playerType) {
                    $(this).parent().addClass("active");
                }
                else {
                    $(this).parent().removeClass("active");
                }
            });
        };
        Game.prototype.newGame = function (drawLeft, drawRight, configuration) {
            var options;
            if (configuration) {
                options = configuration;
                this.setOptions(options);
            }
            else {
                options = this.getOptions();
            }
            this.succGen = CCS.getSuccGenerator(this.graph, { inputMode: InputMode[this.project.getInputMode()], time: options.time, succGen: options.type, reduce: true });
            if (drawLeft || !this.leftGraph.getNode(this.succGen.getProcessByName(options.leftProcess).id.toString())) {
                this.clear(this.leftGraph);
                this.draw(this.succGen.getProcessByName(options.leftProcess), this.leftGraph, this.$leftDepth.val());
                this.resize(1, null);
                this.toggleFreeze(this.leftGraph, false, this.$leftFreeze);
            }
            if (drawRight || !this.rightGraph.getNode(this.succGen.getProcessByName(options.rightProcess).id.toString())) {
                this.clear(this.rightGraph);
                this.draw(this.succGen.getProcessByName(options.rightProcess), this.rightGraph, this.$rightDepth.val());
                this.resize(null, 1);
                this.toggleFreeze(this.rightGraph, false, this.$rightFreeze);
            }
            var attackerSuccessorGenerator = CCS.getSuccGenerator(this.graph, { inputMode: InputMode[this.project.getInputMode()], time: "timed", succGen: "strong", reduce: true });
            var defenderSuccessorGenerator = this.succGen;
            if (this.dgGame !== undefined) {
                this.dgGame.stopGame();
            }
            ;
            if (options.relation === "Simulation") {
                this.dgGame = new SimulationGame(this, this.graph, attackerSuccessorGenerator, defenderSuccessorGenerator, options.leftProcess, options.rightProcess, options.time, options.type);
            }
            else if (options.relation === "Bisimulation") {
                this.dgGame = new BisimulationGame(this, this.graph, attackerSuccessorGenerator, defenderSuccessorGenerator, options.leftProcess, options.rightProcess, options.time, options.type);
            }
            var attacker;
            var defender;
            if (options.playerType === "defender") {
                attacker = new Computer(0 /* Attacker */);
                defender = new Human(1 /* Defender */, this);
            }
            else {
                attacker = new Human(0 /* Attacker */, this);
                defender = new Computer(1 /* Defender */);
            }
            this.dgGame.setPlayers(attacker, defender);
            this.dgGame.startGame();
        };
        Game.prototype.draw = function (process, graph, depth) {
            var _this = this;
            var allTransitions = CCS.getNSuccessors(CCS.getSuccGenerator(this.graph, { inputMode: InputMode[this.project.getInputMode()], time: "timed", succGen: "strong", reduce: true }), process, depth); //this.expandBFS(process, depth);
            for (var fromId in allTransitions) {
                var fromProcess = this.graph.processById(fromId);
                this.showProcess(fromProcess, graph);
                this.showProcessAsExplored(fromProcess, graph);
                var groupedByTargetProcessId = ArrayUtil.groupBy(allTransitions[fromId].toArray(), function (t) { return t.targetProcess.id; });
                Object.keys(groupedByTargetProcessId).forEach(function (strProcId) {
                    var group = groupedByTargetProcessId[strProcId], data = group.map(function (t) {
                        return { label: t.action.toString(false) };
                    });
                    _this.showProcess(_this.graph.processById(strProcId), graph);
                    graph.showTransitions(fromProcess.id, strProcId, data);
                });
            }
            this.highlightNodes();
        };
        Game.prototype.showProcess = function (process, graph) {
            if (graph.getProcessDataObject(process.id))
                return;
            graph.showProcess(process.id, { label: this.labelFor(process), status: "unexpanded" });
        };
        Game.prototype.showProcessAsExplored = function (process, graph) {
            graph.getProcessDataObject(process.id).status = "expanded";
        };
        Game.prototype.onPlay = function (strictPath, move) {
            if (!strictPath)
                return;
            var graph = (move === 1 /* Left */) ? this.leftGraph : this.rightGraph;
            for (var i = 0; i < strictPath.length; i++) {
                this.draw(strictPath[i].targetProcess, graph, 1);
            }
            var expandDepth = (move === 1 /* Left */) ? this.$leftDepth.val() : this.$rightDepth.val();
            this.draw(strictPath[strictPath.length - 1].targetProcess, graph, expandDepth);
        };
        Game.prototype.highlightNodes = function () {
            if (!this.dgGame)
                return;
            var configuration = this.dgGame.getCurrentConfiguration();
            this.leftGraph.setSelected(configuration.left.id);
            this.rightGraph.setSelected(configuration.right.id);
        };
        Game.prototype.highlightChoices = function (isLeft, targetId) {
            if (isLeft) {
                this.leftGraph.highlightToNode(targetId);
            }
            else {
                this.rightGraph.highlightToNode(targetId);
            }
        };
        Game.prototype.removeHighlightChoices = function (isLeft) {
            if (isLeft) {
                this.leftGraph.clearHighlights();
            }
            else {
                this.rightGraph.clearHighlights();
            }
        };
        Game.prototype.clear = function (graph) {
            graph.clearAll();
        };
        Game.prototype.labelFor = function (process) {
            return this.graph.getLabel(process);
        };
        Game.prototype.centerNode = function (process, move) {
            if (move === 1 /* Left */) {
                var position = this.leftGraph.getPosition(process.id.toString());
                this.$leftContainer.scrollLeft(position.x - (this.$leftContainer.width() / 2));
                this.$leftContainer.scrollTop(position.y - (this.$leftContainer.height() / 2));
            }
            else {
                var position = this.rightGraph.getPosition(process.id.toString());
                this.$rightContainer.scrollLeft(position.x - (this.$rightContainer.width() / 2));
                this.$rightContainer.scrollTop(position.y - (this.$rightContainer.height() / 2));
            }
        };
        Game.prototype.resize = function (leftZoom, rightZoom) {
            var offsetTop = $("#game-main").offset().top;
            var offsetBottom = $("#game-status").height();
            var availableHeight = window.innerHeight - offsetTop - offsetBottom - 17; // Margin bot + border = 22px.
            // Minimum height 265px.
            var height = Math.max(265, availableHeight);
            this.$leftContainer.height(height);
            this.$rightContainer.height(height);
            if (leftZoom !== null) {
                this.$leftZoom.val(leftZoom.toString());
                this.leftCanvas.width = this.$leftContainer.width() * leftZoom;
                this.leftCanvas.height = height * leftZoom;
                this.leftRenderer.resize(this.leftCanvas.width, this.leftCanvas.height);
                if (leftZoom > 1) {
                    $("#game-left .input-group").css("right", 30);
                    this.$leftContainer.css("overflow", "auto");
                    this.centerNode(this.dgGame.getCurrentConfiguration().left, 1 /* Left */);
                }
                else {
                    $("#game-left .input-group").css("right", 10);
                    this.$leftContainer.css("overflow", "hidden");
                }
            }
            if (rightZoom !== null) {
                this.$rightZoom.val(rightZoom.toString());
                this.rightCanvas.width = this.$rightContainer.width() * rightZoom;
                this.rightCanvas.height = height * rightZoom;
                this.rightRenderer.resize(this.rightCanvas.width, this.rightCanvas.height);
                if (rightZoom > 1) {
                    $("#game-right .input-group").css("right", 30);
                    this.$rightContainer.css("overflow", "auto");
                    this.centerNode(this.dgGame.getCurrentConfiguration().right, 0 /* Right */);
                }
                else {
                    $("#game-right .input-group").css("right", 10);
                    this.$rightContainer.css("overflow", "hidden");
                }
            }
        };
        return Game;
    })(Activity.Activity);
    Activity.Game = Game;
    (function (PlayType) {
        PlayType[PlayType["Attacker"] = 0] = "Attacker";
        PlayType[PlayType["Defender"] = 1] = "Defender";
    })(Activity.PlayType || (Activity.PlayType = {}));
    var PlayType = Activity.PlayType;
    (function (Move) {
        Move[Move["Right"] = 0] = "Right";
        Move[Move["Left"] = 1] = "Left";
    })(Activity.Move || (Activity.Move = {}));
    var Move = Activity.Move;
    var Abstract = (function () {
        function Abstract() {
        }
        Abstract.prototype.abstract = function () {
            throw new Error("Abstract method not implemented.");
        };
        return Abstract;
    })();
    var DgGame = (function (_super) {
        __extends(DgGame, _super);
        function DgGame(gameActivity, gameLog, graph, currentLeft, currentRight, time, gameType) {
            _super.call(this);
            this.round = 1;
            this.currentNodeId = 0; // the DG node id
            this.gameActivity = gameActivity;
            this.gameLog = gameLog;
            this.graph = graph;
            this.gameType = gameType;
            this.time = time;
            this.currentLeft = currentLeft;
            this.currentRight = currentRight;
            // create the dependency graph
            this.dependencyGraph = this.createDependencyGraph(this.graph, currentLeft, currentRight);
            // create markings
            this.marking = this.createMarking();
        }
        DgGame.prototype.getTransitionStr = function (isAttack, action) {
            var timedSubScript = (this.time === "timed") ? "<sub>t</sub>" : (this.time === "untimed") ? "<sub>u</sub>" : "";
            if (!isAttack && this.gameType === "weak") {
                return ("=" + action + "=>" + timedSubScript);
            }
            else {
                return "-" + action + "->" + (this.time === "" ? "" : (isAttack ? "<sub>t</sub>" : timedSubScript));
            }
        };
        DgGame.prototype.hasAbstractions = function () {
            return this.gameType === "weak" || this.time === "untimed";
        };
        DgGame.prototype.getGameLog = function () {
            return this.gameLog;
        };
        DgGame.prototype.createMarking = function () {
            return dg.liuSmolkaLocal2(this.currentNodeId, this.dependencyGraph);
        };
        DgGame.prototype.getRound = function () {
            return this.round;
        };
        DgGame.prototype.isUniversalWinner = function (player) {
            // returns true if the player has a universal winning strategy
            return this.getUniversalWinner() === player;
        };
        DgGame.prototype.isCurrentWinner = function (player) {
            return this.getCurrentWinner() === player;
        };
        DgGame.prototype.getLastMove = function () {
            return this.lastMove;
        };
        DgGame.prototype.getLastAction = function () {
            return this.lastAction;
        };
        DgGame.prototype.getCurrentConfiguration = function () {
            return { left: this.currentLeft, right: this.currentRight };
        };
        DgGame.prototype.startGame = function () {
            if (this.attacker == undefined || this.defender == undefined)
                throw "No players in game.";
            this.stopGame();
            this.currentNodeId = 0;
            this.cycleCache = {};
            this.cycleCache[this.getConfigurationStr(this.getCurrentConfiguration())] = this.currentNodeId;
            this.gameActivity.highlightNodes();
            this.gameActivity.centerNode(this.currentLeft, 1 /* Left */);
            this.gameActivity.centerNode(this.currentRight, 0 /* Right */);
            this.gameLog.printRound(this.round, this.getCurrentConfiguration());
            this.preparePlayer(this.attacker);
        };
        DgGame.prototype.stopGame = function () {
            // tell players to abort their prepared play
            this.attacker.abortPlay();
            this.defender.abortPlay();
        };
        DgGame.prototype.setPlayers = function (attacker, defender) {
            if (attacker.getPlayType() == defender.getPlayType()) {
                throw "Cannot make game with two " + attacker.playTypeStr() + "s";
            }
            else if (attacker.getPlayType() != 0 /* Attacker */ || defender.getPlayType() != 1 /* Defender */) {
                throw "setPlayer(...) : First argument must be attacker and second defender";
            }
            this.attacker = attacker;
            this.defender = defender;
            this.currentWinner = this.getUniversalWinner();
        };
        DgGame.prototype.saveCurrentProcess = function (process, move) {
            switch (move) {
                case 1 /* Left */:
                    this.currentLeft = process;
                    break;
                case 0 /* Right */:
                    this.currentRight = process;
                    break;
            }
        };
        DgGame.prototype.play = function (player, destinationProcess, nextNode, action, move) {
            if (action === void 0) { action = this.lastAction; }
            this.abstract();
        };
        DgGame.prototype.preparePlayer = function (player) {
            var choices = this.getCurrentChoices(player.getPlayType());
            // determine if game is over
            if (choices.length === 0) {
                // the player to be prepared cannot make a move
                // the player to prepare has lost, announce it
                this.gameLog.printWinner((player === this.attacker) ? this.defender : this.attacker);
                // stop game
                this.stopGame();
            }
            else {
                // save the old winner, and then update who wins
                var oldWinner = this.currentWinner;
                this.currentWinner = this.getCurrentWinner();
                // if winner changed, let the user know
                if (oldWinner !== this.currentWinner)
                    this.gameLog.printWinnerChanged(this.currentWinner);
                // tell the player to prepare for his turn
                player.prepareTurn(choices, this);
            }
        };
        DgGame.prototype.cycleExists = function () {
            var configuration = this.getCurrentConfiguration();
            var cacheStr = this.getConfigurationStr(configuration);
            if (this.cycleCache[cacheStr] != undefined) {
                // cycle detected
                this.gameLog.printCycleWinner(this.defender);
                this.stopGame();
                // clear the cache
                this.cycleCache = {};
                this.cycleCache[cacheStr] = this.currentNodeId;
                return true;
            }
            else {
                this.cycleCache[cacheStr] = this.currentNodeId;
                return false;
            }
        };
        DgGame.prototype.getConfigurationStr = function (configuration) {
            var result = "(";
            result += this.graph.getLabel(configuration.left);
            result += ", ";
            result += this.graph.getLabel(configuration.right);
            result += ")";
            return result;
        };
        DgGame.prototype.getCurrentChoices = function (playType) {
            if (playType == 0 /* Attacker */)
                return this.dependencyGraph.getAttackerOptions(this.currentNodeId);
            else
                return this.dependencyGraph.getDefenderOptions(this.currentNodeId);
        };
        /* Abstract methods */
        DgGame.prototype.getUniversalWinner = function () {
            return this.abstract();
        };
        DgGame.prototype.getCurrentWinner = function () {
            return this.abstract();
        };
        DgGame.prototype.getBestWinningAttack = function (choices) {
            this.abstract();
        };
        DgGame.prototype.getTryHardAttack = function (choices) {
            this.abstract();
        };
        DgGame.prototype.getWinningDefend = function (choices) {
            this.abstract();
        };
        DgGame.prototype.getTryHardDefend = function (choices) {
            this.abstract();
        };
        DgGame.prototype.createDependencyGraph = function (graph, currentLeft, currentRight) {
            return this.abstract();
        };
        return DgGame;
    })(Abstract);
    var DgComputerStrategy = (function (_super) {
        __extends(DgComputerStrategy, _super);
        function DgComputerStrategy(gameActivity, gameLog, graph, currentLeft, currentRight, gameType, time) {
            _super.call(this, gameActivity, gameLog, graph, currentLeft, currentRight, time, gameType);
        }
        DgComputerStrategy.prototype.getBestWinningAttack = function (choices) {
            var _this = this;
            if (choices.length == 0)
                throw "No choices for attacker";
            var bestCandidateIndex = 0;
            var bestCandidateLevel = Infinity;
            var ownLevel = this.marking.getLevel(this.currentNodeId);
            choices.forEach(function (choice, i) {
                var targetNodeLevel = _this.marking.getLevel(choice.nextNode);
                if (targetNodeLevel < ownLevel && targetNodeLevel < bestCandidateLevel) {
                    bestCandidateLevel = targetNodeLevel;
                    bestCandidateIndex = i;
                }
            });
            return choices[bestCandidateIndex];
        };
        DgComputerStrategy.prototype.getTryHardAttack = function (choices) {
            var _this = this;
            // strategy: Play the choice which yields the highest ratio of one-markings on the defenders next choice
            var bestCandidateIndices = [];
            var bestRatio = 0;
            choices.forEach(function (choice, i) {
                var oneMarkings = 0;
                var defenderChoices = _this.dependencyGraph.getDefenderOptions(choice.nextNode);
                if (defenderChoices.length > 0) {
                    defenderChoices.forEach(function (defendChoice) {
                        if (_this.marking.getMarking(defendChoice.nextNode) === _this.marking.ONE)
                            oneMarkings++;
                    });
                    var ratio = oneMarkings / defenderChoices.length;
                    if (ratio > bestRatio) {
                        bestRatio = ratio;
                        bestCandidateIndices = [i];
                    }
                    else if (ratio == bestRatio) {
                        bestCandidateIndices.push(i);
                    }
                }
                else {
                    bestCandidateIndices = [i];
                }
            });
            if (bestRatio == 0) {
                // no-one markings were found, retun random choice
                return choices[this.random(choices.length - 1)];
            }
            else {
                // return a random choice between the equally best choices
                return choices[bestCandidateIndices[this.random(bestCandidateIndices.length - 1)]];
            }
        };
        DgComputerStrategy.prototype.getWinningDefend = function (choices) {
            for (var i = 0; i < choices.length; i++) {
                if (this.marking.getMarking(choices[i].nextNode) === this.marking.ZERO) {
                    return choices[i];
                }
            }
            throw "No defender moves";
        };
        DgComputerStrategy.prototype.getTryHardDefend = function (choices) {
            // strategy: Play the choice with the highest level
            var bestCandidateIndices = [];
            var bestLevel = 0;
            for (var i = 0; i < choices.length; i++) {
                var level = this.marking.getLevel(choices[i].nextNode);
                if (level > bestLevel) {
                    bestLevel = level;
                    bestCandidateIndices = [i];
                }
                else if (level == bestLevel) {
                    bestCandidateIndices.push(i);
                }
            }
            if (bestLevel == 0) {
                // if no good levels were found return a random play
                return choices[this.random(choices.length - 1)];
            }
            else {
                // return a random choice between the equally best choices
                return choices[bestCandidateIndices[this.random(bestCandidateIndices.length - 1)]];
            }
        };
        DgComputerStrategy.prototype.random = function (max) {
            // random integer between 0 and max
            return Math.floor((Math.random() * (max + 1)));
        };
        return DgComputerStrategy;
    })(DgGame);
    var BisimulationGame = (function (_super) {
        __extends(BisimulationGame, _super);
        function BisimulationGame(gameActivity, graph, attackerSuccessorGen, defenderSuccessorGen, leftProcessName, rightProcessName, time, gameType) {
            this.leftProcessName = leftProcessName;
            this.rightProcessName = rightProcessName;
            this.attackerSuccessorGen = attackerSuccessorGen;
            this.defenderSuccessorGen = defenderSuccessorGen;
            var currentLeft = graph.processByName(this.leftProcessName);
            var currentRight = graph.processByName(this.rightProcessName);
            _super.call(this, gameActivity, new BisimulationGameLog(time, gameActivity), graph, currentLeft, currentRight, gameType, time); // creates dependency graph and marking
        }
        BisimulationGame.prototype.getGameType = function () {
            return this.gameType;
        };
        BisimulationGame.prototype.startGame = function () {
            this.gameLog.printIntro(this.gameType, this.getCurrentConfiguration(), this.getUniversalWinner(), this.attacker);
            _super.prototype.startGame.call(this);
        };
        BisimulationGame.prototype.play = function (player, destinationProcess, nextNode, action, move) {
            if (action === void 0) { action = this.lastAction; }
            var previousConfig = this.getCurrentConfiguration();
            var strictPath = [new CCS.Transition(action, destinationProcess)];
            // change the current node id to the next
            this.currentNodeId = nextNode;
            if (player.getPlayType() == 0 /* Attacker */) {
                var sourceProcess = move === 1 /* Left */ ? previousConfig.left : previousConfig.right;
                this.gameLog.printPlay(player, action, sourceProcess, destinationProcess, move, this);
                this.lastAction = action;
                this.lastMove = move;
                this.saveCurrentProcess(destinationProcess, this.lastMove);
                this.preparePlayer(this.defender);
            }
            else {
                // the play is a defense, flip the saved last move
                this.lastMove = this.lastMove === 0 /* Right */ ? 1 /* Left */ : 0 /* Right */;
                var sourceProcess = this.lastMove === 1 /* Left */ ? previousConfig.left : previousConfig.right;
                this.gameLog.printPlay(player, action, sourceProcess, destinationProcess, this.lastMove, this);
                this.saveCurrentProcess(destinationProcess, this.lastMove);
                this.round++;
                this.gameLog.printRound(this.round, this.getCurrentConfiguration());
                if (!this.cycleExists())
                    this.preparePlayer(this.attacker);
                if (this.defenderSuccessorGen instanceof Traverse.AbstractingSuccessorGenerator) {
                    strictPath = this.defenderSuccessorGen.getStrictPath(sourceProcess.id, action, destinationProcess.id);
                }
            }
            this.gameActivity.onPlay(strictPath, this.lastMove);
            this.gameActivity.centerNode(destinationProcess, this.lastMove);
        };
        BisimulationGame.prototype.createDependencyGraph = function (graph, currentLeft, currentRight) {
            return this.bisimulationDg = new Equivalence.BisimulationDG(this.attackerSuccessorGen, this.defenderSuccessorGen, this.currentLeft.id, this.currentRight.id);
        };
        BisimulationGame.prototype.getUniversalWinner = function () {
            return this.bisimilar ? this.defender : this.attacker;
        };
        BisimulationGame.prototype.getCurrentWinner = function () {
            return this.marking.getMarking(this.currentNodeId) === this.marking.ONE ? this.attacker : this.defender;
        };
        BisimulationGame.prototype.createMarking = function () {
            var marking = dg.solveDgGlobalLevel(this.bisimulationDg);
            this.bisimilar = marking.getMarking(0) === marking.ZERO;
            return marking;
        };
        return BisimulationGame;
    })(DgComputerStrategy);
    var SimulationGame = (function (_super) {
        __extends(SimulationGame, _super);
        function SimulationGame(gameActivity, graph, attackerSuccessorGen, defenderSuccessorGen, leftProcessName, rightProcessName, time, gameType) {
            this.leftProcessName = leftProcessName;
            this.rightProcessName = rightProcessName;
            this.attackerSuccessorGen = attackerSuccessorGen;
            this.defenderSuccessorGen = defenderSuccessorGen;
            var currentLeft = graph.processByName(this.leftProcessName);
            var currentRight = graph.processByName(this.rightProcessName);
            _super.call(this, gameActivity, new SimulationGameLog(time, gameActivity), graph, currentLeft, currentRight, gameType, time); // creates dependency graph and marking
        }
        SimulationGame.prototype.getGameType = function () {
            return this.gameType;
        };
        SimulationGame.prototype.startGame = function () {
            this.gameLog.printIntro(this.gameType, this.getCurrentConfiguration(), this.getUniversalWinner(), this.attacker);
            _super.prototype.startGame.call(this);
        };
        SimulationGame.prototype.play = function (player, destinationProcess, nextNode, action, move) {
            if (action === void 0) { action = this.lastAction; }
            var previousConfig = this.getCurrentConfiguration();
            var strictPath = [new CCS.Transition(action, destinationProcess)];
            // change the current node id to the next
            this.currentNodeId = nextNode;
            if (player.getPlayType() == 0 /* Attacker */) {
                var sourceProcess = previousConfig.left;
                this.gameLog.printPlay(player, action, sourceProcess, destinationProcess, move, this);
                this.lastAction = action;
                this.lastMove = move;
                this.saveCurrentProcess(destinationProcess, this.lastMove);
                this.preparePlayer(this.defender);
            }
            else {
                this.lastMove = 0 /* Right */;
                var sourceProcess = previousConfig.right;
                this.gameLog.printPlay(player, action, sourceProcess, destinationProcess, this.lastMove, this);
                this.saveCurrentProcess(destinationProcess, this.lastMove);
                this.round++;
                this.gameLog.printRound(this.round, this.getCurrentConfiguration());
                if (!this.cycleExists())
                    this.preparePlayer(this.attacker);
                if (this.defenderSuccessorGen instanceof Traverse.AbstractingSuccessorGenerator) {
                    var strictPath = this.defenderSuccessorGen.getStrictPath(sourceProcess.id, action, destinationProcess.id);
                }
            }
            this.gameActivity.onPlay(strictPath, this.lastMove);
            this.gameActivity.centerNode(destinationProcess, this.lastMove);
        };
        SimulationGame.prototype.createDependencyGraph = function (graph, currentLeft, currentRight) {
            return this.simulationDG = new Equivalence.SimulationDG(this.attackerSuccessorGen, this.defenderSuccessorGen, this.currentLeft.id, this.currentRight.id);
        };
        SimulationGame.prototype.getUniversalWinner = function () {
            return this.isSimilar ? this.defender : this.attacker;
        };
        SimulationGame.prototype.getCurrentWinner = function () {
            return this.marking.getMarking(this.currentNodeId) === this.marking.ONE ? this.attacker : this.defender;
        };
        SimulationGame.prototype.createMarking = function () {
            var marking = dg.solveDgGlobalLevel(this.simulationDG);
            this.isSimilar = marking.getMarking(0) === marking.ZERO;
            return marking;
        };
        return SimulationGame;
    })(DgComputerStrategy);
    var Player = (function (_super) {
        __extends(Player, _super);
        function Player(playType) {
            _super.call(this);
            this.playType = playType;
        }
        Player.prototype.prepareTurn = function (choices, game) {
            switch (this.playType) {
                case 0 /* Attacker */: {
                    this.prepareAttack(choices, game);
                    break;
                }
                case 1 /* Defender */: {
                    this.prepareDefend(choices, game);
                    break;
                }
            }
        };
        Player.prototype.getPlayType = function () {
            return this.playType;
        };
        Player.prototype.abortPlay = function () {
            // virtual, override
        };
        Player.prototype.playTypeStr = function (allLower) {
            if (allLower === void 0) { allLower = false; }
            if (allLower) {
                return this.playType == 0 /* Attacker */ ? "attacker" : "defender";
            }
            else {
                return this.playType == 0 /* Attacker */ ? "Attacker" : "Defender";
            }
        };
        /* Abstract methods */
        Player.prototype.prepareAttack = function (choices, game) {
            this.abstract();
        };
        Player.prototype.prepareDefend = function (choices, game) {
            this.abstract();
        };
        return Player;
    })(Abstract);
    var Human = (function (_super) {
        __extends(Human, _super);
        function Human(playType, gameActivity) {
            _super.call(this, playType);
            this.gameActivity = gameActivity;
            this.$table = $("#game-transitions-table").find("tbody");
        }
        Human.prototype.prepareAttack = function (choices, game) {
            this.fillTable(choices, game, true);
            game.getGameLog().printPrepareAttack();
        };
        Human.prototype.prepareDefend = function (choices, game) {
            this.fillTable(choices, game, false);
            game.getGameLog().printPrepareDefend(game.getLastMove());
        };
        Human.prototype.fillTable = function (choices, game, isAttack) {
            var _this = this;
            var currentConfiguration = game.getCurrentConfiguration();
            var actionTransition;
            if (!isAttack) {
                actionTransition = game.getTransitionStr(isAttack, game.getLastAction().toString(true));
            }
            this.$table.empty();
            choices.forEach(function (choice) {
                var row = $("<tr></tr>");
                row.attr("data-target-id", choice.targetProcess.id); // attach targetid on the row
                if (isAttack) {
                    var sourceProcess = choice.move == 1 ? currentConfiguration.left : currentConfiguration.right;
                    var $source = _this.labelWithTooltip(sourceProcess);
                    actionTransition = game.getTransitionStr(isAttack, choice.action.toString(true));
                    var $actionTd = $("<td id='action'></td>").append(actionTransition);
                }
                else {
                    var sourceProcess = game.getLastMove() == 0 /* Right */ ? currentConfiguration.left : currentConfiguration.right;
                    var $source = _this.labelWithTooltip(sourceProcess);
                    if (game.hasAbstractions()) {
                        var abstractingSuccGen = _this.gameActivity.getSuccessorGenerator();
                        var $action = Activity.Tooltip.setTooltip(Activity.Tooltip.wrap(actionTransition), Activity.Tooltip.strongSequence(abstractingSuccGen, sourceProcess, game.getLastAction(), choice.targetProcess, _this.gameActivity.getGraph()));
                        var $actionTd = $("<td id='action'></td>").append($action);
                    }
                    else {
                        var $actionTd = $("<td id='action'></td>").append(actionTransition);
                    }
                }
                var $sourceTd = $("<td id='source'></td>").append($source);
                var $targetTd = $("<td id='target'></td>").append(_this.labelWithTooltip(choice.targetProcess));
                // onClick
                $(row).on("click", function (event) {
                    _this.clickChoice(choice, game, isAttack);
                });
                // highlight the edge
                $(row).on("mouseenter", function (event) {
                    //this.highlightChoices(choice, game, isAttack, true, event);
                });
                // remove the highlight
                $(row).on("mouseleave", function (event) {
                    //this.highlightChoices(choice, game, isAttack, false, event);
                });
                row.append($sourceTd, $actionTd, $targetTd);
                _this.$table.append(row);
            });
        };
        Human.prototype.labelWithTooltip = function (process) {
            return Activity.Tooltip.wrapProcess(this.labelFor(process));
        };
        Human.prototype.labelFor = function (process) {
            return this.gameActivity.labelFor(process);
        };
        Human.prototype.highlightChoices = function (choice, game, isAttack, entering, event) {
            var move;
            if (isAttack) {
                move = choice.move === 1 ? 1 /* Left */ : 0 /* Right */; // 1: left, 2: right
            }
            else {
                move = game.getLastMove() === 1 /* Left */ ? 0 /* Right */ : 1 /* Left */; // this is flipped because of defender role
            }
            if (entering) {
                var targetId = $(event.currentTarget).data("targetId");
                if (move === 1 /* Left */) {
                    this.gameActivity.highlightChoices(true, targetId); // highlight the left graph
                }
                else {
                    this.gameActivity.highlightChoices(false, targetId); // highlight the right graph
                }
                $(event.currentTarget).css("background", "rgba(0, 0, 0, 0.07)"); // color the row
            }
            else {
                if (move === 1 /* Left */) {
                    this.gameActivity.removeHighlightChoices(true);
                }
                else {
                    this.gameActivity.removeHighlightChoices(false);
                }
                $(event.currentTarget).css("background", ""); // remove highlight
            }
        };
        Human.prototype.clickChoice = function (choice, game, isAttack) {
            this.$table.empty();
            if (isAttack) {
                var move = choice.move === 1 ? 1 /* Left */ : 0 /* Right */; // 1: left, 2: right
                game.play(this, choice.targetProcess, choice.nextNode, choice.action, move);
            }
            else {
                game.play(this, choice.targetProcess, choice.nextNode);
            }
            this.gameActivity.removeHighlightChoices(true); // remove highlight from both graphs
            this.gameActivity.removeHighlightChoices(false); // remove highlight from both graphs
        };
        Human.prototype.abortPlay = function () {
            this.$table.empty();
        };
        return Human;
    })(Player);
    // such ai
    var Computer = (function (_super) {
        __extends(Computer, _super);
        function Computer(playType) {
            _super.call(this, playType);
        }
        Computer.prototype.abortPlay = function () {
            clearTimeout(this.delayedPlay);
        };
        Computer.prototype.prepareAttack = function (choices, game) {
            var _this = this;
            // select strategy
            if (game.isCurrentWinner(this))
                this.delayedPlay = setTimeout(function () { return _this.winningAttack(choices, game); }, Computer.Delay);
            else
                this.delayedPlay = setTimeout(function () { return _this.losingAttack(choices, game); }, Computer.Delay);
        };
        Computer.prototype.prepareDefend = function (choices, game) {
            var _this = this;
            // select strategy
            if (game.isCurrentWinner(this))
                this.delayedPlay = setTimeout(function () { return _this.winningDefend(choices, game); }, Computer.Delay);
            else
                this.delayedPlay = setTimeout(function () { return _this.losingDefend(choices, game); }, Computer.Delay);
        };
        Computer.prototype.losingAttack = function (choices, game) {
            var tryHardChoice = game.getTryHardAttack(choices);
            var move = tryHardChoice.move == 1 ? 1 /* Left */ : 0 /* Right */; // 1: left, 2: right
            game.play(this, tryHardChoice.targetProcess, tryHardChoice.nextNode, tryHardChoice.action, move);
        };
        Computer.prototype.winningAttack = function (choices, game) {
            var choice = game.getBestWinningAttack(choices);
            var move = choice.move == 1 ? 1 /* Left */ : 0 /* Right */; // 1: left, 2: right
            game.play(this, choice.targetProcess, choice.nextNode, choice.action, move);
        };
        Computer.prototype.losingDefend = function (choices, game) {
            var tryHardChoice = game.getTryHardDefend(choices);
            game.play(this, tryHardChoice.targetProcess, tryHardChoice.nextNode);
        };
        Computer.prototype.winningDefend = function (choices, game) {
            var choice = game.getWinningDefend(choices);
            game.play(this, choice.targetProcess, choice.nextNode);
        };
        Computer.Delay = 1500;
        return Computer;
    })(Player);
    var GameLog = (function (_super) {
        __extends(GameLog, _super);
        function GameLog(time, gameActivity) {
            _super.call(this);
            this.time = time;
            this.gameActivity = gameActivity;
            this.$log = $("#game-log");
            this.$log.empty();
        }
        GameLog.prototype.println = function (line, wrapper) {
            if (wrapper) {
                this.$log.append($(wrapper).append(line));
            }
            else {
                this.$log.append(line);
            }
            this.$log.scrollTop(this.$log[0].scrollHeight);
            ;
        };
        GameLog.prototype.render = function (template, context) {
            for (var i in context) {
                var current = context[i].text;
                if (context[i].tag) {
                    current = $(context[i].tag).append(current);
                    for (var j in context[i].attr) {
                        current.attr(context[i].attr[j].name, context[i].attr[j].value);
                    }
                    template = template.replace("{" + i + "}", current[0].outerHTML);
                }
                else {
                    template = template.replace("{" + i + "}", current);
                }
            }
            return template;
        };
        GameLog.prototype.removeLastPrompt = function () {
            this.$log.find(".game-prompt").last().remove();
        };
        GameLog.prototype.printRound = function (round, configuration) {
            this.println("Round " + round, "<h4 class='game-round'>");
            this.printConfiguration(configuration);
        };
        GameLog.prototype.printPrepareAttack = function () {
            this.println("Pick a transition on the left or the right.", "<p class='game-prompt'>");
        };
        GameLog.prototype.printPrepareDefend = function (lastMove) {
            this.println("Pick a transition on the " + ((lastMove === 1 /* Left */) ? "right." : "left."), "<p class='game-prompt'>");
        };
        GameLog.prototype.printConfiguration = function (configuration) {
            var template = "Current configuration: ({1}, {2}).";
            var context = {
                1: { text: this.labelFor(configuration.left), tag: "<span>", attr: [{ name: "class", value: "ccs-tooltip-process" }] },
                2: { text: this.labelFor(configuration.right), tag: "<span>", attr: [{ name: "class", value: "ccs-tooltip-process" }] }
            };
            this.println(this.render(template, context), "<p>");
        };
        GameLog.prototype.printPlay = function (player, action, source, destination, move, game) {
            var template = "{1} played {2} {3} {4} on the {5}.";
            var actionTransition;
            var actionContext;
            if (player.getPlayType() === 0 /* Attacker */ || !game.hasAbstractions()) {
                actionTransition = game.getTransitionStr(true, action.toString(true));
                actionContext = { text: actionTransition, tag: "<span>", attr: [{ name: "class", value: "monospace" }] };
            }
            else {
                actionTransition = game.getTransitionStr(false, action.toString(true));
                actionContext = { text: actionTransition, tag: "<span>", attr: [{ name: "class", value: "ccs-tooltip-data" }, { name: "data-tooltip", value: Activity.Tooltip.strongSequence(this.gameActivity.getSuccessorGenerator(), source, action, destination, this.gameActivity.getGraph()) }] };
            }
            var context = {
                1: { text: (player instanceof Computer) ? player.playTypeStr() : "You (" + player.playTypeStr(true) + ")" },
                2: { text: this.labelFor(source), tag: "<span>", attr: [{ name: "class", value: "ccs-tooltip-process" }] },
                3: actionContext,
                4: { text: this.labelFor(destination), tag: "<span>", attr: [{ name: "class", value: "ccs-tooltip-process" }] },
                5: { text: (move === 1 /* Left */) ? "left" : "right" }
            };
            if (player instanceof Human) {
                this.removeLastPrompt();
            }
            this.println(this.render(template, context), "<p>");
        };
        GameLog.prototype.printWinner = function (winner) {
            var template = "{1} no available transitions. You {2}!";
            var context = {
                1: { text: (winner instanceof Computer) ? "You ({3}) have" : (winner.getPlayType() === 0 /* Attacker */) ? "Defender has" : "Attacker has" },
                2: { text: (winner instanceof Computer) ? "lose" : "win" },
                3: { text: (winner.getPlayType() === 0 /* Attacker */) ? "defender" : "attacker" }
            };
            this.println(this.render(template, context), "<p class='outro'>");
        };
        GameLog.prototype.printCycleWinner = function (winner) {
            var template = "A cycle has been detected. {1}!";
            var context = {
                1: { text: (winner instanceof Human) ? "You (" + winner.playTypeStr(true) + ") win" : "You ({2}) lose" },
                2: { text: (winner.getPlayType() === 0 /* Attacker */) ? "defender" : "attacker" }
            };
            this.println(this.render(template, context), "<p class='outro'>");
        };
        GameLog.prototype.printWinnerChanged = function (winner) {
            var you = winner.getPlayType() === 0 /* Attacker */ ? "defender" : "attacker";
            this.println("You (" + you + ") made a bad move. " + winner.playTypeStr() + " now has a winning strategy.", "<p>");
        };
        GameLog.prototype.capitalize = function (str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        };
        GameLog.prototype.labelFor = function (process) {
            return this.gameActivity.labelFor(process);
        };
        GameLog.prototype.printIntro = function (gameType, configuration, winner, attacker) {
            this.abstract();
        };
        return GameLog;
    })(Abstract);
    var BisimulationGameLog = (function (_super) {
        __extends(BisimulationGameLog, _super);
        function BisimulationGameLog(time, gameActivity) {
            _super.call(this, time, gameActivity);
        }
        BisimulationGameLog.prototype.printIntro = function (gameType, configuration, winner, attacker) {
            var template = "You are playing {1} in {2} {3} bisimulation game.";
            var context = {
                1: { text: (attacker instanceof Computer ? "defender" : "attacker") },
                2: { text: gameType },
                3: { text: this.time }
            };
            this.println(this.render(template, context), "<p class='intro'>");
            if (winner instanceof Human) {
                this.println("You have a winning strategy.", "<p class='intro'>");
            }
            else {
                this.println(winner.playTypeStr() + " has a winning strategy. You are going to lose.", "<p class='intro'>");
            }
        };
        return BisimulationGameLog;
    })(GameLog);
    var SimulationGameLog = (function (_super) {
        __extends(SimulationGameLog, _super);
        function SimulationGameLog(time, gameActivity) {
            _super.call(this, time, gameActivity);
        }
        SimulationGameLog.prototype.printIntro = function (gameType, configuration, winner, attacker) {
            var template = "You are playing {1} in {2} {3} simulation game.";
            var context = {
                1: { text: (attacker instanceof Computer ? "defender" : "attacker") },
                2: { text: gameType },
                3: { text: this.time }
            };
            this.println(this.render(template, context), "<p class='intro'>");
            if (winner instanceof Human) {
                this.println("You have a winning strategy.", "<p class='intro'>");
            }
            else {
                this.println(winner.playTypeStr() + " has a winning strategy. You are going to lose.", "<p class='intro'>");
            }
        };
        SimulationGameLog.prototype.printPrepareAttack = function () {
            this.println("Pick a transition on the left.", "<p class='game-prompt'>");
        };
        SimulationGameLog.prototype.printPrepareDefend = function (lastMove) {
            this.println("Pick a transition on the right.", "<p class='game-prompt'>");
        };
        return SimulationGameLog;
    })(GameLog);
})(Activity || (Activity = {}));
/// <reference path="../../../lib/jquery.d.ts" />
/// <reference path="../../../lib/ccs.d.ts" />
/// <reference path="../../../lib/util.d.ts" />
/// <reference path="../gui.ts" />
/// <reference path="../arbor/arbor.ts" />
/// <reference path="../arbor/renderer.ts" />
var GUI;
(function (GUI) {
    var Widget;
    (function (Widget) {
        function clamp(val, min, max) {
            return Math.max(Math.min(val, max), min);
        }
        var ZoomableProcessExplorer = (function () {
            function ZoomableProcessExplorer() {
                var _this = this;
                this.zoomMax = 3;
                this.zoomMin = 1;
                this.zoomStep = 0.2;
                this.zoomDefault = 1;
                this.isFrozen = false;
                this.root = document.createElement("div");
                this.canvasContainer = document.createElement("div");
                this.canvas = document.createElement("canvas");
                this.hoverTimeoutListener = null;
                this.hoverLeaveListener = null;
                this.succGen = null;
                this.graph = null;
                this.currentZoom = 1;
                this.expandDepth = 5;
                $(this.root).addClass("widget-zoom-process-explorer");
                $(this.canvasContainer).addClass("canvas-container").attr("id", "hml-canvas-container");
                this.setupRange();
                this.setupFreezeBtn();
                this.setupDepthInput();
                $(this.canvasContainer).append(this.canvas);
                var $buttons = $('<span class="input-group-btn"></span>').append(this.$freezeBtn);
                var $rightInputs = $('<div class="input-group toolbar"></div>').append(this.$depthInput, $buttons);
                var $toolBarDiv = $('<div class="relative"></div>').append(this.$zoomRange, $rightInputs, this.canvasContainer);
                $(this.root).append($toolBarDiv);
                this.renderer = new Renderer(this.canvas);
                this.graphUI = new GUI.ArborGraph(this.renderer);
                this.graphUI.bindCanvasEvents();
                var cancelHoverTimeout = function () {
                    if (_this.hoverTimeout) {
                        clearTimeout(_this.hoverTimeout);
                    }
                };
                this.graphUI.setHoverOnListener(function (processId) {
                    cancelHoverTimeout();
                    if (_this.hoverTimeoutListener != null) {
                        _this.hoverTimeout = setTimeout(function () {
                            if (_this.hoverTimeoutListener) {
                                _this.hoverTimeoutListener.call(_this, processId, _this.graphUI.getPosition(processId));
                            }
                        }, _this.hoverTimeoutDelay);
                    }
                });
                this.graphUI.setHoverOutListener(function () {
                    cancelHoverTimeout();
                    if (_this.hoverLeaveListener != null) {
                        _this.hoverLeaveListener.call(_this);
                    }
                });
            }
            ZoomableProcessExplorer.prototype.getGraphUI = function () {
                return this.graphUI;
            };
            ZoomableProcessExplorer.prototype.getRootElement = function () {
                return this.root;
            };
            ZoomableProcessExplorer.prototype.getCanvasContainer = function () {
                return this.canvasContainer;
            };
            ZoomableProcessExplorer.prototype.setExpandDepth = function (depth) {
                if (typeof depth === 'string') {
                    depth = parseInt(depth, 10);
                }
                if (depth) {
                    depth = Math.round(depth);
                }
                if (!depth || depth < 1 || depth > 20) {
                    depth = 10;
                }
                if (depth !== this.expandDepth) {
                    this.expandDepth = depth;
                    this.clear();
                    this.exploreProcess(this.getSelectedProcess());
                }
                this.$depthInput.val(depth);
            };
            ZoomableProcessExplorer.prototype.setZoom = function (zoomFactor) {
                var $canvas = $(this.canvas), $root = $(this.root), $canvasContainer = $(this.canvasContainer), canvasWidth, canvasHeight;
                zoomFactor = clamp(zoomFactor, this.zoomMin, this.zoomMax);
                //TODO
                //By enlarging the canvas but not its containing element we zoom in.
                canvasWidth = $canvasContainer.width() * zoomFactor;
                canvasHeight = $canvasContainer.height() * zoomFactor;
                this.canvas.width = canvasWidth;
                this.canvas.height = canvasHeight;
                this.renderer.resize(canvasWidth, canvasHeight);
                if (zoomFactor > 1) {
                    $canvasContainer.css("overflow", "auto");
                    this.focusOnProcess(this.succGen.getProcessById(this.graphUI.getSelected()));
                }
                else {
                    $canvasContainer.css("overflow", "hidden");
                }
            };
            /* (un)freeze the graph depending on the lock, called from its parent */
            ZoomableProcessExplorer.prototype.clearFreeze = function () {
                this.toggleFreeze(this.$freezeBtn.data("frozen"));
            };
            ZoomableProcessExplorer.prototype.toggleFreeze = function (freeze) {
                if (freeze) {
                    this.graphUI.freeze();
                    this.$freezeBtn.find("i").removeClass("fa-unlock-alt").addClass("fa-lock");
                }
                else {
                    this.graphUI.unfreeze();
                    this.$freezeBtn.find("i").removeClass("fa-lock").addClass("fa-unlock-alt");
                }
                //TODO Handle other affected things.
                this.$freezeBtn.data("frozen", freeze);
            };
            ZoomableProcessExplorer.prototype.getSelectedProcess = function () {
                return this.succGen.getProcessById(this.graphUI.getSelected());
            };
            ZoomableProcessExplorer.prototype.resize = function (width, height) {
                var $root = $(this.root);
                var $canvasContainer = $(this.canvasContainer);
                height = Math.max(265, height);
                //$root.width(width); // they must be the same size?
                $root.height(height);
                //$canvasContainer.width(width); // they must be the same size?
                $canvasContainer.height(height);
                //Fix zoom
                this.setZoom(this.currentZoom);
            };
            ZoomableProcessExplorer.prototype.exploreProcess = function (process) {
                if (!this.succGen)
                    throw "Invalid operation: succGen must be set first";
                this.drawProcessInternal(process, this.expandDepth);
            };
            ZoomableProcessExplorer.prototype.focusOnProcess = function (process) {
                var position = this.graphUI.getPosition(process.id.toString()), $canvasContainer = $(this.canvasContainer);
                if (position) {
                    $canvasContainer.scrollLeft(position.x - ($canvasContainer.width() / 2));
                    $canvasContainer.scrollTop(position.y - ($canvasContainer.height() / 2));
                }
            };
            ZoomableProcessExplorer.prototype.clear = function () {
                this.graphUI.clearAll();
            };
            ZoomableProcessExplorer.prototype.setOnHoverTimeout = function (callback, msTimeout) {
                this.hoverTimeoutDelay = msTimeout;
                this.hoverTimeoutListener = callback;
            };
            ZoomableProcessExplorer.prototype.setOnHoverLeave = function (callback) {
                this.hoverLeaveListener = callback;
            };
            ZoomableProcessExplorer.prototype.drawProcessInternal = function (process, expandDepth) {
                var _this = this;
                this.showProcess(process);
                var allTransitions = CCS.expandBFS(process, this.succGen, expandDepth);
                for (var fromId in allTransitions) {
                    var fromProcess = this.succGen.getProcessById(fromId);
                    this.showProcessAsExplored(fromProcess);
                    var groupedByTargetProcessId = ArrayUtil.groupBy(allTransitions[fromId].toArray(), function (t) { return t.targetProcess.id; });
                    Object.keys(groupedByTargetProcessId).forEach(function (strProcId) {
                        var group = groupedByTargetProcessId[strProcId], data = group.map(function (t) {
                            return { label: t.action.toString(false) };
                        }), numId = strProcId;
                        _this.showProcess(_this.succGen.getProcessById(numId));
                        _this.graphUI.showTransitions(fromProcess.id, numId, data);
                    });
                }
                this.graphUI.setSelected(process.id.toString());
            };
            ZoomableProcessExplorer.prototype.drawProcess = function (process) {
                this.drawProcessInternal(process, 1);
            };
            ZoomableProcessExplorer.prototype.showProcessAsExplored = function (process) {
                this.graphUI.showProcess(process.id, { label: this.labelFor(process), status: "expanded" });
            };
            ZoomableProcessExplorer.prototype.showProcess = function (process) {
                //Check already expanded to prevent resetting expand status
                if (!process || this.graphUI.getProcessDataObject(process.id))
                    return;
                this.graphUI.showProcess(process.id, { label: this.labelFor(process), status: "unexpanded" });
            };
            ZoomableProcessExplorer.prototype.labelFor = function (process) {
                return this.graph.getLabel(process);
            };
            ZoomableProcessExplorer.prototype.setupRange = function () {
                var _this = this;
                var $range = $("<input></input>");
                $range.prop("type", "range");
                $range.prop("min", this.zoomMin);
                $range.prop("max", this.zoomMax);
                $range.prop("step", this.zoomStep);
                $range.prop("value", this.zoomDefault);
                this.$zoomRange = $range;
                var changeEvent = (navigator.userAgent.indexOf("MSIE ") > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)) ? "change" : "input";
                this.$zoomRange.on(changeEvent, function () {
                    _this.currentZoom = _this.$zoomRange.val();
                    _this.setZoom(_this.currentZoom);
                });
            };
            ZoomableProcessExplorer.prototype.setupFreezeBtn = function () {
                var _this = this;
                var $button = $('<button class="btn btn-default"></button>'), $lock = $('<i class="fa fa-lg fa-unlock-alt"></i>');
                $button.data("frozen", false);
                $button.append($lock);
                this.$freezeBtn = $button;
                this.$freezeBtn.on("click", function () { return _this.toggleFreeze(!_this.$freezeBtn.data("frozen")); });
            };
            ZoomableProcessExplorer.prototype.setupDepthInput = function () {
                var _this = this;
                var $input = $('<input class="form-control depth-control" value="5" type="text" data-tooltip="depth" />');
                $input.on("change", function () { return _this.setExpandDepth($input.val()); });
                this.$depthInput = $input;
            };
            return ZoomableProcessExplorer;
        })();
        Widget.ZoomableProcessExplorer = ZoomableProcessExplorer;
    })(Widget = GUI.Widget || (GUI.Widget = {}));
})(GUI || (GUI = {}));
/// <reference path="../../../lib/jquery.d.ts" />
/// <reference path="../../../lib/ccs.d.ts" />
/// <reference path="../../activity/tooltip.ts" />
var GUI;
(function (GUI) {
    var Widget;
    (function (Widget) {
        var TransitionTable = (function () {
            function TransitionTable() {
                this.table = document.createElement("table");
                this.body = document.createElement("tbody");
                this.transitions = [];
                this.onSelectListener = null;
                this.onHoverEnterListener = null;
                this.onHoverLeaveListener = null;
                var $table = $(this.table);
                $table.addClass("widget-transition-table table table-responsive table-striped table-condensed table-hover no-highlight");
                $table.append('<thead><tr><th class="narrow">Source</th><th class="narrow">Action</th><th class="narrow">Target</th></tr></thead>');
                $table.append(this.body);
                $(this.body).on("click", "tr", this.onRowClicked.bind(this)).on("mouseenter", "tr", this.onRowHoverEnter.bind(this)).on("mouseleave", "tr", this.onRowHoverLeave.bind(this));
            }
            TransitionTable.prototype.setTransitions = function (source, transitions, abstractingSuccGen) {
                var _this = this;
                var $body = $(this.body);
                $body.empty();
                this.transitions = transitions.slice(0);
                this.transitions.forEach(function (transition, index) {
                    var $action;
                    var $row = $("<tr></tr>"), $source = $("<td></td>").append(_this.labelWithTooltip(source)), $target = $("<td></td>").append(_this.labelWithTooltip(transition.targetProcess));
                    if (abstractingSuccGen instanceof Traverse.AbstractingSuccessorGenerator) {
                        // Add strict path to the tooltip when it is a weak transition
                        var actionTransition = "=" + transition.action.toString() + "=>";
                        $action = $("<td></td>").append(Activity.Tooltip.setTooltip(Activity.Tooltip.wrap(actionTransition), Activity.Tooltip.strongSequence(abstractingSuccGen, source, transition.action, transition.targetProcess, _this.graph)));
                    }
                    else {
                        $action = $("<td></td>").append("-" + transition.action.toString() + "->");
                    }
                    $row.append($source, $action, $target);
                    $row.data("data-transition-idx", index);
                    $body.append($row);
                });
            };
            TransitionTable.prototype.getRootElement = function () {
                return this.table;
            };
            TransitionTable.prototype.labelWithTooltip = function (process) {
                return Activity.Tooltip.wrapProcess(this.labelFor(process));
            };
            TransitionTable.prototype.labelFor = function (process) {
                return this.graph.getLabel(process);
            };
            TransitionTable.prototype.transitionFromDelegateEvent = function (event) {
                var idx = $(event.currentTarget).data("data-transition-idx");
                return this.transitions[idx];
            };
            TransitionTable.prototype.onRowClicked = function (event) {
                if (this.onSelectListener)
                    this.onSelectListener(this.transitionFromDelegateEvent(event));
            };
            TransitionTable.prototype.onRowHoverEnter = function (event) {
                if (this.onHoverEnterListener)
                    this.onHoverEnterListener(this.transitionFromDelegateEvent(event));
            };
            TransitionTable.prototype.onRowHoverLeave = function (event) {
                if (this.onHoverLeaveListener)
                    this.onHoverLeaveListener(this.transitionFromDelegateEvent(event));
            };
            return TransitionTable;
        })();
        Widget.TransitionTable = TransitionTable;
    })(Widget = GUI.Widget || (GUI.Widget = {}));
})(GUI || (GUI = {}));
/// <reference path="../../../lib/jquery.d.ts" />
/// <reference path="../../../lib/ccs.d.ts" />
var GUI;
(function (GUI) {
    var Widget;
    (function (Widget) {
        var FormulaSelector = (function () {
            function FormulaSelector() {
                this.root = document.createElement("div");
                this.table = document.createElement("table");
                this.body = document.createElement("tbody");
                this.paragraph = document.createElement("p");
                this.onSelectListener = null;
                var $table = $(this.table);
                var $body = $(this.body);
                $table.attr("id", "hml-selector-body");
                $table.addClass("widget-transition-table table table-responsive table-striped table-condensed table-hover no-highlight");
                $table.append('<thead><tr><th class="narrow">Subformula</th></tr></thead>');
                $table.append(this.body);
                $body.attr("id", "hml-selector-body");
                /*Click listeners on each subformula*/
                $body.on("click", "tr", this.onSubformulaClick.bind(this));
            }
            FormulaSelector.prototype.getRootElement = function () {
                return this.table;
            };
            FormulaSelector.prototype.setFormulaSet = function (hmlFormulaSet) {
                this.currentHmlSet = hmlFormulaSet;
            };
            FormulaSelector.prototype.setFormula = function (hmlSubFormulas) {
                var $body = $(this.body);
                $body.empty();
                if (hmlSubFormulas) {
                    this.currentSubFormulas = hmlSubFormulas.slice(0);
                    this.currentSubFormulas.forEach(function (subFormula, index) {
                        var $row = $("<tr></tr>"), hmlNotationVisitor = new Traverse.HMLNotationVisitor(false, true, false), $subFormulaTd = $("<td></td>").append(hmlNotationVisitor.visit(subFormula));
                        $row.append($subFormulaTd);
                        $row.data("data-transition-idx", index);
                        $body.append($row);
                    });
                }
            };
            FormulaSelector.prototype.subformulaFromDelegateEvent = function (event) {
                // var id = parseInt($(event.currentTarget).data("data-subformula-id"));
                // var hmlExtractor = new HMLSubFormulaExtractor(this.currentHmlSet);
                // var subFormula : HML.Formula = hmlExtractor.getSubFormulaWithId(this.currentHml, id);
                var idx = $(event.currentTarget).data("data-transition-idx");
                return this.currentSubFormulas[idx];
            };
            FormulaSelector.prototype.onSubformulaClick = function (event) {
                if (this.onSelectListener) {
                    this.onSelectListener(this.subformulaFromDelegateEvent(event));
                }
            };
            return FormulaSelector;
        })();
        Widget.FormulaSelector = FormulaSelector;
    })(Widget = GUI.Widget || (GUI.Widget = {}));
})(GUI || (GUI = {}));
/// <reference path="../../../lib/jquery.d.ts" />
/// <reference path="../../../lib/ccs.d.ts" />
/// <reference path="../../activity/tooltip.ts" />
var GUI;
(function (GUI) {
    var Widget;
    (function (Widget) {
        var GameLog = (function () {
            /*
                Things to consider
                    Print intro
                        You are playing $player$ in $weak/strong$ HML game.
                        You have a winning strategy/You will lose.
                    Print a "Play"
                        Round X
                            Current configuration: (Process, Formula).
                            (Attk)Attacker played Spec -walk-> Spec.
                            (Def)You played 20 =walk=> 23.
                    Print winner and why
            */
            function GameLog() {
                this.log = document.createElement("div");
                this.round = 0;
                var $log = $(this.log);
                $log.attr("id", "hml-game-log");
            }
            GameLog.prototype.getRootElement = function () {
                return this.log;
            };
            GameLog.prototype.reset = function () {
                var $log = $(this.log);
                $log.empty();
                this.round = 0;
            };
            GameLog.prototype.deleteTempRows = function () {
                var $log = $(this.log);
                var $temprows = $log.find("#temprow");
                $temprows.remove();
            };
            GameLog.prototype.newRound = function () {
                var $log = $(this.log);
                var $round = $("<h4></h4>").append("Round " + (++this.round).toString()).addClass("hml-game-round");
                $log.append($round);
            };
            GameLog.prototype.printToGameLog = function (gameLogObject) {
                var $log = $(this.log), logStr = this.render(gameLogObject);
                if (gameLogObject.getNewRound()) {
                    this.newRound();
                }
                $log.append(logStr);
                // $log.scrollTop($log[0].scrollHeight);
            };
            GameLog.prototype.render = function (gameLogObject) {
                var result = gameLogObject.getTemplate();
                var context = gameLogObject.getContext();
                context.forEach(function (element, index) {
                    var current = element.text;
                    if (element.tag) {
                        current = $(element.tag).append(current);
                        for (var j in element.attr) {
                            current.attr(element.attr[j].name, element.attr[j].value);
                        }
                        result = result.replace("{" + index + "}", current[0].outerHTML);
                    }
                    else {
                        result = result.replace("{" + index + "}", current);
                    }
                });
                var wrapper = gameLogObject.getWrapper();
                if (wrapper) {
                    var $temp = $(wrapper.tag);
                    if (wrapper.attr) {
                        wrapper.attr.forEach(function (elem) {
                            $temp.attr(elem.name, elem.value);
                        });
                    }
                    result = $temp.append(result)[0].outerHTML;
                }
                return result;
            };
            return GameLog;
        })();
        Widget.GameLog = GameLog;
        ;
        var GameLogObject = (function () {
            function GameLogObject(graph) {
                this.graph = graph;
                this.template = "";
                this.context = [];
                this.wrapper = null;
                this.isNewRound = false;
            }
            GameLogObject.prototype.addLabel = function (row, index) {
                if (index) {
                    this.context.splice(index, 0, row);
                }
                else {
                    this.context.push(row);
                }
            };
            GameLogObject.prototype.setNewRound = function (isNewRound) {
                this.isNewRound = isNewRound;
            };
            GameLogObject.prototype.getNewRound = function () {
                return this.isNewRound;
            };
            GameLogObject.prototype.addWrapper = function (wrapper) {
                this.wrapper = wrapper;
            };
            GameLogObject.prototype.getWrapper = function () {
                return this.wrapper;
            };
            GameLogObject.prototype.setTemplate = function (template) {
                this.template = template;
            };
            GameLogObject.prototype.getTemplate = function () {
                return this.template;
            };
            GameLogObject.prototype.getContext = function () {
                return this.context;
            };
            GameLogObject.prototype.labelForProcess = function (process) {
                return this.graph.getLabel(process);
            };
            GameLogObject.prototype.labelForFormula = function (formula) {
                var hmlNotationVisitor = new Traverse.HMLNotationVisitor(false, true, true);
                return hmlNotationVisitor.visit(formula);
            };
            return GameLogObject;
        })();
        Widget.GameLogObject = GameLogObject;
    })(Widget = GUI.Widget || (GUI.Widget = {}));
})(GUI || (GUI = {}));
/// <reference path="../../lib/util.d.ts" />
/// <reference path="../gui/project.ts" />
/// <reference path="../gui/gui.ts" />
/// <reference path="../gui/widget/zoomable-process-explorer.ts" />
/// <reference path="../gui/widget/transition-table.ts" />
/// <reference path="../gui/widget/hmlformula-selector.ts" />
/// <reference path="../gui/widget/gamelog-widget.ts" />
/// <reference path="../gui/arbor/arbor.ts" />
/// <reference path="../gui/arbor/renderer.ts" />
/// <reference path="activity.ts" />
/// <reference path="fullscreen.ts" />
/// <reference path="tooltip.ts" />
var Activity;
(function (Activity) {
    var dg = DependencyGraph;
    var HmlGame = (function (_super) {
        __extends(HmlGame, _super);
        function HmlGame(container, button, activeToggle) {
            _super.call(this, container, button, activeToggle);
            this.currentSubActivity = null;
            this.hmlGameActivity = new HmlGameActivity("#hml-game-main");
        }
        HmlGame.prototype.onShow = function (configuration) {
            // this.addDefaults(configuration);
            var type = "strong";
            if (configuration && configuration.type) {
                type = configuration.type;
            }
            var switchTo = this.hmlGameActivity;
            if (this.currentSubActivity !== switchTo) {
            }
            this.currentSubActivity = switchTo;
            //Now have the right activity
            configuration = configuration || this.currentSubActivity.getDefaultConfiguration();
            this.setOptionsDom(this.currentSubActivity);
            this.currentSubActivity.onShow(configuration);
        };
        HmlGame.prototype.setOptionsDom = function (subActivity) {
            var injecter = $("#hml-game-inject-options")[0];
            while (injecter.firstChild) {
                injecter.removeChild(injecter.firstChild);
            }
            injecter.appendChild(subActivity.getUIDom());
        };
        HmlGame.prototype.onHide = function () {
            var subActivity = this.currentSubActivity;
            if (subActivity) {
                subActivity.onHide();
            }
        };
        HmlGame.prototype.checkPreconditions = function () {
            var project = Project.getInstance();
            var graph = project.getGraph();
            if (!graph) {
                this.showMessageBox("Syntax Error", "Your program contains one or more syntax errors.");
                return false;
            }
            else if (graph.getNamedProcesses().length === 0) {
                this.showMessageBox("No Named Processes", "There must be at least one named process in the program.");
                return false;
            }
            var hmlFormulaSets = project.getFormulaSetsForProperties();
            if (Object.keys(hmlFormulaSets).length === 0) {
                this.showMessageBox("No HML Formula Defined", "There must be at least one HML formula defined.");
                return false;
            }
            return true;
        };
        return HmlGame;
    })(Activity.Activity);
    Activity.HmlGame = HmlGame;
    var HmlGameActivity = (function () {
        /* Todo
            How to ensure leftProcess and right formula valid. Or just not draw until selected?
            How to ensure valid configuration
            Detect ccs changes
            Create options
            Add event handling options
            Create a new selector for hml selections(dis/con-junction)
            be able to switch between the transition table and hml-selector
            Only allow valid transitions.
        */
        function HmlGameActivity(container) {
            var _this = this;
            this.processExplorer = new GUI.Widget.ZoomableProcessExplorer();
            this.transitionTable = new GUI.Widget.TransitionTable();
            this.hmlselector = new GUI.Widget.FormulaSelector();
            this.gamelog = new GUI.Widget.GameLog();
            this.tooltipAnchor = document.createElement('div');
            // private currentProcess : CCS.Process = null;
            // private currentFormula : HML.Formula = null
            // private currentFormulaSet : HML.FormulaSet = null;
            this.hmlGameLogic = null;
            this.configuration = {
                processName: undefined,
                propertyId: undefined,
                formulaId: undefined,
            };
            this.human = null;
            this.computer = null;
            this.$container = $(container);
            this.project = Project.getInstance();
            this.constructOptionsDom();
            this.$processList.on("change", function () {
                _this.loadGuiIntoConfig(_this.configuration);
                _this.configure(_this.configuration);
            });
            this.$formulaList.on("change", function () {
                _this.loadGuiIntoConfig(_this.configuration);
                _this.configure(_this.configuration);
            });
            $(this.tooltipAnchor).css("position", "absolute");
            /*Explorer*/
            $("#hml-game-main").append(this.processExplorer.getRootElement(), this.tooltipAnchor);
            /*Gamelog*/
            $("#hml-game-status-left").append(this.gamelog.getRootElement());
            /* Assign the restart button */
            this.$restartBtn = $("#hml-game-restart");
            this.$restartBtn.on("click", function () { return _this.configure(_this.configuration); });
            this.fullscreen = new Activity.Fullscreen($("#hml-game-container")[0], $("#hml-game-fullscreen"), function () { return _this.resize(); });
            this.transitionTable.onSelectListener = (function (transition) {
                _this.hmlGameLogic.selectedTransition(transition, function (updateTransitions) {
                    updateTransitions.forEach(function (t) { return _this.processExplorer.drawProcess(t.targetProcess); });
                    _this.processExplorer.exploreProcess(updateTransitions[updateTransitions.length - 1].targetProcess);
                    _this.processExplorer.focusOnProcess(updateTransitions[updateTransitions.length - 1].targetProcess);
                });
                _this.refresh();
            });
            this.hmlselector.onSelectListener = (function (hmlSubFormula) {
                _this.hmlGameLogic.selectedFormula(hmlSubFormula);
                _this.refresh();
            });
            // when the ccs changes, set a flag, so when switching back to the activity we grab the new graph.
            $(document).on("ccs-changed", function () { return _this.CCSChanged = true; });
            this.tooltip = new Activity.ProcessTooltip($("#hml-game-status"));
            new Activity.DataTooltip($("#hml-game-log")); // no need to save instance
            //Set tooltips
            this.processExplorer.setOnHoverTimeout(function (processId, position) {
                var $tooltipAnchor = $(_this.tooltipAnchor);
                var $container = $(_this.processExplorer.getCanvasContainer());
                $tooltipAnchor.css("left", position.x + $container.offset().left);
                $tooltipAnchor.css("top", position.y + $container.offset().top - 10);
                $tooltipAnchor.tooltip({ title: _this.tooltip.ccsNotationForProcessId(processId), html: true });
                $tooltipAnchor.tooltip("show");
            }, 750);
            this.processExplorer.setOnHoverLeave(function () {
                $(_this.tooltipAnchor).tooltip("destroy");
            });
        }
        HmlGameActivity.prototype.onShow = function (configuration) {
            var _this = this;
            $(window).on("resize", function () { return _this.resize(); });
            this.fullscreen.onShow();
            this.resize();
            this.formulaSets = this.project.getFormulaSetsForProperties();
            var configIsSame = function (leftConfig, rightConfig) {
                for (var prop in leftConfig) {
                    if (leftConfig[prop] != rightConfig[prop]) {
                        return false;
                    }
                    return true;
                }
            };
            if (this.CCSChanged || configuration.type != "default" || configIsSame(this.configuration, configuration) || this.configuration === null) {
                // if either the CCS has changed, the configuration given is not the default one,
                // or this.configuration has not yet been initialized, then re-configure everything.
                this.CCSChanged = false;
                // this.tooltip.setGraph(Main.getGraph().graph);
                this.configure(configuration);
            }
            this.processExplorer.clearFreeze(); // (un)freeze the graph depending on the lock
        };
        HmlGameActivity.prototype.onHide = function () {
            $(window).off("resize");
            this.fullscreen.onHide();
            this.processExplorer.getGraphUI().freeze();
        };
        HmlGameActivity.prototype.constructOptionsDom = function () {
            var domString = '' + '<select id="hml-game-process" class="form-control"></select>' + '<div class="turnstile">&#8872;</div>' + '<select id="hml-game-formula" class="form-control"></select>';
            // '<div class="btn-group" data-toggle="buttons">' +
            //     '<label class="btn btn-default">' +
            //         '<input name="player-type" value="attacker" type="radio"> Attacker' +
            //     '</label>' +
            //     '<label class="btn btn-default active">' +
            //         '<input name="player-type" value="defender" type="radio" checked> Defender' +
            //     '</label>' +
            // '</div>';
            var optionsContainer = document.createElement("div");
            optionsContainer.innerHTML = domString;
            this.optionsDom = optionsContainer;
            this.$processList = $(optionsContainer).find("#hml-game-process");
            this.$formulaList = $(optionsContainer).find("#hml-game-formula");
        };
        HmlGameActivity.prototype.getUIDom = function () {
            /*Return the HTML for a HML-Game options*/
            return this.optionsDom;
        };
        HmlGameActivity.prototype.getDefaultConfiguration = function () {
            /*Return a default configurations*/
            var configuration = Object.create(null);
            var formulaSets = this.project.getFormulaSetsForProperties();
            /*configuration.strongSuccGen = this.getSuccGenerator("strong");
            configuration.weakSuccGen = this.getSuccGenerator("weak");*/
            configuration.processName = this.getNamedProcessList()[0];
            configuration.propertyId = Object.keys(formulaSets)[0]; //return the first formulaset
            // configuration.formulaSetIndex = this.getSelectedFormulaSetIndex() >= 0 ? this.getSelectedFormulaSetIndex() : 0;
            configuration.formulaId = formulaSets[configuration.propertyId].getTopFormula().id;
            configuration.type = "default";
            return configuration;
        };
        HmlGameActivity.prototype.getProcessListValue = function () {
            /*Returns the value from the processlist*/
            return this.$processList.val();
        };
        HmlGameActivity.prototype.getSelectedFormulaSetId = function () {
            /*Returns the value(the index of the formulaSet in this.getFormulaSetList()) from the formulalist*/
            return parseInt(this.$formulaList.val());
        };
        HmlGameActivity.prototype.getSelectedFormulaSet = function () {
            return this.formulaSets[this.getSelectedFormulaSetId()];
        };
        HmlGameActivity.prototype.getNamedProcessList = function () {
            /*Returns the named processes defined in the CCS-program*/
            var namedProcesses = this.project.getGraph().getNamedProcesses().slice(0);
            namedProcesses.reverse();
            return namedProcesses;
        };
        HmlGameActivity.prototype.setFormulas = function (hmlFormulaSets, selectedPropertyId) {
            this.$formulaList.empty();
            for (var propId in hmlFormulaSets) {
                var hmlvisitor = new Traverse.HMLNotationVisitor(false, false, true);
                var formulaStr = hmlvisitor.visit(hmlFormulaSets[propId].getTopFormula()); //slice is used to remove the ";"
                var optionsNode = $("<option></option>").attr("value", propId).append(formulaStr);
                if (parseInt(propId) == selectedPropertyId) {
                    optionsNode.prop("selected", true);
                }
                this.$formulaList.append(optionsNode);
            }
        };
        HmlGameActivity.prototype.setProcesses = function (processNames, selectedProcessName) {
            var _this = this;
            /*Updates the processes in processlist*/
            this.$processList.empty();
            processNames.forEach(function (pName) {
                var optionsNode = $("<option></option>").append(pName);
                if (pName === selectedProcessName) {
                    optionsNode.prop("selected", true);
                }
                _this.$processList.append(optionsNode);
            });
        };
        HmlGameActivity.prototype.loadGuiIntoConfig = function (configuration) {
            /*Updates the configuration object with new data from processlist and formulalist*/
            configuration.processName = this.getProcessListValue();
            configuration.propertyId = this.getSelectedFormulaSetId();
            configuration.formulaId = this.getSelectedFormulaSet().getTopFormula().id;
            // configuration.strongSuccGen = this.getSuccGenerator("strong");
            // configuration.weakSuccGen = this.getSuccGenerator("weak");
        };
        HmlGameActivity.prototype.configure = function (configuration) {
            var _this = this;
            //This is/should-only-be called for change in either process, formula or succ generator.
            this.configuration = configuration;
            this.graph = this.project.getGraph();
            this.strongSuccGen = CCS.getSuccGenerator(this.graph, { inputMode: InputMode[this.project.getInputMode()], succGen: "strong", reduce: true });
            this.weakSuccGen = CCS.getSuccGenerator(this.graph, { inputMode: InputMode[this.project.getInputMode()], succGen: "weak", reduce: true });
            /*Fill the dropdown list with infomation*/
            this.setProcesses(this.getNamedProcessList(), configuration.processName);
            this.setFormulas(this.formulaSets, configuration.propertyId);
            /*Set the currentFormula/Process */
            var currentProcess = this.strongSuccGen.getProcessByName(configuration.processName);
            var currentFormulaSet = this.formulaSets[configuration.propertyId];
            this.hmlselector.setFormulaSet(currentFormulaSet);
            var currentFormula = currentFormulaSet.getTopFormula();
            /* Set graph in the widgets. */
            this.processExplorer.clear();
            this.processExplorer.graph = this.graph;
            this.transitionTable.graph = this.graph;
            this.tooltip.setGraph(this.graph);
            this.processExplorer.succGen = this.strongSuccGen;
            this.processExplorer.exploreProcess(currentProcess); // explore the current selected process
            this.hmlGameLogic = new HmlGameLogic(currentProcess, currentFormula, currentFormulaSet, this.strongSuccGen, this.weakSuccGen, this.graph);
            this.hmlGameLogic.setGamelogWriter(function (gameLogObject) { return _this.gamelog.printToGameLog(gameLogObject); });
            this.computer = this.hmlGameLogic.getUniversalWinner();
            this.human = (this.computer === 0 /* attacker */) ? 1 /* defender */ : 0 /* attacker */;
            /* Gamelog */
            this.gamelog.reset();
            // print the intro
            var gameIntro = new GUI.Widget.GameLogObject(this.graph);
            gameIntro.setTemplate("You are playing {0} in HML game.</br> {1} has a winning strategy. You are going to lose.");
            gameIntro.addLabel({ text: (this.human === 1 /* defender */ ? "defender" : "attacker") });
            gameIntro.addLabel({ text: (this.hmlGameLogic.getUniversalWinner() === 1 /* defender */ ? "Defender" : "Attacker") });
            this.gamelog.printToGameLog(gameIntro);
            this.refresh();
        };
        HmlGameActivity.prototype.refresh = function () {
            var _this = this;
            /* Explores the currentProcess and updates the transitiontable with its successors transitions*/
            this.gamelog.deleteTempRows();
            var isGameOver = this.hmlGameLogic.isGameOver(), formula = this.hmlGameLogic.state.formula, process = this.hmlGameLogic.state.process, formulaSet = this.hmlGameLogic.state.formulaSet;
            this.printCurrentConfig(process, formula);
            if (isGameOver) {
                this.setActionWidget(); // clear the widget div
                var winner = isGameOver.left;
                var winReason = isGameOver.right;
                this.printGameOver(winner, winReason);
            }
            else {
                var currentPlayer = this.hmlGameLogic.getCurrentPlayer();
                if (currentPlayer === this.computer) {
                    this.hmlGameLogic.AutoPlay(this.computer, function (updateTransitions) {
                        updateTransitions.forEach(function (t) { return _this.processExplorer.drawProcess(t.targetProcess); });
                        _this.processExplorer.exploreProcess(updateTransitions[updateTransitions.length - 1].targetProcess);
                        _this.processExplorer.focusOnProcess(updateTransitions[updateTransitions.length - 1].targetProcess);
                    });
                    this.refresh();
                }
                else if (currentPlayer === this.human) {
                    this.prepareGuiForUserAction();
                }
                else if (currentPlayer === 2 /* judge */) {
                    // Judge plays
                    formula = this.hmlGameLogic.JudgeUnfold(formula, formulaSet);
                    this.refresh();
                }
            }
        };
        HmlGameActivity.prototype.printGameOver = function (winner, winReason) {
            /* Gamelog */
            var gameLogObject = new GUI.Widget.GameLogObject(this.graph);
            switch (winReason) {
                case 0 /* minGameCycle */: {
                    gameLogObject.setTemplate("A cycle in the context of {0} fixed point was detected. You ({1}) {2}!");
                    gameLogObject.addLabel({ text: "minimum" });
                    gameLogObject.addLabel({ text: (this.human === 1 /* defender */) ? "defender" : "attacker" });
                    gameLogObject.addLabel({ text: (this.human === winner) ? "win" : "lose" });
                    break;
                }
                case 1 /* maxGameCycle */: {
                    gameLogObject.setTemplate("A cycle in the context of {0} fixed point was detected. You ({1}) {2}!");
                    gameLogObject.addLabel({ text: "maximum" });
                    gameLogObject.addLabel({ text: (this.human === 1 /* defender */) ? "defender" : "attacker" });
                    gameLogObject.addLabel({ text: (this.human === winner) ? "win" : "lose" });
                    break;
                }
                case 3 /* trueFormula */: {
                    gameLogObject.setTemplate("The formula true has been reached. You ({0}) {1}!");
                    gameLogObject.addLabel({ text: (this.human === 1 /* defender */) ? "defender" : "attacker" });
                    gameLogObject.addLabel({ text: (this.human === winner) ? "win" : "lose" });
                    break;
                }
                case 2 /* falseFormula */: {
                    gameLogObject.setTemplate("The formula false has been reached. You ({0}) {1}!");
                    gameLogObject.addLabel({ text: (this.human === 1 /* defender */) ? "defender" : "attacker" });
                    gameLogObject.addLabel({ text: (this.human === winner) ? "win" : "lose" });
                    break;
                }
                case 4 /* stuck */: {
                    gameLogObject.setTemplate("{0} {1} no available transitions. {2} lose!");
                    gameLogObject.addLabel({ text: (this.human === winner) ? (this.computer === 1 /* defender */ ? "Defender" : "Attacker") : "You " + "(" + (this.human === 1 /* defender */ ? "defender" : "attacker") + ")" });
                    gameLogObject.addLabel({ text: (this.human === winner) ? "has" : "have" });
                    gameLogObject.addLabel({ text: (this.human === winner) ? (this.computer === 1 /* defender */ ? "Defender" : "Attacker") : "You" });
                    break;
                }
                default: {
                    // TODO: Implemente default case
                    console.log("something went wrong");
                }
            }
            gameLogObject.addWrapper({ tag: "<p>" /*, attr: [{name: "class", value: "outro"}]*/ });
            this.gamelog.printToGameLog(gameLogObject);
        };
        HmlGameActivity.prototype.printCurrentConfig = function (process, formula, isNewRound) {
            if (isNewRound === void 0) { isNewRound = true; }
            /* Gamelog */
            var gameLogObject = new GUI.Widget.GameLogObject(this.graph);
            if (isNewRound)
                gameLogObject.setNewRound(true);
            gameLogObject.setTemplate("Current configuration: ({0}, {1}).");
            gameLogObject.addLabel({ text: gameLogObject.labelForProcess(process), tag: "<span>", attr: [{ name: "class", value: "ccs-tooltip-process" }] });
            gameLogObject.addLabel({ text: gameLogObject.labelForFormula(formula), tag: "<span>", attr: [{ name: "class", value: "monospace" }] });
            gameLogObject.addWrapper({ tag: "<p>" });
            this.gamelog.printToGameLog(gameLogObject);
        };
        HmlGameActivity.prototype.prepareGuiForUserAction = function () {
            var gameLogObject = new GUI.Widget.GameLogObject(this.graph);
            if (this.hmlGameLogic.getNextActionType() === 0 /* transition */) {
                gameLogObject.setTemplate("Select a transition");
                gameLogObject.addWrapper({ tag: "<p>", attr: [{ name: "id", value: "temprow" }] });
                this.gamelog.printToGameLog(gameLogObject);
                this.setActionWidget(this.transitionTable); // set widget to be transition table
                this.transitionTable.setTransitions(this.hmlGameLogic.state.process, this.hmlGameLogic.getAvailableTransitions(), this.hmlGameLogic.getCurrentSucc());
            }
            else if (this.hmlGameLogic.getNextActionType() === 1 /* formula */) {
                gameLogObject.setTemplate("Select a subformula");
                gameLogObject.addWrapper({ tag: "<p>", attr: [{ name: "id", value: "temprow" }] });
                this.gamelog.printToGameLog(gameLogObject);
                this.setActionWidget(this.hmlselector); // set widget to be hml selector
                var successorFormulas = this.hmlGameLogic.getAvailableFormulas(this.hmlGameLogic.state.formulaSet);
                this.hmlselector.setFormula(successorFormulas);
            }
        };
        HmlGameActivity.prototype.setActionWidget = function (widget) {
            if (widget === void 0) { widget = null; }
            var injecter = $("#hml-game-status-right")[0];
            while (injecter.firstChild) {
                injecter.removeChild(injecter.firstChild);
            }
            if (widget) {
                injecter.appendChild(widget.getRootElement());
            }
        };
        HmlGameActivity.prototype.resize = function () {
            var $processExplorerCanvasContainer = $(this.processExplorer.getCanvasContainer()), explorerOffsetTop = $processExplorerCanvasContainer.offset().top, explorerOffsetBottom = $("#hml-game-status").height();
            var availableHeight = window.innerHeight - explorerOffsetTop - explorerOffsetBottom - 17;
            this.processExplorer.resize(this.$container.width(), availableHeight);
        };
        HmlGameActivity.prototype.toString = function () {
            return "HML Game Activity";
        };
        return HmlGameActivity;
    })();
    ;
    ;
    ;
    var Pair = (function () {
        function Pair(left, right) {
            this.left = left;
            this.right = right;
        }
        return Pair;
    })();
    var HmlGameState = (function () {
        function HmlGameState(process, formula, formulaSet, isMinGame) {
            this.process = process;
            this.formula = formula;
            this.formulaSet = formulaSet;
            this.isMinGame = isMinGame;
        }
        HmlGameState.prototype.withProcess = function (process) {
            var result = this.clone();
            result.process = process;
            return result;
        };
        HmlGameState.prototype.withFormula = function (formula) {
            var result = this.clone();
            result.formula = formula;
            return result;
        };
        HmlGameState.prototype.withMinMax = function (isMinGame) {
            var result = this.clone();
            result.isMinGame = isMinGame;
            return result;
        };
        HmlGameState.prototype.clone = function () {
            var copy = new HmlGameState(this.process, this.formula, this.formulaSet, this.isMinGame);
            return copy;
        };
        HmlGameState.prototype.toString = function () {
            var hmlNotationVisitor = new Traverse.HMLNotationVisitor(false, false, false);
            var processStr = (this.process instanceof CCS.NamedProcess) ? this.process.name : this.process.id.toString();
            var formulaStr = hmlNotationVisitor.visit(this.formula);
            var isMinGameStr = this.isMinGame.toString();
            var result = "(" + processStr + "," + formulaStr + "," + isMinGameStr + ")";
            return result;
        };
        return HmlGameState;
    })();
    var HmlGameLogic = (function () {
        function HmlGameLogic(process, formula, formulaSet, strongSuccGen, weakSuccGen, graph) {
            this.gameIsOver = false;
            this.cycleCache = {};
            this.previousStates = [];
            this.state = new HmlGameState(process, formula, formulaSet, true);
            this.strongSuccGen = strongSuccGen;
            this.weakSuccGen = weakSuccGen;
            this.graph = graph;
            this.root = new dg.MuCalculusNode(this.state.process, this.state.formula, this.state.isMinGame);
            this.dgNode = this.root, this.dGraph = new dg.MuCalculusDG(strongSuccGen, weakSuccGen, formulaSet);
            this.marking = this.solveMuCalculus();
        }
        HmlGameLogic.prototype.solveMuCalculus = function () {
            return dg.solveMuCalculusForNode(this.dGraph, this.dgNode);
        };
        HmlGameLogic.prototype.getUniversalWinner = function () {
            this.computer = (this.marking.getMarking(this.root) === this.marking.ONE) ? 1 /* defender */ : 0 /* attacker */;
            this.human = (this.computer === 1 /* defender */) ? 0 /* attacker */ : 1 /* defender */;
            return this.computer;
        };
        HmlGameLogic.prototype.popModalityFormula = function (hmlF) {
            // this method can only be used on Modality formulas (such as <a>, [a], <<a>>, and [[a]])
            if (hmlF) {
                return hmlF.subFormula;
            }
            throw "Unhandled formula type in popModalityFormula";
        };
        HmlGameLogic.prototype.setGamelogWriter = function (gamelogger) {
            this.writeToGamelog = gamelogger;
        };
        HmlGameLogic.prototype.AutoPlay = function (player, usedTransitions) {
            if (player === 2 /* judge */)
                throw "Judge may not auto play";
            var choice = this.getBestAIChoice();
            var actionType = this.getNextActionType();
            if (actionType === 0 /* transition */) {
                //Find matching transition
                var transition = null;
                this.getAvailableTransitions().forEach(function (t) {
                    if (t.targetProcess.id === choice.process.id) {
                        transition = t;
                    }
                });
                if (!transition)
                    throw "Missing Transition";
                this.selectedTransition(transition, usedTransitions);
            }
            else {
                this.selectedFormula(choice.formula);
            }
        };
        HmlGameLogic.prototype.selectedFormula = function (formula) {
            if (this.gameIsOver)
                throw "Game has ended";
            var gameLogPlay = new GUI.Widget.GameLogObject(this.graph);
            gameLogPlay.setTemplate("{0} selected subformula {1}.");
            gameLogPlay.addWrapper({ tag: "<p>" });
            gameLogPlay.addLabel({ text: (this.getCurrentPlayer() === this.human ? "You " + ((this.human === 1 /* defender */) ? "(defender)" : "(attacker)") : this.computer === 1 /* defender */ ? "Defender" : "Attacker") });
            gameLogPlay.addLabel({ text: gameLogPlay.labelForFormula(formula), tag: "<span>", attr: [{ name: "class", value: "monospace" }] });
            this.writeToGamelog(gameLogPlay);
            this.getChoices(this.dgNode);
            this.dgNode = this.dgNode.newWithFormula(formula);
            // The player selected a formula.
            this.previousStates.push(this.state);
            this.state = this.state.withFormula(formula);
        };
        HmlGameLogic.prototype.selectedTransition = function (transition, usedTransitions) {
            if (this.gameIsOver)
                throw "Game has ended";
            var fromProc = this.state.process;
            var strictPath = [transition];
            var wasWeak = this.isWeak();
            var gameLogPlay = new GUI.Widget.GameLogObject(this.graph);
            gameLogPlay.setTemplate("{0} played {1} {2} {3}.");
            gameLogPlay.addWrapper({ tag: "<p>" });
            gameLogPlay.addLabel({ text: (this.getCurrentPlayer() === this.human ? "You " + ((this.human === 1 /* defender */) ? "(defender)" : "(attacker)") : this.computer === 1 /* defender */ ? "Defender" : "Attacker") });
            gameLogPlay.addLabel({ text: gameLogPlay.labelForProcess(this.state.process), tag: "<span>", attr: [{ name: "class", value: "ccs-tooltip-process" }] });
            if (this.isWeak()) {
                // Add strict path to the tooltip when it is a weak transition
                var actionTransition = "=" + transition.action.toString() + "=>";
                gameLogPlay.addLabel({ text: actionTransition, tag: "<span>", attr: [{ name: "class", value: "ccs-tooltip-data" }, { name: "data-tooltip", value: Activity.Tooltip.strongSequence(this.weakSuccGen, this.state.process, transition.action, transition.targetProcess, this.graph) }] });
            }
            else {
                gameLogPlay.addLabel({ text: "-" + transition.action.toString() + "->", tag: "<span>", attr: [{ name: "class", value: "monospace" }] });
            }
            gameLogPlay.addLabel({ text: gameLogPlay.labelForProcess(transition.targetProcess), tag: "<span>", attr: [{ name: "class", value: "ccs-tooltip-process" }] });
            this.writeToGamelog(gameLogPlay);
            this.getChoices(this.dgNode);
            var hmlSubF = this.popModalityFormula(this.state.formula);
            this.previousStates.push(this.state);
            this.dgNode = this.dgNode.newWithFormula(hmlSubF).newWithProcess(transition.targetProcess);
            this.state = this.state.withFormula(hmlSubF).withProcess(transition.targetProcess);
            if (wasWeak) {
                strictPath = this.weakSuccGen.getStrictPath(fromProc.id, transition.action, transition.targetProcess.id);
            }
            usedTransitions(strictPath); // notify of all intermediary nodes
        };
        HmlGameLogic.prototype.cycleExists = function () {
            var stateStr = this.state.toString();
            if (this.cycleCache[stateStr] != undefined) {
                // cycle detected
                return true;
            }
            else {
                this.cycleCache[stateStr] = this.state;
                return false;
            }
        };
        HmlGameLogic.prototype.isGameOver = function () {
            // returns undefined/null if no winner.
            // otherwise return who won, and why.
            // true/false formula
            if (this.state.formula instanceof HML.FalseFormula) {
                this.gameIsOver = true;
                return new Pair(0 /* attacker */, 2 /* falseFormula */); // attacker win
            }
            else if (this.state.formula instanceof HML.TrueFormula) {
                this.gameIsOver = true;
                return new Pair(1 /* defender */, 3 /* trueFormula */); // defender win
            }
            //stuck
            var availTranstition = this.getAvailableTransitions();
            if ((!availTranstition || availTranstition.length <= 0) && this.getNextActionType() === 0 /* transition */) {
                var currentPlayer = this.getCurrentPlayer();
                var winner = (currentPlayer === 0 /* attacker */) ? 1 /* defender */ : 0 /* attacker */;
                this.gameIsOver = true;
                return new Pair(winner, 4 /* stuck */);
            }
            // infinite run
            if (this.cycleExists()) {
                if (this.state.isMinGame) {
                    // minGame
                    this.gameIsOver = true;
                    return new Pair(0 /* attacker */, 0 /* minGameCycle */); //winner
                }
                else if (!this.state.isMinGame) {
                    // maxGame
                    this.gameIsOver = true;
                    return new Pair(1 /* defender */, 1 /* maxGameCycle */); //winner
                }
            }
            return null; // no winner
        };
        HmlGameLogic.prototype.getNextActionType = function () {
            var _this = this;
            // what about true and false?
            var transitionMoves = [HML.StrongForAllFormula, HML.WeakForAllFormula, HML.StrongExistsFormula, HML.WeakExistsFormula];
            var formulaMoves = [HML.DisjFormula, HML.ConjFormula];
            var variableMoves = [HML.MinFixedPointFormula, HML.MaxFixedPointFormula, HML.VariableFormula];
            var isPrototypeOfCurrentFormula = function (obj) { return _this.state.formula instanceof obj; };
            if (transitionMoves.some(isPrototypeOfCurrentFormula))
                return 0 /* transition */;
            if (formulaMoves.some(isPrototypeOfCurrentFormula))
                return 1 /* formula */;
            if (variableMoves.some(isPrototypeOfCurrentFormula))
                return 2 /* variable */;
            throw "Unhandled formula type in getNextActionType";
            //Returns whether the next player is to select an action or formula or
        };
        HmlGameLogic.prototype.JudgeUnfold = function (hml, hmlFSet) {
            if (hml instanceof HML.MinFixedPointFormula) {
                this.previousStates.push(this.state);
                this.state = this.state.withFormula(hml.subFormula).withMinMax(true);
                this.dgNode = this.dgNode.newWithFormula(hml.subFormula).newWithMinMax(true);
                return hml.subFormula;
            }
            else if (hml instanceof HML.MaxFixedPointFormula) {
                this.previousStates.push(this.state);
                this.state = this.state.withFormula(hml.subFormula).withMinMax(false);
                this.dgNode = this.dgNode.newWithFormula(hml.subFormula).newWithMinMax(false);
                return hml.subFormula;
            }
            else if (hml instanceof HML.VariableFormula) {
                var namedFormula = hmlFSet.formulaByName(hml.variable);
                if (namedFormula) {
                    if (namedFormula instanceof HML.MinFixedPointFormula || namedFormula instanceof HML.MaxFixedPointFormula) {
                        var isMinVariable = (namedFormula instanceof HML.MinFixedPointFormula);
                        var unfolded = this.JudgeUnfold(namedFormula, hmlFSet);
                        /* Gamelog */
                        var gameLogPlay = new GUI.Widget.GameLogObject(this.graph);
                        gameLogPlay.setTemplate("The variable {0} has been unfolded to {1}.<br>As {2} is defined as {3} fixed point,<br>a detected loop will become a win for {4}.");
                        gameLogPlay.addWrapper({ tag: "<p>" });
                        gameLogPlay.addLabel({ text: gameLogPlay.labelForFormula(hml), tag: "<span>", attr: [{ name: "class", value: "monospace" }] });
                        gameLogPlay.addLabel({ text: gameLogPlay.labelForFormula(unfolded), tag: "<span>", attr: [{ name: "class", value: "monospace" }] });
                        gameLogPlay.addLabel({ text: gameLogPlay.labelForFormula(hml), tag: "<span>", attr: [{ name: "class", value: "monospace" }] });
                        gameLogPlay.addLabel({ text: (isMinVariable ? "minimum" : "maximum") });
                        gameLogPlay.addLabel({ text: (isMinVariable ? "attacker" : "defender") });
                        this.writeToGamelog(gameLogPlay);
                        return unfolded;
                    }
                }
            }
            throw "Unhandled formula type in JudgeUnfold";
        };
        HmlGameLogic.prototype.getCurrentPlayer = function () {
            var _this = this;
            var attackerMoves = [HML.ConjFormula, HML.StrongForAllFormula, HML.WeakForAllFormula, HML.FalseFormula];
            var defenderMoves = [HML.DisjFormula, HML.StrongExistsFormula, HML.WeakExistsFormula, HML.TrueFormula];
            var judgeMoves = [HML.MinFixedPointFormula, HML.MaxFixedPointFormula, HML.VariableFormula];
            var isPrototypeOfCurrentFormula = function (obj) { return _this.state.formula instanceof obj; };
            if (attackerMoves.some(isPrototypeOfCurrentFormula))
                return 0 /* attacker */;
            if (defenderMoves.some(isPrototypeOfCurrentFormula))
                return 1 /* defender */;
            if (judgeMoves.some(isPrototypeOfCurrentFormula))
                return 2 /* judge */;
            throw "Unhandled formula type in getCurrentPlayer";
        };
        HmlGameLogic.prototype.getAvailableTransitions = function () {
            if (this.getNextActionType() === 0 /* transition */) {
                var hml = this.state.formula;
                var allTransitions = null;
                if (this.isWeak()) {
                    allTransitions = this.weakSuccGen.getSuccessors(this.state.process.id).toArray();
                }
                else {
                    allTransitions = this.strongSuccGen.getSuccessors(this.state.process.id).toArray();
                }
                var availableTransitions = allTransitions.filter(function (transition) { return hml.actionMatcher.matches(transition.action); });
                return availableTransitions;
            }
            return null;
            throw "Unhandled formula type in getAvailableTransitions";
        };
        HmlGameLogic.prototype.getCurrentSucc = function () {
            if (this.getNextActionType() === 0 /* transition */) {
                if (this.isWeak()) {
                    return this.weakSuccGen;
                }
                else {
                    return this.strongSuccGen;
                }
            }
            throw "Unhandled formula type in getCurrentSucc";
        };
        HmlGameLogic.prototype.isWeak = function () {
            var _this = this;
            var weakMoves = [HML.WeakForAllFormula, HML.WeakExistsFormula];
            var strongMoves = [HML.StrongForAllFormula, HML.StrongExistsFormula];
            var isPrototypeOfCurrentFormula = function (obj) { return _this.state.formula instanceof obj; };
            if (weakMoves.some(isPrototypeOfCurrentFormula))
                return true;
            if (strongMoves.some(isPrototypeOfCurrentFormula))
                return false;
            throw "Unhandled formula type, in isWeak";
        };
        HmlGameLogic.prototype.getAvailableFormulas = function (hmlFSet) {
            if (this.getNextActionType() === 1 /* formula */) {
                var hmlSuccGen = new Traverse.HMLSuccGenVisitor(hmlFSet);
                var formulaSuccessors = hmlSuccGen.visit(this.state.formula);
                return formulaSuccessors;
            }
            return null;
            throw "Unhandled formula type in getAvailableFormulas";
        };
        HmlGameLogic.prototype.getChoices = function (dgNode) {
            var _this = this;
            if (dgNode === void 0) { dgNode = this.dgNode; }
            var hyperEdges = this.dGraph.getHyperEdges(dgNode);
            //Due to the construction, all hyperedges are either of the
            //form [ [X], [Y], [Z], ...] or [ [X, Y, Z] ]
            var describedEdges = hyperEdges.map(function (hyperEdge) {
                //Get information about dg node and add level.
                hyperEdge.forEach(function (targetNode) {
                    targetNode.level = _this.marking.getLevel(targetNode);
                });
                var edgeDescription = { level: Infinity, nodeDescriptions: hyperEdge };
                // var max2 = (a, b) => Math.max(a,b);
                //Set max level for each hyperedge description
                edgeDescription.level = hyperEdge.reduce(function (maxDesc, otherDesc) {
                    return otherDesc.level > maxDesc.level ? otherDesc : maxDesc;
                }).level;
                return edgeDescription;
            });
            // returns the set of hyperedges from where player can choose from.
            return describedEdges;
        };
        HmlGameLogic.prototype.getBestAIChoice = function () {
            var describedEdges = this.getChoices(this.dgNode);
            var isMin = this.state.isMinGame;
            var isAttacker = this.computer === 0 /* attacker */;
            var minimizeLevel = isMin ? (isAttacker ? false : true) : (isAttacker ? true : false);
            var isBetterFn = minimizeLevel ? (function (x, y) { return x.level < y.level; }) : (function (x, y) { return x.level > y.level; });
            //Pick desired hyperedge
            var selectedHyperDescription = ArrayUtil.selectBest(describedEdges, isBetterFn);
            var selectedTargetDescription = ArrayUtil.selectBest(selectedHyperDescription.nodeDescriptions, isBetterFn);
            // this.choiceDgNodeId = selectedTargetDescription.nodeId;
            return selectedTargetDescription;
        };
        return HmlGameLogic;
    })();
})(Activity || (Activity = {}));
//# sourceMappingURL=main.js.map
/// <reference path="../lib/jquery.d.ts" />
/// <reference path="../lib/bootstrap.d.ts" />
/// <reference path="../lib/ace.d.ts" />
/// <reference path="../lib/ccs.d.ts" />
/// <reference path="gui/project.ts" />
/// <reference path="gui/menu/new.ts" />
/// <reference path="gui/menu/save.ts" />
/// <reference path="gui/menu/load.ts" />
/// <reference path="gui/menu/delete.ts" />
/// <reference path="gui/menu/export.ts" />
/// <reference path="gui/hotkey.ts" />
/// <reference path="gui/autosave.ts" />
/// <reference path="gui/contact.ts" />
/// <reference path="activity/activityhandler.ts" />
/// <reference path="activity/activity.ts" />
/// <reference path="activity/editor.ts" />
/// <reference path="activity/explorer.ts" />
/// <reference path="activity/verifier.ts" />
/// <reference path="activity/game.ts" />
/// <reference path="activity/hmlgame.ts" />
var ccs = CCS;
var hml = HML;
var Main;
(function (Main) {
    Main.activityHandler = new Activity.ActivityHandler();
    var timer;
    $(document).ready(function () {
        Main.activityHandler.addActivity("editor", new Activity.Editor("#editor-container", "#edit-btn"));
        Main.activityHandler.addActivity("explorer", new Activity.Explorer("#explorer-container", "#explore-btn"));
        Main.activityHandler.addActivity("verifier", new Activity.Verifier("#verifier-container", "#verify-btn"));
        Main.activityHandler.addActivity("game", new Activity.Game("#game-container", "#game-btn", "#select-game"));
        Main.activityHandler.addActivity("hmlgame", new Activity.HmlGame("#hml-game-container", "#hml-game-btn", "#select-game"));
        Main.activityHandler.selectActivity("editor");
        new New("#new-btn", Main.activityHandler);
        var save = new Save(null, Main.activityHandler);
        new Load(null, Main.activityHandler);
        new Delete("#delete-btn", Main.activityHandler);
        new Export("#export-pdf-btn", Main.activityHandler);
        new HotkeyHandler().setGlobalHotkeys(Main.activityHandler, save);
        $('[data-toggle="tooltip"]').tooltip();
        Activity.addTooltips();
    });
    $("#aboutModal").load("about.html", function () { return $("#version").append(getVersion()); });
    $("#helpModal").load("help.html");
    $("#contactModal").load("contact.html", function () { return ContactForm.init(); });
    function showNotification(text, time) {
        window.clearTimeout(timer);
        var $box = $("#notification-box");
        $box.html(text);
        $box.fadeIn(500);
        timer = setTimeout(function () {
            $box.fadeOut(500);
            window.clearTimeout(timer);
        }, time);
    }
    Main.showNotification = showNotification;
    function getVersion() {
        return Version;
    }
    Main.getVersion = getVersion;
})(Main || (Main = {}));
//# sourceMappingURL=main.js.map
var Version = "v1.0.2-0-g630635d";