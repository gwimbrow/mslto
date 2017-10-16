import Wrapper from "../core/Wrapper";

export default class extends Wrapper {

	constructor (...args) {

		super(...args);

		this.drawChart = this.create.bind(null, {

			type: "AppChart",
			name: "son",
			node: document.createElement("article"),
			config: {
				copy: `
					<strong>
						an HTML string passed as part of a declarative
						configuration object sent to mslto.create()
					</strong>
				`
			}
		});
	}
	
	mount () {

		return this.parse `

			<h1>${this.name}</h1>

			${this.drawChart()}

			<p>this component defines <em>color</em> as "${this.props.color}"</p>
		`;
	}
}