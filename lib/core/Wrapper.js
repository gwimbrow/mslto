export default class Wrapper {

    static setAccessorTrapFor (target) {

        return function (config, key, val) {

            const progenitor = target.findProgenitor(key);

            while (config) {

                if (config.hasOwnProperty(key) || config[key] === undefined) {
                
                    config[key] = val;

                    return progenitor.update();
                }

                config = Object.getPrototypeOf(config);
            }
        };
    }

    constructor (defaults, config = {}) {

        if (defaults.parent) {

            defaults.parent.value.children.push(this);
        }

        Object.defineProperties(this, Object.assign(defaults, {

            "create": {

                value: params => mslto.create(Object.assign(params, {
                    parent: this,
                    inherited: config
                }))
            },

            "props": {

                value: new Proxy(config, {

                    set: Wrapper.setAccessorTrapFor(this)
                })
            }
        }));
    }

    update () {

        let children = this.children.slice();

        while (children.length) {

            children.pop().update();
        }

        this.element.innerHTML = this.mount();

        return true;
    }

    findProgenitor (key) {

        let source = this;

        while (source.parent && source.parent.props[key] !== undefined) {

            source = source.parent;
        }

        return source;
    }

    mount () {

        return this.element.innerHTML;
    }

    parse (template, ...interpolations) {

        return template.reduce((merge, slice) => {

            return merge + (target => {

                if (target instanceof Wrapper) {

                    target.element.setAttribute("id", target.name);

                    target.element.innerHTML = target.mount();

                    return target.element.outerHTML;
                }

                return target;

            })(interpolations.shift()) + slice;
        });
    }

    didMount () {

        for (const child of this.children) {

            child.didMount();
        }
    }
}
