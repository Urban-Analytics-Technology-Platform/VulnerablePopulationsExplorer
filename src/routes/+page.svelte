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
	import PopulationSelector from '../population_selector.svelte';
	import { Chart, Svg, Axis, Spline } from 'layerchart';
	import proto from '../pb/synthpop_pb.js';

	import { scaleTime } from 'd3-scale';
	import { ticks } from 'd3-array';
	import chroma from 'chroma-js';

	let filters = $state([]);
	let show_households = $state(true);

	let { data } = $props();
	let { min, max, oas, grid, array, timesteps, times, global_trend } = data.prediction;
	let population = data.population;

	let { households, people, AccommodationType } = population;

	function apply_filters(households, people, filters) {
		let filtered_pop = people;
		let filtered_households = households;
		return { filtered_pop, filtered_households };
	}

	function calc_oa_stats(pop, households) {
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
		return Object.entries(oa_stats).map(([key, counts]) => ({ oa11cd: key, ...counts }));
	}

	let { filtered_pop, filtered_households } = $derived(apply_filters(households, people, filters));

	let oa_stats = $derived(calc_oa_stats(filtered_pop, filtered_households));
	console.log('oa stats ', oa_stats);

	let day = $state(10);
	let show_max = $state(false);
	let selected_cell = $state(null);
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

	var oa_ramp = $derived(
		(() => {
			console.log('OA_STATS', oa_stats);
			let households = oa_stats.map((o) => o.households);
			let people = oa_stats.map((o) => o.people);
			console.log('people ', people);

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
			console.log('ramp ', ramp);
			return ramp;
		})()
	);
</script>

<div class="flex flex-row min-h-screen bg-gray-100 text-gray-800">
	<aside
		class="sidebar w-64 md:shadow transform -translate-x-full md:translate-x-0 transition-transform duration-150 ease-in bg-indigo-500"
	>
		{#if selected_cell}
			<h2>{JSON.parse(selected_cell.properties.temps)[day]} / {selected_cell.properties.max}</h2>
		{/if}

		<input type="range" id="day" name="cowbell" min={0} max={timesteps} bind:value={day} step={1} />
		<p>{date.toLocaleDateString()}</p>

		<button type="button" on:click={() => (show_max = true)}>Max</button>
		<button type="button" on:click={() => (show_max = false)}>Daily</button>
		<button type="button" on:click={() => (show_households = true)}>Households</button>
		<button type="button" on:click={() => (show_households = false)}>People</button>
	</aside>
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
					on:mousemove={(e) => console.log(e.detail.features)}
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
		<div class="absolute top-10 left-10 w-4 h-10 background-white">
			<PopulationSelector class="absolute top-10 left-10 w-2" />
		</div>
		<div class="h-[300px] p-4 border rounded"></div>
	</main>
</div>
