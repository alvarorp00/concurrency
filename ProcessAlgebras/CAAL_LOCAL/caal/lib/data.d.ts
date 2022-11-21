declare module MapUtil {
    interface Map<K, V> {
        set(key: K, val: V): void;
        get(key: K): V;
        has(key: K): boolean;
        size(): number;
        forEach(f: (val: V, index: K) => void, thisArg?: any): void;
    }
    var OrderedMap: {
        new <K, V>(compare: (a: K, b: K) => number): Map<K, V>;
    };
}
declare module SetUtil {
    interface Set<T> {
        add(value: T): void;
        forEach(f: (val: T, index: T) => void, thisObject?: any): void;
        has(value: T): boolean;
        size(): number;
    }
    var OrderedSet: {
        new <T>(compare: (a: T, b: T) => number): Set<T>;
    };
}
