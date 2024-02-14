<script>
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
  import { Label } from "$lib/components/ui/label";
  let {name,categories,value} = $props()  
</script>

<div>
			<Label for="accom_type">{name}</Label>
			<ToggleGroup.Root variant="outline"  id="accom_type" orientation="vertical" bind:value={value} size="sm" type="multiple">
				{#each Object.entries(categories) as [name,id]}
					<ToggleGroup.Item value={id.toString()}>{name}</ToggleGroup.Item>
				{/each}
			</ToggleGroup.Root>
</div>
