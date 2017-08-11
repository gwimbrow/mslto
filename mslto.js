class mslto {

    static get register () {
        // define the private application store if it does not exist
        this.store = this.store || new Map();

        return this.store;
    }
    
    static defaults (props) {

        return Object.keys(props).reduce((defs, key) => {
            // unshift this component to the key register
            mslto.register.set(key, [this].concat(mslto.register.get(key) || []));

            return Object.assign(defs, { [key]: {

                get () {
                    // inherited properties should be undefined at instantiation time
                    if (props[key] === undefined && this.parent) {
                        // synchronize with parent props
                        props[key] = this.parent[key];
                    }

                    return props[key];
                },

                set (val) {

                    if (this.willUpdate(key, val)) {

                        let success = props[key] = val;

                        if (this.isMounted && mslto.register.has(key)) {

                            success = this.wrapper.innerHTML = this.mount(); // XSS
                        }
                        
                        if (success) {

                            return this.didUpdate(key, val);
                        }
                    }
                }
            } });
        }, {});
    }

    static parse (template, ...values) {

        function read (component, ndx) {

            if (component.hasOwnProperty("wrapper")) {

                if (component.willMount()) {

                    const id = `${this.id}-${component.constructor.name}-${ndx}`;

                    Object.defineProperties(component, {

                        "id":     { value: id.toLowerCase() },
                        "parent": { value: this.reflection  }
                    });

                    component.wrapper.setAttribute("id", component.id);
                    component.wrapper.innerHTML = component.mount(); // XSS

                    this.components.push(component);
                }
                // return the component wrapper as a string value
                return component.wrapper.outerHTML
            }
            // may return a string
            return component; // XSS
        }

        return template.reduce((merge, slice, ndx) => {

            return merge + read.call(this, values.shift(), ndx) + slice;
        });
    }

    static reMount(key, val) {
        // bypasses the component proxy
        // operations performed in depth-first order
        const registrants = mslto.register.get(key);

        return registrants.reduce((success, component, ndx) => {
            // performing a set operation triggers didUpdate
            success = success && !!(component[key] = val);
            
            if (success && ndx + 1 === registrants.length) {
                // didMount cascades to all affected components
                component.didMount();
            }

            return success;

        }, true);
    }

    constructor (wrapper, ...args) {
        // set-accessor trap implemented by the component proxy
        function set (target, key, val) {

            let updated = val; // XSS filter prior to evaluation
            let success = true;

            if (!target.hasOwnProperty(key)) {
                // assign a "local" property that will not trigger updates
                success = Object.defineProperty(target, key, {
                    // properties assigned post-instantiation are configurable
                    value: updated, writable: true, configurable: true
                });

            } else if (target[key] !== updated) {
                // check property accessor description and value prototype
                const desc = Object.getOwnPropertyDescriptor(target, key);
                const type = Object.getPrototypeOf(target[key]);

                if (desc.configurable || type === Object.getPrototypeOf(updated)) {

                    if (!desc.configurable && mslto.register.has(key)) {                    

                        return mslto.reMount(key, updated);
                    }

                    success = target[key] = updated;

                } else {

                    throw new Error(`typecheck fails for prop ${key} with value ${val}; requires ${type.constructor.name}`);
                }
            }

            return !!(success);
        }

        let props = args[args.length - 1];

        if (props && typeof props === "object" && !Array.isArray(props)) {

            props = args.pop();

        } else {
        
            props = {};
        }

        Object.defineProperties(this, Object.assign({

            "components": { value: []                       },
            "parse":      { value: mslto.parse.bind(this)   },
            "reflection": { value: new Proxy(this, { set }) },
            "wrapper":    { value: wrapper, writable: true  }

        }, mslto.defaults.call(this, args.reduce((defs, prop) => {

            if (typeof prop !== "string") {
                // some on-the-fly typechecking
                throw new Error("inherited properties must only inclue string values");
            }

            return Object.assign(defs, { [prop]: undefined });

        }, props))));

        return this.reflection;
    }

    render (parent) {

        if (this.isMounted || this.parent) {

            throw  new Error("render must only be called for an unmounted parent component");

        } else if (this.willMount()) {
            
            const id = this.constructor.name;

            Object.defineProperty(this, "id", { value: id.toLowerCase() });

            this.wrapper.setAttribute("id", this.id);
            this.wrapper.innerHTML = this.mount();

            parent.appendChild(this.wrapper);

            this.didMount();
        }
    }

    get isMounted ()  { return !!this.wrapper.innerHTML }
    willMount ()      { return !this.isMounted          }
    willUpdate (k, v) { return this[k] !== v            }
    mount ()          { return this.wrapper.outerHTML   }
    didUpdate (k, v)  { return this[k] === v            }

    didMount () {
        // update the component selector to match the rendered element
        return this.components.reduce((success, component) => {

            return success && !!(component.didMount());

        }, !!(this.wrapper = document.querySelector("#" + this.id)));
    }
}
