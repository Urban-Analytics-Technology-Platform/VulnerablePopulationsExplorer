<script lang="ts">

  type LegendProps ={
    breaks: Array<number>,
    colors: Array<string>,
    name:string,
    suffix: string | null
  };

  let {breaks, colors, name, suffix} = $props<LegendProps>()
  console.log("breaks ", breaks,colors)

</script>

<div>
  <h2>{name}</h2>
  <div class="flex flex-col">
    {#each  breaks as b, index}
      <div class="flex flex-row gap-2">
        <div style={`background-color: ${colors[index]}`} class={`w-[20px] h-[20px] bg-[${colors[index]}]`}/>
        <span>{b.toLocaleString()} {suffix}</span>
      </div>
    {/each}
  </div>
</div>

