import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  TrendingUp,
  DollarSign,
  Star,
  Users,
  Award,
  Calendar,
  Layers,
  Sparkles,
  Download,
  Filter,
  BarChart3,
  LineChart,
  PieChart,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { Review, Waiter, RestaurantConfig } from '../types';
import {
  TimeGranularity,
  DataPoint,
  aggregateReviewData,
  AnalyticsSummary
} from '../utils/analyticsData';

interface ManagerAnalyticsD3Props {
  restaurant: RestaurantConfig;
  reviews: Review[];
  waiters: Waiter[];
}

export type ChartViewMode = 'dual' | 'revenue' | 'satisfaction' | 'servers';

export const ManagerAnalyticsD3: React.FC<ManagerAnalyticsD3Props> = ({
  restaurant,
  reviews,
  waiters
}) => {
  const [granularity, setGranularity] = useState<TimeGranularity>('daily');
  const [chartMode, setChartMode] = useState<ChartViewMode>('dual');
  const [selectedServerId, setSelectedServerId] = useState<string>('all');
  const [customDays, setCustomDays] = useState<number>(14);
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hoveredPointIdRef = useRef<string | null>(null);

  // Aggregate Data Points
  const { dataPoints, summary } = useMemo(() => {
    return aggregateReviewData(
      reviews,
      waiters,
      granularity,
      selectedServerId,
      customDays
    );
  }, [reviews, waiters, granularity, selectedServerId, customDays]);

  // Render D3 Chart
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || dataPoints.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const containerWidth = containerRef.current.clientWidth;
    const isMobile = containerWidth < 640;
    const height = isMobile ? 320 : 400;
    const margin = {
      top: 35,
      right: chartMode === 'revenue' ? 25 : 55,
      bottom: 45,
      left: 55
    };
    const width = containerWidth;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', height);

    // Define chart gradients.
    const defs = svg.append('defs');

    // Tip Gradient (Amber to Emerald)
    const tipGrad = defs.append('linearGradient').attr('id', 'tipGradient').attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
    tipGrad.append('stop').attr('offset', '0%').attr('stop-color', 'var(--color-forest-muted)').attr('stop-opacity', 0.85);
    tipGrad.append('stop').attr('offset', '100%').attr('stop-color', 'var(--color-forest-muted)').attr('stop-opacity', 0.1);

    // Tip Bar Gradient
    const barGrad = defs.append('linearGradient').attr('id', 'barGradient').attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
    barGrad.append('stop').attr('offset', '0%').attr('stop-color', 'var(--color-forest-muted)').attr('stop-opacity', 0.9);
    barGrad.append('stop').attr('offset', '100%').attr('stop-color', 'var(--color-forest-muted)').attr('stop-opacity', 0.4);

    // Satisfaction Line Gradient
    const satGrad = defs.append('linearGradient').attr('id', 'satAreaGrad').attr('x1', '0%').attr('y1', '0%').attr('x2', '0%').attr('y2', '100%');
    satGrad.append('stop').attr('offset', '0%').attr('stop-color', 'var(--color-clay)').attr('stop-opacity', 0.45);
    satGrad.append('stop').attr('offset', '100%').attr('stop-color', 'var(--color-clay)').attr('stop-opacity', 0.0);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleBand()
      .domain(dataPoints.map(d => d.id))
      .range([0, innerWidth])
      .padding(0.25);

    const maxTip = d3.max(dataPoints, d => d.tipRevenue) || 50;
    const yTipScale = d3.scaleLinear()
      .domain([0, Math.ceil(maxTip * 1.25 / 10) * 10 || 50])
      .nice()
      .range([innerHeight, 0]);

    const yRatingScale = d3.scaleLinear()
      .domain([1.0, 5.0])
      .range([innerHeight, 0]);

    // Grid lines (horizontal)
    const yAxisGrid = d3.axisLeft(yTipScale)
      .tickSize(-innerWidth)
      .tickFormat(() => '')
      .ticks(5);

    g.append('g')
      .attr('class', 'grid')
      .call(yAxisGrid)
      .selectAll('line')
      .attr('stroke', 'var(--color-border)')
      .attr('stroke-dasharray', '3,3');

    g.select('.grid .domain').remove();

    // Star Tier Reference Bands on Satisfaction Chart
    if (chartMode === 'satisfaction' || chartMode === 'dual') {
      const tierLevels = [
        { stars: 2.0, label: 'Départ (2.0★)', color: 'color-mix(in srgb, #ef4444 25%, transparent)' },
        { stars: 3.5, label: 'Palier 3.5★', color: 'color-mix(in srgb, var(--color-clay) 25%, transparent)' },
        { stars: 4.5, label: 'Excellence (4.5★)', color: 'color-mix(in srgb, var(--color-forest-muted) 25%, transparent)' }
      ];

      tierLevels.forEach(tl => {
        const yPos = yRatingScale(tl.stars);
        if (yPos >= 0 && yPos <= innerHeight) {
          g.append('line')
            .attr('x1', 0)
            .attr('x2', innerWidth)
            .attr('y1', yPos)
            .attr('y2', yPos)
            .attr('stroke', tl.color)
            .attr('stroke-dasharray', '4,4')
            .attr('stroke-width', 1);

          if (!isMobile) {
            g.append('text')
              .attr('x', innerWidth - 6)
              .attr('y', yPos - 4)
              .attr('text-anchor', 'end')
              .attr('fill', 'color-mix(in srgb, var(--color-parchment) 35%, transparent)')
              .attr('font-size', '9px')
              .attr('font-family', 'monospace')
              .text(tl.label);
          }
        }
      });
    }

    // DRAW REVENUE BARS OR AREA
    if (chartMode === 'dual' || chartMode === 'revenue') {
      // Area generator for tips
      const tipArea = d3.area<DataPoint>()
        .x(d => (xScale(d.id) || 0) + xScale.bandwidth() / 2)
        .y0(innerHeight)
        .y1(d => yTipScale(d.tipRevenue))
        .curve(d3.curveMonotoneX);

      // Tip Area background
      g.append('path')
        .datum(dataPoints)
        .attr('fill', 'url(#tipGradient)')
        .attr('d', tipArea);

      // Bars
      g.selectAll('.tip-bar')
        .data(dataPoints)
        .enter()
        .append('rect')
        .attr('class', 'tip-bar')
        .attr('x', d => xScale(d.id) || 0)
        .attr('width', xScale.bandwidth())
        .attr('y', innerHeight)
        .attr('height', 0)
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('fill', 'url(#barGradient)')
        .attr('stroke', 'color-mix(in srgb, var(--color-forest-muted) 60%, transparent)')
        .attr('stroke-width', 1)
        .transition()
        .duration(200)
        .ease(d3.easeCubicOut)
        .attr('y', d => yTipScale(d.tipRevenue))
        .attr('height', d => Math.max(2, innerHeight - yTipScale(d.tipRevenue)));

      // Bar Top Glowing Accents
      g.selectAll('.tip-bar-accent')
        .data(dataPoints)
        .enter()
        .append('line')
        .attr('class', 'tip-bar-accent')
        .attr('x1', d => xScale(d.id) || 0)
        .attr('x2', d => (xScale(d.id) || 0) + xScale.bandwidth())
        .attr('y1', d => yTipScale(d.tipRevenue))
        .attr('y2', d => yTipScale(d.tipRevenue))
        .attr('stroke', 'var(--color-forest-muted)')
        .attr('stroke-width', 2)
        .attr('stroke-linecap', 'round');
    }

    // DRAW SATISFACTION TREND LINE
    if (chartMode === 'dual' || chartMode === 'satisfaction') {
      const lineRating = d3.line<DataPoint>()
        .x(d => (xScale(d.id) || 0) + xScale.bandwidth() / 2)
        .y(d => yRatingScale(d.avgRating))
        .curve(d3.curveMonotoneX);

      // Gradient area under satisfaction if in satisfaction mode
      if (chartMode === 'satisfaction') {
        const satArea = d3.area<DataPoint>()
          .x(d => (xScale(d.id) || 0) + xScale.bandwidth() / 2)
          .y0(innerHeight)
          .y1(d => yRatingScale(d.avgRating))
          .curve(d3.curveMonotoneX);

        g.append('path')
          .datum(dataPoints)
          .attr('fill', 'url(#satAreaGrad)')
          .attr('d', satArea);
      }

      // Main Rating Curve
      const path = g.append('path')
        .datum(dataPoints)
        .attr('fill', 'none')
        .attr('stroke', 'var(--color-clay)')
        .attr('stroke-width', 3)
        .attr('stroke-linecap', 'round')
        .attr('d', lineRating);

      // Animate line draw
      const totalLength = (path.node() as SVGPathElement)?.getTotalLength() || 1000;
      path
        .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
        .attr('stroke-dashoffset', totalLength)
        .transition()
        .duration(200)
        .ease(d3.easeCubicOut)
        .attr('stroke-dashoffset', 0);

      // Data dots for Rating
      g.selectAll('.rating-dot-outer')
        .data(dataPoints)
        .enter()
        .append('circle')
        .attr('class', 'rating-dot-outer')
        .attr('cx', d => (xScale(d.id) || 0) + xScale.bandwidth() / 2)
        .attr('cy', d => yRatingScale(d.avgRating))
        .attr('r', 6)
        .attr('fill', 'color-mix(in srgb, var(--color-clay) 25%, transparent)')
        .attr('stroke', 'var(--color-clay)')
        .attr('stroke-width', 1.5);

      g.selectAll('.rating-dot')
        .data(dataPoints)
        .enter()
        .append('circle')
        .attr('class', 'rating-dot')
        .attr('cx', d => (xScale(d.id) || 0) + xScale.bandwidth() / 2)
        .attr('cy', d => yRatingScale(d.avgRating))
        .attr('r', 3)
        .attr('fill', 'var(--color-parchment)');
    }

    // DRAW SERVER MULTI-LINE COMPARISON
    if (chartMode === 'servers') {
      const serverColors = [
        'var(--color-clay)',
        'var(--color-forest-muted)',
        'var(--color-slate-300)',
        'var(--color-amber-300)',
        'var(--color-cyan-700)'
      ];
      
      waiters.forEach((waiter, idx) => {
        const color = serverColors[idx % serverColors.length];
        const waiterLine = d3.line<DataPoint>()
          .x(d => (xScale(d.id) || 0) + xScale.bandwidth() / 2)
          .y(d => yTipScale(d.serverBreakdown[waiter.id]?.tips || 0))
          .curve(d3.curveMonotoneX);

        g.append('path')
          .datum(dataPoints)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 2.5)
          .attr('d', waiterLine);

        // Server dots
        g.selectAll(`.server-dot-${waiter.id}`)
          .data(dataPoints)
          .enter()
          .append('circle')
          .attr('class', `server-dot-${waiter.id}`)
          .attr('cx', d => (xScale(d.id) || 0) + xScale.bandwidth() / 2)
          .attr('cy', d => yTipScale(d.serverBreakdown[waiter.id]?.tips || 0))
          .attr('r', 3.5)
          .attr('fill', color)
          .attr('stroke', 'var(--color-forest)')
          .attr('stroke-width', 1.5);
      });
    }

    // X AXIS
    const xAxis = d3.axisBottom(xScale)
      .tickFormat((id) => {
        const pt = dataPoints.find(d => d.id === id);
        return pt ? pt.shortLabel : id;
      });

    const xAxisGroup = g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    xAxisGroup.selectAll('text')
      .attr('fill', 'var(--color-slate-400)')
      .attr('font-size', isMobile ? '8px' : '10px')
      .attr('font-weight', '600')
      .attr('transform', isMobile || dataPoints.length > 15 ? 'rotate(-30)' : 'none')
      .style('text-anchor', isMobile || dataPoints.length > 15 ? 'end' : 'middle');

    xAxisGroup.select('.domain').attr('stroke', 'var(--color-border)');
    xAxisGroup.selectAll('line').attr('stroke', 'var(--color-border)');

    // LEFT Y AXIS (Pourboires €)
    const yAxisLeft = d3.axisLeft(yTipScale)
      .ticks(5)
      .tickFormat(d => `${d} €`);

    const yAxisGroupLeft = g.append('g')
      .attr('class', 'y-axis-left')
      .call(yAxisLeft);

    yAxisGroupLeft.selectAll('text')
      .attr('fill', 'var(--color-forest-muted)')
      .attr('font-size', '10px')
      .attr('font-weight', '700')
      .attr('font-family', 'monospace');

    yAxisGroupLeft.select('.domain').remove();
    yAxisGroupLeft.selectAll('line').remove();

    // Label for Left Y Axis
    g.append('text')
      .attr('x', -margin.left + 8)
      .attr('y', -12)
      .attr('fill', 'var(--color-forest-muted)')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .text('Pourboires (€)');

    // RIGHT Y AXIS (Satisfaction ★)
    if (chartMode === 'dual' || chartMode === 'satisfaction') {
      const yAxisRight = d3.axisRight(yRatingScale)
        .ticks(5)
        .tickFormat(d => `${d} ★`);

      const yAxisGroupRight = g.append('g')
        .attr('class', 'y-axis-right')
        .attr('transform', `translate(${innerWidth},0)`)
        .call(yAxisRight);

      yAxisGroupRight.selectAll('text')
        .attr('fill', 'var(--color-clay)')
        .attr('font-size', '10px')
        .attr('font-weight', '700')
        .attr('font-family', 'monospace');

      yAxisGroupRight.select('.domain').remove();
      yAxisGroupRight.selectAll('line').remove();

      // Label for Right Y Axis
      g.append('text')
        .attr('x', innerWidth)
        .attr('y', -12)
        .attr('text-anchor', 'end')
        .attr('fill', 'var(--color-clay)')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .text('Satisfaction (★ / 5)');
    }

    // INTERACTIVE CROSSHAIR & HOVER OVERLAY
    const crosshair = g.append('line')
      .attr('class', 'crosshair')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', 'var(--color-slate-400)')
      .attr('stroke-dasharray', '3,3')
      .style('opacity', 0);

    const overlay = g.append('rect')
      .attr('class', 'overlay')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair');

    overlay
      .on('mousemove', function (event) {
        const [mx, my] = d3.pointer(event);
        const bandwidth = xScale.step();
        const index = Math.floor(mx / bandwidth);

        if (index >= 0 && index < dataPoints.length) {
          const pt = dataPoints[index];
          const xPos = (xScale(pt.id) || 0) + xScale.bandwidth() / 2;

          crosshair
            .attr('x1', xPos)
            .attr('x2', xPos)
            .style('opacity', 1);

          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            const position = {
              x: Math.min(xPos + margin.left, rect.width - 220),
              y: Math.max(10, Math.min(my + margin.top, innerHeight) - 120)
            };
            tooltipRef.current?.style.setProperty(
              'transform',
              `translate3d(${position.x}px, ${position.y}px, 0)`
            );
            if (hoveredPointIdRef.current !== pt.id) {
              hoveredPointIdRef.current = pt.id;
              setHoveredPoint(pt);
              setTooltipPos(position);
            }
          }
        }
      })
      .on('mouseleave', function () {
        crosshair.style('opacity', 0);
        hoveredPointIdRef.current = null;
        setHoveredPoint(null);
        setTooltipPos(null);
      });

  }, [dataPoints, chartMode, granularity, waiters]);

  // Handle Chart Image Export (SVG)
  const handleExportSvg = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `rapport_d3_${restaurant.slug}_${granularity}_${Date.now()}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls Bar */}
      <div className="glass-card-dark rounded-3xl p-6 border border-white/10 shadow-xl flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs uppercase font-mono font-bold tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Moteur d'Analyse D3.js Vectoriel</span>
            </span>
            <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-bold">
              Temps Réel & Historique
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
            <span>Tendances Pourboires & Satisfaction Client</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Visualisation interactive D3 des volumes de pourboires collectés et de l'évolution de la note {restaurant.name} au fil des jours, semaines et mois.
          </p>
        </div>

        {/* Controls & Filter Group */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Granularity Toggle */}
          <div className="bg-slate-900/90 p-1 rounded-2xl border border-white/10 flex items-center gap-1">
            <button
              onClick={() => { setGranularity('daily'); setCustomDays(14); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                granularity === 'daily'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Quotidien (14j)</span>
            </button>

            <button
              onClick={() => setGranularity('weekly')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                granularity === 'weekly'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Hebdo (12 sem)</span>
            </button>

            <button
              onClick={() => setGranularity('monthly')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                granularity === 'monthly'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Mensuel (6 mois)</span>
            </button>
          </div>

          {/* Chart View Mode Selector */}
          <div className="bg-slate-900/90 p-1 rounded-2xl border border-white/10 flex items-center gap-1">
            <button
              onClick={() => setChartMode('dual')}
              title="Double Axe : Pourboires et Note Étoiles"
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                chartMode === 'dual'
                  ? 'bg-cyan-500 text-slate-950 font-black'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Vue Combinée
            </button>

            <button
              onClick={() => setChartMode('revenue')}
              title="Revenus Pourboires Uniquement"
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                chartMode === 'revenue'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Pourboires (€)
            </button>

            <button
              onClick={() => setChartMode('satisfaction')}
              title="Satisfaction & Étoiles"
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                chartMode === 'satisfaction'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Satisfaction (★)
            </button>

            <button
              onClick={() => setChartMode('servers')}
              title="Comparatif par Serveur"
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                chartMode === 'servers'
                  ? 'bg-purple-500 text-slate-950 font-black'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Par Serveur
            </button>
          </div>

          {/* Server Filter */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedServerId}
              onChange={e => setSelectedServerId(e.target.value)}
              className="bg-transparent font-semibold text-slate-200 focus:outline-none"
            >
              <option value="all" className="bg-slate-900 text-white">Toute l'équipe</option>
              {waiters.map(w => (
                <option key={w.id} value={w.id} className="bg-slate-900 text-white">
                  {w.name} ({w.role})
                </option>
              ))}
            </select>
          </div>

          {/* Export SVG button */}
          <button
            onClick={handleExportSvg}
            className="p-2 text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 transition-colors"
            title="Exporter le graphique vectoriel D3 (SVG)"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Highlight Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tips in Period */}
        <div className="glass-card-dark p-4 sm:p-5 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Pourboires Période</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 tabular-nums">
              {summary.totalTips}
            </span>
            <span className="text-lg font-bold text-emerald-400">€</span>
          </div>
          <div className="text-[11px] text-emerald-300 font-semibold flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+{summary.tipGrowthRate}% vs période précédente</span>
          </div>
        </div>

        {/* Average Satisfaction */}
        <div className="glass-card-dark p-4 sm:p-5 rounded-3xl border border-amber-500/30 bg-amber-500/5 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Note Moyenne Période</span>
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-white tabular-nums">
              {summary.avgRating}
            </span>
            <span className="text-xs text-slate-400">/ 5.0</span>
          </div>
          <div className="text-[11px] text-amber-300 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            <span>+{summary.ratingGrowth}★ progression constatée</span>
          </div>
        </div>

        {/* Top Performer */}
        <div className="glass-card-dark p-4 sm:p-5 rounded-3xl border border-cyan-500/30 bg-cyan-500/5 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Meilleur Serveur</span>
            <Award className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white truncate">
            {summary.topServerName}
          </div>
          <div className="text-[11px] text-cyan-300 font-semibold">
            {summary.topServerTips} € pourboires récoltés
          </div>
        </div>

        {/* Peak Service Day */}
        <div className="glass-card-dark p-4 sm:p-5 rounded-3xl border border-purple-500/30 bg-purple-500/5 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Journée Record</span>
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-300 truncate">
            {summary.peakDayTips} €
          </div>
          <div className="text-[11px] text-purple-300 font-medium truncate">
            {summary.peakDayLabel}
          </div>
        </div>
      </div>

      {/* Main D3 Chart Canvas Container */}
      <div className="glass-card-dark rounded-3xl border border-white/10 shadow-2xl p-4 sm:p-6 space-y-4 relative">
        {/* Chart Legend & Indicators */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-white/10 pb-3">
          <div className="flex flex-wrap items-center gap-4">
            {(chartMode === 'dual' || chartMode === 'revenue') && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-emerald-400 shadow-sm shadow-emerald-400/50"></span>
                <span className="font-semibold text-slate-200">Pourboires collectés (€)</span>
              </div>
            )}

            {(chartMode === 'dual' || chartMode === 'satisfaction') && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-amber-400 shadow-sm shadow-amber-400/80"></span>
                <span className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-400/40"></span>
                <span className="font-semibold text-slate-200">Note moyenne de satisfaction (★)</span>
              </div>
            )}

            {chartMode === 'servers' && (
              <div className="flex flex-wrap items-center gap-3">
                {waiters.map((w, idx) => {
                  const colors = [
                    'var(--color-clay)',
                    'var(--color-forest-muted)',
                    'var(--color-slate-300)',
                    'var(--color-amber-300)',
                    'var(--color-cyan-700)'
                  ];
                  return (
                    <div key={w.id} className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: colors[idx % colors.length] }}
                      ></span>
                      <span className="font-semibold text-slate-200">{w.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Survolez les points pour afficher le détail interactif</span>
          </div>
        </div>

        {/* D3 Render Area */}
        <div ref={containerRef} className="w-full relative min-h-[320px] sm:min-h-[400px]">
          <svg ref={svgRef} className="w-full overflow-visible"></svg>

          {/* Floating Glassmorphic Tooltip */}
          {hoveredPoint && tooltipPos && (
            <div
              ref={tooltipRef}
              className="absolute pointer-events-none z-30 transition-transform duration-75"
              style={{ transform: `translate3d(${tooltipPos.x}px, ${tooltipPos.y}px, 0)` }}
            >
              <div className="glass-card-dark p-3.5 rounded-2xl border border-white/20 shadow-2xl bg-slate-950/90 backdrop-blur-xl w-56 text-xs space-y-2">
                <div className="border-b border-white/10 pb-1.5 flex items-center justify-between">
                  <span className="font-bold text-white text-xs">{hoveredPoint.label}</span>
                  {hoveredPoint.subLabel && (
                    <span className="text-[10px] text-slate-400">{hoveredPoint.subLabel}</span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-emerald-400" />
                      <span>Pourboires :</span>
                    </span>
                    <span className="font-black text-emerald-400 font-mono text-sm">
                      {hoveredPoint.tipRevenue} €
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span>Note moyenne :</span>
                    </span>
                    <span className="font-black text-amber-300 font-mono text-sm">
                      {hoveredPoint.avgRating} / 5.0
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Avis clients récoltés :</span>
                    <span className="font-bold text-white font-mono">
                      {hoveredPoint.reviewCount} avis
                    </span>
                  </div>

                  {hoveredPoint.googleClicks > 0 && (
                    <div className="flex items-center justify-between text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-lg">
                      <span>Redirections Google :</span>
                      <span className="font-bold font-mono">+{hoveredPoint.googleClicks} avis 5★</span>
                    </div>
                  )}
                </div>

                {/* Mini Server breakdown */}
                {Object.keys(hoveredPoint.serverBreakdown).length > 0 && (
                  <div className="pt-1.5 border-t border-white/10 space-y-1">
                    <span className="text-[10px] text-slate-400 font-semibold block">
                      Par serveur :
                    </span>
                    <div className="space-y-0.5 max-h-24 overflow-y-auto">
                      {Object.values(hoveredPoint.serverBreakdown)
                        .filter(s => s.tips > 0 || s.reviews > 0)
                        .map((s, i) => (
                          <div key={i} className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-300 truncate">{s.waiterName}</span>
                            <span className="font-mono text-emerald-400 font-bold">
                              {s.tips} € ({s.reviews} retours)
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Insight */}
        <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Les données de satisfaction et de pourboires sont calculées à partir des interactions NFC et QR réelles.
            </span>
          </div>
          <div className="text-[11px] font-mono text-amber-300">
            {dataPoints.length} points temporels analysés
          </div>
        </div>
      </div>
    </div>
  );
};
