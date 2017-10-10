import "babel-polyfill";

import componentConfig from "./config/components";

import Wrapper from "./core/Wrapper";

const context = require.context("./components", true, /\.js$/);

const components = context.keys().reduce((obj, key) => Object.assign(obj, {

    [key.replace(/(^\.(\/|\\|\:)|\..*js$)/g, "")]: context(key).default
}), {});

export function create ({parent, passed, type, name, element, config = {}}) {

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

    if (passed) {

        passed = Object.create(passed);

        config = Object.assign(passed, config);
    }

    if (parent) {

        common.parent = { value: parent };
    }

    return (Constructor => new Constructor(common, config))(components[target]);
}
