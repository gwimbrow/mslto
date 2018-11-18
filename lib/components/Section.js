import Core from "../core";

export default class extends Core {

	mount () {
		return `
			<h2 style="color: ${this.props.settings.color}">${this.props.header}</h2>
		`;
	}
}
