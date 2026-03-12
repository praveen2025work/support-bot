declare module '@nlpjs/core' {
  export function containerBootstrap(): Promise<any>;
}

declare module '@nlpjs/nlp' {
  export class Nlp {
    settings: { autoSave: boolean };
    addCorpus(corpus: any): Promise<void>;
    train(): Promise<void>;
    process(locale: string, text: string): Promise<any>;
  }
}

declare module '@nlpjs/lang-en' {
  export class LangEn {}
}
