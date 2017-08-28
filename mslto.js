class mslto {

    static get register () {
        // define the private application store if it does not exist
        this.store = this.store || new Map();

        return this.store;
    }

    static defaults (props) {

        return Object.keys(props).reduce((defs, key) => {

            const registrants = mslto.register.get(key) || [];
            // unshift this component to the key register
            mslto.register.set(key, [this].concat(registrants));

            // TODO - read injected props as a symbol and get the value from any component in the register

            return Object.assign(defs, { [key]: {

                get () {

                    if (props[key] === undefined && this.parent && this.parent.hasOwnProperty(key)) {
                        // read the value from the parent component
                        props[key] = this.parent[key];
                    }
                    return props[key];
                },

                set (val) {

                    if (this.willUpdate(key, val)) {

                        let success = props[key] = val;

                        if (this.isMounted) {

                            success = this.wrapper.innerHTML = this.mount();
                        }
                        if (success) {

                            return this.didUpdate(key, val);
                        }
                    }
                }
            } });
        }, {});
    }

    static parse (template, ...interpolations) {

        return template.reduce((merge, slice, ndx) => merge + (component => {

            if (component.hasOwnProperty("wrapper")) {

                if (!component.isMounted && component.willMount()) {

                    const id = `${this.id}-${component.constructor.name}-${ndx}`;

                    Object.defineProperties(component, {

                        "id":     { value: id.toLowerCase() },
                        "parent": { value: this.reflection  }
                    });

                    component.wrapper.setAttribute("id", component.id);
                    component.wrapper.innerHTML = component.mount();

                    this.components.push(component);
                }
                // return the component wrapper as a string value
                return component.wrapper.outerHTML
            }
            // may return a string
            return component;

        })(interpolations.shift()) + slice);
    }

    static reMount(key, val) {
        // bypasses the component proxy
        const registrants = mslto.register.get(key).slice();
        // operations performed in depth-first order
        let success = registrants.reduce((success, component, ndx) => {
            // performing a set operation triggers didUpdate
            return success && !!(component[key] = val);

        }, true);
        // call didMount recursively for each component, popping off the candidates as we go.
        // this way we can call didMount in the right order, while also initiating the cascade
        // through a plurality of trees, while not re-mounting updated components.
        while (success && registrants.length) {

            const c = registrants.pop();

            success = c.didMount();

            registrants.forEach(({reflection}, ndx) => {

                if (c.components.includes(reflection)) {

                    registrants.splice(ndx, 1);
                }
            });
        }
        return !!(success);
    }

    constructor (wrapper, ...args) {
        // set-accessor trap implemented by the component proxy
        function set (target, key, val) {

            let success = true;

            if (!target.hasOwnProperty(key)) {

                if (mslto.register.has(key)) {
                    // don't overwrite the global state
                    throw new Error(`cannot redefine prop ${key} tracked by global state`);

                } else {
                    // only defining one new prop here, but can still re-use defaults.
                    // the only drawback here is the creation of a new closure scope
                    // for -every- local prop, which is obviously not ideal. The alternative -
                    // storing an dict with all of the instance props - is defeating to the
                    // purpose of keeping these props private.
                    Object.defineProperties(target, mslto.defaults.call(target, { [key]: val }));
                }
            } else if (target[key] !== val) {
                // check property accessor description and value prototype
                const desc = Object.getOwnPropertyDescriptor(target, key);
                const type = Object.getPrototypeOf(target[key]);

                if (desc.configurable || type === Object.getPrototypeOf(val)) {

                    if (mslto.register.has(key)) {                    
                        // trigger updates for registered components
                        success = mslto.reMount(key, val);

                    } else {
                        // updare only this component
                        success = target[key] = val;
                    }
                } else {
                    // tracked props must pass value typecheck
                    throw new Error(`typecheck fails for prop ${key} with value ${val}; requires ${type.constructor.name}`);
                }
            }
            return !!(success);
        }
        let props = args[args.length - 1];

        props = (props && typeof props === "object" && !Array.isArray(props)) ? args.pop() : {};

        Object.defineProperties(this, Object.assign({

            "components": { value: []                       },
            "parse":      { value: mslto.parse.bind(this)   },
            "reflection": { value: new Proxy(this, { set }) },
            "wrapper":    { value: wrapper, writable: true  }

        }, mslto.defaults.call(this, args.reduce((defs, prop) => {

            if (typeof prop !== "string") {
                // some on-the-fly typechecking
                throw new Error("injected properties must be referenced with string values");
            }

            return Object.assign(defs, { [prop]: undefined });

        }, props))));

        return this.reflection;
    }

    render (node) {

        if (this.isMounted || this.parent) {

            throw  new Error("render must only be called for an unmounted parent component");

        } else if (this.willMount()) {
            
            const id = this.constructor.name;

            Object.defineProperty(this, "id", { value: id.toLowerCase() });

            this.wrapper.setAttribute("id", this.id);
            this.wrapper.innerHTML = this.mount();

            node.appendChild(this.wrapper);

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
        let success = !!(this.wrapper = document.querySelector("#" + this.id));

        return this.components.reduce((success, component) => {

            return success && !!(component.didMount());

        }, success);
    }
}
