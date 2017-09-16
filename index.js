import "babel-polyfill";

import componentConfig from "./config/components";

import Wrapper from "./lib/core/Wrapper";

import {mapObj} from "./lib/util";

const context = require.context("./lib/components", true, /\.js$/);

const components = context.keys().reduce((obj, key) => {

    let name = key.replace(/(^\.(\/|\\|\:)|\..*js$)/g, "");

    return Object.assign(obj, {
        [name]: context(key).default
    });
}, {});

export const register = new Map();

export function reMount (src, key, val) {

    const group = `${src.constructor.name}.${key}`;

    const subscribers = register.get(group).slice();

    while (subscribers.length) {

        let target = subscribers.pop();

        target[key] = val;
    }
}

function findSource (target, key) {

    if (target && target.hasOwnProperty(key)) {

        let src = target;

        while (src.hasOwnProperty("parent")) {

            let parent = src.parent;

            if (parent.hasOwnProperty(key)) {

                src = parent;

            } else {

                break;
            }
        }

        return src;
    }

    return false;
}

function getAccessorTrap (target, key) {

    if (!target.hasOwnProperty(key)) {

        let source = findSource(target.parent, key);

        if (source) {
            
            let group = `${source.constructor.name}.${key}`;

            let subscribers = register.get(group);

            target.setDefault(key, source[key]);

            subscribers.push(target);
        }
    }

    return target[key];
}

function setAccessorTrap (target, config, val) {

    const key = typeof config === "string" ? config : config.value;

    const source = findSource(target, key);

    if (source) {

        mslto.reMount(source, key, val);

    } else {
        // this is the genesis of a new subscribers group
        let group = `${target.constructor.name}.${key}`;

        console.log(target, group);

        target.setDefault(key, config.value ? config : {

            value: val, writable: true, configurable: true
        });

        register.set(group, [target]);
    }

    return true;
}

// facilitate component instantiations
export function create (type, node, config = {}) {
    // JSON configuration
    let target = componentConfig[type];
    // if the configuration includes defaults
    if (target.config) {
        // apply the default config for the component constructor
        config = Object.assign(target.config, config);
        // target the component constructor
        target = target.component;
    }

    const accessors = { node };

    if (this instanceof Wrapper) {

        accessors.parent = this;
    }

    const rel = mapObj(accessors, (obj, key) => {
        return {
            [key]: { value: obj[key] }
        };
    });

    const defaults = Object.assign(componentConfig["defaults"], rel);

    const Constructor = components[target];

    const component = new Constructor(defaults, config, {
        get: getAccessorTrap,
        set: setAccessorTrap
    });

    return component;
}
