# misəl-tō
**mslto** is a dynamic reactivity engine based on prototype chaining. mslto provides a stand-alone reactivity module for browser-based applications that tracks and responds to changes through a tree-like data structure. mslto is not an application framework; the engine only handles reactivity, and can (in theory) work in tandem with any other browser application framework.

## concepts
A mslto tree begins with a root node, instantiated with `mslto.Provider`. Children are added to the tree by calling an existing node's `create()` method. Reactive data are referenced through a node's `props` accessor.

```js
// data provided for mslto nodes are stringified JSON
const parentProps = JSON.stringify({ foo: 'bar' });
const childProps = JSON.stringify({ boom: 'bap' });
// a callback triggered whenever any reactive prop the node has referenced changes
function propChangedCallback (key, oldValue, newValue, deleted) {
  // see below for documentation of the propChangedCallback arguments
};
// both props and propChangedCallback are optional
const parent = new mslto.Provider(parentProps);
const child = parent.create(childProps, propChangedCallback);
// each node exposes a 'props' accessor for reactive data
// child nodes can reference data belonging to a parent node, or any node further "up" the tree
child.props.foo // => 'bar'
parent.props.foo = 'baz' // => triggers propChangedCallback
// parent nodes cannot reference properties belonging to nodes further "down" the tree
parent.props.boom // => undefined
```

Reactivity is established on the fly, whenever any node references any property that is "visible" through its `props` object, following the rule of prototypal chaining (that is, if the referenced property exists somewhere in the tree structure either belonging to or "above" that object: see [this explainer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain) if prototypal inheritance is confusing).

In mslto, nodes delegate both *get* and *set* operations to their parent if they do not own a referenced property. For vanilla JavaScript objects, a *set* operation instead defines a new property for a child, rather than updating that property on the parent:

```js
// in vanilla JavaScript:
const parent = { foo: 'bar' };
const child = Object.create(parent);
// referencing 'foo' on the child delegates to the parent
child.foo // => 'bar'
// setting a new value for the same property does not update the parent
child.foo = 'baz';
// instead, a new property is defined for the child that 'masks' the parent property
parent.foo // => 'bar'
child.foo // => 'baz'
```

```js
// in mslto:
const parent = new mslto.Provider(JSON.stringify({ foo: 'bar' }));
const child = parent.create();
// again, referencing 'foo' on the child delegates to the parent node
child.props.foo // => 'bar'
// but, setting a value for the same property does update the parent
child.props.foo = 'baz'
parent.props.foo // => 'baz'
```

Unlike vanilla JavaScript, mslto does not allow new properties to be defined post-instantiation of a node. Elements belonging to arrays can be added, removed, and re-ordered, but objects which are elements of arrays are subject to the same limitations:

```js
const node = new mslto.Provider(JSON.stringify({ foo: [] }));
// this will throw an error
delete node.props.foo
// these are permitted
node.props.foo.push({ bar: 'baz' }, { boom: 'bap' });
node.props.foo.reverse();
node.props.foo.pop();
// but this will also throw an error
delete node.props.foo[0].boom
```


### Responding to Changes
The (optional) callback function provided for each node works in much the same way as the standard [attributeChangedCallback](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#using_the_lifecycle_callbacks) for custom elements.

When it is invoked, `this` points to the Provider instance which received the callback at instantiation time (meaning it is bound to the node returned by either `new mslto.Provider(props, propChangedCallback)` or `parent.create(props, propChangedCallback)`). The same callback function can be shared by any number of nodes, and will by called with the appropriate context. The callback accepts up to four arguments:

* **key(s)**

  The first argument is an array that contains one or more values. Think of these as a "chain" of property keys with an implied starting point at the `props` object.

  For example, assuming we have a reference to the mslto Provider `node`, accessing `node.params.list[0].foo` establishes reactivity for `node` and the `foo` property in the first element of the `list` array (whether or not  `node` "owns" the `list` property is irrelevant). If the `foo` property in the first element of `list` were to change, the first argument received by this callback would be an array of the following elements: `['list', 0, 'foo']`.

  Because mslto establishes reactivity for nested elements and properties, this argument can be an array of arbitrary length. As a rule, elements of the array may be either strings or integers, with strings representing object keys, and integers array indices.

* **oldValue**

  The previous value of the property. Following the above example, if `node` was created with the JSON document `{ "list": [{ "foo": "bar" }] }` as its props, this argument would be received as `"foo"` by the callback function.

* **newValue**

  The new value having been set for the property. Following the operation `node.props.list[0] = "baz"`, this argument would be received as `"baz"` in the callback function.

* **deleted**

  This argument will be `true` only when the property in question is an element of an array that was removed by an operation like `Array.prototype.pop()`. Note that while array elements can be removed and re-ordered, mslto does not allow deleting object properties.

```js
const node = new mslto.Provider(
  JSON.stringify({ foo: [{ bar: 'baz' }] }),
  function (key, oldValue, newValue, deleted) {
    // when the function is triggered by the operation below,
    // this = node
    // key = ['foo', 0, 'bar']
    // oldValue = 'baz'
    // newValue = 'bap'
    // deleted = false
  }
);
// let's update the value of a prop in the reactive state.
// note that reactivity is established through the following 'set' operation,
// which also triggers the node's propChangedCallback
node.props.foo[0].bar = 'bap';
```

### Data Persistence
At some point, you'll want to get a copy of the data object belonging to some node in the mslto tree, perhaps to include in a network request to a back-end API. mslto nodes expose a `data` accessor for this purpose, which returns a serialized copy of their reactive state:

```js
// the props passed to a node at instantiation time must be a stringified JSON object
const node = new mslto.Provider(JSON.stringify({ foo: 'bar' }));
// the reactive data may be updated
node.props.foo = 'baz';
// then retrieved in serialized form, ready to be sent elsewhere by the application
node.data // => '{ "foo": "baz" }'
```

## Rationale

mslto models data in a tree structure wherein each node "owns" a part of the whole application "state", whilst making that data available for any of its child nodes. Because of how the system leverages prototypal chaining, there is no need to explicitly pass props down from one node to another. The mslto application state neither has to reflect the structure of the DOM nor align with any particular framework or architecture governing UI components.

UI components and other elements interact with data by referencing the reactive `props` object through any of the nodes which together form the mslto tree structure. Once reactivity is established through a node for a given property in the application state, future changes to that property trigger the node's `propChangedCallback` function, which may in turn update a UI component.

The way which UI components are built, including how they respond to changes (for example, through `observedAttributes` and the `attributeChangedCallback`, in the case of [custom elements](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements)) is outside the scope for the reactivity engine which mslto provides. All that is important is for a particular component or element to reference reactive data through a mslto node's `props`, and for the corresponding `propChangedCallback` to in some way update that component when changes are registered.

mslto enforces a strict separation-of-concerns between the source of data and the reactive "state" which it manages. Data provided to a mslto node must be a stringified JSON object, rather than a native JavaScript object. Likewise, the data exposed by a node through the `data` accessor are provided as serialized objects. If the application requires data to be represented in some other form or type - such as date objects, which cannot be reliably serialized - that logic should be defined within the scope of the given UI component or other element.

## Supported Browsers

mslto is architected with the built-in [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) object, and therefore cannot support obsolete browsers like Internet Explorer. At this time, there are no plans for developing anything like a "compatibility mode" for IE 11.
