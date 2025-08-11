import { searchFilledEventsByCriterias } from './cometh-api.js';
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

async function generateSalesChartByWallet(salesData) {
    const labels = salesData.map(({ date }) => dayjs(date).format('MMM D'));

    const config = {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Volume Achats (DOLZ)',
                    data: salesData.map(d => d.volumeAchats),
                    backgroundColor: 'rgba(200, 0, 0, 0.6)',
                    borderColor: 'red',
                    borderWidth: 1,
                    yAxisID: 'yVolume',
                },
                {
                    label: 'Volume Ventes (DOLZ)',
                    data: salesData.map(d => d.volumeVentes),
                    backgroundColor: 'rgba(0, 200, 0, 0.6)',
                    borderColor: 'green',
                    borderWidth: 1,
                    yAxisID: 'yVolume',
                },
                {
                    label: 'Nb Achats',
                    data: salesData.map(d => d.nbAchats),
                    backgroundColor: 'rgba(255, 165, 0, 0.6)',
                    borderColor: 'orange',
                    borderWidth: 1,
                    yAxisID: 'yCount',
                },
                {
                    label: 'Nb Ventes',
                    data: salesData.map(d => d.nbVentes),
                    backgroundColor: 'rgba(0, 100, 255, 0.6)',
                    borderColor: 'blue',
                    borderWidth: 1,
                    yAxisID: 'yCount',
                }
            ]
        },
        options: {
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const value = ctx.raw;
                            if (ctx.dataset.label.includes('Volume')) {
                                return `${value.toLocaleString()} DOLZ`;
                            } else {
                                return `${value} opérations`;
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
                },
                yCount: {
                    type: 'linear',
                    position: 'right',
                    title: { display: true, text: 'Nombre d\'opérations' },
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
    console.log(`handleGetChartSalesVolume withMockData: ${withMockData}`);
    let salesData;
    if (withMockData) {
        salesData = generateFakeSalesData(30);
        console.log('Generated mock sales data:', salesData);
    } else {
        salesData = await searchFilledEventsByCriterias({
            limit: 5000,
        });
        console.log('Sales data:', salesData);
    }
    const imageBuffer = await generateSalesChart(salesData);
    return await buildChartSalesVolume(imageBuffer);
}

export async function handleGetChartSalesVolumeBywallet(address) {
    console.log(`handleGetChartSalesVolumeBywallet`);
    function mergeSales(makerSales, takerSales) {
        const map = {};

        // Ajout des Maker (ventes)
        makerSales.forEach(({ date, volumeAchats, nbAchats, volumeVentes, nbVentes }) => {
            if (!map[date]) {
                map[date] = { date, volumeAchats: 0, nbAchats: 0, volumeVentes: 0, nbVentes: 0 };
            }
            map[date].volumeAchats = volumeAchats;
            map[date].nbAchats = nbAchats;
            map[date].volumeVentes = volumeVentes;
            map[date].nbVentes = nbVentes;
        });

        // Ajout des Taker (achats)
        takerSales.forEach(({ date, volumeAchats, nbAchats, volumeVentes, nbVentes }) => {
            if (!map[date]) {
                map[date] = { date, volumeAchats: 0, nbAchats: 0, volumeVentes: 0, nbVentes: 0 };
            }
            map[date].volumeAchats = volumeAchats;
            map[date].nbAchats = nbAchats;
            map[date].volumeVentes = volumeVentes;
            map[date].nbVentes = nbVentes;
        });

        // Conversion en tableau + tri par date
        return Object.values(map).sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    let makerSalesData, takerSalesData;
    makerSalesData = await searchFilledEventsByCriterias({
        maker: address,
        limit: 5000,
    });
    takerSalesData = await searchFilledEventsByCriterias({
        taker: address,
        limit: 5000,
    });
    console.log('Maker Sales data:', makerSalesData);
    console.log('Taker Sales data:', takerSalesData);

    const mergedData = mergeSales(makerSalesData, takerSalesData);
    console.log('All Sales data:', mergedData);
    const imageBuffer = await generateSalesChartByWallet(mergedData);
    return await buildChartSalesVolume(imageBuffer);
}
