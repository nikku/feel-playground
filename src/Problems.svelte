<script>

  /**
   * @type { 'error' | 'warning' }
   */
  export let severity = 'error';

  export let label;

  /**
   * @type { string[] }
   */
  export let messages = [];
</script>

{#if messages.length}
  <div class="note { severity }-note">

    <h4>{ label } ({ messages.length })</h4>

    <ul>
      {#each messages as message (message)}
        <li>{ message }</li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .note {
    font-size: .9em;
    line-height: 1.3;
    margin-top: 0;
    font-family: monospace;
  }

  .note h4,
  .note ul {
    margin: .5em .75em;
  }

  .note ul {
    padding-inline-start: 2em;
  }

  .warning-note {
    background: var(--color-warning-bg);
    color: var(--color-warning-fg);
    border: solid 1px var(--color-warning-border);
    border-radius: 0 0 3px 3px;
  }

  .error-note {
    background: var(--color-error-bg);
    color: var(--color-error-fg);
    border: solid 1px var(--color-error-border);
    border-radius: 0 0 3px 3px;
  }
</style>
