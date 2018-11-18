import Core from "../core";

export default (function () {

    let child = undefined;

    return class Page extends Core {

        manifest () {

            child = this.create({
                type: "section",
                name: "child",
                node: document.createElement("section")
            });
        }

    	mount () {

    		return this.parse `
    			<h1>${this.props.title}</h1>
                ${child}
    		`;
    	}
    }
})();