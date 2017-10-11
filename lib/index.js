import "babel-polyfill";

import componentConfig from "./config/components";

import Wrapper from "./core/Wrapper";

const context = require.context("./components", true, /\.js$/);

const components = context.keys().reduce((obj, key) => Object.assign(obj, {

    [key.replace(/(^\.(\/|\\|\:)|\..*js$)/g, "")]: context(key).default
}), {});

export const register = new Map();

export function create ({parent, inherited, type, name, element, config = {}}) {

    const common = {

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

    let target = componentConfig[type];

    if (target.config) {

        config = Object.assign(target.config, config);

        target = target.component;
    }

    if (inherited) {

        inherited = Object.create(inherited);

        config = Object.assign(inherited, config);
    }

    if (parent) {

        common.parent = { value: parent };
    }

    element.setAttribute("id", name);

    return (Constructor => new Constructor(common, config))(components[target]);
}

export function reMount (group) {

    const registrants = mslto.register.get(group).slice();

    while (registrants.length) {

        const target = registrants.pop();

        target.status = "DIRTY";

        target.update();

        if (!registrants.length) {

            target.didMount();
        }
    }

    return true;
}
