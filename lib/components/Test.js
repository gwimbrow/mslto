import Wrapper from "../core/Wrapper";

export default class Test extends Wrapper {

    mount () {
        
        const child = this.create("test-child", "conf_0", document.createElement("header"));

        return this.parse `
            <h1>${this.props.title}</h1>
            <section>
                ${child}
            </section>
        `;
    }
}
