import './shims';

import { mount } from 'svelte';

import AppParent from './AppParent.svelte';

const appParent = mount(AppParent, {
  target: document.body
});

export default appParent;