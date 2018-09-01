import "babel-polyfill"
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import moment from 'moment'
import 'moment/locale/fr'
import 'moment/locale/pt'
import 'moment/locale/de'
import {
  I18nAsyncLoader,
  I18nProvider,
  I18nRawConsumer,
  I18nErrorHandler,
  I18nReceiver,
  I18nInline,
  I18nRender,
  I18nPath,
  I18nHelper,
  I18nHelperChildren,
  withI18n,
  WithI18nProps
} from '../index'

interface MyHelpers {
  moment: (date: Date) => moment.Moment
}

const CurrentLanguage = withI18n(({ i18n }) => (
  <>[Internal language code: {i18n.lang}]</>
))

interface ComponentState {
  count: number
}

class WelcomeBackBare extends React.PureComponent<WithI18nProps<{name: string}>> {
  render() {
    return (
      <span>{`${this.props.i18n.get('welcomeback.main')}, ${this.props.name || this.props.i18n.get('welcomeback.fallback')}`}</span>
    )
  }
}

const WelcomeBack = withI18n(WelcomeBackBare)

class Counter extends React.PureComponent<{}, ComponentState> {
  state = {
    count: 0
  }

  inc = () => {
    this.setState((prev) => {
      return {
        count: prev.count + 1
      }
    })
  }

  render() {
    return (
      <>
        <p><I18nInline path="complex" /></p>
        <div>
          <I18nRender<{have: string, count: string[], milk: string, alot: string}> path="have-milk">
            {(translation) => (
              <div>
                {`${translation.have} ${this.state.count} ${translation.count[this.state.count == 1 ? 1 : 0]} ${translation.milk}`}
                {' '}{ this.state.count > 2 ? translation.alot : null }
              </div>
            )}
          </I18nRender>
          <div><button onClick={this.inc}><I18nInline path="increment" /></button> (<I18nInline path="have-milk.count.0" />)</div>
        </div>
      </>
    )
  }
}

class SubApp extends React.Component<any, { name: string }> {
  state = {
    name: ''
  }

  languages = [
    { code: 'pt', name: 'Português' },
    { code: 'en', name: 'English' },
    { code: 'de', name: 'Deutsch' }, // doesn't exist on purpose
    { code: 'fr', name: 'Français' },
  ]
  // Simplest inline language selector
  languageSelect: I18nReceiver = (context) => {
    const underline = (lang: string) => (lang == context.lang ? {textDecoration: 'underline'} : {})

    return (
      <ul>
        {this.languages.map((lang, index) => (
          <li key={index}>
            <a
              onClick={() => context.setLocale(lang.code)}
              style={underline(lang.code)}>
              {lang.name}
            </a>
          </li>
        ))}
      </ul>
    )
  }

  renderDate: I18nHelperChildren<MyHelpers['moment'], Date> = (helper, value) => {
    return <>{helper(value).format('LLLL')}</>
  }

  changeName: React.EventHandler<React.ChangeEvent<HTMLInputElement>> = (e) => {
    this.setState({ name: e.target.value })
  }

  render() {
    return (
      <div>

        {/* Use Raw consumer to access the context, and get the context functions for
            building a language selector */}
        <I18nRawConsumer>{this.languageSelect}</I18nRawConsumer>
        <div><CurrentLanguage /></div>

        <hr />
        <h1><I18nInline path="hello" />{' '}<I18nInline path="world" /></h1>
        <h1>
          {/* This will trigger errorHandler in the provider */}
          <I18nInline path="fail" />
        </h1>
        <h1>
          <I18nHelper<MyHelpers> name="moment" value={new Date()}>
            {this.renderDate}
          </I18nHelper>
        </h1>
        <hr />
        <Counter />

        <hr />
        <div>
          <I18nRender<string> path="placeholder">
            {(placeholder) => (
              <p><input type="text" value={this.state.name} placeholder={placeholder} onChange={this.changeName} /></p>
            )}
          </I18nRender>

          <WelcomeBack name={this.state.name} />
        </div>
      </div>
    )
  }
}

class App extends React.Component {
  componentWillMount() {
    moment.locale('en')
  }

  // in this example we will just return a hardcoded translation object for en and pt
  // but you can return a promise without any problems after an AJAX request
  source: I18nAsyncLoader<I18nPath> = (requestedLanguage)  => {
    switch (requestedLanguage) {
      case 'pt':
        return {
          'hello': 'Olá',
          'world': 'mundo',
          'increment': 'Adicionar',
          'complex': 'Um exemplo mais complexo',
          "welcomeback": {
            "main": "Bem-vindo de volta",
            "fallback": "cidadão do mundo"
          },
          'placeholder': 'Escreva seu nome',
          'have-milk': {
            'have': 'Eu tenho ',
            'count': ['canecas', 'caneca'],
            'milk': 'de leite',
            'alot': '(É um tanto de leite!)'
          }
        }
      case 'en':
        return {
          'hello': 'Hello',
          'world': 'world',
          'increment': 'Increment',
          "welcomeback": {
            "main": "Welcome back",
            "fallback": "world citizen"
          },
          'placeholder': 'Type your name',
          'complex': 'A more complex example',
          'have-milk': {
            'have': 'I have ',
            'count': ['mugs','mug'],
            'milk': 'of milk',
            'alot': '(That\'s a lot of milk!)'
          }
        }
      default:
        return fetch(`${requestedLanguage}.json`, {
          headers: {
            'Content-Type': 'application/json'
          },
          method: 'GET',
        }).then(
          (res) => (res.status === 200 ? res.json() : Promise.reject(new Error(`Not found "${requestedLanguage}.json"`))),
        )
    }
  }

  // this will only be called and rendered if an internal error occurs
  // error is cleared after this callback is called
  error: I18nErrorHandler = (error) => {
    return console.error(error)
  }

  helpers: I18nAsyncLoader<MyHelpers> = (lang) => {
    return {
      moment: (date) => moment(date).locale(lang)
    }
  }

  render() {
    return (
      <I18nProvider<MyHelpers>
        // defaultLanguage can also come from a redux store or be hardcoded like this
        // it's only called once (or called if everything re-renders)
        defaultLanguage="en"
        // source can be static (like import 'something.json' using Babel / Webpack)
        // or can be an ajax async request
        source={this.source}
        // create localized helpers, payments systems depending on language, etc
        helpers={this.helpers}
        // this is useful to catch missing translations while developing
        errorHandler={this.error}
        >
        <SubApp />
      </I18nProvider>
    )
  }
}

ReactDOM.render(
  <App />,
  document.getElementById('root')
)

