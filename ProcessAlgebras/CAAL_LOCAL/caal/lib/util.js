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
