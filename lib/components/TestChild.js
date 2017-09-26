import Wrapper from "../core/Wrapper";

export default class TestChild extends Wrapper {

    mount () {

        this.props.newProp = "a new prop";

        return this.parse `

            <em>inherits ${this.props.title}</em>
            <h2>defaults ${this.props.subTitle}</h2>
            <strong>amended with ${this.props.newProp}</strong>
        `;
    }
}
