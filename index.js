import "babel-polyfill";

import componentConfig from "./config/components";

import Wrapper from "./lib/core/Wrapper";

import {mapImports, mapObj} from "./lib/util";

const context = require.context("./lib/components", true, /\.js$/);

const components = mapImports(context, (item, key) => {

    let name = key.replace(/(^\.(\/|\\|\:)|\..*js$)/g, "");

    return { [name]: item.default };
});

export const register = new Map();

export function reMount (src, key, val) {

    const group = `${src.name}.${key}`;

    const subscribers = register.get(group).slice();

    console.log(subscribers)

    while (subscribers.length) {

        let target = subscribers.pop();

        target[key].value = val;
    }
}

// facilitate component instantiations
export function create (type, name, node, props = {}) {
    // JSON configuration
    let target = componentConfig[type];
    // if the configuration includes defaults
    if (target.props) {
        // apply the default props for the component constructor
        props = Object.assign(target.props, props);
        // target the component constructor
        target = target.component;
    }

    const accessors = { create, name, node };

    if (this instanceof Wrapper) {

        accessors.parent = this;
    }

    const Constructor = components[target];

    const defaults = Object.assign(componentConfig["defaults"], mapObj(accessors, (item, key) => {
        return {[key]: {value: item}};
    }));

    const component = new Constructor(defaults, props);

    return component;
}
