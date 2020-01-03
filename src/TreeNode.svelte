<script>

  export let node;

  export let onSelect;

  export let selection;

  function handleSelect(event) {
    event.stopPropagation();

    onSelect(node);
  }
</script>

<div class="node" class:error={ node.error } class:selected={ selection === node } on:mouseover={ handleSelect }>

  <div class="description">
    { node.error ? 'ERROR' : node.name } [ { node.start }, { node.end } ]
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