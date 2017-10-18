// provide a polyfill for older browsers
import "babel-polyfill";
// import the JSON component configurations
import componentConfig from "./config/components";
// create a require "context" for webpack to match and import our components
const context = require.context("./components", true, /\.js$/);
// use the require context to provide a mapping of component names to imports
const components = context.keys().reduce((obj, key) => Object.assign(obj, {
    [key.replace(/(^\.(\/|\\|\:)|\..*js$)/g, "")]: context(key).default
}), {});
// the application "register" is a map of <component name>.<property name> keys
// to arrays containing those component instances which referenced the named
// properties during their mount operations. The component name included in the
// map key reflects the "progenitor" of the property key in the DOM
const register = new Map();
// the instance map references the application's component instances by name
const instance = new Map();
// re-render components in the DOM
function reMount (group) {
    // update the registered components in order from last-rendered to first
    return register.get(group).slice().reduceRight((status, target, ndx) => {
        // components are marked to receive updates - otherwise we get the same
        // outerHTML string from the DOM node without mounting
        target.status = "DIRTY";
        // we want to ensure that all operations complete successfully,
        // and isolate each component's update step
        return status && (function (t) {
            // if this is the last component receiving updates, call didMount
            return t.update() && (ndx || t.didMount());
        })(target);
    }, true);
}
// create returns an instantiated component generated with the provided options
function create ({parent, inherited, type, name, node, config = {}}) {
    // all component instances share these properties, which are defined on the
    // instance-level (not in the component's "props" object)
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
    // throw an error if the <type> is not described within the JSON config
    if (target === undefined) {
        throw new Error(`component type "${type}" is undefined by config/components`);
    }
    // if the config for <type> includes a config block, combine this with any
    // configuration properties provided to create. Properties passed to create
    // take precidence, allowing us to overwrite the component <type> config
    if (target.config) {
        config = Object.assign(target.config, config);
        target = target.component;
    }
    // "inherited" props are delegated lookups to the parent config
    if (inherited) {
        config = Object.assign(Object.create(inherited), config);
    }
    // tag the component's node
    node.setAttribute("id", name);
    // create a new component from the provided options
    instance.set(name, new components[target](register, create, reMount, defaults, config));
    // return the new component
    return lookup(name);
}
// a convenience function that permits referencing instantiated components with
// their name property, which is also the DOM node's id attribute
export function lookup (name) {
    return instance.get(name);
}
// a method for initializing the application's "root" component while not
// exposing the create function (we only want to manage one application tree)
export function init (parentNode, params) {
    // generate the "root" component
    const rootComponent = create(params);
    // render the component and append it to the DOM
    rootComponent.update();
    parentNode.appendChild(rootComponent.node);
    // invoke the didMount step for the whole application tree
    rootComponent.didMount();
    // return a reference to the application's "root" component
    return rootComponent;
}
