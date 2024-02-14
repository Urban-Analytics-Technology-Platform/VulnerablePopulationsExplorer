<script lang="ts">
	import * as Sheet from "$lib/components/ui/sheet";
	import * as Card from '$lib/components/ui/card';
  import { Separator } from "$lib/components/ui/separator";
	import CategorySelector from './category_selector.svelte';
	import proto from './pb/synthpop_pb';
  import { Button } from "$lib/components/ui/button";
	import RangeSelector from './range_selector.svelte';
	let {selection_state} = $props()

	let local_state = $state({...selection_state}) 
	let loading=$state(false)

	let state_changed = $derived(JSON.stringify(selection_state) !== JSON.stringify(local_state) )
	$effect(()=>{
		if(!state_changed){
			loading=false
		}
	})

	let set_population = $derived(()=>{
		loading=true
		selection_state = {...local_state}
	})

</script>

<Sheet.Root>
	<Sheet.Trigger><Button variant="outline">Define Population</Button></Sheet.Trigger>
	<Sheet.Content side={"left"} class="w-full max-w-[30vw]">
		<Sheet.Header>
			<Sheet.Title>Define the population of interest</Sheet.Title>
		</Sheet.Header>
		<div class="flex flex-col gap-2 overflow-y-auto">
			<Card.Root>
				<Card.Header>
					<Card.Title>Households</Card.Title>
					<Card.Description>Filter by household attributes</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="flex flex-col gap-3">
						<CategorySelector name={"Accommodation Type"} bind:value={local_state.house_types} categories={proto.synthpop.AccommodationType}/>

						<CategorySelector name={"Tenure"} bind:value={local_state.tenure} categories={proto.synthpop.Tenure}/>
						<CategorySelector name={"Heating"} bind:value={local_state.heating} categories={{"has_heat":"Has Central Heat", "no_heat":"No Central Heat"}}/>
						<RangeSelector name="Occupants" max={10} min={0} bind:value={local_state.occupants} />

						<RangeSelector name="Rooms" max={10} min={0} bind:value={local_state.rooms} />

						<RangeSelector name="Cars" max={5} min={0} bind:value={local_state.cars} />
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>People</Card.Title>
					<Card.Description>Filter by people attributes</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="flex flex-col gap-3">
						<CategorySelector name={"Sex"} bind:value={local_state.sex} categories={proto.synthpop.Sex}/>

						<RangeSelector name="BMI" max={42} min={0} bind:value={local_state.bmi} />

						<RangeSelector name="Age" max={100} min={0} bind:value={local_state.age} />
						<CategorySelector name={"Ethnicity"} bind:value={local_state.ethnicity} categories={proto.synthpop.Ethnicity}/>

						<CategorySelector name={"Diabetes"} bind:value={local_state.diabetes} categories={{"has_diabetes":"Has Diabetes","no_diabetes":"Does not have diabetes"}}/>

						<CategorySelector name={"Self Assessed Health"} bind:value={local_state.self_assessed} categories={proto.synthpop.SelfAssessedHealth}/>
					</div>

				</Card.Content>
			</Card.Root>
			{#if state_changed}
				<Button on:click={set_population}>Update Population</Button>
			{/if}
			{#if loading}
				<h2>Processing</h2>
			{/if}
		</div>
	</Sheet.Content>
</Sheet.Root>
