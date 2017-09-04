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
        // default to setting the id attribute as the component's name
        node.setAttribute("id", this.constructor.name.toLowerCase());
        // define component default accessors
        Object.defineProperties(this, {
            // keep a list of this component's children
            "children": { value: [] },
            // manipulate the node's id attribute instead of storing a variable
            "id": {
                get ()    { return node.getAttribute("id") }
                set (val) { return !!(node.setAttribute("id", val) }
            },
            // do not break encapsulation - return a new reference to the node
            "node": {
                // do not store a reference to the node element, instead
                // return a reference to the node when it is requested.
                // do not provide a "set accessor"
                get () {
                    if (this.isMounted) {
                        // if the component is mounted, query the DOM
                        return document.getElementById(this.id)
                    }
                    // otherwise reference the node itself
                    return node;
                }
            }
        });
    }

    parse (template, ...interpolations) {

        return template.reduce((merge, slice) => merge + (candidate => {

            if (candidate.hasOwnProperty("node")) {

                if (candidate.willMount()) {

                    const id = `${this.id}.${candidate.constructor.name}`;

                    Object.defineProperties(candidate, {

                        "id":         { value: id.toLowerCase() },
                        "isMounting": { value: true, writable: true }
                        "parent":     { value: this.reflection }
                    });

                    candidate.wrapper.setAttribute("id", candidate.id);
                    candidate.wrapper.innerHTML = candidate.mount();
                    candidate.isMounting = false;

                    this.children.push(candidate);
                }

                return candidate.wrapper.outerHTML;
            }

            return candidate;

        })(interpolations.shift()) + slice);
    }

    render (parent) {

        if (this.willMount() && !this.hasOwnProperty("parent")) {

            const id = this.constructor.name;

            Object.defineProperties(this, Object.assign({

                "id": { value: id.toLowerCase() }

            }, this.getDefaults()));

            this.wrapper.setAttribute("id", this.id);
            this.wrapper.innerHTML = this.mount();

            parent.appendChild(this.wrapper);

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
