import Core from "../core";

export default class extends Core {

	mount () {
		return `
			<h2 style="color: ${this.context.color}">${this.context.header}</h2>
		`;
	}
}
