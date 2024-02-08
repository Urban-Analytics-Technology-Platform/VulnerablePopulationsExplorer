export const csr = true;
import {NetCDFReader} from "@loaders.gl/netcdf"
import proto,{synthpop} from "../pb/synthpop_pb.js";

function xyz_to_index(x,y,z,xSize,ySize,zSize){
	return z + y * zSize + x * zSize * ySize
}

async function load_climate_prediction(fetch){
	
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
	return {array, grid, oas, global_trend,min,max,timesteps:times.length,times}
}

async function load_oas(fetch){
	const res = await fetch('/glasgow.geojson')
	let geo = await res.json()
	return geo
}

async function load_population(fetch){
	const res = await fetch(`/greater-glasgow.pb`);
  let blob = await res.blob();
	let data = new Uint8Array(await blob.arrayBuffer());
	
	let population = synthpop.Population.decode(data)
	return population
}

export async function load({fetch}) {
  let prediction = await load_climate_prediction(fetch)
	let population = await load_population(fetch)
	return {prediction, population};
}
