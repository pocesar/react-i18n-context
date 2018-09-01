"use strict";

import * as React from "react";
import renderer from "react-test-renderer";
import {
  I18nProvider,
  I18nInline,
  I18nBaseError,
  I18nProviderError,
  withI18n,
  WithI18nProps,
  I18nContext,
  I18nRender,
  I18nHelper
} from "./index";

describe("I18nProvider", () => {
  test("errors", done => {
    renderer.create(
      <I18nProvider
        defaultLanguage="en"
        errorHandler={e => {
          expect(e).toBeInstanceOf(I18nBaseError);
          done();
        }}
        source={() => Promise.reject(new Error("asdf"))}
      />
    );
  });

  test('throw', (done) => {
    const spy = jasmine.createSpy()
    const err = new I18nProviderError('Custom')

    renderer.create(
      <I18nProvider errorHandler={spy} defaultLanguage="ar" source={() => { throw err }} />
    )

    setTimeout(() => {
      expect(spy).toHaveBeenCalledWith(err)
      done()
    })
  })

  test("loads asynchronously", done => {
    const en = {
      hello: "world"
    };

    const el = renderer.create(
      <I18nProvider defaultLanguage="en" source={() => Promise.resolve(en)} />
    );

    setTimeout(() => {
      expect(el.root.instance.languages).toMatchObject({ en: en });
      done();
    });
  });
});
describe("I18nInline", () => {
  const en = {
    world: "world"
  };
  const pt = {
    world: "mundo"
  };

  test("renders single path", done => {
    const el = renderer.create(
      <I18nProvider
        defaultLanguage="en"
        source={lang => (lang == "en" ? en : pt)}
      >
        <div>
          Hello <I18nInline path="world" />
        </div>
      </I18nProvider>
    );

    setTimeout(() => {
      expect(el.toJSON()).toMatchSnapshot();

      el.root.instance
        .setLocale("pt")
        .then(() => {
          expect(el.toJSON()).toMatchSnapshot();
        })
        .then(() => done(), done);
    }, 0);
  });

  test("changes language", done => {
    const el = renderer.create(
      <I18nProvider defaultLanguage="en" source={() => en}>
        <div>
          Hello <I18nInline path="world" />
        </div>
      </I18nProvider>
    );

    setTimeout(() => {
      const json = el.toJSON();
      expect(json).toMatchSnapshot();
      done();
    }, 0);
  });
});

describe("withI18n", () => {
  class H extends React.Component<WithI18nProps<{ hello: string }>> {
    render() {
      return <div>{this.props.hello}</div>;
    }
  }

  test("forwardedRef", done => {
    const J = withI18n(H);

    const ref = React.createRef<any>();
    const h = renderer.create(<J hello="hello" ref={ref} />);

    setTimeout(() => {
      expect(h.toJSON()).toMatchSnapshot();
      expect((h.root.children[0] as any).props.forwardedRef).toEqual(ref);
      expect(
        Object.keys(
          (h.root.children[0] as any).props.forwardedRef.current.props.i18n
        ).sort()
      ).toEqual(
        ([
          "asyncLoader",
          "get",
          "ready",
          "lang",
          "setLocale",
          "clearLastError",
          "reportError"
        ] as Array<keyof I18nContext>).sort()
      );

      done();
    }, 0);
  });

  test("hoc", done => {
    const CurrentLanguage: React.StatelessComponent<WithI18nProps<any>> = ({
      i18n
    }) => <div>{i18n.lang}</div>;

    const J = withI18n(CurrentLanguage);
    const render = renderer.create(
      <I18nProvider defaultLanguage="en" source={() => ({})}>
        <J />
      </I18nProvider>
    );

    setTimeout(() => {
      expect(render.toJSON()).toMatchSnapshot();
      done();
    }, 0);
  });
});

describe('i18nRender', () => {

  test('complex render', (done) => {
    const el = renderer.create(
      <I18nProvider defaultLanguage="pt" source={() => ({ lang: { omega: 'lul' } })}>
        <I18nRender<{ omega: string }> path="lang">
          {(t) => {
            return <>{t.omega}</>
          }}
        </I18nRender>
      </I18nProvider>
    )

    setTimeout(() => {
      expect(el.toJSON()).toMatchSnapshot()
      done()
    });
  })
})

describe('I18nHelper', () => {
  test('empty', (done) => {
    const spy = jasmine.createSpy()
    const render = jasmine.createSpy()

    const el = renderer.create(
      <I18nProvider defaultLanguage="en" errorHandler={spy} helpers={() => null} source={()=>({ })}>
        <I18nHelper<any> name="empty">
          {(c) => {
            render()
            return (<>{c}</>)
          }}
        </I18nHelper>
      </I18nProvider>
    )

    setTimeout(() => {
      expect(el.toJSON()).toMatchSnapshot()
      expect(spy).toHaveBeenCalledWith(jasmine.any(I18nBaseError))
      expect(render).not.toHaveBeenCalled()
      done()
    });
  })

  test('throw', (done) => {
    const spy = jasmine.createSpy()
    const err = new I18nProviderError('helper')

    renderer.create(
      <I18nProvider defaultLanguage="en" errorHandler={spy} helpers={() => { throw err }} source={()=>({ })} />
    )

    setTimeout(() => {
      expect(spy).toHaveBeenCalledWith(err)
      done()
    })
  })

  test('renders', (done) => {
    const spy = jasmine.createSpy('spy')

    const el = renderer.create(
      <I18nProvider helpers={() => ({ spy })} defaultLanguage="en" source={() => ({})}>
        <I18nHelper<{ spy: typeof spy }> name="spy">
          {(spy) => {
            return (
              <>
                <p>word</p>
                <p>{spy()}</p>
              </>
            )
          }}
        </I18nHelper>
      </I18nProvider>
    )

    setTimeout(() => {
      expect(el.toJSON()).toMatchSnapshot()
      expect(spy).toHaveBeenCalled()
      done()
    })
  })

  test('exec', (done) => {
    const spy = jasmine.createSpy()

    const el = renderer.create(
      <I18nProvider helpers={() => ({ spy })} defaultLanguage="en" source={() => ({})}>
      <I18nHelper<{ spy: typeof spy }> name="spy" value={10} />
    </I18nProvider>
    )

    setTimeout(() => {
      expect(el.toJSON()).toMatchSnapshot();
      expect(spy).toHaveBeenCalledWith(10)
      done()
    })
  })
})
