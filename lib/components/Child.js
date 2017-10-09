import Wrapper from "../core/Wrapper";

export default class Child extends Wrapper {
	
	mount () {

		return `

			<p style="color: ${this.props.color}">${this.props.copy}</p>
		`;
	}
}