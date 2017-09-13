import "babel-polyfill";

import componentConfig from "./config/components";

export * from "./modules";

export const register = new Map();

// describe the component get/set-accessor pattern for observed properties
function setDefault (node, key, conf) {

    return !!Object.defineProperty(this, key, {

        get () { return conf.value },
        
        set (val) {
            // components can reject an update
            if (conf.writable && this.willUpdate(key, val)) {
                // assign the value to the node, and update the confif
                conf.value = val;
                node[key] = val;

                if (this.isMounted) {
                    // if it is mounted, re-mount the component's node
                    this.node.innerHTML = this.mount();
                }

                return this.didUpdate(key, val);
            }
        }
    });
}

export function reMount (src, key, val) {

    const group = `${src.constructor.name}.${key}`;

    const subscribers = mslto.register.get(group).slice();

    while (subscribers.length) {

        let target = subscribers.pop();

        target[key] = val;
    }

    return src.didMount();
}

function valuesFor (conf) {

    return Object.keys(conf).reduce((defs, prop) => {

        return Object.assign(defs, {
            [prop]: {
                value: conf[prop]
            }
        });
    }, {});
}

function findSource (target) {
    // else return falsish undefined
    if (target.hasOwnProperty(key)) {

        let src = target;
        // src is undefined if parent is missing
        while (src && src.hasOwnProperty(key)) {

            src = src.parent;
        }
        return src;
    }
}

function getAccessorTrap (target, key) {

    if (!target.hasOwnProperty(key)) {

        let source = findSource(target);

        if (source) {
            
            let group = `${source.constructor.name}.${key}`;

            let subscribers = mslto.register.get(group);

            target.setDefault(key, source[key]);

            if (subscribers) {

                subscribers.push(target);

            } else {

                mslto.register.set(group, [target]);
            }
        }
    }

    return target[key];
}

function setAccessorTrap (target, key, val) {

    if (!target.hasOwnProperty(key)) {

        target.setDefault(key, { value: val });

    } else {

        return target[key] = val;
    }

    return true;
}
// facilitate component instantiations
export function create (type, node, config = {}) {
    // question - how can you detect if a function is invoked with ".call" and a bound context?
    const parent = this;
    // JSON configuration
    let target = componentConfig[type];
    // if the configuration includes defaults
    if (target.config) {
        // apply the default config for the component constructor
        config = Object.assign(target.config, config);
        // target the component constructor
        target = target.component;
    }
    // instantiate a new component
    const component = new mslto[target](node);
    // define a component proxy
    const reflector = new Proxy(component, {
        // use common accessor traps
        set: setAccessorTrap,
        get: getAccessorTrap
    });
    // curry setDefault
    const setDefault = setDefault.bind(component, node);
    // transform accessors
    const defaults = valuesFor({node, parent, reflector, setDefault});
    // shared component defaults are described in JSON format
    Object.defineProperties(component, componentConfig["defaults"], defaults);

    Object.keys(config).forEach(prop => setDefault(prop, config[prop]));

    return component;
}
