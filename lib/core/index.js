export default class Core {

    constructor (register, create, reMount, defaults, config = {}) {
        // for convenience
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
            // the application's "state"
            "props": { value: new Proxy(config, {

                get (target, key) {
                    // find the prop
                    const prop = target[key];
                    // we only care about intercepting get requests during a
                    // component's mount operation. This way, we know what
                    // changes to the application state should trigger updates,
                    // and which components should be re-mounted as a result
                    if (_this.status === "MOUNTING") {
                        // where did this property originate? we shouldn't
                        // memoize the result because properties can change
                        const progenitor = target.hasOwnProperty(key) ?
                            _this : _this.findProgenitor(key);
                        const group = `${progenitor.name}.${key}`;
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
                        // if the return value is an object, wrap it in a proxy,
                        // and re-use the same set interceptor.
                        // to do so, flag the target as "DETACHED",
                        // and copy references to the necessary method calls
                        const {findProgenitor, parent} = _this;
                        // a detached-state context for the proxy handler
                        const detachedContext = {
                            findProgenitor: findProgenitor.bind(_this),
                            parent,
                            status: "DETACHED",
                            keyVal: key
                        };
                        // return the wrapped object
                        return new Proxy(prop, {
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
                    // we are looking to match one of these conditions - note
                    // the specific usage of "hasOwnProperty" to detect whether
                    // this instance originates the key
                    if (target.hasOwnProperty(key) || target[key] === undefined) {
                        // get a reference to the component instance that owns
                        // this config object, and calculate the group key
                        const progenitor = _this.findProgenitor(keyVal);
                        const group = `${progenitor.name}.${keyVal}`;
                        // update the config
                        target[key] = val;
                        // if the property is not one referenced in the mounting
                        // operation, it is not included in the register. In
                        // this case, the set function must return truthy.
                        return register.has(group) ? reMount(group) : key;
                    // if the parent is defined, delegate to that instance
                    } else if (_this.parent !== undefined) {
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
                                registrants.push(register.get(group));
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
            })}
        }));
        // trigger the "manifest" hook, which saves us from needing to call
        // super() with arguments from a subclassed constructor function
        this.manifest();
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
