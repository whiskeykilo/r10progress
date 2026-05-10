import * as echarts from "echarts";
import { useEffect, useMemo, useRef, useState } from "react";

import { applyReadableChartTheme } from "./chartOptions";

/**
 * Custom echarts mount to make the graph rerender on nested data change,
 * which somehow does not work when using the echarts-for-react package.
 * It does in other graphs though, weird!
 */
export const BaseGraph = ({ options }: { options: echarts.EChartsOption }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts>();

  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    const el = document.documentElement;
    const sync = () => setIsDark(el.classList.contains("dark"));
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  const themedOptions = useMemo(
    () => applyReadableChartTheme(options, isDark),
    [options, isDark],
  );

  useEffect(() => {
    // Initialize chart
    if (chartRef.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    // Cleanup
    return () => {
      chartInstance.current?.dispose();
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      chartInstance.current?.resize();
    });

    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!chartInstance.current) return;
    chartInstance.current.resize();
    chartInstance.current.setOption(themedOptions, true);
  }, [themedOptions]);

  return <div ref={chartRef} className="h-full w-full" />;
};
