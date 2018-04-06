import Core from "../core";

export default class extends Core {

    manifest () {

        this.child = this.create({
            type: "section",
            name: "child",
            node: document.createElement("section")
        });
    }

	mount () {

		return this.parse `
			<h1>${this.context.title}</h1>
            ${this.child}
		`;
	}
}
