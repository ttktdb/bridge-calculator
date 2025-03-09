// bridge-calculator.js
class BridgeCalculator {
    constructor() {
        this.loads = {
            'H10': 98.1,    // 10 tấn = 98.1 kN
            'H13': 127.53,  // 13 tấn = 127.53 kN
            'H18': 176.58,  // 18 tấn = 176.58 kN
            'H30': {        // H30 với 3 trục
                'axle_loads': [58.86, 117.72, 117.72],  // [6, 12, 12] tấn -> kN
                'axle_spaces': [6, 1.6]  // khoảng cách giữa các trục
            }
        };
    }

    calculate_H_moment(load_type, span_length, section_x) {
        if (load_type === 'H30') {
            return this.calculate_H30_moment(span_length, section_x);
        }
                
        const P = this.loads[load_type];
        let max_moment = 0;
        let best_positions = null;
        let best_loads = null;
        let best_moments = null;
        
        // Function to get vehicle positions
        const get_vehicle_positions = (start_pos, direction) => {
            let positions = [];
            let loads = [];
            
            // Xe nặng
            const heavy_front = 0.35 * P;  // Trục trước xe nặng
            const heavy_rear = 0.95 * P;   // Trục sau xe nặng
            
            // Xe thường
            const normal_front = 0.3 * P;  // Trục trước xe thường
            const normal_rear = 0.7 * P;   // Trục sau xe thường
            
            // Khoảng cách
            const axle_distance = 4.0;  // m - khoảng cách giữa các trục của cùng một xe
            const normal_vehicle_distance = 8.0;  // m - khoảng cách giữa các xe thường
            const heavy_front_to_normal_rear = 4.0;  // m
            const heavy_rear_to_normal_front = 8.0;  // m
            
            // Tính số lượng xe tối đa có thể xếp lên nhịp
            const max_vehicles = Math.floor(1.5 * span_length / 8.0) + 1;
            
            // Vị trí xe nặng
            let heavy_front_pos = start_pos;
            let heavy_rear_pos = heavy_front_pos + axle_distance;
            
            // Thêm xe nặng vào danh sách
            if (direction === 'forward') {
                positions.push(heavy_front_pos, heavy_rear_pos);
                loads.push(heavy_front, heavy_rear);
            } else {
                positions.push(heavy_rear_pos, heavy_front_pos);
                loads.push(heavy_rear, heavy_front);
            }
            
            // Thêm các xe thường phía trước xe nặng
            let normal_rear_pos = heavy_front_pos - heavy_front_to_normal_rear;
            let normal_front_pos = normal_rear_pos - axle_distance;
            
            for (let i = 0; i < max_vehicles; i++) {
                if (normal_front_pos < -2 * span_length) {
                    break;  // Dừng nếu xe đã ra khỏi phạm vi quá xa
                }
                
                if (direction === 'forward') {
                    positions.push(normal_front_pos, normal_rear_pos);
                    loads.push(normal_front, normal_rear);
                } else {
                    positions.push(normal_rear_pos, normal_front_pos);
                    loads.push(normal_rear, normal_front);
                }
                    
                normal_rear_pos = normal_front_pos - normal_vehicle_distance;
                normal_front_pos = normal_rear_pos - axle_distance;
            }
            
            // Thêm các xe thường phía sau xe nặng
            normal_front_pos = heavy_rear_pos + heavy_rear_to_normal_front;
            normal_rear_pos = normal_front_pos + axle_distance;
            
            for (let i = 0; i < max_vehicles; i++) {
                if (normal_front_pos > 3 * span_length) {
                    break;  // Dừng nếu xe đã ra khỏi phạm vi quá xa
                }
                
                if (direction === 'forward') {
                    positions.push(normal_front_pos, normal_rear_pos);
                    loads.push(normal_front, normal_rear);
                } else {
                    positions.push(normal_rear_pos, normal_front_pos);
                    loads.push(normal_rear, normal_front);
                }
                    
                normal_front_pos = normal_rear_pos + normal_vehicle_distance;
                normal_rear_pos = normal_front_pos + axle_distance;
            }
            
            return [positions, loads];
        };
        
        // Kiểm tra cả hai hướng
        for (const direction of ['forward', 'reverse']) {
            // Thử đặt xe nặng tại nhiều vị trí khác nhau
            for (let offset = -2 * span_length; offset < 3 * span_length; offset += 0.05) {
                const [current_positions, current_loads] = get_vehicle_positions(offset, direction);
                const current_moments = [];
                let moment = 0;
                
                for (let i = 0; i < current_positions.length; i++) {
                    const pos = current_positions[i];
                    const load = current_loads[i];
                    
                    if (pos >= 0 && pos <= span_length) {
                        let m;
                        if (pos <= section_x) {
                            m = load * pos * (span_length - section_x) / span_length;
                        } else {
                            m = load * (span_length - pos) * section_x / span_length;
                        }
                        moment += m;
                        current_moments.push(m);
                    } else {
                        current_moments.push(0);
                    }
                }
                
                if (moment > max_moment) {
                    max_moment = moment;
                    best_positions = current_positions.filter((p) => p >= 0 && p <= span_length);
                    best_loads = [];
                    best_moments = [];
                    
                    for (let i = 0; i < current_positions.length; i++) {
                        if (current_positions[i] >= 0 && current_positions[i] <= span_length) {
                            best_loads.push(current_loads[i]);
                            if (current_moments[i] > 0) {
                                best_moments.push(current_moments[i]);
                            }
                        }
                    }
                }
            }
        }
        
        // Sắp xếp các trục theo vị trí
        if (best_positions && best_positions.length > 0) {
            const sorted_indices = [];
            for (let i = 0; i < best_positions.length; i++) {
                sorted_indices.push(i);
            }
            sorted_indices.sort((a, b) => best_positions[a] - best_positions[b]);
            
            const sorted_positions = [];
            const sorted_loads = [];
            const sorted_moments = [];
            
            for (const i of sorted_indices) {
                sorted_positions.push(best_positions[i]);
                sorted_loads.push(best_loads[i]);
                if (i < best_moments.length) {
                    sorted_moments.push(best_moments[i]);
                }
            }
            
            best_positions = sorted_positions;
            best_loads = sorted_loads;
            best_moments = sorted_moments;
        }
        
        return [max_moment, best_positions, best_loads, best_moments];
    }

    calculate_H30_moment(span_length, section_x) {
        // Implementation of H30 moment calculation
        // Similar structure to calculate_H_moment but specific to H30
        // ...
        
        // Placeholder for demo purposes
        const [moment, positions, loads, moments] = [500, [5, 10, 15], [60, 120, 120], [100, 200, 200]];
        return [moment, positions, loads, moments];
    }

    calculate_HL93_moment(span_length, section_x) {
        // Implementation of HL93 moment calculation
        // ...
        
        // Placeholder for demo purposes
        const truck_moment = 600;
        const truck_positions = [5, 9.3, 13.6];
        const truck_loads = [35, 145, 145];
        const truck_moments = [100, 250, 250];
        
        const tandem_moment = 550;
        const tandem_positions = [8, 9.2];
        const tandem_loads = [110, 110];
        const tandem_moments = [275, 275];
        
        const lane_moment = 350;
        
        return [
            truck_moment, truck_positions, truck_loads, truck_moments,
            tandem_moment, tandem_positions, tandem_loads, tandem_moments,
            lane_moment
        ];
    }
    
    calculate_test_truck_moment(span_length, section_x, axle_loads, axle_spacings, num_trucks=1, truck_spacing=6) {
        // Convert axle loads from tons to kN
        const axle_loads_kn = axle_loads.map(load => load * 9.81);
        
        // Implementation of test truck moment calculation
        // ...
        
        // Placeholder for demo purposes
        const max_moment = 800;
        const best_positions = [3, 6.5, 10];
        const best_loads = axle_loads_kn;
        const best_moments = [200, 300, 300];
        const all_axle_positions = [3, 6.5, 10];
        
        return [max_moment, best_positions, best_loads, best_moments, all_axle_positions];
    }
    
    find_optimal_truck_config(span_length, section_x, axle_loads, axle_spacings, target_moment, lower_bound_ratio, upper_bound_ratio) {
        // Implementation of optimal truck configuration finder
        // ...
        
        // Placeholder for demo purposes
        const optimal_num_trucks = 2;
        const optimal_truck_spacing = 6.5;
        const achieved_moment = target_moment * 0.85;
        const ratio = 0.85;
        
        return [optimal_num_trucks, optimal_truck_spacing, achieved_moment, ratio];
    }
    
    calculate_moment_envelope(span_length, section_x, design_moment_with_impact, test_moment, lower_bound_ratio=0.75, upper_bound_ratio=1.0) {
        // Create data for moment envelope chart
        const x = Array.from({length: 100}, (_, i) => i * span_length / 99);
        
        // Calculate moment curves
        const design_moment_curve = [];
        const test_moment_curve = [];
        
        for (const xi of x) {
            let design_m, test_m;
            
            if (xi <= section_x) {
                design_m = -design_moment_with_impact * xi / section_x;
                test_m = -test_moment * xi / section_x;
            } else {
                design_m = -design_moment_with_impact * (span_length - xi) / (span_length - section_x);
                test_m = -test_moment * (span_length - xi) / (span_length - section_x);
            }
            
            design_moment_curve.push(design_m);
            test_moment_curve.push(test_m);
        }
        
        // Create bounds
        const upper_bound = design_moment_curve.map(m => upper_bound_ratio * m);
        const lower_bound = design_moment_curve.map(m => lower_bound_ratio * m);
        
        return [x, design_moment_curve, test_moment_curve, upper_bound, lower_bound];
    }
}

// bridge-app.js
document.addEventListener('DOMContentLoaded', function() {
    // Initialize calculator
    const calculator = new BridgeCalculator();
    
    // Initialize charts
    let comparisonChart, designChart, testChart;
    
    // Track the current chart type
    let currentChartType = 'so_sanh';
    
    // Store calculation results for chart updates
    let calculationResults = {
        designMomentWithImpact: 0,
        testMoment: 0,
        designPositions: [],
        designLoads: [],
        designMoments: [],
        testPositions: [],
        testLoads: [],
        testMoments: [],
        allAxlePositions: [],
        spanLength: 0,
        sectionX: 0,
        lowerBoundRatio: 0.75,
        upperBoundRatio: 1.0,
        numTrucks: 1,
        axleLoads: []
    };
    
    // Setup event listeners
    setupEventListeners();
    initializeCharts();
    
    function setupEventListeners() {
        // Design load type change
        document.getElementById('designLoadType').addEventListener('change', function() {
            const designLoadType = this.value;
            const designMomentFrame = document.getElementById('designMomentFrame');
            
            if (designLoadType === 'custom') {
                designMomentFrame.classList.remove('hidden');
            } else {
                designMomentFrame.classList.add('hidden');
            }
        });
        
        // Span length change - update section_x
        document.getElementById('spanLength').addEventListener('input', function() {
            const spanLength = parseFloat(this.value) || 0;
            document.getElementById('sectionX').value = (spanLength / 2).toFixed(2);
        });
        
        // Number of trucks change - enable/disable truck spacing
        document.getElementById('numTrucks').addEventListener('input', function() {
            const numTrucks = parseInt(this.value) || 0;
            const truckSpacing = document.getElementById('truckSpacing');
            
            if (numTrucks > 1) {
                truckSpacing.disabled = false;
            } else {
                truckSpacing.disabled = true;
            }
        });
        
        // Fill axle loads button
        document.getElementById('fillAxleLoads').addEventListener('click', createAxleInputs);
        
        // Chart type change
        document.querySelectorAll('input[name="chartType"]').forEach(function(radio) {
            radio.addEventListener('change', function() {
                currentChartType = this.value;
                updateChartDisplay();
            });
        });
        
        // Calculate button
        document.getElementById('calculate').addEventListener('click', calculate);
        
        // Auto select truck button
        document.getElementById('autoSelectTruck').addEventListener('click', autoSelectTruck);
        
        // Clear test truck button
        document.getElementById('clearTestTruck').addEventListener('click', clearTestTruck);
        
        // Export results button
        document.getElementById('exportResults').addEventListener('click', exportResults);
        
        // Configuration management buttons
        document.getElementById('saveConfig').addEventListener('click', saveConfiguration);
        document.getElementById('loadConfig').addEventListener('click', loadConfiguration);
        document.getElementById('manageConfigs').addEventListener('click', openConfigManagerModal);
        
        // Modal close button
        document.querySelector('.close').addEventListener('click', function() {
            document.getElementById('configModal').style.display = 'none';
        });
        
        // Modal buttons
        document.getElementById('loadSelectedConfig').addEventListener('click', loadSelectedConfig);
        document.getElementById('editSelectedConfig').addEventListener('click', editSelectedConfig);
        document.getElementById('deleteSelectedConfig').addEventListener('click', deleteSelectedConfig);
        document.getElementById('refreshConfigList').addEventListener('click', refreshConfigList);
        
        // Close modal when clicking outside
        window.addEventListener('click', function(event) {
            const modal = document.getElementById('configModal');
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    function initializeCharts() {
        // Setup comparison chart
        const comparisonCtx = document.getElementById('comparisonCanvas').getContext('2d');
        comparisonChart = new Chart(comparisonCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Moment thiết kế',
                        borderColor: 'red',
                        borderWidth: 3,
                        fill: false,
                        data: []
                    },
                    {
                        label: 'Moment xe tải thử',
                        borderColor: 'blue',
                        borderWidth: 3,
                        borderDash: [5, 5],
                        fill: false,
                        data: []
                    },
                    {
                        label: 'Cận trên',
                        borderColor: 'gray',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: false,
                        data: []
                    },
                    {
                        label: 'Cận dưới',
                        borderColor: 'gray',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: false,
                        data: []
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Vị trí trên nhịp (m)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Moment (kN.m)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
        
        // Setup design chart
        const designCtx = document.getElementById('designCanvas').getContext('2d');
        designChart = new Chart(designCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Moment thiết kế',
                    borderColor: 'red',
                    borderWidth: 3,
                    fill: false,
                    data: []
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Vị trí trên nhịp (m)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Moment (kN.m)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
        
        // Setup test chart
        const testCtx = document.getElementById('testCanvas').getContext('2d');
        testChart = new Chart(testCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Moment xe tải thử',
                    borderColor: 'blue',
                    borderWidth: 3,
                    fill: false,
                    data: []
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Vị trí trên nhịp (m)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Moment (kN.m)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    function updateChartDisplay() {
        const comparisonDiv = document.getElementById('comparisonChart');
        const separateDiv = document.getElementById('separateCharts');
        
        if (currentChartType === 'so_sanh') {
            comparisonDiv.classList.remove('hidden');
            separateDiv.classList.add('hidden');
        } else {
            comparisonDiv.classList.add('hidden');
            separateDiv.classList.remove('hidden');
        }
        
        updateCharts();
    }
    
    function updateCharts() {
        if (!calculationResults.spanLength) return;
        
        const [x, designCurve, testCurve, upperBound, lowerBound] = calculator.calculate_moment_envelope(
            calculationResults.spanLength,
            calculationResults.sectionX,
            calculationResults.designMomentWithImpact,
            calculationResults.testMoment,
            calculationResults.lowerBoundRatio,
            calculationResults.upperBoundRatio
        );
        
        if (currentChartType === 'so_sanh') {
            updateComparisonChart(x, designCurve, testCurve, upperBound, lowerBound);
        } else {
            updateDesignChart(x, designCurve);
            updateTestChart(x, testCurve);
        }
    }
    
    function updateComparisonChart(x, designCurve, testCurve, upperBound, lowerBound) {
        comparisonChart.data.labels = x;
        comparisonChart.data.datasets[0].data = designCurve;
        comparisonChart.data.datasets[1].data = testCurve;
        comparisonChart.data.datasets[2].data = upperBound;
        comparisonChart.data.datasets[3].data = lowerBound;
        
        // Add vertical line at section_x
        comparisonChart.options.plugins.annotation = {
            annotations: {
                line1: {
                    type: 'line',
                    xMin: calculationResults.sectionX,
                    xMax: calculationResults.sectionX,
                    borderColor: 'gray',
                    borderWidth: 2,
                    borderDash: [5, 5]
                }
            }
        };
        
        // Set chart title
        const ratio = calculationResults.testMoment / calculationResults.designMomentWithImpact;
        const resultText = (calculationResults.lowerBoundRatio <= ratio && ratio <= calculationResults.upperBoundRatio) 
            ? "ĐẠT YÊU CẦU" 
            : "KHÔNG ĐẠT YÊU CẦU";
        
        comparisonChart.options.plugins.title = {
            display: true,
            text: `Biểu đồ Moment - Tỷ lệ: ${ratio.toFixed(4)} (${resultText})`,
            font: {
                size: 16,
                weight: 'bold'
            }
        };
        
        comparisonChart.update();
    }
    
    function updateDesignChart(x, designCurve) {
        designChart.data.labels = x;
        designChart.data.datasets[0].data = designCurve;
        
        // Add vertical line at section_x
        designChart.options.plugins.annotation = {
            annotations: {
                line1: {
                    type: 'line',
                    xMin: calculationResults.sectionX,
                    xMax: calculationResults.sectionX,
                    borderColor: 'gray',
                    borderWidth: 2,
                    borderDash: [5, 5]
                }
            }
        };
        
        // Set chart title
        designChart.options.plugins.title = {
            display: true,
            text: `Moment Thiết kế: ${calculationResults.designMomentWithImpact.toFixed(2)} kN.m (có xung kích)`,
            font: {
                size: 14,
                weight: 'bold'
            }
        };
        
        designChart.update();
    }
    
    function updateTestChart(x, testCurve) {
        testChart.data.labels = x;
        testChart.data.datasets[0].data = testCurve;
        
        // Add vertical line at section_x
        testChart.options.plugins.annotation = {
            annotations: {
                line1: {
                    type: 'line',
                    xMin: calculationResults.sectionX,
                    xMax: calculationResults.sectionX,
                    borderColor: 'gray',
                    borderWidth: 2,
                    borderDash: [5, 5]
                }
            }
        };
        
        // Set chart title
        testChart.options.plugins.title = {
            display: true,
            text: `Moment Xe tải thử: ${calculationResults.testMoment.toFixed(2)} kN.m`,
            font: {
                size: 14,
                weight: 'bold'
            }
        };
        
        testChart.update();
    }
    
    function createAxleInputs() {
        const numAxles = parseInt(document.getElementById('numAxles').value) || 2;
        const axleFrame = document.getElementById('axleFrame');
        
        // Clear existing inputs
        axleFrame.innerHTML = '';
        
        // Add total load input
        const totalLoadRow = document.createElement('div');
        totalLoadRow.className = 'axle-row';
        
        const totalLoadLabel = document.createElement('label');
        totalLoadLabel.textContent = 'Tổng tải trọng P (tấn):';
        totalLoadRow.appendChild(totalLoadLabel);
        
        const totalLoadInput = document.createElement('input');
        totalLoadInput.type = 'number';
        totalLoadInput.id = 'totalLoad';
        totalLoadInput.className = 'input-field';
        totalLoadInput.step = '0.1';
        
        // Set default value based on number of axles
        if (numAxles === 2) {
            totalLoadInput.value = '13';  // 13 tấn cho xe 2 trục
        } else if (numAxles === 3) {
            totalLoadInput.value = '27';  // 27 tấn cho xe 3 trục
        } else if (numAxles === 4) {
            totalLoadInput.value = '30';  // 30 tấn cho xe 4 trục
        } else {
            totalLoadInput.value = '20';  // 20 tấn mặc định
        }
        
        totalLoadRow.appendChild(totalLoadInput);
        axleFrame.appendChild(totalLoadRow);
        
        // Add header row
        const headerRow = document.createElement('div');
        headerRow.className = 'axle-row';
        
        const axleHeader = document.createElement('div');
        axleHeader.textContent = 'Trục';
        axleHeader.className = 'axle-label';
        headerRow.appendChild(axleHeader);
        
        const loadHeader = document.createElement('div');
        loadHeader.textContent = 'Tải trọng (tấn)';
        headerRow.appendChild(loadHeader);
        
        if (numAxles > 1) {
            const spacingHeader = document.createElement('div');
            spacingHeader.textContent = 'Khoảng cách đến trục tiếp theo (m)';
            headerRow.appendChild(spacingHeader);
        }
        
        axleFrame.appendChild(headerRow);
        
        // Add inputs for each axle
        for (let i = 0; i < numAxles; i++) {
            const axleRow = document.createElement('div');
            axleRow.className = 'axle-row';
            
            const axleLabel = document.createElement('div');
            axleLabel.textContent = `Trục ${i+1}`;
            axleLabel.className = 'axle-label';
            axleRow.appendChild(axleLabel);
            
            const loadInput = document.createElement('input');
            loadInput.type = 'number';
            loadInput.className = 'input-field axle-load';
            loadInput.dataset.axle = i;
            loadInput.step = '0.1';
            axleRow.appendChild(loadInput);
            
            if (i < numAxles - 1) {
                const spacingInput = document.createElement('input');
                spacingInput.type = 'number';
                spacingInput.className = 'input-field axle-spacing';
                spacingInput.dataset.axle = i;
                spacingInput.step = '0.1';
                
                // Default spacing values
                if (numAxles === 2) {
                    spacingInput.value = '3.5';  // Default for 2-axle truck
                } else if (numAxles === 3) {
                    if (i === 0) spacingInput.value = '3.85';  // Distance between axles 1-2
                    else if (i === 1) spacingInput.value = '1.35';  // Distance between axles 2-3
                } else if (numAxles === 4) {
                    if (i === 0) spacingInput.value = '1.8';  // Distance between axles 1-2
                    else if (i === 1) spacingInput.value = '3.2';  // Distance between axles 2-3
                    else if (i === 2) spacingInput.value = '1.35';  // Distance between axles 3-4
                } else {
                    spacingInput.value = '4';  // Default for other trucks
                }
                
                axleRow.appendChild(spacingInput);
            }
            
            axleFrame.appendChild(axleRow);
        }
        
        // Add event listener to update axle loads when total load changes
        totalLoadInput.addEventListener('input', updateAxleLoads);
        
        // Update axle loads initially
        updateAxleLoads();
    }
    
    function updateAxleLoads() {
        const totalLoad = parseFloat(document.getElementById('totalLoad').value) || 0;
        const axleLoads = document.querySelectorAll('.axle-load');
        const numAxles = axleLoads.length;
        
        if (numAxles === 2) {
            // 2-axle truck: 0.3P, 0.7P
            axleLoads[0].value = (0.3 * totalLoad).toFixed(2);
            axleLoads[1].value = (0.7 * totalLoad).toFixed(2);
        } else if (numAxles === 3) {
            // 3-axle truck: 0.2P, 0.4P, 0.4P
            axleLoads[0].value = (0.2 * totalLoad).toFixed(2);
            axleLoads[1].value = (0.4 * totalLoad).toFixed(2);
            axleLoads[2].value = (0.4 * totalLoad).toFixed(2);
        } else if (numAxles === 4) {
            // 4-axle truck: 0.15P, 0.15P, 0.35P, 0.35P
            axleLoads[0].value = (0.15 * totalLoad).toFixed(2);
            axleLoads[1].value = (0.15 * totalLoad).toFixed(2);
            axleLoads[2].value = (0.35 * totalLoad).toFixed(2);
            axleLoads[3].value = (0.35 * totalLoad).toFixed(2);
        } else {
            // Distribute evenly for other number of axles
            const axleLoad = totalLoad / numAxles;
            axleLoads.forEach(input => {
                input.value = axleLoad.toFixed(2);
            });
        }
    }
    
    function calculate() {
        try {
            // Get input values
            const spanLength = parseFloat(document.getElementById('spanLength').value);
            const sectionX = parseFloat(document.getElementById('sectionX').value);
            const impactFactor = parseFloat(document.getElementById('impactFactor').value);
            const designLoadType = document.getElementById('designLoadType').value;
            
            // Validate inputs
            if (isNaN(spanLength) || isNaN(sectionX) || isNaN(impactFactor)) {
                alert('Vui lòng nhập số hợp lệ!');
                return;
            }
            
            if (sectionX > spanLength || sectionX < 0) {
                alert('Vị trí mặt cắt không hợp lệ!');
                return;
            }
            
            // Get bounds
            const lowerBoundRatio = parseFloat(document.getElementById('lowerBound').value) || 0.75;
            const upperBoundRatio = parseFloat(document.getElementById('upperBound').value) || 1.0;
            
            // Check if axle inputs exist
            const axleLoads = Array.from(document.querySelectorAll('.axle-load'))
                .map(input => parseFloat(input.value));
                
            const axleSpacings = Array.from(document.querySelectorAll('.axle-spacing'))
                .map(input => parseFloat(input.value));
            
            if (axleLoads.length === 0) {
                alert('Vui lòng nhập số trục và tải trọng trục!');
                return;
            }
            
            if (axleLoads.some(isNaN) || axleSpacings.some(isNaN)) {
                alert('Vui lòng nhập tải trọng và khoảng cách trục hợp lệ!');
                return;
            }
            
            // Get number of trucks and spacing
            const numTrucks = parseInt(document.getElementById('numTrucks').value) || 1;
            const truckSpacing = numTrucks > 1 ? parseFloat(document.getElementById('truckSpacing').value) || 6 : 0;
            
            // Calculate design moment
            let designMoment = 0;
            let designPositions = [];
            let designLoads = [];
            let designMoments = [];
            let designMomentWithImpact = 0;
            
            if (designLoadType === 'custom') {
                designMoment = parseFloat(document.getElementById('designMoment').value) || 0;
                designMomentWithImpact = designMoment * impactFactor;
            } else if (['H10', 'H13', 'H18', 'H30'].includes(designLoadType)) {
                const result = calculator.calculate_H_moment(designLoadType, spanLength, sectionX);
                designMoment = result[0];
                designPositions = result[1];
                designLoads = result[2];
                designMoments = result[3];
                designMomentWithImpact = designMoment * impactFactor;
            } else if (designLoadType === 'HL93') {
                const result = calculator.calculate_HL93_moment(spanLength, sectionX);
                const truckMoment = result[0];
                const tandemMoment = result[4];
                const laneMoment = result[8];
                
                // Choose the larger of truck and tandem
                if (truckMoment > tandemMoment) {
                    designMoment = truckMoment;
                    designPositions = result[1];
                    designLoads = result[2];
                    designMoments = result[3];
                    designMomentWithImpact = truckMoment * impactFactor + laneMoment;
                } else {
                    designMoment = tandemMoment;
                    designPositions = result[5];
                    designLoads = result[6];
                    designMoments = result[7];
                    designMomentWithImpact = tandemMoment * impactFactor + laneMoment;
                }
            }
            
            // Calculate test truck moment
            const testResult = calculator.calculate_test_truck_moment(
                spanLength, sectionX, axleLoads, axleSpacings, numTrucks, truckSpacing);
            
            const testMoment = testResult[0];
            const testPositions = testResult[1];
            const testLoads = testResult[2];
            const testMoments = testResult[3];
            const allAxlePositions = testResult[4];
            
            // Store results for chart updates
            calculationResults = {
                designMomentWithImpact,
                testMoment,
                designPositions,
                designLoads,
                designMoments,
                testPositions,
                testLoads,
                testMoments,
                allAxlePositions,
                spanLength,
                sectionX,
                lowerBoundRatio,
                upperBoundRatio,
                numTrucks,
                axleLoads
            };
            
            // Display results
            displayResults(designLoadType, designMoment, designMomentWithImpact, 
                          testMoment, impactFactor, lowerBoundRatio, upperBoundRatio);
            
            // Update charts
            updateCharts();
            
        } catch (error) {
            alert(`Đã xảy ra lỗi: ${error.message}`);
            console.error(error);
        }
    }
    
    function displayResults(designLoadType, designMoment, designMomentWithImpact, 
                          testMoment, impactFactor, lowerBoundRatio, upperBoundRatio) {
        const resultText = document.getElementById('resultText');
        const resultLabel = document.getElementById('resultLabel');
        
        // Calculate ratio
        const ratio = testMoment / designMomentWithImpact;
        
        // Format the result text
        let text = "Thông tin xe tải thử:\n";
        text += `Số trục: ${document.querySelectorAll('.axle-load').length}\n`;
        text += `Tải trọng trục (tấn): ${Array.from(document.querySelectorAll('.axle-load')).map(el => parseFloat(el.value).toFixed(2)).join(', ')}\n`;
        
        const spacings = Array.from(document.querySelectorAll('.axle-spacing'));
        if (spacings.length > 0) {
            text += `Khoảng cách giữa các trục (m): ${spacings.map(el => parseFloat(el.value).toFixed(2)).join(', ')}\n`;
        }
        
        text += `Số xe tải: ${document.getElementById('numTrucks').value}\n`;
        
        if (parseInt(document.getElementById('numTrucks').value) > 1) {
            text += `Khoảng cách giữa các xe (m): ${document.getElementById('truckSpacing').value}\n`;
        }
        
        text += `\nBảng phân tích chi tiết cho tải trọng thiết kế ${designLoadType}:\n`;
        text += `Mặt cắt tính toán: ${document.getElementById('sectionX').value}m\n`;
        text += `Chiều dài nhịp: ${document.getElementById('spanLength').value}m\n`;
        
        if (designLoadType === 'custom') {
            text += `Moment thiết kế đã nhập: ${designMoment.toFixed(2)} kN.m\n`;
        } else {
            text += `Moment do tải trọng thiết kế: ${designMoment.toFixed(2)} kN.m\n`;
        }
        
        text += `Moment có xét xung kích (× ${impactFactor}): ${designMomentWithImpact.toFixed(2)} kN.m\n\n`;
        
        text += `Bảng phân tích chi tiết cho xe tải thử:\n`;
        text += `Mặt cắt tính toán: ${document.getElementById('sectionX').value}m\n`;
        text += `Chiều dài nhịp: ${document.getElementById('spanLength').value}m\n`;
        text += `Moment do xe tải thử: ${testMoment.toFixed(2)} kN.m\n\n`;
        
        text += `So sánh với tải trọng thiết kế ${designLoadType}:\n`;
        text += `Moment do tải trọng thiết kế (có xung kích): ${designMomentWithImpact.toFixed(2)} kN.m\n`;
        text += `Moment do xe tải thử: ${testMoment.toFixed(2)} kN.m\n`;
        text += `Tỷ lệ: ${ratio.toFixed(4)}\n\n`;
        
        if (lowerBoundRatio <= ratio && ratio <= upperBoundRatio) {
            text += `Kết luận: ĐẠT YÊU CẦU (${lowerBoundRatio} ≤ tỷ lệ ≤ ${upperBoundRatio})`;
            resultLabel.textContent = `ĐẠT!\nTỷ số: ${ratio.toFixed(4)}`;
            resultLabel.className = 'result-label success';
        } else {
            text += `Kết luận: KHÔNG ĐẠT YÊU CẦU (tỷ lệ phải nằm trong khoảng ${lowerBoundRatio} đến ${upperBoundRatio})`;
            if (ratio < lowerBoundRatio) {
                text += `\nXe tải thử có tải trọng quá nhỏ so với tải trọng thiết kế.`;
            } else {
                text += `\nXe tải thử có tải trọng quá lớn so với tải trọng thiết kế.`;
            }
            resultLabel.textContent = `KHÔNG ĐẠT!\nTỷ số: ${ratio.toFixed(4)}`;
            resultLabel.className = 'result-label fail';
        }
        
        resultText.value = text;
    }
    
    function autoSelectTruck() {
        try {
            // Check if axle inputs exist
            if (document.querySelectorAll('.axle-load').length === 0) {
                alert('Vui lòng nhập số trục và tải trọng trục trước!');
                return;
            }
            
            const spanLength = parseFloat(document.getElementById('spanLength').value);
            const sectionX = parseFloat(document.getElementById('sectionX').value);
            const impactFactor = parseFloat(document.getElementById('impactFactor').value);
            const designLoadType = document.getElementById('designLoadType').value;
            
            // Get bounds
            const lowerBoundRatio = parseFloat(document.getElementById('lowerBound').value) || 0.75;
            const upperBoundRatio = parseFloat(document.getElementById('upperBound').value) || 1.0;
            
            // Get axle loads and spacings
            const axleLoads = Array.from(document.querySelectorAll('.axle-load'))
                .map(input => parseFloat(input.value));
                
            const axleSpacings = Array.from(document.querySelectorAll('.axle-spacing'))
                .map(input => parseFloat(input.value));
            
            // Calculate target moment
            let targetMoment = 0;
            
            if (designLoadType === 'custom') {
                const designMoment = parseFloat(document.getElementById('designMoment').value) || 0;
                targetMoment = designMoment * impactFactor;
            } else if (['H10', 'H13', 'H18', 'H30'].includes(designLoadType)) {
                const result = calculator.calculate_H_moment(designLoadType, spanLength, sectionX);
                targetMoment = result[0] * impactFactor;
            } else if (designLoadType === 'HL93') {
                const result = calculator.calculate_HL93_moment(spanLength, sectionX);
                const truckMoment = result[0];
                const tandemMoment = result[4];
                const laneMoment = result[8];
                
                // Choose the larger of truck and tandem
                if (truckMoment > tandemMoment) {
                    targetMoment = truckMoment * impactFactor + laneMoment;
                } else {
                    targetMoment = tandemMoment * impactFactor + laneMoment;
                }
            }
            
            // Find optimal truck configuration
            const [optimalNumTrucks, optimalTruckSpacing, achievedMoment, optimalRatio] = 
                calculator.find_optimal_truck_config(
                    spanLength, sectionX, axleLoads, axleSpacings, 
                    targetMoment, lowerBoundRatio, upperBoundRatio
                );
            
            // Update the UI with the optimal configuration
            document.getElementById('numTrucks').value = optimalNumTrucks;
            
            if (optimalNumTrucks > 1) {
                const truckSpacingInput = document.getElementById('truckSpacing');
                truckSpacingInput.disabled = false;
                truckSpacingInput.value = optimalTruckSpacing.toFixed(1);
            } else {
                document.getElementById('truckSpacing').disabled = true;
            }
            
            // Display the results
            const message = `Đã tìm thấy cấu hình tối ưu:
- Số lượng xe: ${optimalNumTrucks} xe
- Khoảng cách giữa các xe: ${optimalTruckSpacing.toFixed(2)}m
- Moment đạt được: ${achievedMoment.toFixed(2)} kN.m
- Tỷ lệ so với moment thiết kế: ${optimalRatio.toFixed(4)}
- Tỷ lệ so với cận dưới: ${(optimalRatio/lowerBoundRatio).toFixed(4)}
- Tỷ lệ so với cận trên: ${(optimalRatio/upperBoundRatio).toFixed(4)}

${lowerBoundRatio <= optimalRatio && optimalRatio <= upperBoundRatio 
    ? `ĐẠT YÊU CẦU (${lowerBoundRatio} ≤ ${optimalRatio.toFixed(4)} ≤ ${upperBoundRatio})` 
    : `KHÔNG ĐẠT YÊU CẦU (tỷ lệ nằm ngoài khoảng ${lowerBoundRatio} - ${upperBoundRatio})`}`;
            
            alert(message);
            
            // Calculate with the new configuration
            calculate();
            
        } catch (error) {
            alert(`Đã xảy ra lỗi: ${error.message}`);
            console.error(error);
        }
    }
    
    function clearTestTruck() {
        // Reset all inputs
        document.getElementById('numAxles').value = "2";
        document.getElementById('numTrucks').value = "1";
        document.getElementById('truckSpacing').value = "6";
        document.getElementById('truckSpacing').disabled = true;
        
        // Clear axle frame
        document.getElementById('axleFrame').innerHTML = '';
        
        // Clear results
        document.getElementById('resultText').value = '';
        document.getElementById('resultLabel').textContent = '';
        document.getElementById('resultLabel').className = 'result-label';
        
        // Reset charts
        if (comparisonChart) {
            comparisonChart.data.datasets.forEach(dataset => {
                dataset.data = [];
            });
            comparisonChart.data.labels = [];
            comparisonChart.update();
        }
        
        if (designChart) {
            designChart.data.datasets[0].data = [];
            designChart.data.labels = [];
            designChart.update();
        }
        
        if (testChart) {
            testChart.data.datasets[0].data = [];
            testChart.data.labels = [];
            testChart.update();
        }
        
        // Reset calculation results
        calculationResults = {
            designMomentWithImpact: 0,
            testMoment: 0,
            designPositions: [],
            designLoads: [],
            designMoments: [],
            testPositions: [],
            testLoads: [],
            testMoments: [],
            allAxlePositions: [],
            spanLength: 0,
            sectionX: 0,
            lowerBoundRatio: 0.75,
            upperBoundRatio: 1.0,
            numTrucks: 1,
            axleLoads: []
        };
    }
    
    function exportResults() {
        const resultText = document.getElementById('resultText').value;
        
        if (!resultText.trim()) {
            alert('Không có kết quả để xuất.');
            return;
        }
        
        // Create a simple HTML document with the results
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Kết quả kiểm tra tải trọng xe tải</title>
            <style>
                body { font-family: "Times New Roman", serif; font-size: 13pt; line-height: 1.5; margin: 20mm 25mm; }
                h1, h2, h3 { font-family: "Times New Roman", serif; }
                h1 { font-size: 16pt; text-align: center; }
                h2 { font-size: 14pt; }
                pre { font-family: "Courier New", monospace; white-space: pre-wrap; }
        .chart { width: 100%; max-width: 800px; margin: 20px auto; }
        .date { text-align: center; margin-bottom: 20px; }
    </style>
</head>
<body>
    <h1>KẾT QUẢ KIỂM TRA TẢI TRỌNG XE TẢI THỬ</h1>
    <div class="date">Thời gian xuất báo cáo: ${new Date().toLocaleString('vi-VN')}</div>
    
    <h2>1. KẾT QUẢ TÍNH TOÁN CHI TIẾT</h2>
    <pre>${resultText}</pre>
    
    <h2>2. BIỂU ĐỒ MOMENT</h2>
    <div class="chart">
        <img src="${getChartImage()}" alt="Biểu đồ moment" style="width:100%;">
    </div>
</body>
</html>
    `;
    
    // Create a Blob with the HTML content
    const blob = new Blob([html], {type: 'text/html'});
    const url = URL.createObjectURL(blob);
    
    // Open in a new window
    const newWindow = window.open(url, '_blank');
    if (!newWindow) {
        alert('Trình duyệt đã chặn cửa sổ mới. Vui lòng cho phép cửa sổ pop-up cho trang web này.');
    }
}

function getChartImage() {
    // Get appropriate chart based on current type
    let canvas;
    if (currentChartType === 'so_sanh') {
        canvas = document.getElementById('comparisonCanvas');
    } else {
        // Combine both charts for separate view
        const designCanvas = document.getElementById('designCanvas');
        const testCanvas = document.getElementById('testCanvas');
        
        // Create a new canvas to combine both charts
        const combinedCanvas = document.createElement('canvas');
        combinedCanvas.width = Math.max(designCanvas.width, testCanvas.width) * 2;
        combinedCanvas.height = Math.max(designCanvas.height, testCanvas.height);
        
        const ctx = combinedCanvas.getContext('2d');
        ctx.drawImage(designCanvas, 0, 0);
        ctx.drawImage(testCanvas, designCanvas.width, 0);
        
        canvas = combinedCanvas;
    }
    return canvas.toDataURL('image/png');
}

function saveConfiguration() {
    try {
        // Collect truck configuration data
        const config = collectTruckConfigData();
        if (!config) return; // Return if data collection failed
        
        // Prompt for config name
        const configName = prompt("Nhập tên cho cấu hình xe tải:", config.name);
        if (!configName) return; // User cancelled
        
        config.name = configName;
        config.saved_date = new Date().toISOString();
        
        // Save to localStorage
        const configs = JSON.parse(localStorage.getItem('truckConfigs') || '[]');
        configs.push(config);
        localStorage.setItem('truckConfigs', JSON.stringify(configs));
        
        alert(`Đã lưu cấu hình xe tải: ${configName}`);
    } catch (error) {
        alert(`Không thể lưu cấu hình xe tải: ${error.message}`);
        console.error(error);
    }
}

function collectTruckConfigData() {
    try {
        // Check if axle inputs exist
        if (document.querySelectorAll('.axle-load').length === 0) {
            alert('Vui lòng nhập số trục và tải trọng trục trước!');
            return null;
        }
        
        // Get axle loads and spacings
        const axleLoads = Array.from(document.querySelectorAll('.axle-load'))
            .map(input => parseFloat(input.value));
            
        const axleSpacings = Array.from(document.querySelectorAll('.axle-spacing'))
            .map(input => parseFloat(input.value));
        
        // Get truck info
        const numAxles = axleLoads.length;
        const numTrucks = parseInt(document.getElementById('numTrucks').value) || 1;
        const truckSpacing = numTrucks > 1 ? parseFloat(document.getElementById('truckSpacing').value) : 0;
        
        // Get total load if available
        let totalLoad = 0;
        if (document.getElementById('totalLoad')) {
            totalLoad = parseFloat(document.getElementById('totalLoad').value) || 0;
        }
        
        if (totalLoad === 0) {
            totalLoad = axleLoads.reduce((sum, load) => sum + load, 0);
        }
        
        // Create truck config object
        const truckConfig = {
            name: `Xe ${numAxles} trục - ${totalLoad.toFixed(1)} tấn`,
            num_axles: numAxles,
            axle_loads: axleLoads,
            axle_spacings: axleSpacings,
            num_trucks: numTrucks,
            truck_spacing: truckSpacing,
            total_load: totalLoad,
            saved_date: new Date().toISOString()
        };
        
        return truckConfig;
    } catch (error) {
        alert(`Không thể thu thập dữ liệu cấu hình xe tải: ${error.message}`);
        console.error(error);
        return null;
    }
}

function loadConfiguration() {
    // Open the config manager modal
    openConfigManagerModal();
}

function openConfigManagerModal() {
    document.getElementById('configModal').style.display = 'block';
    refreshConfigList();
}

function refreshConfigList() {
    const tableBody = document.querySelector('#configTable tbody');
    tableBody.innerHTML = '';
    
    // Get saved configs from localStorage
    const configs = JSON.parse(localStorage.getItem('truckConfigs') || '[]');
    
    if (configs.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 4;
        cell.textContent = 'Không có cấu hình nào được lưu.';
        cell.style.textAlign = 'center';
        row.appendChild(cell);
        tableBody.appendChild(row);
        return;
    }
    
    configs.forEach((config, index) => {
        const row = document.createElement('tr');
        row.dataset.index = index;
        row.addEventListener('click', function() {
            // Remove selected class from all rows
            document.querySelectorAll('#configTable tbody tr').forEach(r => {
                r.classList.remove('selected');
            });
            // Add selected class to this row
            this.classList.add('selected');
        });
        
        const nameCell = document.createElement('td');
        nameCell.textContent = config.name;
        row.appendChild(nameCell);
        
        const axlesCell = document.createElement('td');
        axlesCell.textContent = config.num_axles;
        row.appendChild(axlesCell);
        
        const loadCell = document.createElement('td');
        loadCell.textContent = config.total_load.toFixed(1);
        row.appendChild(loadCell);
        
        const dateCell = document.createElement('td');
        const date = new Date(config.saved_date);
        dateCell.textContent = date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN');
        row.appendChild(dateCell);
        
        tableBody.appendChild(row);
    });
}

function loadSelectedConfig() {
    const selectedRow = document.querySelector('#configTable tbody tr.selected');
    if (!selectedRow) {
        alert('Vui lòng chọn một cấu hình để tải!');
        return;
    }
    
    const configIndex = parseInt(selectedRow.dataset.index);
    const configs = JSON.parse(localStorage.getItem('truckConfigs') || '[]');
    
    if (configIndex >= 0 && configIndex < configs.length) {
        const config = configs[configIndex];
        applyTruckConfig(config);
        document.getElementById('configModal').style.display = 'none';
    }
}

function applyTruckConfig(config) {
    try {
        // Set number of axles
        document.getElementById('numAxles').value = config.num_axles;
        
        // Create axle inputs
        createAxleInputs();
        
        // Set axle loads
        const axleLoads = document.querySelectorAll('.axle-load');
        config.axle_loads.forEach((load, i) => {
            if (i < axleLoads.length) {
                axleLoads[i].value = load;
            }
        });
        
        // Set axle spacings
        const axleSpacings = document.querySelectorAll('.axle-spacing');
        config.axle_spacings.forEach((spacing, i) => {
            if (i < axleSpacings.length) {
                axleSpacings[i].value = spacing;
            }
        });
        
        // Set total load if it exists
        if (document.getElementById('totalLoad') && config.total_load) {
            document.getElementById('totalLoad').value = config.total_load;
        }
        
        // Set number of trucks and spacing
        document.getElementById('numTrucks').value = config.num_trucks;
        
        const truckSpacing = document.getElementById('truckSpacing');
        if (config.num_trucks > 1) {
            truckSpacing.disabled = false;
            truckSpacing.value = config.truck_spacing;
        } else {
            truckSpacing.disabled = true;
        }
        
        alert(`Đã áp dụng cấu hình xe tải: ${config.name}`);
    } catch (error) {
        alert(`Không thể áp dụng cấu hình xe tải: ${error.message}`);
        console.error(error);
    }
}

function editSelectedConfig() {
    const selectedRow = document.querySelector('#configTable tbody tr.selected');
    if (!selectedRow) {
        alert('Vui lòng chọn một cấu hình để chỉnh sửa!');
        return;
    }
    
    const configIndex = parseInt(selectedRow.dataset.index);
    const configs = JSON.parse(localStorage.getItem('truckConfigs') || '[]');
    
    if (configIndex >= 0 && configIndex < configs.length) {
        // Load the config
        applyTruckConfig(configs[configIndex]);
        
        // Close the modal
        document.getElementById('configModal').style.display = 'none';
        
        // Prompt user to make changes and save
        setTimeout(() => {
            if (confirm('Thực hiện các thay đổi cần thiết và nhấn OK để lưu lại.')) {
                // Delete the old config
                configs.splice(configIndex, 1);
                localStorage.setItem('truckConfigs', JSON.stringify(configs));
                
                // Save as a new config with the same name
                const newConfig = collectTruckConfigData();
                if (newConfig) {
                    newConfig.name = configs[configIndex].name;
                    newConfig.saved_date = new Date().toISOString();
                    
                    configs.push(newConfig);
                    localStorage.setItem('truckConfigs', JSON.stringify(configs));
                    
                    alert(`Đã cập nhật cấu hình xe tải: ${newConfig.name}`);
                }
            }
        }, 500);
    }
}

function deleteSelectedConfig() {
    const selectedRow = document.querySelector('#configTable tbody tr.selected');
    if (!selectedRow) {
        alert('Vui lòng chọn một cấu hình để xóa!');
        return;
    }
    
    const configIndex = parseInt(selectedRow.dataset.index);
    const configs = JSON.parse(localStorage.getItem('truckConfigs') || '[]');
    
    if (configIndex >= 0 && configIndex < configs.length) {
        const configName = configs[configIndex].name;
        
        if (confirm(`Bạn có chắc chắn muốn xóa cấu hình '${configName}'?`)) {
            configs.splice(configIndex, 1);
            localStorage.setItem('truckConfigs', JSON.stringify(configs));
            refreshConfigList();
            alert(`Đã xóa cấu hình '${configName}'`);
        }
    }
}