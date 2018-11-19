export function mapObj (obj, schema) {
	return Object.keys(obj).reduce((acc, next) => {
		return Object.assign(acc, schema(next, obj[next]));
	}, {});
}
export function importModules (context, schema) {
    return context.keys().reduce((modules, key) => {
        return Object.assign(modules, schema(key, context(key)));
    }, {});
}
export const regulator = new class {
	enqueue (fn) {
		Promise.resolve().then(fn);
	}
}
