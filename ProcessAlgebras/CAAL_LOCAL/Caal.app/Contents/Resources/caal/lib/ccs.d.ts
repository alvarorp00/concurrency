/// <reference path="util.d.ts" />
/// <reference path="data.d.ts" />
declare module Traverse {
    import ccs = CCS;
    class UnguardedRecursionChecker implements ccs.ProcessDispatchHandler<boolean> {
        private unknownResults;
        private visiting;
        private unguardedProcesses;
        constructor();
        findUnguardedProcesses(allNamedProcesses: ccs.NamedProcess[]): ccs.NamedProcess[];
        dispatchNullProcess(process: ccs.NullProcess): boolean;
        dispatchNamedProcess(process: ccs.NamedProcess): any;
        dispatchSummationProcess(process: ccs.SummationProcess): boolean;
        dispatchCompositionProcess(process: ccs.CompositionProcess): boolean;
        dispatchActionPrefixProcess(process: ccs.ActionPrefixProcess): boolean;
        dispatchRestrictionProcess(process: ccs.RestrictionProcess): any;
        dispatchRelabellingProcess(process: ccs.RelabellingProcess): any;
    }
}
declare module CCS {
    type ProcessId = string;
    interface Process {
        id: ProcessId;
        dispatchOn<T>(dispatcher: ProcessDispatchHandler<T>): T;
    }
    interface ProcessDispatchHandler<T> {
        dispatchNullProcess(process: NullProcess, ...args: any[]): T;
        dispatchNamedProcess(process: NamedProcess, ...args: any[]): T;
        dispatchSummationProcess(process: SummationProcess, ...args: any[]): T;
        dispatchCompositionProcess(process: CompositionProcess, ...args: any[]): T;
        dispatchActionPrefixProcess(process: ActionPrefixProcess, ...args: any[]): T;
        dispatchRestrictionProcess(process: RestrictionProcess, ...args: any[]): T;
        dispatchRelabellingProcess(process: RelabellingProcess, ...args: any[]): T;
    }
    interface CollapsedDispatchHandler<T> extends ProcessDispatchHandler<T> {
        dispatchCollapsedProcess(process: CollapsedProcess, ...args: any[]): T;
    }
    interface CollapsedDispatchHandler<T> extends ProcessDispatchHandler<T> {
        dispatchCollapsedProcess(process: CollapsedProcess, ...args: any[]): T;
    }
    interface ProcessVisitor<T> {
        visit(process: Process): T;
    }
    interface SuccessorGenerator {
        getGraph(): Graph;
        getProcessByName(processName: string): Process;
        getProcessById(processId: ProcessId): Process;
        getSuccessors(processId: ProcessId): TransitionSet;
    }
    class NullProcess implements Process {
        private ccs;
        constructor();
        dispatchOn<T>(dispatcher: ProcessDispatchHandler<T>): T;
        toString(): string;
        id: string;
    }
    class NamedProcess implements Process {
        name: string;
        subProcess: Process;
        private ccs;
        constructor(name: string, subProcess: Process);
        dispatchOn<T>(dispatcher: ProcessDispatchHandler<T>): T;
        toString(): string;
        id: string;
    }
    class SummationProcess implements Process {
        subProcesses: Process[];
        private ccs;
        constructor(subProcesses: Process[]);
        dispatchOn<T>(dispatcher: ProcessDispatchHandler<T>): T;
        toString(): string;
        id: string;
    }
    class CompositionProcess implements Process {
        subProcesses: Process[];
        private ccs;
        constructor(subProcesses: Process[]);
        dispatchOn<T>(dispatcher: ProcessDispatchHandler<T>): T;
        toString(): string;
        id: string;
    }
    class ActionPrefixProcess implements Process {
        action: Action;
        nextProcess: Process;
        private ccs;
        constructor(action: Action, nextProcess: Process);
        dispatchOn<T>(dispatcher: ProcessDispatchHandler<T>): T;
        toString(): string;
        id: string;
    }
    class RestrictionProcess implements Process {
        subProcess: Process;
        restrictedLabels: LabelSet;
        private ccs;
        constructor(subProcess: Process, restrictedLabels: LabelSet);
        dispatchOn<T>(dispatcher: ProcessDispatchHandler<T>): T;
        toString(): string;
        id: string;
    }
    class RelabellingProcess implements Process {
        subProcess: Process;
        relabellings: RelabellingSet;
        private ccs;
        constructor(subProcess: Process, relabellings: RelabellingSet);
        dispatchOn<T>(dispatcher: ProcessDispatchHandler<T>): T;
        toString(): string;
        id: string;
    }
    class CollapsedProcess implements Process {
        subProcesses: Process[];
        private ccs;
        constructor(subProcesses: Process[]);
        dispatchOn<T>(dispatcher: CollapsedDispatchHandler<T>): T;
        toString(): string;
        id: string;
    }
    class Action {
        private label;
        private complement;
        constructor(label: string, isComplement: boolean);
        getLabel(): string;
        isComplement(): boolean;
        equals(other: Action): boolean;
        toString(formatComplement?: boolean): string;
        clone(): Action;
    }
    class Graph {
        protected nextId: number;
        protected nullProcess: NullProcess;
        protected processes: {
            "0": NullProcess;
        };
        protected labelsToProc: any;
        protected procsToLabel: any;
        protected namedProcesses: any;
        protected constructErrors: any[];
        protected definedSets: any;
        protected allRestrictedSets: GrowingIndexedArraySet<LabelSet>;
        protected allRelabellings: GrowingIndexedArraySet<RelabellingSet>;
        protected unguardedRecursionChecker: Traverse.UnguardedRecursionChecker;
        constructor();
        newNamedProcess(processName: string, process: Process): any;
        referToNamedProcess(processName: string): any;
        getNullProcess(): NullProcess;
        newActionPrefixProcess(action: Action, nextProcess: Process): ActionPrefixProcess;
        newSummationProcess(subProcesses: Process[]): SummationProcess;
        newCompositionProcess(subProcesses: Process[]): CompositionProcess;
        newRestrictedProcess(process: any, restrictedLabels: LabelSet): RestrictionProcess;
        newRestrictedProcessOnSetName(process: any, setName: any): RestrictionProcess;
        newRelabelingProcess(process: any, relabellings: RelabellingSet): RelabellingProcess;
        newCollapsedProcess(subProcesses: Process[]): CollapsedProcess;
        defineNamedSet(name: any, labelSet: LabelSet): void;
        processById(id: ProcessId): Process;
        processByName(name: string): Process;
        processByLabel(label: string): Process;
        getNamedProcesses(): string[];
        getLabel(process: Process): string;
        getErrors(): any[];
    }
    class RelabellingSet {
        private froms;
        private tos;
        constructor(relabellings: {
            from: string;
            to: string;
        }[]);
        forEach(f: (from: string, to: string) => void, thisObject?: any): void;
        hasRelabelForLabel(label: string): boolean;
        relabeledActionFor(action: Action): Action;
        equals(other: RelabellingSet): boolean;
        toString(): string;
    }
    class LabelSet {
        private labels;
        constructor(labels: string[]);
        toArray(): string[];
        contains(label: string): boolean;
        empty(): boolean;
        count(): number;
        forEach(f: (label: string) => void, thisObject?: any): void;
        equals(other: LabelSet): boolean;
        union(other: LabelSet): LabelSet;
        static Union(...sets: LabelSet[]): LabelSet;
        toString(): string;
    }
    class Transition {
        action: Action;
        targetProcess: Process;
        constructor(action: Action, targetProcess: Process);
        equals(other: Transition): boolean;
        toString(): string;
    }
    class TransitionSet {
        private transitions;
        constructor(transitions?: Transition[]);
        add(transition: Transition): void;
        contains(transition: Transition): boolean;
        private indexOf(transition);
        addMany(transitions: Transition[]): void;
        unionWith(tSet: TransitionSet): TransitionSet;
        clone(): TransitionSet;
        count(): number;
        applyRestrictionSet(labels: LabelSet): TransitionSet;
        applyRelabelSet(relabels: RelabellingSet): void;
        possibleActions(): Action[];
        transitionsForAction(action: Action): Transition[];
        forEach(f: (transition: Transition) => any): void;
        toArray(): Transition[];
    }
    class StrictSuccessorGenerator implements SuccessorGenerator, ProcessDispatchHandler<TransitionSet> {
        graph: Graph;
        cache: any;
        constructor(graph: Graph, cache?: any);
        getGraph(): Graph;
        getSuccessors(processId: ProcessId): TransitionSet;
        getProcessByName(processName: string): Process;
        getProcessById(processId: ProcessId): Process;
        dispatchNullProcess(process: NullProcess): any;
        dispatchNamedProcess(process: NamedProcess): any;
        dispatchSummationProcess(process: SummationProcess): any;
        dispatchCompositionProcess(process: CompositionProcess): any;
        dispatchActionPrefixProcess(process: ActionPrefixProcess): any;
        dispatchRestrictionProcess(process: RestrictionProcess): any;
        dispatchRelabellingProcess(process: RelabellingProcess): any;
    }
    class GrowingIndexedArraySet<T> {
        private elements;
        constructor();
        getOrAdd(element: T): T;
        get(index: number): T;
        indexOf(element: T): number;
    }
    function getSuccGenerator(graph: Graph, options: any): SuccessorGenerator;
    function getNSuccessors(succGen: CCS.SuccessorGenerator, process: CCS.Process, maxDepth: number): any;
    function reachableProcessIterator(initialProcess: ProcessId, succGen: SuccessorGenerator): any;
    function expandBFS(process: Process, succGen: SuccessorGenerator, maxDepth: number): {
        [id: number]: CCS.TransitionSet;
    };
}
declare module Traverse {
    import ccs = CCS;
    interface Collapse {
        getRepresentative(id: any): ccs.CollapsedProcess;
    }
    class CollapsingSuccessorGenerator implements ccs.SuccessorGenerator {
        private succGenerator;
        private collapse;
        private cache;
        constructor(succGenerator: ccs.SuccessorGenerator, collapse: Collapse);
        getGraph(): ccs.Graph;
        getProcessByName(processName: string): ccs.Process;
        getProcessById(processId: ccs.ProcessId): ccs.Process;
        getSuccessors(processId: ccs.ProcessId): ccs.TransitionSet;
        getCollapseForProcess(processId: ccs.ProcessId): ccs.Process;
    }
}
declare module HML {
    import ccs = CCS;
    interface Formula {
        dispatchOn<T>(dispatcher: FormulaDispatchHandler<T>): T;
        toString(): string;
        id: string;
    }
    interface FormulaVisitor<T> {
        visit(formula: Formula): T;
    }
    interface FormulaDispatchHandler<T> {
        dispatchDisjFormula(formula: DisjFormula): T;
        dispatchConjFormula(formula: ConjFormula): T;
        dispatchTrueFormula(formula: TrueFormula): T;
        dispatchFalseFormula(formula: FalseFormula): T;
        dispatchStrongExistsFormula(formula: StrongExistsFormula): T;
        dispatchStrongForAllFormula(formula: StrongForAllFormula): T;
        dispatchWeakExistsFormula(formula: WeakExistsFormula): T;
        dispatchWeakForAllFormula(formula: WeakForAllFormula): T;
        dispatchMinFixedPointFormula(formula: MinFixedPointFormula): T;
        dispatchMaxFixedPointFormula(formula: MaxFixedPointFormula): T;
        dispatchVariableFormula(formula: VariableFormula): T;
    }
    class DisjFormula implements Formula {
        subFormulas: Formula[];
        private hmlStr;
        constructor(subFormulas: Formula[]);
        dispatchOn<T>(dispatcher: FormulaDispatchHandler<T>): T;
        toString(): string;
        id: string;
    }
    class ConjFormula implements Formula {
        subFormulas: Formula[];
        private hmlStr;
        constructor(subFormulas: Formula[]);
        dispatchOn<T>(dispatcher: FormulaDispatchHandler<T>): T;
        toString(): string;
        id: string;
    }
    class TrueFormula implements Formula {
        dispatchOn<T>(dispatcher: FormulaDispatchHandler<T>): T;
        toString(): string;
        id: string;
    }
    class FalseFormula implements Formula {
        dispatchOn<T>(dispatcher: FormulaDispatchHandler<T>): T;
        toString(): string;
        id: string;
    }
    class StrongExistsFormula implements Formula {
        actionMatcher: ActionMatcher;
        subFormula: Formula;
        private hmlStr;
        constructor(actionMatcher: ActionMatcher, subFormula: Formula);
        dispatchOn<T>(dispatcher: FormulaDispatchHandler<T>): T;
        toString(): string;
        id: string;
    }
    class StrongForAllFormula implements Formula {
        actionMatcher: ActionMatcher;
        subFormula: Formula;
        private hmlStr;
        constructor(actionMatcher: ActionMatcher, subFormula: Formula);
        dispatchOn<T>(dispatcher: FormulaDispatchHandler<T>): T;
        toString(): string;
        id: string;
    }
    class WeakExistsFormula implements Formula {
        actionMatcher: ActionMatcher;
        subFormula: Formula;
        private hmlStr;
        constructor(actionMatcher: ActionMatcher, subFormula: Formula);
        dispatchOn<T>(dispatcher: FormulaDispatchHandler<T>): T;
        toString(): string;
        id: string;
    }
    class WeakForAllFormula implements Formula {
        actionMatcher: ActionMatcher;
        subFormula: Formula;
        private hmlStr;
        constructor(actionMatcher: ActionMatcher, subFormula: Formula);
        dispatchOn<T>(dispatcher: FormulaDispatchHandler<T>): T;
        toString(): string;
        id: string;
    }
    class MinFixedPointFormula implements Formula {
        variable: string;
        subFormula: Formula;
        private hmlStr;
        constructor(variable: string, subFormula: Formula);
        dispatchOn<T>(dispatcher: FormulaDispatchHandler<T>): T;
        toString(): string;
        id: string;
    }
    class MaxFixedPointFormula implements Formula {
        variable: string;
        subFormula: Formula;
        private hmlStr;
        constructor(variable: string, subFormula: Formula);
        dispatchOn<T>(dispatcher: FormulaDispatchHandler<T>): T;
        toString(): string;
        id: string;
    }
    class VariableFormula implements Formula {
        variable: string;
        constructor(variable: string);
        dispatchOn<T>(dispatcher: FormulaDispatchHandler<T>): T;
        toString(): string;
        id: string;
    }
    class FormulaSet {
        private topFormula;
        private formulas;
        private topLevelFormulas;
        private undefinedVariables;
        private errors;
        private falseFormula;
        private trueFormula;
        private actionMatchers;
        constructor();
        newDisj(formulas: Formula[]): DisjFormula;
        newConj(formulas: Formula[]): ConjFormula;
        newTrue(): TrueFormula;
        newFalse(): FalseFormula;
        private newExistOrForAll(structuralPrefix, constructor, actionMatcher, subFormula);
        newStrongExists(actionMatcher: ActionMatcher, subFormula: Formula): any;
        newStrongForAll(actionMatcher: ActionMatcher, subFormula: Formula): any;
        newWeakExists(actionMatcher: ActionMatcher, subFormula: Formula): any;
        newWeakForAll(actionMatcher: ActionMatcher, subFormula: Formula): any;
        newMinFixedPoint(variable: string, subFormula: Formula): MinFixedPointFormula;
        newMaxFixedPoint(variable: string, subFormula: Formula): MaxFixedPointFormula;
        unnamedMinFixedPoint(formula: Formula): Formula;
        referVariable(variable: string): VariableFormula;
        addFormula(formula: Formula): Formula;
        getErrors(): string[];
        formulaByName(variable: string): Formula;
        getVariables(): string[];
        getTopLevelFormulas(): Formula[];
        getTopFormula(): Formula;
        setTopFormula(formula: Formula): void;
        map(fn: (formula: Formula) => Formula): FormulaSet;
    }
    interface ActionMatcher {
        matches(action: ccs.Action): boolean;
        toString(formatComplement?: boolean): string;
    }
    class SingleActionMatcher {
        private action;
        constructor(action: ccs.Action);
        matches(action: ccs.Action): boolean;
        add(action: ccs.Action): ActionMatcher;
        equals(other: any): boolean;
        toString(formatComplement?: boolean): string;
    }
    class ArrayActionMatcher {
        private actions;
        constructor(actions: ccs.Action[]);
        private sortActions();
        matches(action: ccs.Action): boolean;
        add(action: ccs.Action): ActionMatcher;
        equals(other: any): boolean;
        toString(formatComplement?: boolean): string;
    }
    class AllActionMatcher {
        matches(action: ccs.Action): boolean;
        equals(other: any): boolean;
        toString(): string;
    }
}
declare module Traverse {
    import ccs = CCS;
    import hml = HML;
    class LabelledBracketNotation implements ccs.ProcessVisitor<string>, ccs.ProcessDispatchHandler<void> {
        protected stringPieces: string[];
        private recurseOnceForNamedProcess;
        constructor();
        visit(process: ccs.Process): string;
        dispatchNullProcess(process: ccs.NullProcess): void;
        dispatchNamedProcess(process: ccs.NamedProcess): void;
        dispatchSummationProcess(process: ccs.SummationProcess): void;
        dispatchCompositionProcess(process: ccs.CompositionProcess): void;
        dispatchActionPrefixProcess(process: ccs.ActionPrefixProcess): void;
        dispatchRestrictionProcess(process: ccs.RestrictionProcess): void;
        dispatchRelabellingProcess(process: ccs.RelabellingProcess): void;
    }
    class SizeOfProcessTreeVisitor implements ccs.ProcessVisitor<number>, ccs.ProcessDispatchHandler<number> {
        constructor();
        visit(process: ccs.Process): any;
        dispatchNullProcess(process: ccs.NullProcess): number;
        dispatchNamedProcess(process: ccs.NamedProcess): number;
        dispatchSummationProcess(process: ccs.SummationProcess): number;
        dispatchCompositionProcess(process: ccs.CompositionProcess): number;
        dispatchActionPrefixProcess(process: ccs.ActionPrefixProcess): any;
        dispatchRestrictionProcess(process: ccs.RestrictionProcess): any;
        dispatchRelabellingProcess(process: ccs.RelabellingProcess): any;
    }
    function wrapIfInstanceOf(stringRepr: string, object: any, classes: any): string;
    class CCSNotationVisitor implements ccs.ProcessVisitor<string>, ccs.ProcessDispatchHandler<string> {
        private insideNamedProcess;
        protected cache: any;
        constructor();
        clearCache(): void;
        visit(process: ccs.Process): any;
        dispatchNullProcess(process: ccs.NullProcess): string;
        dispatchNamedProcess(process: ccs.NamedProcess): any;
        dispatchSummationProcess(process: ccs.SummationProcess): any;
        dispatchCompositionProcess(process: ccs.CompositionProcess): any;
        dispatchActionPrefixProcess(process: ccs.ActionPrefixProcess): any;
        dispatchRestrictionProcess(process: ccs.RestrictionProcess): any;
        dispatchRelabellingProcess(process: ccs.RelabellingProcess): any;
        dispatchCollapsedProcess(process: ccs.CollapsedProcess): any;
    }
    function safeHtml(str: string): string;
    class HMLNotationVisitor implements hml.FormulaVisitor<string>, hml.FormulaDispatchHandler<string> {
        private showSemicolon;
        private formatComplement;
        private safeHtml;
        private cache;
        constructor(showSemicolon?: boolean, formatComplement?: boolean, safeHtml?: boolean);
        clearCache(): void;
        visit(formula: hml.Formula): any;
        dispatchDisjFormula(formula: hml.DisjFormula): any;
        dispatchConjFormula(formula: hml.ConjFormula): any;
        dispatchTrueFormula(formula: hml.TrueFormula): any;
        dispatchFalseFormula(formula: hml.FalseFormula): any;
        dispatchStrongExistsFormula(formula: hml.StrongExistsFormula): any;
        dispatchStrongForAllFormula(formula: hml.StrongForAllFormula): any;
        dispatchWeakExistsFormula(formula: hml.WeakExistsFormula): any;
        dispatchWeakForAllFormula(formula: hml.WeakForAllFormula): any;
        dispatchMinFixedPointFormula(formula: hml.MinFixedPointFormula): any;
        dispatchMaxFixedPointFormula(formula: hml.MaxFixedPointFormula): any;
        dispatchVariableFormula(formula: hml.VariableFormula): any;
    }
    class HMLSuccGenVisitor implements HML.FormulaVisitor<Array<HML.Formula>>, HML.FormulaDispatchHandler<Array<HML.Formula>> {
        private hmlFormulaSet;
        private isFirst;
        constructor(hmlFormulaSet: HML.FormulaSet);
        visit(formula: HML.Formula): any[];
        private isFirstFormula();
        dispatchDisjFormula(formula: HML.DisjFormula): hml.Formula[];
        dispatchConjFormula(formula: HML.ConjFormula): hml.Formula[];
        dispatchTrueFormula(formula: HML.TrueFormula): any[];
        dispatchFalseFormula(formula: HML.FalseFormula): any[];
        dispatchStrongExistsFormula(formula: HML.StrongExistsFormula): any[];
        dispatchStrongForAllFormula(formula: HML.StrongForAllFormula): any[];
        dispatchWeakExistsFormula(formula: HML.WeakExistsFormula): any[];
        dispatchWeakForAllFormula(formula: HML.WeakForAllFormula): any[];
        dispatchMinFixedPointFormula(formula: HML.MinFixedPointFormula): any[];
        dispatchMaxFixedPointFormula(formula: HML.MaxFixedPointFormula): any[];
        dispatchVariableFormula(formula: HML.VariableFormula): any[];
    }
    class HMLSimplifier implements hml.FormulaDispatchHandler<hml.Formula> {
        private prevSet;
        visit(formulaSet: hml.FormulaSet): hml.FormulaSet;
        visitVariableFreeFormula(formula: hml.Formula): any;
        dispatchDisjFormula(formula: hml.DisjFormula): any;
        dispatchConjFormula(formula: hml.ConjFormula): any;
        dispatchTrueFormula(formula: hml.TrueFormula): hml.TrueFormula;
        dispatchFalseFormula(formula: hml.FalseFormula): hml.FalseFormula;
        dispatchStrongExistsFormula(formula: hml.StrongExistsFormula): any;
        dispatchStrongForAllFormula(formula: hml.StrongForAllFormula): any;
        dispatchWeakExistsFormula(formula: hml.WeakExistsFormula): any;
        dispatchWeakForAllFormula(formula: hml.WeakForAllFormula): any;
        dispatchMinFixedPointFormula(formula: hml.MinFixedPointFormula): any;
        dispatchMaxFixedPointFormula(formula: hml.MaxFixedPointFormula): any;
        dispatchVariableFormula(formula: hml.VariableFormula): hml.VariableFormula;
    }
}
declare module DependencyGraph {
    import ccs = CCS;
    import hml = HML;
    type DgNodeId = any;
    type Hyperedge = Array<DgNodeId>;
    function copyHyperEdges(hyperEdges: Hyperedge[]): Hyperedge[];
    interface PartialDependencyGraph {
        getHyperEdges(identifier: DgNodeId): Hyperedge[];
    }
    interface DependencyGraph extends PartialDependencyGraph {
        getHyperEdges(identifier: DgNodeId): Hyperedge[];
        getAllHyperEdges(): [DgNodeId, Hyperedge][];
    }
    interface PlayableDependencyGraph extends PartialDependencyGraph {
        getAttackerOptions(dgNodeId: DgNodeId): [CCS.Action, CCS.Process, DgNodeId, number][];
        getDefenderOptions(dgNodeId: DgNodeId): [CCS.Process, DgNodeId][];
    }
    class MuCalculusNode {
        process: ccs.Process;
        formula: hml.Formula;
        isMin: boolean;
        constructor(process: ccs.Process, formula: hml.Formula, isMin?: boolean);
        toString(): string;
        id: string;
        newWithProcess(process: ccs.Process): MuCalculusNode;
        newWithMinMax(value: boolean): MuCalculusNode;
        newWithFormula(formula: hml.Formula): MuCalculusNode;
    }
    class MuCalculusDG implements PartialDependencyGraph, hml.FormulaDispatchHandler<any> {
        private strongSuccGen;
        private weakSuccGen;
        private formulaSet;
        private variableEdges;
        private maxFixPoints;
        private currentNode;
        calculator: any;
        constructor(strongSuccGen: ccs.SuccessorGenerator, weakSuccGen: ccs.SuccessorGenerator, formulaSet: hml.FormulaSet);
        getHyperEdges(node: MuCalculusNode): Hyperedge[];
        dispatchDisjFormula(formula: hml.DisjFormula): any[];
        dispatchConjFormula(formula: hml.ConjFormula): any[];
        dispatchTrueFormula(formula: hml.TrueFormula): any[][];
        dispatchFalseFormula(formula: hml.FalseFormula): any[][];
        private existsFormula(formula, succGen);
        private forallFormula(formula, succGen);
        dispatchStrongExistsFormula(formula: hml.StrongExistsFormula): any[];
        dispatchStrongForAllFormula(formula: hml.StrongForAllFormula): any[];
        dispatchWeakExistsFormula(formula: hml.WeakExistsFormula): any[];
        dispatchWeakForAllFormula(formula: hml.WeakForAllFormula): any[];
        dispatchMinFixedPointFormula(formula: hml.MinFixedPointFormula): any;
        dispatchMaxFixedPointFormula(formula: hml.MaxFixedPointFormula): any;
        dispatchVariableFormula(formula: hml.VariableFormula): MuCalculusNode[][];
    }
    function solveMuCalculusForNode(dg: MuCalculusDG, node: MuCalculusNode): any;
    function solveMuCalculus(formulaSet: any, formula: any, strongSuccGen: any, weakSuccGen: any, processId: any): boolean;
    interface Marking {
        getMarking(any: any): number;
        ZERO: number;
        ONE: number;
    }
    interface LevelMarking extends Marking {
        getLevel(any: any): number;
    }
    class MinFixedPointCalculator {
        private nodeSuccGen;
        private Deps;
        private Level;
        private nodesToBeSolved;
        BOTTOM: number;
        ZERO: number;
        ONE: number;
        constructor(nodeSuccGen: any);
        solve(solveNode?: any): void;
        solveSingle(solveNode: any): void;
        addNodeToBeSolved(node: any): void;
        getMarking(node: any): any;
        getLevel(node: any): number;
    }
    function liuSmolkaLocal2(m: DgNodeId, graph: PartialDependencyGraph): LevelMarking;
    function solveDgGlobalLevel(graph: DependencyGraph): LevelMarking;
}
declare module Equivalence {
    import ccs = CCS;
    import hml = HML;
    import dg = DependencyGraph;
    /**
        This class construct a bisimulation dependency graph.

        It is extended with method for selecting AI choice for the DG-Games, and
        other utility methods like finding distinguishing formula or performing
        bisimulation collapse
    */
    class BisimulationDG implements dg.DependencyGraph, dg.PlayableDependencyGraph {
        private attackSuccGen;
        private defendSuccGen;
        /** The dependency graph is constructed such a minimum fixed point
            of 1 indicates the processes diverge. Since bisimulation is
            maximal fixed-point, the result marking should be
            inverted **/
        private nextIdx;
        private nodes;
        private constructData;
        private leftPairs;
        private isFullyConstructed;
        constructor(attackSuccGen: ccs.SuccessorGenerator, defendSuccGen: ccs.SuccessorGenerator, leftNode: ccs.ProcessId, rightNode: ccs.ProcessId);
        getHyperEdges(identifier: dg.DgNodeId): dg.Hyperedge[];
        private constructNode(identifier);
        getAllHyperEdges(): [dg.DgNodeId, dg.Hyperedge][];
        private getNodeForLeftTransition(data);
        private getNodeForRightTransition(data);
        private getOrCreatePairNode(leftId, rightId);
        private getProcessPairStates(leftProcessId, rightProcessId);
        getAttackerOptions(dgNodeId: dg.DgNodeId): [CCS.Action, CCS.Process, dg.DgNodeId, number][];
        getDefenderOptions(dgNodeId: dg.DgNodeId): [CCS.Process, dg.DgNodeId][];
        addReachablePairs(fromProcess: ccs.ProcessId): void;
        getBisimulationCollapse(marking: dg.LevelMarking, graph: ccs.Graph): Traverse.Collapse;
        findDistinguishingFormula(marking: dg.LevelMarking, isWeak: boolean): hml.Formula;
    }
    class SimulationDG implements dg.DependencyGraph, dg.PlayableDependencyGraph {
        private attackSuccGen;
        private defendSuccGen;
        private nextIdx;
        private nodes;
        private constructData;
        private leftPairs;
        private isFullyConstructed;
        constructor(attackSuccGen: ccs.SuccessorGenerator, defendSuccGen: ccs.SuccessorGenerator, leftNode: any, rightNode: any);
        getHyperEdges(identifier: dg.DgNodeId): dg.Hyperedge[];
        private constructNode(identifier);
        getAllHyperEdges(): [dg.DgNodeId, dg.Hyperedge][];
        private getNodeForLeftTransition(data);
        private getProcessPairStates(leftProcessId, rightProcessId);
        getAttackerOptions(dgNodeId: dg.DgNodeId): [CCS.Action, CCS.Process, dg.DgNodeId, number][];
        getDefenderOptions(dgNodeId: dg.DgNodeId): [CCS.Process, dg.DgNodeId][];
    }
    function isBisimilar(attackSuccGen: ccs.SuccessorGenerator, defendSuccGen: ccs.SuccessorGenerator, leftProcessId: any, rightProcessId: any, graph?: any): boolean;
    function isSimilar(attackSuccGen: ccs.SuccessorGenerator, defendSuccGen: ccs.SuccessorGenerator, leftProcessId: any, rightProcessId: any): boolean;
    function getBisimulationCollapse(attackSuccGen: ccs.SuccessorGenerator, defendSuccGen: ccs.SuccessorGenerator, leftProcessId: any, rightProcessId: any): Traverse.Collapse;
    class TraceDG implements dg.DependencyGraph {
        private attackSuccGen;
        private nextIdx;
        private constructData;
        private nodes;
        private leftPairs;
        private isFullyConstructed;
        constructor(leftNode: ccs.ProcessId, rightNode: ccs.ProcessId, attackSuccGen: ccs.SuccessorGenerator);
        getHyperEdges(identifier: dg.DgNodeId): dg.Hyperedge[];
        getAllHyperEdges(): [dg.DgNodeId, dg.Hyperedge][];
        private constructNode(identifier);
        private getProcessPairStates(leftProcessId, rightProcessIds);
        getDistinguishingFormula(marking: dg.LevelMarking): string;
    }
    function isTraceIncluded(attackSuccGen: ccs.SuccessorGenerator, defendSuccGen: ccs.SuccessorGenerator, leftProcessId: any, rightProcessId: any, graph?: any): {
        isSatisfied: boolean;
        formula: string;
    };
}
declare module Traverse {
    import ccs = CCS;
    class ProcessTreeReducer implements ccs.ProcessVisitor<ccs.Process>, ccs.ProcessDispatchHandler<ccs.Process> {
        graph: ccs.Graph;
        protected cache: {
            [id: number]: ccs.Process;
        };
        constructor(graph: ccs.Graph);
        visit(process: ccs.Process): ccs.Process;
        dispatchNullProcess(process: ccs.NullProcess): any;
        dispatchNamedProcess(process: ccs.NamedProcess): ccs.NamedProcess;
        dispatchSummationProcess(process: ccs.SummationProcess): any;
        dispatchCompositionProcess(process: ccs.CompositionProcess): any;
        dispatchActionPrefixProcess(process: ccs.ActionPrefixProcess): any;
        dispatchRestrictionProcess(process: ccs.RestrictionProcess): any;
        dispatchRelabellingProcess(process: ccs.RelabellingProcess): any;
    }
    class AbstractingSuccessorGenerator implements ccs.SuccessorGenerator {
        private abstractions;
        strictSuccGenerator: ccs.SuccessorGenerator;
        cache: any;
        private fromTable;
        constructor(abstractions: ccs.Action[], strictSuccGenerator: ccs.SuccessorGenerator, cache?: any);
        getAbstractions(): ccs.Action[];
        getGraph(): ccs.Graph;
        getProcessByName(processName: string): ccs.Process;
        getProcessById(processId: ccs.ProcessId): ccs.Process;
        getSuccessors(sourceProcessId: ccs.ProcessId): ccs.TransitionSet;
        getStrictPath(fromId: ccs.ProcessId, action: ccs.Action, toId: ccs.ProcessId): ccs.Transition[];
    }
    class WeakSuccessorGenerator extends AbstractingSuccessorGenerator {
        constructor(strictSuccGenerator: ccs.SuccessorGenerator, cache?: any);
    }
    class ReducingSuccessorGenerator implements ccs.SuccessorGenerator {
        succGenerator: ccs.SuccessorGenerator;
        reducer: ProcessTreeReducer;
        constructor(succGenerator: ccs.SuccessorGenerator, reducer: ProcessTreeReducer);
        getGraph(): ccs.Graph;
        getProcessByName(processName: string): ccs.Process;
        getProcessById(processId: ccs.ProcessId): ccs.Process;
        getSuccessors(processId: ccs.ProcessId): ccs.TransitionSet;
        private reduceSuccessors(transitionSet);
    }
}
declare module TCCS {
    interface ProcessDispatchHandler<T> extends CCS.ProcessDispatchHandler<T> {
        dispatchDelayPrefixProcess(process: DelayPrefixProcess, ...args: any[]): T;
    }
    class DelayPrefixProcess implements CCS.Process {
        delay: Delay;
        nextProcess: CCS.Process;
        private ccs;
        constructor(delay: Delay, nextProcess: CCS.Process);
        dispatchOn<T>(dispatcher: ProcessDispatchHandler<T>): T;
        toString(): string;
        id: string;
    }
    class Delay extends CCS.Action {
        private delay;
        constructor(delay: number);
        getDelay(): number;
        toString(): string;
        clone(): Delay;
    }
    class DelayTransition extends CCS.Transition {
        delay: Delay;
        constructor(delay: Delay, targetProcess: CCS.Process);
        toString(): string;
    }
    class Graph extends CCS.Graph {
        constructor();
        newDelayPrefixProcess(delay: Delay, nextProcess: CCS.Process): DelayPrefixProcess;
    }
    class StrictSuccessorGenerator extends CCS.StrictSuccessorGenerator implements ProcessDispatchHandler<CCS.TransitionSet> {
        protected tccsgraph: Graph;
        private tauFoundCache;
        private delaySuccessor;
        constructor(tccsgraph: Graph, cache?: any);
        getSuccessors(processId: CCS.ProcessId): CCS.TransitionSet;
        private checkTransitionsForTau(process, transitions);
        dispatchNullProcess(process: CCS.NullProcess): CCS.TransitionSet;
        dispatchNamedProcess(process: CCS.NamedProcess): CCS.TransitionSet;
        dispatchSummationProcess(process: CCS.SummationProcess): CCS.TransitionSet;
        dispatchCompositionProcess(process: CCS.CompositionProcess): CCS.TransitionSet;
        dispatchActionPrefixProcess(process: CCS.ActionPrefixProcess): CCS.TransitionSet;
        dispatchRestrictionProcess(process: CCS.RestrictionProcess): any;
        dispatchRelabellingProcess(process: CCS.RelabellingProcess): any;
        dispatchDelayPrefixProcess(process: TCCS.DelayPrefixProcess): CCS.TransitionSet;
    }
    class DelaySuccessor implements CCS.ProcessVisitor<DelayTransition>, ProcessDispatchHandler<CCS.Process> {
        private graph;
        private cache;
        private delayFoundCache;
        constructor(graph: Graph);
        visit(process: CCS.Process): DelayTransition;
        dispatchNullProcess(process: CCS.NullProcess): CCS.Process;
        dispatchNamedProcess(process: CCS.NamedProcess): CCS.Process;
        dispatchSummationProcess(process: CCS.SummationProcess): CCS.Process;
        dispatchCompositionProcess(process: CCS.CompositionProcess): CCS.Process;
        dispatchActionPrefixProcess(process: CCS.ActionPrefixProcess): CCS.Process;
        dispatchRestrictionProcess(process: CCS.RestrictionProcess): CCS.Process;
        dispatchRelabellingProcess(process: CCS.RelabellingProcess): CCS.Process;
        dispatchDelayPrefixProcess(process: DelayPrefixProcess): CCS.Process;
    }
}
declare module Traverse {
    class TCCSLabelledBracketNotation extends Traverse.LabelledBracketNotation implements CCS.ProcessVisitor<string>, TCCS.ProcessDispatchHandler<void> {
        dispatchDelayPrefixProcess(process: TCCS.DelayPrefixProcess): void;
    }
    class TCCSNotationVisitor extends Traverse.CCSNotationVisitor implements CCS.ProcessVisitor<string>, TCCS.ProcessDispatchHandler<string> {
        dispatchDelayPrefixProcess(process: TCCS.DelayPrefixProcess): any;
    }
    class TCCSUnguardedRecursionChecker extends Traverse.UnguardedRecursionChecker implements TCCS.ProcessDispatchHandler<boolean> {
        dispatchDelayPrefixProcess(process: TCCS.DelayPrefixProcess): boolean;
    }
    class TCCSProcessTreeReducer extends Traverse.ProcessTreeReducer implements CCS.ProcessVisitor<CCS.Process>, TCCS.ProcessDispatchHandler<CCS.Process> {
        private tccsgraph;
        constructor(tccsgraph: TCCS.Graph);
        dispatchDelayPrefixProcess(process: TCCS.DelayPrefixProcess): any;
    }
    class UntimedSuccessorGenerator extends Traverse.AbstractingSuccessorGenerator {
        constructor(strictSuccGenerator: CCS.SuccessorGenerator, cache?: any);
    }
    class WeakUntimedSuccessorGenerator extends Traverse.AbstractingSuccessorGenerator {
        constructor(strictSuccGenerator: CCS.SuccessorGenerator, cache?: any);
    }
}
