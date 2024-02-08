import { NetCDFReader } from "netcdfjs";
import { base } from '$app/paths'
let data = $state(null);

export const load_data = async () => {
  let res = await fetch(`${base}/reprojected.nc`);
  let blob = await res.blob();
  let blobData = await blob.arrayBuffer();
  let array = new NetCDFReader(blobData);
  data = array
}


export async function getData() {
  return {
    get_data() { return data }
  }
}

