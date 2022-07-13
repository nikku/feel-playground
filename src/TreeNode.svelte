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

  afterUpdate(() => {
    if (selected) {
      el.scrollIntoViewIfNeeded();
    }
  });
</script>

<div class="node" bind:this={ el } class:selected={ selected } on:mouseover={ handleSelect }>

  <div class="description">
    <span class:error={ node.error } class="name" title={ node.error && node.error.message }>{ node.error ? 'ERROR' : node.name }</span> [ { node.from }, { node.to } ]
  </div>

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
</style>