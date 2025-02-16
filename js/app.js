// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize date picker to today's date
    document.getElementById('date').valueAsDate = new Date();

    // Load entries from localStorage
    let entries = {};
    try {
        const savedEntries = localStorage.getItem('calorieEntries');
        entries = savedEntries ? JSON.parse(savedEntries) : {};
    } catch (error) {
        console.error('Error loading saved entries:', error);
        showToast('Error loading saved entries', 'error');
    }

    // Load and parse food data
    async function loadFoodData() {
        try {
            const response = await fetch('data/food_data.csv');
            const csvText = await response.text();
            
            // Parse CSV using Papa Parse
            Papa.parse(csvText, {
                header: true,
                dynamicTyping: true,
                complete: function(results) {
                    const foodData = results.data;
                    populateFoodSelect(foodData);
                },
                error: function(error) {
                    console.error('Error parsing CSV:', error);
                    showToast('Error loading food data', 'error');
                }
            });
        } catch (error) {
            console.error('Error loading CSV:', error);
            showToast('Error loading food data', 'error');
        }
    }

    // Populate food select dropdown
    function populateFoodSelect(foodData) {
        const select = document.getElementById('foodSelect');
        select.innerHTML = '<option value="">-- Select a food item --</option>';
        
        // Group foods by category
        const groupedFoods = foodData.reduce((acc, food) => {
            if (!acc[food.category]) {
                acc[food.category] = [];
            }
            acc[food.category].push(food);
            return acc;
        }, {});

        // Create option groups and options
        Object.entries(groupedFoods).forEach(([category, foods]) => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = category;
            
            foods.forEach(food => {
                const option = document.createElement('option');
                option.value = JSON.stringify(food);
                option.textContent = `${food.name} (${food.serving}) - ${food.calories} cal`;
                optgroup.appendChild(option);
            });
            
            select.appendChild(optgroup);
        });
    }

    window.selectFood = function() {
        const selectedOption = document.getElementById('foodSelect').value;
        if (selectedOption) {
            const foodData = JSON.parse(selectedOption);
            document.getElementById('food').value = foodData.name;
            document.getElementById('calories').value = foodData.calories;
            updateNutritionInfo(foodData);
        }
    }

    function updateNutritionInfo(foodData) {
        const nutritionCard = document.getElementById('nutritionInfo');
        nutritionCard.innerHTML = `
            <div class="nutrition-info">
                <h4>Nutrition Facts (${foodData.serving})</h4>
                <div class="nutrition-grid">
                    <div class="nutrition-item">
                        <span class="label">Calories</span>
                        <span class="value">${foodData.calories}</span>
                    </div>
                    <div class="nutrition-item">
                        <span class="label">Protein</span>
                        <span class="value">${foodData.protein}g</span>
                    </div>
                    <div class="nutrition-item">
                        <span class="label">Carbs</span>
                        <span class="value">${foodData.carbs}g</span>
                    </div>
                    <div class="nutrition-item">
                        <span class="label">Fat</span>
                        <span class="value">${foodData.fat}g</span>
                    </div>
                    <div class="nutrition-item">
                        <span class="label">Fiber</span>
                        <span class="value">${foodData.fiber}g</span>
                    </div>
                </div>
            </div>
        `;
    }

    window.addEntry = function(event) {
        event.preventDefault();

        const date = document.getElementById('date').value;
        const food = document.getElementById('food').value.trim();
        const calories = parseInt(document.getElementById('calories').value);

        // Validate inputs
        if (!date || isNaN(new Date(date).getTime())) {
            showToast('Please enter a valid date', 'error');
            return;
        }

        if (!food) {
            showToast('Please enter a food item', 'error');
            return;
        }

        if (calories <= 0 || isNaN(calories)) {
            showToast('Please enter a valid calorie amount', 'error');
            return;
        }

        // Get nutrition info if available
        let nutritionInfo = {};
        const selectedOption = document.getElementById('foodSelect').value;
        if (selectedOption) {
            nutritionInfo = JSON.parse(selectedOption);
        }

        // Initialize array for this date if it doesn't exist
        if (!entries[date]) {
            entries[date] = [];
        }

        // Add new entry
        const newEntry = {
            food,
            calories,
            id: Date.now(),
            ...nutritionInfo
        };

        try {
            entries[date].push(newEntry);
            localStorage.setItem('calorieEntries', JSON.stringify(entries));
            
            // Clear form
            document.getElementById('food').value = '';
            document.getElementById('calories').value = '';
            document.getElementById('foodSelect').value = '';
            document.getElementById('nutritionInfo').innerHTML = '';
            
            showToast('Entry added successfully!');
            displayEntries();
        } catch (error) {
            console.error('Storage error:', error);
            showToast('Failed to save entry. Storage might be full.', 'error');
        }
    }

    window.deleteEntry = function(date, id) {
        entries[date] = entries[date].filter(entry => entry.id !== id);
        localStorage.setItem('calorieEntries', JSON.stringify(entries));
        showToast('Entry deleted');
        displayEntries();
    }

    function displayEntries() {
        const date = document.getElementById('date').value;
        const entriesList = document.getElementById('entriesList');
        entriesList.innerHTML = '';

        if (entries[date] && entries[date].length > 0) {
            let totalNutrition = {
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
                fiber: 0
            };

            entries[date].forEach(entry => {
                // Update totals
                totalNutrition.calories += entry.calories || 0;
                totalNutrition.protein += entry.protein || 0;
                totalNutrition.carbs += entry.carbs || 0;
                totalNutrition.fat += entry.fat || 0;
                totalNutrition.fiber += entry.fiber || 0;

                const entryDiv = document.createElement('div');
                entryDiv.className = 'entry';
                entryDiv.innerHTML = `
                    <div class="entry-info">
                        <div class="entry-food">${escapeHtml(entry.food)}</div>
                        <div class="entry-calories">${entry.calories} calories</div>
                    </div>
                    <button class="btn btn-danger" onclick="deleteEntry('${date}', ${entry.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
                entriesList.appendChild(entryDiv);
            });

            // Update daily summary
            document.getElementById('totalCalories').textContent = totalNutrition.calories.toLocaleString();
            updateDailyNutritionSummary(totalNutrition);
        } else {
            entriesList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No entries for this date</p>';
            document.getElementById('totalCalories').textContent = '0';
            document.getElementById('dailyNutritionSummary').innerHTML = '';
        }
    }

    function updateDailyNutritionSummary(totals) {
        const summaryDiv = document.getElementById('dailyNutritionSummary');
        summaryDiv.innerHTML = `
            <div class="nutrition-grid" style="margin-top: 1rem;">
                <div class="nutrition-item">
                    <span class="label">Total Protein</span>
                    <span class="value">${totals.protein.toFixed(1)}g</span>
                </div>
                <div class="nutrition-item">
                    <span class="label">Total Carbs</span>
                    <span class="value">${totals.carbs.toFixed(1)}g</span>
                </div>
                <div class="nutrition-item">
                    <span class="label">Total Fat</span>
                    <span class="value">${totals.fat.toFixed(1)}g</span>
                </div>
                <div class="nutrition-item">
                    <span class="label">Total Fiber</span>
                    <span class="value">${totals.fiber.toFixed(1)}g</span>
                </div>
            </div>
        `;
    }

    function showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.style.display = 'block';
        toast.style.backgroundColor = type === 'success' ? 'var(--success-color)' : 'var(--danger-color)';

        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }

    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Add event listener for date changes
    document.getElementById('date').addEventListener('change', displayEntries);

    // Initial load
    loadFoodData();
    displayEntries();
});