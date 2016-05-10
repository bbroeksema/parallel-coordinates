
  var m_histograms = {
    show: false,
    defaulBinCount: 10,
    cache: undefined,
    updateEvent: "brush",
    defaultColorConfiguration: {
      fill: 'steelblue',
      opacity: 0.9
    },
    colorConfiguration: {
       "vitaminc (g)": { fill: 'orange', opacity: 0.4 }
    }
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
    delete m_histograms.cache;
    render();
    return pc;
  }

  histogram.defaultFillColor = function(fill) {
    if (arguments.length === 0) {
      return m_histograms.defaultColorConfiguration.fill;
    }

    if (m_histograms.defaultColorConfiguration.fill !== fill) {
      m_histograms.defaultColorConfiguration.fill = fill;
      render();
    }

    return pc;
  }

  histogram.defaultFillOpacity = function(opacity) {
    if (arguments.length === 0) {
      return m_histograms.defaultColorConfiguration.opacity;
    }

    if (m_histograms.defaultColorConfiguration.opacity !== opacity) {
      m_histograms.defaultColorConfiguration.opacity = opacity;
      render();
    }

    return pc;
  }



  histogram.enabled = function(enabled) {
    if (arguments.lengt === 0) {
      return pc.on('render.histograms') !== undefined
    }

    if (enabled) {
      var data = pc.brushed() ? pc.brushed() : pc.data();
      pc.on(m_histograms.updateEvent + ".histogram", render);
      render();
    } else {
      pc.on(m_histograms.updateEvent + ".histogram", undefined);
      pc.histograms.selectAll('.histogram').remove();
    }

    return pc;
  }

  histogram.updateEvent = function(uev) {
    if (uev !== "brush" && uev !== "brushend") {
      throw Exception("Invalid update event: " + uev + ". Expected: 'brush' or 'brushend'");
    }

    if (arguments.length === 0) {
      return m_histograms.updateEvent;
    }

    pc.on(m_histograms.updateEvent + ".histogram", null);
    m_histograms.updateEvent = uev;
    pc.on(m_histograms.updateEvent + ".histogram", render);
    return pc;
  }

  function init() {
    var data = pc.data();
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

        var binCount = histogram.binCount(dimName);
        var extent = dim.yscale.domain();
        var step = (extent[1] - extent[0]) / binCount;
        var thresholds = [];

        for(var i = 1; i < binCount; i++) {
          thresholds.push(extent[0] + i * step);
        }

        hist
          .value(function(d) { return d[dimName]; })
          .thresholds(thresholds)
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
    g.each(function(hist) {
      var bars = d3.select(this).selectAll('rect')
        .data(function(d) { return d.hist; });

      var yscale = d3.scale.linear()
        .domain([0, hist.hist.length])
        .range(pc.dimensions()[hist.dim].yscale.range())

      bars.enter().append('rect');
      bars.exit().remove();
      bars
        .attr('x', 0)
        .attr('y', function(d, i) { return yscale(i + 1) + 1; })
        .attr('height', function(d, i) { return yscale(i) - yscale(i + 1) - 1; })
        .attr('width', function(d) {
          var w = d.freq / d.total * 40;
          return  isNaN(w) ? 0 : w;
        })
        .style('fill', function() {
           if (m_histograms.colorConfiguration[hist.dim]) {
              return m_histograms.colorConfiguration[hist.dim].fill;
           }
           return m_histograms.defaultColorConfiguration.fill;
        })
        .style('fill-opacity', function() {
           if (m_histograms.colorConfiguration[hist.dim]) {
              return m_histograms.colorConfiguration[hist.dim].opacity;
           }
           return m_histograms.defaultColorConfiguration.opacity;
        });
    });
  }

  // Expose histogram functionality in parallel cooridinates object.
  pc.hist = histogram;
