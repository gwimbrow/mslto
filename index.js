import "babel-polyfill";

import componentConfig from "./config/components";

import Wrapper from "./lib/core/Wrapper";

const context = require.context("./lib/components", true, /\.js$/);

const components = context.keys().reduce((imports, key) => {

    const item = context(key);

    return Object.assign(imports, {

        [key.replace(/(^\.(\/|\\|\:)|\..*js$)/g, "")]: item.default
    });
}, {});

export function create ({parent, inherited, type, name, element, config = {}}) {

    let target = componentConfig[type];

    if (target.config) {

        config = Object.assign(target.config, config);

        target = target.component;
    }

    if (inherited) {

        inherited = Object.create(inherited);

        config = Object.assign(inherited, config);
    }

    const defaults = {

        "children": { value: [] },

        "element": {

            get () {

                let el = document.getElementById(name);

                if (el) {

                    element = el;
                }

                return element;
            }
        },

        "name": { value: name }
    };

    if (parent) {

        defaults.parent = { value: parent };
    }

    const Constructor = components[target];

    return new Constructor(defaults, config);
}
