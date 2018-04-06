import {importModules} from "utils";
// import the flat JSON component configuration
import componentConfig from "./config/components";
// create a require "context" for webpack to match and import our components
const context = require.context("./components", true, /\.js$/);
// use the require context to provide a mapping of component names to imports
const components = importModules(context, (key, item) => {
    return {
        // parse out filenames from path strings
        [key.replace(/(^\.(\/|\\|\:)|\..*js$)/g, "")]: item.default
    };
});
// the application "register" is a map of <component name>.<property name> keys
// to arrays containing those component instances which referenced the named
// properties during their mount operations. The component name included in the
// map key reflects the "progenitor" of the property key in the DOM
const register = new Map();
// the instances map references the application's component instances by name
const instances = new Map();
// re-render components in the DOM
function reMount (group) {
    // update the registered components in order from last-rendered to first
    return register.get(group).slice().reduceRight((status, target, ndx) => {
        // components are marked to receive updates - otherwise we get the same
        // outerHTML string from the DOM node without mounting
        target.status = "DIRTY";
        // we want to ensure that all operations complete successfully
        // if this is the last component receiving updates, call didMount
        return status && target.update() && (ndx || target.didMount());
    }, true);
}
// create returns an instantiated component generated with the provided options
function create ({parent, context, type, name, node, config = {}}) {
    // all component instances share these properties, which are defined on the
    // instance-level (not in the component's "context" object)
    const defaults = {
        // parent will be undefined for the application's "root" component
        "parent":   { value: parent },
        "name":     { value: name },
        "children": { value: [] },
        "node":     { get () {
            // find the element if it has been rendered to the DOM
            const rendered = document.getElementById(name);
            // update our internal reference
            if (rendered) {
                node = rendered;
            }
            // return the DOM element
            return node;
        } }
    };
    // read the JSON configuration for <type>
    let target = componentConfig[type];
    // throw an error if <type> is not in the JSON config
    if (target === undefined) {
        throw new Error(`component type "${type}" is not defined`);
    }
    // merge props with the default config for <type>
    if (target.config) {
        // props passed to the function take precidence over defaults
        config = Object.assign({}, target.config, config);
        try {
            // throw an error if target.component is not defined
            target = target.component;
        } catch (err) {
            throw err;
        }
    }
    // "inherited" context delegates lookups to a parent node in the app tree
    if (context) {
        // re-defining props will break the chain of prototypal inheritence
        config = Object.assign(Object.create(context), config);
    }
    // tag the component's node
    node.setAttribute("id", name);
    // create a new component from the provided options
    instances.set(name, new components[target](register, create, reMount, defaults, config));
    // return the new component
    return lookup(name);
}
// a convenience function that permits referencing instantiated components with
// their name property, which is also the DOM node's id attribute
export function lookup (name) {
    return instances.get(name);
}
// a method for initializing the application's "root" component while not
// exposing the create function (we only want to manage one application tree)
export function init (parentNode, options) {
    // generate the "root" component
    const rootComponent = create(options);
    // render the component and append it to the DOM
    rootComponent.update();
    parentNode.appendChild(rootComponent.node);
    // invoke the didMount step for the whole application tree
    rootComponent.didMount();
    // return a reference to the application's "root" component
    return rootComponent;
}
