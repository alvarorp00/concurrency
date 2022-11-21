var MapUtil;
(function (MapUtil) {
    var TreapNode = (function () {
        function TreapNode(key, value) {
            this.key = key;
            this.value = value;
            this.left = null;
            this.right = null;
            this.count = 1;
            this.priority = treapPriority();
        }
        TreapNode.prototype.updateSize = function () {
            this.count = 1 + (this.left ? this.left.count : 0) + (this.right ? this.right.count : 0);
        };
        TreapNode.prototype.has = function (key, compare) {
            return this.get(key, compare) !== undefined;
        };
        TreapNode.prototype.get = function (key, compare) {
            var compareResult = compare(key, this.key);
            if (compareResult === 0)
                return this.value;
            else if (compareResult < 0 && this.left)
                return this.left.get(key, compare);
            else if (this.right)
                return this.right.get(key, compare);
            return undefined; //Case for no child 
        };
        //Returns whether a new key was added
        TreapNode.prototype.set = function (key, val, compare) {
            var compareResult = compare(key, this.key);
            if (compareResult === 0) {
                this.value = val;
                return this;
            }
            var parent = this;
            if (compareResult < 0) {
                if (!parent.left) {
                    parent.left = new TreapNode(key, val);
                }
                else {
                    parent.left = parent.left.set(key, val, compare);
                }
                //Rotate right
                if (parent.left.priority > parent.priority) {
                    var tempChild = parent.left;
                    parent.left = tempChild.right;
                    tempChild.right = parent;
                    parent.updateSize();
                    parent = tempChild;
                }
            }
            else {
                if (!parent.right) {
                    parent.right = new TreapNode(key, val);
                }
                else {
                    parent.right = parent.right.set(key, val, compare);
                }
                //Rotate left
                if (parent.right.priority > parent.priority) {
                    var tempChild = parent.right;
                    parent.right = tempChild.left;
                    tempChild.left = parent;
                    parent.updateSize();
                    parent = tempChild;
                }
            }
            parent.updateSize();
            return parent;
        };
        TreapNode.prototype.forEach = function (f, thisObject) {
            if (this.left)
                this.left.forEach(f, thisObject);
            f.call(thisObject, this.value, this.key);
            if (this.right)
                this.right.forEach(f, thisObject);
        };
        TreapNode.prototype.size = function () {
            return this.count;
        };
        return TreapNode;
    })();
    function treapPriority() {
        return Math.random();
    }
    var TreapMap = (function () {
        function TreapMap(compare) {
            this.compare = compare;
            this.root = null;
        }
        TreapMap.prototype.has = function (key) {
            return !!this.root && this.root.has(key, this.compare);
        };
        TreapMap.prototype.set = function (key, val) {
            if (!this.root) {
                this.root = new TreapNode(key, val);
            }
            else {
                this.root = this.root.set(key, val, this.compare);
            }
        };
        TreapMap.prototype.get = function (key) {
            if (!this.root)
                return undefined;
            return this.root.get(key, this.compare);
        };
        TreapMap.prototype.size = function () {
            return this.root ? this.root.size() : 0;
        };
        TreapMap.prototype.forEach = function (f, thisObject) {
            if (this.root)
                this.root.forEach(f, thisObject);
        };
        return TreapMap;
    })();
    MapUtil.OrderedMap = TreapMap;
})(MapUtil || (MapUtil = {}));
/// <reference path="map.ts" />
var SetUtil;
(function (SetUtil) {
    var TreapSet = (function () {
        function TreapSet(compare) {
            this.compare = compare;
            this.map = new MapUtil.OrderedMap(compare);
        }
        TreapSet.prototype.add = function (value) {
            this.map.set(value, value);
        };
        TreapSet.prototype.has = function (value) {
            return this.map.has(value);
        };
        TreapSet.prototype.forEach = function (f, thisObject) {
            return this.map.forEach(f, thisObject);
        };
        TreapSet.prototype.size = function () {
            return this.map.size();
        };
        return TreapSet;
    })();
    var ArraySet = (function () {
        function ArraySet(compare) {
            this.compare = compare;
            this.elements = [];
        }
        ArraySet.prototype.add = function (value) {
            if (this.indexOf(value) === -1) {
                this.elements.push(value);
            }
        };
        ArraySet.prototype.has = function (value) {
            return this.indexOf(value) !== -1;
        };
        ArraySet.prototype.forEach = function (f, thisObject) {
            var elems = this.elements;
            for (var i = 0, len = elems.length; i < len; ++i) {
                //Index is the same as value - it's a set not an array!
                f.call(thisObject, elems[i], elems[i]);
            }
        };
        ArraySet.prototype.size = function () {
            return this.elements.length;
        };
        ArraySet.prototype.indexOf = function (value) {
            var cmp = this.compare, elems = this.elements;
            for (var i = 0, len = elems.length; i < len; ++i) {
                if (cmp(value, elems[i]) === 0)
                    return i;
            }
            return -1;
        };
        return ArraySet;
    })();
    SetUtil.OrderedSet = ArraySet;
})(SetUtil || (SetUtil = {}));
