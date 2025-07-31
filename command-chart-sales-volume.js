import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { buildChartSalesVolume } from './embeds.js';
import dayjs from 'dayjs';

const width = 2000;
const height = 800;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

function generateFakeSalesData(days = 30) {
    return Array.from({ length: days }, (_, i) => {
        const date = dayjs().subtract(days - i - 1, 'day').format('YYYY-MM-DD');
        const volume = Math.floor((Math.random() + 0.4) * 10000);
        const count = Math.floor((Math.random() + 0.4) * 10);
        return { date, volume, count };
    });
}

async function generateSalesChart(salesData) {
    const labels = salesData.map(({ date }) => dayjs(date).format('MMM D'));
    const volumeValues = salesData.map(({ volume }) => volume);
    const countValues = salesData.map(({ count }) => count);

    const config = {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Volume (DOLZ)',
                    data: volumeValues,
                    backgroundColor: 'rgba(0, 200, 0, 0.6)',
                    borderColor: 'green',
                    borderWidth: 1,
                    yAxisID: 'yVolume',
                },
                {
                    label: 'Nb Ventes',
                    data: countValues,
                    backgroundColor: 'rgba(0, 100, 255, 0.6)',
                    borderColor: 'blue',
                    borderWidth: 1,
                    yAxisID: 'yCount',
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const value = ctx.raw;
                            if (ctx.dataset.label.includes('Volume')) {
                                return `${value.toLocaleString()} DOLZ`;
                            } else {
                                return `${value} ventes`;
                            }
                        }
                    }
                },
            },
            scales: {
                yVolume: {
                    type: 'linear',
                    position: 'left',
                    title: { display: true, text: 'Volume (DOLZ)' },
                    ticks: {
                        callback: val => `${val >= 0 ? '' : '-'}${Math.abs(val)}`
                    }
                },
                yCount: {
                    type: 'linear',
                    position: 'right',
                    title: { display: true, text: 'Nombre de ventes' },
                    grid: { drawOnChartArea: false },
                }
            }
        },
        plugins: [{
            id: 'custom_background',
            beforeDraw: chart => {
                const ctx = chart.canvas.getContext('2d');
                ctx.save();
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, chart.width, chart.height);
                ctx.restore();
            }
        }]
    };

    return await chartJSNodeCanvas.renderToBuffer(config);
}

export async function handleGetChartSalesVolume(withMockData = false) {
    // Remplacer par appel réel à une API si besoin
    const salesData = generateFakeSalesData(30);
    const imageBuffer = await generateSalesChart(salesData);
    return await buildChartSalesVolume(imageBuffer);
}
