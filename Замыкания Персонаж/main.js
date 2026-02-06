document.addEventListener("DOMContentLoaded", () => {
    let waterUI = document.querySelector("#water > .count");
    let foodUI = document.querySelector("#food > .count");
    let energyUI = document.querySelector("#energy > .count");
    let pauseButton = document.querySelector("#pause");
    let characterNameUI = document.querySelector("#characterName");
    let eventLogUI = document.querySelector("#eventLog");
    const drink = document.querySelector("#drink");
    const eat = document.querySelector("#eat");
    const rest = document.querySelector("#rest");
    const alertDiv = document.querySelector(".alert");
    const ANATOLY_CONFIG = {
        name: "Анатолий",
        stats: { water: 100, food: 100, energy: 100 },
        decay: { water: 8, food: 7, energy: 6 },
        actions: { drink: 50, eat: 50, rest: 50 },
        conditionsEffects: {
            water: 2.0,
            energy: 2.0,
            food: 1
        }
    };
    const eventLogger = (function() {
        const MAX_LOG_ENTRIES = 10;
        let logEntries = [];
        return {
            addEntry: function(message, type = 'info') {
                const time = new Date().toLocaleTimeString();
                const entry = {
                    message,
                    time,
                    type,
                    timestamp: Date.now()
                };
                logEntries.unshift(entry);
                if (logEntries.length > MAX_LOG_ENTRIES) {
                    logEntries.pop();
                }
                this.updateUI();
                console.log(`[Лог] ${message} (${time})`);
            },
            updateUI: function() {
                if (!eventLogUI) return;
                eventLogUI.innerHTML = '';
                logEntries.forEach(entry => {
                    const li = document.createElement('li');
                    li.className = entry.type;
                    li.innerHTML = `
                        <span>${entry.message}</span>
                        <span class="time">${entry.time}</span>
                    `;
                    eventLogUI.appendChild(li);
                });
            },
            clear: function() {
                logEntries = [];
                this.updateUI();
            },
            getEntries: function() {
                return [...logEntries];
            }
        };
    })();
    const createCharacter = (config, logger) => {
        let stats = {
            water: config.stats.water,
            food: config.stats.food,
            energy: config.stats.energy
        };
        let isDead = false;
        let isPaused = false;
        const clamp = (value) => Math.max(0, Math.min(100, value));
        const drink = () => {
            if (isDead || isPaused) return 0;
            const oldValue = stats.water;
            stats.water = clamp(stats.water + config.actions.drink);
            return Math.floor(stats.water - oldValue);
        };
        const eat = () => {
            if (isDead || isPaused) return 0;
            const oldValue = stats.food;
            stats.food = clamp(stats.food + config.actions.eat);
            return Math.floor(stats.food - oldValue);
        };
        const rest = () => {
            if (isDead || isPaused) return 0;
            const oldValue = stats.energy;
            stats.energy = clamp(stats.energy + config.actions.rest);
            return Math.floor(stats.energy - oldValue);
        };
        return {
            getStats: () => ({ 
                water: Math.floor(stats.water), 
                food: Math.floor(stats.food), 
                energy: Math.floor(stats.energy) 
            }),
            performAction: (actionType) => {
                if (isDead || isPaused) return 0;
                switch(actionType) {
                    case 'drink':
                        return drink();
                    case 'eat':
                        return eat();
                    case 'rest':
                        return rest();
                    default:
                        return 0;
                }
            },
            tick: () => {
                if (isDead || isPaused) return;
                let waterDecay = config.decay.water;
                let foodDecay = config.decay.food;
                let energyDecay = config.decay.energy;
                let effects = [];
                if (stats.food < 50) {
                    waterDecay *= config.conditionsEffects.water;
                }
                if (stats.water < 20) {
                    energyDecay *= config.conditionsEffects.energy;
                }
                if (stats.energy < 100) {
                    foodDecay *= config.conditionsEffects.food;
                }
                const oldWater = stats.water;
                const oldFood = stats.food;
                const oldEnergy = stats.energy;
                stats.water = clamp(stats.water - waterDecay);
                stats.food = clamp(stats.food - foodDecay);
                stats.energy = clamp(stats.energy - energyDecay);
                if (logger) {
                    const waterChange = Math.floor(oldWater - stats.water);
                    const foodChange = Math.floor(oldFood - stats.food);
                    const energyChange = Math.floor(oldEnergy - stats.energy);
                    let message = `Тик: вода -${waterChange}, еда -${foodChange}, энергия -${energyChange}`;
                    if (effects.length > 0) {
                        message += ` [${effects.join(', ')}]`;
                    }
                    logger.addEntry(message, 'tick');
                }
            },
            isDead: () => {
                return isDead || stats.water <= 0 || stats.food <= 0 || stats.energy <= 0;
            },
            setDead: () => {
                isDead = true;
            },
            setPaused: (paused) => {
                isPaused = paused;
            }
        };
    };
    const anatoly = createCharacter(ANATOLY_CONFIG, eventLogger);
    characterNameUI.textContent = ANATOLY_CONFIG.name;
    let intervalUpdate;
    let gamePaused = false;
    let gameDead = false;
    let tickCounter = 0;
    alertDiv.style.display = "none";
    eventLogger.addEntry(`Персонаж "${ANATOLY_CONFIG.name}" создан`, 'info');
    pauseButton.addEventListener('click', (event) => {
        const action = gamePaused ? 'Продолжить' : 'Пауза';
        eventLogger.addEntry(`Игра поставлена на ${action.toLowerCase()}`, 'pause');
        if (gameDead) return;
        gamePaused = !gamePaused;
        anatoly.setPaused(gamePaused);
        if (gamePaused) {
            clearInterval(intervalUpdate);
            pauseButton.style.backgroundColor = "#f0f0f0";
            pauseButton.style.borderColor = "#999";
            pauseButton.style.opacity = "0.8";
        } else {
            updateUI();
            pauseButton.style.backgroundColor = "white";
            pauseButton.style.borderColor = "#ddd";
            pauseButton.style.opacity = "1";
        }
    });
    drink.addEventListener('click', (event) => {
        if (gamePaused || gameDead) return;
        const oldWater = anatoly.getStats().water;
        const added = anatoly.performAction('drink');
        if (added > 0) {
            const newWater = anatoly.getStats().water;
            waterUI.textContent = newWater;
            validation(waterUI);
            eventLogger.addEntry(`Выпил воды: +${added} (теперь: ${newWater})`, 'drink');
        }
    });
    eat.addEventListener('click', (event) => {
        if (gamePaused || gameDead) return;
        const oldFood = anatoly.getStats().food;
        const added = anatoly.performAction('eat');
        if (added > 0) {
            const newFood = anatoly.getStats().food;
            foodUI.textContent = newFood;
            validation(foodUI);
            eventLogger.addEntry(`Поел: +${added} (теперь: ${newFood})`, 'eat');
        }
    });
    rest.addEventListener('click', (event) => {
        if (gamePaused || gameDead) return;
        const oldEnergy = anatoly.getStats().energy;
        const added = anatoly.performAction('rest');
        if (added > 0) {
            const newEnergy = anatoly.getStats().energy;
            energyUI.textContent = newEnergy;
            validation(energyUI);
            eventLogger.addEntry(`Отдохнул: +${added} (теперь: ${newEnergy})`, 'rest');
        }
    });
    const stats = anatoly.getStats();
    waterUI.textContent = stats.water;
    foodUI.textContent = stats.food;
    energyUI.textContent = stats.energy;
    validation(waterUI);
    validation(foodUI);
    validation(energyUI);
    function updateUI() {
        if (intervalUpdate) {
            clearInterval(intervalUpdate);
        }       
        intervalUpdate = setInterval(() => {
            tickCounter++;
            anatoly.tick();
            const stats = anatoly.getStats();
            waterUI.textContent = stats.water;
            foodUI.textContent = stats.food;
            energyUI.textContent = stats.energy;
            validation(waterUI);
            validation(foodUI);
            validation(energyUI);
            validationDeath();
        }, 350);
    }
    function validation(element) {
        element.style.color = Number(element.textContent) <= 30 ? "red" : "#2c3e50";
    }
    function validationDeath() {
        if (anatoly.isDead() && !gameDead) {
            gameDead = true;
            anatoly.setDead();
            clearInterval(intervalUpdate);
            [drink, eat, rest].forEach(btn => {
                btn.disabled = true;
                btn.style.opacity = "0.5";
                btn.style.cursor = "not-allowed";
            });
            alertDiv.style.display = "block";
            alertDiv.textContent = `${ANATOLY_CONFIG.name} умер!`;
            eventLogger.addEntry(`Персонаж "${ANATOLY_CONFIG.name}" умер!`, 'info');
            if (confirm("Начать заново?")) {
                location.reload();
            }
        }
    }
    updateUI();
});