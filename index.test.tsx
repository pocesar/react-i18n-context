"use strict";

import * as React from "react";
import renderer from "react-test-renderer";
import {
  I18nProvider,
  I18nInline,
  I18nBaseError,
  I18nProviderError,
  withI18n,
  WithI18nProps
} from "./index";

describe("I18nProvider", () => {
  test("errors", done => {
    renderer.create(
      <I18nProvider
        defaultLanguage="en"
        errorHandler={e => {
          expect(e).toBeInstanceOf(I18nProviderError);
          expect(e).toBeInstanceOf(I18nBaseError);
          done();
        }}
        source={() => Promise.reject(new Error("asdf"))}
      />
    );
  });

  test("loads asynchronously", done => {
    const en = {
      hello: "world"
    };

    const el = renderer.create(
      <I18nProvider defaultLanguage="en" source={() => Promise.resolve(en)} />
    );

    setTimeout(() => {
      expect(el.root.instance.languages).toEqual({ en: en });
      done();
    });
  });
});
describe("I18nInline", () => {
  const en = {
    world: "world"
  };

  test("renders single path", done => {
    const el = renderer.create(
      <I18nProvider defaultLanguage="en" source={() => en}>
        <div>
          Hello <I18nInline path="world" />
        </div>
      </I18nProvider>
    );

    setTimeout(() => {
      const json = el.toJSON();
      expect(json).toMatchInlineSnapshot(`
<div>
  Hello 
  world
</div>
`);
      done();
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

  test("HOC", () => {
    const J = withI18n(H);

    const ref = React.createRef<any>();
    const h = renderer.create(<J hello="hello" ref={ref} />);

    expect(h.toJSON()).toMatchSnapshot();
    expect((h.root.children[0] as any).props.forwardedRef).toEqual(ref);
  });
});
