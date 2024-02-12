<script lang="ts">
	import { Label } from "$lib/components/ui/label";
	import { Slider } from "$lib/components/ui/slider";

  type RangeSelectorProps={
    min:number,
    max:number,
    value:[number,number],
    name:string
  }

  let {min,max, value,name}=$props<RangeSelectorProps>()
</script>

<Label for={name}>{name}: {value.join(" - ")}</Label>
<Slider id={name} max={max} min={min} bind:value={value}/>

