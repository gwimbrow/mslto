// import component configuration
import componentConfig from "./config/components";
// re-export component modules
export * from "./modules";
// the component register is integral to the reMount / notifications pattern
const register = new Map();
// describe the component get/set-accessor pattern for observed properties
function setDefault (node, config, key, val) {
    // keep the node and configuration object private
    return !!(Object.defineProperty(this, key, {
        // just return the value
        get () { return config[key] || config.reflector[key] },
        // setting a default triggers updates - the set accessor will be
        // triggered only if the value passes validation
        set (val) {
            // define a new property if requested
            let success = val ? !!(node[key] = config[key] = val) : true;
            // trigger any pre-update actions in this hook, which must return
            // true if the update should proceed - up to now no values are set
            success = !!(this.willUpdate(key, val));
            // components can reject an update
            if (success) {
                // assign the value to the node, and update the config
                success = !!(node[key] = config[key] = val);
                // if it is mounted, re-mount the component's node
                if (this.isMounted) {
                    // this will be triggered by mslto.reMount()
                    this.node.innerHTML = this.mount();
                }
                // immmediately trigger the didUpdate hook
                this.didUpdate(key, val);
            }
            // will return a boolean
            return success;
        }
    }));
}
// describe the get/set-accessor traps for the component proxy - used for
// triggering updates for different notification groups, based on the property
// key and each node's relationship in the DOM. property names may be reused
// across disconnected portions of the DOM tree - we are concerned with knowing
// which component was the first of any of these segments to have described the
// property, because it is to this "root" node that each child component may
// delegate a property lookup. whenever a lookup is performed by a child node,
// the get-accessor trap performes a check to determine whether to delegate a
// lookup to the parent node (if one exists - otherwise the prop will be,
// accurately, undefined). If the lookup is performed, the node is added to the
// appropriate notifications group identified with whichever node is the
// aformentioned "root"

// used to trace the origin of a property in the DOM
function findProgenitor (key, node) {

    let progenitor = node;

    while (node && node.hasOwnProperty(key) && node[key] === progenitor[key]) {

        progenitor = node;
        node = node.parent;
    }

    return progenitor;
}

function getAccessorTrap (target, key) {

    // ha => the parent isn't yet defined at the time of mounting, so the get
    // accessor trap will fail before it has a chance to succeed.

    // find the progenitor of this prop
    const progenitor = findProgenitor(key, target.parent);
    // this node doesn't have [key] - can it be inherited from a parent node?
    if (!target.hasOwnProperty(key) && progenitor) {
        // if the property can be inherited
        if (progenitor.hasOwnProperty(key)) {
            // set a new default property on this node
            target.setDefault(key, progenitor[key]);
        }
    }
    // if the target received the default, and is about to mount
    if (target.hasOwnProperty(key) && progenitor && target.isMounting) {
        // groups are identified as a combination of progenitor and key
        const group = `${progenitor.constructor.name}:${key}`;
        // add this component to the correct notifications group
        mslto.register.set(group, (mslto.get(group) || []).concat(target));
    }
    // if we have the property, just return it - otherwise it is undefined
    return target[key];
}

function setAccessorTrap (target, key, val) {

    if (target.hasOwnProperty(key)) {
        // is the property shared?
        const progenitor = findProgenitor(key, target.parent);

        if (progenitor) {
            // is the property registered?
            if (mslto.register.has(`${progenitor.constructor.name}:${key}`)) {
                // we need to trigger a re-mount
                return mslto.remount(progenitor, key, val);
            }
        }

    } else {
        // nothing stopping us from setting a new default
        return target.setDefault(key, val);
    }
}
// facilitate component instantiations
function create (type, node, config = {}) {
    // lookup the component config
    let candidate = componentConfig[type];
    // if the configuration includes defaults
    if (candidate.config) {
        // apply the default config for the component constructor
        // configuration described in code will mask default properties
        config = Object.assign(candidate.config, config);
        // target the component constructor
        candidate = candidate.component;
    }
    // instantiate a new component
    const component = new mslto[candidate](node);
    // define a component proxy
    const reflector = new Proxy(component, {
        // use common accessor traps
        set: setAccessorTrap,
        get: getAccessorTrap
    });
    // curry the otherwise-exported setDefault
    const setupProp = setDefault.bind(component, node, config);

    Object.keys(Object.assign(config)).forEach(setupProp);

    Object.defineProperties(component, {

        "reflector": { value: reflector },
        "setDefault": { value: setDefault }
    });

    return reflector;
}

// we need a way to track, unambiguously, which components belong to what groups
// such that we should know, if a prop is updated on one component, all of those
// that belong to the same group should recieve the update prop in the correct
// sequence of events (willMount / willUpdate, mount, didUpdate, didMount).

function reMount (progenitor, key, val) {

    const group = `${progenitor.constructor.name}:${key}`;

    const receivers = mslto.register.get(id).slice();

    let component = recievers.pop();

    while (receivers.length) {

        component = receivers.pop();

        component[key] = val;
    }

    component.didMount();
}

export { create, register, reMount };
