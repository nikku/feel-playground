<script>

  /**
   * @type { 'error' | 'warning' }
   */
  export let severity = 'error';

  /**
   * @type { { message: string, position?: { from: number, to: number } } }
   */
  export let problem;

  /**
   * @type { ((problem: any) => void) | null }
   */
  export let onClick = null;

  $: interactive = onClick && problem && problem.position;

  $: title = (interactive ? 'Jump to ' : '') + severity + ': ' + problem.message;

  function handleClick(event) {
    event.preventDefault();

    onClick(problem);
  }
</script>

{#if interactive}
  <button
    class="problem-indicator { severity }-indicator btn btn-small btn-none"
    { title }
    on:click={ handleClick }
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill="currentColor" fill-rule="evenodd" d="M8.22 1.754a.25.25 0 00-.44 0L1.698 13.132a.25.25 0 00.22.368h12.164a.25.25 0 00.22-.368L8.22 1.754zm-1.763-.707c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575L6.457 1.047zM9 11a1 1 0 11-2 0 1 1 0 012 0zm-.25-5.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5z"></path></svg>
  </button>
{:else}
  <span class="problem-indicator { severity }-indicator" { title }>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill="currentColor" fill-rule="evenodd" d="M8.22 1.754a.25.25 0 00-.44 0L1.698 13.132a.25.25 0 00.22.368h12.164a.25.25 0 00.22-.368L8.22 1.754zm-1.763-.707c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575L6.457 1.047zM9 11a1 1 0 11-2 0 1 1 0 012 0zm-.25-5.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5z"></path></svg>
  </span>
{/if}


<style>
  .problem-indicator {
    display: inline-flex;
    align-items: center;
    padding: 0.5rem;
  }

  .error-indicator {
    color: var(--color-error-bg);
  }

  .warning-indicator {
    color: var(--color-warning-border);
  }
</style>
