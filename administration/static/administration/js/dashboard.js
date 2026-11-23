document.addEventListener("DOMContentLoaded", function () {
    const charts = JSON.parse(document.getElementById("charts-data").textContent);

    const crosshairPlugin = {
        id: "crosshair",
        afterDraw(chart) {
            const active = chart.getActiveElements();
            if (!active.length) {
                return;
            }
            const { ctx, chartArea } = chart;
            const x = active[0].element.x;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x, chartArea.top);
            ctx.lineTo(x, chartArea.bottom);
            ctx.lineWidth = 1;
            ctx.strokeStyle = "#c3c2b7";
            ctx.stroke();
            ctx.restore();
        },
    };

    charts.forEach(function (chart) {
        const canvas = document.getElementById("chart-" + chart.id);
        if (!canvas) {
            return;
        }

        new Chart(canvas, {
            type: "line",
            data: {
                labels: chart.data.map((point) => point.date),
                datasets: [
                    {
                        label: chart.label,
                        data: chart.data.map((point) => point.valeur),
                        borderColor: chart.color,
                        backgroundColor: chart.color + "1a",
                        borderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        pointBackgroundColor: chart.color,
                        pointBorderColor: "#fcfcfb",
                        pointBorderWidth: 2,
                        fill: true,
                        tension: 0,
                    },
                ],
            },
            options: {
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: "index",
                        intersect: false,
                        backgroundColor: "#fcfcfb",
                        titleColor: "#52514e",
                        bodyColor: "#0b0b0b",
                        borderColor: "rgba(11,11,11,0.10)",
                        borderWidth: 1,
                    },
                },
                interaction: {
                    mode: "index",
                    intersect: false,
                },
                scales: {
                    x: {
                        grid: { color: "#e1e0d9" },
                        ticks: { color: "#898781" },
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: "#e1e0d9" },
                        ticks: { color: "#898781", precision: 0 },
                    },
                },
            },
            plugins: [crosshairPlugin],
        });
    });
});
