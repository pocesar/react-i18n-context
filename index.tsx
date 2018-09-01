'use strict'

import React from 'react'
import get from 'lodash.get'

export type I18nPath = { [key: string]: string | string[] | I18nPath | I18nPath[] }
export type SetLocale = (lang: string) => Promise<void>
export type Report = (error: Error) => void
export type Clear = () => void
export type Get<Result> = (path: string) => Result
export type I18nAsyncLoader<T> = (lang: string) => T | Promise<T>
export type AsyncLoaderHandler<T> = (lang: string, loader: I18nAsyncLoader<T>) => Promise<T>
export type InsertLanguage<T extends {}> = (lang: string, data: T) => T
export type I18nErrorHandler = (error: I18nBaseError) => Promise<void> | void

export interface I18nContext {
  /** current language */
  lang: string
  /** sets the locale */
  setLocale: SetLocale
  /** report an error to the provider, so it can be shown somewhere else */
  reportError: Report
  /** clear last error attached to the provider. does not trigger an update */
  clearLastError: Clear
  /** get a path */
  get: Get<any>
  /** loads a language */
  asyncLoader: AsyncLoaderHandler<I18nPath>
  /** tells if the language has loaded (or attempted to load) */
  ready: boolean
}

export interface I18nHelpers<Helpers> {
  /** localized helpers */
  helpers?: Helpers
}

export const noop = () => { return Promise.resolve() }

export const I18nContext = React.createContext<I18nContext>({
  lang: '',
  setLocale: noop as any,
  reportError: noop as any,
  get: noop as any,
  ready: false,
  clearLastError: noop as any,
  asyncLoader: noop as any
})

export const I18nRawProvider = I18nContext.Provider
export const I18nRawConsumer = I18nContext.Consumer
export type I18nReceiver<Helpers = {}> = (value: I18nContext & I18nHelpers<Helpers>) => React.ReactNode

export class I18nBaseError extends Error {
  constructor(message: string, public original: Error | null = null) {
    super(message)

    this.name = 'I18nBaseError'

    Object.setPrototypeOf && Object.setPrototypeOf(this, Error.prototype)
    Error.captureStackTrace && Error.captureStackTrace(this, this.constructor)
  }
}

export class I18nProviderError extends I18nBaseError {
  constructor(message: string, public original: Error | null = null) {
    super(message, original)

    this.name = 'I18nProviderError'
    Object.setPrototypeOf && Object.setPrototypeOf(this, I18nBaseError.prototype)
  }
}

export class I18nLookupError extends I18nBaseError {
  constructor(message: string, public original: Error | null = null) {
    super(message, original)

    this.name = 'I18nLookupError'
    Object.setPrototypeOf && Object.setPrototypeOf(this, I18nBaseError.prototype)
  }
}

export interface I18nProviderProps<Helpers> {
  /** Sets initial language */
  defaultLanguage: string
  /** Synchronous or asynchronous json language object */
  source: I18nAsyncLoader<I18nPath>
  /** Provide localized helpers down the consumers */
  helpers?: I18nAsyncLoader<Helpers>
  /**
   * Non-state based error handler, because it might come from componentDidCatch.
   * Mainly used for development phase. Error is cleared after this handler asynchronously returns
   */
  errorHandler?: I18nErrorHandler
}

export class I18nProvider<Helpers = {}> extends React.PureComponent<I18nProviderProps<Helpers>, I18nContext> {
  languages: { [lang: string]: any } = { }

  componentDidCatch(err: Error) {
    if (err instanceof I18nBaseError) {
      return this.reportError(err)
    }

    throw err
  }

  componentWillUnmount() {
    this.clearLastError()
    this.languages = { }
  }

  deferSetState = (state: Partial<I18nContext & I18nHelpers<Helpers>> | ((state?: I18nContext & I18nHelpers<Helpers>) => Partial<I18nContext & I18nHelpers<Helpers>> | null)) => {
    return new Promise<void>((resolve) => this.setState(state as any, resolve))
  }

  asyncLoader: AsyncLoaderHandler<I18nPath> = async (lang, loader) => {
    try {
      return await loader(lang)
    } catch (e) {
      if (!(e instanceof I18nBaseError)) {
        throw new I18nProviderError(`Failed to load language for "${lang}"`, e)
      } else {
        throw e
      }
    }
  }

  assignHelpers: AsyncLoaderHandler<Helpers> = async (lang, loader) => {
    try {
      return await loader(lang)
    } catch (e) {
      if (!(e instanceof I18nBaseError)) {
        throw new I18nProviderError(`Failed to load helpers for "${lang}"`, e)
      } else {
        throw e
      }
    }
  }

  setLocale: SetLocale = async (lang) => {
    try {
      await this.deferSetState({ ready: false })

      if (!(lang in this.languages)) {
        this.insertLanguage(lang, await this.asyncLoader(lang, this.props.source))
      }

      if (typeof this.props.helpers === 'function') {
        await this.deferSetState({ helpers: await this.assignHelpers(lang, this.props.helpers) })
      }
    } catch (e) {
      this.reportError(e)
    } finally {
      await this.deferSetState({ ready: true })
    }

    return this.deferSetState(() => {
      if (this.state.lang === lang) return null

      return { lang }
    })
  }

  insertLanguage: InsertLanguage<any> = (lang, data) => {
    return this.languages[lang] = {
      ...data
    }
  }

  lastError: Error | null = null

  async componentDidUpdate(
    //prevProps: I18nProviderProps<Helpers>,
    //prevState: I18nContext
  ) {
    if (
        typeof this.props.errorHandler === 'function' &&
        this.lastError instanceof I18nBaseError &&
        this.state.ready
      ) {
      await this.props.errorHandler(this.lastError)
      this.clearLastError()
    }
  }

  clearLastError: Clear = () => {
    this.lastError = null
  }

  reportError: Report = (error) => {
    if (error instanceof Error) {
      this.lastError = error
    }
  }

  get: Get<string> = (path) => {
    try {
      const data = get(this.languages[this.state.lang], path)

      if (!data) {
        throw new I18nLookupError(`Could not find path "${path}" in "${this.state.lang}"`)
      }

      return data
    } catch (e) {
      this.reportError(e)
    }

    return ''
  }

  componentDidMount() {
    this.setLocale(this.props.defaultLanguage)
  }

  state = {
    lang: this.props.defaultLanguage,
    setLocale: this.setLocale,
    reportError: this.reportError,
    get: this.get,
    asyncLoader: this.asyncLoader,
    ready: false,
    clearLastError: this.clearLastError,
    helpers: {}
  }

  render() {
    return (
      <I18nRawProvider value={this.state}>
        {this.props.children}
      </I18nRawProvider>
    )
  }
}

export interface I18nInlineProps {
  path: string;
}

export class I18nInline extends React.PureComponent<I18nInlineProps> {
  text: I18nReceiver = (value) => (<>{value.get(this.props.path)}</>)

  render() {
    return (
      <I18nRawConsumer>
        {this.text}
      </I18nRawConsumer>
    )
  }
}

export interface I18nRenderProps<T> {
  path: string
  children: (expected: T) => React.ReactNode
}

export class I18nRender<Expected = {}> extends React.PureComponent<I18nRenderProps<Expected>> {
  text: I18nReceiver = (value) => {
    const v = value.get(this.props.path)
    if (!v) return null
    return this.props.children(v)
  }

  render() {
    return (
      <I18nRawConsumer>
        {this.text}
      </I18nRawConsumer>
    )
  }
}

export type WithI18nProps<YourProps> = YourProps & {
  i18n: I18nContext
}

export function withI18n<
  P extends {},
  S extends {}
>(Component: React.ComponentClass<WithI18nProps<P>, S> | React.StatelessComponent<WithI18nProps<P>>) {

  class WithI18n extends React.Component<{ forwardedRef: any }> {
    forward: I18nReceiver = (value) => {
      const { forwardedRef, ...rest } = this.props as any

      return (<Component ref={forwardedRef} i18n={value} {...rest} />)
    }

    render() {
      return (
        <I18nRawConsumer>
          {this.forward}
        </I18nRawConsumer>
      )
    }
  }

  return React.forwardRef<P, S>((props, ref) => {
    return (
      <WithI18n forwardedRef={ref} {...props} />
    )
  }) as any as React.ComponentClass<P, S>
}

export type I18nHelperChildren<K, V = never> = (helper: K, value: V) => React.ReactNode

export interface I18nHelperProps<Helpers, K extends keyof Helpers = keyof Helpers> {
  name: K
  value?: any
  children?: I18nHelperChildren<Helpers[K], any>
}

export class I18nHelper<Helpers = {}> extends React.PureComponent<I18nHelperProps<Helpers>> {
  helpers: I18nReceiver<Helpers> = (value) => {
    if (!value.helpers) return null

    const helper: any = get(value.helpers, this.props.name)

    if (typeof this.props.children === 'function' && typeof helper !== 'undefined') {
      return this.props.children(helper, this.props.value)
    }

    if (typeof helper === 'function') {
      return helper(this.props.value)
    }

    value.reportError(new I18nLookupError(`could not find "${this.props.name}" for "${value.lang}"`))

    return null
  }

  render() {
    return (
      <I18nRawConsumer>
        {this.helpers}
      </I18nRawConsumer>
    )
  }
}

