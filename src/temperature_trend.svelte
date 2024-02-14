<script lang="ts">
  import Plot from 'svelte-plotly.js';

  type Series = {x:Array<Date>, y:Array<number>};
  type TemperatureTrendProps = {
    global_series: Series,
    local_series: Series | null,
    threshold: [number,number]
  }

  let global_style={
    line:{color:"black"},
    name: "Global Trend",
    type:"scatter"
  }
  let local_style={
    line:{color:"red"},
    name: "Local Trend",
    type:"scatter"
  }
  
  let {global_series, local_series,threshold} = $props<TemperatureTrendProps>()

  console.log("Global series ", global_series)
  

var layout = {

  paper_bgcolor: "rgb(255,255,255)", 

  plot_bgcolor: "rgb(255,255,255)", 

  xaxis: {

    gridcolor: "rgb(255,255,255)", 

    range: [global_series.x[0], global_series.y.at(-1)], 

    showgrid: true, 

    showline: false, 

    showticklabels: true, 

    tickcolor: "rgb(127,127,127)", 

    ticks: "outside", 

    zeroline: false

  }, 

  yaxis: {

    range:[Math.min(...global_series.y), Math.max(...global_series.y)],

    gridcolor: "rgb(255,255,255)", 

    showgrid: true, 

    showline: false, 

    showticklabels: true, 

    tickcolor: "rgb(127,127,127)", 

    ticks: "outside", 

    zeroline: false

  }

};

  let data = [{...global_series, ...global_style}]
  console.log("data ",data)
  if(local_series){
    data.push({...local_series, ...local_style})
  }
</script>

<div class="w-full h-full">
  <Plot 
    data ={data}
    layout={layout} 
    fillParent='width'
    debounce={250}
  />
</div>
