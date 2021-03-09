import { v4 as uuid } from 'uuid';

const PROXIED = Symbol();
const store = new Map();

function fix (method, identity, chained) {
    const {
        name,
        trigger
    } = identity;

    const key = ((c) => {
        if (Number.isInteger(c[c.length - 1])) {
            c.pop();
        }
        return String(c);
    })(chained.slice());

    if (method === 'get') {
        if (store.has(name) === false) {
            store.set(name, new Map());
        }
        if (store.get(name).has(key) === false) {
            store.get(name).set(key, new Set());
        }
        if (
            store.get(name).get(key).has(trigger) === false
        ) {
            store.get(name).get(key).add(trigger);
        }
    }

    if (
        store.has(name) &&
        store.get(name).has(key)
    ) {
        if (
            method === 'set' ||
            method === 'delete'
        ) {
            store.get(name).get(key).forEach((trigger) => {
                return (
                    trigger &&
                    trigger()
                );
            });
        }
        if (method === 'delete') {
            store.get(name).forEach((v, k, m) => {
                if (k.startsWith(key)) {
                    m.delete(k);
                }
            });
        }
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
    try {
        const n = Number(key);
        return (
            Number.isInteger(n) &&
            n >= 0
        );
    } catch (exception) {
        return false;
    }
}

function format(chained = [], key) {
    return [
        ...chained,
        isIndex(key) ?
            Number(key) :
            key
    ];
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

function proctor (props) {
    const handler = {
        defineProperty () { reject(); },
        deleteProperty () { reject(); },
        setPrototypeOf () { reject(); },
        set () { reject(); },
        get (target, key) {
            return target[key];
        }
    };
    return new Proxy(
        Object.preventExtensions(props),
        handler
    );
}

function getter (identity, props) {
    const handler = {
        defineProperty () { reject(); },
        deleteProperty () { reject(); },
        setPrototypeOf () { reject(); },
        set () { reject(); },
        get (target, key) {
            const chained = format(
                this.chained,
                key
            );
            fix(
                'get',
                identity,
                chained
            );
            // return a Proxy for nested objects and arrays
            if (
                typeof target[key] === 'object' &&
                target[key] !== null
            ) {
                const nested = target[key];
                const nestedProto = nested.constructor.prototype;
                const nestedContext = { chained };
                if (nestedProto === Array.prototype) {
                    Object.setPrototypeOf(
                        nested,
                        ReactiveArray.prototype
                    );
                } else if (nestedProto !== ReactiveArray.prototype) {
                    Object.preventExtensions(nested)
                }
                return new Proxy(
                    nested,
                    {
                        defineProperty () { reject(); },
                        setPrototypeOf () { reject(); },
                        deleteProperty () { reject(); },
                        'get': handler.get.bind(nestedContext),
                        set () { reject(); }
                    }
                );
            }
            return target[
                Array.isArray(target) &&
                isIndex(key) ?
                    Number(key) :
                    key
            ];
        }
    };
    return new Proxy(
        Object.preventExtensions(props),
        handler
    );
}

function setter (identity, props) {
    const handler = {
        defineProperty () { reject(); },
        deleteProperty () { reject(); },
        setPrototypeOf () { reject(); },
        get (target, key) {
            const chained = format(
                this.chained,
                key
            );
            if (key === PROXIED) {
                return target;
            }
            if (
                typeof target[key] === 'object' &&
                target[key] !== null
            ) {
                const nested = target[key];
                const nestedProto = nested.constructor.prototype;
                const isNestedArray = (
                    nestedProto === Array.prototype ||
                    nestedProto === ReactiveArray.prototype
                );
                const nestedContext = { chained };
                if (nestedProto === Array.prototype) {
                    Object.setPrototypeOf(
                        nested,
                        ReactiveArray.prototype
                    );
                } else if (nestedProto !== ReactiveArray.prototype) {
                    Object.preventExtensions(nested)
                }
                return new Proxy(
                    nested,
                    {
                        defineProperty () { reject(); },
                        setPrototypeOf () { reject(); },
                        'set': handler.set.bind(nestedContext),
                        'get': handler.get.bind(nestedContext),
                        'deleteProperty': isNestedArray ?
                            // delete functionality is required for arrays,
                            // to permit using methods like pop()
                            function (t, k) {
                                if (isIndex(k)) {
                                    return (delete t[Number(k)]);
                                }
                            } :
                            // otherwise, refuse to delete properties
                            reject
                    }
                );
            }
            return target[key];
        },
        set (target, key, value) {
            // sometimes we can get a proxy re-assigned to a new array index,
            // for example after calling Array.prototype.reverse()
            const cleanValue = unlink(value);
            const isArray = Array.isArray(target);
            const oldValue = target[key];
            const proto = (
                target.constructor.prototype === ReactiveArray.prototype ?
                    Array.prototype :
                    target.constructor.prototype
            );
            // do not allow overwriting nested objects
            if (
                isArray === false &&
                typeof target[key] === 'object'
            ) {
                return false;
            }
            // update the value before triggering reactivity
            target[
                isArray &&
                isIndex(key) ?
                    Number(key) :
                    key
            ] = cleanValue;
            if (
                // the key does not belong to the object prototype
                typeof key !== 'symbol' &&
                (
                    owns(
                        proto,
                        key
                    ) === false  ||
                    // the target is an array, and the key is an index value
                    (
                        isArray &&
                        isIndex(key)
                    )
                )
            ) {
                fix(
                    'set',
                    identity,
                    format(
                        this.chained,
                        key
                    )
                );
            }
            return true;
        }
    }
    return new Proxy(
        Object.preventExtensions(props),
        handler
    );
}

function parse (props) {
    let parsed = undefined;
    try {
        parsed = JSON.parse(props);
        if (Array.isArray(parsed)) {
            throw new Error('Props cannot be an array');
        }
        if (Object.keys(parsed).length === 0) {
            throw new Error('Props cannot be empty');
        }
    } catch (exception) {
        throw exception;
    }
    return parsed;
}

export class Provider {
    constructor (props) {
        const identity = {
            name: uuid(),
            trigger: null
        };
        const parsed = parse(props);
        const safety = proctor(parsed);
        const state = setter(
            identity,
            parsed
        );
        const target = getter(
            identity,
            parsed
        );
        Object.defineProperties(
            this,
            {
                data: {
                    get () {
                        return JSON.stringify(parsed);
                    }
                },
                state: {
                    value: state
                },
                register: {
                    value (condition, logic) {
                        try {
                            if (typeof condition(safety) === 'boolean') {
                                identity.trigger = function () {
                                    return (
                                        condition(parsed) &&
                                        logic(state)
                                    );
                                }
                                condition(target);
                                return true;
                            }
                            throw new Error('the conditional function must return a boolean value');
                        } catch (exception) {
                            console.error(exception);
                            return false;
                        }
                    }
                }
            }
        );
        Object.freeze(this);
    }
}
