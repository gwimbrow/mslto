export default class Wrapper {

    constructor (register, defaults, config = {}) {

        const _this = this;

        if (defaults.parent.value !== undefined) {

            defaults.parent.value.children.push(_this);
        }

        Object.defineProperties(_this, Object.assign(defaults, {

            "create": { value: params => mslto.create(Object.assign({

                inherited: config,

                parent: _this

            }, params)) },

            "props": { value: new Proxy(config, {

                get (target, key) {

                    if (_this.status === "MOUNTING") {

                        const progenitor = _this.findProgenitor(key);

                        const group = `${progenitor.name}.${key}`;

                        if (register.has(group)) {

                            const filtered = register.get(group).filter(i => i !== _this);

                            register.set(group, filtered.concat(_this));
                        
                        } else {

                            register.set(group, [_this]);
                        }
                    }

                    return target[key];
                },
                
                set (target, key, val) {

                    if (target.hasOwnProperty(key) || target[key] === undefined) {

                        const progenitor = _this.findProgenitor(key);

                        const group = `${progenitor.name}.${key}`;

                        target[key] = val;

                        return mslto.reMount(group);

                    } else if (_this.parent !== undefined) {                            

                        return !!(_this.parent.props[key] = val);
                    }
                }
            })},

            "status": { value: "DIRTY", writable: true }
        }));
    }

    findProgenitor (key) {

        if (this.parent && this.parent.props[key]) {

            return this.parent.findProgenitor(key);
        }

        return this;
    }

    update () {

        if (this.status === "DIRTY") {

            this.status = "MOUNTING";

            this.node.innerHTML = this.mount();
        }

        return this.node.outerHTML;
    }

    mount () {

        return this.node.innerHTML;
    }

    parse (template, ...interpolations) {

        return template.reduce((merge, slice) => merge + (target => {

            if (target instanceof Wrapper) {

                this.status = "DIRTY";

                target = target.update();

                this.status = "MOUNTING";                   
            }

            return target;

        })(interpolations.shift()) + slice);
    }

    didMount () {

        this.status = "MOUNTED";

        return this.children.reduce((status, target) => {

            return status && target.didMount();

        }, true);
    }

    render (parentNode) {

        if (this.status === "DIRTY" && this.parent === undefined) {

            this.update();

            parentNode.appendChild(this.node);

            this.didMount();

        } else {

            throw new Error("render may only be invoked for un-mounted root nodes");
        }
    }
}
