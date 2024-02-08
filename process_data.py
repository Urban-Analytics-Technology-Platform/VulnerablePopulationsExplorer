import rioxarray 
import xarray as xr 
import rasterio

tasmax_files = 'three.citis/Glasgow/07/tasmax/modc_var-tasmax_run-07_19810101_20091230.nc'
tasmax_data = xr.open_dataset(tasmax_files,decode_coords="all")

latlng = tasmax_data.rio.set_spatial_dims("lon","lat",True)
latlng = latlng.rio.reproject("EPSG:4326")

without_attributes = xr.DataArray(data=latlng.tasmax.to_numpy(), coords=[latlng.time,latlng.y,latlng.x], dims=["time","y","x"], name="tasmax")
without_attributes.to_netcdf("static/reprojected.nc",format="NETCDF3_CLASSIC")
