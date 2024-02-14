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
  import * as Table from "$lib/components/ui/table";
	import TemperatureTrend from "../temperature_trend.svelte"

	import { scaleTime } from 'd3-scale';
	import { ticks } from 'd3-array';
	import chroma from 'chroma-js';
	import { Slider } from '$lib/components/ui/slider';
	import RangeSelector from '../range_selector.svelte';
	import Legend from "../legend.svelte"
	import { Button } from '$lib/components/ui/button';

	let show_variable = $state("max");
	let day = $state(10);
	let show_max = $state(false);
	let selected_cell = $state(null);
	let show_temperature_overlay = $state(false)
	let threshold_temp_range = $state([0,100])

	let { data } = $props();
	let { lookup, oa_maxes, min, max, oas, grid, array, timesteps, times, global_trend } = data.prediction;

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

	  let filtered_pop = []

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
		return { filtered_pop, filtered_households };
	}

	function calc_oa_stats(pop, households, oa_maxes) {
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
		let result = Object.entries(oa_stats).map(([key, counts]) => ({ oa11cd: key, ...counts, max: oa_maxes[key]}));
		return result
	}


	let { filtered_pop, filtered_households } = $derived(apply_filters(households, people, selection_state));

	let oa_stats = $derived(calc_oa_stats(filtered_pop, filtered_households,oa_maxes));

	let extent = $derived(
		(() => {
			if (show_max) {
				let d_temps = grid.features.map((f) => f.properties.max);
				return [Math.min(...d_temps), Math.max(...d_temps)];
			} else {
				let d_temps = grid.features.map((f) => f.properties.temps[day]);
				return [Math.min(...d_temps), Math.max(...d_temps)];
			}
		})()
	);

	let scale = $derived(
		(() => {
			return chroma.scale('Spectral').domain([extent[1], extent[0]]);
		})()
	);

	
	let [oa_breaks,oa_colors] = $derived((()=>{
			let households = oa_stats.map((o) => o.households);
			let people = oa_stats.map((o) => o.people);

			let vals =[]
			let colors = chroma.brewer.OrRd

			if(show_variable==="people"){
				console.log("GETTING PEOPLE STATS")
				vals = oa_stats.map(oa=>oa.people)
				colors = chroma.brewer.GnBu
			}

			if(show_variable==="households"){
				vals = oa_stats.map(oa=>oa.households)
				colors = chroma.brewer.PuRd
			}

			if(show_variable==="max"){
				vals = oa_stats.map(oa=>oa.max)
				colors = chroma.brewer.OrRd
			}

			let steps = 5;
			
			let breaks = vals.length===0 ? [] : chroma.limits(vals, 'q', steps )
			return [breaks,colors]
	})());

	var oa_ramp = $derived(
		(() => {

			let scale = chroma.scale(oa_colors).domain(oa_breaks);
			let style_steps = [];

			if(oa_breaks.length===0){
				return "rgb(0,0,0)"
			}

			for (let i = 0; i < oa_breaks.length; i++) {
				style_steps.push(oa_breaks[i]);
				style_steps.push(scale(oa_breaks[i]).css());
			}

			let ramp = [
				'interpolate',
				['linear'],
				 ['feature-state', show_variable],
				...style_steps
			];
			console.log("Done Calculating ramp, ",ramp)
			return ramp;
		})()
	);


	var oa_transparancy = $derived(
		(()=>{
			let style = 
				["case", [ "==", ["typeof", ["feature-state","max"]], "number"],
					["case",["all", 
						[">", ["feature-state", "max"], threshold_temp_range[0] ],
						["<", ["feature-state", "max"], threshold_temp_range[1] ]
					],
						0.7,
						0.1
					],
				0.0
				]
			return style
		})()
	);

	export function calc_date(days) {
		let date = new Date(1981, 1, 1);
		date.setDate(date.getDate() + days);
		return date;
	}

	var date = $derived(calc_date(day));
	let legend_suffix=$derived((()=>{
			if(show_variable==="households"){
				return "houses"
			}
			if(show_variable==="people"){
				return "people"
			}
			if(show_variable==="max"){
				return "°C"
			}
	})())

	var graph_global = $derived((() =>{
			let x = global_trend.map((_,index)=> calc_date(index).toDateString() );
			let y = global_trend
			return {x,y}
	})());

	let at_risk_global  = $derived( (()=>{
		let counts = {people:0,households:0}
		let above_threshold = oa_stats.filter((oa)=>
			oa.max >= threshold_temp_range[0] && oa.max <= threshold_temp_range[1]
		).forEach( (oa)=>  {counts.people += oa.people; counts.households+=oa.households } )
		return counts
	})() )

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
					paint={{ 'fill-color': oa_ramp, 'fill-opacity': oa_transparancy }}
					on:mousemove={(e) => {}}
				/>
				<LineLayer
					paint={{ 'line-color': 'grey', 'line-width': 0.5, "line-opacity":oa_transparancy}}
				/>
			</GeoJSON>
			{#if show_temperature_overlay}
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
			{/if}
		</MapLibre>

		<div class="absolute flex flex-col bottom-10 left-[2vw] w-[96vw] z-2 gap-4 h-max-[400px]"> 
			<Card.Root>
				<Card.Header>
					<div class="flex flex-row justify-between items-center">
						<h1>Temperature</h1>
						<div class="flex flex-row gap-2 items-center">
							<div class="flex flex-row gap-2 items-center">
								<div class="flex flex-row gap-1 items-center">
								<Label for="temp_min">Min Temp Threshold</Label><input class="w-2" type="number" bind:value={threshold_temp_range[0]} id="temp_min" />
								</div>
								<div class="flex flex-row gap-1 items-center">
								<Label for="temp_max">Max Temp Threshold</Label>
								<input type="number" bind:value={threshold_temp_range[1]} class="w-2" id="temp_max"/>
								</div>
							</div>
							<div class="flex flex-row gap-1 items-center">
								<Label>Daily / Max</Label><Switch bind:checked={show_max} />
							</div>
							<div class="flex flex-row gap-2 items-center">
								<Label>Show climate prediction</Label><Switch bind:checked={show_temperature_overlay} />
							</div>
						</div>
					</div>
				</Card.Header>
					<Card.Content >
						<TemperatureTrend global_series={graph_global} local_series={null} threshold={[0,0]}/>
						<div class='flex gap-2'>
							<p>{date.toLocaleDateString()}</p>

							<input disabled={show_max} type="range" id="day" name="cowbell" min={0} max={timesteps} bind:value={day} step={1} class="flex-grow" />
						</div>

					</Card.Content>
			</Card.Root>
			</div>
		<div class="absolute flex flex-col top-10 right-10 z-2 gap-4 "> 
			<Card.Root>
				<Card.Header>
					<div class="flex flex-row justify-between items-center">
						<h2>Population</h2>
						<PopulationSelector bind:selection_state={selection_state} />
					</div>
				</Card.Header>
					<Card.Content >
							
						<Table.Root>
						  <Table.Caption>Population Exposure</Table.Caption>
						  <Table.Header>
						    <Table.Row>
						      <Table.Head class="w-[100px]"></Table.Head>
						      <Table.Head class="w-[100px]">Total </Table.Head>
						      <Table.Head>Vulnerable </Table.Head>
						      <Table.Head>Exposed Vulnerable</Table.Head>
						    </Table.Row>
						  </Table.Header>
						  <Table.Body>
						    <Table.Row>
						      <Table.Cell class="font-medium bold">Households</Table.Cell>
						      <Table.Cell>{households.length.toLocaleString()}</Table.Cell>
						      <Table.Cell>{filtered_households.length.toLocaleString()} ({(filtered_households.length*100/households.length).toLocaleString()} %)</Table.Cell>
						      <Table.Cell >{at_risk_global.households.toLocaleString()}</Table.Cell>
						    </Table.Row>
						    <Table.Row>
						      <Table.Cell class="font-medium bold">People</Table.Cell>
						      <Table.Cell>{people.length.toLocaleString()}</Table.Cell>
						      <Table.Cell>{filtered_pop.length.toLocaleString()} ({(filtered_pop.length*100/people.length).toLocaleString()} %)</Table.Cell>
						      <Table.Cell >{at_risk_global.people.toLocaleString()}</Table.Cell>
						    </Table.Row>
						  </Table.Body>
						</Table.Root>


						<div class="flex flex-row gap-2">
							<Button variant={show_variable==="people" ? "default" : "outline"}  on:click={()=>  show_variable = "people"}>People</Button>
							<Button variant={show_variable==="households" ? "default" : "outline"} on:click={()=>  show_variable = "households"}>Households</Button>
							<Button variant={show_variable==="max" ? "default" : "outline"} on:click={()=>  show_variable = "max"}>Max Temperature</Button> 
						</div>
						<Legend name={show_variable ==="max" ? "Max Temperature" : show_variable} colors={oa_colors} breaks={oa_breaks} suffix={legend_suffix}/>
					</Card.Content>
					<Card.Footer>
				</Card.Footer>
			</Card.Root>
		</div>
	</main>
</div>
