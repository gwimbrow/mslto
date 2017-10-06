class Node {

    static create (target, inherited, type, config) {

        const Constructor = components[type].constructor;

        const child = new Constructor(config, inherited);

        target.children.push(child);

        child.parent = target;

        return child;
    }

    static setAccessorTrap (target, config, key, val) {

        const progenitor = target.findProgenitor(key);

        while (config) {

            if (config.hasOwnProperty(key) || config[key] === undefined) {
            
                config[key] = val;

                return Node.update(progenitor);
            }

            config = Object.getPrototypeOf(config);
        }
    }

    static update (target) {

        const children = target.children.slice();

        while (children.length) {

            Node.update(children.pop());
        }

        return true;
    }

    constructor (config = {}, inherited) {

        if (inherited) {

            inherited = Object.create(inherited);

            config = Object.assign(inherited, config);          
        }

        Object.defineProperties(this, {

            "children": {

                value: []
            },

            "create": {

                value: Node.create.bind(null, this, config)
            },

            "props": {

                value: new Proxy(config, {

                    set: Node.setAccessorTrap.bind(null, this)
                })
            }
        });
    }

    findProgenitor (key) {

        let source = this;

        while (source.parent && source.parent.props[key] !== undefined) {

            source = source.parent;
        }

        return source;
    }
}
