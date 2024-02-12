<script>
	import {
		MapLibre,
		GeoJSON,
		LineLayer,
		FillLayer,
		DeckGlLayer,
		VectorTileSource,
		JoinedData
	} from 'svelte-maplibre';
  import { Switch } from "$lib/components/ui/switch";
	import * as Card from "$lib/components/ui/card"
	import PopulationSelector from '../population_selector.svelte';
	import { Chart, Svg, Axis, Spline } from 'layerchart';
  import { Label } from "$lib/components/ui/label";
	import proto from '../pb/synthpop_pb.js';

	import { scaleTime } from 'd3-scale';
	import { ticks } from 'd3-array';
	import chroma from 'chroma-js';

	let show_households = $state(true);
	let day = $state(10);
	let show_max = $state(false);
	let selected_cell = $state(null);

	let { data } = $props();
	let { min, max, oas, grid, array, timesteps, times, global_trend } = data.prediction;

	let selection_state = $state({
		house_types:["1","2","3","4"],
		tenure:["1","2","3","4","5"],
		cardiovascular:[],
		diabetes:[],
		high_blood_pressure:[],
		cars:[0,10],
		occupants:[0,10],
		rooms:[1,4],
		bmi:[12,42],
		age:[1,90],
		no_medications:[0,10],
		ethnicity:["1","2","3","4","5"],
		sex:["1","2"],
		self_assessed_health:["1","2","3","4","5"]
	
	})

	let population = data.population;

	let { households, people, AccommodationType } = population;

	function apply_filters(households, people, filters) {
		let filtered_households = []
		console.log("Filters ",filters)
		console.log("Applying filters: houses ",filters.house_types, households[10])
		console.log("household ", households[10])
	  for (const house of households){
				// if(!filters.house_types.includes(house.details.accommodationType.toString())){
				// 	continue
				// }		
				// if(!filters.tenure.includes(house.details.tenure.toString())){
				// 	continue
				// }		
				// if(house.details.cars < filters.cars[0] || house.details.cars >filters.cars[1]){
				// 	continue 
				// }		
				// if(house.details.rooms < filters.rooms[0] || house.details.rooms>filters.rooms[1]){
				// 	continue 
				// }		
				filtered_households.push(house)
		}

		console.log("Applying filters: people")
	  let filtered_pop = []
		console.log("person ",people[10])

		for (const person of people){

			if(person.health.bmi < filters.bmi[0] || person.health.bmi >filters.bmi[1]){
				continue
			}		

			if(person.demographics.ageYears < filters.age[0] || person.demographics.ageYears > filters.age[1]){
				continue 
			}
			if( !filters.ethnicity.includes(person.demographics.ethnicity.toString())){
				continue 
			}
			if( !filters.sex.includes(person.demographics.sex.toString())){
				continue
			}
			if(person.health.numberMedications < filters.no_medications[0] || person.health.numberMedications >filters.no_medications[1]){
				continue 
			}
			if( !filters.self_assessed_health.includes(person.health.selfAssessedHealth.toString())){
				continue 
			}
			filtered_pop.push(person)

		}
		console.log("filtered ", filtered_households.length, filtered_pop.length)
		return { filtered_pop, filtered_households };
	}

	function calc_oa_stats(pop, households) {
		console.log("Calculating stats")
		let oa_stats = {};
	
		let pop_ids = new Set(pop.map((p) => p.id));
		households.forEach((h) => {
			let oa_id = h.oa11cd;
			let unfiltered_people = h.members.filter((id) => pop_ids.has(id)).length;
			if (unfiltered_people === 0) {
				return;
			}
			if (oa_stats[oa_id]) {
				oa_stats[oa_id].people += unfiltered_people;
				oa_stats[oa_id].households += 1;
			} else {
				oa_stats[oa_id] = { people: unfiltered_people, households: 1 };
			}
		});
		console.log("Done Calculating stats")
		return Object.entries(oa_stats).map(([key, counts]) => ({ oa11cd: key, ...counts }));
	}

	let { filtered_pop, filtered_households } = $derived(apply_filters(households, people, selection_state));

	let oa_stats = $derived(calc_oa_stats(filtered_pop, filtered_households));


	let extent = $derived(
		(() => {
			console.log("Calculating extent")
			if (show_max) {
				let d_temps = grid.features.map((f) => f.properties.max);
				return [Math.min(...d_temps), Math.max(...d_temps)];
			} else {
				let d_temps = grid.features.map((f) => f.properties.temps[day]);
				return [Math.min(...d_temps), Math.max(...d_temps)];
			}
			console.log("done extent")
		})()
	);

	let scale = $derived(
		(() => {
			console.log("Calculating extent")
			return chroma.scale('Spectral').domain([extent[1], extent[0]]);
		})()
	);

	var oa_ramp = $derived(
		(() => {
			console.log("Calculating ramp")
			let households = oa_stats.map((o) => o.households);
			let people = oa_stats.map((o) => o.people);

			let vals = show_households ? households : people;

			let extent = [Math.min(...vals), Math.max(...vals)];

			let scale = chroma.scale(['yellow', '008ae5']).domain(extent);

			let style_steps = [];
			let steps = 5;
			let step = (extent[1] - extent[0]) / steps;
			for (let i = 0; i < step; i++) {
				let val = extent[0] + i * step;
				style_steps.push(val);
				style_steps.push(scale(val).css());
			}

			let ramp = [
				'interpolate',
				['linear'],
				show_households ? ['feature-state', 'households'] : ['feature-state', 'people'],
				...style_steps
			];
			console.log("Done Calculating ramp")
			return ramp;
		})()
	);

	export function calc_date(days) {
		let date = new Date(1981, 1, 1);
		date.setDate(date.getDate() + days);
		return date;
	}

	var date = $derived(calc_date(day));

	var graph_global = global_trend.map((val, index) => ({ val, date: index }));

	let style = $derived(
		(() => {
			console.log("calculating style")
			let steps = 4;
			let style_steps = [];
			let bin_width = (extent[1] - extent[0]) / steps;

			for (let i = 0; i < steps; i++) {
				let val = i * bin_width + extent[0];
				style_steps.push(val);
				style_steps.push(scale(val).css());
			}

			let ramp = [
				'interpolate',
				['linear'],
				show_max ? ['get', 'max'] : ['at', day, ['get', 'temps']],
				...style_steps
			];
			return ramp;
		})()
	);
</script>


<div class="flex flex-row min-h-screen bg-gray-100 text-gray-800">
	
	<main
		class="main relative flex flex-col flex-grow -ml-64 md:ml-0 transition-all duration-150 ease-in"
	>
		<MapLibre
			style="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
			class="relative w-full aspect-[9/16] h-full sm:aspect-video"
			standardControls
			center={[-4.2583, 55.8617]}
			zoom={10}
		>
			<GeoJSON
				url="pmtiles://https://allofthedata.s3.us-west-2.amazonaws.com/climrecal/scotland_oa.pmtiles"
				data={oas}
				promoteId={'code'}
			>
				<JoinedData data={oa_stats} idCol="oa11cd" />

				<FillLayer
					paint={{ 'fill-color': oa_ramp, 'fill-opacity': 0.4 }}
					on:mousemove={(e) => {}}
				/>
				<LineLayer
					layout={{ 'line-cap': 'round', 'line-join': 'round' }}
					paint={{ 'line-color': 'black', 'line-width': 0.5 }}
				/>
			</GeoJSON>
			<GeoJSON id="states" data={grid}>
				<FillLayer
					paint={{
						'fill-color': style,
						'fill-opacity': 0.8
					}}
					on:mousemove={(e) => {
						if (e.detail.features) {
							selected_cell = e.detail.features?.[0];
						} else {
							selected_cell = null;
						}
					}}
				/>
				<LineLayer
					layout={{ 'line-cap': 'round', 'line-join': 'round' }}
					paint={{ 'line-color': 'black', 'line-width': 0.5 }}
				/>
			</GeoJSON>
		</MapLibre>

		<div class="absolute flex flex-col top-10 right-10 z-2 gap-4 "> 
			<Card.Root>
				<Card.Header>
					<h2>Temperature</h2>
				</Card.Header>
					<Card.Content >
						{#if selected_cell}
							<h2>{JSON.parse(selected_cell.properties.temps)[day]} / {selected_cell.properties.max}</h2>
						{/if}
						<div class='flex gap-2'>
							<p>{date.toLocaleDateString()}</p>

							<input disabled={show_max} type="range" id="day" name="cowbell" min={0} max={timesteps} bind:value={day} step={1} class="flex-grow" />
							<Label>Daily / Max</Label><Switch bind:checked={show_max} />
						</div>

					</Card.Content>
			</Card.Root>
			<Card.Root>
				<Card.Header>
					<h2>Population</h2>
				</Card.Header>
					<Card.Content >
						<PopulationSelector bind:selection_state={selection_state} />
					</Card.Content>
					<Card.Footer>
					{filtered_households.length} out of {households.length}
				</Card.Footer>
			</Card.Root>
		</div>
		<div class="absolute top-10 left-10 w-4 h-10 background-white">
		</div>
	</main>
</div>
