var pc = function(selection) {
  selection = pc.selection = d3.select(selection);

  __.width = selection[0][0].clientWidth;
  __.height = selection[0][0].clientHeight;

  // canvas data layers
  ["marks", "foreground", "brushed", "highlight"].forEach(function(layer) {
    canvas[layer] = selection
      .append("canvas")
      .attr("class", layer)[0][0];
    ctx[layer] = canvas[layer].getContext("2d");
  });

  // svg histogram, tick and brush layers
  var svg = selection
    .append("svg")
      .attr("width", __.width)
      .attr("height", __.height);

  pc.histograms = svg.append("svg:g")
      .attr('id', 'histograms')
      .attr("transform", "translate(" + __.margin.left + "," + __.margin.top + ")");

  pc.svg = svg.append("svg:g")
      .attr("transform", "translate(" + __.margin.left + "," + __.margin.top + ")");

  return pc;
};
