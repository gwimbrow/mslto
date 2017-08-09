class mslto {

    static get register () {

        this.ledger = this.ledger || new Map();

        return this.ledger;
    }
    
    static defaults (props) {

        const defined = {};
        
        for (const key in props) {

            mslto.register.set(key, (mslto.register.get(key) || []).concat([this]));

            defined[key] = {
                
                get () {

                    if (props[key] === undefined && this.parent) {

                        props[key] = this.parent[key];
                    }

                    return props[key];
                },

                set (val) {

                    let success = !!(props[key] = val);

                    if (mslto.register.has(key) && this.willUpdate()) {

                        success = !!(this.wrapper.innerHTML = this.mount());

                        if (success) {

                            return this.didUpdate(key, val);
                        }
                    }

                    return success;
                }
            };
        }

        return defined;
    }

    static parse (template, ...interpolations) {

        const parent = this;

        return template.reduce((merge, slice, ndx) => merge + (component => {

            if (component.isMounted || component.willMount) {

                if (!this.components.includes(component) && component.willMount()) {

                    this.components.push(component);

                    Object.defineProperties(component, {

                        "id": {

                            value: `${parent.constructor.name}-${ndx}`
                        },

                        "parent": {

                            value: parent
                        }
                    });

                    component.wrapper.setAttribute("id", component.id);
              
                    component.wrapper.innerHTML = component.mount();
                }

                return component.wrapper.outerHTML;
            }

            return component;

        }).call(this, interpolations.shift()) + slice);
    }

    static reMount(key, val) {

        return mslto.register.get(key).reduce((success, next) => !!(next[key] = val));
    }

    constructor (wrapper, ...args) {

        const props = args.pop();

        if (args.some(prop => typeof prop !== "string")) {

            throw new Error("passed props must only inclue string values");
        }

        for (const inherited of args) {

            props[inherited] = undefined;
        }

        Object.defineProperties(this, {

            "components": {

                value: []
            },

            "parse": {

                value: mslto.parse.bind(this)
            },

            "wrapper": {

                value: wrapper,

                writable: true
            }
            
        });

        Object.defineProperties(this, mslto.defaults.call(this, props));

        return new Proxy(this, {

            set (target, key, val) {

                if (!target.hasOwnProperty(key)) {

                    Object.defineProperty(target, key, {

                        value: val,

                        writable: true
                    });

                } else if (target[key] !== val) {

                    let type = Object.getPrototypeOf(target[key]);

                    if (type = Object.getPrototypeOf(val)) {

                        if (mslto.register.has(key)) {

                            return !!(mslto.reMount(key, val));
                        }

                        return !!(target[key] = val);
                    }
                }

                return true;
            }
        });
    }

    render (parent) {

        if (!this.parent && !this.isMounted && this.willMount()) {

            Object.defineProperty(this, "id", {
               
               value: this.constructor.name 
            });

            this.wrapper.setAttribute("id", this.id);

            this.wrapper.innerHTML = this.mount();

            parent.appendChild(this.wrapper);

            this.didMount();
        }
    }

    willMount () {

        return !this.wrapper.innerHTML;
    }

    mount () {

        return "";
    }

    didMount () {

        this.wrapper = document.querySelector(`#${this.id}`);

        for (const component of this.components) {

            component.didMount();
        }
    }

    get isMounted () {

        return !!this.wrapper.innerHTML;
    }

    willUpdate () {

        return true;
    }

    didUpdate (key, val) {

        return true;
    }
}
