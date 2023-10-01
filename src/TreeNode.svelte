<script>
  import { afterUpdate } from 'svelte';

  /**
   * @type { {
   *   name: string,
   *   from: number,
   *   to: number,
   *   error: boolean,
   *   children: Node[]
   * } } Node
   */
  export let node;

  export let onSelect;

  export let selection;

  $: selected = node === selection;

  let el;

  function handleSelect(event) {
    event.stopPropagation();

    onSelect(node);
  }

  function handleDeselect(event) {
    event.stopPropagation();

    onSelect(null);
  }

  afterUpdate(() => {
    if (selected) {
      el.scrollIntoViewIfNeeded();
    }
  });
</script>

<div class="node" bind:this={ el } class:selected={ selected }>

  <button class="description btn-none" on:mouseover={ handleSelect } on:mouseleave={ handleDeselect } on:focus={ handleSelect }>
    <span class:error={ node.error } class="name" title={ node.error && node.error.message || '' }>{ node.error ? 'ERROR' : node.name }</span>
    <span class="position">[{ node.from }, { node.to }]</span>
  </button>

  {#if node.children.length}
    <div class="children">
      {#each node.children as child}
        <svelte:self
          node={ child }
          onSelect={ onSelect }
          selection={ selection }
        />
      {/each}
    </div>
  {/if}

</div>

<style>

  .node {
    color: #444;
  }

  .position {
    color: #AAA;
  }

  .name {
    color: steelblue;
  }

  .selected .description {
    background: bisque;
  }

  .error {
    color: red;
  }

  .description {
    display: inline-block;
  }

  .children {
    padding-left: 20px;
  }

  .btn-none {
    font-family: inherit;
    font-size: inherit;
    border: none;
    background: none;
    padding: 0;
    margin: 0;
    text-align: left;
  }
</style>