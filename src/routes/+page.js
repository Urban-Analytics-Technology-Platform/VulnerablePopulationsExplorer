export const csr = true;
import {NetCDFReader} from "@loaders.gl/netcdf"
import proto,{synthpop} from "../pb/synthpop_pb.js";
import booleanIntersects from "@turf/boolean-intersects"
import {multiPolygon} from "@turf/helpers"

function xyz_to_index(x,y,z,xSize,ySize,zSize){
	return z + y * zSize + x * zSize * ySize
}

async function load_climate_prediction(fetch){
	console.time("loading_climate_predictions")
	const res = await fetch(`/reprojected.nc`);
  let blob = await res.blob();

	let oas = await load_oas(fetch)
  let blobData = await blob.arrayBuffer();
  let array = new NetCDFReader(blobData);
	let features = []

	let x_coords = array.getDataVariable('x');
	let y_coords = array.getDataVariable('y');
	let times = array.getDataVariable('time');
	let tasmax= array.getDataVariable('tasmax');

	let max =-10000000
	let min = 10000000
	tasmax.forEach(t=>{
		if(t> max) { max=t} 
		if(t < min) { min=t} 
	})

	let global_trend= times.map(()=> -10000)

	let x_width= (x_coords.at(-1) - x_coords[0])/(x_coords.length-1)
	let y_width= (y_coords.at(-1) - y_coords[0])/(y_coords.length-1)

	for (let i=0 ; i <x_coords.length; i++){
		for (let j=0 ; j <y_coords.length; j++){
			let coords= []
			coords.push([x_coords[i], y_coords[j]])
			coords.push([x_coords[i] + x_width, y_coords[j]])
			coords.push([x_coords[i] + x_width, y_coords[j] +y_width ])
			coords.push([x_coords[i], y_coords[j]+y_width])
			coords.push([x_coords[i], y_coords[j]])
			let temps=[]
			for (let t=0; t<times.length; t++){
				let index = xyz_to_index(t,j,i, times.length, y_coords.length,x_coords.length);
				let tval = tasmax[index]				
				if(tval > global_trend[t]){
					global_trend[t]= tval
				}
				temps.push(tval)
			}
			let max = Math.max(...temps)
			features.push({type:"Feature",properties:{temps:temps, max, x:i,y:j}, geometry:{coordinates:[coords], type:"Polygon"}});
		}
	}
	let grid ={
		type:"FeatureCollection",
		features:features
	} 
	let {lookup,oa_maxes} = oas_to_grid(grid, oas);
	console.timeEnd("loading_climate_predictions")
	return {array, grid, oas, global_trend,min,max,timesteps:times.length,times, lookup, oa_maxes}
}

function oas_to_grid(grid, oas){
	console.time("oas_to_grid")
	let lookup = {}
	let maxes = {}
	for (const oa of oas.features){
		for (let i =0 ; i < grid.features.length; i ++){
			// let oa_m = oa.geometry.type ==="MultiPolygon" ? oa : multiPolygon([oa.geometry.coords])
			// let grid_m = multiPolygon([grid.features[i].geometry.coords])
			let grid_feature = grid.features[i]
			if (booleanIntersects(grid_feature, oa)){
				let oa_code =oa.properties.code 

				if(maxes[oa_code]){
					if(maxes[oa_code] > grid_feature.properties.max ){
						maxes[oa_code] = grid_feature.properties.max
					}
				}
				else{
					maxes[oa_code] = grid_feature.properties.max
				}

				if(lookup[oa_code]){
					lookup[oa_code].push(i)			
				}
				else{
					lookup[oa_code] = [i]
				}
			}
		}
	}
	console.timeEnd("oas_to_grid")
	return {lookup, oa_maxes:maxes}
}

async function load_oas(fetch){
	console.time("load_oas")
	const res = await fetch('/glasgow.geojson')
	let geo = await res.json()
	console.timeEnd("load_oas")
	return geo
}

async function load_population(fetch){
	console.time("load_pop")
	const res = await fetch(`/greater-glasgow.pb`);
  let blob = await res.blob();
	let data = new Uint8Array(await blob.arrayBuffer());
	
	let population = synthpop.Population.decode(data)
	console.timeEnd("load_pop")
	return population
}

export async function load({fetch}) {
  let prediction = await load_climate_prediction(fetch)
	let population = await load_population(fetch)
	return {prediction, population};
}
