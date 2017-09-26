export function mapObj (obj, schemaFunction) {

	return Object.keys(obj).reduce((defs, key) => {

		return Object.assign(defs, schemaFunction(obj[key], key));
	}, {});
}

export function mapImports (context, schemaFunction) {

	return context.keys().reduce((defs, key) => {

    	return Object.assign(defs, schemaFunction(context(key), key));
    }, {});
}
