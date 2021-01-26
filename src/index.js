const CHANGED = Symbol();
const CHANNEL = Symbol();
const PROXIED = Symbol();

const store = new Map();

function fix (method, self, ref, chained, oldValue, newValue) {
    const key = String(chained);
    if (store.has(self) === false) {
        store.set(self, new Map());
    }
    if (store.get(self).has(key) === false) {
        store.get(self).set(key, new Set());
    }
    if (
        ref === undefined &&
        store.get(self).get(key).has(self.props[CHANGED]) === false
    ) {
        store.get(self).get(key).add(self.props[CHANGED]);
    }
    if (
        ref &&
        store.get(self).get(key).has(ref.props[CHANGED]) === false
    ) {
        store.get(self).get(key).add(ref.props[CHANGED]);
    }
    if (
        method === 'set' ||
        method === 'delete'
    ) {
        store.get(self).get(key).forEach((propChanged) => {
            propChanged &&
            propChanged.call(
                ref || self,
                chained,
                oldValue,
                newValue,
                method === 'delete'
            );
        });
    }
    if (method === 'delete') {
        store.get(self).forEach((v, k, m) => {
            if (k.startsWith(key)) {
                m.delete(k);
            }
        });
    }
}

function reject () {
    throw new Error('This action is not permitted');
}

function owns (target, key) {
    try {
        return Object.prototype.hasOwnProperty.call(
            target === ReactiveArray.prototype ?
                Array.prototype :
                target
            ,
            key
        );
    } catch (exception) {
        return false;
    }
}

function isIndex (key) {
    const n = Number(key);
    return (
        Number.isInteger(n) &&
        n >= 0
    );
}

function format(proto, chained = [], key) {
    if (owns(
        proto,
        key
    ) === false) {
        return [
            ...chained,
            isIndex(key) ?
                Number(key) :
                key
        ];
    }
    return chained;
}

function getReactiveTarget (chained = [], props) {
    return chained.reduce(
        (t, k) => t[k],
        props
    );
}

function unlink (target) {
    const result = (
        target &&
        target[PROXIED]
    ) || target;
    return Array.isArray(result) ?
        result.map(unlink) :
        result;
}

class ReactiveArray extends Array {
    static get [Symbol.species] () {
        return Array;
    }
    pop () {
        return unlink(super.pop());
    }
    shift () {
        return unlink(super.shift());
    }
    splice (...args) {
        return unlink(super.splice(...args));
    }
}

function link (propChanged, props, ref, parent) {
    const handler = {
        defineProperty () { reject(); },
        deleteProperty () { reject(); },
        setPrototypeOf () { reject(); },
        get (target, key) {
            const proto = target.constructor.prototype;
            const isArray = proto === Array.prototype;
            // handle special cases
            if (key === CHANGED) {
                return propChanged;
            }
            if (key === CHANNEL) {
                return function (method, r, k, v) {
                    return handler[method].call(
                        { ref: r },
                        target,
                        k,
                        v
                    );
                }
            }
            if (key === PROXIED) {
                return target;
            }
            // end special cases
            // is this a nested property? if so, is the property still reactive?
            // will resolve as true if the target was formerly a member of a
            // reactive array, that may have been removed with pop() or shift()
            // or something in that vein.
            if (
                this.chained &&
                owns(
                    getReactiveTarget(
                        this.chained,
                        ref.self.props[PROXIED]
                    ),
                    key
                ) === false
            ) {
                return target[key];
            }
            // if the property is defined by this node's props object - meaning
            // that it does not belong to a parent object.
            if (owns(
                target,
                key
            )) {
                const chained = format(
                    proto,
                    this.chained,
                    key
                );
                // do not trigger reactivity if the property is owned by the
                // prototype (like "length" for Arrays)
                if (owns(
                    proto,
                    key
                ) === false) {
                    fix(
                        'get',
                        ref.self,
                        this.ref,
                        chained
                    );
                }
                // return a Proxy for nested objects and arrays
                if (
                    typeof target[key] === 'object' &&
                    target[key] !== null
                ) {
                    let nested = target[key];
                    const nestedProto = nested.constructor.prototype;
                    const isNestedArray = (
                        nestedProto === Array.prototype ||
                        nestedProto === ReactiveArray.prototype
                    );
                    const nestedContext = Object.assign(
                        {},
                        this,
                        { chained }
                    );
                    if (nestedProto === Array.prototype) {
                        Object.setPrototypeOf(
                            nested,
                            ReactiveArray.prototype
                        );
                    }
                    return new Proxy(
                        nested,
                        {
                            defineProperty () { reject(); },
                            setPrototypeOf () { reject(); },
                            'get': handler.get.bind(nestedContext),
                            'set': handler.set.bind(nestedContext),
                            'deleteProperty': isNestedArray ?
                                // delete functionality is required for arrays,
                                // to permit using methods like pop()
                                (function (t, k) {
                                    if (isIndex(k)) {
                                        fix(
                                            'delete',
                                            ref.self,
                                            this.ref,
                                            format(
                                                nestedProto,
                                                this.chained,
                                                k
                                            ),
                                            t[Number(k)]
                                        );
                                        return (delete t[Number(k)]);
                                    }
                                }).bind(nestedContext) :
                                // otherwise, refuse to delete properties
                                reject
                        }
                    );
                }
                return target[
                    isArray &&
                    isIndex(key) ?
                        Number(key) :
                        key
                ];
            } else if (parent) {
                return parent.props[CHANNEL](
                    'get',
                    this.ref || ref.self,
                    key
                );
            }
            return target[key];
        },
        set (target, key, value) {
            // sometimes we can get a proxy re-assigned to a new array index,
            // for example after calling Array.prototype.reverse()
            const cleanValue = unlink(value);
            const isArray = Array.isArray(target);
            const proto = target.constructor.prototype;
            if (
                // do not allow overwriting nested objects
                isArray === false &&
                typeof target[key] === 'object'
            ) {
                return false;
            }
            // trigger reactivity if
            if (
                // the key does not belong to the object prototype
                owns(
                    proto,
                    key
                ) === false &&
                (
                    (
                        // the key does belong to the target
                        owns(
                            target,
                            key
                        ) &&
                        // the key is still present in the props object,
                        // meaning that it was not removed from a reactive
                        // array through an operation like pop() or shift()
                        (
                            owns(
                                getReactiveTarget(
                                    this.chained,
                                    ref.self.props[PROXIED]
                                ),
                                key
                            )
                        )
                    ) ||
                    // the target is an array, and the key is an index value
                    (
                        isArray &&
                        isIndex(key)
                    )
                )
            ) {
                fix(
                    'set',
                    ref.self,
                    this.ref,
                    format(
                        proto,
                        this.chained,
                        key
                    ),
                    target[key],
                    cleanValue
                );
            } else if (parent) {
                return parent.props[CHANNEL](
                    'set',
                    this.ref || ref.self,
                    key,
                    cleanValue
                );
            }
            target[
                isArray &&
                isIndex(key) ?
                    Number(key) :
                    key
            ] = cleanValue;
            return true;
        }
    }
    return new Proxy(
        Object.preventExtensions(props),
        handler
    );
}

function parse (props = '{}') {
    let parsed = undefined;
    try {
        parsed = JSON.parse(props);
        if (Array.isArray(parsed)) {
            throw new Error('Props cannot be an array');
        }
    } catch (exception) {
        throw exception;
    }
    return parsed;
}

export class Provider {
    constructor (props, propChangedCallback) {
        const self = this;
        Object.defineProperties(
            self,
            {
                create: {
                    value (childProps, childPropChangedCallback) {
                        let child;
                        return (child = new Provider(
                            link(
                                childPropChangedCallback,
                                Object.assign(
                                    Object.create(self.props[PROXIED]),
                                    parse(childProps)
                                ),
                                {
                                    get self () {
                                        return child;
                                    }
                                },
                                self
                            )
                        ));
                    }
                },
                data: {
                    get () {
                        return JSON.stringify(this.props[PROXIED]);
                    }
                },
                props: {
                    value: props &&
                        props[PROXIED] ?
                        props :
                        link(
                            propChangedCallback,
                            parse(props),
                            {
                                get self () {
                                    return self;
                                }
                            }
                        )
                }
            }
        );
    }
}
