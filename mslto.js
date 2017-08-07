class mslto {
    
    static defaults (props) {

        const defined = {};

        if (!mslto.register) {

            mslto.register = new Map();
        }
        
        for (const key in props) {

            if (!mslto.register.has(key)) {

                mslto.register.set(key, []);
            }

            mslto.register.get(key).unshift(this);

            defined[key] = {
                
                get: () => {

                    if (props[key] === undefined) {

                        props[key] = this.parent[key];
                    }

                    return props[key];
                },

                set: val => props[key] = val
            }
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

        const components = mslto.register.get(key).slice();

        const proxies = components.map(c => c.id);

        const parent = components.filter(c => !c.parent).pop();

        function update (child) {

            if (child.components.length) {

                for (const {id} of components) {

                    let ndx = proxies.indexOf(id);

                    if (ndx > -1) {

                        let candidate = components[ndx];

                        components.splice(ndx, 1);

                        return !!(update(candidate));
                    }
                }
            }

            child[key] = val;

            child.wrapper.innerHTML = child.mount();

            return true;
        }

        return !!(update(parent || components.pop()));
    }

    constructor (wrapper, ...args) {

        const props = args.pop();

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
}
