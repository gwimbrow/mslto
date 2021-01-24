# misəl-tō
**mslto** is a dynamic reactivity engine that leverages JavaScript's prototypal inheritence chaining to track property lookups and respond to changes through a tree-like data structure.

## concepts
A **mslto** tree begins with a root node, instantiated with `mslto.Provider`. Children are added to the tree by calling an existing node's `create()` method. Reactive data are referenced through a node's `props` accessor.

```js
// example instantiation of a parent "root" node and child node
const parentProps = JSON.stringify({ foo: 'bar' });
const childProps = JSON.stringify({ boom: 'bap' });
const propChangedCallback = function (key, oldValue, newValue, deleted) {
  // do something
};
// note that the same propChangedCallback can be provided to multiple nodes
const parent = new mslto.Provider(parentProps, propChangedCallback);
const child = parent.create(childProps, propChangedCallback);
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

## Responding to Changes
The (optional) callback function provided for each node works in much the same way as the standard [attributeChangedCallback](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#using_the_lifecycle_callbacks) for custom elements.

When it is invoked, `this` points to the Provider instance which received the callback. The callback accepts up to four arguments:

* **key**

  The first argument is an array that contains one or more values. Think of these as a "chain" of property keys with an implied starting point at the `props` object.

  For example, assuming we have a reference to the mslto Provider `node`, accessing `node.params.list[0].foo` establishes reactivity for `node` and the `foo` property in the first element of the `list` array (whether or not  `node` "owns" the `list` property is irrelevant). If the `foo` property in the first element of `list` were to change, the first argument received by this callback would be an array of the following elements: `['list', 0, 'foo']`.

  Because mslto establishes reactivity for nested elements and properties, this argument can be an array of arbitrary length. As a rule, elements of the array may be either strings or integers, with strings representing object keys, and integers array indicies.

* **oldValue**

  The previous value of the property. Following the above example, if `node` was created with the JSON document `{ "list": [{ "foo": "bar" }] }` as its props, this argument would be received as `"foo"` by the callback function.

* **newValue**

  The new value having been set for the property. Following the operation `node.props.list[0] = "baz"`, this argument would be received as `"baz"` in the callback function.

* **deleted**

  This argument will be `true` only when the property in question is an element of an array that was removed by an operation like `Array.prototype.pop()`. Note that while array elements can be removed and re-ordered, mslto does not allow deleting object properties.
