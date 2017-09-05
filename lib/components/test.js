import {Wrapper} from "../core/wrapper";

export class Test extends Wrapper {

    willMount () {

        this.child = mslto.create("test-child", document.createElement("header"));

        return true;
    }

    mount () {

        return this.parse `
            <h1>${this.title}</h1>
            <section>
                ${this.child}
            </section>
        `;
    }
}
