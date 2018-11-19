import {mapObj, regulator} from "../utils";
export default class Core {

    constructor (register, create, reMount, defaults, config = {}) {
        // track this instance
        const _this = this;
        // if a parent is defined, add this instance to its list of children
        if (defaults.parent.value !== undefined) {
            // this looks awkward, but needs to happen in the constructor
            defaults.parent.value.children.push(_this);
        }
        // define default properties for the instance
        Object.defineProperties(_this, Object.assign({}, defaults, {
            // all components are "dirty" on creation
            "status": { value: "DIRTY", writable: true },
            // components alias the create operation
            "create": { value: params => create(Object.assign({
                // this config becomes the prototype for child components
                props: config,
                parent: _this
            // params can still overwrite defaults
            }, params)) },
            // props makes use of a proxy for config to handle operations for
            // the application's "state". The proxy handlers themselves are
            // tightly-bound to a component instance, and (potentially)
            // trampolined though a single subroutine.
            "props": { value: new Proxy(config, (function (handlers) {
                return mapObj(handlers, (key, item) => {
                    return {
                        [key]: function (target, ...args) {
                            const detached = this.status === "DETACHED";
                            // the function
                            const next = handlers[key].bind(
                                detached ? this : handlers,
                                target,
                                ...args
                            );
                            // the trampoline
                            regulator.enqueue(next);
                        }
                    };
                });
            })({
                get (target, key) {
                    // are we in a detached state?
                    const detached = this.status === "DETACHED";
                    // the value to use when performing lookups on the register
                    const keyVal = detached ? this.keyVal : key;
                    // does this node own the property?
                    const isOwnProperty = target.hasOwnProperty(key);
                    // find the prop
                    const prop = target[key];
                    // where did this property originate? we shouldn't
                    // memoize the result because properties can change
                    const progenitor = isOwnProperty ? _this : _this.findProgenitor(keyVal);
                    const group = `${progenitor.name}.${keyVal}`;
                    // we only care about intercepting get requests during a
                    // component's mounting operation.
                    if (_this.status === "MOUNTING") {
                        // if the group has already been configured
                        if (register.has(group)) {
                            // we don't want duplicate entries in the register
                            const filtered = register.get(group).filter(i => i !== _this);
                            // append this instance to the end of the list
                            register.set(group, filtered.concat(_this));
                        } else {
                            // otherwise, create a new group for this component
                            register.set(group, [_this]);
                        }
                    }
                    if (typeof prop === "object" && prop !== null) {
                        // if the value is an object, return a proxy
                        const detachedContext = {
                            accessor: this.accessor || "",
                            status: "DETACHED",
                            keyVal
                        };
                        if (detachedContext.accessor.length) {
                            // insert spacer
                            detachedContext.accessor += ".";
                        }
                        // append to query
                        detachedContext.accessor += key;
                        // return the wrapped object
                        return new Proxy(prop, {
                            "get": this.get.bind(detachedContext),
                            "set": this.set.bind(detachedContext),
                            "deleteProperty": this.deleteProperty.bind(detachedContext)
                        });
                    }
                    return prop;
                },

                set (target, key, val) {
                    // are we in a detached state?
                    const detached = this.status === "DETACHED";
                    // the value to use when performing lookups on the register
                    const keyVal = detached ? this.keyVal : key;
                    // does this node own the property?
                    const isOwnProperty = target.hasOwnProperty(key);
                    // we are looking to match one of these conditions - note
                    // the specific usage of "hasOwnProperty" to detect whether
                    // this instance originates the key
                    const progenitor = isOwnProperty ? _this : _this.findProgenitor(keyVal);
                    // get a reference to the component instance that owns
                    // this config object, and calculate the group key
                    const group = `${progenitor.name}.${keyVal}`;

                    if (
                        (isOwnProperty || target[key] === undefined) &&
                        // this is probably an extreme edge case, but will trigger
                        // when the child component is masking a property
                        (_this.parent ? _this.parent.props[keyVal] === undefined : true)
                    ) {
                        // update the config
                        if (this.hasOwnProperty("accessor") && this.accessor.length) {
                            const nodes = this.accessor.split(".").slice(1);
                            const leaf = nodes.pop();
                            return nodes.reduce((next, part) => {
                                return next[part];
                            }, target)[leaf] = val;
                        } else {
                            target[key] = val;
                        }
                        // if the property is not one referenced in the mounting
                        // operation, it is not included in the register. In
                        // this case, the set function must return truthy.
                        return register.has(group) ? reMount(group) : key;
                    // if the parent is defined, delegate to that instance
                    } else if (_this.parent) {
                        // if we are in a detached state, the context will be
                        // lost.
                        return !!(_this.parent.props[key] = val);
                    }
                },

                deleteProperty (target, key) {
                    // are we in a detached state?
                    const detached = this.status === "DETACHED";
                    // the value to use when performing lookups on the register
                    const keyVal = detached ? this.keyVal : key;
                    // only permit deleting props from the source
                    if (target.hasOwnProperty(key)) {
                        const progenitor = _this.findProgenitor(keyVal);
                        const group = `${progenitor.name}.${keyVal}`;
                        if (progenitor !== _this) {
                            // this happens when a node is masking a prop.
                            // in the course of deleting, we must append the
                            // nodes registered to receive updates for the
                            // old prop onto the list for updates from the
                            // prop it had been masking
                            const deprecated = `${_this.name}.${keyVal}`;
                            const registrants = register.get(deprecated);
                            if (register.has(group)) {
                                // even more unlikely than the above scenario
                                registrants.unshift(...register.get(group));
                            }
                            register.delete(deprecated);
                            register.set(group, registrants);
                        }
                        delete target[key];
                        // remount the component group
                        return reMount(group);
                    } else {
                        // can't delete what you don't have
                        return false;
                    }
                }
            })) }
        }));
        // trigger the "manifest" hook, which saves us from needing to call
        // super() with arguments from a subclassed constructor function
        _this.manifest();
    }

    findProgenitor (key) {
        if (this.parent && this.parent.props[key]) {
            // this operation continues until the key is not found
            return this.parent.findProgenitor(key);
        }
        // if the key is not found, or this is the root, return this instance
        return this;
    }

    manifest () {
        // hook for post-instantiation
    }

    update () {
        // only perform these steps if the component is marked "dirty" - this
        // allows us to re-mount child nodes without re-rendering their HTML
        if (this.status === "DIRTY") {
            this.status = "MOUNTING";
            this.node.innerHTML = this.mount();
        }
        // always return the outerHTML
        return this.node.outerHTML;
    }

    parse (template, ...interpolations) {
        // this is a "tag" function for a template literal
        return template.reduce((merge, slice) => merge + (target => {
            if (target instanceof Core) {
                // "pause" this component's updates as the child is rendered
                this.status = "DIRTY";
                // get the component node's outerHTML
                target = target.update();
                // resume updating this component
                this.status = "MOUNTING";
            }
            return target;
        })(interpolations.shift()) + slice);
    }

    mount () {
        // default behavior - this will typically be written as
        // mount () {
        //     return this.parse `template literal with ${interpolations}`;
        // }
        return this.node.innerHTML;
    }

    didMount () {
        // update the component status
        this.status = "MOUNTED";
        // ensure all child nodes are finalized
        return this.children.reduce((status, target) => {
            return status && target.didMount();
        }, true);
    }
}
