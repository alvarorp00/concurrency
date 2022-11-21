/// <reference path="ccs.ts" />
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
                //First time we see this process.
                this.unknownResults.splice(index, 1);
                this.visiting.push(process);
                isUnguarded = process.subProcess.dispatchOn(this);
                if (isUnguarded) {
                    this.unguardedProcesses.push(process);
                }
                this.visiting.splice(this.visiting.indexOf(process), 1);
            }
            else if (this.visiting.indexOf(process) !== -1) {
                //Got back to this constant without performing action -- unguarded
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
/// <reference path="../../lib/util.d.ts" />
/// <reference path="unguarded_recursion.ts" />
var CCS;
(function (CCS) {
    /*
        For the process type definitions, since toString is used
        called before any property lookup it should return a unique
        string for each process, but always the same string for the same
        process.

        For backwards compatibility p.id should also return a unique string
        suitable as a property key.

        Neither of these are intended to be human readable.
    */
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
            //Contains all processes by their .id
            //is also used to optimize number of instances.
            this.processes = { "0": this.nullProcess };
            this.labelsToProc = Object.create(null);
            this.procsToLabel = Object.create(null);
            this.namedProcesses = Object.create(null);
            this.constructErrors = [];
            this.definedSets = Object.create(null);
            //Uses index as uid.
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
                //Null will be fixed, by newNamedProcess
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
            //Ensure left.id <= right.id
            var newProcesses = subProcesses.slice(0);
            newProcesses.sort();
            var result = new SummationProcess(newProcesses);
            return this.processes[result.id] = result;
        };
        Graph.prototype.newCompositionProcess = function (subProcesses) {
            //Ensure left.id <= right.id
            var newProcesses = subProcesses.slice(0);
            newProcesses.sort();
            var result = new CompositionProcess(newProcesses);
            return this.processes[result.id] = result;
        };
        Graph.prototype.newRestrictedProcess = function (process, restrictedLabels) {
            //For now return just new instead of structural sharing
            restrictedLabels = this.allRestrictedSets.getOrAdd(restrictedLabels);
            var result = new RestrictionProcess(process, restrictedLabels);
            return this.processes[result.id] = result;
        };
        Graph.prototype.newRestrictedProcessOnSetName = function (process, setName) {
            var labelSet = this.definedSets[setName];
            if (!labelSet) {
                this.constructErrors.push(newError("UndefinedSet", "Set '" + setName + "' has not been defined."));
                //Fallback for empty set
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
            //Add undefined processes
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
            //Unguarded recursion checking requires all processes to defined.
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
                //Tau cannot be complemented.
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
    /*
        Always modifies inplace. Clone gives shallow clone
    */
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
            //Move recursive calling into loop with stack here
            //if overflow becomes an issue.
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
                //Assume nothing, then figure it out when subprocess successors are known.
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
                        //For each pairs in  P1 | P2 | P3 | P4, find COM3 transitions.
                        var left = subTransitionSets[i];
                        var right = subTransitionSets[j];
                        left.forEach(function (leftTransition) {
                            right.forEach(function (rightTransition) {
                                if (leftTransition.action.getLabel() === rightTransition.action.getLabel() && leftTransition.action.isComplement() !== rightTransition.action.isComplement()) {
                                    //Need to construct entire set of new process.
                                    var targetSubprocesses = process.subProcesses.slice(0);
                                    targetSubprocesses[i] = leftTransition.targetProcess;
                                    targetSubprocesses[j] = rightTransition.targetProcess;
                                    transitionSet.add(new Transition(new Action("tau", false), _this.graph.newCompositionProcess(targetSubprocesses)));
                                }
                            });
                        });
                    }
                }
                //COM1/2s
                subTransitionSets.forEach(function (subTransitionSet, index) {
                    subTransitionSet.forEach(function (subTransition) {
                        var targetSubprocesses = process.subProcesses.slice(0);
                        //Only the index of the subprocess will have changed.
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
                //process.nextProcess.dispatchOn(this).clone();
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
/// <reference path="ccs.ts" />
/// <reference path="ccs.ts" />
var Traverse;
(function (Traverse) {
    var ccs = CCS;
    // A collapsed process is a process that has
    // replaced many equivalent processes.
    // is not a real process. Has no id.
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
/// <reference path="../../lib/util.d.ts" />
/// <reference path="ccs.ts" />
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
            // private allFormulas = [];
            this.topLevelFormulas = [];
            this.undefinedVariables = [];
            this.errors = [];
            this.falseFormula = new FalseFormula();
            this.trueFormula = new TrueFormula();
            // private nextId = 2;
            // private structural = {};
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
            //cast potentially undefined.
            return !!result;
        };
        ReferenceCycleChecker.prototype.dispatchConjFormula = function (formula) {
            var _this = this;
            var result = false;
            formula.subFormulas.forEach(function (subFormula) {
                result = result || subFormula.dispatchOn(_this);
            });
            //cast potentially undefined.
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
/// <reference path="ccs.ts" />
/// <reference path="hml.ts" />
var Traverse;
(function (Traverse) {
    var ccs = CCS;
    var hml = HML;
    // http://ironcreek.net/phpsyntaxtree/?
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
        //not very usable at the moment.
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
            //How to handle recursion???
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
    /*
        This class should hold any simplications that can be done to the HML formulas.

        This class currenly only remove redundant taus and simplifies conjunction
        and disjunction with only one term.
    */
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
            //Todo: this should probably be more robust
            //Check if  <<X>> <<Y>> ...
            if (subFormula instanceof hml.WeakExistsFormula) {
                if (formula.actionMatcher instanceof hml.SingleActionMatcher && formula.actionMatcher.matches(new CCS.Action("tau", false))) {
                    //  <<tau>> <<X>> ...
                    return subFormula;
                }
                else if (subFormula.actionMatcher instanceof hml.SingleActionMatcher && subFormula.actionMatcher.matches(new CCS.Action("tau", false))) {
                    // <<X><<tau>> ...
                    return this.prevSet.newWeakExists(formula.actionMatcher, subFormula.subFormula);
                }
            }
            return this.prevSet.newWeakExists(formula.actionMatcher, subFormula);
        };
        HMLSimplifier.prototype.dispatchWeakForAllFormula = function (formula) {
            var subFormula = formula.subFormula.dispatchOn(this);
            //Todo: this should probably be more robust
            //Check if  [[X]] [[Y]] ...
            if (subFormula instanceof hml.WeakForAllFormula) {
                if (formula.actionMatcher instanceof hml.SingleActionMatcher && formula.actionMatcher.matches(new CCS.Action("tau", false))) {
                    //  [[tau]] [[X]] ...
                    return subFormula;
                }
                else if (subFormula.actionMatcher instanceof hml.SingleActionMatcher && subFormula.actionMatcher.matches(new CCS.Action("tau", false))) {
                    // [[X]] [[tau]]
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
/// <reference path="../../lib/util.d.ts" />
/// <reference path="../../lib/data.d.ts" />
/// <reference path="ccs.ts" />
/// <reference path="hml.ts" />
/// <reference path="util.ts" />
/// <reference path="collapse.ts" />
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
            //Return single hyperedge
            return hyperEdges;
        };
        MuCalculusDG.prototype.dispatchTrueFormula = function (formula) {
            //Hyperedge with no targets
            if (this.currentNode.isMin) {
                return [[]];
            }
            else {
                return [];
            }
        };
        MuCalculusDG.prototype.dispatchFalseFormula = function (formula) {
            //No hyperedges
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
        //X max= <<a>>[[b]]X and Y;
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
    /*
        Reuses the state inside the calculator (markings and levels) to gather all results.
    */
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
    //Fragile: Assume vertices in hyperedges are string-like.
    //Only to be used by compareHyperedgesMFPCalculator!!!
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
    //Only to be used by MinFixedPointCalculator
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
                    //sort now to prevent sorting later on comparisons.
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
                //Check if improved levels. Also prevents cycle-induced infinity looping.
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
    /*
        Backwards compatible
    */
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
        // A[k]
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
        // D[k]
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
        //Unpack hyperedges
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
            //First run, add deps
            if (candidateLevel === -1) {
                for (var edgeIdx = 0; edgeIdx < l.length; edgeIdx++) {
                    D.add(l[edgeIdx], [k, l]);
                }
                candidateLevel = Infinity;
            }
            if (candidateLevel < kLevel || kLevel === Infinity) {
                //Check if situation improved.
                var highestSubLevel = 0;
                for (var edgeIdx = 0; edgeIdx < l.length; edgeIdx++) {
                    var subLevel = Level.get(l[edgeIdx]);
                    highestSubLevel = Math.max(subLevel, highestSubLevel);
                    //This target node is too high level to improve "parent".
                    if (subLevel >= kLevel)
                        break;
                }
                //Went through all and improved?
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
/// <reference path="ccs.ts" />
/// <reference path="hml.ts" />
/// <reference path="depgraph.ts" />
var Equivalence;
(function (Equivalence) {
    var ccs = CCS;
    var hml = HML;
    var dg = DependencyGraph;
    /**
        This class construct a bisimulation dependency graph.

        It is extended with method for selecting AI choice for the DG-Games, and
        other utility methods like finding distinguishing formula or performing
        bisimulation collapse
    */
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
            //Have we already built this? Then return copy of the edges.
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
            // for (s, fromRightId), s ----action---> toLeftId.
            // fromRightId must be able to match.
            var rightTransitions = this.defendSuccGen.getSuccessors(fromRightId);
            rightTransitions.forEach(function (rightTransition) {
                var existing, toRightId;
                //Same action - possible candidate.
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
            //Build the node.
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
        /*
            Returns information about the attackers options P -- alpha --> Q that the defender than have to match.
            returns: the action, alpha, leading to Q, Q itself, the next DG node, type of move (0,1,2).
        */
        BisimulationDG.prototype.getAttackerOptions = function (dgNodeId) {
            var _this = this;
            if (this.constructData[dgNodeId][0] !== 0)
                throw "Bad node for attacker options";
            var hyperedges = this.getHyperEdges(dgNodeId);
            var result = [];
            hyperedges.forEach(function (hyperedge) {
                //The dg nodes are constructed such that each hyperedge only have one target node.
                //therefore no need to loop over the hyperedge.
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
        /*
            Similar to getAttackerOptions, but returns instead the process the other side
            matched with and the resulting dependency graph node
        */
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
        /*
            Create a node for all pairs of reachable processes
        */
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
            //Implementation of Union-Find algorithm.
            //Since Bisimulation is an equivalence relation
            //this datastructure/algorithm is a good match.
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
            //Apply union find algorithm
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
                //is bisimilar?
                if (marking.getMarking(id) === marking.ZERO) {
                    union(pId, qId);
                }
            });
            //Map each represenative id to the array of equivalent processes
            var collapses = {};
            Object.keys(sets).forEach(function (procId) {
                var reprId = findRoot(procId).val, process = graph.processById(procId);
                (collapses[reprId] = collapses[reprId] || []).push(process);
            });
            //For each array create a collapse and map each proc id to its
            //corresponding collapse
            var proc2collapse = {};
            Object.keys(collapses).forEach(function (reprId) {
                var collapsedProces = collapses[reprId];
                var collapse = graph.newCollapsedProcess(collapses[reprId]);
                collapsedProces.forEach(function (proc) {
                    proc2collapse[proc.id] = collapse;
                });
                //Add self collapse
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
                //Why JavaScript... why????
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
            //Remove terms in con/dis-junctions
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
            //We use the internal implementation details
            //Hyperedges of type 0, have hyperedges of: [ [X], [Y], [Z] ]
            //Hyperedges of type 1/2, have the form: [ [P, Q, R, S, T] ]
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
            //Have we already built this? Then return copy of the edges.
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
            // for (s, fromRightId), s ----action---> toLeftId.
            // fromRightId must be able to match.
            var rightTransitions = this.defendSuccGen.getSuccessors(fromRightId);
            rightTransitions.forEach(function (rightTransition) {
                var existing, toRightId;
                //Same action - possible candidate.
                if (rightTransition.action.equals(action)) {
                    toRightId = rightTransition.targetProcess.id;
                    var rightIds = _this.leftPairs[toLeftId];
                    if (rightIds) {
                        existing = rightIds[toRightId];
                    }
                    //Have we already solved the resulting (s1, t1) pair?
                    if (existing) {
                        result.push(existing);
                    }
                    else {
                        //Build the node.
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
            //Have we already built this? Then return copy of the edges.
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
/// <reference path="../../lib/data.d.ts" />
/// <reference path="../../lib/util.d.ts" />
/// <reference path="ccs.ts" />
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
                // (P \ L1) \L2 => P \ (L1 Union L2)
                if (subProcess instanceof ccs.RestrictionProcess) {
                    var subRestriction = subProcess;
                    var mergedLabels = subRestriction.restrictedLabels.union(process.restrictedLabels);
                    tempProcess = this.graph.newRestrictedProcess(subRestriction.subProcess, mergedLabels);
                }
                else {
                    tempProcess = this.graph.newRestrictedProcess(subProcess, process.restrictedLabels);
                }
                // 0 \ L => 0
                if (tempProcess.subProcess instanceof ccs.NullProcess) {
                    return tempProcess.subProcess;
                }
                // P \ Ø => P
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
            // Precondition: there must be non abstraction
            var findNonAbstraction = function (fromData) {
                if (isAbstraction(fromData.action))
                    return findNonAbstraction(fromData.prev);
                return fromData.action;
            };
            var addTransitions = function (prevFromData, fromProcess, isStageTwo) {
                var strongSuccessors = _this.strictSuccGenerator.getSuccessors(fromProcess.id);
                strongSuccessors.forEach(function (transition) {
                    var isActionAbstract = isAbstraction(transition.action);
                    //No loops yet with abstractions
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
            //Abstraction does not matter in this call since stage two is false.
            addTransitions(null, sourceProcess, false);
            while (stage1Processes.length > 0) {
                var fromData = stage1Processes.pop();
                //  P == action ==> Q
                var transition = new CCS.Transition(fromData.action, fromData.to);
                if (!result.contains(transition)) {
                    //Know only abstracts in this loop.
                    //If  --1--> X then also --tau--> X and reverse
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
            //Add tau loop to from set:  P ==tau=> P, by P -- tau -> P
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
        //Only call with arguments, for which getSuccessors(fromId) has yielded Transition(action, proces.toId)
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
/// <reference path="ccs.ts" />
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
            // Let all delays be named 'Delay' so they all equal each other.
            // No matter how big a delay, they can always delay by one.
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
        // use most of super to create Transitions, identify if process can do tau,
        // if process cannot do tau then create a delay successor (there can only be one).
        StrictSuccessorGenerator.prototype.getSuccessors = function (processId) {
            var process = this.graph.processById(processId);
            var result = this.cache[process.id] = process.dispatchOn(this);
            if (this.tauFoundCache[process.id] === false) {
                // Clone the result. We don't want to cache delay transitions, because it
                // gives wrong results, and we already have a cache inside the DelaySuccesor.
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
        // assumes process cannot do tau
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
                // assume we cannot do tau
                var newSubProcesses = [];
                var delayFound = false;
                process.subProcesses.forEach(function (subProcess) {
                    var newSubProcess = subProcess.dispatchOn(_this);
                    // if delaying by 1 brings us to a summation nested in a summation, e.g. the process  "P = 1.P + 2.P",
                    // then promote the nested summation's sub-processes to this summation
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
                // assume we cannot do tau
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
                    // ɛ(0).P => P
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
