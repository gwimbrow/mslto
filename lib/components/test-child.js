import {Wrapper} from "../core/wrapper";

export class TestChild extends Wrapper {

    mount () {

        this.newProp = "a new prop";

        return this.parse `

            <em>inherits ${this.title}</em>
            <h2>defaults ${this.subTitle}</h2>
            <strong>amended with ${this.newProp}</strong>
        `;
    }
}
