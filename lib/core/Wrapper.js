export default class Wrapper {

    static defineProperty (props, node, key, config) {

        const target = this;

        const group = `${target.name}.${key}`;

        mslto.register.set(group, [config]);

        return !!Object.defineProperty(props, key, {

            get () {

                if (!config.hasOwnProperty(key)) {

                    const source = target.findSource(key);

                    const group = `${source.name}.${key}`;

                    if (mslto.register.has(group)) {

                        const prop = mslto.register.get(group)[0];
                
                        target.setProp(key, prop);
                    }

                    return prop.value;
                }

                return config[key].value;
            },
            
            set (val) {
                // components can reject an update
                if (config.writable) {
                    // assign the value to the node, and update the config
                    node[key] = config.value = val;

                    if (node.innerHTML) {
                        // if it is mounted, re-mount the component's node
                        node.innerHTML = target.mount();
                    }
                }

                return true;
            }
        });
    }

    constructor (defaults, props) {

        const config = {};

        const setProp = Wrapper.defineProperty.bind(this, config, defaults.node.value);

        Object.defineProperties(this, Object.assign(defaults, {

            "setProp": {

                value: setProp
            },

            "props": {

                value: (() => {

                    const target = this;

                    return new Proxy(config, {

                        get (props, key) {

                            try {

                                return props[key];
                            
                            } catch (e) {

                                return undefined;
                            }
                        },

                        set (props, key, val) {

                            const source = target.findSource(key);

                            const group = `${source.name}.${key}`;

                            if (!props.hasOwnProperty(key)) {

                                setProp(key, {

                                    value: val, writable: true, configurable: true
                                });

                            } else if (props[key].value !== val && mslto.register.has(group)) {

                                mslto.reMount(source, key, val);
                            }

                            return true;
                        }
                    });
                })()
            }
        }));

        Object.keys(props).forEach(key => {

            setProp(key, props[key]);

            mslto.register.set(`${this.name}.${key}`, [props[key]]);
        });
    }

    findSource (key) {

        if (Array
            .from(mslto.register.keys())
            .filter(group => group.startsWith(this.name))
            .map(group => group.replace(/\..*/, ""))
            .includes(key)) {

            return this;
        }

        try {

            return this.parent.findSource(key);
        
        } catch (e) {

            return this;
        }
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

        if (!this.parent) {

            this.node.innerHTML = this.mount();

            parent.appendChild(this.node);
        }
    }

    mount () {
        // reflection
        return this.node.HTML;
    }
}
