/// <reference path="ccs.d.ts" />
/// <reference path="jquery.d.ts" />
/// <reference path="ace.d.ts" />
/// <reference path="../src/gui/jquery.hotkeys.d.ts" />
/// <reference path="arbor.d.ts" />
/// <reference path="suppressWarnings.d.ts" />
/// <reference path="util.d.ts" />
/// <reference path="bootstrap.d.ts" />
declare enum PropertyStatus {
    satisfied = 0,
    unsatisfied = 1,
    invalid = 2,
    unknown = 3,
}
declare module Property {
    class Property {
        private static counter;
        protected id: number;
        private error;
        private timer;
        private elapsedTime;
        private $timeCell;
        private $row;
        protected project: Project;
        protected worker: any;
        protected comment: string;
        protected status: PropertyStatus;
        icons: {
            "checkmark": JQuery;
            "cross": JQuery;
            "triangle": JQuery;
            "questionmark": JQuery;
        };
        constructor(status?: PropertyStatus);
        getId(): number;
        getStatus(): PropertyStatus;
        getComment(): string;
        getRow(): JQuery;
        setRow($row: JQuery): void;
        setTimeCell($timeCell: JQuery): void;
        getElapsedTime(): string;
        startTimer(): void;
        stopTimer(): void;
        getStatusIcon(): JQuery;
        protected setInvalidateStatus(error?: string): void;
        setUnknownStatus(): void;
        abortVerification(): void;
        verify(callback: Function): void;
        protected workerFinished(event: any, callback: Function): void;
        protected onWorkerFinished(event: any): void;
        protected getWorkerMessage(): any;
        getDescription(): string;
        toJSON(): any;
        isReadyForVerification(): boolean;
        getGameConfiguration(): any;
    }
    class HML extends Property {
        private process;
        private definitions;
        private topFormula;
        constructor(options: any, status?: PropertyStatus);
        getProcess(): string;
        getTopFormula(): string;
        setTopFormula(formula: string): void;
        getDefinitions(): string;
        getDescription(): string;
        getGameConfiguration(): any;
        toJSON(): any;
        /**
         * Checks whehter the process is defined, and the property is not invalid, and the HML syntactically correct.
         * @return {boolean} if true everything is defined correctly.
         */
        isReadyForVerification(): boolean;
        protected getWorkerMessage(): any;
    }
    class Relation extends Property {
        protected propertyType: any;
        protected firstProcess: string;
        protected secondProcess: string;
        protected type: string;
        protected time: string;
        constructor(options: any, status?: PropertyStatus);
        getFirstProcess(): string;
        getSecondProcess(): string;
        getType(): string;
        getTime(): string;
        protected getTimeSubscript(): string;
        getGameConfiguration(): any;
        toJSON(): any;
        protected getWorkerMessage(): any;
        /**
         * Check whether both process(first and second) is defined, and it exists in the CCS program.
         * And property status must not be invalid.
         * @return {boolean} if true, everything is defined.
         */
        isReadyForVerification(): boolean;
        protected getClassName(): string;
        protected getWorkerHandler(): string;
    }
    class DistinguishingFormula extends Relation {
        constructor(options: any, status?: PropertyStatus);
        generateDistinguishingFormula(generationEnded: Function): void;
    }
    class Bisimulation extends DistinguishingFormula {
        constructor(options: any, status?: PropertyStatus);
        generateDistinguishingFormula(generationEnded: Function): void;
        getDescription(): string;
        getClassName(): string;
        protected getWorkerHandler(): string;
    }
    class Simulation extends Relation {
        constructor(options: any, status?: PropertyStatus);
        getDescription(): string;
        getClassName(): string;
        protected getWorkerHandler(): string;
    }
    class SimulationEquivalence extends Relation {
        constructor(options: any, status?: PropertyStatus);
        getDescription(): string;
        getGameConfiguration(): any;
        getClassName(): string;
        protected getWorkerHandler(): string;
    }
    class Traces extends DistinguishingFormula {
        private formula;
        constructor(options: any, status: PropertyStatus);
        getGameConfiguration(): any;
        protected workerFinished(event: any, callback: Function): void;
        generateDistinguishingFormula(generationEnded: Function): void;
    }
    class TraceEquivalence extends Traces {
        constructor(options: any, status?: PropertyStatus);
        getDescription(): string;
        getClassName(): string;
        protected getWorkerHandler(): string;
    }
    class TraceInclusion extends Traces {
        constructor(options: any, status?: PropertyStatus);
        getDescription(): string;
        getClassName(): string;
        protected getWorkerHandler(): string;
    }
}
declare enum InputMode {
    CCS = 0,
    TCCS = 1,
}
declare class Project {
    private static instance;
    private defaultTitle;
    private defaultCCS;
    private id;
    private $projectTitle;
    private ccs;
    private properties;
    private changed;
    private inputMode;
    constructor();
    static getInstance(): Project;
    reset(): void;
    update(id: number, title: string, ccs: string, properties: any[], inputMode: string): void;
    getId(): number;
    setId(id: number): void;
    getTitle(): string;
    setTitle(title: string): void;
    private onTitleChanged();
    getCCS(): string;
    setCCS(ccs: string): void;
    getProperties(): Property.Property[];
    setProperties(properties: any[]): void;
    addProperty(property: Property.Property): void;
    addPropertyAfter(id: number, property: Property.Property): void;
    deleteProperty(property: Property.Property): void;
    getFormulaSetsForProperties(): {};
    private createFormulaSetFromProperty(property);
    isChanged(): boolean;
    setChanged(changed: boolean): void;
    getInputMode(): InputMode;
    private updateInputModeToggle();
    setInputMode(inputMode: InputMode): void;
    getGraph(): CCS.Graph;
    isSaved(): boolean;
    toJSON(): any;
}
declare class WebStorage {
    private storageObj;
    constructor(storageObj: Storage);
    getStorageObj(): Storage;
    get(key: string): string;
    getObj(key: string): any;
    set(key: string, value: string): void;
    setObj(key: string, value: Object): void;
    delete(key: string): void;
    private isCompatible();
}
declare module Activity {
    class Activity {
        protected project: Project;
        protected changed: boolean;
        protected $container: JQuery;
        protected $button: JQuery;
        protected $activeToggle: JQuery;
        constructor(container: string, button: string, activeToggle?: string);
        getContainer(): JQuery;
        getButton(): JQuery;
        getActiveToggle(): JQuery;
        protected showMessageBox(title: string, message: string): void;
        protected checkPreconditions(): boolean;
        onShow(configuration?: any): void;
        onHide(): void;
    }
}
declare module Activity {
    class ActivityHandler {
        private currentActivity;
        private activities;
        addActivity(name: string, activity: Activity.Activity): void;
        selectActivity(name: string, configuration?: any): void;
    }
}
declare class MenuItem {
    protected $button: JQuery;
    protected activityHandler: Activity.ActivityHandler;
    protected project: Project;
    protected storage: WebStorage;
    protected session: WebStorage;
    protected $confirmModal: JQuery;
    protected $confirmModalNo: JQuery;
    protected $confirmModalYes: JQuery;
    constructor(button: string, activityHandler: Activity.ActivityHandler);
    protected onClick(e: any): void;
    protected showConfirmModal(title: string, message: string, noText: string, yesText: string, noCallback: () => void, yesCallback: () => void): void;
}
declare class Save extends MenuItem {
    private $saveFileButton;
    private $saveMyProjectsButton;
    constructor(button: string, activityHandler: Activity.ActivityHandler);
    private saveToFile();
    saveToStorage(): void;
    private nextId();
}
declare class New extends MenuItem {
    protected onClick(e: any): void;
}
declare var examples: any[];
declare class Load extends MenuItem {
    private $loadFileButton;
    private $fileInput;
    constructor(button: string, activityHandler: Activity.ActivityHandler);
    private readFile(e);
    private loadFromFile();
    private loadFromStorage(e);
    private loadExample(e);
    private showProjects();
    private showExamples();
}
declare class Delete extends MenuItem {
    constructor(button: string, activityHandler: Activity.ActivityHandler);
    private deleteFromStorage(e);
    private showProjects();
}
declare var PDFDocument: any;
declare var blobStream: any;
declare class Export extends MenuItem {
    private doc;
    protected onClick(e: any): void;
    private addLine(text);
}
declare class HotkeyHandler {
    setGlobalHotkeys(activityHandler: Activity.ActivityHandler, save: Save): void;
}
declare class AutoSave {
    private project;
    private storage;
    private timer;
    private DELAY;
    constructor();
    autoSaveToStorage(): void;
    resetTimer(): void;
    checkAutosave(): boolean;
    getAutosave(): any;
    setAutosave(value: any): void;
}
declare module ContactForm {
    function init(): void;
}
declare module Activity {
    class Editor extends Activity {
        private $editor;
        private $parse;
        private editor;
        private autosave;
        private initialCCS;
        constructor(container: string, button: string);
        protected checkPreconditions(): boolean;
        onShow(configuration?: any): void;
        onHide(): void;
        private parse();
        private showPopover(title, content, sticky);
        private handleClick;
        private setInputMode(e);
        private setFontSize(e);
        private updateHeight();
        private resize();
    }
}
declare module GUI {
    interface ProcessGraphUI {
        clearAll(): void;
        showProcess(identifier: any, data: any): void;
        getProcessDataObject(identifier: any): any;
        getNode(name: string): Node;
        getPosition(name: string): Point;
        showTransitions(fromId: any, toId: any, datas: any[]): any;
        getTransitionDataObjects(fromId: any, toId: any): any[];
        setOnSelectListener(f: (identifier) => void): void;
        clearOnSelectListener(): void;
        setHoverOnListener(f: (identifier) => void): void;
        clearHoverOnListener(): void;
        setHoverOutListener(f: (identifier) => void): void;
        clearHoverOutListener(): void;
        setSelected(name: string): void;
        getSelected(): string;
        highlightToNode(name: string): void;
        clearHighlights(): void;
        highlightEdge(from: string, to: string): any;
        freeze(): void;
        unfreeze(): void;
        bindCanvasEvents(): void;
        unbindCanvasEvents(): void;
    }
    function highlightTransitions(uiGraph: any, startId: any, transitions: any): void;
}
declare var counter: number;
declare class Handler {
    selectedNode: Node;
    draggedObject: refNode;
    hoverNode: refNode;
    mouseP: Point;
    onClick: Function;
    onHover: Function;
    onHoverOut: Function;
    private isDragging;
    private mouseDownPos;
    clickDistance: number;
    hoverDistance: number;
    renderer: Renderer;
    constructor(renderer: Renderer);
    bindCanvasEvents(): void;
    unbindCanvasEvents(): void;
    mousedown: (e: any) => boolean;
    hover: (e: any) => boolean;
    dragged: (e: any) => boolean;
    dropped: (e: any) => boolean;
}
declare class Renderer {
    private nodeBoxes;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    gfx: any;
    particleSystem: ParticleSystem;
    private nodeStatusColors;
    private highlightSettings;
    constructor(canvas: HTMLCanvasElement);
    init(system: ParticleSystem): void;
    resize(width: any, height: any): void;
    redraw(): void;
    drawSelfEdge(pt1: any, pt2: any, arrowLength: any, arrowWidth: any, chevronColor: any, label: any, nodeBox: any): void;
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
    drawNormalEdge(pt1: Point, pt2: Point, nodeBox1: any, nodeBox2: any, arrowLength: number, arrowWidth: number, chevronColor: string, label: string): void;
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
    drawBendingEdge(pt1: Point, pt2: Point, nodeBox1: any, nodeBox2: any, arrowLength: number, arrowWidth: number, chevronColor: string, label: string): void;
    /**
     * Draws the rectangle of the node
     * @param {Node}  node
     * @param {Point} pt
     */
    private drawRectNode(node, pt);
    /**
     * Draws the label upon the edge
     * @param {number}                   x     the x coordinate
     * @param {number}                   y     the y coordinate
     * @param {string}                   label the text to be written.
     * @param {CanvasRenderingContext2D} ctx   the canvas to draw on.
     */
    private drawLabel(x, y, label, color?);
    /**
     * Draws the arrowhead
     * @param {number}                   arrowLength the length of the arrowhead
     * @param {number}                   arrowWidth  the width of the arrowhead
     * @param {string}                   color       the color of the arrowhead
     * @param {CanvasRenderingContext2D} ctx         the canvas
     */
    private drawChevron(arrowLength, arrowWidth, color);
    private intersect_line_line(p1, p2, p3, p4);
    private intersect_line_box(p1, p2, boxTuple);
}
declare module GUI {
    class ArborGraph implements GUI.ProcessGraphUI {
        private sys;
        private renderer;
        private handler;
        private highlightedEdges;
        private selectedNode;
        constructor(renderer: any, options?: {
            repulsion: number;
            stiffness: number;
            friction: number;
            integrator: string;
        });
        showProcess(nodeId: string, data: Object): void;
        getProcessDataObject(nodeId: string): Object;
        getNode(name: string): Node;
        getPosition(name: string): Point;
        showTransitions(fromId: string, toId: string, datas: Object[]): void;
        setSelected(name: string): void;
        getSelected(): string;
        highlightToNode(name: string): void;
        clearHighlights(): void;
        highlightEdge(from: string, to: string): void;
        private highlightEdgeNodes(from, to);
        getTransitionDataObjects(fromId: string, toId: string): Object[];
        setOnSelectListener(f: (identifier: string) => void): void;
        clearOnSelectListener(): void;
        setHoverOnListener(f: (identifier: string) => void): void;
        clearHoverOutListener(): void;
        setHoverOutListener(f: (identifier: string) => void): void;
        clearHoverOnListener(): void;
        clearAll(): void;
        freeze(): void;
        unfreeze(): void;
        bindCanvasEvents(): void;
        unbindCanvasEvents(): void;
    }
}
declare module Activity {
    class Fullscreen {
        private container;
        private $button;
        private onChanged;
        constructor(container: HTMLElement, $button: JQuery, onChanged: Function);
        onShow(): void;
        onHide(): void;
        isFullscreen(): boolean;
        toggleFullscreen(): void;
        private fullscreenChanged();
        private fullscreenError();
    }
}
declare module Activity {
    function addTooltips(): void;
    class Tooltip {
        protected $container: JQuery;
        constructor($container: JQuery, titleFunction: Function, selectorClass: string);
        static wrapProcess(text: string): JQuery;
        static wrap(text: string): JQuery;
        static setTooltip($element: JQuery, text: string): JQuery;
        static strongSequence(abstractingSuccGen: Traverse.AbstractingSuccessorGenerator, source: CCS.Process, action: CCS.Action, target: CCS.Process, graph?: any): string;
    }
    class ProcessTooltip extends Tooltip {
        private visitor;
        private graph;
        constructor($container: JQuery);
        ccsNotationForProcessId(idOrName: string): string;
        setGraph(graph: CCS.Graph): void;
    }
    class DataTooltip extends Tooltip {
        constructor($container: JQuery);
    }
}
declare module Activity {
    class Explorer extends Activity {
        private graph;
        private succGenerator;
        private selectedProcess;
        private lastSelectedProcess;
        private fullscreen;
        private $canvasContainer;
        private $statusContainer;
        private $statusTable;
        private tooltip;
        private timeout;
        private $ccsOptions;
        private $tccsOptions;
        private $zoom;
        private $depth;
        private $freeze;
        private $save;
        private canvas;
        private renderer;
        private uiGraph;
        private options;
        constructor(container: string, button: string);
        onShow(configuration?: any): void;
        onHide(): void;
        private displayOptions();
        private getOptions();
        private draw();
        private save();
        private setDepth(depth);
        private isFreezeSet();
        private toggleFreeze(freeze);
        private showProcess(process);
        private expand(process);
        private updateStatusTable(transitions);
        private sourceText(process);
        private onTransitionTableRowHover(entering, event);
        private highlightStrictPath(action, toTargetId);
        private onTransitionTableRowClick(e);
        private showProcessAsExplored(process);
        private centerProcess(process);
        private resize(zoom);
    }
}
declare module Activity {
    class Verifier extends Activity {
        private graph;
        private timer;
        private queue;
        private verifyingProperty;
        private formulaEditor;
        private definitionsEditor;
        constructor(container: string, button: string);
        onShow(): void;
        onHide(): void;
        private displayProperty(property);
        private displayProperties();
        private generateContextMenu(property, $element);
        private setPropertyModalOptions();
        private showPropertyModal(e?);
        private getSelectedPropertyType();
        private setSelectedPropertyType(value);
        private showSelectedPropertyType();
        private saveProperty(e?);
        private deleteProperty(e);
        private verify(e);
        private verifyNext();
        private verifyAll();
        private stopVerify();
        private verificationEnded(property);
        private enableVerification();
        private disableVerification();
    }
}
declare module Activity {
    class Game extends Activity {
        private graph;
        private succGen;
        private dgGame;
        private fullscreen;
        private tooltip;
        private timeout;
        private $leftProcessList;
        private $rightProcessList;
        private $ccsGameTypes;
        private $tccsGameTypes;
        private $gameRelation;
        private $playerType;
        private $restart;
        private $leftContainer;
        private $rightContainer;
        private $leftZoom;
        private $rightZoom;
        private $leftDepth;
        private $rightDepth;
        private $leftFreeze;
        private $rightFreeze;
        private leftCanvas;
        private rightCanvas;
        private leftRenderer;
        private rightRenderer;
        private leftGraph;
        private rightGraph;
        constructor(container: string, button: string, activeToggle: string);
        getSuccessorGenerator(): CCS.SuccessorGenerator;
        getGraph(): CCS.Graph;
        private setDepth(process, graph, depth, move);
        private validateDepth($input);
        private toggleFreeze(graph, freeze, button);
        onShow(configuration?: any): void;
        onHide(): void;
        private displayOptions();
        private getOptions();
        private setOptions(options);
        private newGame(drawLeft, drawRight, configuration?);
        private draw(process, graph, depth);
        private showProcess(process, graph);
        private showProcessAsExplored(process, graph);
        onPlay(strictPath: CCS.Transition[], move: Move): void;
        highlightNodes(): void;
        highlightChoices(isLeft: boolean, targetId: string): void;
        removeHighlightChoices(isLeft: boolean): void;
        private clear(graph);
        labelFor(process: CCS.Process): string;
        centerNode(process: CCS.Process, move: Move): void;
        private resize(leftZoom, rightZoom);
    }
    enum PlayType {
        Attacker = 0,
        Defender = 1,
    }
    enum Move {
        Right = 0,
        Left = 1,
    }
}
declare module GUI.Widget {
    class ZoomableProcessExplorer {
        private zoomMax;
        private zoomMin;
        private zoomStep;
        private zoomDefault;
        private $zoomRange;
        private $freezeBtn;
        private $depthInput;
        private isFrozen;
        private root;
        private canvasContainer;
        private canvas;
        private hoverTimeoutListener;
        private hoverLeaveListener;
        private hoverTimeout;
        private hoverTimeoutDelay;
        private renderer;
        private graphUI;
        succGen: CCS.SuccessorGenerator;
        graph: CCS.Graph;
        private currentZoom;
        private expandDepth;
        constructor();
        getGraphUI(): ProcessGraphUI;
        getRootElement(): HTMLElement;
        getCanvasContainer(): HTMLElement;
        setExpandDepth(depth: any): void;
        setZoom(zoomFactor: number): void;
        clearFreeze(): void;
        private toggleFreeze(freeze);
        private getSelectedProcess();
        resize(width: any, height: any): void;
        exploreProcess(process: CCS.Process): void;
        focusOnProcess(process: CCS.Process): void;
        clear(): void;
        setOnHoverTimeout(callback: (processId, position) => void, msTimeout: number): void;
        setOnHoverLeave(callback: (processId) => void): void;
        private drawProcessInternal(process, expandDepth);
        drawProcess(process: CCS.Process): void;
        private showProcessAsExplored(process);
        showProcess(process: CCS.Process): void;
        private labelFor(process);
        private setupRange();
        private setupFreezeBtn();
        private setupDepthInput();
    }
}
declare module GUI.Widget {
    type SelectListener = (transition: CCS.Transition) => void;
    type HoverEnterListener = SelectListener;
    type HoverLeaveListener = SelectListener;
    class TransitionTable {
        private table;
        private body;
        private transitions;
        onSelectListener: SelectListener;
        onHoverEnterListener: HoverEnterListener;
        onHoverLeaveListener: HoverLeaveListener;
        graph: CCS.Graph;
        constructor();
        setTransitions(source: any, transitions: CCS.Transition[], abstractingSuccGen: CCS.SuccessorGenerator): void;
        getRootElement(): HTMLElement;
        private labelWithTooltip(process);
        private labelFor(process);
        private transitionFromDelegateEvent(event);
        private onRowClicked(event);
        private onRowHoverEnter(event);
        private onRowHoverLeave(event);
    }
}
declare module GUI.Widget {
    type HMLSelectListener = (formula: HML.Formula) => void;
    class FormulaSelector {
        private root;
        private table;
        private body;
        private paragraph;
        private currentSubFormulas;
        private currentHmlSet;
        onSelectListener: HMLSelectListener;
        constructor();
        getRootElement(): HTMLElement;
        setFormulaSet(hmlFormulaSet: HML.FormulaSet): void;
        setFormula(hmlSubFormulas: HML.Formula[]): void;
        private subformulaFromDelegateEvent(event);
        private onSubformulaClick(event);
    }
}
declare module GUI.Widget {
    type htmlWrapper = {
        tag: string;
        attr?: [{
            name: string;
            value: string;
        }];
    };
    type GameLogObjectRow = {
        text: string;
        htmlWrapper?: htmlWrapper;
    };
    class GameLog {
        private log;
        private round;
        constructor();
        getRootElement(): HTMLElement;
        reset(): void;
        deleteTempRows(): void;
        private newRound();
        printToGameLog(gameLogObject: GameLogObject): void;
        private render(gameLogObject);
    }
    class GameLogObject {
        private graph;
        private template;
        private context;
        private wrapper;
        private isNewRound;
        constructor(graph: CCS.Graph);
        addLabel(row: GameLogObjectRow, index?: number): void;
        setNewRound(isNewRound: boolean): void;
        getNewRound(): boolean;
        addWrapper(wrapper: htmlWrapper): void;
        getWrapper(): htmlWrapper;
        setTemplate(template: string): void;
        getTemplate(): string;
        getContext(): GameLogObjectRow[];
        labelForProcess(process: CCS.Process): string;
        labelForFormula(formula: HML.Formula): string;
    }
}
declare module Activity {
    class HmlGame extends Activity {
        private currentSubActivity;
        private hmlGameActivity;
        constructor(container: string, button: string, activeToggle: string);
        onShow(configuration?: any): void;
        private setOptionsDom(subActivity);
        onHide(): void;
        protected checkPreconditions(): boolean;
    }
}
declare var CCSParser: any;
declare var TCCSParser: any;
declare var HMLParser: any;
declare var THMLParser: any;
import ccs = CCS;
import hml = HML;
declare module Main {
    var activityHandler: Activity.ActivityHandler;
    function showNotification(text: string, time: number): void;
    function getVersion(): string;
}
