declare module ArrayUtil {
    function removeConsecutiveDuplicates<T>(array: Array<T>, byKeyFn?: (val: T) => any): Array<T>;
    function sortAndRemoveDuplicates<T>(array: Array<T>, byKeyFn?: (val: T) => any): T[];
    function keyFnToComparerFn<T>(keyFn: (val: T) => any): (a: T, b: T) => number;
    function intersperse<T>(array: Array<T>, element: T): Array<T>;
    function selectBest<T>(array: Array<T>, isBetter: (a: T, b: T) => boolean): T;
    function groupBy<T>(arr: T[], keyFn: (T) => any): any;
    function first<T>(arr: T[], pred: (T) => boolean): T;
}
