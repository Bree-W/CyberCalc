export type IntegrationKind = 'embed' | 'proxy' | 'link';

export interface Integration {
  id: string;
  name: string;
  license: string;
  version: string;
  kind: IntegrationKind;
}

export interface EmbedLaunch {
  src: string;
  sandbox: string;
}

export interface EmbedIntegration extends Integration {
  kind: 'embed';
  launch(input: string): EmbedLaunch;
}

export interface SubmitOptions {
  password?: string;
  deep?: boolean;
}

export interface SubmitResult {
  ok: boolean;
  submissionHash?: string;
  error?: string;
  todo?: string;
}

export interface ProxyIntegration extends Integration {
  kind: 'proxy';
  submit(file: File, options?: SubmitOptions): Promise<SubmitResult>;
}

export interface LinkLaunch {
  href: string;
  attribution: string;
}

export interface LinkIntegration extends Integration {
  kind: 'link';
  launch(input: string): LinkLaunch;
}
