/// <reference path="lib.webworker.d.ts" />
/// <reference path="../../lib/ccs.d.ts" />
importScripts("../ccs_grammar.js", "../tccs_grammar.js", "../hml_grammar.js", "../thml_grammar.js", "../data.js", "../util.js", "../ccs.js");
var messageHandlers = {};
var graph;
var stop = false;
var inputMode;
self.addEventListener("message", function (event) {
    messageHandlers[event.data.type](event.data);
}, false);
messageHandlers.program = function (data) {
    inputMode = data.inputMode;
    if (!inputMode) {
        throw "language not defined.";
    }
    if (inputMode === "CCS") {
        graph = new CCS.Graph();
        CCSParser.parse(data.program, { ccs: CCS, graph: graph });
    }
    else if (inputMode === "TCCS") {
        graph = new TCCS.Graph();
        TCCSParser.parse(data.program, { ccs: CCS, tccs: TCCS, graph: graph });
    }
};
messageHandlers.isStronglyBisimilar = function (data) {
    var attackSuccGen = CCS.getSuccGenerator(graph, { inputMode: inputMode, time: data.time, succGen: "strong", reduce: true }), defendSuccGen = attackSuccGen, leftProcess = attackSuccGen.getProcessByName(data.leftProcess), rightProcess = defendSuccGen.getProcessByName(data.rightProcess), isBisimilar = Equivalence.isBisimilar(attackSuccGen, defendSuccGen, leftProcess.id, rightProcess.id, graph);
    //Add some kind of request id to determine for which problem have result? It is necessary? Right now just add the new data to the result.
    data.result = isBisimilar;
    self.postMessage(data);
};
messageHandlers.isWeaklyBisimilar = function (data) {
    var attackSuccGen = CCS.getSuccGenerator(graph, { inputMode: inputMode, time: data.time, succGen: "strong", reduce: true }), defendSuccGen = CCS.getSuccGenerator(graph, { inputMode: inputMode, time: data.time, succGen: "weak", reduce: true }), leftProcess = attackSuccGen.getProcessByName(data.leftProcess), rightProcess = defendSuccGen.getProcessByName(data.rightProcess), isBisimilar = Equivalence.isBisimilar(attackSuccGen, defendSuccGen, leftProcess.id, rightProcess.id, graph);
    data.result = isBisimilar;
    self.postMessage(data);
};
messageHandlers.isStronglySimilar = function (data) {
    var attackSuccGen = CCS.getSuccGenerator(graph, { inputMode: inputMode, time: data.time, succGen: "strong", reduce: true }), defendSuccGen = attackSuccGen, leftProcess = attackSuccGen.getProcessByName(data.leftProcess), rightProcess = defendSuccGen.getProcessByName(data.rightProcess), isSimilar = Equivalence.isSimilar(attackSuccGen, defendSuccGen, leftProcess.id, rightProcess.id);
    data.result = isSimilar;
    self.postMessage(data);
};
messageHandlers.isWeaklySimilar = function (data) {
    var attackSuccGen = CCS.getSuccGenerator(graph, { inputMode: inputMode, time: data.time, succGen: "strong", reduce: true }), defendSuccGen = CCS.getSuccGenerator(graph, { inputMode: inputMode, time: data.time, succGen: "weak", reduce: true }), leftProcess = attackSuccGen.getProcessByName(data.leftProcess), rightProcess = defendSuccGen.getProcessByName(data.rightProcess), isSimilar = Equivalence.isSimilar(attackSuccGen, defendSuccGen, leftProcess.id, rightProcess.id);
    data.result = isSimilar;
    self.postMessage(data);
};
messageHandlers.isStronglySimulationEquivalent = function (data) {
    var attackSuccGen = CCS.getSuccGenerator(graph, { inputMode: inputMode, time: data.time, succGen: "strong", reduce: true }), defendSuccGen = attackSuccGen, leftProcess = attackSuccGen.getProcessByName(data.leftProcess), rightProcess = defendSuccGen.getProcessByName(data.rightProcess), isSimilarFromLeft = Equivalence.isSimilar(attackSuccGen, defendSuccGen, leftProcess.id, rightProcess.id), isSimilarFromRight = false;
    if (isSimilarFromLeft) {
        isSimilarFromRight = Equivalence.isSimilar(attackSuccGen, defendSuccGen, rightProcess.id, leftProcess.id);
    }
    data.result = isSimilarFromLeft && isSimilarFromRight;
    self.postMessage(data);
};
messageHandlers.isWeaklySimulationEquivalent = function (data) {
    var attackSuccGen = CCS.getSuccGenerator(graph, { inputMode: inputMode, time: data.time, succGen: "strong", reduce: true }), defendSuccGen = CCS.getSuccGenerator(graph, { inputMode: inputMode, time: data.time, succGen: "weak", reduce: true }), leftProcess = attackSuccGen.getProcessByName(data.leftProcess), rightProcess = defendSuccGen.getProcessByName(data.rightProcess), isSimilarFromLeft = Equivalence.isSimilar(attackSuccGen, defendSuccGen, leftProcess.id, rightProcess.id), isSimilarFromRight = false;
    if (isSimilarFromLeft) {
        isSimilarFromRight = Equivalence.isSimilar(attackSuccGen, defendSuccGen, rightProcess.id, leftProcess.id);
    }
    data.result = isSimilarFromLeft && isSimilarFromRight;
    self.postMessage(data);
};
messageHandlers.isStronglyTraceIncluded = function (data) {
    var attackSuccGen = CCS.getSuccGenerator(graph, { inputMode: inputMode, time: data.time, succGen: "strong", reduce: true });
    var defendSuccGen = attackSuccGen;
    var leftProcess = graph.processByName(data.leftProcess);
    var rightProcess = graph.processByName(data.rightProcess);
    data.result = Equivalence.isTraceIncluded(attackSuccGen, defendSuccGen, leftProcess.id, rightProcess.id, graph);
    self.postMessage(data);
};
messageHandlers.isWeaklyTraceIncluded = function (data) {
    var attackSuccGen = CCS.getSuccGenerator(graph, { inputMode: inputMode, time: data.time, succGen: "weak", reduce: true });
    var defendSuccGen = attackSuccGen;
    var leftProcess = graph.processByName(data.leftProcess);
    var rightProcess = graph.processByName(data.rightProcess);
    data.result = Equivalence.isTraceIncluded(attackSuccGen, defendSuccGen, leftProcess.id, rightProcess.id, graph);
    self.postMessage(data);
};
messageHandlers.isStronglyTraceEq = function (data) {
    var attackSuccGen = CCS.getSuccGenerator(graph, { inputMode: inputMode, time: data.time, succGen: "strong", reduce: true });
    var defendSuccGen = attackSuccGen;
    var leftProcess = graph.processByName(data.leftProcess);
    var rightProcess = graph.processByName(data.rightProcess);
    var formula;
    var leftToRightTraceInclusion = Equivalence.isTraceIncluded(attackSuccGen, defendSuccGen, leftProcess.id, rightProcess.id, graph);
    var rightToLeftTraceInclusion;
    if (!leftToRightTraceInclusion.isSatisfied) {
        formula = leftToRightTraceInclusion.formula;
    }
    else {
        rightToLeftTraceInclusion = Equivalence.isTraceIncluded(attackSuccGen, defendSuccGen, rightProcess.id, leftProcess.id, graph);
        formula = rightToLeftTraceInclusion.formula;
    }
    data.result = {
        isSatisfied: (leftToRightTraceInclusion.isSatisfied && rightToLeftTraceInclusion.isSatisfied),
        formula: formula
    };
    self.postMessage(data);
};
messageHandlers.isWeaklyTraceEq = function (data) {
    var attackSuccGen = CCS.getSuccGenerator(graph, { inputMode: inputMode, time: data.time, succGen: "weak", reduce: true });
    var defendSuccGen = attackSuccGen;
    var leftProcess = graph.processByName(data.leftProcess);
    var rightProcess = graph.processByName(data.rightProcess);
    var formula;
    var leftToRightTraceInclusion = Equivalence.isTraceIncluded(attackSuccGen, defendSuccGen, leftProcess.id, rightProcess.id, graph);
    var rightToLeftTraceInclusion;
    if (!leftToRightTraceInclusion.isSatisfied) {
        formula = leftToRightTraceInclusion.formula;
    }
    else {
        rightToLeftTraceInclusion = Equivalence.isTraceIncluded(attackSuccGen, defendSuccGen, rightProcess.id, leftProcess.id, graph);
        formula = rightToLeftTraceInclusion.formula;
    }
    data.result = {
        isSatisfied: (leftToRightTraceInclusion.isSatisfied && rightToLeftTraceInclusion.isSatisfied),
        formula: formula
    };
    self.postMessage(data);
};
function readFormulaSet(data) {
    var formulaSet = new HML.FormulaSet;
    if (inputMode === "CCS") {
        HMLParser.parse(data.definitions, { ccs: CCS, hml: HML, formulaSet: formulaSet });
        HMLParser.parse(data.formula, { startRule: "TopFormula", ccs: CCS, hml: HML, formulaSet: formulaSet });
    }
    else if (inputMode === "TCCS") {
        THMLParser.parse(data.definitions, { ccs: CCS, tccs: TCCS, hml: HML, formulaSet: formulaSet });
        THMLParser.parse(data.formula, { startRule: "TopFormula", ccs: CCS, tccs: TCCS, hml: HML, formulaSet: formulaSet });
    }
    return formulaSet;
}
messageHandlers.checkFormula = function (data) {
    var strongSuccGen = CCS.getSuccGenerator(graph, { inputMode: inputMode, succGen: "strong", reduce: true }), weakSuccGen = CCS.getSuccGenerator(graph, { inputMode: inputMode, succGen: "weak", reduce: true }), formulaSet = readFormulaSet(data), formula = formulaSet.getTopFormula(), result = DependencyGraph.solveMuCalculus(formulaSet, formula, strongSuccGen, weakSuccGen, graph.processByName(data.processName).id);
    data.result = result;
    self.postMessage(data);
};
messageHandlers.checkFormulaForVariable = function (data) {
    var strongSuccGen = CCS.getSuccGenerator(graph, { inputMode: inputMode, succGen: "strong", reduce: true }), weakSuccGen = CCS.getSuccGenerator(graph, { inputMode: inputMode, succGen: "weak", reduce: true }), formulaSet = readFormulaSet(data), formula = formulaSet.getTopFormula(), result = DependencyGraph.solveMuCalculus(formulaSet, formula, strongSuccGen, weakSuccGen, graph.processByName(data.processName).id);
    data.result = result;
    self.postMessage(data);
};
messageHandlers.findDistinguishingFormula = function (data) {
    var strongSuccGen = CCS.getSuccGenerator(graph, { inputMode: inputMode, time: data.time, succGen: "strong", reduce: true }), weakSuccGen = data.succGenType === "weak" ? CCS.getSuccGenerator(graph, { inputMode: inputMode, time: data.time, succGen: "weak", reduce: true }) : strongSuccGen, leftProcess = strongSuccGen.getProcessByName(data.leftProcess), rightProcess = strongSuccGen.getProcessByName(data.rightProcess);
    var bisimilarDg = new Equivalence.BisimulationDG(strongSuccGen, weakSuccGen, leftProcess.id, rightProcess.id), marking = DependencyGraph.solveDgGlobalLevel(bisimilarDg), formula, hmlNotation;
    if (marking.getMarking(0) === marking.ZERO) {
        data.result = {
            isBisimilar: true,
            formula: ""
        };
    }
    else {
        formula = bisimilarDg.findDistinguishingFormula(marking, data.succGenType === "weak");
        hmlNotation = new Traverse.HMLNotationVisitor(true, false, false);
        data.result = {
            isBisimilar: false,
            formula: hmlNotation.visit(formula)
        };
    }
    self.postMessage(data);
};
messageHandlers.stop = function (data) {
    self.close();
};
