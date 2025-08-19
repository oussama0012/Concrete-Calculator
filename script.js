document.addEventListener('DOMContentLoaded', () => {
    const projectType = document.getElementById('projectType');
    const lengthInput = document.getElementById('length');
    const widthInput = document.getElementById('width');
    const thicknessInput = document.getElementById('thickness');
    const wasteInput = document.getElementById('waste');
    const calculateBtn = document.getElementById('calculateBtn');
    const resultSection = document.getElementById('resultSection');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const newCalcBtn = document.getElementById('newCalcBtn');
    
    const volumeInfo = document.getElementById('volumeInfo');
    const materialsInfo = document.getElementById('materialsInfo');
    const costInfo = document.getElementById('costInfo');
    const projectInfo = document.getElementById('projectInfo');

    let currentCalculationData = null; // Store current calculation data for export
    let isAdvancedMode = false; // Track current mode - changed to false by default
    let calculationHistory = JSON.parse(localStorage.getItem('concreteCalculatorHistory')) || [];
    let materialsChart = null;
    let costsChart = null;
    let rotationAngle = 0;
    // add enhanced 3D state
    let rotX = -0.35; // tilt up slightly
    let rotY = 0.6;   // rotate to show depth
    let zoom = 1;

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

    // Show modern popup modal for essential field warnings
    function showEssentialFieldWarning(fieldName) {
        // Remove any existing modal
        const existingModal = document.querySelector('.essential-field-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Get the actual field label based on current project type and mode
        const mode = isAdvancedMode ? 'Adv' : '';
        const projectTypeElement = mode ? document.getElementById('projectTypeAdv') : document.getElementById('projectType');
        const projectType = projectTypeElement ? projectTypeElement.value : 'slab';
        
        // Get field labels for current project type
        const fieldLabels = getFieldLabelsForProject(projectType);
        const actualFieldName = fieldLabels[fieldName.toLowerCase()] || fieldName;

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'essential-field-modal';
        modal.innerHTML = `
            <div class="essential-field-content">
                <div class="essential-field-header">
                    <div class="warning-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                    </div>
                    <h3>Essential Measurement Disabled</h3>
                    <button class="close-essential-modal">×</button>
                </div>
                <div class="essential-field-body">
                    <p>You've disabled <strong>${actualFieldName}</strong>, which is an essential measurement for concrete calculations.</p>
                    <div class="warning-details">
                        <h4>⚠️ Impact on Your Calculation:</h4>
                        <ul>
                            <li>Calculation accuracy will be significantly reduced</li>
                            <li>Material estimates may be incorrect</li>
                            <li>Cost projections will be unreliable</li>
                            <li>The system will use default values (may not match your project)</li>
                        </ul>
                    </div>
                    <div class="recommendation">
                        <h4>💡 Recommendation:</h4>
                        <p>For accurate results, we strongly recommend keeping all essential measurements enabled. If you don't have exact measurements, use your best estimates.</p>
                    </div>
                </div>
                <div class="essential-field-actions">
                    <button class="re-enable-field" data-field="${fieldName.toLowerCase()}">Re-enable ${actualFieldName}</button>
                    <button class="continue-anyway" data-field="${fieldName.toLowerCase()}">Continue Anyway</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        const closeBtn = modal.querySelector('.close-essential-modal');
        const reEnableBtn = modal.querySelector('.re-enable-field');
        const continueBtn = modal.querySelector('.continue-anyway');

        const closeModal = () => {
            modal.classList.add('closing');
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.remove();
                }
            }, 300);
        };

        closeBtn.addEventListener('click', () => {
            // Re-enable the field when closing without action
            const fieldName = reEnableBtn.dataset.field;
            const mode = isAdvancedMode ? 'Adv' : '';
            const toggleId = `include${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}${mode}`;
            const toggle = document.getElementById(toggleId);
            if (toggle) {
                toggle.checked = true;
                updateFieldVisibility();
            }
            closeModal();
        });

        reEnableBtn.addEventListener('click', () => {
            const fieldName = reEnableBtn.dataset.field;
            const mode = isAdvancedMode ? 'Adv' : '';
            const toggleId = `include${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}${mode}`;
            const toggle = document.getElementById(toggleId);
            if (toggle) {
                toggle.checked = true;
                updateFieldVisibility();
                showToast(`${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} measurement re-enabled!`, 'success');
            }
            closeModal();
        });

        continueBtn.addEventListener('click', () => {
            // Actually uncheck the field and proceed
            const fieldName = continueBtn.dataset.field;
            const mode = isAdvancedMode ? 'Adv' : '';
            const toggleId = `include${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}${mode}`;
            const toggle = document.getElementById(toggleId);
            if (toggle) {
                toggle.checked = false;
                updateFieldVisibility();
                showToast(`${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} measurement disabled. Use with caution!`, 'success');
            }
            closeModal();
        });

        // Close when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                // Re-enable the field when clicking outside
                const fieldName = reEnableBtn.dataset.field;
                const mode = isAdvancedMode ? 'Adv' : '';
                const toggleId = `include${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}${mode}`;
                const toggle = document.getElementById(toggleId);
                if (toggle) {
                    toggle.checked = true;
                    updateFieldVisibility();
                }
                closeModal();
            }
        });

        // Show modal with animation
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }

    // Field visibility management
    function updateFieldVisibility() {
        const mode = isAdvancedMode ? 'Adv' : '';
        const projectTypeElement = mode ? document.getElementById('projectTypeAdv') : document.getElementById('projectType');
        const projectType = projectTypeElement ? projectTypeElement.value : 'slab';
        
        // Define which fields are relevant for each project type
        const projectFieldMappings = {
            'slab': ['length', 'width', 'thickness', 'waste'],
            'square-footing': ['length', 'width', 'thickness', 'waste'],
            'wall': ['length', 'width', 'thickness', 'waste'],
            'hole': ['length', 'width', 'thickness', 'waste'],
            'column': ['length', 'width', 'thickness', 'waste'],
            'round-footing': ['length', 'width', 'thickness', 'waste'],
            'circular-slab': ['width', 'thickness', 'waste'], // no length needed
            'tube': ['length', 'width', 'thickness', 'waste'],
            'curb-gutter': ['length', 'width', 'thickness', 'waste'],
            'barrier': ['length', 'width', 'thickness', 'waste'],
            'footing': ['length', 'width', 'thickness', 'waste'],
            'beam': ['length', 'width', 'thickness', 'waste'],
            'stairs': ['length', 'width', 'thickness', 'waste'],
            'retaining-wall': ['length', 'width', 'thickness', 'waste'],
            'driveway': ['length', 'width', 'thickness', 'waste'],
            'foundation': ['length', 'width', 'thickness', 'waste'],
            'pool': ['length', 'width', 'thickness', 'waste'],
            'patio': ['length', 'width', 'thickness', 'waste'],
            'sidewalk': ['length', 'width', 'thickness', 'waste'],
            'curb': ['length', 'width', 'thickness', 'waste'],
            'culvert': ['length', 'width', 'thickness', 'waste'],
            'bridge': ['length', 'width', 'thickness', 'waste']
        };
        
        const relevantFields = projectFieldMappings[projectType] || ['length', 'width', 'thickness', 'waste'];
        const essentialFields = ['length', 'width', 'thickness']; // Define essential measurements
        
        // Get field labels based on project type
        const fieldLabels = getFieldLabelsForProject(projectType);
        
        // Hide/show toggle items based on relevant fields
        const toggleItems = document.querySelectorAll(`.toggle-item`);
        toggleItems.forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            const label = item.querySelector('.toggle-label');
            
            if (!checkbox) return;
            
            const fieldName = checkbox.id.replace('include', '').replace('Adv', '').toLowerCase();
            
            // Handle advanced-only toggles
            if (['strength', 'reinforcement', 'laborrate', 'cementprice', 'additives', 'finishtype'].includes(fieldName)) {
                if (isAdvancedMode) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
                return;
            }
            
            if (relevantFields.includes(fieldName)) {
                item.style.display = 'flex';
                // Update label text based on project type
                if (fieldLabels[fieldName]) {
                    label.textContent = fieldLabels[fieldName];
                }
            } else {
                item.style.display = 'none';
                // Uncheck hidden toggles
                checkbox.checked = false;
            }
        });

        // Now handle field visibility based on remaining toggles
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
            toggles[`includeAdditives`] = ['additives'];
            toggles[`includeFinishType`] = ['finishType'];
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

    // New function to get field labels for each project type
    function getFieldLabelsForProject(projectType) {
        const labelMappings = {
            'slab': { length: 'Length', width: 'Width', thickness: 'Thickness', waste: 'Waste Factor' },
            'square-footing': { length: 'Length', width: 'Width', thickness: 'Depth', waste: 'Waste Factor' },
            'wall': { length: 'Length', width: 'Height', thickness: 'Thickness', waste: 'Waste Factor' },
            'hole': { length: 'Length', width: 'Width', thickness: 'Depth', waste: 'Waste Factor' },
            'column': { length: 'Height', width: 'Diameter', thickness: 'Wall Thickness', waste: 'Waste Factor' },
            'round-footing': { length: 'Depth', width: 'Diameter', thickness: 'Base Thickness', waste: 'Waste Factor' },
            'circular-slab': { width: 'Diameter', thickness: 'Thickness', waste: 'Waste Factor' },
            'tube': { length: 'Length', width: 'Outer Diameter', thickness: 'Wall Thickness', waste: 'Waste Factor' },
            'curb-gutter': { length: 'Length', width: 'Curb Width', thickness: 'Gutter Width', waste: 'Waste Factor' },
            'barrier': { length: 'Length', width: 'Height', thickness: 'Thickness', waste: 'Waste Factor' },
            'footing': { length: 'Length', width: 'Width', thickness: 'Depth', waste: 'Waste Factor' },
            'beam': { length: 'Length', width: 'Width', thickness: 'Height', waste: 'Waste Factor' },
            'stairs': { length: 'Number of Steps', width: 'Width', thickness: 'Thickness', waste: 'Waste Factor' },
            'retaining-wall': { length: 'Length', width: 'Height', thickness: 'Thickness', waste: 'Waste Factor' },
            'driveway': { length: 'Length', width: 'Width', thickness: 'Thickness', waste: 'Waste Factor' },
            'foundation': { length: 'Length', width: 'Width', thickness: 'Depth', waste: 'Waste Factor' },
            'pool': { length: 'Length', width: 'Width', thickness: 'Depth', waste: 'Waste Factor' },
            'patio': { length: 'Length', width: 'Width', thickness: 'Thickness', waste: 'Waste Factor' },
            'sidewalk': { length: 'Length', width: 'Width', thickness: 'Thickness', waste: 'Waste Factor' },
            'curb': { length: 'Length', width: 'Combined Width', thickness: 'Gutter Depth', waste: 'Waste Factor' },
            'culvert': { length: 'Length', width: 'Interior Diameter', thickness: 'Wall Thickness', waste: 'Waste Factor' },
            'bridge': { length: 'Span', width: 'Width', thickness: 'Deck Thickness', waste: 'Waste Factor' }
        };
        
        return labelMappings[projectType] || labelMappings['slab'];
    }

    // Add event listeners for field toggles with essential field warning
    function initFieldToggles() {
        const toggles = document.querySelectorAll('.toggle-item input[type="checkbox"]');
        const essentialFields = ['length', 'width', 'thickness'];
        
        toggles.forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const fieldName = toggle.id.replace('include', '').replace('Adv', '').toLowerCase();
                
                // Check if this is an essential field being disabled
                if (essentialFields.includes(fieldName) && !toggle.checked) {
                    // Check if this field is actually relevant for the current project
                    const mode = isAdvancedMode ? 'Adv' : '';
                    const projectTypeElement = mode ? document.getElementById('projectTypeAdv') : document.getElementById('projectType');
                    const projectType = projectTypeElement ? projectTypeElement.value : 'slab';
                    
                    const projectFieldMappings = {
                        'slab': ['length', 'width', 'thickness', 'waste'],
                        'square-footing': ['length', 'width', 'thickness', 'waste'],
                        'wall': ['length', 'width', 'thickness', 'waste'],
                        'hole': ['length', 'width', 'thickness', 'waste'],
                        'column': ['length', 'width', 'thickness', 'waste'],
                        'round-footing': ['length', 'width', 'thickness', 'waste'],
                        'circular-slab': ['width', 'thickness', 'waste'], // no length needed
                        'tube': ['length', 'width', 'thickness', 'waste'],
                        'curb-gutter': ['length', 'width', 'thickness', 'waste'],
                        'barrier': ['length', 'width', 'thickness', 'waste'],
                        'footing': ['length', 'width', 'thickness', 'waste'],
                        'beam': ['length', 'width', 'thickness', 'waste'],
                        'stairs': ['length', 'width', 'thickness', 'waste'],
                        'retaining-wall': ['length', 'width', 'thickness', 'waste'],
                        'driveway': ['length', 'width', 'thickness', 'waste'],
                        'foundation': ['length', 'width', 'thickness', 'waste'],
                        'pool': ['length', 'width', 'thickness', 'waste'],
                        'patio': ['length', 'width', 'thickness', 'waste'],
                        'sidewalk': ['length', 'width', 'thickness', 'waste'],
                        'curb': ['length', 'width', 'thickness', 'waste'],
                        'culvert': ['length', 'width', 'thickness', 'waste'],
                        'bridge': ['length', 'width', 'thickness', 'waste']
                    };
                    
                    const relevantFields = projectFieldMappings[projectType] || ['length', 'width', 'thickness', 'waste'];
                    
                    // Only show warning if this field is both essential AND relevant for current project
                    if (relevantFields.includes(fieldName)) {
                        // Temporarily re-check the field and show warning
                        toggle.checked = true;
                        showEssentialFieldWarning(fieldName.charAt(0).toUpperCase() + fieldName.slice(1));
                        return;
                    }
                }
                
                updateFieldVisibility();
            });
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

        // Advanced mode values with toggle checks - now properly differentiated
        const concreteStrength = isAdvancedMode && inputs.includeStrength && inputs.includeStrength.checked && inputs.concreteStrength ? 
            parseInt(inputs.concreteStrength.value) : (isAdvancedMode ? 3000 : 2500); // Different default for normal mode
        const reinforcement = isAdvancedMode && inputs.includeReinforcement && inputs.includeReinforcement.checked && inputs.reinforcement ? 
            inputs.reinforcement.value : 'none';
        const laborRate = isAdvancedMode && inputs.includeLaborRate && inputs.includeLaborRate.checked && inputs.laborRate ? 
            parseFloat(inputs.laborRate.value) || 75 : (isAdvancedMode ? 75 : 65); // Different rates for modes
        const cementPrice = isAdvancedMode && inputs.includeCementPrice && inputs.includeCementPrice.checked && inputs.cementPrice ? 
            parseFloat(inputs.cementPrice.value) || 4.50 : (isAdvancedMode ? 4.50 : 4.00); // Different pricing
        const additives = isAdvancedMode && inputs.includeAdditives && inputs.includeAdditives.checked && inputs.additives ? 
            inputs.additives.value : 'none';
        const finishType = isAdvancedMode && inputs.includeFinishType && inputs.includeFinishType.checked && inputs.finishType ? 
            inputs.finishType.value : (isAdvancedMode ? 'broom' : 'basic');

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

        // Raw dimensions for visualization (use the literal field values regardless of toggles)
        const rawLength = parseFloat(inputs.length?.value) || length || 0;
        const rawWidth = parseFloat(inputs.width?.value) || width || 0;
        const rawThickness = parseFloat(inputs.thickness?.value) || thickness || 0;

        // Calculate volume based on project type with correct formulas
        if (units === 'imperial') {
            // Imperial calculations (length and width in feet, thickness in inches)
            const thicknessFeet = thickness / 12;
            
            switch (projectTypeValue) {
                case 'slab':
                case 'square-footing':
                case 'wall':
                case 'driveway':
                case 'patio':
                case 'sidewalk':
                    volume = length * width * thicknessFeet;
                    surfaceArea = length * width;
                    break;
                case 'hole':
                    // Hole calculation: excavation volume (negative concrete volume)
                    volume = length * width * thicknessFeet;
                    surfaceArea = length * width;
                    break;
                case 'column':
                case 'round-footing':
                    // Circular column/footing: width is diameter
                    const radius = width / 2;
                    volume = Math.PI * radius * radius * length;
                    surfaceArea = Math.PI * width * width / 4;
                    break;
                case 'circular-slab':
                    // Circular slab: width is diameter, length is ignored or used as diameter
                    const slabRadius = width / 2;
                    volume = Math.PI * slabRadius * slabRadius * thicknessFeet;
                    surfaceArea = Math.PI * width * width / 4;
                    break;
                case 'tube':
                    // Hollow tube: width is outer diameter, thickness is wall thickness
                    const outerRadius = width / 2;
                    const wallThickness = thickness / 12;
                    const innerRadius = Math.max(0, outerRadius - wallThickness);
                    volume = Math.PI * length * (outerRadius * outerRadius - innerRadius * innerRadius);
                    surfaceArea = Math.PI * width * length;
                    break;
                case 'curb-gutter':
                    // Curb and gutter: trapezoidal cross-section
                    const curbHeight = 6 / 12; // 6 inches height
                    const curbWidth = width / 12; // width in feet
                    const gutterWidth = thickness / 12; // gutter width
                    volume = length * ((curbHeight * curbWidth) + (0.25 * gutterWidth)); // 3 inch thick gutter
                    surfaceArea = length * (curbWidth + gutterWidth);
                    break;
                case 'barrier':
                    // Traffic barrier: width is height, thickness is barrier thickness
                    volume = length * width * thicknessFeet;
                    surfaceArea = length * width;
                    break;
                case 'footing':
                    volume = length * width * thicknessFeet;
                    surfaceArea = length * width;
                    break;
                case 'beam':
                    volume = length * width * thicknessFeet;
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
                case 'retaining-wall':
                    // Retaining wall calculation
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
                case 'pool':
                    // Pool calculation: rectangular pool with sloped bottom
                    const poolDepth = thickness / 12; // thickness as depth in feet
                    volume = length * width * poolDepth * 0.85; // 85% factor for typical pool shape
                    surfaceArea = length * width;
                    break;
                case 'curb':
                    // Curb and gutter: trapezoidal cross-section
                    const curbHeightOld = 6 / 12; // 6 inches height
                    const curbWidthOld = width / 12; // width in feet
                    const gutterWidthOld = thickness / 12; // gutter width
                    volume = length * ((curbHeightOld * curbWidthOld) + (0.25 * gutterWidthOld)); // 3 inch thick gutter
                    surfaceArea = length * (curbWidthOld + gutterWidthOld);
                    break;
                case 'culvert':
                    // Circular culvert: width is diameter
                    const culvertRadius = width / 2;
                    const culvertWallThickness = thickness / 12;
                    const culvertOuterRadius = culvertRadius + culvertWallThickness;
                    volume = Math.PI * length * (culvertOuterRadius * culvertOuterRadius - culvertRadius * culvertRadius);
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
                case 'square-footing':
                case 'wall':
                case 'driveway':
                case 'patio':
                case 'sidewalk':
                    volume = length * width * thicknessMeters;
                    surfaceArea = length * width;
                    break;
                case 'hole':
                    volume = length * width * thicknessMeters;
                    surfaceArea = length * width;
                    break;
                case 'column':
                case 'round-footing':
                    const radius = width / 2;
                    volume = Math.PI * radius * radius * length;
                    surfaceArea = Math.PI * width * width / 4;
                    break;
                case 'circular-slab':
                    const slabRadius = width / 2;
                    volume = Math.PI * slabRadius * slabRadius * thicknessMeters;
                    surfaceArea = Math.PI * width * width / 4;
                    break;
                case 'tube':
                    const outerRadius = width / 2;
                    const wallThickness = thicknessMeters;
                    const innerRadius = Math.max(0, outerRadius - wallThickness);
                    volume = Math.PI * length * (outerRadius * outerRadius - innerRadius * innerRadius);
                    surfaceArea = Math.PI * width * length;
                    break;
                case 'curb-gutter':
                    const curbHeight = 0.15; // 15 cm
                    const curbWidth = width / 100;
                    const gutterWidth = thickness / 100;
                    volume = length * ((curbHeight * curbWidth) + (0.08 * gutterWidth)); // 8 cm thick gutter
                    surfaceArea = length * (curbWidth + gutterWidth);
                    break;
                case 'barrier':
                    volume = length * width * thicknessMeters;
                    surfaceArea = length * width;
                    break;
                case 'footing':
                    volume = length * width * thicknessMeters;
                    surfaceArea = length * width;
                    break;
                case 'beam':
                    volume = length * width * thicknessMeters;
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
                case 'retaining-wall':
                    volume = length * width * thicknessMeters;
                    surfaceArea = length * width;
                    break;
                case 'foundation':
                    const foundationVolume = length * width * thicknessMeters;
                    const footingVolume = length * width * (thicknessMeters * 0.5);
                    volume = foundationVolume + footingVolume;
                    surfaceArea = length * width;
                    break;
                case 'pool':
                    const poolDepth = thicknessMeters;
                    volume = length * width * poolDepth * 0.85;
                    surfaceArea = length * width;
                    break;
                case 'curb':
                    const curbHeightOld = 0.15; // 15 cm
                    const curbWidthOld = width / 100;
                    const gutterWidthOld = thickness / 100;
                    volume = length * ((curbHeightOld * curbWidthOld) + (0.08 * gutterWidthOld)); // 8 cm thick gutter
                    surfaceArea = length * (curbWidthOld + gutterWidthOld);
                    break;
                case 'culvert':
                    const culvertRadius = width / 2;
                    const culvertWallThickness = thicknessMeters;
                    const culvertOuterRadius = culvertRadius + culvertWallThickness;
                    volume = Math.PI * length * (culvertOuterRadius * culvertOuterRadius - culvertRadius * culvertRadius);
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

        // Material calculations - NOW DIFFERENT BETWEEN MODES
        let strengthMultiplier = 1.0;
        let baseMixRatio = 5.5; // bags per cubic yard
        
        if (isAdvancedMode) {
            // Advanced mode: more precise calculations based on strength
            strengthMultiplier = concreteStrength >= 4000 ? 1.3 : concreteStrength >= 3500 ? 1.15 : 1.0;
            baseMixRatio = 5.8; // Higher quality mix ratio for advanced mode
        } else {
            // Normal mode: basic calculations
            strengthMultiplier = 1.0;
            baseMixRatio = 5.2; // Standard mix ratio for normal mode
        }
        
        const cementBags = Math.ceil(volumeCubicYards * baseMixRatio * strengthMultiplier);
        const sandTons = Math.round(volumeCubicYards * (isAdvancedMode ? 0.52 : 0.48) * 100) / 100; // Different ratios
        const gravelTons = Math.round(volumeCubicYards * (isAdvancedMode ? 0.85 : 0.75) * 100) / 100; // Different ratios
        const waterGallons = Math.round(volumeCubicYards * (isAdvancedMode ? 38 : 32)); // Different water ratios

        // Reinforcement costs - only calculated in advanced mode when enabled
        let reinforcementCost = 0;
        if (isAdvancedMode && inputs.includeReinforcement && inputs.includeReinforcement.checked && reinforcement !== 'none') {
            switch (reinforcement) {
                case 'rebar':
                    reinforcementCost = surfaceArea * 0.95; // Higher cost in advanced mode
                    break;
                case 'mesh':
                    reinforcementCost = surfaceArea * 0.65;
                    break;
                case 'fiber':
                    reinforcementCost = volumeCubicYards * 40; // Higher quality fiber
                    break;
            }
        }

        // Additives cost - only in advanced mode when enabled
        let additivesCost = 0;
        if (isAdvancedMode && inputs.includeAdditives && inputs.includeAdditives.checked && additives !== 'none') {
            switch (additives) {
                case 'accelerator':
                    additivesCost = volumeCubicYards * 22; // Higher quality additives
                    break;
                case 'retarder':
                    additivesCost = volumeCubicYards * 18;
                    break;
                case 'plasticizer':
                    additivesCost = volumeCubicYards * 15;
                    break;
                case 'waterproof':
                    additivesCost = volumeCubicYards * 30;
                    break;
            }
        }

        // Finish cost multiplier - different calculations for each mode
        let finishMultiplier = 1.0;
        if (isAdvancedMode && inputs.includeFinishType && inputs.includeFinishType.checked) {
            finishMultiplier = {
                'broom': 1.0,
                'smooth': 1.2,
                'stamped': 2.2,
                'exposed': 1.8,
                'polished': 2.8
            }[finishType] || 1.0;
        } else {
            // Normal mode has simpler finish options with lower multipliers
            finishMultiplier = finishType === 'basic' ? 1.0 : 1.1;
        }

        // Cost calculations - different base costs for each mode
        const baseLaborMultiplier = isAdvancedMode ? 140 : 110; // Advanced mode has higher base labor cost
        const cementCost = cementBags * cementPrice;
        const sandCost = sandTons * (isAdvancedMode ? 38 : 32); // Different sand prices
        const gravelCost = gravelTons * (isAdvancedMode ? 45 : 38); // Different gravel prices
        const baseLaborCost = volumeCubicYards * baseLaborMultiplier;
        const laborCost = baseLaborCost * (laborRate / 75) * finishMultiplier;
        const totalCost = cementCost + sandCost + gravelCost + laborCost + reinforcementCost + additivesCost;

        // Store enhanced calculation data
        currentCalculationData = {
            mode: isAdvancedMode ? 'advanced' : 'normal',
            projectType: projectTypeValue,
            dimensions: { length, width, thickness, units },
            displayDimensions: { length: rawLength, width: rawWidth, thickness: rawThickness, units },
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
                waste: !inputs.includeWaste || inputs.includeWaste.checked,
                strength: !isAdvancedMode || (inputs.includeStrength && inputs.includeStrength.checked),
                reinforcement: !isAdvancedMode || (inputs.includeReinforcement && inputs.includeReinforcement.checked),
                laborRate: !isAdvancedMode || (inputs.includeLaborRate && inputs.includeLaborRate.checked),
                cementPrice: !isAdvancedMode || (inputs.includeCementPrice && inputs.includeCementPrice.checked),
                additives: !isAdvancedMode || (inputs.includeAdditives && inputs.includeAdditives.checked),
                finishType: !isAdvancedMode || (inputs.includeFinishType && inputs.includeFinishType.checked)
            },
            // Add mode-specific metadata
            calculationMethod: isAdvancedMode ? 'precision' : 'standard',
            qualityLevel: isAdvancedMode ? 'professional' : 'basic'
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
                includeCementPrice: document.getElementById('includeCementPrice'),
                includeAdditives: document.getElementById('includeAdditives'),
                includeFinishType: document.getElementById('includeFinishType')
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
        const dims = data.displayDimensions || data.dimensions;

        // Summary tab - show mode-specific information
        volumeInfo.innerHTML = `
            <strong>Volume:</strong> ${data.volume.cubicYards} cubic yards<br>
            <strong>Volume:</strong> ${data.volume.cubicFeet} cubic feet<br>
            <strong>Surface Area:</strong> ${data.surfaceArea} sq ft<br>
            <strong>Mode:</strong> ${data.mode === 'advanced' ? 'Professional Grade' : 'Standard'} calculation
        `;

        materialsInfo.innerHTML = `
            <strong>Cement:</strong> ${data.materials.cementBags} bags (94 lb each)<br>
            <strong>Sand:</strong> ${data.materials.sandTons} tons<br>
            <strong>Gravel:</strong> ${data.materials.gravelTons} tons<br>
            <strong>Water:</strong> ${data.materials.waterGallons} gallons<br>
            <strong>Mix Quality:</strong> ${data.mode === 'advanced' ? 'High-grade' : 'Standard'} mix
            ${data.reinforcement !== 'none' ? `<br><strong>Reinforcement:</strong> ${data.reinforcement.charAt(0).toUpperCase() + data.reinforcement.slice(1)}` : ''}
        `;

        const materialsCost = data.costs.cement + data.costs.sand + data.costs.gravel + data.costs.reinforcement;
        costInfo.innerHTML = `
            <strong>Materials:</strong> $${Math.round(materialsCost * 100) / 100}<br>
            <strong>Labor (est):</strong> $${Math.round(data.costs.labor * 100) / 100}<br>
            <strong>Total (est):</strong> $${Math.round(data.costs.total * 100) / 100}<br>
            <strong>Pricing:</strong> ${data.mode === 'advanced' ? 'Professional rates' : 'Standard rates'}
            ${data.costs.additives > 0 ? `<br><strong>Additives:</strong> $${Math.round(data.costs.additives * 100) / 100}` : ''}
        `;

        projectInfo.innerHTML = `
            <strong>Project:</strong> ${data.projectType.charAt(0).toUpperCase() + data.projectType.slice(1)}<br>
            <strong>Waste Factor:</strong> ${data.wasteFactor}%<br>
            <strong>Strength:</strong> ${data.concreteStrength} PSI<br>
            <strong>Finish:</strong> ${data.finishType.charAt(0).toUpperCase() + data.finishType.slice(1)}<br>
            <strong>Calculation Method:</strong> ${data.calculationMethod === 'precision' ? 'Precision Engineering' : 'Standard Formula'}
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
        const visLabels = getFieldLabelsForProject(data.projectType);
        const lenUnit = visLabels.length === 'Number of Steps' ? 'steps' : (dims.units === 'metric' ? 'm' : 'ft');
        document.getElementById('dimLength').previousElementSibling.textContent = visLabels.length + ':';
        document.getElementById('dimWidth').previousElementSibling.textContent = visLabels.width + ':';
        document.getElementById('dimThickness').previousElementSibling.textContent = visLabels.thickness + ':';
        document.getElementById('dimLength').textContent = `${dims.length ?? '-'} ${visLabels.length === 'Number of Steps' ? '' : lenUnit}`;
        document.getElementById('dimWidth').textContent = `${dims.width ?? '-'} ${dims.units === 'metric' ? 'm' : 'ft'}`;
        document.getElementById('dimThickness').textContent = `${dims.thickness ?? '-'} ${dims.units === 'metric' ? 'cm' : 'in'}`;
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

        // Prefer raw user-entered values for display/3D, fall back if missing
        const dims = data.displayDimensions || data.dimensions;

        // High-DPI sizing and responsive layout
        const container = canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = Math.min(400, window.innerHeight * 0.4);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(containerWidth * dpr);
        canvas.height = Math.floor(containerHeight * dpr);
        canvas.style.width = containerWidth + 'px';
        canvas.style.height = containerHeight + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Set up 3D projection parameters
        const centerX = canvas.width / (2 * dpr);
        const centerY = canvas.height / (2 * dpr);
        // model scale
        const baseScale = Math.min(containerWidth, containerHeight) / 8;
        const scale = baseScale * zoom;

        // Normalize dimensions to feet for consistent visuals
        const toFeet = dims.units === 'metric' ? 3.28084 : 1;
        const lenFeet = (dims.length || 1) * toFeet;
        const widFeet = (dims.width || 1) * toFeet;
        const thFeet = dims.units === 'metric'
            ? (dims.thickness || 4) / 30.48
            : (dims.thickness || 4) / 12;
        const length = Math.max(lenFeet, 0.5);
        const width = Math.max(widFeet, 0.5);
        const height = Math.max(thFeet, 0.15);

        // choose shape per project type (cylinders/hollow where appropriate)
        const pt = data.projectType;
        const isSolidCylinder = ['column','round-footing','circular-slab'].includes(pt);
        const isHollowCylinder = ['tube','culvert'].includes(pt);
        if (isSolidCylinder || isHollowCylinder) {
            const outerR = (width / 2) * scale;
            let hPx;
            if (pt === 'circular-slab' || pt === 'round-footing') hPx = Math.max(height * scale, 8);
            else hPx = Math.max(length * scale, 12);
            let innerR = 0;
            if (isHollowCylinder) {
                const wallFeet = Math.max(height, 0.05);
                innerR = Math.max(outerR - wallFeet * scale, 0);
            }
            drawCylinder2D(ctx, centerX, centerY, outerR, hPx, innerR);
            // dimension labels
            ctx.fillStyle = 'rgb(37, 99, 235)';
            ctx.font = 'bold 14px Inter';
            ctx.textAlign = 'center';
            const cylLabels = getFieldLabelsForProject(data.projectType);
            const uLen = cylLabels.length === 'Number of Steps' ? 'steps' : (dims.units === 'metric' ? 'm' : 'ft');
            const uThk = dims.units === 'metric' ? 'cm' : 'in';
            ctx.fillText(`${dims.length ?? '-'} ${uLen}`, centerX, (canvas.height / dpr) - 20);
            ctx.save(); ctx.translate(30, centerY); ctx.rotate(-Math.PI / 2);
            ctx.fillText(`${dims.width ?? '-'} ${uLen}`, 0, 0); ctx.restore();
            ctx.fillText(`${dims.thickness ?? '-'} ${uThk}`, (canvas.width / dpr) - 50, centerY);
            return;
        }

        // Apply rotation (Y then X) and simple perspective
        const ry = rotY + rotationAngle;
        const cy = Math.cos(ry), sy = Math.sin(ry);
        const cx = Math.cos(rotX), sx = Math.sin(rotX);
        const cameraZ = 6; // camera distance in model units
        const persp = (z) => 1 / (1 + (z / cameraZ));

        // Define cube vertices
        const vertices = [
            [-length/2, -width/2, -height/2],
            [ length/2, -width/2, -height/2],
            [ length/2,  width/2, -height/2],
            [-length/2,  width/2, -height/2],
            [-length/2, -width/2,  height/2],
            [ length/2, -width/2,  height/2],
            [ length/2,  width/2,  height/2],
            [-length/2,  width/2,  height/2]
        ];

        // Rotate and project vertices
        const projectedVertices = vertices.map(([x, y, z]) => {
            // Y rotation
            const x1 = x * cy - z * sy;
            const z1 = x * sy + z * cy;
            // X rotation
            const y2 = y * cx - z1 * sx;
            const z2 = y * sx + z1 * cx;
            // perspective scale
            const p = persp(z2);
            return [centerX + x1 * scale * p, centerY + y2 * scale * p, z2];
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

        // draw a subtle ground grid
        ctx.save();
        ctx.strokeStyle = 'rgba(59,130,246,0.15)';
        ctx.lineWidth = 1;
        for (let i = -4; i <= 4; i++) {
            const gx = i * (scale * 0.8);
            ctx.beginPath(); ctx.moveTo(centerX + gx, centerY + 4 * scale); ctx.lineTo(centerX + gx, centerY - 4 * scale); ctx.stroke();
            const gy = i * (scale * 0.8);
            ctx.beginPath(); ctx.moveTo(centerX - 4 * scale, centerY + gy); ctx.lineTo(centerX + 4 * scale, centerY + gy); ctx.stroke();
        }
        ctx.restore();

        // Dimension labels with proper units
        ctx.fillStyle = 'rgb(37, 99, 235)';
        ctx.font = 'bold 14px Inter';
        ctx.textAlign = 'center';
        const boxLabels = getFieldLabelsForProject(data.projectType);
        const uLen = boxLabels.length === 'Number of Steps' ? 'steps' : (dims.units === 'metric' ? 'm' : 'ft');
        const uThk = dims.units === 'metric' ? 'cm' : 'in';
        ctx.fillText(`${dims.length ?? '-'} ${uLen}`, centerX, (canvas.height / dpr) - 20);
        ctx.save(); ctx.translate(30, centerY); ctx.rotate(-Math.PI / 2);
        ctx.fillText(`${dims.width ?? '-'} ${uLen}`, 0, 0); ctx.restore();
        ctx.fillText(`${dims.thickness ?? '-'} ${uThk}`, (canvas.width / dpr) - 50, centerY);
    }

    // simple 2.5D cylinder renderer (supports hollow if innerRx > 0)
    function drawCylinder2D(ctx, cx, cy, rx, h, innerRx = 0) {
        const ry = rx * 0.35, topY = cy - h / 2, botY = cy + h / 2;
        // sides
        ctx.fillStyle = 'rgba(59,130,246,0.85)'; ctx.beginPath();
        ctx.moveTo(cx - rx, topY); ctx.lineTo(cx - rx, botY);
        ctx.bezierCurveTo(cx - rx, botY + ry, cx + rx, botY + ry, cx + rx, botY);
        ctx.lineTo(cx + rx, topY);
        ctx.bezierCurveTo(cx + rx, topY - ry, cx - rx, topY - ry, cx - rx, topY);
        ctx.closePath(); ctx.fill();
        // top ellipse
        ctx.fillStyle = 'rgba(59,130,246,1)'; ctx.beginPath();
        ctx.ellipse(cx, topY, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
        // inner cutout (hollow)
        if (innerRx > 0) {
            const iry = innerRx * 0.35;
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath(); ctx.ellipse(cx, topY, innerRx, iry, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(cx - innerRx, topY); ctx.lineTo(cx - innerRx, botY);
            ctx.bezierCurveTo(cx - innerRx, botY + iry, cx + innerRx, botY + iry, cx + innerRx, botY);
            ctx.lineTo(cx + innerRx, topY);
            ctx.bezierCurveTo(cx + innerRx, topY - iry, cx - innerRx, topY - iry, cx - innerRx, topY);
            ctx.closePath(); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
        }
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
            historyList.innerHTML = '';
            return;
        }
        
        historyList.innerHTML = calculationHistory.map(item => `
            <div class="history-item" data-id="${item.id}">
                <div class="history-checkbox">
                    <input type="checkbox" id="compare-${item.id}" class="compare-checkbox">
                </div>
                <div class="history-info">
                    <div class="history-project">${item.name}</div>
                    <div class="history-details">
                        <div class="history-detail-item">
                            <svg class="history-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73L12 2 4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 1-2 2h5a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                            ${item.volume.cubicYards} yd³
                        </div>
                        <div class="history-detail-item">
                            <svg class="history-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="12" y1="1" x2="12" y2="23"/>
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                            </svg>
                            $${Math.round(item.costs.total)}
                        </div>
                        <div class="history-detail-item">
                            <svg class="history-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="8" y2="6"/>
                                <line x1="8" y1="2" x2="16" y2="6"/>
                            </svg>
                            ${item.mode === 'advanced' ? 'Pro' : 'Basic'}
                        </div>
                        <div class="history-detail-item">
                            <svg class="history-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="3"/>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 0 2 2 2 2 0 0 0-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                            </svg>
                            ${new Date(item.calculatedAt).toLocaleDateString()}
                        </div>
                    </div>
                </div>
                <div class="history-actions">
                    <button class="history-btn load-btn" onclick="loadFromHistory(${item.id})" title="Load Project">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 1-2 2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                        </svg>
                        Load
                    </button>
                    <button class="history-btn delete-btn" onclick="deleteFromHistory(${item.id})" title="Delete Project">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="m19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            <line x1="10" y1="11" x2="10" y2="17"/>
                            <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                        Delete
                    </button>
                </div>
            </div>
        `).join('');

        // Add event listeners to compare checkboxes
        document.querySelectorAll('.compare-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const selectedCheckboxes = document.querySelectorAll('.compare-checkbox:checked');
                
                // If more than 4 are selected, prevent the last one from being checked
                if (selectedCheckboxes.length > 4) {
                    e.target.checked = false;
                    showToast('You can only compare a maximum of 4 projects at once.', 'error');
                    return;
                }
                
                updateCompareButton();
            });
        });
        updateCompareButton(); // ensure button state reflects current selection
    }

    // Function to update compare button state
    function updateCompareButton() {
        const selectedCheckboxes = document.querySelectorAll('.compare-checkbox:checked');
        const compareBtn = document.getElementById('compareBtn');
        
        if (selectedCheckboxes.length >= 2 && selectedCheckboxes.length <= 4) {
            compareBtn.disabled = false;
            compareBtn.textContent = `Compare ${selectedCheckboxes.length} Items`;
        } else if (selectedCheckboxes.length > 4) {
            compareBtn.disabled = true;
            compareBtn.textContent = 'Maximum 4 items allowed';
        } else {
            compareBtn.disabled = true;
            compareBtn.textContent = 'Compare Selected';
        }
    }

    // Function to show comparison modal
    function showComparison() {
        const selectedCheckboxes = document.querySelectorAll('.compare-checkbox:checked');
        if (selectedCheckboxes.length < 2) {
            showToast('Please select at least 2 items to compare.');
            return;
        }
        
        if (selectedCheckboxes.length > 4) {
            showToast('You can only compare a maximum of 4 items at once.');
            return;
        }

        const selectedItems = Array.from(selectedCheckboxes).map(checkbox => {
            const id = parseInt(checkbox.id.replace('compare-', ''));
            return calculationHistory.find(item => item.id === id);
        }).filter(Boolean);

        // Create comparison modal
        const modal = document.createElement('div');
        modal.className = 'comparison-modal';
        modal.innerHTML = `
            <div class="comparison-content">
                <div class="comparison-header">
                    <h3>Project Comparison</h3>
                    <button class="close-comparison">×</button>
                </div>
                <div class="comparison-table-container">
                    <table class="comparison-table">
                        <thead>
                            <tr>
                                <th>Property</th>
                                ${selectedItems.map(item => `<th>${item.projectType} (${item.dimensions.length}×${item.dimensions.width})</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>Project Type</strong></td>
                                ${selectedItems.map(item => `<td>${item.projectType.charAt(0).toUpperCase() + item.projectType.slice(1)}</td>`).join('')}
                            </tr>
                            <tr>
                                <td><strong>Dimensions (L×W×T)</strong></td>
                                ${selectedItems.map(item => `<td>${item.dimensions.length}×${item.dimensions.width}×${item.dimensions.thickness}</td>`).join('')}
                            </tr>
                            <tr>
                                <td><strong>Volume (yd³)</strong></td>
                                ${selectedItems.map(item => `<td>${item.volume.cubicYards}</td>`).join('')}
                            </tr>
                            <tr>
                                <td><strong>Cement (bags)</strong></td>
                                ${selectedItems.map(item => `<td>${item.materials.cementBags}</td>`).join('')}
                            </tr>
                            <tr>
                                <td><strong>Sand (t)</strong></td>
                                ${selectedItems.map(item => `<td>${item.materials.sandTons}</td>`).join('')}
                            </tr>
                            <tr>
                                <td><strong>Gravel (t)</strong></td>
                                ${selectedItems.map(item => `<td>${item.materials.gravelTons}</td>`).join('')}
                            </tr>
                            <tr>
                                <td><strong>Labor ($)</strong></td>
                                ${selectedItems.map(item => `<td>$${Math.round(item.costs.labor)}</td>`).join('')}
                            </tr>
                            <tr>
                                <td><strong>Total ($)</strong></td>
                                ${selectedItems.map(item => `<td>$${Math.round(item.costs.total)}</td>`).join('')}
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="comparison-actions">
                    <button class="export-comparison-btn">Export Comparison</button>
                    <button class="close-comparison-btn">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        modal.querySelector('.close-comparison').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.querySelector('.close-comparison-btn').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.querySelector('.export-comparison-btn').addEventListener('click', () => {
            exportComparison(selectedItems);
        });

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });

        showToast('Comparison view opened!', 'success');
    }

    // Function to export comparison
    function exportComparison(selectedItems) {
        try { const { jsPDF } = window.jspdf || {}; if (!jsPDF) throw new Error('jsPDF not loaded');
        const doc=new jsPDF('l','pt','a4'),W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight(),M=40;let y=M;
        doc.setFillColor(59,130,246);doc.rect(0,0,W,90,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(20);doc.text('Project Comparison',M,50);doc.setFont('helvetica','normal');doc.setFontSize(11);doc.text(new Date().toLocaleString(),M,70);y=110;
        const headers=['Property',...selectedItems.map(i=>`${i.projectType} (${i.dimensions.length}×${i.dimensions.width})`)];
        const rows=[['Dimensions (L×W×T)',...selectedItems.map(i=>`${i.dimensions.length}×${i.dimensions.width}×${i.dimensions.thickness}`)],['Volume (yd³)',...selectedItems.map(i=>i.volume.cubicYards)],['Cement (bags)',...selectedItems.map(i=>i.materials.cementBags)],['Sand (t)',...selectedItems.map(i=>i.materials.sandTons)],['Gravel (t)',...selectedItems.map(i=>i.materials.gravelTons)],['Labor ($)',...selectedItems.map(i=>Math.round(i.costs.labor))],['Total ($)',...selectedItems.map(i=>Math.round(i.costs.total))]];
        const drawTable=(head,data)=>{const cols=head.length,tableW=W-M*2,colW=tableW/cols,rowH=28;doc.setFontSize(11);doc.setFont('helvetica','bold');doc.setTextColor(255,255,255);doc.setFillColor(59,130,246);doc.roundedRect(M,y-18,tableW,rowH,8,8,'F');head.forEach((h,i)=>doc.text(String(h),M+12+i*colW,y));y+=rowH+10;doc.setFont('helvetica','normal');doc.setTextColor(30,35,40);data.forEach((r,ri)=>{if(y>H-M-40){doc.addPage();y=M;}const bg=ri%2?[245,247,252]:[241,245,249];doc.setFillColor(...bg);doc.setDrawColor(230,235,243);doc.roundedRect(M,y-18,tableW,rowH,6,6,'F');r.forEach((c,i)=>doc.text(String(c),M+12+i*colW,y));y+=rowH+8;});};
        doc.setTextColor(59,130,246);doc.setFont('helvetica','bold');doc.setFontSize(13);doc.text('Summary',M,y);y+=6;doc.setDrawColor(226,232,240);doc.line(M,y,W-M,y);y+=16;
        drawTable(headers,rows);
        doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(107,114,128);if(y>H-M-30){doc.addPage('l','a4');y=M;}doc.text('Note: Values are estimates. Verify per local code and supplier quotes.',M,y+12);
        doc.save('comparison-modern.pdf');window.showToast&&showToast('Comparison PDF exported!','success'); } catch(e){ console.error(e); showToast&&showToast('Error exporting PDF. Please try again.','error'); }
    }

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
        const yd3 = data.volume.cubicYards, area = data.surfaceArea, mode = data.mode, psi = data.concreteStrength;
        const recT = data.projectType==='driveway'? (psi>=4000?5:4) : data.projectType==='slab'?4 : data.projectType==='sidewalk'?4 : data.projectType==='patio'?4 : data.projectType==='foundation'?8 : data.projectType==='wall'?8 : 4;
        const joints = (data.projectType==='slab'||data.projectType==='driveway'||data.projectType==='patio'||data.projectType==='sidewalk') ? Math.max(1, Math.round((area/144)/8)) : 0;
        const trucks = Math.max(1, Math.ceil(yd3/9)); const pourTime = Math.ceil(yd3/3);
        const reinf = data.reinforcement!=='none' ? `${data.reinforcement} selected` : (area>200? 'Consider wire mesh or #3 rebar @18"' : 'Optional for small pours');
        const proHtml = `<div class="tip-item pro"><span class="tip-badge">Project Advisory</span><div class="tip-title">Execution Plan & Specifications</div><div class="tip-content">Based on your inputs, here are refined recommendations for a clean, compliant pour:</div><ul class="tip-list">
<li><strong>Recommended thickness:</strong> ~${recT}" ${data.projectType==='foundation'?'(wall/footings may vary by code)':''}</li>
<li><strong>Control joints:</strong> ${joints>0?`${joints} cuts (~8–10 ft spacing) with 1/4 slab depth`:'Not applicable for this shape'}</li>
<li><strong>Reinforcement:</strong> ${reinf}</li>
<li><strong>Curing regime:</strong> Keep moist for 7 days; traffic after 7 days; full strength ~28 days</li>
<li><strong>Mix/workability:</strong> ${psi} PSI; target slump 4"–5" (adjust with plasticizer, not water)</li>
<li><strong>Subbase & prep:</strong> 4" compacted granular base, vapor barrier for interiors, edge forms staked @ 24"</li>
<li><strong>Delivery logistics:</strong> ~${yd3.toFixed(2)} yd³ → ${trucks} truck(s), plan ~${pourTime} hr pour window; pump if access is limited</li>
</ul><div class="tip-meta">Note: Always verify with local building codes and soil conditions.</div></div>`;
        tipsContainer.insertAdjacentHTML('afterbegin', proHtml);
    }

    // 3D visualization controls
    function init3DControls() {
        const canvas = document.getElementById('threeDView');
        document.getElementById('rotateLeft').addEventListener('click', () => { rotationAngle -= Math.PI / 8; draw3DVisualization(); });
        document.getElementById('rotateRight').addEventListener('click', () => { rotationAngle += Math.PI / 8; draw3DVisualization(); });
        document.getElementById('resetView').addEventListener('click', () => { rotationAngle = 0; rotX = -0.35; rotY = 0.6; zoom = 1; draw3DVisualization(); });

        // drag to rotate
        let dragging = false, lastX = 0, lastY = 0;
        canvas.addEventListener('mousedown', e => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
        window.addEventListener('mouseup', () => dragging = false);
        window.addEventListener('mousemove', e => {
            if (!dragging) return;
            const dx = e.clientX - lastX, dy = e.clientY - lastY;
            rotY += dx * 0.006; rotX += dy * 0.006;
            rotX = Math.max(-Math.PI/2 + 0.05, Math.min(Math.PI/2 - 0.05, rotX));
            lastX = e.clientX; lastY = e.clientY; draw3DVisualization();
        });

        // touch rotate
        canvas.addEventListener('touchstart', e => { if (e.touches[0]) { lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; } }, { passive: true });
        canvas.addEventListener('touchmove', e => {
            if (!e.touches[0]) return;
            const dx = e.touches[0].clientX - lastX, dy = e.touches[0].clientY - lastY;
            rotY += dx * 0.006; rotX += dy * 0.006;
            rotX = Math.max(-Math.PI/2 + 0.05, Math.min(Math.PI/2 - 0.05, rotX));
            lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; draw3DVisualization();
        }, { passive: true });

        // wheel zoom
        canvas.addEventListener('wheel', e => {
            e.preventDefault();
            const delta = Math.sign(e.deltaY);
            zoom *= delta > 0 ? 0.9 : 1.1;
            zoom = Math.max(0.5, Math.min(3, zoom));
            draw3DVisualization();
        }, { passive: false });

        // resize
        window.addEventListener('resize', () => { if (document.getElementById('visualization-result').classList.contains('active')) draw3DVisualization(); });
    }

    // Enhanced export functionality
    function setupEnhancedExportButtons() {
        const exportPdfBtn = document.getElementById('exportPdfBtn');
        const copyAllBtn = document.getElementById('copyAllBtn');

        exportPdfBtn.addEventListener('click', async () => {
            if (!currentCalculationData) {
                showToast('No data to export. Please perform a calculation first.');
                return;
            }
            const { jsPDF } = window.jspdf; if (!jsPDF) showToast('PDF library not loaded. Please refresh and try again.');
            
            // Create PDF document
            const doc = new jsPDF('p', 'pt', 'a4'); // cleaner sizing in points
            const data = currentCalculationData;

            // Helpers
            const page = { w: doc.internal.pageSize.getWidth(), h: doc.internal.pageSize.getHeight(), margin: 36 };
            let y = page.margin;

            const addHeader = () => {
                // Title bar (slightly taller for breathing room)
                doc.setFillColor(59, 130, 246); // #3b82f6
                doc.rect(0, 0, page.w, 86, 'F');

                // Title
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(22);
                doc.setTextColor(255, 255, 255);
                doc.text('Professional Concrete Calculator', page.margin, 42);

                // Subtitle
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(11);
                doc.text(`Project report • ${new Date(data.calculatedAt).toLocaleString()}`, page.margin, 62);

                // Thin divider under header
                doc.setDrawColor(230, 235, 243);
                doc.setLineWidth(1);
                doc.line(page.margin, 96, page.w - page.margin, 96);

                // Reset cursor with extra spacing after header to separate from sections/tables
                y = 108; // was ~90
            };

            const sectionTitle = (title) => {
                // Extra top spacing before a section
                y += 16;
                if (y > page.h - 100) { doc.addPage(); y = page.margin; }
                doc.setFontSize(12);
                doc.setTextColor(59, 130, 246);
                doc.text(title, page.margin, y);
                y += 10;
                // underline
                doc.setDrawColor(230, 235, 243);
                doc.setLineWidth(1);
                doc.line(page.margin, y, page.w - page.margin, y);
                // add little space under the section heading before content/table
                y += 12;
                doc.setTextColor(20, 23, 26);
            };

            const keyValueRow = (label, value, labelWidth = 160) => {
                const rowHeight = 18;
                if (y > page.h - 80) { doc.addPage(); y = page.margin; }
                doc.setFontSize(10);
                doc.setTextColor(80, 90, 100);
                doc.text(label, page.margin, y);
                
                doc.setFontSize(10);
                doc.setTextColor(30, 35, 40);
                doc.text(value, page.margin + labelWidth, y);
                y += rowHeight;
            };

            const pill = (text, bg = [240, 244, 248], color = [59, 130, 246]) => {
                const padX = 10, padY = 6;
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                const w = doc.getTextWidth(text) + padX * 2;
                const h = 20;
                if (y > page.h - 80) { doc.addPage(); y = page.margin; }
                doc.setFillColor(...bg);
                doc.setDrawColor(230, 235, 243);
                doc.roundedRect(page.margin, y - 14, w, h, 6, 6, 'FD');
                doc.setTextColor(...color);
                doc.text(text, page.margin + padX, y + 1);
                y += h + 8;
                doc.setTextColor(30, 35, 40);
                doc.setFont('helvetica', 'normal');
            };

            const twoColumn = (rowsLeft, rowsRight, colGap = 28) => {
                const colW = (page.w - page.margin * 2 - colGap) / 2;
                let yLeft = y;
                let yRight = y;

                // Left column
                rowsLeft.forEach(([label, value]) => {
                    if (yLeft > page.h - 80) { doc.addPage(); yLeft = page.margin; }
                    doc.setFontSize(10);
                    doc.setTextColor(80, 90, 100);
                    doc.text(label, page.margin, yLeft);

                    doc.setFontSize(10);
                    doc.setTextColor(30, 35, 40);
                    doc.text(value, page.margin + 150, yLeft);
                    yLeft += 18;
                });

                // Right column
                rowsRight.forEach(([label, value]) => {
                    if (yRight > page.h - 80) { doc.addPage(); yRight = page.margin; }
                    doc.setFontSize(10);
                    doc.setTextColor(80, 90, 100);
                    doc.text(label, page.margin + colW + colGap, yRight);

                    doc.setFontSize(10);
                    doc.setTextColor(30, 35, 40);
                    doc.text(value, page.margin + colW + colGap + 150, yRight);
                    yRight += 18;
                });

                // Slight extra gap after the pair of columns
                y = Math.max(yLeft, yRight) + 10;
            };

            const simpleTable = (headers, rows) => {
                // Add a little space before every table to separate from previous content
                y += 6;

                const colCount = headers.length;
                const tableWidth = page.w - page.margin * 2;
                const colW = tableWidth / colCount;
                const rowH = 24;

                // subtle table container top padding
                if (y > page.h - 120) { doc.addPage(); y = page.margin; }

                const drawRow = (cells, opts = {}) => {
                    const { bold = false, header = false, index = 0 } = opts;
                    if (y > page.h - 100) { doc.addPage(); y = page.margin; }

                    // background
                    if (header) {
                        doc.setFillColor(59, 130, 246);
                        doc.setTextColor(255, 255, 255);
                        doc.rect(page.margin, y - 16, tableWidth, rowH, 'F');
                    } else {
                        // zebra striping for better readability
                        const zebra = index % 2 === 0 ? [247, 249, 252] : [241, 245, 249];
                        doc.setFillColor(...zebra);
                        doc.setTextColor(30, 35, 40);
                        doc.rect(page.margin, y - 16, tableWidth, rowH, 'F');
                    }

                    // text with padding
                    doc.setFont('helvetica', bold ? 'bold' : 'normal');
                    doc.setFontSize(header ? 10 : 9);

                    cells.forEach((c, i) => {
                        const x = page.margin + i * colW + 10;
                        const textY = y; // centered baseline visually looks good with our rowH
                        doc.text(String(c), x, textY);
                    });

                    y += rowH + 6; // extra space between rows for air
                };

                // Header
                drawRow(headers, { bold: true, header: true });

                // Rows
                rows.forEach((r, i) => drawRow(r, { index: i }));

                // small gap after table
                y += 6;
            };

            const currency = (n) => `$${(Math.round(n * 100) / 100).toLocaleString()}`;

            // Build PDF
            addHeader();

            // Project Summary
            sectionTitle('Project Summary');
            pill(data.mode === 'advanced' ? 'Mode: Professional Grade' : 'Mode: Standard');
            twoColumn(
                [
                    ['Project Type', data.projectType.charAt(0).toUpperCase() + data.projectType.slice(1)],
                    ['Dimensions (L × W × T)', `${data.dimensions.length} × ${data.dimensions.width} × ${data.dimensions.thickness} ${data.dimensions.units}`],
                    ['Waste Factor', `${data.wasteFactor}%`],
                    ['Surface Area', `${data.surfaceArea} sq ft`]
                ],
                [
                    ['Concrete Strength', `${data.concreteStrength} PSI`],
                    ['Finish Type', data.finishType.charAt(0).toUpperCase() + data.finishType.slice(1)],
                    ['Reinforcement', data.reinforcement === 'none' ? 'None' : data.reinforcement.charAt(0).toUpperCase() + data.reinforcement.slice(1)],
                    ['Calculated On', new Date(data.calculatedAt).toLocaleString()]
                ]
            );

            // Volumes
            sectionTitle('Volume Required');
            keyValueRow('Cubic Yards', `${data.volume.cubicYards} yd³`);
            keyValueRow('Cubic Feet', `${data.volume.cubicFeet} ft³`);
            keyValueRow('Cubic Meters', `${data.volume.cubicMeters} m³`);

            // Materials
            sectionTitle('Materials Needed');
            simpleTable(
                ['Material', 'Amount', 'Notes'],
                [
                    ['Cement', `${data.materials.cementBags} bags (94 lb)`, data.mode === 'advanced' ? 'High-grade mix' : 'Standard mix'],
                    ['Sand', `${data.materials.sandTons} tons`, ''],
                    ['Gravel', `${data.materials.gravelTons} tons`, ''],
                    ['Water', `${data.materials.waterGallons} gallons`, '']
                ]
            );

            // Cost Estimate
            sectionTitle('Cost Estimate');
            const materialsCostOnly = data.costs.cement + data.costs.sand + data.costs.gravel;
            simpleTable(
                ['Category', 'Amount'],
                [
                    ['Cement', currency(data.costs.cement)],
                    ['Sand', currency(data.costs.sand)],
                    ['Gravel', currency(data.costs.gravel)],
                    ...(data.costs.reinforcement > 0 ? [['Reinforcement', currency(data.costs.reinforcement)]] : []),
                    ...(data.costs.additives > 0 ? [['Additives', currency(data.costs.additives)]] : []),
                    ['Labor (estimated)', currency(data.costs.labor)],
                    ['—', '—'],
                    ['Materials Subtotal', currency(materialsCostOnly)],
                    ['TOTAL (Estimated)', currency(data.costs.total)]
                ]
            );

            // Pricing context
            keyValueRow('Pricing Basis', data.mode === 'advanced' ? 'Professional rates' : 'Standard rates');
            keyValueRow('Labor Rate', `$${data.laborRate}/hour`);
            keyValueRow('Cement Price', `$${data.cementPrice}/bag`);

            // Regional comparison (quick reference)
            sectionTitle('Regional Cost Reference');
            const base = data.costs.total;
            simpleTable(
                ['Region', 'Estimated Cost'],
                [
                    ['National Average', currency(base)],
                    ['West Coast', currency(base * 1.3)],
                    ['East Coast', currency(base * 1.2)],
                    ['Midwest', currency(base * 0.9)]
                ]
            );

            // Notes
            sectionTitle('Notes');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(100, 108, 119);
            const notes = [
                'Costs are estimates based on average US prices. Actual costs may vary by location and market conditions.',
                'For pours over 10 cubic yards, consider multiple truck deliveries to maintain workability.',
                'Ensure proper curing and reinforcement placement per local codes and best practices.'
            ];
            notes.forEach(line => {
                if (y > page.h - 80) { doc.addPage(); y = page.margin; }
                doc.text(`• ${line}`, page.margin, y);
                y += 14;
            });

            // Footer
            doc.setFontSize(8);
            doc.setTextColor(140, 148, 160);
            // remove footer text: "Report generated by Professional Concrete Calculator"
            doc.save(`Concrete-${data.projectType}-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.pdf`);
            showToast('PDF report downloaded!', 'success');
        });

        copyAllBtn.addEventListener('click', async () => {
            if (!currentCalculationData) {
                showToast('No data to copy. Please perform a calculation first.');
                return;
            }

            const data = currentCalculationData;
            const allText = `Project: ${data.projectType.charAt(0).toUpperCase() + data.projectType.slice(1)}
Dimensions: ${data.dimensions.length} x ${data.dimensions.width} x ${data.dimensions.thickness} ${data.dimensions.units}
Volume: ${data.volume.cubicYards} yd³
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
        // remove the old saveProjectBtn PDF-generation handler to prevent auto-downloads
        // document.getElementById('saveProjectBtn').addEventListener('click', async () => {
        //     /* removed: jsPDF creation and doc.save() to stop auto PDF download */
        // });
        
        // Load Project button removed from UI; guard the listener in case of cached layouts
        const loadBtn = document.getElementById('loadProjectBtn');
        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
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
        }
        
        // Clear history functionality
        document.getElementById('clearHistoryBtn').addEventListener('click', () => {
            showClearHistoryModal();
        });

        function showClearHistoryModal() {
            // Remove any existing modal
            const existingModal = document.querySelector('.clear-history-modal');
            if (existingModal) {
                existingModal.remove();
            }

            // Create modal
            const modal = document.createElement('div');
            modal.className = 'clear-history-modal';
            modal.innerHTML = `
                <div class="clear-history-content">
                    <div class="clear-history-header">
                        <div class="warning-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="15" y1="9" x2="9" y2="15"/>
                                <line x1="9" y1="9" x2="15" y2="15"/>
                            </svg>
                        </div>
                        <h3>Clear Calculation History</h3>
                        <button class="close-clear-modal">×</button>
                    </div>
                    <div class="clear-history-body">
                        <p>Are you sure you want to <strong>permanently delete</strong> all calculation history?</p>
                        <div class="warning-details">
                            <h4>⚠️ This action cannot be undone:</h4>
                            <ul>
                                <li>All saved calculations will be permanently deleted</li>
                                <li>Project data and comparisons will be lost</li>
                                <li>You'll need to recalculate everything from scratch</li>
                            </ul>
                        </div>
                        <div class="history-count">
                            <p><strong>Current history:</strong> ${calculationHistory.length} calculation${calculationHistory.length !== 1 ? 's' : ''} will be deleted</p>
                        </div>
                    </div>
                    <div class="clear-history-actions">
                        <button class="confirm-clear">Yes, Clear History</button>
                        <button class="cancel-clear">Cancel</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Add event listeners
            const closeBtn = modal.querySelector('.close-clear-modal');
            const confirmBtn = modal.querySelector('.confirm-clear');
            const cancelBtn = modal.querySelector('.cancel-clear');

            const closeModal = () => {
                modal.classList.add('closing');
                setTimeout(() => {
                    if (modal.parentNode) {
                        modal.remove();
                    }
                }, 300);
            };

            closeBtn.addEventListener('click', closeModal);
            cancelBtn.addEventListener('click', closeModal);

            confirmBtn.addEventListener('click', () => {
                calculationHistory = [];
                localStorage.removeItem('concreteCalculatorHistory');
                updateHistoryDisplay();
                showToast('History cleared successfully!', 'success');
                closeModal();
            });

            // Close when clicking outside
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal();
                }
            });

            // Show modal with animation
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
        }
    }

    // Saved Projects Manager
    let savedProjects = JSON.parse(localStorage.getItem('concreteSavedProjects') || '[]');

    function persistSavedProjects() {
        localStorage.setItem('concreteSavedProjects', JSON.stringify(savedProjects));
    }

    function renderSavedProjectsBar() {
        const bar = document.getElementById('savedProjectsBar');
        if (!bar) return;
        if (!Array.isArray(savedProjects)) savedProjects = [];
        bar.innerHTML = savedProjects.map(p => `
            <div class="saved-project-card" data-id="${p.id}">
                <div class="saved-card-head">
                    <span class="saved-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="11" width="18" height="10" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                    </span>
                    <span class="saved-project-title" title="${p.name}">${p.name}</span>
                </div>
                <span class="saved-chip-meta">• ${p.data?.projectType || '-'} • ${p.data?.volume?.cubicYards ?? '-'} yd³</span>
                <div class="saved-chip-actions">
                    <button class="saved-chip-btn" onclick="window.loadSavedProject(${p.id})" title="Load">Load</button>
                    <button class="saved-chip-btn" onclick="window.renameSavedProject(${p.id})" title="Rename">Edit</button>
                    <button class="saved-chip-btn delete" onclick="window.deleteSavedProject(${p.id})" title="Delete">Del</button>
                </div>
            </div>
        `).join('');
    }

    function saveProjectToStorage(name, data) {
        if (!data) return;
        const project = {
            id: Date.now(),
            name: name || `Project-${new Date().toISOString().slice(0,16).replace('T',' ')}`,
            data
        };
        savedProjects.unshift(project);
        // keep last 30 saved items
        if (savedProjects.length > 30) savedProjects = savedProjects.slice(0, 30);
        persistSavedProjects();
        renderSavedProjectsBar();
        showToast('Project saved to your list!', 'success');
    }

    async function loadProjectData(dataObj) {
        if (!dataObj) return;
        // Switch to mode
        if (dataObj.mode === 'advanced' && !isAdvancedMode) {
            document.querySelector('[data-tab="advanced"]').click();
        } else if (dataObj.mode === 'normal' && isAdvancedMode) {
            document.querySelector('[data-tab="normal"]').click();
        }
        setTimeout(() => {
            const inputs = getCurrentInputs();
            
            if (inputs.projectType) inputs.projectType.value = dataObj.projectType;
            // ensure labels and diagram update when projectType is set programmatically
            updateLabels(dataObj.mode === 'advanced' ? 'advanced' : 'normal');
            updateFieldVisibility();
            currentCalculationData = dataObj;
            updateResultDisplays();
            updateCharts();
            draw3DVisualization();
            generateDynamicTips(); // ensure Pro Tips are loaded with the project
            showToast('Saved project loaded!', 'success');
        }, 100);
    }

    // Expose Calculation History actions globally
    window.loadFromHistory = function(id) {
        const item = calculationHistory.find(i => i.id === id);
        if (!item) return showToast('History item not found.');
        loadProjectData(item);
    };

    window.deleteFromHistory = async function(id) {
        const ok = await (window.uiConfirm ? uiConfirm('Delete this history entry? This cannot be undone.', 'Delete History Item') : Promise.resolve(true));
        if (!ok) return;
        calculationHistory = calculationHistory.filter(i => i.id !== id);
        localStorage.setItem('concreteCalculatorHistory', JSON.stringify(calculationHistory));
        updateHistoryDisplay();
        showToast('History item deleted!', 'success');
    };

    // Expose Saved Projects actions globally
    window.loadSavedProject = function(id) {
        const proj = savedProjects.find(p => p.id === id);
        if (!proj) return showToast('Saved project not found.');
        loadProjectData(proj.data);
    };

    window.renameSavedProject = async function(id) {
        const proj = savedProjects.find(p => p.id === id);
        if (!proj) return showToast('Saved project not found.');
        const newName = await window.uiPrompt({ title: 'Rename Project', message: 'Enter a new name', defaultValue: proj.name, placeholder: 'Project name' });
        if (!newName) return;
        proj.name = newName.trim();
        persistSavedProjects();
        renderSavedProjectsBar();
        showToast('Project renamed!', 'success');
    };

    window.deleteSavedProject = async function(id) {
        const proj = savedProjects.find(p => p.id === id);
        const ok = await (window.uiConfirm ? uiConfirm(`Delete saved project "${proj?.name || id}"? This cannot be undone.`, 'Delete Saved Project') : Promise.resolve(true));
        if (!ok) return;
        savedProjects = savedProjects.filter(p => p.id !== id);
        persistSavedProjects();
        renderSavedProjectsBar();
        showToast('Saved project deleted!', 'success');
    }

    // Wire up refresh button for Saved Projects bar
    const refreshBtn = document.getElementById('refreshSavedProjects');
    if (refreshBtn) refreshBtn.addEventListener('click', renderSavedProjectsBar);

    // Initialize all enhanced features
    function initializeEnhancedFeatures() {
        initTabs();
        initFieldToggles();
        
        // Set normal mode as default and ensure active tab shows correctly
        isAdvancedMode = false;
        const advancedTab = document.querySelector('[data-tab="advanced"]');
        const normalTab = document.querySelector('[data-tab="normal"]');
        const advancedContent = document.getElementById('advanced-tab');
        const normalContent = document.getElementById('normal-tab');
        
        if (advancedTab && normalTab && advancedContent && normalContent) {
            // Remove active from advanced
            advancedTab.classList.remove('active');
            advancedContent.classList.remove('active');
            
            // Add active to normal
            normalTab.classList.add('active');
            normalContent.classList.add('active');
        }
        
        updateFieldVisibility();
        updateHistoryDisplay();
        init3DControls();
        setupEnhancedExportButtons();
        const compareBtn = document.getElementById('compareBtn');
        if (compareBtn) compareBtn.addEventListener('click', showComparison);
    }

    // Initialize all enhanced features
    initializeEnhancedFeatures();

    // Render saved projects bar on load
    renderSavedProjectsBar();

    // Update dimension labels based on project type for both modes
    function updateLabels(mode) {
        const projectTypeElement = mode === 'advanced' ? 
            document.getElementById('projectTypeAdv') : 
            document.getElementById('projectType');
            
        const suffix = mode === 'advanced' ? 'Adv' : '';
        
        const labels = {
            'slab': { length: 'Length', width: 'Width', thickness: 'Thickness', waste: 'Waste Factor' },
            'square-footing': { length: 'Length', width: 'Width', thickness: 'Depth', waste: 'Waste Factor' },
            'wall': { length: 'Length', width: 'Height', thickness: 'Thickness', waste: 'Waste Factor' },
            'hole': { length: 'Length', width: 'Width', thickness: 'Depth', waste: 'Waste Factor' },
            'column': { length: 'Height', width: 'Diameter', thickness: 'Wall Thickness', waste: 'Waste Factor' },
            'round-footing': { length: 'Depth', width: 'Diameter', thickness: 'Base Thickness', waste: 'Waste Factor' },
            'circular-slab': { width: 'Diameter', thickness: 'Thickness', waste: 'Waste Factor' },
            'tube': { length: 'Length', width: 'Outer Diameter', thickness: 'Wall Thickness', waste: 'Waste Factor' },
            'curb-gutter': { length: 'Length', width: 'Curb Width', thickness: 'Gutter Width', waste: 'Waste Factor' },
            'barrier': { length: 'Length', width: 'Height', thickness: 'Thickness', waste: 'Waste Factor' },
            'footing': { length: 'Length', width: 'Width', thickness: 'Depth', waste: 'Waste Factor' },
            'beam': { length: 'Length', width: 'Width', thickness: 'Height', waste: 'Waste Factor' },
            'stairs': { length: 'Number of Steps', width: 'Width', thickness: 'Thickness', waste: 'Waste Factor' },
            'retaining-wall': { length: 'Length', width: 'Height', thickness: 'Thickness', waste: 'Waste Factor' },
            'driveway': { length: 'Length', width: 'Width', thickness: 'Thickness', waste: 'Waste Factor' },
            'foundation': { length: 'Length', width: 'Width', thickness: 'Depth', waste: 'Waste Factor' },
            'pool': { length: 'Length', width: 'Width', thickness: 'Depth', waste: 'Waste Factor' },
            'patio': { length: 'Length', width: 'Width', thickness: 'Thickness', waste: 'Waste Factor' },
            'sidewalk': { length: 'Length', width: 'Width', thickness: 'Thickness', waste: 'Waste Factor' },
            'curb': { length: 'Length', width: 'Combined Width', thickness: 'Gutter Depth', waste: 'Waste Factor' },
            'culvert': { length: 'Length', width: 'Interior Diameter', thickness: 'Wall Thickness', waste: 'Waste Factor' },
            'bridge': { length: 'Span', width: 'Width', thickness: 'Deck Thickness', waste: 'Waste Factor' }
        };
        
        const selectedLabels = labels[projectTypeElement.value];
        if (selectedLabels) {
            document.querySelector(`label[for="length${suffix}"]`).textContent = selectedLabels.length;
            document.querySelector(`label[for="width${suffix}"]`).textContent = selectedLabels.width;
            document.querySelector(`label[for="thickness${suffix}"]`).textContent = selectedLabels.thickness;
        }
        
        updateProjectVisual(mode);
    }

    // Add project visual update function
    function updateProjectVisual(mode) {
        const projectTypeElement = mode === 'advanced' ? 
            document.getElementById('projectTypeAdv') : 
            document.getElementById('projectType');
            
        const diagramElement = mode === 'advanced' ? 
            document.getElementById('projectDiagramAdv') : 
            document.getElementById('projectDiagram');
            
        const descriptionElement = mode === 'advanced' ? 
            document.getElementById('projectDescriptionAdv') : 
            document.getElementById('projectDescription');
        
        const projectType = projectTypeElement.value;
        
        const projectVisuals = {
            'slab': {
                shape: '<div class="diagram-shape"><div class="slab-shape"><div class="dimension-label label-length">L</div><div class="dimension-label label-width">W</div><div class="dimension-label label-thickness">T</div></div></div>',
                description: '<h4>Concrete Slab</h4><p>Measure the area to be covered:</p><ul><li><strong>Length:</strong> Distance from one end to the other</li><li><strong>Width:</strong> Distance from side to side</li><li><strong>Thickness:</strong> Depth of concrete (typically 4-6 inches)</li></ul>'
            },
            'square-footing': {
                shape: '<div class="diagram-shape"><div class="square-footing-shape"><div class="dimension-label label-length">L</div><div class="dimension-label label-width">W</div><div class="dimension-label label-thickness">D</div></div></div>',
                description: '<h4>Square Footing</h4><p>Measure the square foundation base:</p><ul><li><strong>Length:</strong> Length of square footing</li><li><strong>Width:</strong> Width of square footing</li><li><strong>Depth:</strong> How deep the footing extends (typically 18-36 inches)</li></ul>'
            },
            'wall': {
                shape: '<div class="diagram-shape"><div class="wall-shape"><div class="dimension-label label-length" style="left: -40px; top: 40px; transform: rotate(90deg);">H</div><div class="dimension-label label-thickness" style="top: 10px; left: 25px;">T</div></div></div>',
                description: '<h4>Wall</h4><p>Measure the wall dimensions:</p><ul><li><strong>Length:</strong> Total length of the wall</li><li><strong>Height:</strong> Height from base to top</li><li><strong>Thickness:</strong> Wall thickness (typically 6-12 inches)</li></ul>'
            },
            'hole': {
                shape: '<div class="diagram-shape"><div class="hole-shape"><div class="hole-interior"></div><div class="dimension-label label-length">L</div><div class="dimension-label label-width">W</div><div class="dimension-label label-thickness">D</div></div></div>',
                description: '<h4>Hole (Excavation)</h4><p>Calculate volume of excavated material:</p><ul><li><strong>Length:</strong> Length of excavation</li><li><strong>Width:</strong> Width of excavation</li><li><strong>Depth:</strong> Depth of excavation</li></ul>'
            },
            'column': {
                shape: '<div class="diagram-shape"><div class="column-shape"><div class="dimension-label label-length" style="left: -40px;">H</div><div class="dimension-label label-width" style="bottom: -25px;">⌀</div></div></div>',
                description: '<h4>Column</h4><p>Measure the cylindrical column:</p><ul><li><strong>Height:</strong> Total height from base to top</li><li><strong>Diameter:</strong> Width across the circular cross-section</li><li><strong>Wall Thickness:</strong> If hollow, thickness of concrete wall</li></ul>'
            },
            'round-footing': {
                shape: '<div class="diagram-shape"><div class="round-footing-shape"><div class="dimension-label label-length" style="left: -40px;">D</div><div class="dimension-label label-width" style="bottom: -25px;">⌀</div></div></div>',
                description: '<h4>Round Footing</h4><p>Measure the circular footing:</p><ul><li><strong>Depth:</strong> How deep the footing extends</li><li><strong>Diameter:</strong> Width across the circular footing</li><li><strong>Base Thickness:</strong> Thickness of the footing base</li></ul>'
            },
            'circular-slab': {
                shape: '<div class="diagram-shape"><div class="circular-slab-shape"><div class="dimension-label label-width" style="bottom: -25px;">⌀</div><div class="dimension-label label-thickness" style="top: -25px;">T</div></div></div>',
                description: '<h4>Circular Slab</h4><p>Measure the round slab:</p><ul><li><strong>Not Used:</strong> Length parameter not needed</li><li><strong>Diameter:</strong> Width across the circular slab</li><li><strong>Thickness:</strong> Depth of concrete slab</li></ul>'
            },
            'tube': {
                shape: '<div class="diagram-shape"><div class="tube-shape"><div class="tube-interior"></div><div class="dimension-label label-length">L</div><div class="dimension-label label-width" style="bottom: -25px;">⌀</div><div class="dimension-label label-thickness" style="right: -35px;">T</div></div></div>',
                description: '<h4>Tube</h4><p>Measure the hollow tube:</p><ul><li><strong>Length:</strong> Length of tube</li><li><strong>Outer Diameter:</strong> Outside diameter of tube</li><li><strong>Wall Thickness:</strong> Thickness of tube wall</li></ul>'
            },
            'curb-gutter': {
                shape: '<div class="diagram-shape"><div class="curb-gutter-shape"><div class="curb-section"></div><div class="gutter-section"></div><div class="dimension-label label-length">L</div><div class="dimension-label label-width" style="right: -40px;">CW</div><div class="dimension-label label-thickness" style="bottom: -25px;">GW</div></div></div>',
                description: '<h4>Curb and Gutter</h4><p>Measure curb and gutter system:</p><ul><li><strong>Length:</strong> Total length of curb and gutter</li><li><strong>Curb Width:</strong> Width of curb section (inches)</li><li><strong>Gutter Width:</strong> Width of gutter section (inches)</li></ul>'
            },
            'barrier': {
                shape: '<div class="diagram-shape"><div class="barrier-shape"><div class="dimension-label label-length">L</div><div class="dimension-label label-width" style="right: -40px;">H</div><div class="dimension-label label-thickness" style="bottom: -25px;">T</div></div></div>',
                description: '<h4>Barrier</h4><p>Measure the traffic barrier:</p><ul><li><strong>Length:</strong> Total length of barrier</li><li><strong>Height:</strong> Height of barrier</li><li><strong>Thickness:</strong> Thickness of barrier wall</li></ul>'
            },
            'footing': {
                shape: '<div class="diagram-shape"><div class="slab-shape"><div class="dimension-label label-length">L</div><div class="dimension-label label-width">W</div><div class="dimension-label label-thickness">D</div></div></div>',
                description: '<h4>Foundation Footing</h4><p>Measure the foundation base:</p><ul><li><strong>Length:</strong> Total length of footing</li><li><strong>Width:</strong> Width of footing base</li><li><strong>Depth:</strong> How deep the footing extends (typically 12-24 inches)</li></ul>'
            },
            'beam': {
                shape: '<div class="diagram-shape"><div class="beam-shape"><div class="dimension-label label-length">L</div><div class="dimension-label label-width">W</div><div class="dimension-label label-thickness">H</div></div></div>',
                description: '<h4>Concrete Beam</h4><p>Measure the structural beam:</p><ul><li><strong>Length:</strong> Span of the beam</li><li><strong>Width:</strong> Cross-sectional width</li><li><strong>Height:</strong> Depth of the beam cross-section</li></ul>'
            },
            'stairs': {
                shape: '<div class="diagram-shape"><div class="stairs-shape"><div class="step"></div><div class="step"></div><div class="step"></div><div class="step"></div><div class="dimension-label label-width" style="right: -40px; top: 20px;">W</div></div></div>',
                description: '<h4>Concrete Stairs</h4><p>Calculate for stepped structure:</p><ul><li><strong>Number of Steps:</strong> Total count of individual steps</li><li><strong>Width:</strong> Width of the staircase</li><li><strong>Thickness:</strong> Thickness of each tread (typically 6-8 inches)</li></ul>'
            },
            'retaining-wall': {
                shape: '<div class="diagram-shape"><div class="wall-shape"><div class="dimension-label label-length" style="left: -40px; top: 40px; transform: rotate(90deg);">H</div><div class="dimension-label label-thickness" style="top: 10px; left: 25px;">T</div></div></div>',
                description: '<h4>Retaining Wall</h4><p>Measure the wall dimensions:</p><ul><li><strong>Length:</strong> Total length of the wall</li><li><strong>Height:</strong> Height from base to top</li><li><strong>Thickness:</strong> Wall thickness (typically 8-12 inches)</li></ul>'
            },
            'driveway': {
                shape: '<div class="diagram-shape"><div class="slab-shape"><div class="dimension-label label-length">L</div><div class="dimension-label label-width">W</div><div class="dimension-label label-thickness">T</div></div></div>',
                description: '<h4>Concrete Driveway</h4><p>Measure the driveway area:</p><ul><li><strong>Length:</strong> Distance from street to garage</li><li><strong>Width:</strong> Width of driveway</li><li><strong>Thickness:</strong> Depth of concrete (typically 4-6 inches)</li></ul>'
            },
            'foundation': {
                shape: '<div class="diagram-shape"><div class="foundation-shape"><div class="foundation-wall"></div><div class="foundation-base"></div><div class="dimension-label label-length" style="bottom: -25px;">L</div><div class="dimension-label label-width" style="right: -30px; top: 30px;">W</div></div></div>',
                description: '<h4>Foundation</h4><p>Calculate foundation and footing:</p><ul><li><strong>Length:</strong> Length of foundation</li><li><strong>Width:</strong> Width of foundation</li><li><strong>Depth:</strong> Combined depth of wall and footing</li></ul>'
            },
            'pool': {
                shape: '<div class="diagram-shape"><div class="pool-shape"><div class="dimension-label label-length">L</div><div class="dimension-label label-width">W</div></div></div>',
                description: '<h4>Swimming Pool</h4><p>Measure pool dimensions:</p><ul><li><strong>Length:</strong> Length of pool</li><li><strong>Width:</strong> Width of pool</li><li><strong>Thickness:</strong> Average depth of pool</li></ul>'
            },
            'patio': {
                shape: '<div class="diagram-shape"><div class="slab-shape"><div class="dimension-label label-length">L</div><div class="dimension-label label-width">W</div><div class="dimension-label label-thickness">T</div></div></div>',
                description: '<h4>Concrete Patio</h4><p>Measure the patio area:</p><ul><li><strong>Length:</strong> Length of patio</li><li><strong>Width:</strong> Width of patio</li><li><strong>Thickness:</strong> Concrete thickness (typically 4 inches)</li></ul>'
            },
            'sidewalk': {
                shape: '<div class="diagram-shape"><div class="slab-shape"><div class="dimension-label label-length">L</div><div class="dimension-label label-width">W</div><div class="dimension-label label-thickness">T</div></div></div>',
                description: '<h4>Sidewalk</h4><p>Measure the sidewalk:</p><ul><li><strong>Length:</strong> Total length of sidewalk</li><li><strong>Width:</strong> Width of walkway (typically 4-5 feet)</li><li><strong>Thickness:</strong> Concrete thickness (typically 4 inches)</li></ul>'
            },
            'curb': {
                shape: '<div class="diagram-shape"><div class="curb-shape"><div class="curb-main"></div><div class="curb-gutter"></div><div class="dimension-label label-length">L</div><div class="dimension-label label-width" style="right: -40px;">W</div><div class="dimension-label label-thickness" style="bottom: -25px;">D</div></div></div>',
                description: '<h4>Curb & Gutter</h4><p>Measure curb and gutter:</p><ul><li><strong>Length:</strong> Total length of curb</li><li><strong>Combined Width:</strong> Total width of curb and gutter</li><li><strong>Gutter Depth:</strong> Depth of gutter section</li></ul>'
            },
            'culvert': {
                shape: '<div class="diagram-shape"><div class="culvert-shape"><div class="dimension-label label-length" style="left: -40px;">L</div><div class="dimension-label label-width" style="bottom: -25px;">⌀</div><div class="dimension-label label-thickness" style="right: -35px; top: 10px;">T</div></div></div>',
                description: '<h4>Culvert</h4><p>Measure pipe culvert:</p><ul><li><strong>Length:</strong> Length of culvert pipe</li><li><strong>Interior Diameter:</strong> Inside diameter of pipe</li><li><strong>Wall Thickness:</strong> Thickness of concrete pipe wall</li></ul>'
            },
            'bridge': {
                shape: '<div class="diagram-shape"><div class="bridge-shape"><div class="bridge-support"></div><div class="bridge-support"></div><div class="bridge-support"></div><div class="bridge-support"></div><div class="bridge-deck"></div><div class="dimension-label label-length">L</div><div class="dimension-label label-width" style="right: -30px;">W</div><div class="dimension-label label-thickness" style="top: -25px;">T</div></div></div>',
                description: '<h4>Bridge Deck</h4><p>Measure bridge deck:</p><ul><li><strong>Span:</strong> Length of bridge span</li><li><strong>Width:</strong> Width of deck</li><li><strong>Deck Thickness:</strong> Thickness of concrete deck (typically 8-12 inches)</li></ul>'
            }
        };
        
        const visual = projectVisuals[projectType];
        if (visual) {
            diagramElement.innerHTML = visual.shape;
            descriptionElement.innerHTML = visual.description;
        } else {
            diagramElement.innerHTML = '<div class="diagram-shape"><div class="slab-shape"></div></div>';
            descriptionElement.innerHTML = 'Select a project type to see the measurement guide';
        }
    }

    // Add event listeners for both project type selectors
    document.getElementById('projectType').addEventListener('change', () => {
        updateLabels('normal');
        updateFieldVisibility();
    });
    document.getElementById('projectTypeAdv').addEventListener('change', () => {
        updateLabels('advanced');
        updateFieldVisibility();
    });

    // Initialize visuals on page load
    updateLabels('normal');
    updateLabels('advanced');

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

    // Attach handler to Start New Calculation (moved to top)
    if (newCalcBtn) newCalcBtn.addEventListener('click', async () => {
        if (!(await window.uiConfirm('Start a new calculation? This will clear the form.', 'New Calculation'))) return;
        isAdvancedMode = false;
        document.querySelector('[data-tab="normal"]').click();
        ['length', 'width', 'thickness', 'waste'].forEach(id => {
            ['','Adv'].forEach(s => {
                const el = document.getElementById(id + s);
                if (el) {
                    el.value = (id === 'waste') ? 10 : '';
                }
            });
        });
        ['imperial', 'imperialAdv'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.checked = true;
        });
        [['concreteStrength', '3000'], ['reinforcement', 'none'], ['laborRate', '75'], ['cementPrice', '4.50'], ['additives', 'none'], ['finishType', 'broom']].forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el) el.value = val;
        });
        ['includeLength', 'includeWidth', 'includeThickness', 'includeWaste'].forEach(base => {
            ['','Adv'].forEach(s => {
                const t = document.getElementById(base + s);
                if (t) t.checked = true;
            });
        });
        ['includeStrength', 'includeReinforcement', 'includeLaborRate', 'includeCementPrice', 'includeAdditives', 'includeFinishType'].forEach(id => {
            const t = document.getElementById(id);
            if (t) t.checked = true;
        });
        currentCalculationData = null;
        rotationAngle = 0;
        if (materialsChart) {
            materialsChart.destroy();
            materialsChart = null;
        }
        if (costsChart) {
            costsChart.destroy();
            costsChart = null;
        }
        ['volumeInfo', 'materialsInfo', 'costInfo', 'projectInfo', 'dimLength', 'dimWidth', 'dimThickness', 'dimVolume'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '-';
        });
        const tips = document.getElementById('dynamicTips');
        if (tips) tips.innerHTML = '';
        const c = document.getElementById('threeDView');
        if (c) {
            const x = c.getContext('2d');
            x.clearRect(0, 0, c.width, c.height);
        }
        localStorage.removeItem('concreteCalculatorFormData');
        updateFieldVisibility();
        updateLabels('normal');
        showToast('Ready for a new calculation!', 'success');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.getElementById('saveProjectBtn').addEventListener('click', async () => {
        if (!currentCalculationData) {
            showToast('No data to save. Please perform a calculation first.');
            return;
        }
        const data = currentCalculationData;
        const defaultName = `${data.projectType}-${new Date().toISOString().slice(0,16).replace('T',' ')}`;
        const projectName = await window.uiPrompt({ title: 'Save Project', message: 'Enter project name', defaultValue: defaultName, placeholder: 'e.g., Garage Slab' });
        if (!projectName) return;
        saveProjectToStorage(projectName.trim(), data);
        showToast('Project saved to your list!', 'success');
    });
});