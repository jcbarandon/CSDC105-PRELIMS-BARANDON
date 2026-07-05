//API IS FROM POKEAPI.CO, A FREE API FOR POKEMON DATA
//THIS PROJECT IS A SIMPLE POKEMON SEARCH APP WHERE YOU CAN SEARCH FOR A POKEMON AND DISPLAYS ITS SPRITE AND ABILITIES
//THIS PROJECT USES FETCH API AND ASYNC AWAIT FOR FETCHING DATA FROM THE API
//MADE BY: JOE CARLO JR O. BARANDON

//colors per pokemon type, para sa type badges
const TYPE_COLORS = {
    normal: "#A8A878", fire: "#F08030", water: "#6890F0", electric: "#F8D030",
    grass: "#78C850", ice: "#98D8D8", fighting: "#C03028", poison: "#A040A0",
    ground: "#E0C068", flying: "#A890F0", psychic: "#F85888", bug: "#A8B820",
    rock: "#B8A038", ghost: "#705898", dragon: "#7038F8", dark: "#705848",
    steel: "#B8B8D0", fairy: "#EE99AC"
};

//PokeAPI's fair use policy requires locally caching resources whenever we request them
//(https://pokeapi.co/docs/v2#fairuse). We persist responses in localStorage so repeat
//lookups (same pokemon, shared abilities/evolution chains) never hit the network again,
//kahit mag-reload o bumalik sa page - hindi lang basta umaasa sa browser's HTTP cache.
const POKEAPI_CACHE_PREFIX = "pokeapi-cache:";
const POKEAPI_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h, in line with PokeAPI's own Cache-Control

//fetch wrapper na cache-first: kung nasa localStorage na at hindi pa expired, gamitin agad,
//kung wala pa o expired na, saka lang tayo mag-fetch sa network at i-store ang result
async function cachedFetch(url) {
    const cacheKey = POKEAPI_CACHE_PREFIX + url;

    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const { timestamp, status, body } = JSON.parse(cached);
            if (Date.now() - timestamp < POKEAPI_CACHE_MAX_AGE_MS) {
                return { ok: status >= 200 && status < 300, status, json: async () => JSON.parse(body) };
            }
        }
    } catch (error) {
        console.error("Cache read error:", error);
    }

    const response = await fetch(url);
    const bodyText = await response.text();

    try {
        localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), status: response.status, body: bodyText }));
    } catch (error) {
        //baka puno na yung localStorage quota - hindi naman critical, tuloy lang tayo
        console.error("Cache write error:", error);
    }

    return { ok: response.ok, status: response.status, json: async () => JSON.parse(bodyText) };
}

//url ng cry sound ng kasalukuyang pokemon, ginagamit ng playCry()
let currentCryUrl = null;

//plays the current pokemon's cry, para sa Cry button
function playCry() {
    if (!currentCryUrl) return;
    const cryAudio = new Audio(currentCryUrl);
    cryAudio.play().catch(error => console.error("Could not play cry:", error));
}

//tinatahak yung evolution chain (recursive tree) papuntang flat na array of stages,
//bawat stage ay array ng species pwedeng magbranch (hal. Eevee's evolutions)
function buildEvolutionStages(chainNode) {
    const stages = [];
    let currentLevel = [chainNode];
    while (currentLevel.length > 0) {
        stages.push(currentLevel.map(node => ({
            name: node.species.name,
            details: node.evolution_details
        })));
        currentLevel = currentLevel.flatMap(node => node.evolves_to);
    }
    return stages;
}

//pinipili yung pinaka-descriptive na condition (level, item, trade, etc.) papunta sa next stage
function describeEvolutionTrigger(details) {
    if (!details || details.length === 0) return "";
    const d = details[0];
    if (d.min_level) return `Lv. ${d.min_level}`;
    if (d.item) return d.item.name.replace(/-/g, " ");
    if (d.trigger && d.trigger.name === "trade") return "Trade";
    if (d.min_happiness) return "Friendship";
    if (d.min_affection) return "Affection";
    if (d.location) return `Near ${d.location.name.replace(/-/g, " ")}`;
    if (d.trigger) return d.trigger.name.replace(/-/g, " ");
    return "";
}

//resets the pokeball + sprite back to hidden/closed, para reusable sa ibang states
//ginagawa itong instant (walang transition) para hindi mag-overlap yung dating
//nakareveal na sprite sa bagong search
function resetCaptureStage() {
    const spriteStage = document.getElementById("spriteStage");
    const pokeball = document.getElementById("pokeball");
    const imgElement = document.getElementById("pokemonSprite");

    pokeball.classList.add("instant");
    imgElement.classList.add("instant");

    spriteStage.classList.remove("active");
    pokeball.classList.remove("loading", "open");
    imgElement.classList.remove("revealed");
    imgElement.removeAttribute("src");

    //force reflow para ma-apply agad yung instant (no-transition) na estado
    void pokeball.offsetWidth;

    pokeball.classList.remove("instant");
    imgElement.classList.remove("instant");
}

//clears the input and all result panels, para sa SELECT/Circle button
function clearAll() {
    document.getElementById("pokemonName").value = "";
    resetCaptureStage();
    document.getElementById("statusMessage").textContent = "";
    document.getElementById("abilitiesContainer").innerHTML = "";
    document.getElementById("typesContainer").innerHTML = "";
    document.getElementById("badgesContainer").innerHTML = "";
    document.getElementById("physicalInfoContainer").innerHTML = "";
    document.getElementById("speciesInfoContainer").innerHTML = "";
    document.getElementById("statsContainer").innerHTML = "";
    document.getElementById("evolutionContainer").innerHTML = "";
    document.getElementById("powerLed").classList.remove("on", "error");
    currentCryUrl = null;
    document.getElementById("cryButton").style.display = "none";
}

//function definition using async para magamit await
async function fetchData() {
    //dom elements sa user friendly format
    const pokemonName = document.getElementById("pokemonName").value.toLowerCase();
    const imgElement = document.getElementById("pokemonSprite");
    const spriteStage = document.getElementById("spriteStage");
    const pokeball = document.getElementById("pokeball");
    const statusMessage = document.getElementById("statusMessage");
    const abilitiesContainer = document.getElementById("abilitiesContainer");
    const typesContainer = document.getElementById("typesContainer");
    const badgesContainer = document.getElementById("badgesContainer");
    const physicalInfoContainer = document.getElementById("physicalInfoContainer");
    const speciesInfoContainer = document.getElementById("speciesInfoContainer");
    const statsContainer = document.getElementById("statsContainer");
    const evolutionContainer = document.getElementById("evolutionContainer");
    const cryButton = document.getElementById("cryButton");
    const powerLed = document.getElementById("powerLed");

    //input validation
    if (pokemonName === "") {
        statusMessage.textContent = "Please enter a name.";
        resetCaptureStage();
        abilitiesContainer.innerHTML = "";
        typesContainer.innerHTML = "";
        badgesContainer.innerHTML = "";
        physicalInfoContainer.innerHTML = "";
        speciesInfoContainer.innerHTML = "";
        statsContainer.innerHTML = "";
        evolutionContainer.innerHTML = "";
        powerLed.classList.remove("on", "error");
        currentCryUrl = null;
        cryButton.style.display = "none";
        return; //exit function, prevent api call w/o name
    }

    //loading state: instantly clear any previous reveal, then show the pokeball closed and shaking
    statusMessage.textContent = "Loading...";
    abilitiesContainer.innerHTML = "";
    typesContainer.innerHTML = "";
    badgesContainer.innerHTML = "";
    physicalInfoContainer.innerHTML = "";
    speciesInfoContainer.innerHTML = "";
    statsContainer.innerHTML = "";
    evolutionContainer.innerHTML = "";
    powerLed.classList.remove("on", "error");
    currentCryUrl = null;
    cryButton.style.display = "none";
    resetCaptureStage();
    spriteStage.classList.add("active");
    pokeball.classList.add("loading");

    //minimum time (ms) the ball stays closed/shaking, kahit mabilis yung fetch/cache,
    //para makita talaga yung opening animation
    const MIN_LOADING_MS = 700;
    const loadingStartedAt = performance.now();

    //pag fetch ng data from api
    //try catch para sa error handling
    try {
        const response = await cachedFetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
        console.log("Fetching data for:", pokemonName);

        //check if response is goods
        //if hindi, display error message
        if (!response.ok) {
            resetCaptureStage();
            statusMessage.textContent = "Not found. Try again.";
            abilitiesContainer.innerHTML = "";
            typesContainer.innerHTML = "";
            badgesContainer.innerHTML = "";
            physicalInfoContainer.innerHTML = "";
            speciesInfoContainer.innerHTML = "";
            statsContainer.innerHTML = "";
            evolutionContainer.innerHTML = "";
            powerLed.classList.add("error");
            throw new Error("Could not fetch resource");
        }

        //if response is goods, proceed sa display data
        const data = await response.json();
        //animated showdown gif preferred, fallback to static sprite if wala
        const pokemonSprite = data.sprites.other.showdown.front_default || data.sprites.front_default;
        const abilities = data.abilities.map(ability => {
            return {
                name: ability.ability.name,
                url: ability.ability.url
            };
        });

        //pag display ng sprite: pokeball opens and reveals it once the image loads,
        //enforced sa MIN_LOADING_MS para consistent yung reveal kahit mabilis mag-load
        if (pokemonSprite) {
            imgElement.onload = () => {
                const remaining = MIN_LOADING_MS - (performance.now() - loadingStartedAt);
                setTimeout(() => {
                    pokeball.classList.remove("loading");
                    pokeball.classList.add("open");
                    imgElement.classList.add("revealed");
                }, Math.max(0, remaining));
            };
            imgElement.src = pokemonSprite;
            statusMessage.textContent = "Success!";
            powerLed.classList.add("on");
        } else {
            //if walang sprite, display no image available
            resetCaptureStage();
            statusMessage.textContent = "No image available.";
        }

        //show the Cry button kung meron audio available
        currentCryUrl = (data.cries && (data.cries.latest || data.cries.legacy)) || null;
        cryButton.style.display = currentCryUrl ? "inline-block" : "none";

        //display type badges
        const typesHTML = data.types.map(t => {
            const typeName = t.type.name;
            const color = TYPE_COLORS[typeName] || "#68A090";
            return `<span class="typeBadge" style="background-color: ${color}">${typeName}</span>`;
        }).join("");
        typesContainer.innerHTML = typesHTML;

        //display height (dm -> m) and weight (hg -> kg)
        const heightM = (data.height * 0.1).toFixed(1);
        const weightKg = (data.weight * 0.1).toFixed(1);
        physicalInfoContainer.innerHTML = `
            <span>Height: ${heightM} m</span>
            <span>Weight: ${weightKg} kg</span>
        `;

        //display base stats as labeled bars
        let statsHTML = "<h4>Base Stats:</h4>";
        data.stats.forEach(s => {
            const statName = s.stat.name;
            const statValue = s.base_stat;
            const barWidth = Math.min(statValue, 255) / 255 * 100;
            statsHTML += `
                <div class="statRow">
                    <span class="statName">${statName}</span>
                    <span class="statValue">${statValue}</span>
                    <div class="statBarBackground">
                        <div class="statBar" style="width: ${barWidth}%"></div>
                    </div>
                </div>
            `;
        });
        statsContainer.innerHTML = statsHTML;

        //fetch species data (genus, flavor text, legendary/mythical/baby, evolution chain link)
        //hindi fatal kung mag-fail, skip lang itong section
        try {
            const speciesResponse = await cachedFetch(data.species.url);
            if (speciesResponse.ok) {
                const speciesData = await speciesResponse.json();

                //genus (hal. "Mouse Pokemon") + english flavor text
                const genusEntry = speciesData.genera.find(g => g.language.name === "en");
                const flavorEntry = speciesData.flavor_text_entries.find(f => f.language.name === "en");
                const flavorText = flavorEntry ? flavorEntry.flavor_text.replace(/[\n\f\r]+/g, " ") : "";
                speciesInfoContainer.innerHTML = `
                    ${genusEntry ? `<p class="genusText">${genusEntry.genus}</p>` : ""}
                    ${flavorText ? `<p class="flavorText">"${flavorText}"</p>` : ""}
                `;

                //legendary / mythical / baby badges
                let badgesHTML = "";
                if (speciesData.is_legendary) badgesHTML += `<span class="specialBadge legendary-badge">Legendary</span>`;
                if (speciesData.is_mythical) badgesHTML += `<span class="specialBadge mythical-badge">Mythical</span>`;
                if (speciesData.is_baby) badgesHTML += `<span class="specialBadge baby-badge">Baby</span>`;
                badgesContainer.innerHTML = badgesHTML;

                //evolution chain
                if (speciesData.evolution_chain && speciesData.evolution_chain.url) {
                    const evoResponse = await cachedFetch(speciesData.evolution_chain.url);
                    if (evoResponse.ok) {
                        const evoData = await evoResponse.json();
                        const stages = buildEvolutionStages(evoData.chain);
                        if (stages.length > 1) {
                            //bawat node may sariling trigger label (hindi shared sa buong stage),
                            //dahil magkaiba yung condition ng bawat branch (hal. Eevee's evolutions)
                            let evoHTML = "<h4>Evolution:</h4><div class=\"evolutionChain\">";
                            stages.forEach((stage, i) => {
                                evoHTML += `<span class="evolutionStage">`;
                                stage.forEach(node => {
                                    const isCurrent = node.name === pokemonName;
                                    const nameHTML = `<span class="evolutionName${isCurrent ? " current" : ""}">${node.name}</span>`;
                                    if (i > 0) {
                                        const label = describeEvolutionTrigger(node.details);
                                        evoHTML += `<span class="evolutionNode"><span class="evolutionArrow">&#8594;${label ? `<span class="evolutionTrigger">${label}</span>` : ""}</span>${nameHTML}</span>`;
                                    } else {
                                        evoHTML += nameHTML;
                                    }
                                });
                                evoHTML += `</span>`;
                            });
                            evoHTML += "</div>";
                            evolutionContainer.innerHTML = evoHTML;
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching species/evolution data:", error);
        }

        // Fetch and Display Abilities with Descriptions
        if (abilities.length > 0) {
            let abilitiesHTML = "<h4>Abilities:</h4><ul>";

            //fetching ability description
            //try catch para sa error handling
            for (let ability of abilities) {
                try {
                    const abilityResponse = await cachedFetch(ability.url);
                    if (abilityResponse.ok) {
                        const abilityData = await abilityResponse.json();
                        const descriptionEntry = abilityData.effect_entries.find(entry => entry.language.name === "en");
                        const description = descriptionEntry ? descriptionEntry.effect : "No description available.";
                        abilitiesHTML += `<li><strong>${ability.name}:</strong> ${description}</li>`;
                    } else {
                        abilitiesHTML += `<li><strong>${ability.name}:</strong> Description not available.</li>`;
                    }
                } catch (error) {
                    console.error("Error fetching ability description:", error);
                    abilitiesHTML += `<li><strong>${ability.name}:</strong> Error loading description.</li>`;
                }
            }

            abilitiesHTML += "</ul>";
            abilitiesContainer.innerHTML = abilitiesHTML;
        } else {
            //if walang abilities, display no abilities found
            abilitiesContainer.innerHTML = "<h4>No abilities found.</h4>";
        }
    } catch (error) {
        //error handling
        console.error("Fetch Error: ", error);
        statusMessage.textContent = `Error: ${error.message}`;
        abilitiesContainer.innerHTML = "";
        badgesContainer.innerHTML = "";
        speciesInfoContainer.innerHTML = "";
        evolutionContainer.innerHTML = "";
        currentCryUrl = null;
        cryButton.style.display = "none";
        resetCaptureStage();
        powerLed.classList.add("error");
    }
}
