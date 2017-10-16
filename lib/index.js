import "babel-polyfill";

import componentConfig from "./config/components";

import Wrapper from "./core/Wrapper";

const context = require.context("./components", true, /\.js$/);

const components = context.keys().reduce((obj, key) => Object.assign(obj, {

    [key.replace(/(^\.(\/|\\|\:)|\..*js$)/g, "")]: context(key).default

}), {});

const register = new Map();

export function inspect () {

    return register;
}

const instance = new Map();

export function lookup (name) {

    return instance.get(name);
}

export function create ({parent, inherited, type, name, node, config = {}}) {

    const defaults = {

        "children": { value: [] },

        "name": { value: name },

        "node": { get () {

            const rendered = document.getElementById(name);

            if (rendered) {

                node = rendered;
            }

            return node;

        } },

        "parent": { value: parent }
    };

    let target = componentConfig[type];

    if (target === undefined) {

        throw new Error(`component type "${type}" is undefined by config/components`);
    }

    if (target.config) {

        config = Object.assign(target.config, config);

        target = target.component;
    }

    if (inherited) {

        config = Object.assign(Object.create(inherited), config);
    }

    node.setAttribute("id", name);

    instance.set(name, new components[target](register, defaults, config));

    return lookup(name);
}

export function reMount (group) {

    if (register.has(group)) {

        return register.get(group).slice().reduceRight((status, target, ndx) => {

            target.status = "DIRTY";

            return status && (function (t) {

                return t.update() && (ndx || t.didMount());

            })(target);

        }, true);      
    }
}
