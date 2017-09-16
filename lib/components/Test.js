import Wrapper from "../core/Wrapper";

export default class Test extends Wrapper {

    mount () {
        
        const child = mslto.create("test-child", document.createElement("header"));

        return this.parse `
            <h1>${this.title}</h1>
            <section>
                ${child}
            </section>
        `;
    }
}
