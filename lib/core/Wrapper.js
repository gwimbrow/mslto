
export default class Wrapper {

    static defineProperty (node, key, conf) {

        return !!Object.defineProperty(this, key, {

            get () { return conf.value },
            
            set (val) {
                // components can reject an update
                if (conf.writable) {
                    // assign the value to the node, and update the config
                    node[key] = conf.value = val;

                    if (this.node.innerHTML) {
                        // if it is mounted, re-mount the component's node
                        this.node.innerHTML = this.mount();
                    }
                }
            }
        });
    }

    constructor (defaults, config, handler) {

        const setDefault = Wrapper.defineProperty.bind(this, defaults.node.value);

        const reflector = new Proxy(this, handler);

        Object.keys(config).forEach(key => {

            const group = `${this.constructor.name}.${key}`;

            mslto.register.set(group, [this]);
        });

        Object.defineProperties(this, Object.assign(defaults, config, {

            "setDefault": {
                value: setDefault
            },
            "reflector": {
                value: reflector
            }
        }));

        return reflector;
    }

    parse (template, ...interpolations) {

        function render (component) {

            component.node.innerHTML = component.mount();

            return component.node.outerHTML;
        }

        return template.reduce((merge, slice) => {

            let candidate = interpolations.shift();

            if (candidate instanceof Wrapper) {
    
                this.children.push(candidate);

                candidate = render(candidate);
            }

            return merge + candidate + slice;
        });
    }

    appendTo (parent) {

        if (!this.hasOwnProperty("parent")) {

            this.node.innerHTML = this.mount();

            parent.appendChild(this.node);
        }
    }

    mount () {
        // reflection
        return this.node.innerHTML;
    }
}
