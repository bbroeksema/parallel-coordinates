
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
    },
    maxBarWidth: 0.8
  }

  var histogram = {}

  histogram.show = function(_) {
    if (!arguments.length) {
      return m_histograms.show;
    }

    m_histograms.show = _;
    return histogram;
  }

  histogram.defaultBinCount = function(_) {
    if (!arguments.length) {
      return m_histograms.defaulBinCount;
    }

    m_histograms.defaulBinCount = _;
    delete m_histograms.cache;
    return histogram;
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
    return histogram;
  }

  histogram.defaultFillColor = function(fill) {
    if (arguments.length === 0) {
      return m_histograms.defaultColorConfiguration.fill;
    }

    if (m_histograms.defaultColorConfiguration.fill !== fill) {
      m_histograms.defaultColorConfiguration.fill = fill;
      histogram.render();
    }

    return histogram;
  }

  histogram.defaultFillOpacity = function(opacity) {
    if (arguments.length === 0) {
      return m_histograms.defaultColorConfiguration.opacity;
    }

    if (m_histograms.defaultColorConfiguration.opacity !== opacity) {
      m_histograms.defaultColorConfiguration.opacity = opacity;
      histogram.render();
    }

    return pc;
  }

  histogram.fillColor = function(dimension, fill) {
    var colorCfg = m_histograms.colorConfiguration[dimension];

    if(arguments.length === 0) {
      throw Exception("histogram.fillColor: you have to pass at least a dimension");
    }

    if (arguments.length === 1) {
      if (colorCfg && colorCfg.fill) {
        return colorCfg.fill;
      }

      return histogram.defaultFillColor();
    }

    if (colorCfg === undefined) {
      m_histograms.colorConfiguration[dimension] = {};
    }

    m_histograms.colorConfiguration[dimension].fill = fill;
    return histogram;
  }

  histogram.fillOpacity = function(dimension, opacity) {
    var colorCfg = m_histograms.colorConfiguration[dimension];

    if(arguments.length === 0) {
      throw Exception("histogram.fillOpacity: you have to pass at least a dimension");
    }

    if (arguments.length === 1) {
      if (colorCfg && colorCfg.opacity) {
        return colorCfg.opacity;
      }

      return histogram.defaultFillOpacity();
    }

    if (colorCfg === undefined) {
      m_histograms.colorConfiguration[dimension] = {};
    }

    m_histograms.colorConfiguration[dimension].opacity = opacity;
    return histogram;
  }

  histogram.enabled = function(enabled) {
    if (arguments.lengt === 0) {
      return pc.on('render.histograms') !== undefined
    }

    if (enabled) {
      var data = pc.brushed() ? pc.brushed() : pc.data();
      pc.on(m_histograms.updateEvent + ".histogram", histogram.render);
      histogram.render();
    } else {
      pc.on(m_histograms.updateEvent + ".histogram", undefined);
      pc.histograms.selectAll('.histogram').remove();
    }

    return histogram;
  }

  histogram.maxBarWidth = function(width) {
    if (arguments.lengt === 0) {
      return m_histograms.maxBarWidth;
    }

    if (width < 0 || width > 1) {
      throw Exception("Invalid bar width: value needs to be between 0 and 1");
    }

    m_histograms.maxBarWidth = width;
    return histogram;
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
    return histogram;
  }

  histogram.render = function() {
    var data = pc.brushed() ? pc.brushed() : pc.data();
    var dims = pc.dimensions();
    var cache = m_histograms.cache ? m_histograms.cache : init();
    var xrange = pc.xscale.range();
    var maxBinWidth = (xrange[xrange.length - 1] - xrange[0]) / (xrange.length - 1);

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
        .range(pc.dimensions()[hist.dim].yscale.range());

      bars.enter().append('rect');
      bars.exit().remove();
      bars
        .attr('x', 0)
        .attr('y', function(d, i) { return yscale(i + 1) + 1; })
        .attr('height', function(d, i) { return yscale(i) - yscale(i + 1) - 1; })
        .attr('width', function(d) {
          var w = d.freq / d.total * m_histograms.maxBarWidth * maxBinWidth;
          return  isNaN(w) ? 0 : w;
        })
        .style('fill', function() {
           return histogram.fillColor(hist.dim);
        })
        .style('stroke', function() {
          return d3.rgb(histogram.fillColor(hist.dim)).darker().darker();
        })
        .style('fill-opacity', function() {
           return histogram.fillOpacity(hist.dim);
        });
    });
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

  // Expose histogram functionality in parallel cooridinates object.
  pc.hist = histogram;
