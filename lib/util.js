function schemaReducer (boundSchema, obj, key) {

	return Object.assign(obj, boundSchema(key));
}

export function mapObj (obj, schemaFunction) {
	
	const scm = schemaFunction.bind(null, obj);
	const rdc = schemaReducer.bind(null, scm);

	return Object.keys(obj).reduce(rdc, {});
}
