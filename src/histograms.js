
  var m_histograms = {
    show: false,
    defaulBinCount: 10,
    cache: undefined
  }

  var histogram = {}

  histogram.show = function(_) {
    if (!arguments.length) {
      return m_histograms.show;
    }

    m_histograms.show = _;
    return pc;
  }

  histogram.defaultBinCount = function(_) {
    if (!arguments.length) {
      return m_histograms.defaulBinCount;
    }

    m_histograms.defaulBinCount = _;
    return pc;
  }

  histogram.binCount = function(dimension, count) {
    var dims = pc.dimensions();
    var dim = dims[dimension];
    var binCounts = {};

    if (!arguments.length) {
      Object.keys(dims).forEach(function(key) {
        binCounts[key] = pc.hist.binCount(key);
      });
      return binCounts;
    }

    if (!dims[dimension]) {
      throw "Invalid dimension given: " + dimension;
    }

    if (arguments.length === 1) {
      if (dim.type === "number") {
        return dims[dimension].binCount || m_histograms.defaulBinCount;
      } else if (dim.type ==="string") {
        return dims[dimension].yscale.domain().length;
      }

    }

    if (dim.type !== "number") {
      throw "Bin count can only be set explicitly for numerical dimenions";
    }

    dim.binCount = count;
    return pc;
  }

  histogram.enabled = function(enabled) {
    if (arguments.lengt === 0) {
      return pc.on('render.histograms') !== undefined
    }

    if (enabled) {
      var data = pc.brushed() ? pc.brushed() : pc.data();
      render();
    } else {
      pc.histograms.selectAll('.histogram').remove();
    }

    return pc;

  }

  function init() {
    var dims = pc.dimensions();
    m_histograms.cache = {};

    Object.keys(dims).forEach(function(dimName) {
      var dim = dims[dimName];
      var hist;

      if (dims[dimName].yscale === undefined) {
        pc.autoscale();
      }

      // TODO: For now we only create histograms for numerical variables.
      if (dim.type === "number") {
        hist = d3_array.histogram();

        hist
          .value(function(d) { return d[dimName]; })
          .thresholds(histogram.binCount(dimName))  // See: https://github.com/d3/d3-array#ticks
          .domain(dims[dimName].yscale.domain());

        m_histograms.cache[dimName] = hist;
      }
    });

    return m_histograms.cache;
  }

  function render() {
    var data = pc.brushed() ? pc.brushed() : pc.data();
    var dims = pc.dimensions();
    var cache = m_histograms.cache ? m_histograms.cache : init();

    if (!data) { throw "Cannot calculate histograms if no data is set yet"; }

    var histograms = [];

    Object.keys(cache).forEach(function(dimName) {
      var h = cache[dimName](data);
      var bins = h.map(function(bin) {
        return { freq: bin.length, total: data.length };
      });

      histograms.push({
        dim: dimName,
        hist: bins
      });
    });

    var g = pc.histograms.selectAll('.histogram')
      .data(histograms);

    // Add g element for each histogram if needed
    g.enter().append('g')
      .attr('class', 'histogram')
      .attr("transform", function(d) {
        return "translate(" + pc.xscale(d.dim) + ")";
      });

    // Now render bars
    g.each(function(d) {
      var bars = d3.select(this).selectAll('rect')
        .data(function(d) { return d.hist; });

      var yscale = d3.scale.linear()
        .domain([0, d.hist.length])
        .range(pc.dimensions()[d.dim].yscale.range())

      bars.enter().append('rect');
      bars.exit().remove();
      bars
        .attr('x', 0)
        .attr('y', function(d, i) { return yscale(i + 1) + 1; })
        .attr('height', function(d, i) { return yscale(i) - yscale(i + 1) - 1; })
        .attr('width', function(d) { return d.freq / d.total * 40; })
        .style('fill', 'steelblue')
        .style('fill-opacity', 0.9);
    });
  }

  pc.on('brush', histogram.render);

  // Expose histogram functionality in parallel cooridinates object.
  pc.hist = histogram;
