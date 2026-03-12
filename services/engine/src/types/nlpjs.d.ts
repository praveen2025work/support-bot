declare module '@nlpjs/core' {
  export class Container {
    use(plugin: unknown): void;
    get(name: string): unknown;
    register(name: string, cls: unknown, isSingleton?: boolean): void;
  }
  export function containerBootstrap(): Container;
}

declare module '@nlpjs/nlp' {
  export class Nlp {
    constructor(opts?: { container?: unknown; forceNER?: boolean });
    settings: Record<string, unknown>;
    addLanguage(lang: string): void;
    addDocument(lang: string, utterance: string, intent: string): void;
    addAnswer(lang: string, intent: string, answer: string): void;
    train(): Promise<void>;
    process(lang: string, text: string): Promise<NlpResult>;
    addCorpus(corpus: unknown): void;
    import(data: unknown): Promise<void>;
    export(): Promise<unknown>;
  }
  export interface NlpResult {
    intent: string;
    score: number;
    utterance: string;
    entities: Array<{ entity: string; option: string; sourceText: string }>;
    classifications: Array<{ intent: string; score: number }>;
    sentiment: { score: number; vote: string };
    answer?: string;
  }
}

declare module '@nlpjs/lang-en' {
  export class LangEn {
    static register(container: unknown): void;
  }
}
