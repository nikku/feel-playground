import './shims';

import AppParent from './AppParent.svelte';

const appParent = new AppParent({
  target: document.body
});

export default appParent;