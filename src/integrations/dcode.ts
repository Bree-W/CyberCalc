import type { LinkIntegration } from './types.ts';

export const dcode: LinkIntegration = {
  id: 'dcode',
  name: 'dCode',
  license: 'unverified',
  version: 'unpinned',
  kind: 'link',
  launch(_input: string) {
    return {
      href: 'https://www.dcode.fr/',
      attribution:
        'dCode (dcode.fr). CyberCalc links out only. No dCode code is copied, and the site is not scraped.',
    };
  },
};
