class mslto {

    static get register () {
        // define the private application store if it does not exist
        this.store = this.store || new Map();
        // return a reference to the private store
        return this.store;
    }
    
    static defaults (props) {
        // create a closure for accessing the component's default properties
        return Object.keys(props).reduce((defs, key) => {
            // unshift this component to the key register
            mslto.register.set(key, [this].concat(mslto.register.get(key) || []));
            // define a set of default property accessors
            return Object.assign(defs, { [key]: {

                get () {
                    // inherited properties should be undefined at instantiation
                    if (props[key] === undefined && this.parent) {
                        // synchronize with parent props
                        props[key] = this.parent[key];
                    }

                    return props[key];
                },

                set (val) {
                    // update private props for this component
                    let success = props[key] = val;
                    // trigger component update and proceed if willUpdate returns success
                    if (mslto.register.has(key) && this.willUpdate(key, val)) {
                        // update component wrapper, re-mounting the component
                        success = this.wrapper.innerHTML = this.mount(); // XSS
                        // proceed if operation is successful
                        if (success) {
                            // return success if component didUpdate is successful
                            return this.didUpdate(key, val);
                        }
                    }
                    // return success if all operations are successful
                    return !!(success);
                }

            } });
        }, {});
    }

    static parse (template, ...interpolations) {

        return template.reduce((merge, slice, ndx) => merge + (component => {

            // TODO - introduce XSS protection / filtering for interpolated string values

            if (component.hasOwnProperty("wrapper")) {

                if (component.willMount()) {

                    const id = `${this.constructor.name}-${component.constructor.name}-${ndx}`; // XSS

                    Object.defineProperties(component, {
                        // assign "child" component defaults
                        "id":     { value: id.toLowerCase() },
                        "parent": { value: this.reflection  }
                    });
                    // update the component wrapper, mounting the component
                    component.wrapper.setAttribute("id", component.id);
                    component.wrapper.innerHTML = component.mount(); // XSS
                    // retain a reference to the "child" component
                    this.components.push(component);
                }
                // return the component wrapper as a string value
                return component.wrapper.outerHTML;
            }
            // may return a string
            return component; // XSS
        // evaluate then concatinate the next interpolated value
        })(interpolations.shift()) + slice);
    }

    static reMount(key, val) {
        // return success if all operations are successful
        // bypasses the component proxy
        // operations are performed in depth-first order
        return mslto.register.get(key).reduce((success, next) => success && !!(next[key] = val), true);
    }

    constructor (wrapper, ...args) {
        // the set-accessor trap implemented by the component proxy
        function set (target, key, val) {

            let filtered = val; // XSS filter prior to evaluation
            let success = true;

            if (!target.hasOwnProperty(key)) {
                // assign a "local" property that will not trigger updates
                success = Object.defineProperty(target, key, {
                    // properties assigned post-instantiation are configurable
                    value: filtered, writable: true, configurable: true
                });

            } else if (target[key] !== filtered) {
                // check property accessor description and value prototype
                const desc = Object.getOwnPropertyDescriptor(target, key);
                const type = Object.getPrototypeOf(target[key]);
                // don't typecheck configurable properties
                if (desc.configurable || type === Object.getPrototypeOf(filtered)) {
                    // should this propery trigger a reMount?
                    if (!desc.configurable && mslto.register.has(key)) {                    
                        // operation should return success
                        return mslto.reMount(key, filtered) && target.didMount();
                    }
                    // update the component property
                    success = target[key] = filtered;

                } else {

                    throw new Error(`typecheck fails for prop ${key} with value ${val}; requires ${type.constructor.name}`);
                }
            }
            // return success if all operations are successful
            return !!(success);
        }

        Object.defineProperties(this, Object.assign({
            // assign default component property accessors
            "components": { value: []                       },
            "parse":      { value: mslto.parse.bind(this)   },
            "reflection": { value: new Proxy(this, { set }) },
            "wrapper":    { value: wrapper, writable: true  }
        // assign inherited property keys
        }, mslto.defaults.call(this, args.reduce((defs, prop) => {

            if (typeof prop !== "string") {
                // some on-the-fly typechecking
                throw new Error("passed props must only inclue string values");
            }
            // assign inherited properties a value of undefined
            return Object.assign(defs, { [prop]: undefined });
        // get the last argument, if it is an object
        }, typeof args[args.length - 1] !== "string" ? args.pop() : {}))));
        // make the component accessible behind a proxy with accessor traps
        return this.reflection;
    }

    render (parent) {

        if (this.parent || this.isMounted) {

            throw new Error("invoke render once for the unmounted parent component");

        } else if (this.willMount()) {

            const id = this.constructor.name // XSS
            // describe the component id property accessor
            Object.defineProperty(this, "id", { value: id.toLowerCase() });
            // update the component wrapper, mounting the component
            this.wrapper.setAttribute("id", this.id);
            this.wrapper.innerHTML = this.mount(); // XSS
            // append to the parent element before triggering didUpdate()
            parent.appendChild(this.wrapper);
            // return success
            return this.didMount();
        }
    }

    // returns true if the component has been mounted
    get isMounted ()  { return !!this.wrapper.innerHTML }
    // returns true if the component is not mounted and should mount
    willMount ()      { return !this.isMounted          }
    // returns true if the component is mounted and should update
    willUpdate (k, v) { return this.isMounted           }
    // returns true if the component should signal a successful update
    didUpdate (k, v)  { return true                     }
    // return HTML (as a plain string) or with interpolations (a tagged template literal using this.parse)
    mount ()          { return ""                       }
    // returns true if the component should signal a successful mount
    didMount () {
        // update the component selector to match the rendered element
        this.wrapper = document.querySelector("#" + this.id);
        // return success if operations are successful
        return this.components.reduce((success, c) => success && !!(c.didMount()), true);
    }
}
