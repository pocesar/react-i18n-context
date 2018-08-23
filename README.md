[![Build Status](https://travis-ci.org/pocesar/react-i18n-context.svg?branch=master)](https://travis-ci.org/pocesar/react-i18n-context)
[![npm version](https://badge.fury.io/js/react-i18n-context.svg)](https://badge.fury.io/js/react-i18n-context)

# react-i18n-context

Making i18n in React 16.3+ the easiest way possible with the new Context API

## Highlights

* Async rendering safe out-of-the-box (thus, Suspense friendly)
* No string interpolation, means no DSL or weird string implementation of things that should be code
* Easily group components translations in sub POJOs
* Can use Redux store, AJAX, Websockets, POJOs and JSON as translation sources
* New React 16.3 context API, future proof
* Can use strings, objects and arrays in your translation file / object
* Access translation paths like you would in Javascript `some.deep.path[0]`
* Good performance and jank free rendering, since there's no magic beyond async code
* Makes it easy to mix HTML, Javascript templates and tagged template literals that are no possible in other i18n libraries
* Render props as the choice for elegant and performant code
* May use either inline components or HoC alternative with the context passed as props
* TypeScript (but declarations can be used in plain/babel JS code on vscode)
* React.forwardRef, React.createContext, Context.Provider, Context.Consumer

## Why?

Most existing libraries rely DSLs and string interpolation, or gettext, and they are usually slow compared to simpler javascript template literals. Complex text and mix of HTML, dynamic attributes, plurals, become a mess over time. Other libraries also have complex internals that doesn't live up to performance requirements.

Also, it threats everything as async by default, so you won't be jumping through hoops to make things work. But it doesn't assume anything else, not even your data format libraries, so you can pick whatever is best for your use case (by injecting localized helpers down the context)

## How?

```sh
npm i react-i18n-context --save
```

if on a Typescript project or on vscode, you should either have a peerDependency with the types and add `@types/lodash.get` and `@types/react`. Minimum React version is 16.3, but 16.4+ is recommended because of recent bug fixes.

## Caveats

* Can't use dots, numbers and `[]` in path names, since the have special meaning in [lodash.get](https://lodash.com/docs/#get). so to use `some.path` you need to escape de `.`
* Tested only with UTF-8, not sure if it works with other charsets
* `componentDidCatch` might swallow some errors in production, therefore need to use `errorHandler` even for logging UI errors
* Although you can bundle your json files with your translations, not many people will have use for 60 languages and a huge bundle just for translations

## License

MIT