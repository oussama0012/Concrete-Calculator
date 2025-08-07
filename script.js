document.addEventListener('DOMContentLoaded', () => {
    const projectType = document.getElementById('projectType');
    const lengthInput = document.getElementById('length');
    const widthInput = document.getElementById('width');
    const thicknessInput = document.getElementById('thickness');
    const wasteInput = document.getElementById('waste');
    const calculateBtn = document.getElementById('calculateBtn');
    const resultSection = document.getElementById('resultSection');
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    const volumeInfo = document.getElementById('volumeInfo');
    const materialsInfo = document.getElementById('materialsInfo');
    const costInfo = document.getElementById('costInfo');
    const projectInfo = document.getElementById('projectInfo');

    let currentCalculationData = null; // Store current calculation data for export
    let isAdvancedMode = false; // Track current mode
    let calculationHistory = JSON.parse(localStorage.getItem('concreteCalculatorHistory')) || [];
    let materialsChart = null;
    let costsChart = null;
    let rotationAngle = 0;

    // Tab switching functionality
    function initTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.getAttribute('data-tab');
                
                // Remove active class from all tabs and contents
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                btn.classList.add('active');
                document.getElementById(`${targetTab}-tab`).classList.add('active');
                
                // Update mode
                isAdvancedMode = targetTab === 'advanced';
                updateFieldVisibility();
            });
        });
        
        // Result tabs
        const resultTabBtns = document.querySelectorAll('.result-tab-btn');
        const resultTabContents = document.querySelectorAll('.result-tab-content');

        resultTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.getAttribute('data-tab');
                
                resultTabBtns.forEach(b => b.classList.remove('active'));
                resultTabContents.forEach(c => c.classList.remove('active'));
                
                btn.classList.add('active');
                document.getElementById(`${targetTab}-result`).classList.add('active');
                
                if (targetTab === 'visualization' && currentCalculationData) {
                    draw3DVisualization();
                }
            });
        });
    }

    // Field visibility management
    function updateFieldVisibility() {
        const mode = isAdvancedMode ? 'Adv' : '';
        const toggles = {
            [`includeLength${mode}`]: [`length${mode}`],
            [`includeWidth${mode}`]: [`width${mode}`],
            [`includeThickness${mode}`]: [`thickness${mode}`],
            [`includeWaste${mode}`]: [`waste${mode}`]
        };

        if (isAdvancedMode) {
            toggles[`includeStrength`] = ['concreteStrength'];
            toggles[`includeReinforcement`] = ['reinforcement'];
            toggles[`includeLaborRate`] = ['laborRate'];
            toggles[`includeCementPrice`] = ['cementPrice'];
        }

        Object.entries(toggles).forEach(([toggleId, fieldIds]) => {
            const toggle = document.getElementById(toggleId);
            if (toggle) {
                fieldIds.forEach(fieldId => {
                    const fieldGroup = document.querySelector(`label[for="${fieldId}"]`)?.parentElement;
                    if (fieldGroup) {
                        if (toggle.checked) {
                            fieldGroup.classList.remove('disabled');
                        } else {
                            fieldGroup.classList.add('disabled');
                        }
                    }
                });
            }
        });
    }

    // Add event listeners for field toggles
    function initFieldToggles() {
        const toggles = document.querySelectorAll('.toggle-item input[type="checkbox"]');
        toggles.forEach(toggle => {
            toggle.addEventListener('change', updateFieldVisibility);
        });
    }

    // Dark mode functionality
    function initDarkMode() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    function toggleDarkMode() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }

    // Initialize dark mode
    initDarkMode();

    // Dark mode toggle event listener
    darkModeToggle.addEventListener('click', toggleDarkMode);

    // Function to show toast notification
    function showToast(message, type = 'error') {
        // Remove any existing toast
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) {
            existingToast.remove();
        }
        
        // Create new toast
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        
        // Change color based on type
        if (type === 'success') {
            toast.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        }
        
        toast.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                ${type === 'success' ? 
                    '<polyline points="20 6 9 17 4 12"></polyline>' : 
                    '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'
                }
            </svg>
            ${message}
        `;
        
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Hide toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    // Enhanced calculation function with dynamic tips
    function calculateConcrete() {
        const inputs = getCurrentInputs();
        
        // Validation: check if inputs object is properly constructed
        if (!inputs || !inputs.projectType) {
            showToast('Error: Could not access form inputs. Please refresh the page.');
            return;
        }
        
        const length = inputs.includeLength && inputs.includeLength.checked ? parseFloat(inputs.length.value) : 1;
        const width = inputs.includeWidth && inputs.includeWidth.checked ? parseFloat(inputs.width.value) : 1;
        const thickness = inputs.includeThickness && inputs.includeThickness.checked ? parseFloat(inputs.thickness.value) : 4;
        const wasteFactor = inputs.includeWaste && inputs.includeWaste.checked ? parseFloat(inputs.waste.value) || 10 : 0;
        const units = inputs.units ? inputs.units.value : 'imperial';
        const projectTypeValue = inputs.projectType.value;

        // Advanced mode values with toggle checks
        const concreteStrength = isAdvancedMode && inputs.includeStrength && inputs.includeStrength.checked ? 
            parseInt(inputs.concreteStrength.value) : 3000;
        const reinforcement = isAdvancedMode && inputs.includeReinforcement && inputs.includeReinforcement.checked ? 
            inputs.reinforcement.value : 'none';
        const laborRate = isAdvancedMode && inputs.includeLaborRate && inputs.includeLaborRate.checked ? 
            parseFloat(inputs.laborRate.value) || 75 : 75;
        const cementPrice = isAdvancedMode && inputs.includeCementPrice && inputs.includeCementPrice.checked ? 
            parseFloat(inputs.cementPrice.value) || 4.50 : 4.50;
        const additives = isAdvancedMode && inputs.additives ? inputs.additives.value || 'none' : 'none';
        const finishType = isAdvancedMode && inputs.finishType ? inputs.finishType.value || 'broom' : 'broom';

        // Enhanced validation
        const requiredFields = [
            { value: length, name: 'length', enabled: !inputs.includeLength || inputs.includeLength.checked },
            { value: width, name: 'width', enabled: !inputs.includeWidth || inputs.includeWidth.checked },
            { value: thickness, name: 'thickness', enabled: !inputs.includeThickness || inputs.includeThickness.checked }
        ];

        const invalidFields = requiredFields.filter(field => 
            field.enabled && (!field.value || field.value <= 0 || isNaN(field.value))
        );

        if (invalidFields.length > 0) {
            showToast(`Please enter valid values for: ${invalidFields.map(f => f.name).join(', ')}`);
            return;
        }

        let volume = 0;
        let surfaceArea = 0;

        // Calculate volume based on project type with correct formulas
        if (units === 'imperial') {
            // Imperial calculations (length and width in feet, thickness in inches)
            const thicknessFeet = thickness / 12;
            
            switch (projectTypeValue) {
                case 'slab':
                case 'footing':
                case 'driveway':
                case 'patio':
                case 'sidewalk':
                    volume = length * width * thicknessFeet;
                    surfaceArea = length * width;
                    break;
                case 'column':
                    // Circular column: width is diameter
                    const radius = width / 2;
                    volume = Math.PI * radius * radius * length;
                    surfaceArea = Math.PI * width * width / 4;
                    break;
                case 'beam':
                    volume = length * width * thicknessFeet;
                    surfaceArea = length * width;
                    break;
                case 'wall':
                    // For walls: length is length, width is height, thickness is wall thickness
                    volume = length * width * thicknessFeet;
                    surfaceArea = length * width;
                    break;
                case 'foundation':
                    // Foundation with footing
                    const foundationVolume = length * width * thicknessFeet;
                    const footingVolume = length * width * (thicknessFeet * 0.5); // Footing is typically 50% more depth
                    volume = foundationVolume + footingVolume;
                    surfaceArea = length * width;
                    break;
                case 'stairs':
                    // Stairs calculation: length = number of steps, width = width of stairs, thickness = tread thickness
                    const numberOfSteps = Math.floor(length);
                    const stepWidth = width;
                    const treadThickness = thicknessFeet;
                    const riserHeight = 7 / 12; // 7 inches converted to feet
                    const stepDepth = 11 / 12; // 11 inches converted to feet
                    
                    // Calculate volume of all treads and risers
                    const treadVolume = numberOfSteps * stepWidth * stepDepth * treadThickness;
                    const riserVolume = numberOfSteps * stepWidth * riserHeight * (4 / 12); // 4 inch thick risers
                    volume = treadVolume + riserVolume;
                    surfaceArea = numberOfSteps * stepWidth * stepDepth;
                    break;
                case 'pool':
                    // Pool calculation: rectangular pool with sloped bottom
                    const poolDepth = thickness / 12; // thickness as depth in feet
                    volume = length * width * poolDepth * 0.85; // 85% factor for typical pool shape
                    surfaceArea = length * width;
                    break;
                case 'curb':
                    // Curb and gutter: trapezoidal cross-section
                    const curbHeight = 6 / 12; // 6 inches height
                    const curbWidth = width / 12; // width in feet
                    const gutterWidth = thickness / 12; // gutter width
                    volume = length * ((curbHeight * curbWidth) + (0.25 * gutterWidth)); // 3 inch thick gutter
                    surfaceArea = length * (curbWidth + gutterWidth);
                    break;
                case 'culvert':
                    // Circular culvert: width is diameter
                    const culvertRadius = width / 2;
                    const wallThickness = thickness / 12;
                    const outerRadius = culvertRadius + wallThickness;
                    volume = Math.PI * length * (outerRadius * outerRadius - culvertRadius * culvertRadius);
                    surfaceArea = Math.PI * width * length;
                    break;
                case 'bridge':
                    // Bridge deck with reinforcement considerations
                    volume = length * width * thicknessFeet * 1.1; // 10% extra for reinforcement displacement
                    surfaceArea = length * width;
                    break;
            }
        } else {
            // Metric calculations (length and width in meters, thickness in centimeters)
            const thicknessMeters = thickness / 100;
            
            switch (projectTypeValue) {
                case 'slab':
                case 'footing':
                case 'driveway':
                case 'patio':
                case 'sidewalk':
                    volume = length * width * thicknessMeters;
                    surfaceArea = length * width;
                    break;
                case 'column':
                    const radius = width / 2;
                    volume = Math.PI * radius * radius * length;
                    surfaceArea = Math.PI * width * width / 4;
                    break;
                case 'beam':
                    volume = length * width * thicknessMeters;
                    surfaceArea = length * width;
                    break;
                case 'wall':
                    volume = length * width * thicknessMeters;
                    surfaceArea = length * width;
                    break;
                case 'foundation':
                    const foundationVolume = length * width * thicknessMeters;
                    const footingVolume = length * width * (thicknessMeters * 0.5);
                    volume = foundationVolume + footingVolume;
                    surfaceArea = length * width;
                    break;
                case 'stairs':
                    const numberOfSteps = Math.floor(length);
                    const stepWidth = width;
                    const treadThickness = thicknessMeters;
                    const riserHeight = 0.18; // 18 cm
                    const stepDepth = 0.28; // 28 cm
                    
                    const treadVolume = numberOfSteps * stepWidth * stepDepth * treadThickness;
                    const riserVolume = numberOfSteps * stepWidth * riserHeight * 0.1; // 10 cm thick risers
                    volume = treadVolume + riserVolume;
                    surfaceArea = numberOfSteps * stepWidth * stepDepth;
                    break;
                case 'pool':
                    const poolDepth = thicknessMeters;
                    volume = length * width * poolDepth * 0.85;
                    surfaceArea = length * width;
                    break;
                case 'curb':
                    const curbHeight = 0.15; // 15 cm
                    const curbWidth = width / 100;
                    const gutterWidth = thickness / 100;
                    volume = length * ((curbHeight * curbWidth) + (0.08 * gutterWidth)); // 8 cm thick gutter
                    surfaceArea = length * (curbWidth + gutterWidth);
                    break;
                case 'culvert':
                    const culvertRadius = width / 2;
                    const wallThickness = thicknessMeters;
                    const outerRadius = culvertRadius + wallThickness;
                    volume = Math.PI * length * (outerRadius * outerRadius - culvertRadius * culvertRadius);
                    surfaceArea = Math.PI * width * length;
                    break;
                case 'bridge':
                    volume = length * width * thicknessMeters * 1.1;
                    surfaceArea = length * width;
                    break;
            }
        }

        // Apply waste factor
        const volumeWithWaste = volume * (1 + wasteFactor / 100);

        // Convert volumes for display
        let volumeCubicYards, volumeCubicFeet, volumeCubicMeters;
        
        if (units === 'imperial') {
            volumeCubicFeet = volumeWithWaste;
            volumeCubicYards = volumeWithWaste / 27;
            volumeCubicMeters = volumeWithWaste * 0.0283168;
        } else {
            volumeCubicMeters = volumeWithWaste;
            volumeCubicFeet = volumeWithWaste * 35.3147;
            volumeCubicYards = volumeCubicFeet / 27;
        }

        // Material calculations (standardized to cubic yards for consistency)
        const strengthMultiplier = concreteStrength >= 4000 ? 1.2 : concreteStrength >= 3500 ? 1.1 : 1.0;
        
        // Standard concrete mix ratios (per cubic yard)
        const cementBags = Math.ceil(volumeCubicYards * 5.5 * strengthMultiplier); // 5.5 bags per cubic yard for 3000 PSI
        const sandTons = Math.round(volumeCubicYards * 0.5 * 100) / 100; // 0.5 tons per cubic yard
        const gravelTons = Math.round(volumeCubicYards * 0.8 * 100) / 100; // 0.8 tons per cubic yard
        const waterGallons = Math.round(volumeCubicYards * 35); // 35 gallons per cubic yard

        // Reinforcement costs
        let reinforcementCost = 0;
        switch (reinforcement) {
            case 'rebar':
                reinforcementCost = surfaceArea * 0.85; // $0.85 per sq ft for rebar
                break;
            case 'mesh':
                reinforcementCost = surfaceArea * 0.55; // $0.55 per sq ft for wire mesh
                break;
            case 'fiber':
                reinforcementCost = volumeCubicYards * 35; // $35 per cubic yard for fiber reinforcement
                break;
        }

        // Additives cost
        let additivesCost = 0;
        switch (additives) {
            case 'accelerator':
                additivesCost = volumeCubicYards * 18;
                break;
            case 'retarder':
                additivesCost = volumeCubicYards * 15;
                break;
            case 'plasticizer':
                additivesCost = volumeCubicYards * 12;
                break;
            case 'waterproof':
                additivesCost = volumeCubicYards * 25;
                break;
        }

        // Finish cost multiplier
        const finishMultiplier = {
            'broom': 1.0,
            'smooth': 1.15,
            'stamped': 2.0,
            'exposed': 1.6,
            'polished': 2.5
        }[finishType] || 1.0;

        // Cost calculations
        const cementCost = cementBags * cementPrice;
        const sandCost = sandTons * 35; // $35 per ton
        const gravelCost = gravelTons * 40; // $40 per ton
        const baseLaborCost = volumeCubicYards * 125; // $125 base per cubic yard
        const laborCost = baseLaborCost * (laborRate / 75) * finishMultiplier; // Adjusted for custom labor rate and finish
        const totalCost = cementCost + sandCost + gravelCost + laborCost + reinforcementCost + additivesCost;

        // Store enhanced calculation data
        currentCalculationData = {
            mode: isAdvancedMode ? 'advanced' : 'normal',
            projectType: projectTypeValue,
            dimensions: { length, width, thickness, units },
            volume: {
                cubicFeet: Math.round(volumeCubicFeet * 100) / 100,
                cubicYards: Math.round(volumeCubicYards * 100) / 100,
                cubicMeters: Math.round(volumeCubicMeters * 100) / 100
            },
            materials: { cementBags, sandTons, gravelTons, waterGallons },
            costs: {
                cement: Math.round(cementCost * 100) / 100,
                sand: Math.round(sandCost * 100) / 100,
                gravel: Math.round(gravelCost * 100) / 100,
                labor: Math.round(laborCost * 100) / 100,
                reinforcement: Math.round(reinforcementCost * 100) / 100,
                additives: Math.round(additivesCost * 100) / 100,
                total: Math.round(totalCost * 100) / 100
            },
            wasteFactor,
            surfaceArea: Math.round(surfaceArea * 100) / 100,
            concreteStrength,
            reinforcement,
            additives,
            finishType,
            laborRate,
            cementPrice,
            calculatedAt: new Date().toISOString(),
            enabledFields: {
                length: !inputs.includeLength || inputs.includeLength.checked,
                width: !inputs.includeWidth || inputs.includeWidth.checked,
                thickness: !inputs.includeThickness || inputs.includeThickness.checked,
                waste: !inputs.includeWaste || inputs.includeWaste.checked
            }
        };

        // Add to history
        addToHistory(currentCalculationData);

        // Update all result displays
        updateResultDisplays();
        updateCharts();
        generateDynamicTips();
        draw3DVisualization();

        // Show result section
        resultSection.style.display = 'block';
        resultSection.scrollIntoView({ behavior: 'smooth' });

        showToast('Concrete calculation completed successfully!', 'success');
    }

    // Enhanced input gathering function
    function getCurrentInputs() {
        if (isAdvancedMode) {
            return {
                projectType: document.getElementById('projectTypeAdv'),
                length: document.getElementById('lengthAdv'),
                width: document.getElementById('widthAdv'),
                thickness: document.getElementById('thicknessAdv'),
                waste: document.getElementById('wasteAdv'),
                units: document.querySelector('input[name="unitsAdv"]:checked'),
                concreteStrength: document.getElementById('concreteStrength'),
                reinforcement: document.getElementById('reinforcement'),
                laborRate: document.getElementById('laborRate'),
                cementPrice: document.getElementById('cementPrice'),
                additives: document.getElementById('additives'),
                finishType: document.getElementById('finishType'),
                includeLength: document.getElementById('includeLengthAdv'),
                includeWidth: document.getElementById('includeWidthAdv'),
                includeThickness: document.getElementById('includeThicknessAdv'),
                includeWaste: document.getElementById('includeWasteAdv'),
                includeStrength: document.getElementById('includeStrength'),
                includeReinforcement: document.getElementById('includeReinforcement'),
                includeLaborRate: document.getElementById('includeLaborRate'),
                includeCementPrice: document.getElementById('includeCementPrice')
            };
        } else {
            return {
                projectType: document.getElementById('projectType'),
                length: document.getElementById('length'),
                width: document.getElementById('width'),
                thickness: document.getElementById('thickness'),
                waste: document.getElementById('waste'),
                units: document.querySelector('input[name="units"]:checked'),
                includeLength: document.getElementById('includeLength'),
                includeWidth: document.getElementById('includeWidth'),
                includeThickness: document.getElementById('includeThickness'),
                includeWaste: document.getElementById('includeWaste')
            };
        }
    }

    // Update all result displays
    function updateResultDisplays() {
        if (!currentCalculationData) return;

        const data = currentCalculationData;

        // Summary tab
        volumeInfo.innerHTML = `
            <strong>Volume:</strong> ${data.volume.cubicYards} cubic yards<br>
            <strong>Volume:</strong> ${data.volume.cubicFeet} cubic feet<br>
            <strong>Surface Area:</strong> ${data.surfaceArea} sq ft
        `;

        materialsInfo.innerHTML = `
            <strong>Cement:</strong> ${data.materials.cementBags} bags (94 lb each)<br>
            <strong>Sand:</strong> ${data.materials.sandTons} tons<br>
            <strong>Gravel:</strong> ${data.materials.gravelTons} tons<br>
            <strong>Water:</strong> ${data.materials.waterGallons} gallons
            ${data.reinforcement !== 'none' ? `<br><strong>Reinforcement:</strong> ${data.reinforcement.charAt(0).toUpperCase() + data.reinforcement.slice(1)}` : ''}
        `;

        const materialsCost = data.costs.cement + data.costs.sand + data.costs.gravel + data.costs.reinforcement;
        costInfo.innerHTML = `
            <strong>Materials:</strong> $${Math.round(materialsCost * 100) / 100}<br>
            <strong>Labor (est):</strong> $${Math.round(data.costs.labor * 100) / 100}<br>
            <strong>Total (est):</strong> $${Math.round(data.costs.total * 100) / 100}
            ${data.costs.additives > 0 ? `<br><strong>Additives:</strong> $${Math.round(data.costs.additives * 100) / 100}` : ''}
        `;

        projectInfo.innerHTML = `
            <strong>Project:</strong> ${data.projectType.charAt(0).toUpperCase() + data.projectType.slice(1)}<br>
            <strong>Waste Factor:</strong> ${data.wasteFactor}%<br>
            <strong>Strength:</strong> ${data.concreteStrength} PSI<br>
            <strong>Finish:</strong> ${data.finishType.charAt(0).toUpperCase() + data.finishType.slice(1)}
        `;

        // Materials tab
        document.getElementById('cementAmount').textContent = `${data.materials.cementBags} bags`;
        document.getElementById('cementCost').textContent = `$${Math.round(data.costs.cement * 100) / 100}`;
        document.getElementById('sandAmount').textContent = `${data.materials.sandTons} tons`;
        document.getElementById('sandCost').textContent = `$${Math.round(data.costs.sand * 100) / 100}`;
        document.getElementById('gravelAmount').textContent = `${data.materials.gravelTons} tons`;
        document.getElementById('gravelCost').textContent = `$${Math.round(data.costs.gravel * 100) / 100}`;
        document.getElementById('waterAmount').textContent = `${data.materials.waterGallons} gal`;

        // Costs tab - regional comparison
        const baseTotal = data.costs.total;
        document.getElementById('nationalCost').textContent = `$${Math.round(baseTotal * 100) / 100}`;
        document.getElementById('westCost').textContent = `$${Math.round(baseTotal * 1.3 * 100) / 100}`;
        document.getElementById('eastCost').textContent = `$${Math.round(baseTotal * 1.2 * 100) / 100}`;
        document.getElementById('midwestCost').textContent = `$${Math.round(baseTotal * 0.9 * 100) / 100}`;

        // Visualization tab
        document.getElementById('dimLength').textContent = `${data.dimensions.length} ft`;
        document.getElementById('dimWidth').textContent = `${data.dimensions.width} ft`;
        document.getElementById('dimThickness').textContent = `${data.dimensions.thickness} in`;
        document.getElementById('dimVolume').textContent = `${data.volume.cubicYards} yd³`;
    }

    // Chart creation and updates
    function updateCharts() {
        if (!currentCalculationData) return;

        const data = currentCalculationData;

        // Destroy existing charts
        if (materialsChart) {
            materialsChart.destroy();
        }
        if (costsChart) {
            costsChart.destroy();
        }

        // Materials chart
        const materialsCtx = document.getElementById('materialsChart').getContext('2d');
        materialsChart = new Chart(materialsCtx, {
            type: 'doughnut',
            data: {
                labels: ['Cement', 'Sand', 'Gravel', 'Water'],
                datasets: [{
                    data: [
                        data.materials.cementBags,
                        data.materials.sandTons * 2,
                        data.materials.gravelTons * 2,
                        data.materials.waterGallons / 10
                    ],
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#06b6d4'],
                    borderWidth: 0,
                    cutout: '55%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                size: 9
                            },
                            padding: 8,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            boxWidth: 8
                        }
                    }
                }
            }
        });

        // Costs chart
        const costsCtx = document.getElementById('costsChart').getContext('2d');
        costsChart = new Chart(costsCtx, {
            type: 'bar',
            data: {
                labels: ['Materials', 'Labor', 'Rebar', 'Add.'],
                datasets: [{
                    data: [
                        data.costs.cement + data.costs.sand + data.costs.gravel,
                        data.costs.labor,
                        data.costs.reinforcement,
                        data.costs.additives
                    ],
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
                    borderRadius: 4,
                    borderWidth: 0,
                    barThickness: 20
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.2,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + Math.round(value);
                            },
                            font: {
                                size: 8
                            },
                            maxTicksLimit: 5
                        },
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                size: 8
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // 3D Visualization
    function draw3DVisualization() {
        if (!currentCalculationData) return;

        const canvas = document.getElementById('threeDView');
        const ctx = canvas.getContext('2d');
        const data = currentCalculationData;

        // Set canvas size to fit container
        const container = canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = Math.min(400, window.innerHeight * 0.4);
        
        canvas.width = containerWidth;
        canvas.height = containerHeight;
        canvas.style.width = containerWidth + 'px';
        canvas.style.height = containerHeight + 'px';

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Set up 3D projection parameters
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const scale = Math.min(canvas.width, canvas.height) / 10;

        // Calculate dimensions for display (scaled for visibility)
        const length = Math.max(data.dimensions.length / 10, 1);
        const width = Math.max(data.dimensions.width / 10, 1);
        const height = Math.max(data.dimensions.thickness / 50, 0.2); // thickness in inches to feet

        // Apply rotation
        const cos = Math.cos(rotationAngle);
        const sin = Math.sin(rotationAngle);

        // Define cube vertices
        const vertices = [
            [-length/2, -width/2, -height/2],
            [length/2, -width/2, -height/2],
            [length/2, width/2, -height/2],
            [-length/2, width/2, -height/2],
            [-length/2, -width/2, height/2],
            [length/2, -width/2, height/2],
            [length/2, width/2, height/2],
            [-length/2, width/2, height/2]
        ];

        // Rotate and project vertices
        const projectedVertices = vertices.map(([x, y, z]) => {
            // Rotate around Y axis
            const rotatedX = x * cos - z * sin;
            const rotatedZ = x * sin + z * cos;
            
            // Simple orthographic projection
            return [
                centerX + rotatedX * scale,
                centerY + y * scale,
                rotatedZ
            ];
        });

        // Define faces (indices of vertices)
        const faces = [
            [0, 1, 2, 3], // bottom
            [4, 7, 6, 5], // top
            [0, 4, 5, 1], // front
            [2, 6, 7, 3], // back
            [1, 5, 6, 2], // right
            [0, 3, 7, 4]  // left
        ];

        // Colors for different faces
        const faceColors = [
            'rgba(59, 130, 246, 0.8)', // bottom - blue
            'rgba(59, 130, 246, 1)',   // top - darker blue
            'rgba(59, 130, 246, 0.9)', // front
            'rgba(59, 130, 246, 0.7)', // back
            'rgba(59, 130, 246, 0.85)', // right
            'rgba(59, 130, 246, 0.75)'  // left
        ];

        // Sort faces by average Z coordinate for proper depth ordering
        const facesWithDepth = faces.map((face, index) => ({
            face,
            color: faceColors[index],
            avgZ: face.reduce((sum, vertexIndex) => sum + projectedVertices[vertexIndex][2], 0) / face.length
        })).sort((a, b) => a.avgZ - b.avgZ);

        // Draw faces
        facesWithDepth.forEach(({ face, color }) => {
            ctx.fillStyle = color;
            ctx.strokeStyle = 'rgb(37, 99, 235)';
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            const [startX, startY] = projectedVertices[face[0]];
            ctx.moveTo(startX, startY);
            
            face.forEach(vertexIndex => {
                const [x, y] = projectedVertices[vertexIndex];
                ctx.lineTo(x, y);
            });
            
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        });

        // Add dimension labels
        ctx.fillStyle = 'rgb(37, 99, 235)';
        ctx.font = 'bold 14px Inter';
        ctx.textAlign = 'center';
        
        // Length label
        ctx.fillText(`${data.dimensions.length}'`, centerX, canvas.height - 20);
        
        // Width label (rotated)
        ctx.save();
        ctx.translate(30, centerY);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(`${data.dimensions.width}'`, 0, 0);
        ctx.restore();
        
        // Height label
        ctx.fillText(`${data.dimensions.thickness}"`, canvas.width - 40, centerY);
    }

    // History management
    function addToHistory(calculationData) {
        const historyItem = {
            id: Date.now(),
            ...calculationData,
            name: `${calculationData.projectType} - ${calculationData.dimensions.length}x${calculationData.dimensions.width}x${calculationData.dimensions.thickness}`
        };
        
        calculationHistory.unshift(historyItem);
        
        // Keep only last 20 calculations
        if (calculationHistory.length > 20) {
            calculationHistory = calculationHistory.slice(0, 20);
        }
        
        localStorage.setItem('concreteCalculatorHistory', JSON.stringify(calculationHistory));
        updateHistoryDisplay();
    }

    function updateHistoryDisplay() {
        const historyList = document.getElementById('historyList');
        
        if (calculationHistory.length === 0) {
            historyList.innerHTML = '<p style="text-align: center; color: var(--text-primary); opacity: 0.7;">No calculations yet. Start by calculating your first project!</p>';
            return;
        }
        
        historyList.innerHTML = calculationHistory.map(item => `
            <div class="history-item" data-id="${item.id}">
                <div class="history-info">
                    <div class="history-project">${item.name}</div>
                    <div class="history-details">
                        ${item.volume.cubicYards} yd³ • $${Math.round(item.costs.total)} • ${new Date(item.calculatedAt).toLocaleDateString()}
                    </div>
                </div>
                <div class="history-actions">
                    <button class="history-btn" onclick="loadFromHistory(${item.id})" title="Load">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2 2 2 0 000 4zm0 0h18"/>
                        </svg>
                    </button>
                    <button class="history-btn" onclick="deleteFromHistory(${item.id})" title="Delete">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="m19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Global functions for history management
    window.loadFromHistory = function(id) {
        const item = calculationHistory.find(h => h.id === id);
        if (!item) return;
        
        // Switch to appropriate mode
        if (item.mode === 'advanced' && !isAdvancedMode) {
            document.querySelector('[data-tab="advanced"]').click();
        } else if (item.mode === 'normal' && isAdvancedMode) {
            document.querySelector('[data-tab="normal"]').click();
        }
        
        // Wait for mode switch, then populate fields
        setTimeout(() => {
            const inputs = getCurrentInputs();
            
            if (inputs.projectType) inputs.projectType.value = item.projectType;
            if (inputs.length) inputs.length.value = item.dimensions.length;
            if (inputs.width) inputs.width.value = item.dimensions.width;
            if (inputs.thickness) inputs.thickness.value = item.dimensions.thickness;
            if (inputs.waste) inputs.waste.value = item.wasteFactor;
            
            if (item.mode === 'advanced') {
                if (inputs.concreteStrength) inputs.concreteStrength.value = item.concreteStrength;
                if (inputs.reinforcement) inputs.reinforcement.value = item.reinforcement;
                if (inputs.laborRate) inputs.laborRate.value = item.laborRate;
                if (inputs.cementPrice) inputs.cementPrice.value = item.cementPrice;
                if (inputs.additives) inputs.additives.value = item.additives;
                if (inputs.finishType) inputs.finishType.value = item.finishType;
            }
            
            // Set field toggles if available
            if (item.enabledFields) {
                Object.entries(item.enabledFields).forEach(([field, enabled]) => {
                    const toggle = document.getElementById(`include${field.charAt(0).toUpperCase() + field.slice(1)}${item.mode === 'advanced' ? 'Adv' : ''}`);
                    if (toggle) toggle.checked = enabled;
                });
            }
            
            updateFieldVisibility();
            showToast('Project loaded from history!', 'success');
        }, 100);
    };

    window.deleteFromHistory = function(id) {
        calculationHistory = calculationHistory.filter(h => h.id !== id);
        localStorage.setItem('concreteCalculatorHistory', JSON.stringify(calculationHistory));
        updateHistoryDisplay();
        showToast('Calculation deleted from history!', 'success');
    };

    // Dynamic tips generation
    function generateDynamicTips() {
        if (!currentCalculationData) return;
        
        const data = currentCalculationData;
        const tips = [];
        
        // Volume-based tips
        if (data.volume.cubicYards > 10) {
            tips.push({
                title: "Large Pour Consideration",
                content: "For pours over 10 cubic yards, consider having concrete delivered in multiple trucks to maintain workability time."
            });
        }
        
        // Weather tips
        const currentMonth = new Date().getMonth();
        if (currentMonth >= 11 || currentMonth <= 2) {
            tips.push({
                title: "Cold Weather Precautions",
                content: "Winter concrete work requires special attention. Consider using accelerators and protect from freezing for at least 24 hours."
            });
        } else if (currentMonth >= 5 && currentMonth <= 8) {
            tips.push({
                title: "Hot Weather Guidelines",
                content: "Summer pours should be scheduled for early morning or evening. Consider retarders to extend working time."
            });
        }
        
        // Strength-based tips
        if (data.concreteStrength >= 4000) {
            tips.push({
                title: "High-Strength Concrete",
                content: "High-strength mixes require careful curing. Keep moist for at least 7 days for optimal strength development."
            });
        }
        
        // Project-specific tips
        switch (data.projectType) {
            case 'driveway':
                tips.push({
                    title: "Driveway Best Practices",
                    content: "Include control joints every 8-10 feet and ensure proper drainage with a 2% slope away from structures."
                });
                break;
            case 'pool':
                tips.push({
                    title: "Pool Construction",
                    content: "Pool concrete should be steel reinforced and waterproofed. Consider hiring specialized pool contractors."
                });
                break;
            case 'stairs':
                tips.push({
                    title: "Stair Safety",
                    content: "Stair treads should have a non-slip finish. Standard rise is 7-8 inches, run is 10-11 inches."
                });
                break;
        }
        
        // Cost-saving tips
        if (data.costs.total > 2000) {
            tips.push({
                title: "Cost Optimization",
                content: "For large projects, consider getting quotes from multiple suppliers. Bulk discounts can significantly reduce material costs."
            });
        }
        
        // Reinforcement tips
        if (data.reinforcement !== 'none') {
            tips.push({
                title: "Reinforcement Placement",
                content: "Ensure proper concrete cover over reinforcement (typically 2-3 inches) to prevent corrosion and maintain strength."
            });
        }
        
        // Update tips display
        const tipsContainer = document.getElementById('dynamicTips');
        tipsContainer.innerHTML = tips.map(tip => `
            <div class="tip-item">
                <div class="tip-title">${tip.title}</div>
                <div class="tip-content">${tip.content}</div>
            </div>
        `).join('');
    }

    // 3D visualization controls
    function init3DControls() {
        document.getElementById('rotateLeft').addEventListener('click', () => {
            rotationAngle -= Math.PI / 8;
            draw3DVisualization();
        });
        
        document.getElementById('rotateRight').addEventListener('click', () => {
            rotationAngle += Math.PI / 8;
            draw3DVisualization();
        });
        
        document.getElementById('resetView').addEventListener('click', () => {
            rotationAngle = 0;
            draw3DVisualization();
        });
    }

    // Enhanced export functionality
    function setupEnhancedExportButtons() {
        const exportJsonBtn = document.getElementById('exportJsonBtn');
        const exportTxtBtn = document.getElementById('exportTxtBtn');
        const copyAllBtn = document.getElementById('copyAllBtn');

        exportJsonBtn.addEventListener('click', () => {
            if (!currentCalculationData) {
                showToast('No data to export. Please perform a calculation first.');
                return;
            }

            const jsonData = JSON.stringify(currentCalculationData, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `concrete-calculation-${currentCalculationData.projectType}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('JSON file downloaded!', 'success');
        });

        exportTxtBtn.addEventListener('click', () => {
            if (!currentCalculationData) {
                showToast('No data to export. Please perform a calculation first.');
                return;
            }

            const data = currentCalculationData;
            const textData = `Concrete Calculation Report
=============================
Project Type: ${data.projectType.charAt(0).toUpperCase() + data.projectType.slice(1)}
Dimensions: ${data.dimensions.length} x ${data.dimensions.width} x ${data.dimensions.thickness} ${data.dimensions.units}
Waste Factor: ${data.wasteFactor}%

VOLUME REQUIRED:
- ${data.volume.cubicYards} cubic yards
- ${data.volume.cubicFeet} cubic feet
- ${data.volume.cubicMeters} cubic meters
- Surface Area: ${data.surfaceArea} sq ft

MATERIALS NEEDED:
- Cement: ${data.materials.cementBags} bags (94 lb each)
- Sand: ${data.materials.sandTons} tons
- Gravel: ${data.materials.gravelTons} tons
- Water: ${data.materials.waterGallons} gallons
${data.costs.reinforcement ? `<br>- Reinforcement: $${data.costs.reinforcement.toFixed(2)}` : ''}

COST ESTIMATE:
- Cement: $${data.costs.cement.toFixed(2)}
- Sand: $${data.costs.sand.toFixed(2)}
- Gravel: $${data.costs.gravel.toFixed(2)}
- Labor (estimated): $${data.costs.labor.toFixed(2)}
- Reinforcement: $${data.costs.reinforcement.toFixed(2)}
- Additives: $${data.costs.additives.toFixed(2)}
- TOTAL: $${data.costs.total.toFixed(2)}

Generated on: ${new Date(data.calculatedAt).toLocaleString()}
Note: Costs are estimates based on average US prices. Actual costs may vary by location.`;

            const blob = new Blob([textData], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `concrete-calculation-${data.projectType}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Text file downloaded!', 'success');
        });

        copyAllBtn.addEventListener('click', async () => {
            if (!currentCalculationData) {
                showToast('No data to copy. Please perform a calculation first.');
                return;
            }

            const data = currentCalculationData;
            const allText = `Project: ${data.projectType.charAt(0).toUpperCase() + data.projectType.slice(1)}
Dimensions: ${data.dimensions.length} x ${data.dimensions.width} x ${data.dimensions.thickness} ${data.dimensions.units}
Volume: ${data.volume.cubicYards} cubic yards
Materials: ${data.materials.cementBags} bags cement, ${data.materials.sandTons}t sand, ${data.materials.gravelTons}t gravel
Total Cost: $${data.costs.total.toFixed(2)}`;

            try {
                await navigator.clipboard.writeText(allText);
                showToast('All results copied to clipboard!', 'success');
            } catch (err) {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = allText;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                showToast('All results copied to clipboard!', 'success');
            }
        });

        // Save/Load project functionality
        document.getElementById('saveProjectBtn').addEventListener('click', () => {
            if (!currentCalculationData) {
                showToast('No data to save. Please perform a calculation first.');
                return;
            }
            
            const projectName = prompt('Enter project name:', `${currentCalculationData.projectType}-${Date.now()}`);
            if (!projectName) return;
            
            const projectData = {
                ...currentCalculationData,
                projectName,
                savedAt: new Date().toISOString()
            };
            
            const jsonData = JSON.stringify(projectData, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${projectName}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Project saved successfully!', 'success');
        });
        
        document.getElementById('loadProjectBtn').addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const projectData = JSON.parse(e.target.result);
                        window.loadFromHistory(projectData.id || Date.now());
                        showToast('Project loaded successfully!', 'success');
                    } catch (error) {
                        showToast('Invalid project file format.');
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        });
        
        // Clear history functionality
        document.getElementById('clearHistoryBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all calculation history?')) {
                calculationHistory = [];
                localStorage.removeItem('concreteCalculatorHistory');
                updateHistoryDisplay();
                showToast('History cleared!', 'success');
            }
        });
    }

    // Initialize all new functionality
    function initializeEnhancedFeatures() {
        initTabs();
        initFieldToggles();
        updateFieldVisibility();
        updateHistoryDisplay();
        init3DControls();
        setupEnhancedExportButtons();
        
        // Auto-save form data
        const autoSaveInputs = document.querySelectorAll('input, select');
        autoSaveInputs.forEach(input => {
            input.addEventListener('change', () => {
                const formData = {};
                autoSaveInputs.forEach(inp => {
                    if (inp.type === 'checkbox' || inp.type === 'radio') {
                        formData[inp.id] = inp.checked;
                    } else {
                        formData[inp.id] = inp.value;
                    }
                });
                localStorage.setItem('concreteCalculatorFormData', JSON.stringify(formData));
            });
        });
        
        // Restore form data on load
        const savedFormData = localStorage.getItem('concreteCalculatorFormData');
        if (savedFormData) {
            try {
                const formData = JSON.parse(savedFormData);
                Object.entries(formData).forEach(([id, value]) => {
                    const element = document.getElementById(id);
                    if (element) {
                        if (element.type === 'checkbox' || element.type === 'radio') {
                            element.checked = value;
                        } else {
                            element.value = value;
                        }
                    }
                });
                updateFieldVisibility();
            } catch (error) {
                console.log('Could not restore form data');
            }
        }
    }

    // Initialize all enhanced features
    initializeEnhancedFeatures();

    // Allow Enter key to trigger calculation on all relevant inputs
    function addEnterKeyListeners() {
        const normalInputs = [
            document.getElementById('length'),
            document.getElementById('width'),
            document.getElementById('thickness'),
            document.getElementById('waste')
        ];
        
        const advancedInputs = [
            document.getElementById('lengthAdv'),
            document.getElementById('widthAdv'),
            document.getElementById('thicknessAdv'),
            document.getElementById('wasteAdv'),
            document.getElementById('laborRate'),
            document.getElementById('cementPrice')
        ];

        [...normalInputs, ...advancedInputs].forEach(input => {
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        calculateConcrete();
                    }
                });
            }
        });
    }

    addEnterKeyListeners();

    // Update dimension labels based on project type for both modes
    function updateLabels(mode) {
        const projectTypeElement = mode === 'advanced' ? 
            document.getElementById('projectTypeAdv') : 
            document.getElementById('projectType');
            
        const suffix = mode === 'advanced' ? 'Adv' : '';
        
        const labels = {
            'slab': { length: 'Length (ft)', width: 'Width (ft)', thickness: 'Thickness (inches)' },
            'footing': { length: 'Length (ft)', width: 'Width (ft)', thickness: 'Depth (inches)' },
            'column': { length: 'Height (ft)', width: 'Diameter (ft)', thickness: 'Wall Thickness (inches)' },
            'beam': { length: 'Length (ft)', width: 'Width (ft)', thickness: 'Height (inches)' },
            'stairs': { length: 'Number of Steps', width: 'Width (ft)', thickness: 'Thickness (inches)' },
            'wall': { length: 'Length (ft)', width: 'Height (ft)', thickness: 'Thickness (inches)' },
            'driveway': { length: 'Length (ft)', width: 'Width (ft)', thickness: 'Thickness (inches)' },
            'foundation': { length: 'Length (ft)', width: 'Width (ft)', thickness: 'Depth (inches)' }
        };
        
        const selectedLabels = labels[projectTypeElement.value];
        document.querySelector(`label[for="length${suffix}"]`).textContent = selectedLabels.length;
        document.querySelector(`label[for="width${suffix}"]`).textContent = selectedLabels.width;
        document.querySelector(`label[for="thickness${suffix}"]`).textContent = selectedLabels.thickness;
    }

    // Add event listeners for both project type selectors
    document.getElementById('projectType').addEventListener('change', () => updateLabels('normal'));
    document.getElementById('projectTypeAdv').addEventListener('change', () => updateLabels('advanced'));

    // Copy functionality
    function setupCopyButtons() {
        const copyButtons = document.querySelectorAll('.copy-btn');
        copyButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const targetId = btn.getAttribute('data-target');
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    const textContent = targetElement.textContent || targetElement.innerText;
                    
                    try {
                        await navigator.clipboard.writeText(textContent);
                        showToast('Copied to clipboard!', 'success');
                    } catch (err) {
                        // Fallback for older browsers
                        const textArea = document.createElement('textarea');
                        textArea.value = textContent;
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                        showToast('Copied to clipboard!', 'success');
                    }
                }
            });
        });
    }

    // Initialize copy and export functionality
    setupCopyButtons();

    // Add calculate button event listener
    if (calculateBtn) {
        calculateBtn.addEventListener('click', calculateConcrete);
    } else {
        console.error('Calculate button not found');
    }
});