import bpmnIoPlugin from 'eslint-plugin-bpmn-io';

import sveltePlugin from 'eslint-plugin-svelte';

const files = {
  build: [
    '*.js'
  ],
  ignored: [
    'public'
  ]
};

export default [
  {
    'ignores': files.ignored
  },

  // build
  ...bpmnIoPlugin.configs.node.map(config => {

    return {
      ...config,
      files: files.build
    };
  }),

  // lib
  ...bpmnIoPlugin.configs.browser.map(config => {

    return {
      ...config,
      ignores: files.build
    };
  }),
  ...sveltePlugin.configs['flat/recommended'].map(config => {

    return {
      ...config,
      ignores: files.build
    };
  })
];