export function importModules (context, schema) {
    return context.keys().reduce((modules, key) => {
        return Object.assign(modules, schema(key, context(key)));
    }, {});
}
