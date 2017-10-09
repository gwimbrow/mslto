import Wrapper from "../core/Wrapper";

export default class Parent extends Wrapper {

	constructor (...args) {

		super(...args);

		this.child = this.create({
			name: "son",
			type: "Child",
			element: document.createElement("article"),
			config: {
				copy: "this is a subtitle"
			}
		});
	}
	
	mount () {

		return this.parse `

			<h1>${this.name}</h1>
			${this.child}
		`;
	}
}