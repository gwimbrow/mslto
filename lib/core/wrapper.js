/*

    The base component class.

*/

export class Wrapper {

    /*

        The constructor receives a reference to a DOM node - the instance
        "wraps" said node, providing additional lifecycle hooks and state
        management. The component class should function regardless of what
        node is provided to the wrapper instance - this could be a vanilla
        HTML element, or a custom element, or etc

    */

    constructor (node) {
        // private id variable
        const id = this.constructor.name.toLowerCase();
        // default to setting the id attribute as the component's name
        node.setAttribute("id", id);
        // define component default accessors
        Object.defineProperties(this, {
            // keep a list of this component's children
            "children": { value: [] },
            // manipulate the node's id attribute instead of storing a variable
            "id": { value: id },
            // for reference
            "isMounted": { value: false, writable: true },
            // do not break encapsulation - return a new reference to the node
            "node": {
                // do not store a reference to the node element, instead
                // return a reference to the node when it is requested.
                // do not provide a "set accessor"
                get () {
                    if (this.isMounted) {
                        // if the component is mounted, query the DOM
                        return node = document.getElementById(id);
                    }
                    // otherwise reference the node itself
                    return node;
                }
            }
        });
    }

    parse (template, ...interpolations) {

        function iterate (component) {

            if (component.willMount()) {

                Object.defineProperties(component, {

                    "isMounting": { value: true, writable: true },
                    "parent":     { value: this.reflector }
                });

                component.node.innerHTML = component.mount();
                component.isMounting = false;

                this.children.push(component);
            }

            return component.node.outerHTML;
        }

        return template.reduce((merge, slice) => {

            let candidate = interpolations.shift();

            if (candidate && candidate.hasOwnProperty("node")) {

                candidate = iterate.call(this, candidate);

            } else if (!candidate) {

                candidate = this[candidate];
            }

            return merge + candidate + slice
        });
    }

    render (parent) {

        if (this.willMount() && !this.hasOwnProperty("parent")) {

            Object.defineProperty(this, "isMounting", {

                value: true, writable: true
            });

            this.node.innerHTML = this.mount();
            this.isMounting = false;

            parent.appendChild(this.node);

            this.didMount();
        }
    }

    willMount() {

        return true;
    }

    mount () {
        // default action is to reflect
        return this.node.innerHTML;
    }

    didMount () {

        this.isMounted = true;

        for (const child of this.children) {
            // cascade to each child node in the DOM tree
            child.didMount();
        }
    }

    willUpdate (key, val) {

        return true;
    }

    didUpdate (key, val) {

    }
}
