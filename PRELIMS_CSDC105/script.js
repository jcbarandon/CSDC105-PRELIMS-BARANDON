//API IS FROM POKEAPI.CO, A FREE API FOR POKEMON DATA
//THIS PROJECT IS A SIMPLE POKEMON SEARCH APP WHERE YOU CAN SEARCH FOR A POKEMON AND DISPLAYS ITS SPRITE AND ABILITIES
//THIS PROJECT USES FETCH API AND ASYNC AWAIT FOR FETCHING DATA FROM THE API
//MADE BY: JOE CARLO JR O. BARANDON

//function definition using async para magamit await
async function fetchData() {
    //dom elements sa user friendly format
    const pokemonName = document.getElementById("pokemonName").value.toLowerCase();
    const imgElement = document.getElementById("pokemonSprite");
    const statusMessage = document.getElementById("statusMessage");
    const abilitiesContainer = document.getElementById("abilitiesContainer");

    //input validation
    if (pokemonName === "") {
        statusMessage.textContent = "Please enter a name.";
        imgElement.style.display = "none";
        abilitiesContainer.innerHTML = "";
        return; //exit function, prevent api call w/o name
    }

    //loading state
    statusMessage.textContent = "Loading...";
    abilitiesContainer.innerHTML = "";

    //pag fetch ng data from api
    //try catch para sa error handling
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
        console.log("Fetching data for:", pokemonName);

        //check if response is goods
        //if hindi, display error message
        if (!response.ok) {
            imgElement.style.display = "none";
            statusMessage.textContent = "Not found. Try again.";
            abilitiesContainer.innerHTML = "";
            throw new Error("Could not fetch resource");
        }

        //if response is goods, proceed sa display data
        const data = await response.json();
        const pokemonSprite = data.sprites.front_default;
        const abilities = data.abilities.map(ability => {
            return {
                name: ability.ability.name,
                url: ability.ability.url
            };
        });

        //pag display ng sprite
        if (pokemonSprite) {
            imgElement.src = pokemonSprite;
            imgElement.style.display = "block";
            statusMessage.textContent = "Success!";
        } else {
            //if walang sprite, display no image available
            imgElement.style.display = "none";
            statusMessage.textContent = "No image available.";
        }

        // Fetch and Display Abilities with Descriptions
        if (abilities.length > 0) {
            let abilitiesHTML = "<h4>Abilities:</h4><ul>";

            //fetching ability description
            //try catch para sa error handling
            for (let ability of abilities) {
                try {
                    const abilityResponse = await fetch(ability.url);
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
    }
}
