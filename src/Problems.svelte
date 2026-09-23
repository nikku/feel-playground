<script>

  /**
   * @type { {
   *   severity?: 'error' | 'warning',
   *   label: string,
   *   problems?: { message: string, position?: { from: number, to: number } }[],
   *   onSelect?: ((problem: any) => void) | null
   * } }
   */
  let {
    severity = 'error',
    label,
    problems = [],
    onSelect = null
  } = $props();

  function canSelect(problem) {
    return onSelect && problem.position;
  }
</script>

{#if problems.length}
  <div class="note { severity }-note">

    <h4>{ label } ({ problems.length })</h4>

    <ul>
      {#each problems as problem, idx (problem.message + idx)}
        <li>
          {#if canSelect(problem)}
            <button
              type="button"
              class="problem-link"
              title="Jump to { severity }"
              onclick={ () => onSelect(problem) }
            >{ problem.displayMessage || problem.message }</button>
          {:else}
            { problem.displayMessage || problem.message }
          {/if}
        </li>
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

  .problem-link {
    display: inline;
    vertical-align: top;
    padding: 0;
    border: none;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    text-decoration: none;
  }
</style>
