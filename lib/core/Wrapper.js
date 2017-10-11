export default class Wrapper {

    constructor (defaults, config = {}) {

        const reflection = this;

        if (defaults.parent) {

            defaults.parent.value.children.push(this);
        }

        Object.defineProperties(this, Object.assign(defaults, {

            "create": {

                value: params => mslto.create(Object.assign(params, {
                    parent: reflection,
                    inherited: config
                }))
            },

            "props": {

                value: new Proxy(config, {

                    get (target, key) {

                        if (reflection.status === "MOUNTING") {
    
                            const progenitor = reflection.findProgenitor(key);

                            const group = `${progenitor.name}.${key}`;

                            if (mslto.register.has(group)) {

                                mslto.register.get(group).push(reflection);

                            } else {

                                mslto.register.set(group, [reflection]);
                            }
                        }

                        return target[key];
                    },

                    set (target, key, val) {

                        if (target.hasOwnProperty(key) || target[key] === undefined) {

                            const progenitor = reflection.findProgenitor(key);

                            const group = `${progenitor.name}.${key}`;

                            target[key] = val;

                            return mslto.reMount(group);

                        } else if (reflection.parent) {                            

                            return !!(reflection.parent.props[key] = val);
                        }
                    }
                })
            }
        }));

        this.status = "DIRTY";
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

            this.element.innerHTML = this.mount();

            this.status = "MOUNTED";
        }

        return this.element.outerHTML;
    }

    mount () {

        return this.element.innerHTML;
    }

    parse (template, ...interpolations) {

        return template.reduce((merge, slice) => {

            return merge + (target => {

                return target instanceof Wrapper ? target.update() : target;

            })(interpolations.shift()) + slice;
        });
    }

    didMount () {

        for (const child of this.children) {

            child.didMount();
        }
    }
}
