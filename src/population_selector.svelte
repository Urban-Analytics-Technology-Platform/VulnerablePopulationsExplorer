<script lang="ts">
	import * as Sheet from "$lib/components/ui/sheet";
	import * as Card from '$lib/components/ui/card';
  import { Separator } from "$lib/components/ui/separator";
	import CategorySelector from './category_selector.svelte';
	import proto from './pb/synthpop_pb';
	import RangeSelector from './range_selector.svelte';
	let {selection_state} = $props()

	let local_state = $state({...selection_state}) 

	let state_changed = $derived(JSON.stringify(selection_state) !== local_state )

	let set_population = $derived(()=>{
		console.log("updating selection state ", selection_state, local_state) 
		selection_state = {...local_state}
	})

</script>

<Sheet.Root>
	<Sheet.Trigger>Select Population</Sheet.Trigger>
	<Sheet.Content side={"left"}>
		<Sheet.Header>
			<Sheet.Title>Define the population of interest</Sheet.Title>
		</Sheet.Header>
		<div class="flex flex-col gap-2">
			<Card.Root>
				<Card.Header>
					<Card.Title>Households</Card.Title>
					<Card.Description>Filter by household attributes</Card.Description>
				</Card.Header>
				<Card.Content>
					<CategorySelector name={"Accommodation Type"} bind:value={local_state.house_types} categories={proto.synthpop.AccommodationType}/>

					<Separator />
					<CategorySelector name={"Tenure"} bind:value={local_state.tenure} categories={proto.synthpop.Tenure}/>

					<Separator />
					<CategorySelector name={"Heating"} bind:value={local_state.heating} categories={{"has_heat":"Has Central Heat", "no_heat":"No Central Heat"}}/>

					<Separator />
					<RangeSelector name="Occupants" max={10} min={0} bind:value={local_state.occupants} />

					<Separator />
					<RangeSelector name="Rooms" max={10} min={0} bind:value={local_state.rooms} />
					<Separator />

					<RangeSelector name="Cars" max={5} min={0} bind:value={local_state.cars} />

				</Card.Content>
				<Card.Footer>
					<p>200 households out of 1000</p>
				</Card.Footer>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>People</Card.Title>
					<Card.Description>Filter by people attributes</Card.Description>
				</Card.Header>
				<Card.Content>
					<CategorySelector name={"Sex"} bind:value={local_state.sex} categories={proto.synthpop.Sex}/>

					<Separator />

					<RangeSelector name="BMI" max={12} min={42} bind:value={local_state.bmi} />

					<Separator />
					<RangeSelector name="Age" max={0} min={100} bind:value={local_state.age} />
					<Separator />
					<CategorySelector name={"Ethnicity"} bind:value={local_state.ethnicity} categories={proto.synthpop.Ethnicity}/>
					<Separator />

					<CategorySelector name={"Diabetes"} bind:value={local_state.diabetes} categories={{"has_diabetes":"Has Diabetes","no_diabetes":"Does not have diabetes"}}/>

					<Separator />
					<CategorySelector name={"Self Assessed Health"} bind:value={local_state.self_assessed} categories={proto.synthpop.SelfAssessedHealth}/>

				</Card.Content>
				<Card.Footer>
					<p>200 people out of 1000</p>
				</Card.Footer>
			</Card.Root>
			<button on:click={set_population} >Update Population</button>
		</div>
	</Sheet.Content>
</Sheet.Root>
