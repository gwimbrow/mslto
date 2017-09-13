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
        // return the component proxy
        return this.reflector;
    }

    // trace the origin of a property in the DOM
    findProgenitor (key) {

        if (this.hasOwnProperty(key)) {

            if (this.hasOwnProperty("parent") && this.parent.hasOwnProperty(key)) {

                return this.parent.findProgenitor(key);
            }

            return this;
        }
    }

    parse (template, ...interpolations) {

        function iterate (component) {

            if (component.willMount()) {

                Object.defineProperty(component, "parent", { value: this.reflector });

                component.isMounting = true;
                component.node.innerHTML = component.mount();
                component.isMounting = false;

                this.children.push(component);
            }

            return component.node.outerHTML;
        }

        return template.reduce((merge, slice) => {

            let candidate = interpolations.shift();

            if (candidate.hasOwnProperty("node")) {

                candidate = iterate.call(this, candidate);
            }

            return merge + candidate + slice
        });
    }

    render (parent) {

        if (this.willMount() && !this.hasOwnProperty("parent")) {

            this.isMounting = true;
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
