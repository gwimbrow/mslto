import Wrapper from "../core/Wrapper";

export default class extends Wrapper {
	
	mount () {

		return `

			<p style="color: ${this.props.color}">
				the child component inherits <em>color</em> as "${this.props.color}",
				and defines <em>copy</em> as ${this.props.copy}
			</p>
		`;
	}
}